-- =====================================
-- FIX: Corrigir profile_id na tabela teams para usuários que já completaram primeiro acesso
-- =====================================
-- PROBLEMA: Quando admin/gestor fazia o primeiro acesso e mudava a senha,
--           o profile_id não era vinculado na tabela teams.
--           Isso fazia com que eles continuassem aparecendo no painel "Cadastros Pendentes".
-- 
-- SOLUÇÃO: Este script atualiza o profile_id para todos os registros na tabela teams
--          que têm um email correspondente a um perfil existente em profiles.
-- =====================================

-- 1. Verificar quantos registros precisam ser corrigidos
SELECT 
    t.id,
    t.name,
    t.email,
    t.microregiao_id,
    t.profile_id AS current_profile_id,
    p.id AS correct_profile_id,
    p.first_access
FROM teams t
LEFT JOIN profiles p ON LOWER(t.email) = LOWER(p.email)
WHERE t.profile_id IS NULL
  AND t.email IS NOT NULL
  AND p.id IS NOT NULL;

-- 2. Atualizar profile_id para registros com email correspondente
UPDATE teams t
SET 
    profile_id = p.id,
    updated_at = NOW()
FROM profiles p
WHERE LOWER(t.email) = LOWER(p.email)
  AND t.profile_id IS NULL
  AND t.email IS NOT NULL;

-- 3. Verificar se há registros duplicados (mesmo email e micro) que podem ser mesclados
-- (NÃO executa delete automático, apenas lista para revisão manual)
SELECT 
    t1.id AS team_id_with_profile,
    t2.id AS team_id_without_profile,
    t1.email,
    t1.microregiao_id
FROM teams t1
JOIN teams t2 ON LOWER(t1.email) = LOWER(t2.email) 
              AND t1.microregiao_id = t2.microregiao_id
              AND t1.id != t2.id
WHERE t1.profile_id IS NOT NULL
  AND t2.profile_id IS NULL;

-- 4. Verificar resultado final
SELECT 
    COUNT(*) FILTER (WHERE profile_id IS NULL) AS pendentes,
    COUNT(*) FILTER (WHERE profile_id IS NOT NULL) AS vinculados,
    COUNT(*) AS total
FROM teams
WHERE email IS NOT NULL;
