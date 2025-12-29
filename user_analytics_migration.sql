-- ============================================
-- MIGRATION: Sistema de Analytics - Radar
-- Data: 2025-12-26
-- ============================================

-- ===========================================
-- TABELA: user_sessions
-- Agrupa eventos por sessão de usuário
-- ===========================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ,
    duration_seconds INT,
    page_count INT DEFAULT 0,
    device_info JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ===========================================
-- TABELA: user_analytics
-- Eventos de tracking (cliques, views, scroll, tempo)
-- ===========================================
CREATE TABLE IF NOT EXISTS user_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'click', 'scroll', 'time_spent', 'session_start', 'session_end')),
    page TEXT NOT NULL,
    element TEXT,                    -- ID/nome do elemento clicado
    scroll_depth INT CHECK (scroll_depth >= 0 AND scroll_depth <= 100),  -- % do scroll (0-100)
    duration_seconds INT,            -- tempo na página
    metadata JSONB DEFAULT '{}',     -- dados extras
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ===========================================
-- ÍNDICES PARA PERFORMANCE
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_analytics_user ON user_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_session ON user_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_page ON user_analytics(page);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON user_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON user_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON user_sessions(started_at);

-- ===========================================
-- RLS: Row Level Security
-- ===========================================

-- Habilitar RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_analytics ENABLE ROW LEVEL SECURITY;

-- Policies para user_sessions
DROP POLICY IF EXISTS "Users can insert own sessions" ON user_sessions;
CREATE POLICY "Users can insert own sessions" ON user_sessions
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sessions" ON user_sessions;
CREATE POLICY "Users can update own sessions" ON user_sessions
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all sessions" ON user_sessions;
CREATE POLICY "Admins can view all sessions" ON user_sessions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'superadmin')
        )
    );

-- Policies para user_analytics
DROP POLICY IF EXISTS "Users can insert own analytics" ON user_analytics;
CREATE POLICY "Users can insert own analytics" ON user_analytics
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all analytics" ON user_analytics;
CREATE POLICY "Admins can view all analytics" ON user_analytics
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'superadmin')
        )
    );

-- ===========================================
-- VIEW: Agregação de métricas por página
-- Para otimizar queries do dashboard
-- ===========================================
CREATE OR REPLACE VIEW analytics_page_stats AS
SELECT 
    page,
    COUNT(*) FILTER (WHERE event_type = 'page_view') as view_count,
    AVG(duration_seconds) FILTER (WHERE event_type = 'time_spent') as avg_time_seconds,
    AVG(scroll_depth) FILTER (WHERE event_type = 'scroll') as avg_scroll_depth,
    COUNT(DISTINCT user_id) as unique_users,
    DATE(created_at) as date
FROM user_analytics
GROUP BY page, DATE(created_at);

-- ===========================================
-- VIEW: Engajamento por região
-- Junta analytics com profiles para dados regionais
-- ===========================================
CREATE OR REPLACE VIEW analytics_region_engagement AS
SELECT 
    p.microregiao_id,
    p.municipio,
    COUNT(DISTINCT ua.user_id) as active_users,
    COUNT(*) FILTER (WHERE ua.event_type = 'page_view') as total_views,
    COUNT(DISTINCT ua.session_id) as total_sessions,
    AVG(us.duration_seconds) as avg_session_duration,
    MAX(ua.created_at) as last_activity
FROM user_analytics ua
JOIN profiles p ON ua.user_id = p.id
LEFT JOIN user_sessions us ON ua.session_id = us.id
GROUP BY p.microregiao_id, p.municipio;

-- ===========================================
-- FUNÇÃO: Limpar dados antigos (retenção 90 dias)
-- Executar periodicamente via cron
-- ===========================================
CREATE OR REPLACE FUNCTION cleanup_old_analytics()
RETURNS void AS $$
BEGIN
    -- Deletar eventos com mais de 90 dias
    DELETE FROM user_analytics 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Deletar sessões órfãs (sem eventos)
    DELETE FROM user_sessions 
    WHERE id NOT IN (SELECT DISTINCT session_id FROM user_analytics WHERE session_id IS NOT NULL)
    AND created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- COMENTÁRIOS NAS TABELAS
-- ===========================================
COMMENT ON TABLE user_sessions IS 'Sessões de usuários para agrupar eventos de analytics';
COMMENT ON TABLE user_analytics IS 'Eventos de analytics: page views, cliques, scroll, tempo na página';
COMMENT ON COLUMN user_analytics.event_type IS 'Tipo do evento: page_view, click, scroll, time_spent, session_start, session_end';
COMMENT ON COLUMN user_analytics.scroll_depth IS 'Profundidade do scroll em porcentagem (0-100)';
COMMENT ON COLUMN user_analytics.element IS 'Identificador do elemento clicado (ex: btn_criar_acao)';
