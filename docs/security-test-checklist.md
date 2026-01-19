# 🧪 Checklist de Testes de Segurança - RADAR 2.0

## Pré-requisitos

1. **Obtenha tokens de diferentes usuários:**

```bash
# Variáveis do seu projeto
export SUPABASE_URL="https://SEU_PROJETO.supabase.co"
export ANON_KEY="sua_anon_key_aqui"

# Token de SUPERADMIN
export SUPERADMIN_TOKEN=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@example.com","password":"senha123"}' \
  | jq -r '.access_token')

# Token de ADMIN
export ADMIN_TOKEN=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"senha123"}' \
  | jq -r '.access_token')

# Token de GESTOR
export GESTOR_TOKEN=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"gestor@example.com","password":"senha123"}' \
  | jq -r '.access_token')

# Token de USUARIO comum
export USER_TOKEN=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@example.com","password":"senha123"}' \
  | jq -r '.access_token')
```

---

## Teste 1: activity_logs - Imutabilidade

### ✅ INSERT deve funcionar (próprio usuário)
```bash
curl -X POST "$SUPABASE_URL/rest/v1/activity_logs" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "action_type": "test_insert",
    "entity_type": "auth",
    "entity_id": "test-123"
  }'
# Esperado: 201 Created com o log criado
```

### ❌ UPDATE deve FALHAR
```bash
curl -X PATCH "$SUPABASE_URL/rest/v1/activity_logs?id=eq.COLOQUE_UM_ID_AQUI" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action_type": "hacked"}'
# Esperado: 0 rows affected (nada atualizado)
```

### ❌ DELETE deve FALHAR
```bash
curl -X DELETE "$SUPABASE_URL/rest/v1/activity_logs?id=eq.COLOQUE_UM_ID_AQUI" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN"
# Esperado: 0 rows affected (nada deletado)
```

---

## Teste 2: activity_logs - Visibilidade por Role

### ✅ Admin vê TODOS os logs
```bash
curl -X GET "$SUPABASE_URL/rest/v1/activity_logs?limit=5" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# Esperado: Lista de logs (pode incluir logs de outras microrregiões)
```

### ✅ Gestor vê APENAS logs de sua microrregião
```bash
curl -X GET "$SUPABASE_URL/rest/v1/activity_logs?limit=5" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $GESTOR_TOKEN"
# Esperado: Lista de logs apenas de usuários da mesma microrregião
```

### ❌ Usuário comum NÃO vê logs (a menos que seja o próprio)
```bash
curl -X GET "$SUPABASE_URL/rest/v1/activity_logs?limit=5" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $USER_TOKEN"
# Esperado: Lista vazia ou apenas logs do próprio usuário
```

---

## Teste 3: user_requests

### ✅ Usuário cria solicitação própria
```bash
curl -X POST "$SUPABASE_URL/rest/v1/user_requests" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "type": "password_reset",
    "message": "Preciso resetar minha senha"
  }'
# Esperado: 201 Created
```

### ✅ Admin vê TODAS as solicitações
```bash
curl -X GET "$SUPABASE_URL/rest/v1/user_requests" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# Esperado: Lista de todas as solicitações
```

### ❌ Usuário vê APENAS suas solicitações
```bash
curl -X GET "$SUPABASE_URL/rest/v1/user_requests" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $USER_TOKEN"
# Esperado: Apenas solicitações do próprio usuário
```

---

## Teste 4: Edge Functions

### ✅ Admin cria usuário
```bash
curl -X POST "$SUPABASE_URL/functions/v1/create-user" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste-novo@example.com",
    "password": "senha123",
    "nome": "Usuário Teste",
    "role": "usuario",
    "microregiaoId": "MR009"
  }'
# Esperado: 200 OK com dados do usuário criado
```

### ❌ Usuário comum NÃO pode criar usuário
```bash
curl -X POST "$SUPABASE_URL/functions/v1/create-user" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "hacker@example.com",
    "password": "senha123",
    "nome": "Hacker",
    "role": "admin"
  }'
# Esperado: 403 Forbidden
```

### ✅ Admin atualiza senha de usuário
```bash
curl -X POST "$SUPABASE_URL/functions/v1/update-user-password" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "UUID_DO_USUARIO_TESTE",
    "password": "novaSenha123"
  }'
# Esperado: 200 OK
```

### ❌ Admin NÃO pode alterar senha do Superadmin
```bash
curl -X POST "$SUPABASE_URL/functions/v1/update-user-password" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "UUID_DO_SUPERADMIN",
    "password": "senhaHackeada"
  }'
# Esperado: 403 Forbidden
```

### ✅ Apenas Superadmin pode excluir usuário
```bash
curl -X POST "$SUPABASE_URL/functions/v1/delete-user" \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "UUID_DO_USUARIO_TESTE"
  }'
# Esperado: 200 OK
```

### ❌ Admin NÃO pode excluir usuário
```bash
curl -X POST "$SUPABASE_URL/functions/v1/delete-user" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "UUID_QUALQUER"
  }'
# Esperado: 403 Forbidden
```

---

## Teste 5: vault.secrets (Se aplicável)

### ❌ Token autenticado NÃO deve acessar secrets
```bash
curl -X GET "$SUPABASE_URL/rest/v1/rpc/read_secret?name=test" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# Esperado: Erro ou lista vazia
```

### ❌ Anon NÃO deve acessar secrets
```bash
curl -X GET "$SUPABASE_URL/rest/v1/vault.secrets" \
  -H "apikey: $ANON_KEY"
# Esperado: 401 ou 403
```

---

## Teste 6: Acesso Anônimo (Sem Token)

### ❌ Anon NÃO pode ler profiles
```bash
curl -X GET "$SUPABASE_URL/rest/v1/profiles" \
  -H "apikey: $ANON_KEY"
# Esperado: Lista vazia ou erro
```

### ❌ Anon NÃO pode ler actions
```bash
curl -X GET "$SUPABASE_URL/rest/v1/actions" \
  -H "apikey: $ANON_KEY"
# Esperado: Lista vazia ou erro
```

### ❌ Anon NÃO pode inserir nada
```bash
curl -X POST "$SUPABASE_URL/rest/v1/activity_logs" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action_type": "hack", "entity_type": "auth"}'
# Esperado: Erro
```

---

## Checklist Resumido

| Teste | Esperado | Status |
|-------|----------|--------|
| activity_logs INSERT próprio | ✅ Funciona | [ ] |
| activity_logs UPDATE | ❌ Bloqueia | [ ] |
| activity_logs DELETE | ❌ Bloqueia | [ ] |
| activity_logs SELECT admin | ✅ Vê todos | [ ] |
| activity_logs SELECT gestor | ✅ Só microrregião | [ ] |
| user_requests INSERT próprio | ✅ Funciona | [ ] |
| user_requests SELECT admin | ✅ Vê todos | [ ] |
| Edge: create-user (admin) | ✅ Funciona | [ ] |
| Edge: create-user (user) | ❌ 403 | [ ] |
| Edge: update-password (admin→user) | ✅ Funciona | [ ] |
| Edge: update-password (admin→superadmin) | ❌ 403 | [ ] |
| Edge: delete-user (superadmin) | ✅ Funciona | [ ] |
| Edge: delete-user (admin) | ❌ 403 | [ ] |
| vault.secrets (authenticated) | ❌ Bloqueia | [ ] |
| Acesso anon a tabelas | ❌ Bloqueia | [ ] |

---

## Após os Testes

1. **Todos passaram?** → Pode ir para produção
2. **Algum falhou?** → Revise as policies no SQL Editor
3. **Erro inesperado?** → Verifique logs no Supabase Dashboard

Dúvidas? Execute os testes e me envie os resultados!
