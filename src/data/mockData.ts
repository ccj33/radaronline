// =====================================
// MOCK DATA - Modo Demonstração/Visitante
// =====================================
// Este arquivo contém dados fictícios para uso no Modo Visitante.
// Nenhuma alteração feita neste modo é persistida no banco de dados.

import type { Action, Objective, Activity, TeamMember } from '../types';
import type { User } from '../types/auth.types';

// =====================================
// USUÁRIO VISITANTE
// =====================================
export const DEMO_USER: User = {
    id: 'demo-visitor-001',
    nome: 'Visitante',
    email: 'visitante@demo.radar.mg.gov.br',
    role: 'usuario',
    microregiaoId: 'MR070', // Juiz de Fora como exemplo
    microregiaoIds: ['MR070'],
    ativo: true,
    lgpdConsentimento: false, // Inicia sem LGPD para mostrar Landing Page primeiro
    lgpdConsentimentoData: undefined,
    avatarId: 'zg10',
    firstAccess: false,
    createdAt: new Date().toISOString(),
};

// =====================================
// OBJETIVOS
// =====================================
export const DEMO_OBJECTIVES: Objective[] = [
    { id: 1, title: 'Fortalecer a Atenção Primária à Saúde', status: 'on-track' },
    { id: 2, title: 'Aprimorar a Gestão Regional Integrada', status: 'on-track' },
    { id: 3, title: 'Promover a Transformação Digital', status: 'delayed' },
    { id: 4, title: 'Desenvolver Competências e Capacitação', status: 'on-track' },
];

// =====================================
// ATIVIDADES
// =====================================
export const DEMO_ACTIVITIES: Record<number, Activity[]> = {
    1: [
        { id: '1.1', title: 'Ampliar cobertura de ESF', description: 'Expandir equipes de Saúde da Família nas áreas prioritárias' },
        { id: '1.2', title: 'Qualificar atendimento em UBS', description: 'Melhorar processos de acolhimento e fluxo de atendimento' },
    ],
    2: [
        { id: '2.1', title: 'Integrar sistemas regionais', description: 'Conectar sistemas de informação entre municípios' },
        { id: '2.2', title: 'Fortalecer governança regional', description: 'Implementar fóruns de decisão compartilhada' },
    ],
    3: [
        { id: '3.1', title: 'Implantar prontuário eletrônico', description: 'Digitalizar registros de saúde' },
        { id: '3.2', title: 'Desenvolver telemedicina', description: 'Expandir atendimento remoto especializado' },
    ],
    4: [
        { id: '4.1', title: 'Capacitar gestores municipais', description: 'Formação em gestão de saúde pública' },
        { id: '4.2', title: 'Treinar equipes técnicas', description: 'Atualização técnica para profissionais da rede' },
    ],
};

// =====================================
// EQUIPE
// =====================================
export const DEMO_TEAM: Record<string, TeamMember[]> = {
    'MR070': [
        { id: 'team-001', name: 'Ana Silva', role: 'Coordenadora', email: 'ana@demo.mg.gov.br', municipio: 'Juiz de Fora', microregiaoId: 'MR070', isRegistered: true },
        { id: 'team-002', name: 'Carlos Souza', role: 'Analista', email: 'carlos@demo.mg.gov.br', municipio: 'Lima Duarte', microregiaoId: 'MR070', isRegistered: true },
        { id: 'team-003', name: 'Maria Oliveira', role: 'Enfermeira', email: 'maria@demo.mg.gov.br', municipio: 'Santos Dumont', microregiaoId: 'MR070', isRegistered: true },
        { id: 'team-004', name: 'João Pereira', role: 'Técnico', email: 'joao@demo.mg.gov.br', municipio: 'Bicas', microregiaoId: 'MR070', isRegistered: false },
    ],
};

// =====================================
// AÇÕES
// =====================================
const today = new Date();
const formatDate = (daysOffset: number): string => {
    const d = new Date(today);
    d.setDate(d.getDate() + daysOffset);
    return d.toISOString().split('T')[0];
};

export const DEMO_ACTIONS: Action[] = [
    // Objetivo 1 - Atividade 1.1
    {
        uid: 'MR070::1.1.1',
        id: '1.1.1',
        activityId: '1.1',
        microregiaoId: 'MR070',
        title: 'Mapear áreas descobertas de ESF',
        status: 'Concluído',
        startDate: formatDate(-30),
        plannedEndDate: formatDate(-10),
        endDate: formatDate(-12),
        progress: 100,
        raci: [{ name: 'Ana Silva', role: 'R' }, { name: 'Carlos Souza', role: 'A' }],
        notes: 'Mapeamento concluído com sucesso.',
        comments: [],
        tags: [],
    },
    {
        uid: 'MR070::1.1.2',
        id: '1.1.2',
        activityId: '1.1',
        microregiaoId: 'MR070',
        title: 'Elaborar plano de expansão',
        status: 'Em Andamento',
        startDate: formatDate(-15),
        plannedEndDate: formatDate(10),
        endDate: '',
        progress: 65,
        raci: [{ name: 'Ana Silva', role: 'R' }],
        notes: '',
        comments: [],
        tags: [],
    },
    {
        uid: 'MR070::1.1.3',
        id: '1.1.3',
        activityId: '1.1',
        microregiaoId: 'MR070',
        title: 'Contratar novas equipes ESF',
        status: 'Não Iniciado',
        startDate: '',
        plannedEndDate: formatDate(45),
        endDate: '',
        progress: 0,
        raci: [],
        notes: '',
        comments: [],
        tags: [],
    },
    // Objetivo 1 - Atividade 1.2
    {
        uid: 'MR070::1.2.1',
        id: '1.2.1',
        activityId: '1.2',
        microregiaoId: 'MR070',
        title: 'Revisar fluxos de atendimento',
        status: 'Concluído',
        startDate: formatDate(-45),
        plannedEndDate: formatDate(-20),
        endDate: formatDate(-22),
        progress: 100,
        raci: [{ name: 'Maria Oliveira', role: 'R' }],
        notes: 'Novos fluxos implementados.',
        comments: [],
        tags: [],
    },
    {
        uid: 'MR070::1.2.2',
        id: '1.2.2',
        activityId: '1.2',
        microregiaoId: 'MR070',
        title: 'Capacitar recepcionistas em acolhimento',
        status: 'Atrasado',
        startDate: formatDate(-20),
        plannedEndDate: formatDate(-5),
        endDate: '',
        progress: 30,
        raci: [{ name: 'Maria Oliveira', role: 'R' as const }, { name: 'Carlos Souza', role: 'I' as const }],
        notes: 'Aguardando material de treinamento.',
        comments: [],
        tags: [],
    },
    // Objetivo 2 - Atividade 2.1
    {
        uid: 'MR070::2.1.1',
        id: '2.1.1',
        activityId: '2.1',
        microregiaoId: 'MR070',
        title: 'Diagnosticar sistemas existentes',
        status: 'Concluído',
        startDate: formatDate(-60),
        plannedEndDate: formatDate(-40),
        endDate: formatDate(-42),
        progress: 100,
        raci: [{ name: 'Carlos Souza', role: 'R' }],
        notes: '',
        comments: [],
        tags: [],
    },
    {
        uid: 'MR070::2.1.2',
        id: '2.1.2',
        activityId: '2.1',
        microregiaoId: 'MR070',
        title: 'Definir padrão de interoperabilidade',
        status: 'Em Andamento',
        startDate: formatDate(-25),
        plannedEndDate: formatDate(5),
        endDate: '',
        progress: 80,
        raci: [{ name: 'Carlos Souza', role: 'R' }, { name: 'Ana Silva', role: 'A' }],
        notes: '',
        comments: [],
        tags: [],
    },
    // Objetivo 3 - Atividade 3.1
    {
        uid: 'MR070::3.1.1',
        id: '3.1.1',
        activityId: '3.1',
        microregiaoId: 'MR070',
        title: 'Selecionar fornecedor de PEP',
        status: 'Atrasado',
        startDate: formatDate(-40),
        plannedEndDate: formatDate(-10),
        endDate: '',
        progress: 50,
        raci: [{ name: 'Ana Silva', role: 'R' }],
        notes: 'Processo licitatório em andamento.',
        comments: [],
        tags: [],
    },
    {
        uid: 'MR070::3.1.2',
        id: '3.1.2',
        activityId: '3.1',
        microregiaoId: 'MR070',
        title: 'Pilotar em 3 UBS',
        status: 'Não Iniciado',
        startDate: '',
        plannedEndDate: formatDate(60),
        endDate: '',
        progress: 0,
        raci: [],
        notes: '',
        comments: [],
        tags: [],
    },
    // Objetivo 4 - Atividade 4.1
    {
        uid: 'MR070::4.1.1',
        id: '4.1.1',
        activityId: '4.1',
        microregiaoId: 'MR070',
        title: 'Elaborar grade curricular',
        status: 'Concluído',
        startDate: formatDate(-50),
        plannedEndDate: formatDate(-30),
        endDate: formatDate(-32),
        progress: 100,
        raci: [{ name: 'Ana Silva', role: 'R' }],
        notes: '',
        comments: [],
        tags: [],
    },
    {
        uid: 'MR070::4.1.2',
        id: '4.1.2',
        activityId: '4.1',
        microregiaoId: 'MR070',
        title: 'Realizar primeira turma de gestores',
        status: 'Em Andamento',
        startDate: formatDate(-10),
        plannedEndDate: formatDate(20),
        endDate: '',
        progress: 40,
        raci: [{ name: 'Maria Oliveira', role: 'R' }],
        notes: '15 gestores inscritos.',
        comments: [],
        tags: [],
    },
];
