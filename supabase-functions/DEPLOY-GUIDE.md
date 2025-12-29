# 🚀 Edge Functions - Guia de Deploy

## Funções Disponíveis

| Função | Propósito | Quem pode usar |
|--------|-----------|----------------|
| `create-user` | Criar novo usuário | Admin, Superadmin |
| `update-user-password` | Alterar senha de usuário | Admin, Superadmin |
| `delete-user` | Excluir usuário permanentemente | **Apenas Superadmin** |

---

## 📋 Pré-requisitos

1. **Supabase CLI** instalado:
   ```bash
   npm install -g supabase
   ```

2. **Login no Supabase**:
   ```bash
   supabase login
   ```

3. **Vincular ao projeto**:
   ```bash
   supabase link --project-ref SEU_PROJECT_REF
   ```
   > Encontre o `project-ref` na URL do seu projeto: `https://supabase.com/dashboard/project/SEU_PROJECT_REF`

---

## 🔧 Deploy das Funções

### Opção 1: Deploy via CLI (Recomendado)

```bash
# Navegue até a pasta do projeto
cd c:\Users\clevi\Desktop\radar 2.0 - Copia (2)

# Deploy de todas as funções
supabase functions deploy create-user
supabase functions deploy update-user-password
supabase functions deploy delete-user
```

### Opção 2: Deploy via Dashboard

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá em **Edge Functions**
3. Clique em **New Function**
4. Cole o código de cada arquivo `index.ts`

---

## ⚙️ Configuração Obrigatória

### Variáveis de Ambiente (já configuradas automaticamente)
- `SUPABASE_URL` - URL do projeto
- `SUPABASE_SERVICE_ROLE_KEY` - Chave de serviço (admin)

### CORS (Produção)

**Antes de ir para produção**, edite os arquivos e altere:

```typescript
// DE:
'Access-Control-Allow-Origin': '*'

// PARA:
'Access-Control-Allow-Origin': 'https://seu-dominio.vercel.app'
```

---

## 🧪 Testando as Funções

### Via curl (Terminal)

```bash
# Obter token de autenticação (substitua email/senha)
TOKEN=$(curl -X POST 'https://SEU_PROJETO.supabase.co/auth/v1/token?grant_type=password' \
  -H 'apikey: SUA_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"senha123"}' \
  | jq -r '.access_token')

# Testar create-user
curl -X POST 'https://SEU_PROJETO.supabase.co/functions/v1/create-user' \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "novo@example.com",
    "password": "senha123",
    "nome": "Novo Usuário",
    "role": "usuario",
    "microregiaoId": "MR009"
  }'

# Testar update-user-password
curl -X POST 'https://SEU_PROJETO.supabase.co/functions/v1/update-user-password' \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "UUID_DO_USUARIO",
    "password": "novaSenha123"
  }'

# Testar delete-user (requer superadmin)
curl -X POST 'https://SEU_PROJETO.supabase.co/functions/v1/delete-user' \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "UUID_DO_USUARIO"
  }'
```

### Via Dashboard

1. Vá em **Edge Functions** no Dashboard
2. Clique na função
3. Use o **Test Runner**

---

## 🔒 Segurança

### Proteções Implementadas

| Função | Proteção |
|--------|----------|
| `create-user` | Apenas admin pode criar |
| `update-user-password` | Superadmin não pode ter senha alterada por outros |
| `delete-user` | Apenas superadmin pode excluir; superadmin não pode ser excluído |

### Logs

Todas as funções registram operações críticas em `activity_logs`:
- `user_created`
- `user_password_updated`
- `user_deleted`

---

## 🐛 Troubleshooting

### "Não autenticado"
- Verifique se o token JWT está válido
- Verifique se está passando o header `Authorization: Bearer TOKEN`

### "Apenas administradores podem..."
- O usuário logado não é admin/superadmin
- Verifique a coluna `role` na tabela `profiles`

### "Edge Function not found"
- A função não foi deployada
- Rode `supabase functions list` para verificar

### "CORS error"
- Atualize o `Access-Control-Allow-Origin` para incluir seu domínio

---

## 📁 Estrutura de Arquivos

```
supabase-functions/
├── create-user/
│   ├── index.ts          # Código da função
│   └── README.md         # Documentação específica
├── update-user-password/
│   └── index.ts          # Código da função
├── delete-user/
│   └── index.ts          # Código da função
├── deno.d.ts             # Tipos do Deno
└── tsconfig.json         # Configuração TypeScript
```

---

## ✅ Checklist de Deploy

- [ ] CLI do Supabase instalado e logado
- [ ] Projeto vinculado (`supabase link`)
- [ ] Deploy das 3 funções
- [ ] CORS configurado para produção
- [ ] Testado via curl ou Dashboard
- [ ] Verificado logs no Dashboard
