# RADAR 2.0 - Documentação do Supabase

## Estrutura do Banco de Dados

### Tabela: `profiles`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | ID do usuário (= auth.users.id) |
| `nome` | TEXT | Nome completo |
| `email` | TEXT | Email do usuário |
| `role` | TEXT | Nível de acesso: `superadmin`, `admin`, `gestor`, `usuario` |
| `microregiao_id` | TEXT | FK → microregioes (null = acesso total) |
| `avatar_id` | TEXT | ID do avatar (default: 'zg10') |
| `ativo` | BOOLEAN | Se o usuário está ativo |
| `lgpd_consentimento` | BOOLEAN | Consentimento LGPD |
| `municipio` | TEXT | Município do usuário |
| `created_by` | UUID | Quem criou o usuário |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Última atualização |

### Tabela: `microregioes` (NOVA)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | TEXT PK | ID da microrregião (ex: "MR009") |
| `codigo` | TEXT | Código oficial (ex: "31009") |
| `nome` | TEXT | Nome (ex: "São Sebastião do Paraíso") |
| `macrorregiao` | TEXT | Nome da macrorregião |
| `macro_id` | TEXT | ID da macrorregião (ex: "MAC16") |
| `urs` | TEXT | Unidade Regional de Saúde |

### Tabela: `actions`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | ID interno (PK) |
| `uid` | TEXT | Chave única: `{microregiao_id}::{action_id}` |
| `action_id` | TEXT | ID da ação (ex: "1.1.1") |
| `activity_id` | TEXT | ID da atividade pai (ex: "1.1") |
| `microregiao_id` | TEXT | FK → microregioes |
| `title` | TEXT | Título da ação |
| `status` | TEXT | `Não Iniciado`, `Em Andamento`, `Concluído`, `Atrasado` |
| `start_date` | DATE | Data de início |
| `planned_end_date` | DATE | Data prevista de término |
| `end_date` | DATE | Data real de término |
| `progress` | INTEGER | Progresso 0-100 |
| `notes` | TEXT | Notas/observações |
| `created_by` | UUID | Quem criou |

### Tabela: `action_raci`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | ID único |
| `action_id` | UUID | FK → actions |
| `member_name` | TEXT | Nome do membro |
| `role` | TEXT | Papel RACI: `R`, `A`, `C`, `I` |

### Tabela: `action_comments`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | ID único |
| `action_id` | UUID | FK → actions |
| `author_id` | UUID | FK → profiles |
| `parent_id` | UUID | FK → action_comments (para threads) |
| `content` | TEXT | Conteúdo do comentário |
| `created_at` | TIMESTAMP | Data de criação |

### Tabela: `teams`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | ID único |
| `microregiao_id` | TEXT | FK → microregioes |
| `name` | TEXT | Nome do membro |
| `cargo` | TEXT | Cargo/função na equipe (⚠️ renomeado de 'role') |
| `email` | TEXT | Email |
| `municipio` | TEXT | Município |
| `profile_id` | UUID | FK → profiles (se cadastrado) |

### Tabela: `user_requests`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | ID único |
| `user_id` | UUID | FK → profiles |
| `request_type` | TEXT | `profile_change`, `mention`, `system` |
| `content` | TEXT | Conteúdo da solicitação |
| `status` | TEXT | `pending`, `resolved`, `rejected` |
| `resolved_by` | UUID | Quem resolveu |
| `resolved_at` | TIMESTAMP | Quando foi resolvido |
| `admin_notes` | TEXT | Notas do admin |

### Tabela: `activity_logs`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | ID único |
| `user_id` | UUID | FK → profiles |
| `action_type` | TEXT | Ex: `login`, `user_created`, `action_updated` |
| `entity_type` | TEXT | `auth`, `action`, `user`, `view` |
| `entity_id` | TEXT | ID da entidade afetada |
| `metadata` | JSONB | Dados adicionais |
| `created_at` | TIMESTAMP | Data de criação |

> ⚠️ Logs são imutáveis (UPDATE/DELETE bloqueados por RLS)

---

## Roles e Permissões

| Role | Descrição | Acesso |
|------|-----------|--------|
| `superadmin` | Super Administrador | Tudo |
| `admin` | Administrador | Tudo |
| `gestor` | Gestor de Microrregião | Apenas sua microrregião |
| `usuario` | Usuário comum | Apenas sua microrregião |

---

## Edge Functions

### `create-user`
- **Endpoint**: `/functions/v1/create-user`
- **Método**: POST
- **Acesso**: Apenas `admin` e `superadmin`
- **Body**:
```json
{
  "email": "user@email.com",
  "password": "senha123",
  "nome": "Nome do Usuário",
  "role": "usuario",
  "microregiaoId": "MR001"
}
```

### `update-user-password`
- **Endpoint**: `/functions/v1/update-user-password`
- **Método**: POST
- **Acesso**: Apenas `admin`
- **Body**:
```json
{
  "userId": "uuid-do-usuario",
  "password": "nova-senha"
}
```

### `delete-user`
- **Endpoint**: `/functions/v1/delete-user`
- **Método**: POST
- **Acesso**: Admin
- **Body**:
```json
{
  "userId": "uuid-do-usuario"
}
```

---

## RLS Policies (Row Level Security)

### Profiles
- **Admin/Superadmin**: Vê e edita todos
- **Usuários**: Veem apenas próprio perfil
- **Insert**: Apenas admins podem inserir

### Actions
- **Admin/Superadmin**: Acesso total
- **Gestor/Usuário**: Apenas ações da sua microrregião

### User Requests
- **Usuários**: Veem/criam apenas suas solicitações
- **Admins**: Veem todas e podem resolver

---

## Trigger: `on_auth_user_created`

Quando um usuário é criado no `auth.users`, automaticamente cria um perfil em `profiles` com:
- Nome do metadata ou "Usuário"
- Role do metadata ou "usuario"
- Microrregião do metadata (se fornecida)
- `ativo: true`
- `lgpd_consentimento: false`
