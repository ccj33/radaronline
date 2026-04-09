# Discourse open source no Hub do Radar: login unificado e Azure

Este documento descreve como acoplar o [Discourse](https://github.com/discourse/discourse) ao login do Radar para uso como fórum do Hub, e como encaixar isso na arquitetura alvo em Azure. Não substitui a documentação oficial do Discourse; serve como roteiro de integração para o time.

## Contexto no produto

O Radar já prevê o Hub com módulo de fóruns. Hoje a trilha nativa pode ser Supabase-first ou evoluir para API própria (ver `docs/program-status.md`). Usar Discourse self-hosted é uma opção quando se quer fórum maduro (moderation, plugins, busca, notificações) sem implementar tudo no app. O login deve parecer único: o utilizador entra no Radar e, ao abrir o fórum, não cria outra conta “à parte”, salvo política explícita.

## Escopos do fórum: macro, micro e município

O fluxo de fórum no Hub deve respeitar **três níveis de âmbito**, todos first-class no produto:

| Âmbito | Papel na experiência |
|--------|----------------------|
| **Macro** | Discussão e conteúdo ao nível da **rede ou agregado estratégico** (visão transversal, prioridades globais, orientação comum). |
| **Micro** | Fórum ligado a uma **micro** concreta (equipa, território ou célula operacional dentro do modelo Radar). |
| **Município** | Fórum ao nível **municipal**, alinhado com planeamento e realidade local. |

Na UI do Hub, o utilizador escolhe ou é encaminhado para o contexto certo (chips, navegação ou URL com identificadores de micro/município). O Discourse pode materializar isso com **categorias ou tags** por âmbito, **subcaminhos** (`/c/macro/...`, `/c/micro-slug/...`, `/c/municipio/...`) ou instâncias separadas só se a política de isolamento o exigir; o desenho preferível é **uma instância Discourse** com separação lógica e permissões, para reduzir custo operacional.

### Gestores com visão transversal

Utilizadores com perfil de **gestor** não ficam presos a uma única micro ou a um único município: podem **consultar e intervir** em fóruns de **várias micros** e **vários municípios** para as quais tenham delegação. A API Radar (ou o modelo de dados de governança) deve expor essa lista de âmbitos; o endpoint DiscourseConnect (ou job de sincronização) deve traduzir isso em **grupos Discourse** ou equivalente, para que categorias restritas apareçam apenas a quem tem escopo.

### Governança: quem acede ao planeamento e ao Hub

Existe um fluxo de **governança** distinto do simples “estar autenticado”:

- **Gestores** (e perfis administrativos definidos no Radar) podem **editar** quem tem direito a aceder ao **planeamento** e ao **Hub** (convites, remoção de acesso, alteração de papel ou de âmbito).
- Essa matriz é a **fonte de verdade**: sem registo explícito de permissão, o utilizador não deve ver módulos sensíveis nem categorias de fórum correspondentes.
- Na integração com Discourse, cada login SSO deve incluir apenas os **grupos / claims** coerentes com essa governança; o planeamento e o Hub continuam a ser autorizados pela **API Radar** e pelas políticas do produto, não só pelo Discourse.

Em resumo: macro, micro e município estruturam **onde** se conversa; gestores veem **vários** desses âmbitos quando a delegação permitir; a governança define **quem** pode usar planeamento, Hub e, por extensão, que partes do fórum estão visíveis.

## Requisitos do Discourse (oficial)

- Ruby recente, PostgreSQL (versão mínima indicada no repositório), Redis.
- Em produção, o caminho suportado pela comunidade é em geral **Docker** ou imagem oficial / [install guide](https://github.com/discourse/discourse#setting-up-discourse).

## Forma recomendada de acoplar o login: DiscourseConnect

O mecanismo nativo para “o meu site é a fonte de verdade da identidade” chama-se **DiscourseConnect** (antigo “Discourse SSO”). O Discourse redireciona o utilizador para o Radar (ou para a API que representa o Radar), o servidor valida a sessão, e devolve ao Discourse um payload assinado com email, id externo e outros campos.

Referência oficial: [Setup DiscourseConnect](https://meta.discourse.org/t/setup-discourseconnect-official-single-sign-on-for-discourse-sso/13045).

### Fluxo resumido

1. Utilizador clica em entrar no Discourse (ou acede a URL protegida).
2. Discourse envia pedido ao endpoint configurado com parâmetros `sso` e `sig`.
3. O **servidor** do Radar (não o React isolado) valida `sig` com o segredo partilhado, descodifica o payload, obtém o `nonce`.
4. O servidor confirma que o utilizador está autenticado no Radar (cookie de sessão, JWT da API, ou validação com o IdP, conforme o desenho atual/futuro).
5. O servidor constrói novo payload (Base64) com, no mínimo: `nonce`, `email`, `external_id` (estável, por exemplo UUID do `profiles.id`), e opcionalmente `username`, `name`, `avatar_url`, `admin`, `moderator`, `suppress_welcome_message`, etc. Para alinhar com **macro / micro / município** e com a **governança**, o payload pode ainda enviar **grupos** (por exemplo `add_groups` / lista de grupos suportada na versão em uso) derivados dos direitos de planeamento, Hub e âmbitos delegados ao gestor.
6. Assina com o mesmo segredo e redireciona de volta ao Discourse com `sso` e `sig`.

### Onde implementar o endpoint no Radar

- **Curto prazo (Supabase Auth):** um endpoint em `apps/api` (ou Edge Function temporária) que leia o JWT do utilizador, valide com a chave do projeto, mapeie `sub` → `profiles`, e monte o payload DiscourseConnect. O segredo Discourse fica só no servidor (Key Vault / variável de ambiente).
- **Alvo Azure (Entra ID):** o mesmo papel pode ser cumprido pela API atrás do APIM: valida token OIDC, resolve utilizador e assina o retorno ao Discourse. O Discourse **não** precisa de falar com o Postgres do Radar se a API já expuser identidade e papéis.

### Configuração no Discourse (site settings)

Ajustar no painel de administração (nomes podem variar ligeiramente por versão; procurar “DiscourseConnect” nas definições):

- Ativar DiscourseConnect.
- **URL** do endpoint SSO do Radar (HTTPS obrigatório em produção).
- **Segredo** partilhado (longo, aleatório, igual ao configurado na API Radar).

Desativar ou restringir registos locais se quiser que **só** existam contas via Radar (política de produto).

### Ligação no frontend do Hub

- O link “Fórum” deve abrir o Discourse na mesma zona de confiança (subdomínio ou path atrás do Front Door).
- Opcional: passar `return_path` ou deep links conforme documentação DiscourseConnect para voltar ao Radar após login.
- Garantir **mesmo domínio de primeiro nível** ou configurar cookies/CORS conforme necessário; em muitos casos o fluxo é só redirect entre origens HTTPS, sem cookie partilhado entre Radar e Discourse.

### Alternativa: OAuth2 / OpenID Connect

Se todo o mundo já autentica no **Microsoft Entra ID** (External ID ou interno), pode configurar o Discourse como cliente OAuth/OIDC desse IdP. Nesse caso o “login unificado” é via Microsoft, não via cookie do Radar. Útil se o Radar e o Discourse forem apenas duas aplicações no mesmo tenant. Para “sessão só existe no Radar”, DiscourseConnect continua mais direto.

## Discourse em Azure (visão prática)

Alinhar com `docs/azure-target-architecture.md`: borda com Front Door, segredos no Key Vault, observabilidade.

### Componentes típicos

| Peça | Função |
|------|--------|
| **Azure Container Apps** (ou VM com Docker) | Executar Discourse (imagem oficial / discourse_docker). |
| **Azure Database for PostgreSQL** | Base dedicada ao Discourse (não misturar com o Postgres “system of record” do Radar). |
| **Azure Cache for Redis** | Cache e filas do Discourse. |
| **Azure Storage** (opcional) | Uploads grandes / backups conforme guia de deploy. |
| **Azure Front Door** | TLS, WAF, roteamento `forum.seudominio.com` → origem do Discourse. |
| **Key Vault** | Segredo DiscourseConnect, chaves de app, connection strings referenciadas por identidade gerida. |

### Pontos de atenção

- **Dois Postgres:** Discourse traz o seu próprio schema; não reutilizar o banco do Radar como BD única do Discourse salvo decisão arquitetural muito explícita (não recomendado para começar).
- **Email:** Discourse exige SMTP fiável (confirmações, resets se ainda existirem, notificações). Configurar SendGrid, Microsoft 365, ou relay aprovado pela organização.
- **Escalabilidade:** Container Apps suporta réplicas; seguir recomendações de workers Sidekiq e processos web do Discourse para o tamanho da comunidade.
- **CI/CD:** Imagem versionada, migrações Discourse geridas pelo próprio produto na subida; secrets injetados pelo runtime Azure.

### Integração com APIM (opcional)

O Discourse fala com o browser e consigo próprio; não é obrigatório passar o tráfego público do fórum pelo APIM. O APIM continua relevante para a **API Radar** que implementa o endpoint DiscourseConnect.

## Checklist mínimo

1. Subir Discourse com Postgres + Redis em Azure (ou ambiente de desenvolvimento Docker local).
2. Gerar segredo DiscourseConnect e guardar no Key Vault / `.env` seguro da API.
3. Implementar endpoint SSO na API Radar: validar sessão/IdP, mapear `external_id` e email, assinar resposta.
4. Configurar site settings no Discourse e testar login ponta a ponta.
5. No Hub, apontar o módulo fórum para a URL pública do Discourse (ou embed, se política de segurança permitir), com entradas claras para **macro**, **micro** e **município**, e testes com **gestor** multi-âmbito.
6. Modelar governança (acesso a planeamento e Hub) na API e refletir no SSO / grupos Discourse.
7. Rever política de contas locais no Discourse e moderadores/admins.

---

## Anexo: o SQL que executou (mural e eventos automatizados)

O script que correu faz três coisas principais no Supabase/Postgres.

### 1. Função `public.can_manage_mural()`

- `security definer` com `search_path = public`: corre com privilégios do dono da função e evita hijack de schema.
- Devolve `true` se o utilizador autenticado (`auth.uid()`) existe em `public.profiles` com `role` `admin` ou `superadmin`.
- `revoke all ... from public` e `grant execute ... to anon, authenticated`: só pode ser **executada** pelos papéis Supabase; não expõe a função como objeto genérico para `public`.

Serve como **única porta** para políticas RLS que precisam de “é admin do mural?” sem duplicar subconsultas.

### 2. Tabela `public.mural_config`

- Uma linha lógica `id = 'default'` com `enabled_types`, `micro_scope` (`all` | `specific`), `micro_names`, `updated_at`.
- RLS: **todos** podem ler (`using (true)` no select).
- **Insert/update** apenas para `authenticated` e só se `can_manage_mural()` for verdadeiro.

Ou seja: qualquer utilizador autenticado vê configuração; só admin/superadmin altera.

### 3. Tabela `public.automated_events`

- Eventos com `type` restrito a uma lista fixa (check constraint), `is_active`, likes, etc.
- Índices em `created_at` e `is_active` para listagens.
- RLS:
  - **Select:** linhas com `is_active = true` **ou** quem gere mural (admin) vê também inativos.
  - **Insert:** qualquer `authenticated` (`with check (true)`).
  - **Update/delete:** só quem passa `can_manage_mural()`.

Implicação operacional: utilizadores normais podem criar eventos; apenas admins desativam, editam ou apagam. Se a intenção for **só** admins criarem eventos, o `insert` deveria usar `with check (public.can_manage_mural())` em vez de `true`.

### Transação

O `begin` / `commit` garante que tudo aplica atomicamente; em caso de erro a meio, pode fazer `rollback` manual se a sessão ainda estiver aberta.

---

## Referências

- Repositório: [github.com/discourse/discourse](https://github.com/discourse/discourse)
- DiscourseConnect: [meta.discourse.org – Setup DiscourseConnect](https://meta.discourse.org/t/setup-discourseconnect-official-single-sign-on-for-discourse-sso/13045)
- Arquitetura Azure do projeto: `docs/azure-target-architecture.md`
