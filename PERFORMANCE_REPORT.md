# Relatório de Otimização de Performance

## 1. Otimização do Banco (Supabase)
**Problema:** Algumas consultas comuns estavam mais lentas porque não havia índices cobrindo os filtros e relacionamentos mais frequentes.
**O que foi feito:** Criação da migração `supabase/migrations/20240120_perf_indexes.sql`.
**O que ela faz:** Adiciona índices nas tabelas `actions`, `action_raci`, `action_comments` e `profiles`, alinhados a filtros frequentes como `microregiao_id` e buscas por `action_id`.
**Objetivo:** Melhorar o tempo de resposta (Search/Read) em listas e visualizações detalhadas.
**Ação Necessária:** Executar o SQL no Editor do Supabase. Recomendado validar com `EXPLAIN` se os índices estão sendo utilizados nas queries principais.

## 2. Otimização do Carregamento de Dados (`dataService.ts`)
**Problema:** A função `loadActions` realizava múltiplas requisições sequenciais (efeito waterfall), aumentando a latência total.
**O que foi feito:** Reestruturação da função para consolidar a busca em uma **consulta única com relacionamentos aninhados** (via PostgREST).
**Resultado Esperado:** Redução significativa de round-trips e overhead de conexão.
**Nota:** A consulta única reduz latência, mas pode aumentar o payload se houver muitos relacionamentos (ex: centenas de comentários). Monitorar o tamanho da resposta em produção.

## 3. Cache e Carregamento de Mapa (`MapDataLoader`)
**Problema:** O componente `MinasMicroMap` baixava e processava o JSON (~2MB) a cada montagem, gerando bloqueio de thread (TBT) e consumo de rede.
**O que foi feito:** Implementação do `src/lib/mapLoader.ts` como um Singleton com estratégia de cache em duas camadas:
1. **Memória (RAM):** Para navegação instantânea durante a sessão.
2. **Cache Storage API:** Para persistência entre recargas de página.
**Resultado Esperado:** Troca de abas fluida e eliminação de downloads redundantes.
**Nota:** O cache atual utiliza TTL de 24h. Em futuras atualizações dos arquivos GeoJSON, será necessário garantir a invalidação correta do cache (versionamento ou ETag).

## 4. Bundle e Code Splitting
**Verificação:** O `vite.config.ts` já possui configuração de `manualChunks` adequada, separando bibliotecas pesadas (`recharts`, `leaflet`) em arquivos distintos. Alertas de tamanho excessivo em desenvolvimento geralmente são artefatos da ausência de minificação/tree-shaking nesse modo; o build de produção (`npm run build`) mitiga esses problemas.

## Notas Técnicas e Riscos
*   **Índices vs Escrita:** A adição de índices melhora a leitura mas adiciona um leve overhead em operações de escrita (`INSERT/UPDATE`). Dado o perfil de leitura intensiva da aplicação, este é um trade-off aceitável.
*   **Overfetching:** A estratégia de "Single Query" pode trazer mais dados do que o necessário (ex: comentários antigos). Se o payload crescer demais, considerar refatorar para "Lista Resumida" + "Detalhes sob demanda".
