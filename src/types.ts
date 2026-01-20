// =====================================
// TIPOS PRINCIPAIS DO SISTEMA RADAR MINAS DIGITAL
// =====================================

export * from './types/auth.types';

// --- STATUS E ROLES ---
export type Status = 'Concluído' | 'Em Andamento' | 'Não Iniciado' | 'Atrasado';
export type RaciRole = 'R' | 'A' | 'I';

// --- RACI ---
export type RaciMember = {
  name: string;
  role: RaciRole;
};

// --- TAG/CATEGORIA ---
export type ActionTag = {
  id: string;
  name: string;
  color: string;
};

// --- COMENTÁRIO (estilo Reddit/thread) ---
export type ActionComment = {
  id: string;               // ID único do comentário
  parentId?: string | null; // ID do comentário pai (para threads)
  authorId: string;         // ID do usuário que comentou
  authorName: string;       // Nome do autor
  authorMunicipio: string;  // Município do autor
  authorAvatarId: string;   // Avatar do autor
  authorRole?: string;      // Cargo do autor: gestor, adm, usuario
  content: string;          // Conteúdo do comentário
  createdAt: string;        // ISO datetime: "2025-01-15T14:30:00Z"
  replies?: ActionComment[]; // Respostas aninhadas (preenchido no frontend)
};

// --- AÇÃO ---
// IMPORTANTE: Cada ação é ÚNICA por microrregião.
// O campo `uid` é a chave única global: `${microregiaoId}::${id}`
// O campo `id` é apenas o identificador dentro da atividade (ex: "1.1.1")
export type Action = {
  uid: string;              // Chave única global: "MR009::1.1.1"
  id: string;               // ID dentro da atividade: "1.1.1"
  activityId: string;       // Atividade pai: "1.1"
  microregiaoId: string;    // Microrregião: "MR009"
  title: string;
  status: Status;
  startDate: string;        // ISO date: "2025-01-15"
  plannedEndDate: string;   // Data prevista de término
  endDate: string;          // Data real de término
  progress: number;         // 0-100
  raci: RaciMember[];       // Equipe RACI desta ação
  tags: ActionTag[];        // Categorias/Tags da ação
  notes: string;            // Campo legado (manter compatibilidade)
  comments: ActionComment[]; // Comentários estilo Reddit
  commentCount?: number;    // Total de comentários (para evitar carregar tudo na listagem)
};

// --- ESTRUTURAS AUXILIARES ---
export type Activity = {
  id: string;
  title: string;
  description: string;
};

export type Objective = {
  id: number;
  title: string;
  status: 'on-track' | 'delayed';
};

// TeamMember agora pertence a uma microrregião específica
export type TeamMember = {
  id: string;             // UUID do banco
  name: string;
  role: string;
  email: string;
  municipio: string;
  microregiaoId: string;  // Microrregião a qual pertence
  isRegistered?: boolean; // Se o usuário tem cadastro na plataforma
};

export type GanttRange = '30d' | '60d' | '90d' | 'all';

// =====================================
// HELPERS PARA MANIPULAÇÃO DE AÇÕES
// =====================================

/**
 * Gera o UID único de uma ação
 * Formato: "MICRORREGIAO_ID::ACAO_ID"
 */
export function generateActionUid(microregiaoId: string, actionId: string): string {
  return `${microregiaoId}::${actionId}`;
}

/**
 * Extrai microregiaoId e actionId de um UID
 */
export function parseActionUid(uid: string): { microregiaoId: string; actionId: string } | null {
  const parts = uid.split('::');
  if (parts.length !== 2) return null;
  return { microregiaoId: parts[0], actionId: parts[1] };
}

/**
 * Verifica se uma ação pertence a uma microrregião
 */
export function actionBelongsToMicro(action: Action, microregiaoId: string): boolean {
  return action.microregiaoId === microregiaoId;
}

/**
 * Filtra ações por microrregião
 * Se microregiaoId for 'all' ou vazio, retorna todas
 */
export function filterActionsByMicro(actions: Action[], microregiaoId: string | null | undefined): Action[] {
  if (!microregiaoId || microregiaoId === 'all') {
    return actions;
  }
  return actions.filter(a => a.microregiaoId === microregiaoId);
}

/**
 * Encontra uma ação pelo UID
 */
export function findActionByUid(actions: Action[], uid: string): Action | undefined {
  return actions.find(a => a.uid === uid);
}

/**
 * Encontra uma ação pelo ID + microregiaoId
 */
export function findAction(actions: Action[], actionId: string, microregiaoId: string): Action | undefined {
  return actions.find(a => a.id === actionId && a.microregiaoId === microregiaoId);
}

/**
 * Cria uma nova ação com UID gerado automaticamente
 */
export function createAction(
  microregiaoId: string,
  activityId: string,
  actionNumber: number,
  overrides?: Partial<Omit<Action, 'uid' | 'id' | 'activityId' | 'microregiaoId'>>
): Action {
  const id = `${activityId}.${actionNumber}`;
  return {
    uid: generateActionUid(microregiaoId, id),
    id,
    activityId,
    microregiaoId,
    title: 'Nova Ação',
    status: 'Não Iniciado',
    startDate: '',
    plannedEndDate: '',
    endDate: '',
    progress: 0,
    raci: [],
    tags: [],
    notes: '',
    comments: [],
    ...overrides,
  };
}

/**
 * Obtém o próximo número de ação para uma atividade em uma microrregião
 */
export function getNextActionNumber(actions: Action[], activityId: string, microregiaoId: string): number {
  const activityActions = actions.filter(
    a => a.activityId === activityId && a.microregiaoId === microregiaoId
  );

  if (activityActions.length === 0) return 1;

  const numbers = activityActions.map(a => {
    const parts = a.id.split('.');
    const lastPart = parts[parts.length - 1];
    return parseInt(lastPart, 10) || 0;
  });

  return Math.max(...numbers) + 1;
}
