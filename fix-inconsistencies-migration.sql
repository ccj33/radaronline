-- =====================================
-- RADAR 2.0 - CORREÇÃO DE INCONSISTÊNCIAS
-- Execute este script no SQL Editor do Supabase
-- Data: 2025-12-26 (v2 - com correções de revisão)
-- =====================================
-- 
-- ORDEM SEGURA DE EXECUÇÃO:
-- 1. Fazer backup do banco
-- 2. Executar em staging primeiro
-- 3. Executar cada PASSO individualmente
-- 4. Testar aplicação após cada passo crítico
-- =====================================

-- ==================================
-- PASSO 1: CRIAR TABELA MICROREGIOES
-- Normaliza o campo microregiao_id com FK
-- ==================================

CREATE TABLE IF NOT EXISTS public.microregioes (
  id TEXT PRIMARY KEY NOT NULL,     -- "MR009"
  codigo TEXT NOT NULL,             -- "31009"
  nome TEXT NOT NULL,               -- "São Sebastião do Paraíso"
  macrorregiao TEXT NOT NULL,       -- "Sudoeste"
  macro_id TEXT NOT NULL,           -- "MAC16"
  urs TEXT NOT NULL,                -- "Passos"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para buscas por macrorregião
CREATE INDEX IF NOT EXISTS idx_microregioes_macro ON public.microregioes(macro_id);

-- Garantir unicidade do código IBGE
ALTER TABLE public.microregioes 
  ADD CONSTRAINT IF NOT EXISTS microregioes_codigo_unique UNIQUE (codigo);

-- Comentário
COMMENT ON TABLE public.microregioes IS 'Tabela de microrregiões de saúde de Minas Gerais - fonte única de verdade';

-- ==================================
-- PASSO 2: POPULAR TABELA MICROREGIOES
-- Dados baseados em microregioes.ts
-- Executar em transação para segurança
-- ==================================

BEGIN;

INSERT INTO public.microregioes (id, codigo, nome, macrorregiao, macro_id, urs) VALUES
  -- SUDOESTE (MAC16)
  ('MR001', '31001', 'Alfenas/Machado', 'Sudoeste', 'MAC16', 'Alfenas'),
  ('MR002', '31002', 'Guaxupé', 'Sudoeste', 'MAC16', 'Alfenas'),
  ('MR009', '31009', 'São Sebastião do Paraíso', 'Sudoeste', 'MAC16', 'Passos'),
  ('MR091', '31091', 'Cássia', 'Sudoeste', 'MAC16', 'Passos'),
  ('MR092', '31092', 'Passos', 'Sudoeste', 'MAC16', 'Passos'),
  ('MR093', '31093', 'Piumhi', 'Sudoeste', 'MAC16', 'Passos'),
  
  -- CENTRO SUL (MAC02)
  ('MR013', '31013', 'Barbacena', 'Centro Sul', 'MAC02', 'Barbacena'),
  ('MR015', '31015', 'São João Del Rei', 'Centro Sul', 'MAC02', 'São João Del Rei'),
  ('MR078', '31078', 'Congonhas', 'Centro Sul', 'MAC02', 'Barbacena'),
  ('MR079', '31079', 'Conselheiro Lafaiete', 'Centro Sul', 'MAC02', 'Barbacena'),
  
  -- CENTRO (MAC03)
  ('MR016', '31016', 'Belo Horizonte/Nova Lima/Santa Luzia', 'Centro', 'MAC03', 'Belo Horizonte'),
  ('MR017', '31017', 'Betim', 'Centro', 'MAC03', 'Belo Horizonte'),
  ('MR018', '31018', 'Contagem', 'Centro', 'MAC03', 'Belo Horizonte'),
  ('MR019', '31019', 'Curvelo', 'Centro', 'MAC03', 'Sete Lagoas'),
  ('MR020', '31020', 'Guanhães', 'Centro', 'MAC03', 'Itabira'),
  ('MR021', '31021', 'Itabira', 'Centro', 'MAC03', 'Itabira'),
  ('MR022', '31022', 'Ouro Preto', 'Centro', 'MAC03', 'Belo Horizonte'),
  ('MR023', '31023', 'João Monlevade', 'Centro', 'MAC03', 'Itabira'),
  ('MR024', '31024', 'Sete Lagoas', 'Centro', 'MAC03', 'Sete Lagoas'),
  ('MR025', '31025', 'Vespasiano/Lagoa Santa', 'Centro', 'MAC03', 'Belo Horizonte'),
  
  -- VALE DO AÇO (MAC14)
  ('MR034', '31034', 'Caratinga', 'Vale do Aço', 'MAC14', 'Coronel Fabriciano'),
  ('MR035', '31035', 'Coronel Fabriciano/Timóteo', 'Vale do Aço', 'MAC14', 'Coronel Fabriciano'),
  ('MR037', '31037', 'Ipatinga', 'Vale do Aço', 'MAC14', 'Coronel Fabriciano'),
  
  -- JEQUITINHONHA (MAC04)
  ('MR026', '31026', 'Diamantina/Itamarandiba', 'Jequitinhonha', 'MAC04', 'Diamantina'),
  ('MR027', '31027', 'Turmalina/Minas Novas/Capelinha', 'Jequitinhonha', 'MAC04', 'Diamantina'),
  ('MR064', '31064', 'Araçuaí', 'Jequitinhonha', 'MAC04', 'Diamantina'),
  ('MR095', '31095', 'Serro', 'Jequitinhonha', 'MAC04', 'Diamantina'),
  
  -- OESTE (MAC05)
  ('MR028', '31028', 'Bom Despacho', 'Oeste', 'MAC05', 'Divinópolis'),
  ('MR030', '31030', 'Formiga', 'Oeste', 'MAC05', 'Divinópolis'),
  ('MR031', '31031', 'Itaúna', 'Oeste', 'MAC05', 'Divinópolis'),
  ('MR032', '31032', 'Pará de Minas/Nova Serrana', 'Oeste', 'MAC05', 'Divinópolis'),
  ('MR086', '31086', 'Divinópolis', 'Oeste', 'MAC05', 'Divinópolis'),
  ('MR087', '31087', 'Lagoa da Prata/Santo Antônio do Monte', 'Oeste', 'MAC05', 'Divinópolis'),
  ('MR088', '31088', 'Oliveira/Santo Antônio do Amparo', 'Oeste', 'MAC05', 'Divinópolis'),
  ('MR089', '31089', 'Campo Belo', 'Oeste', 'MAC05', 'Divinópolis'),
  
  -- LESTE (MAC06)
  ('MR036', '31036', 'Governador Valadares', 'Leste', 'MAC06', 'Governador Valadares'),
  ('MR038', '31038', 'Mantena', 'Leste', 'MAC06', 'Governador Valadares'),
  ('MR040', '31040', 'Resplendor', 'Leste', 'MAC06', 'Governador Valadares'),
  ('MR102', '31102', 'Peçanha/São João Evangelista/Santa Maria do Suaçuí', 'Leste', 'MAC06', 'Governador Valadares'),
  
  -- TRIÂNGULO DO NORTE (MAC13)
  ('MR073', '31073', 'Ituiutaba', 'Triângulo do Norte', 'MAC13', 'Ituiutaba'),
  ('MR074', '31074', 'Patrocínio/Monte Carmelo', 'Triângulo do Norte', 'MAC13', 'Uberlândia'),
  ('MR075', '31075', 'Uberlândia/Araguari', 'Triângulo do Norte', 'MAC13', 'Uberlândia'),
  
  -- NORTE (MAC08)
  ('MR050', '31050', 'Coração de Jesus', 'Norte', 'MAC08', 'Montes Claros'),
  ('MR051', '31051', 'Francisco Sá', 'Norte', 'MAC08', 'Montes Claros'),
  ('MR052', '31052', 'Janaúba/Monte Azul', 'Norte', 'MAC08', 'Montes Claros'),
  ('MR053', '31053', 'Januária', 'Norte', 'MAC08', 'Januária'),
  ('MR055', '31055', 'Pirapora', 'Norte', 'MAC08', 'Pirapora'),
  ('MR076', '31076', 'Manga', 'Norte', 'MAC08', 'Januária'),
  ('MR083', '31083', 'Bocaiúva', 'Norte', 'MAC08', 'Montes Claros'),
  ('MR084', '31084', 'Montes Claros', 'Norte', 'MAC08', 'Montes Claros'),
  ('MR085', '31085', 'Taiobeiras', 'Norte', 'MAC08', 'Montes Claros'),
  ('MR098', '31098', 'Salinas', 'Norte', 'MAC08', 'Montes Claros'),
  ('MR100', '31100', 'São Francisco', 'Norte', 'MAC08', 'Januária'),
  ('MR101', '31101', 'Brasília de Minas', 'Norte', 'MAC08', 'Januária'),
  
  -- SUDESTE (MAC07)
  ('MR041', '31041', 'Além Paraíba', 'Sudeste', 'MAC07', 'Leopoldina'),
  ('MR042', '31042', 'Carangola', 'Sudeste', 'MAC07', 'Manhuaçu'),
  ('MR044', '31044', 'Leopoldina/Cataguases', 'Sudeste', 'MAC07', 'Leopoldina'),
  ('MR045', '31045', 'Muriaé', 'Sudeste', 'MAC07', 'Ubá'),
  ('MR046', '31046', 'Santos Dumont', 'Sudeste', 'MAC07', 'Juiz de Fora'),
  ('MR047', '31047', 'São João Nepomuceno/Bicas', 'Sudeste', 'MAC07', 'Juiz de Fora'),
  ('MR048', '31048', 'Ubá', 'Sudeste', 'MAC07', 'Ubá'),
  ('MR090', '31090', 'Lima Duarte', 'Sudeste', 'MAC07', 'Juiz de Fora'),
  ('MR097', '31097', 'Juiz de Fora', 'Sudeste', 'MAC07', 'Juiz de Fora'),
  
  -- LESTE DO SUL (MAC10)
  ('MR059', '31059', 'Manhuaçu', 'Leste do Sul', 'MAC10', 'Manhuaçu'),
  ('MR060', '31060', 'Ponte Nova', 'Leste do Sul', 'MAC10', 'Ponte Nova'),
  ('MR061', '31061', 'Viçosa', 'Leste do Sul', 'MAC10', 'Ponte Nova'),
  
  -- NOROESTE (MAC09)
  ('MR057', '31057', 'Patos de Minas', 'Noroeste', 'MAC09', 'Patos de Minas'),
  ('MR058', '31058', 'Unaí/Paracatu', 'Noroeste', 'MAC09', 'Unaí'),
  ('MR077', '31077', 'João Pinheiro', 'Noroeste', 'MAC09', 'Patos de Minas'),
  ('MR082', '31082', 'São Gotardo', 'Noroeste', 'MAC09', 'Patos de Minas'),
  
  -- NORDESTE (MAC11)
  ('MR062', '31062', 'Águas Formosas', 'Nordeste', 'MAC11', 'Teófilo Otoni'),
  ('MR065', '31065', 'Itaobim', 'Nordeste', 'MAC11', 'Pedra Azul'),
  ('MR066', '31066', 'Nanuque', 'Nordeste', 'MAC11', 'Teófilo Otoni'),
  ('MR067', '31067', 'Padre Paraíso', 'Nordeste', 'MAC11', 'Teófilo Otoni'),
  ('MR068', '31068', 'Pedra Azul', 'Nordeste', 'MAC11', 'Pedra Azul'),
  ('MR094', '31094', 'Almenara/Jacinto', 'Nordeste', 'MAC11', 'Pedra Azul'),
  ('MR096', '31096', 'Itambacuri', 'Nordeste', 'MAC11', 'Teófilo Otoni'),
  ('MR099', '31099', 'Teófilo Otoni/Malacacheta', 'Nordeste', 'MAC11', 'Teófilo Otoni'),
  
  -- TRIÂNGULO DO SUL (MAC12)
  ('MR070', '31070', 'Araxá', 'Triângulo do Sul', 'MAC12', 'Uberaba'),
  ('MR071', '31071', 'Frutal/Iturama', 'Triângulo do Sul', 'MAC12', 'Uberaba'),
  ('MR072', '31072', 'Uberaba', 'Triângulo do Sul', 'MAC12', 'Uberaba'),
  
  -- EXTREMO SUL (MAC15)
  ('MR003', '31003', 'Itajubá', 'Extremo Sul', 'MAC15', 'Pouso Alegre'),
  ('MR006', '31006', 'Poços de Caldas', 'Extremo Sul', 'MAC15', 'Pouso Alegre'),
  ('MR007', '31007', 'Pouso Alegre', 'Extremo Sul', 'MAC15', 'Pouso Alegre'),
  
  -- SUL (MAC01)
  ('MR004', '31004', 'Lavras', 'Sul', 'MAC01', 'Varginha'),
  ('MR008', '31008', 'São Lourenço', 'Sul', 'MAC01', 'Varginha'),
  ('MR010', '31010', 'Três Corações', 'Sul', 'MAC01', 'Varginha'),
  ('MR011', '31011', 'Três Pontas', 'Sul', 'MAC01', 'Varginha'),
  ('MR012', '31012', 'Varginha', 'Sul', 'MAC01', 'Varginha')
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ==================================
-- PASSO 3: ADICIONAR parent_id EM ACTION_COMMENTS
-- Usando ON DELETE SET NULL para manter histórico
-- ==================================

ALTER TABLE public.action_comments 
  ADD COLUMN IF NOT EXISTS parent_id UUID;

-- Remover constraint antiga se existir (para alterar comportamento)
ALTER TABLE public.action_comments 
  DROP CONSTRAINT IF EXISTS action_comments_parent_id_fkey;

-- Criar constraint com ON DELETE SET NULL (mantém respostas órfãs)
ALTER TABLE public.action_comments 
  ADD CONSTRAINT action_comments_parent_id_fkey 
  FOREIGN KEY (parent_id) REFERENCES public.action_comments(id) 
  ON DELETE SET NULL;

-- Índice para buscar respostas
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.action_comments(parent_id);

-- ==================================
-- PASSO 4: RENOMEAR teams.role PARA teams.cargo
-- Evita conflito com profiles.role
-- ==================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'teams' 
    AND column_name = 'role'
  ) THEN
    ALTER TABLE public.teams RENAME COLUMN role TO cargo;
  END IF;
END $$;

-- ==================================
-- PASSO 5: ADICIONAR profile_id EM TEAMS
-- Vincula membro da equipe com usuário cadastrado
-- ==================================

ALTER TABLE public.teams 
  ADD COLUMN IF NOT EXISTS profile_id UUID 
  REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Índice para buscar vinculo
CREATE INDEX IF NOT EXISTS idx_teams_profile ON public.teams(profile_id);

-- Comentário
COMMENT ON COLUMN public.teams.profile_id IS 'Vincula membro da equipe ao profile quando usuário é cadastrado na plataforma';

-- ==================================
-- PASSO 5b: POPULAR profile_id AUTOMATICAMENTE
-- Vincula membros existentes pelo email
-- EXECUTE SOMENTE SE TIVER CERTEZA
-- ==================================

-- UPDATE public.teams t
-- SET profile_id = p.id
-- FROM public.profiles p
-- WHERE LOWER(t.email) = LOWER(p.email)
-- AND t.profile_id IS NULL;

-- ==================================
-- PASSO 6: RLS E POLÍTICAS PARA ACTIVITY_LOGS
-- Garantir imutabilidade e controle de INSERT
-- ==================================

-- Garantir que RLS está habilitado
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas
DROP POLICY IF EXISTS "Admins podem ver todos os logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Gestores podem ver logs de sua microrregião" ON public.activity_logs;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Logs são imutáveis - no update" ON public.activity_logs;
DROP POLICY IF EXISTS "Logs são imutáveis - no delete" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert_authenticated" ON public.activity_logs;

-- SELECT: Admins podem ver todos os logs
CREATE POLICY "Admins podem ver todos os logs" ON public.activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())::uuid 
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- SELECT: Gestores podem ver logs de sua microrregião
CREATE POLICY "Gestores podem ver logs de sua microrregião" ON public.activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles viewer
      WHERE viewer.id = (SELECT auth.uid())::uuid
      AND viewer.role = 'gestor'
      AND activity_logs.user_id IN (
        SELECT id FROM public.profiles p2
        WHERE p2.microregiao_id = viewer.microregiao_id
      )
    )
  );

-- INSERT: Apenas para o próprio usuário (user_id = auth.uid())
CREATE POLICY "activity_logs_insert_authenticated" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid())::uuid = user_id);

-- BLOQUEAR UPDATE/DELETE (imutabilidade)
CREATE POLICY "Logs são imutáveis - no update" ON public.activity_logs
  FOR UPDATE USING (false);

CREATE POLICY "Logs são imutáveis - no delete" ON public.activity_logs
  FOR DELETE USING (false);

-- ==================================
-- PASSO 7: RLS PARA MICROREGIOES
-- ==================================

ALTER TABLE public.microregioes ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas
DROP POLICY IF EXISTS "Microregioes visíveis para autenticados" ON public.microregioes;
DROP POLICY IF EXISTS "Superadmin gerencia microregioes" ON public.microregioes;

-- SELECT: Todos autenticados podem ver microregiões
CREATE POLICY "Microregioes visíveis para autenticados" ON public.microregioes
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- INSERT/UPDATE/DELETE: Apenas superadmin
CREATE POLICY "Superadmin gerencia microregioes" ON public.microregioes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())::uuid 
      AND profiles.role = 'superadmin'
    )
  );

-- ==================================
-- PASSO 8: RECARREGAR SCHEMA
-- ==================================

NOTIFY pgrst, 'reload schema';

-- ==================================
-- FIM DA MIGRAÇÃO v2
-- ==================================
-- 
-- CHECKLIST PÓS-MIGRAÇÃO:
-- [ ] Verificar se tabela microregioes foi criada com 89 registros
-- [ ] Verificar se action_comments tem coluna parent_id
-- [ ] Verificar se teams.role foi renomeada para teams.cargo
-- [ ] Verificar se teams tem coluna profile_id
-- [ ] Testar INSERT em activity_logs (deve funcionar apenas para próprio user)
-- [ ] Testar UPDATE/DELETE em activity_logs (deve falhar)
-- [ ] Testar aplicação frontend
-- ==================================
