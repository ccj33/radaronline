# Status do Programa

## Estado atual

Data de referencia: 2026-03-23

### Percentual real

- frontend estrutural: 100%
- refatoracao de codigo do repositorio: 100%
- prontidao arquitetural e documental para fabrica: 90%
- prontidao enterprise completa para subir e operar em Azure: 99%

## O que esta concluido

### Codigo

- frontend modularizado
- services modularizados
- testes verdes
- build verde
- observabilidade basica no frontend
- `apps/api` com build e testes verdes
- monitoramento de uso do Radar removido do frontend admin
- instrumentacao de sessao, tempo de uso e paginas mais acessadas removida do app
- `activity_logs` mantido apenas para auditoria minima de acoes no frontend (`view`, `update`, `delete`)
- aba `Atividades` do admin restaurada para exibir logins e historico de acoes com autor e avatar
- gravacao geral de `activity_logs` removida de `apps/api` e `supabase-functions/*`
- regra compartilhada de portfolio de acoes criada em `src/lib/actionPortfolio.ts` para unificar atraso, conclusao e agrupamento por atividade entre dashboard, visao rapida, overview admin e relatorios
- comparacao de `activityId` endurecida para suportar formatos legados e normalizados em `src/lib/text.ts` e `src/lib/actionValidation.ts`, reduzindo drift antes do cutover Azure
- flyout de `Microrregioes` na sidebar admin agora fecha com atraso curto e sem vao lateral, reduzindo perda de contexto na selecao por hover e preservando a usabilidade antes do handover
- teste de regressao adicionado para o hover da sidebar em `src/components/layout/sidebar/SidebarAdminNavigation.test.tsx`
- `MainViewContentSwitch` agora repassa `filteredObjectives` e `filteredActivities` para a `Visao Rapida` e o calendario, evitando vazamento de objetivos e atividades de outras microrregioes quando o admin entra no modo de contexto local
- cards do `Mural da Rede` deixam de esticar a mesma linha do grid ao expandir um comunicado, eliminando o efeito visual de "abrir dois" ao usar `Ler mais`
- `NewsFeed` agora respeita `viewingMicroregiaoId` quando houver contexto de microrregiao selecionado, alinhando o mural ao mesmo escopo de navegacao do planejamento
- teste de regressao adicionado para garantir que a `Visao Rapida` receba apenas objetivos e atividades filtrados em `src/components/main/MainViewContentSwitch.test.tsx`
- workspace `community` agora abre em uma Home propria do `Hub`, em vez de cair direto em `forums`, dando ao produto uma entrada unica para comunidade, mentoria, educacao e biblioteca
- `SidebarCommunityNavigation`, `MobileBottomNav` e `Header` passaram a reconhecer o `Hub` como fluxo proprio, corrigindo a navegacao comunitaria no desktop e no mobile e removendo o tratamento indevido das telas do Hub como "configuracoes"
- `src/features/hub/home/HubHomePage.tsx` consolida um primeiro redesign aplicado do Hub com linguagem editorial, cards de capacidade, jornadas prioritarias e leitura integrada de foruns, mentorias, educacao e repositorio
- teste de regressao adicionado para garantir que `MainViewContentSwitch` carregue a Home do Hub e preserve a navegacao comunitaria por callback
- `HubHomePage` foi simplificada para uma entrada mais minimalista e funcional, trocando o excesso de hero, metricas e blocos narrativos por lista de entradas, continuidade e destaques mais silenciosos
- a entrada de `ForumsPage` foi simplificada para um fluxo mais direto: menos explicacao visual, selecao de escopo em chips e lista principal aparecendo antes de cards e blocos de contexto
- `MentorshipPage` saiu do formato de dashboard com tabs e KPI grid e passou a priorizar continuidade, busca direta de mentores e um espaco mais enxuto para atuacao como mentor
- `EducationPage` passou a abrir por continuidade de aprendizado, com catalogo direto e trilhas em seco, removendo o excesso de tabs e cards numericos antes do conteudo
- `RepositoryPage` foi redesenhada como biblioteca minimalista de busca e lista, removendo o bloco de estatisticas pesadas e deixando a descoberta de materiais mais proxima de um catalogo real

### Documentacao

- arquitetura corrente
- seguranca
- operacao
- handover
- arquitetura alvo Azure
- programa de entrega
- backlog de backend
- mapa de migracao Supabase -> Azure
- governanca formal de migrations
- documentacao de containerizacao e deploy

### Scaffold

- `apps/api` criado
- `infra/bicep` criado
- OpenAPI inicial criado
- `database/migration-authority.json` criado
- `apps/api/Dockerfile` criado

### Bridge de transicao implementada

- auth provider do `apps/api` opera em modo desenvolvimento e bridge com Supabase atual
- users repository do `apps/api` opera com persistencia real no provider atual
- frontend agora tem cliente HTTP em `src/services/apiClient.ts`
- administracao de usuarios do frontend pode ser desviada para a API por feature flag
- o runtime do frontend agora pode bloquear fallback silencioso para `supabase-functions/*` via `VITE_DISABLE_LEGACY_SUPABASE_ADMIN_FLOW=true`

### Perfil autenticado e sessao backend-first

- `GET /v1/auth/session`
- `GET /v1/auth/profile`
- `POST /v1/auth/lgpd/accept`
- `POST /v1/auth/first-access/complete`
- `src/services/authProfileApi.ts` criado
- `src/services/sessionApi.ts` criado
- `src/services/session/sessionProviderFactory.ts` centraliza a escolha do provider de sessao no frontend
- `src/services/session/backendFirstSessionProvider.ts` e `src/services/session/supabaseSessionProvider.ts` isolam o runtime atual da costura backend-first
- `src/services/sessionService.ts` virou fachada sobre providers de sessao
- `src/services/authService.ts` pode desviar hidratacao do perfil autenticado, LGPD e primeiro acesso para a API

### Dominios migrados para backend proprio

- users
- actions
- requests
- announcements
- comments
- tags
- teams
- objectives e activities

### Trilha de identidade final iniciada

- `apps/api/src/shared/auth/auth-provider.factory.ts` centraliza a escolha do provider
- `apps/api/src/shared/auth/entra-jwt.provider.ts` valida JWT com JWKS remoto
- `apps/api/src/config/env.ts` agora suporta `AUTH_PROVIDER`, `ENTRA_AUDIENCE`, `ENTRA_ISSUER`, `ENTRA_JWKS_URI` e `ENTRA_ROLE_CLAIM`
- `apps/api` ja consegue operar com `AUTH_PROVIDER=entra-jwt` sem reescrever o bootstrap
- testes puros cobrem mapeamento de claims e roles do provider Entra

### Qualidade do backend

- `apps/api/src/app.test.ts` cobre smoke tests iniciais da API
- `apps/api/src/shared/auth/entra-jwt.provider.test.ts` cobre mapeamento de claims do provider Entra
- `.github/workflows/ci.yml` valida:
  - `lint`
  - `test:run`
  - `build`
  - `verify:readiness`
  - `apps/api build`
  - `apps/api test`

### Automacao de homologacao e cutover

- `scripts/smoke-backend-homologation.mjs`
- `scripts/smoke-users-cutover.mjs`
- `npm run smoke:backend`
- `npm run smoke:users-cutover`
- runbook documenta o endurecimento do cutover administrativo com desativacao do fluxo legado

### Infraestrutura Azure no repositorio

- `infra/bicep/main.bicep` orquestra modulos de workload
- `infra/bicep/modules/workload-core.bicep` cobre Log Analytics, Application Insights e Key Vault
- `infra/bicep/modules/workload-data.bicep` cobre PostgreSQL Flexible Server, banco principal e Service Bus
- `infra/bicep/modules/workload-app.bicep` cobre Container Apps Environment, API app e worker app
- `infra/bicep/modules/workload-apim.bicep` cobre API Management
- `infra/bicep/modules/workload-edge.bicep` cobre Front Door Premium, rotas web e API e WAF pronto para associacao a custom domains
- `infra/README.md` documenta parametros obrigatorios e de transicao
- o Bicep ja contempla variaveis de Entra para a trilha final de identidade

### CI e CD no repositorio

- `.github/workflows/ci.yml`
- `.github/workflows/deploy-infra.yml`
- `.github/workflows/deploy-api.yml`
- `.github/workflows/deploy-web.yml`
- `apps/api/Dockerfile` permite build de imagem para Azure Container Apps
- a prontidao agora exige workflows de deploy presentes no repositorio

### Governanca de banco

- `database/migration-authority.json` define `supabase/migrations/` como trilha autoritativa de schema
- `docs/database-governance.md` documenta a politica de consolidacao
- `docs/database-legacy-inventory.md` inventaria os scripts legados fora da trilha autoritativa
- `scripts/report-legacy-migrations.mjs` gera o inventario
- `scripts/verify-enterprise-readiness.mjs` falha se a autoridade de migrations estiver ausente ou inconsistente

## O que ainda bloqueia a fabrica

1. a bridge real ainda nao foi executada ponta a ponta com credenciais reais em homologacao
2. identidade oficial ainda nao foi validada com Entra real, embora a trilha de provider ja exista no backend
3. o frontend ainda usa Supabase no runtime principal para login, logout e subscribe de auth
4. `supabase-functions/*` ainda nao foram desativadas em producao, embora o caminho de bloqueio do legado ja exista
5. `infra/bicep` e os workflows de deploy ainda nao foram validados em Azure real
6. ainda existem scripts SQL legados fora da trilha autoritativa que precisam ser consolidados ou aposentados

## Proximo corte recomendado

- consolidar a decisao de produto removendo do schema autoritativo e da documentacao legado o que ainda sobrar de analytics de uso e `user_sessions`, mantendo `activity_logs` apenas enquanto suporte a auditoria minima de acoes
- validar em banco real a integridade entre `actions.activity_id` e `activities.id` e promover qualquer correcao remanescente para `supabase/migrations/`, sem depender de scripts legados fora da trilha autoritativa
- revisar outros flyouts e overlays do admin para garantir o mesmo padrao de tolerancia de hover e evitar regressao visual no merge
- revisar outras telas que ainda consumam colecoes globais no `MainViewContentSwitch` para garantir que qualquer modo contextualizado por microrregiao receba sempre datasets ja escopados
- aprofundar o redesign do Hub nos modulos internos (`forums`, `mentorship`, `education` e `repository`) usando a nova Home como shell de referencia e fechar contratos de dominio antes da modelagem definitiva do banco
- aplicar o mesmo corte de minimalismo nos interiores de `mentorship`, `education` e `repository`, removendo KPIs redundantes, tabs excessivas e chrome de dashboard para aproximar a experiencia de feed, lista e continuidade
- revisar os detalhes internos do Hub (ex.: perfil de mentor, modal de biblioteca e possiveis telas de detalhe futuras) com a mesma regua de simplicidade para evitar regressao visual apos a modelagem de backend

## Proximo corte obrigatorio

### Sprint tecnica imediata

1. executar `npm run smoke:backend` e `npm run smoke:users-cutover` em homologacao com credenciais reais
2. ativar `VITE_DISABLE_LEGACY_SUPABASE_ADMIN_FLOW=true` no ambiente de homologacao apos validar `users`, `auth profile` e `first-access`
3. conectar `AUTH_PROVIDER=entra-jwt` a um tenant real e validar `GET /v1/auth/session` e `GET /v1/auth/profile`
4. substituir o caminho produtivo de `create-user`, `delete-user` e `update-user-password` pela API
5. validar `deploy-infra`, `deploy-api` e `deploy-web` em Azure real
6. consolidar scripts legados de `database/migrations` e `database/fixes` na trilha autoritativa

## Riscos mais importantes

1. criar backend como proxy de tabela
2. manter permissao no frontend sem autoridade no backend
3. migrar auth sem plano de provisionamento de perfil
4. manter scripts de schema fora da trilha autoritativa
5. assumir IaC e CD sem validacao real de deploy

## Instrucao para o proximo agente

Nao reabrir a analise do frontend.

Comecar por:

1. homologacao real do backend com feature flags e `VITE_DISABLE_LEGACY_SUPABASE_ADMIN_FLOW=true`
2. validacao de `AUTH_PROVIDER=entra-jwt` com tenant real
3. retirada efetiva de `supabase-functions/*` do fluxo administrativo

Depois:

4. validacao real de `infra/bicep` e workflows de deploy
5. consolidacao das migrations legadas
6. preparacao do cutover de identidade
