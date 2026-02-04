// Configuração dos 7 Eixos Pré-definidos da Saúde Digital
// Cores: Eixo 2 = Azul, Eixo 4 = Verde, Demais = Vermelho

export interface EixoConfig {
    numero: number;
    nome: string;
    descricao: string;
    cor: 'blue' | 'emerald' | 'rose';
}

export const EIXOS_PREDEFINIDOS: EixoConfig[] = [
    {
        numero: 1,
        nome: 'Gestão e Governança em Saúde Digital',
        descricao: `Aborda um conjunto de lideranças, estratégias, políticas e regras para:
a) promover, orientar, monitorar, avaliar e regular a participação colaborativa dos atores da saúde;
b) orientar, normatizar e inovar a saúde digital seguindo os princípios da privacidade e confidencialidade dos dados de saúde;
c) garantir o adequado planejamento e financiamento para os projetos de transformação digital no Sistema Único de Saúde (SUS).`,
        cor: 'rose',
    },
    {
        numero: 2,
        nome: 'Formação e Desenvolvimento',
        descricao: `Aborda estratégias e práticas para melhorar as habilidades em saúde digital dos profissionais, incluindo educação técnica, competências interdisciplinares, atualização científica, gestão de conhecimento e adaptação às mudanças tecnológicas, de forma a contribuir para uma gestão de saúde mais integrada e eficaz, impactando diretamente a qualidade do SUS.`,
        cor: 'blue',
    },
    {
        numero: 3,
        nome: 'Sistemas e Plataformas de Interoperabilidade',
        descricao: `Aborda sistemas, serviços e funcionalidades da saúde digital e a importância da interoperabilidade de dados para qualificação da informação de saúde que impactam na garantia da continuidade do cuidado do cidadão, na vigilância em saúde, nos processos de tomada de decisão de gestores, sem comprometer a segurança e privacidade do paciente.`,
        cor: 'rose',
    },
    {
        numero: 4,
        nome: 'Telessaúde',
        descricao: `Aborda o uso de Tecnologias da Informação e Comunicação (TIC) para o desenvolvimento de serviços de telessaúde que garantam a integralidade e a continuidade do cuidado entre os níveis da Rede de Atenção à Saúde no SUS. Inclui modalidades como teleconsultoria, teletriagem, teleconsulta, teleinterconsulta, telediagnóstico, telemonitoramento, teleducação, segunda opinião formativa (SOF) e telerregulação.`,
        cor: 'emerald',
    },
    {
        numero: 5,
        nome: 'Infoestrutura',
        descricao: `Aborda a base tecnológica e organizacional que suporta o gerenciamento eficaz das informações, incluindo acesso à informação e gestão do conhecimento, garantindo a produção, integridade, armazenamento, segurança e uso eficiente de dados e terminologias clínicas.`,
        cor: 'rose',
    },
    {
        numero: 6,
        nome: 'Monitoramento, Avaliação e Disseminação de Informações Estratégicas',
        descricao: `Aborda o processo de monitoramento e avaliação em saúde digital, o compartilhamento de informações importantes de forma estratégica e a utilização dos instrumentos de planejamento eficazes para orientar o desenvolvimento e implementação dessas tecnologias.`,
        cor: 'rose',
    },
    {
        numero: 7,
        nome: 'Infraestrutura e Segurança',
        descricao: `Aborda a infraestrutura tecnológica e os aspectos de segurança necessários para suportar os sistemas de informação de saúde, incluindo garantia da conectividade, segurança da informação, armazenamento de dados, infraestrutura física, equipamentos e arquitetura de sistemas e serviços.`,
        cor: 'rose',
    },
];

// Helper para buscar eixo por número
export const getEixoByNumero = (numero: number): EixoConfig | undefined => {
    return EIXOS_PREDEFINIDOS.find(e => e.numero === numero);
};
