/**
 * Extrai o ID legível de uma atividade a partir do ID técnico
 * Exemplo: "MR061_1.1_abc123" -> "1.1"
 *          "MR061_1.1" -> "1.1"
 *          "1.1" -> "1.1" (já está no formato antigo)
 */
export const getActivityDisplayId = (fullId: string): string => {
  if (!fullId) return '';

  // Novo formato: "MicroId_X.Y" ou "MicroId_X.Y_uuid" -> extrair apenas "X.Y"
  const parts = fullId.split('_');
  if (parts.length >= 2) {
    // Pegar a segunda parte que contém "X.Y" (pode ter _uuid no final, ignorar)
    return parts[1];
  }

  // Formato antigo ou simples: retornar como está
  return fullId;
};

/**
 * Normaliza um ID de atividade para comparacao entre formatos legados e atuais.
 */
export const getComparableActivityId = (fullId: string): string => {
  if (!fullId) return '';

  const displayId = getActivityDisplayId(fullId).trim();
  const match = displayId.match(/(\d+\.\d+)/);

  return match?.[1] || displayId;
};

export const activityIdsMatch = (leftId: string, rightId: string): boolean => {
  if (!leftId || !rightId) return false;

  return (
    leftId === rightId ||
    getComparableActivityId(leftId) === getComparableActivityId(rightId)
  );
};

/**
 * Extrai o ID legível de uma ação a partir do ID técnico
 * Exemplo: "MR070_1.1.1" -> "1.1.1"
 *          "MR070_4.9.3" -> "4.9.3"
 *          "1.1.1" -> "1.1.1" (já está no formato antigo)
 * 
 * Usado para exibir o ID da ação de forma limpa na UI
 */
export const getActionDisplayId = (fullId: string): string => {
  if (!fullId) return '';

  // Novo formato: "MicroId_X.Y.Z" -> extrair "X.Y.Z"
  const underscoreIndex = fullId.indexOf('_');
  if (underscoreIndex !== -1) {
    // Retorna tudo após o primeiro underscore
    return fullId.substring(underscoreIndex + 1);
  }

  // Formato antigo ou simples: retornar como está
  return fullId;
};

/**
 * Extrai apenas o número da ação (último segmento do ID)
 * Exemplo: "MR070_1.1.1" -> "1"
 *          "1.1.2" -> "2"
 *          "4.9.12" -> "12"
 * 
 * Usado para exibir apenas o número sequencial da ação na tabela
 */
export const getActionNumber = (fullId: string): string => {
  if (!fullId) return '';

  // Primeiro extrair o ID de exibição (remove prefixo MR)
  const displayId = getActionDisplayId(fullId);

  // Pegar o último número após o último ponto
  const parts = displayId.split('.');
  return parts[parts.length - 1] || displayId;
};

/**
 * Extrai o prefixo da atividade do ID da ação (sem o número da ação)
 * Exemplo: "MR070_1.1.1" -> "1.1"
 *          "1.1.2" -> "1.1"
 *          "4.9.12" -> "4.9"
 * 
 * Usado para exibir no cabeçalho da tabela como "1.1.x"
 */
export const getActivityPrefixFromActionId = (fullId: string): string => {
  if (!fullId) return '';

  // Primeiro extrair o ID de exibição (remove prefixo MR)
  const displayId = getActionDisplayId(fullId);

  // Remover o último segmento (número da ação)
  const parts = displayId.split('.');
  if (parts.length > 1) {
    return parts.slice(0, -1).join('.');
  }

  return displayId;
};

/**
 * Retorna o número de exibição do objetivo (baseado na posição, não no ID do banco)
 * @param objectives - Lista de objetivos
 * @param objectiveId - ID do objetivo no banco
 * @returns Número de exibição (1, 2, 3...) ou o ID original se não encontrado
 */
export const getObjectiveDisplayNumber = (objectives: { id: number }[], objectiveId: number): number => {
  const index = objectives.findIndex(o => o.id === objectiveId);
  return index >= 0 ? index + 1 : objectiveId;
};

/**
 * Extrai o título do objetivo sem o prefixo numérico
 * Exemplo: "1. Estratégia Digital" -> "Estratégia Digital"
 *          "34. Novo Objetivo" -> "Novo Objetivo"
 *          "Estratégia" -> "Estratégia" (sem prefixo)
 */
export const getObjectiveTitleWithoutNumber = (title: string): string => {
  if (!title) return '';

  // Remove prefixo no formato "X. " ou "X." onde X é um número
  const match = title.match(/^\d+\.\s*/);
  if (match) {
    return title.substring(match[0].length);
  }

  return title;
};

export const getInitials = (name: string) => {
  if (!name) return "?";
  const parts = name.split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// =====================================
// FUNÇÕES DE ID DINÂMICO
// Calculam IDs de exibição baseados na posição atual
// =====================================

/**
 * Calcula o ID de exibição CORRETO de uma atividade baseado na posição atual do objetivo
 * @param activityId - ID interno da atividade (ex: "MR070_2.1")
 * @param objectiveId - ID do objetivo no banco
 * @param objectives - Lista de objetivos (filtrada por micro)
 * @param activities - Mapa de atividades por objetivo
 * @returns ID de exibição corrigido (ex: "3.1" se o objetivo está na posição 3)
 */
export const getCorrectActivityDisplayId = (
  activityId: string,
  objectiveId: number,
  objectives: { id: number }[],
  activities: Record<number, { id: string }[]>
): string => {
  if (!activityId) return '';

  // 1. Encontrar posição atual do objetivo
  const objIndex = objectives.findIndex(o => o.id === objectiveId);
  const objNum = objIndex >= 0 ? objIndex + 1 : '?';

  // 2. Encontrar posição da atividade dentro do objetivo
  const objActivities = activities[objectiveId] || [];
  const actIndex = objActivities.findIndex(a => activityIdsMatch(a.id, activityId));
  const actNum = actIndex >= 0 ? actIndex + 1 : '?';

  return `${objNum}.${actNum}`;
};

/**
 * Calcula o ID de exibição CORRETO de uma ação baseado na posição atual do objetivo e atividade
 * @param actionId - ID interno da ação (ex: "MR070_2.1.1")
 * @param activityId - ID interno da atividade
 * @param objectiveId - ID do objetivo no banco
 * @param objectives - Lista de objetivos (filtrada por micro)
 * @param activities - Mapa de atividades por objetivo
 * @param actions - Lista de ações (filtrada por micro)
 * @returns ID de exibição corrigido (ex: "3.1.1" se o objetivo está na posição 3)
 */
export const getCorrectActionDisplayId = (
  actionId: string,
  activityId: string,
  objectiveId: number,
  objectives: { id: number }[],
  activities: Record<number, { id: string }[]>,
  actions: { id: string; activityId: string }[]
): string => {
  if (!actionId) return '';

  // 1. Encontrar posição atual do objetivo
  const objIndex = objectives.findIndex(o => o.id === objectiveId);
  const objNum = objIndex >= 0 ? objIndex + 1 : '?';

  // 2. Encontrar posição da atividade dentro do objetivo
  const objActivities = activities[objectiveId] || [];
  const actIndex = objActivities.findIndex(a => activityIdsMatch(a.id, activityId));
  const actNum = actIndex >= 0 ? actIndex + 1 : '?';


  // IMPORTANTE: Ordenar numericamente para garantir que 1.2.10 venha após 1.2.2
  // Caso contrário, "1.2.10" pode ganhar índice menor que "1.2.2" se a lista original for alfabética
  const actActions = actions
    .filter(a => activityIdsMatch(a.activityId, activityId))
    .sort((a, b) => naturalSortComparator(a.id, b.id));

  const actionIndex = actActions.findIndex(a => a.id === actionId);
  const actionNum = actionIndex >= 0 ? actionIndex + 1 : getActionNumber(actionId);

  return `${objNum}.${actNum}.${actionNum}`;
};

/**
 * Helper simplificado: Calcula apenas o prefixo corrigido (objetivo.atividade) para ações
 * Útil para cabeçalhos de tabela
 */
export const getCorrectActivityPrefix = (
  activityId: string,
  objectiveId: number,
  objectives: { id: number }[],
  activities: Record<number, { id: string }[]>
): string => {
  return getCorrectActivityDisplayId(activityId, objectiveId, objectives, activities);
};

/**
 * Encontra o objectiveId dado um activityId, pesquisando no mapa de atividades
 */
export const findObjectiveIdByActivityId = (
  activityId: string,
  activities: Record<number, { id: string }[]>
): number | null => {
  for (const [objIdStr, acts] of Object.entries(activities)) {
    if (acts.some(a => activityIdsMatch(a.id, activityId))) {
      return parseInt(objIdStr, 10);
    }
  }
  return null;
};

/**
 * Comparador para ordenação natural de strings (ex: "1.2.2" vem antes de "1.2.10")
 */
export const naturalSortComparator = (idA: string, idB: string): number => {
  const partsA = idA.split(/[^a-zA-Z0-9]+/);
  const partsB = idB.split(/[^a-zA-Z0-9]+/);
  const len = Math.min(partsA.length, partsB.length);

  for (let i = 0; i < len; i++) {
    const valA = partsA[i];
    const valB = partsB[i];
    const numA = parseInt(valA, 10);
    const numB = parseInt(valB, 10);

    if (!isNaN(numA) && !isNaN(numB)) {
      if (numA !== numB) return numA - numB;
    } else {
      if (valA !== valB) return valA.localeCompare(valB, undefined, { numeric: true });
    }
  }
  return partsA.length - partsB.length;
};

