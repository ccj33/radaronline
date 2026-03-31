# Auditoria de Seguranca - 2026-03-30

## Objetivo

Registrar a leitura do relato do Luis, dos audios enviados, do print de rede e da inspecao tecnica do repositorio para orientar a correcao dos gaps mais urgentes de seguranca.

## Escopo

- frontend atual em `src/`
- backend de transicao em `apps/api`
- edge functions legadas em `supabase-functions/`
- trilha autoritativa de banco em `supabase/migrations/`
- configuracao e documentacao de seguranca no repositorio

## Metodo

1. leitura dos arquivos de referencia obrigatoria do programa
2. inspecao do print e dos audios enviados
3. rastreamento das chamadas de frontend para Supabase e API propria
4. revisao dos controles de auth, authorization, CORS, segredos e fluxo administrativo
5. verificacao de dependencias com `npm audit --omit=dev`

## Resumo do relato do Luis

O relato do Luis aponta tres preocupacoes principais:

1. existem requests quebrando para endpoints/tabelas que podem ter sumido nas refatoracoes ou nunca terem existido de fato no ambiente atual
2. o header `Authorization` aparece no browser e foi corretamente interpretado por ele como token de sessao do usuario
3. o header `apikey` foi percebido como possivel segredo privilegiado compartilhado entre admin e usuario comum

Os audios reforcam a leitura de que ele nao viu evidencias de populacao consistente do banco para o Hub e que ficou em duvida sobre o impacto real do `apikey` aparecer no DevTools.

## Conclusao executiva

O risco residual do repositorio, apos as correcoes aplicadas nesta rodada, e **alto**.

O print do Luis nao comprova exposicao de uma chave privilegiada no frontend. Pelo codigo atual, o browser usa a `VITE_SUPABASE_ANON_KEY`, que e publica por desenho do Supabase. O problema real nao e a visibilidade do `apikey` em si, e sim:

- o frontend ainda acessa o provider diretamente
- o Hub ainda consulta tabelas fora da trilha autoritativa de schema
- a API bridge usa `service_role` no backend, mas ainda possui lacunas importantes de authorization

Em paralelo, o `Authorization` do print e um bearer token de sessao valido no contexto do usuario. Se esse print circulou fora da fronteira de confianca, a sessao deve ser invalidada por operacao.

## Correcoes aplicadas nesta rodada

- `apps/api` nao faz mais fallback automatico para `DevHeaderAuthProvider` em `production` sem allowlist explicita
- `SessionUser` passou a carregar `microregionId` e os providers de auth foram enriquecidos com esse escopo
- `actions`, `objectivesActivities`, `teams`, `tags`, `comments` e `announcements` passaram a validar escopo de microrregiao server-side
- `POST /v1/requests` deixou de aceitar spoof de ownership por `userId` do payload
- mutacoes globais de `tags` foram restringidas a roles administrativas e operacoes por acao agora respeitam escopo
- a API recebeu allowlist de CORS por ambiente, headers de seguranca e rate limiting basico
- os fluxos de relatorio/impressao passaram a escapar HTML dinamico e higienizar cores inline
- o frontend passou a preferir `sessionStorage` para a sessao Supabase e o Hub legado pode ser bloqueado por flag ou por default em `production`
- o frontend agora passa a preferir a API propria por default sempre que `VITE_BACKEND_API_URL` estiver configurada, deixando o Supabase direto apenas como excecao de compatibilidade
- a criacao de `requests` agora usa backend apenas para o proprio ator autenticado; notificacoes para terceiros e lotes seguem no Supabase enquanto nao existir endpoint administrativo equivalente
- os modulos legados do Hub agora ficam bloqueados automaticamente tambem quando a API nova estiver configurada, reduzindo o risco de consultas diretas para tabelas fora da trilha autoritativa
- `mentorship`, `education` e `repository` ganharam fallback frontend-only persistido em `localStorage`, removendo a dependencia de tabelas ausentes para o Hub funcionar sem backend novo
- `forums` passou a expor o estado de fallback para a UI, permitindo comunicar claramente quando o Hub esta operando em modo local
- `public/index.html` recebeu CSP basica e politica de `referrer` mais restrita
- `public/index.html` deixou de expor preconnect hardcoded do projeto Supabase
- edge functions legadas tiveram corte de logs/debug excessivos e `create-user` nao aceita mais `createdBy` vindo do cliente
- `apps/api/package.json` foi atualizado e `npm --prefix apps/api audit --omit=dev` agora retorna `0` vulnerabilidades

## Validacao executada apos as correcoes

- `npm run lint`
- `npm run test:run`
- `npm run build`
- `npm --prefix apps/api run build`
- `npm --prefix apps/api run test`
- `npm --prefix apps/api audit --omit=dev --json`

Todos os comandos acima ficaram verdes nesta rodada.

## Leitura do print e dos audios

### O que esta correto no relato

- `Authorization: Bearer ...` no browser e esperado no modelo atual com Supabase Auth
- a mesma `apikey` entre usuarios diferentes tambem e esperada quando ela e a anon key publica
- requests quebrando para `forums`, `mentors`, `mentorship_matches`, `courses`, `trails` e `materials` sao consistentes com drift real do repositorio

### O que nao ficou confirmado como incidente

- nao ha evidencia no codigo inspecionado de `SUPABASE_SERVICE_ROLE_KEY` exposta no frontend
- nao ha evidencia de segredo privilegiado versionado em arquivos tracked do app web

## Achados

### CRIT-01 - `apps/api` pode cair em auth de desenvolvimento por header se subir sem configuracao real

Se a API for iniciada sem configuracao valida de Supabase bridge e sem configuracao valida de Entra, o factory escolhe `DevHeaderAuthProvider`, que autentica qualquer chamada que envie `x-dev-user-id`, `x-dev-user-email` e `x-dev-user-name`.

Impacto:

- takeover total da API por cabecalhos forjados em caso de deploy mal configurado
- bypass completo de auth em producao por erro operacional

Recomendacao:

- falhar o bootstrap em qualquer ambiente diferente de `development` quando nao existir provider real
- exigir allowlist explicita para auth de desenvolvimento

### ALTO-01 - o Hub ainda chama tabelas fora da trilha autoritativa, o que explica os endpoints quebrando

O frontend continua chamando Supabase/PostgREST diretamente para `forums`, `forum_topics`, `mentors`, `mentorship_matches`, `courses`, `trails` e `materials`. Essas entidades nao aparecem na trilha autoritativa em `supabase/migrations/`.

Impacto:

- requests quebrando em runtime
- comportamento inconsistente entre ambientes
- lock-in direto no provider no trecho mais sensivel do Hub

Observacao:

- `forums` tem fallback local parcial
- `mentorship`, `education` e `repository` nao mostram fallback equivalente e tendem a falhar com tela vazia/erro

Recomendacao:

- bloquear os modulos do Hub por feature flag ate existir trilha autoritativa ou backend oficial
- ou migrar esses modulos para contratos backend-first antes de mantelos expostos

### ALTO-02 - a API bridge usa `service_role` no backend sem authorization de escopo suficiente

Os repositories bridge usam `SUPABASE_SERVICE_ROLE_KEY`, o que ignora RLS no banco. Isso so e seguro se toda a autorizacao de negocio estiver fechada no backend, o que ainda nao ocorre.

Exemplos observados:

- `actions`, `objectivesActivities` e `teams` validam role, mas nao validam ownership ou escopo de microrregiao antes de mutar dados
- `tags` permite mutacao global sem role administrativa

Impacto:

- gestor pode tentar operar dados fora da propria microrregiao
- qualquer falha de authorization server-side vira acesso amplo ao banco, porque o repository usa `service_role`

Recomendacao:

- mover a verificacao de escopo para service/use case antes de qualquer mutacao
- carregar perfil/microrregiao do ator no backend e negar operacoes cross-micro para `gestor` e `usuario`

### ALTO-03 - `POST /v1/requests` aceita spoof de `userId`

O service aceita `userId` opcional vindo do payload e usa esse valor quando presente, mesmo para ator comum autenticado.

Impacto:

- usuario autenticado pode criar request em nome de outro usuario
- trilha de auditoria e ownership da solicitacao ficam corrompidos

Recomendacao:

- ignorar `userId` do body para qualquer ator nao administrativo
- idealmente remover `userId` do contrato publico de criacao e derivar sempre do token

### ALTO-04 - mutacoes de tags estao expostas para qualquer usuario autenticado

As rotas de tags usam apenas `assertAuthenticated`, e o service nao reforca role antes de criar, apagar ou atribuir tags globais.

Impacto:

- usuarios comuns podem alterar taxonomia global
- risco de poluicao de dados, sabotagem e inconsistencias de classificacao

Recomendacao:

- restringir criacao/exclusao/assign/remove a `admin`, `superadmin` e, se fizer sentido de negocio, `gestor`
- separar "favoritar tag" de "mutar catalogo global"

### ALTO-05 - a API nao tem escopo confiavel de microrregiao e aceita consultas cross-scope

O backend nao carrega `microregionId` no `SessionUser` e varios endpoints aceitam `microregionId`, `email` ou `actionUid` diretamente da requisicao para listar ou mutar dados. Na pratica, um usuario autenticado consegue tentar consultar ou operar dados fora do proprio escopo se conhecer identificadores validos.

Exemplos observados:

- `SessionUser` nao carrega microrregiao no contrato de auth
- `GET /v1/actions`, `GET /v1/objectives`, `GET /v1/activities` e `GET /v1/teams` aceitam `microregionId` arbitrario vindo da query
- `GET /v1/teams/status` aceita qualquer `email`
- os repositories fazem as operacoes com `service_role`, entao nao existe RLS como ultima barreira

Impacto:

- exposicao indevida de dados entre microrregioes
- IDOR/BOLA em rotas de leitura e mutacao
- impossibilidade de provar authorization correta no backend atual

Recomendacao:

- enriquecer a sessao com `microregionId` e demais atributos de escopo
- derivar o escopo do ator no backend em vez de confiar em `microregionId` da request
- negar queries cross-micro para `gestor` e `usuario`

### MED-01 - exportacao de relatorios monta HTML sem escape de conteudo

Os fluxos de impressao usam `innerHTML` e `document.write` com campos de dominio interpolados em HTML bruto.

Impacto:

- stored XSS no fluxo de exportacao/impressao se titulo, nome ou texto vier contaminado
- aumento do impacto do uso de `persistSession: true` no browser

Recomendacao:

- escapar HTML antes de interpolar dados
- evitar `document.write` e `innerHTML` para conteudo de dominio

### MED-02 - CORS da API nova esta permissivo demais

O Fastify CORS atual aceita `origin: true` com `credentials: true`.

Impacto:

- ampliacao desnecessaria da superficie de ataque
- risco operacional maior quando a API migrar para cookies/sessoes server-side

Recomendacao:

- trocar por allowlist explicita por ambiente
- registrar em variavel de ambiente os origins autorizados

### MED-03 - `apps/api` possui vulnerabilidades moderadas de dependencias

`npm audit --omit=dev` em `apps/api` apontou vulnerabilidades moderadas em:

- `fastify`
- `brace-expansion`
- `yaml`

Recomendacao:

- executar `npm audit fix` em branch de hardening
- validar regressao de build e testes antes do merge

Status desta rodada:

- corrigido com atualizacao de `fastify` e `overrides` para `brace-expansion` e `yaml`
- `npm --prefix apps/api audit --omit=dev --json` retornou `0` vulnerabilidades

### MED-04 - a API nao declara rate limiting nem headers de seguranca

No `apps/api` nao ha evidencia de rate limiting, `helmet`, CSP server-side, HSTS, `X-Frame-Options`, `Referrer-Policy` ou `Permissions-Policy`. O bootstrap registra apenas CORS e as rotas.

Impacto:

- superficie maior para brute force, abuso e scraping
- protecoes basicas dependem implicitamente da borda externa e nao do codigo da aplicacao

Recomendacao:

- adicionar rate limiting por IP/rota sensivel
- emitir headers de seguranca explicitamente na API e no frontend publicado
- documentar quais controles ficam na app e quais ficam em Front Door/APIM

### MED-05 - edge functions legadas expõem debug e PII demais em logs e respostas

As edge functions administrativas legadas usam `service_role`, fazem `console.log` de `userId`, `email`, `role`, `targetProfile` e possuem modo opcional `EDGE_DEBUG_ERRORS` que devolve bloco `debug` para o cliente.

Impacto:

- vazamento de PII em logs operacionais
- aumento da exposicao de detalhes internos em erro se `EDGE_DEBUG_ERRORS=true`

Recomendacao:

- remover logs de email/role/profile de sucesso
- normalizar erros 4xx/5xx sem ecoar internals
- manter `EDGE_DEBUG_ERRORS` desabilitado e morto em producao

### MED-06 - IaC ainda publica recursos demais e o WAF nao fica anexado por padrao

Os modulos de infraestrutura ainda deixam `publicNetworkAccess` habilitado em Key Vault, PostgreSQL e Service Bus, expõem APIM publicamente e criam a policy WAF do Front Door sem associa-la quando `frontDoorCustomDomainResourceIds` esta vazio. Nos parametros `dev`, `hml` e `prod`, esse array esta vazio.

Impacto:

- endurecimento de rede incompleto na borda e no plano de dados
- falsa sensacao de protecao, porque o WAF existe mas pode nao proteger dominio nenhum

Recomendacao:

- anexar a policy WAF tambem ao default domain ou desabilitar `linkToDefaultDomain`
- fechar acesso publico dos recursos de dados quando a topologia privada estiver pronta
- usar referencias do Key Vault nas apps em vez de propagar segredo diretamente por parametro

### BAIXO-01 - `public/index.html` ainda aponta para um project ref fixo do Supabase

Existe preconnect hardcoded para um host especifico de Supabase.

Impacto:

- acoplamento indevido a um projeto/ambiente especifico
- exposicao desnecessaria de detalhe operacional do provider

Recomendacao:

- remover o preconnect fixo ou gerar isso por ambiente

### BAIXO-02 - hardening de supply chain e runtime ainda esta incompleto

Itens observados:

- `scripts/generate-map-layers.mjs` usa `new Function(...)` para interpretar objetos TS
- `apps/api/Dockerfile` executa como root
- workflows do GitHub usam actions por major tag, sem pin por commit SHA
- `apps/api` carrega `@fastify/swagger` e `@fastify/swagger-ui` em dependencia de producao sem uso aparente no bootstrap

Impacto:

- risco baixo a moderado de cadeia de suprimentos e de superficie desnecessaria

Recomendacao:

- trocar `new Function` por parser seguro
- executar container com usuario nao-root
- pinar actions criticas por SHA
- remover dependencias de runtime nao usadas

## Pontos positivos confirmados

- `.env` esta ignorado pelo Git
- o frontend inspecionado usa `VITE_SUPABASE_ANON_KEY`, nao `service_role`
- as edge functions legadas ja tentam restringir CORS por allowlist
- o root app nao apresentou vulnerabilidades de dependencia em `npm audit --omit=dev`
- nao encontrei uso de LLM no runtime atual do app, entao nao identifiquei superficie real de prompt injection no workspace

## Prioridade de remediacao

### P0

1. revisar sessao do usuario do print e invalidar token se o material tiver saído da fronteira interna
2. decidir bloqueio temporario ou migracao dos modulos do Hub que ainda consultam tabelas ausentes
3. retirar `supabase-functions/*` do caminho administrativo produtivo
4. validar `AUTH_PROVIDER=entra-jwt` com tenant real e claims de microrregiao
5. fechar o backlog de hardening de rede/WAF em `infra/bicep`

### P1

1. concluir a migracao backend-first do Hub
2. remover o acesso direto do frontend ao provider no alvo Azure
3. endurecer runtime e supply chain restantes (`new Function`, Docker root, GitHub Actions por SHA)

### P2

1. consolidar migrations legadas fora da trilha autoritativa
2. validar restore/rollback do banco em ambiente real
3. formalizar o cutover de identidade e operacao

## Limites desta auditoria

- nao houve validacao em ambiente remoto real do Supabase ou Azure
- nao houve teste de penetracao black-box
- os audios foram interpretados com apoio de transcricao automatica e revisao manual, com pequenas imprecisoes possiveis de fraseado

## Proximo passo sugerido

Usar esta rodada como baseline de endurecimento concluido no codigo e abrir o proximo corte focado em risco residual de arquitetura: concluir a migracao backend-first dos modulos ainda pendentes, retirar as edge functions do fluxo administrativo real e substituir as excecoes restantes de escrita direta no Supabase por endpoints administrativos equivalentes.
