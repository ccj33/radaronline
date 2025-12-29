import { Action, Activity, Objective, TeamMember } from '../types';

// =====================================
// DADOS MOCK PARA DESENVOLVIMENTO
// Em produção, virá do Supabase
// =====================================

// Exportando dados iniciais separadamente para gerenciamento de state
export const INITIAL_OBJECTIVES: Objective[] = [
  { id: 1, title: "1. Infoestrutura e Governança", status: "on-track" },
  { id: 2, title: "2. Desenvolvimento de Negócios", status: "on-track" },
  { id: 3, title: "3. Experiência do Cliente", status: "delayed" }
];

export const INITIAL_ACTIVITIES: Record<number, Activity[]> = {
  1: [
    { id: "1.1", title: "Diagnóstico e Mapeamento", description: "Implantar a estratégia de gestão de conhecimento." },
    { id: "1.2", title: "Gestão do Conhecimento e Qualificação", description: "Fortalecer a governança, a gestão do conhecimento." },
    { id: "1.3", title: "Governança e Fluxos de Trabalho", description: "Garantir a sustentabilidade e o aprimoramento da Infoestrutura." }
  ],
  2: [{ id: "2.1", title: "Atração de Investimentos", description: "Fomento ao comércio local." }],
  3: [{ id: "3.1", title: "Digitalização de Serviços", description: "Portal do Cidadão." }]
};

export const INITIAL_DATA: {
  macro: string;
  micro: string;
  objectives: Objective[];
  activities: Record<number, Activity[]>;
  teams: Record<string, TeamMember[]>; // Equipes por microrregião
  actions: Action[];
} = {
  macro: "Extremo Sul",
  micro: "Poços de Caldas",

  // Objetivos são globais (iguais para todas as microrregiões)
  objectives: INITIAL_OBJECTIVES,

  // Atividades são globais (iguais para todas as microrregiões)
  activities: INITIAL_ACTIVITIES,

  // =====================================
  // EQUIPES POR MICRORREGIÃO
  // Cada microrregião tem sua própria equipe
  // =====================================
  teams: {
    // Equipe de Poços de Caldas (MR009)
    'MR009': [
      { id: "mock-001", name: "Lhays Rezende", role: "Responsável Eixo", email: "lhays@saude.mg.gov.br", municipio: "Poços de Caldas", microregiaoId: "MR009" },
      { id: "mock-002", name: "Grupo Poços", role: "Comitê Regional", email: "comite@pocos.mg.gov.br", municipio: "Poços de Caldas", microregiaoId: "MR009" },
      { id: "mock-003", name: "Ciclano", role: "Técnico", email: "ciclano@exemplo.com", municipio: "Botelhos", microregiaoId: "MR009" },
      { id: "mock-004", name: "Prefeitura", role: "Institucional", email: "contato@prefeitura.gov.br", municipio: "Poços de Caldas", microregiaoId: "MR009" },
      { id: "mock-005", name: "APS", role: "Atenção Primária", email: "aps@saude.gov.br", municipio: "Campestre", microregiaoId: "MR009" },
      { id: "mock-006", name: "Blabla", role: "Apoio", email: "blabla@apoio.com", municipio: "Machado", microregiaoId: "MR009" }
    ],
    // Equipe de Belo Horizonte (MR001)
    'MR001': [
      { id: "mock-101", name: "Carlos Pereira", role: "Coordenador", email: "carlos@saude.mg.gov.br", municipio: "Belo Horizonte", microregiaoId: "MR001" },
      { id: "mock-102", name: "Ana Costa", role: "Gestora", email: "ana.costa@saude.mg.gov.br", municipio: "Belo Horizonte", microregiaoId: "MR001" },
      { id: "mock-103", name: "Paulo Mendes", role: "Técnico", email: "paulo@saude.mg.gov.br", municipio: "Contagem", microregiaoId: "MR001" },
      { id: "mock-104", name: "Fernanda Lima", role: "Apoio", email: "fernanda@saude.mg.gov.br", municipio: "Betim", microregiaoId: "MR001" }
    ],
    // Equipe de Varginha (MR010)
    'MR010': [
      { id: "mock-201", name: "Roberto Silva", role: "Coordenador", email: "roberto@saude.mg.gov.br", municipio: "Varginha", microregiaoId: "MR010" },
      { id: "mock-202", name: "Juliana Santos", role: "Gestora", email: "juliana@saude.mg.gov.br", municipio: "Varginha", microregiaoId: "MR010" }
    ]
  },

  // =====================================
  // AÇÕES POR MICRORREGIÃO
  // Cada ação tem UID único: "MICRO::ID"
  // =====================================
  actions: [
    // --- POÇOS DE CALDAS (MR009) ---
    {
      uid: "MR009::1.1.1",
      id: "1.1.1",
      activityId: "1.1",
      microregiaoId: "MR009",
      title: "Mapear o ambiente de informação (Atrasou 15 dias)",
      status: "Concluído",
      startDate: "2025-11-01",
      plannedEndDate: "2026-01-15",
      endDate: "2026-02-02",
      progress: 100,
      raci: [{ name: "Lhays Rezende", role: "R" }],
      notes: "Houve atraso na entrega dos relatórios.",
      comments: [
        { id: "c1", authorId: "usr_002", authorName: "Maria Silva", authorMunicipio: "Poços de Caldas", authorAvatarId: "p1", content: "Atraso foi devido a problemas no sistema.", createdAt: "2025-12-01T10:30:00Z" },
        { id: "c2", authorId: "usr_001", authorName: "Admin Sistema", authorMunicipio: "BH", authorAvatarId: "p22", content: "Entendido. Vamos ajustar o cronograma.", createdAt: "2025-12-01T14:15:00Z" }
      ]
    },
    {
      uid: "MR009::1.2.1",
      id: "1.2.1",
      activityId: "1.2",
      microregiaoId: "MR009",
      title: "Criar e implementar estratégia (Adiantado)",
      status: "Concluído",
      startDate: "2026-05-25",
      plannedEndDate: "2026-09-04",
      endDate: "2026-08-20",
      progress: 100,
      raci: [{ name: "Grupo Poços", role: "A" }],
      notes: "Equipe foi eficiente.",
      comments: []
    },
    {
      uid: "MR009::1.2.2",
      id: "1.2.2",
      activityId: "1.2",
      microregiaoId: "MR009",
      title: "Realizar capacitação técnica (No Prazo)",
      status: "Não Iniciado",
      startDate: "2026-01-22",
      plannedEndDate: "2026-09-05",
      endDate: "2026-09-05",
      progress: 0,
      raci: [{ name: "APS", role: "R" }],
      notes: "Planejamento.",
      comments: []
    },
    {
      uid: "MR009::1.3.1",
      id: "1.3.1",
      activityId: "1.3",
      microregiaoId: "MR009",
      title: "Definir fluxos de acompanhamento",
      status: "Não Iniciado",
      startDate: "2026-05-25",
      plannedEndDate: "2026-08-30",
      endDate: "",
      progress: 0,
      raci: [{ name: "Blabla", role: "R" }],
      notes: "",
      comments: []
    },
    {
      uid: "MR009::1.3.2",
      id: "1.3.2",
      activityId: "1.3",
      microregiaoId: "MR009",
      title: "Sistematizar fluxos de trabalho",
      status: "Em Andamento",
      startDate: "2026-05-25",
      plannedEndDate: "2026-08-31",
      endDate: "",
      progress: 45,
      raci: [{ name: "Ciclano", role: "R" }],
      notes: "",
      comments: []
    },

    // --- BELO HORIZONTE (MR001) ---
    {
      uid: "MR001::1.1.1",
      id: "1.1.1",
      activityId: "1.1",
      microregiaoId: "MR001",
      title: "Mapear o ambiente de informação",
      status: "Em Andamento",
      startDate: "2025-12-01",
      plannedEndDate: "2026-02-15",
      endDate: "",
      progress: 35,
      raci: [{ name: "Carlos Pereira", role: "R" }],
      notes: "Em andamento conforme cronograma.",
      comments: []
    },
    {
      uid: "MR001::1.2.1",
      id: "1.2.1",
      activityId: "1.2",
      microregiaoId: "MR001",
      title: "Criar e implementar estratégia",
      status: "Não Iniciado",
      startDate: "2026-02-01",
      plannedEndDate: "2026-05-30",
      endDate: "",
      progress: 0,
      raci: [{ name: "Carlos Pereira", role: "A" }],
      notes: "",
      comments: []
    }
  ]
};

// =====================================
// HELPERS PARA ACESSO AOS DADOS
// =====================================

/**
 * Obtém a equipe de uma microrregião específica
 */
export function getTeamByMicrorregiao(microregiaoId: string): TeamMember[] {
  return INITIAL_DATA.teams[microregiaoId] || [];
}

/**
 * Obtém todas as equipes (para admin)
 */
export function getAllTeams(): TeamMember[] {
  return Object.values(INITIAL_DATA.teams).flat();
}

/**
 * Verifica se uma microrregião tem equipe cadastrada
 */
export function hasMicroregiaoTeam(microregiaoId: string): boolean {
  return microregiaoId in INITIAL_DATA.teams && INITIAL_DATA.teams[microregiaoId].length > 0;
}
