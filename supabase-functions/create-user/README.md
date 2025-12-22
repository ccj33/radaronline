# Edge Function: create-user

## 📋 Instruções para aplicar no Supabase

1. Acesse o **Supabase Dashboard**
2. Vá em **Functions** > **create-user** > **Code Editor**
3. **Substitua TODO o código** pelo conteúdo do arquivo `index.ts`
4. Clique em **Deploy**
5. Teste criando um usuário com role 'gestor' ou 'usuario'

---

## ✅ Melhorias Aplicadas

### 1. Remoção de Redundâncias
- ✅ Helper `errorResponse` e `successResponse` (evita duplicação)
- ✅ Validações centralizadas em `validateAndSanitizeInputs()`
- ✅ Função `checkIsAdmin()` extraída (reutilizável)
- ✅ Body parseado uma vez
- ✅ Constantes centralizadas

### 2. Prevenção de Bugs
- ✅ Lógica de admin corrigida
- ✅ Autenticação corrigida (`getUser` em vez de `getUserById`)
- ✅ Roles alinhados com app: `['admin', 'gestor', 'usuario']`
- ✅ Sanitização global de inputs
- ✅ Validações com tipos e guards

### 3. Safeguards Automáticos
- ✅ Retry limitado (2 tentativas)
- ✅ Timeout no retry (30s)
- ✅ Rollback automático (deleta user se perfil falhar)
- ✅ Validações fail-fast

### 4. Monitoramento
- ✅ Logging padronizado com tags `[create-user]`
- ✅ Logs estruturados (message, stack, timestamp)

### 5. Patterns
- ✅ Funções extraídas (não muito longas)
- ✅ Sem hardcode (constantes centralizadas)
- ✅ Logging em pontos críticos
- ✅ Edge cases tratados

---

## 🔧 Estrutura da Resposta

A Edge Function retorna:
```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "email@example.com"
    },
    "profile": {
      "id": "uuid",
      "nome": "Nome",
      "email": "email@example.com",
      "role": "admin|gestor|usuario",
      "microregiao_id": "MR001" | null,
      "ativo": true,
      "lgpd_consentimento": false,
      "created_by": "uuid",
      "created_at": "timestamp"
    }
  }
}
```

O app espera `functionData.data.profile` e já está configurado corretamente.

---

## ⚠️ Importante

- **Roles válidos**: `admin`, `gestor`, `usuario`
- **Microrregião**: Obrigatória para `gestor` e `usuario`, opcional (null) para `admin`
- **Senha mínima**: 6 caracteres
- **Email**: Deve ser válido e único

