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

