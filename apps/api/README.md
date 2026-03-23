# API Backend

## Objetivo

Backend proprio do Radar 2.0 para substituir o backend implicito do Supabase.

## Stack base escolhida

- Node.js 20
- TypeScript
- Fastify
- Zod
- OpenAPI

## Estrutura inicial

```text
apps/api
  openapi/
  src/
    config/
    modules/
      actions/
      announcements/
      auth/
      comments/
      health/
      requests/
      tags/
      users/
    shared/
      http/
```

## Regras de implementacao

- endpoint de dominio, nao de tabela
- validacao server-side obrigatoria
- authorization middleware em todas as rotas protegidas
- correlation id em cada request
- resposta de erro em Problem Details

## Comandos previstos

```bash
npm install
npm run dev
npm run build
npm run test
```

## Containerizacao

Arquivo:

- `apps/api/Dockerfile`

Uso esperado:

- build de imagem para Azure Container Apps
- deploy automatizado por `.github/workflows/deploy-api.yml`

## Variaveis de ambiente de transicao

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PORT`
- `HOST`
- `AUTH_PROVIDER`
- `ENTRA_TENANT_ID`
- `ENTRA_AUDIENCE`
- `ENTRA_ISSUER`
- `ENTRA_JWKS_URI`
- `ENTRA_ROLE_CLAIM`

Sem `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`, a API sobe em modo de desenvolvimento:

- auth por headers de desenvolvimento
- users repository em memoria

Com essas variaveis, a API passa para modo bridge:

- sessao validada contra o provider atual
- CRUD persistido no provider atual para `users`, `actions`, `requests`, `announcements`, `comments` e `tags`

Com `AUTH_PROVIDER=entra-jwt` e variaveis `ENTRA_*`, a API passa a validar bearer token por JWT assinado:

- issuer e audience validados no backend
- mapeamento de role por claim configuravel
- selecao do provider deixa de depender do Supabase Auth como identidade oficial

## Proximo incremento obrigatorio

1. homologacao real com credenciais
2. substituicao efetiva de `supabase-functions/*`
3. identidade final com Entra
4. testes do `apps/api`
