import {
    Activity,
    BarChart3,
    GraduationCap,
    LayoutDashboard,
    MapPin,
    Newspaper,
} from "lucide-react";

import type {
    DeliveryCardItem,
    DeliveryContent,
    DeliveryId,
    FaqItem,
    QuickLink,
    WhyNowItem,
} from "./landingOnboarding.types";

export const COLORS = {
    bgLight: "#F4FFF9",
    bgDark: "#06140F",
    ink: "#07120E",
    white: "#FFFFFF",
    stroke: "rgba(7, 18, 14, 0.12)",
    glass: "rgba(255,255,255,0.78)",
    glass2: "rgba(255,255,255,0.88)",
    black: "#000000",
    g1: "rgba(24,195,160,1)",
    g2: "rgba(53,211,255,1)",
    g3: "rgba(30,107,255,1)",
} as const;

export const GRADIENT =
    "linear-gradient(90deg, rgba(24,195,160,1), rgba(53,211,255,1), rgba(30,107,255,0.96))";
export const GRADIENT_SOFT =
    "linear-gradient(135deg, rgba(24,195,160,0.35), rgba(53,211,255,0.28), rgba(30,107,255,0.18))";

export const DELIVERY_CARD_ITEMS: DeliveryCardItem[] = [
    {
        id: "radar",
        title: "Radar Minas Digital",
        desc: "O ambiente de execução: planejar, organizar e acompanhar.",
        icon: LayoutDashboard,
        tag: "Produto",
    },
    {
        id: "planning",
        title: "Planejamento Local",
        desc: "Pactuação técnica no território, virando plano e cronograma.",
        icon: MapPin,
        tag: "Território",
    },
    {
        id: "course",
        title: "Curso Saúde Digital",
        desc: "Formação rápida para gestores e equipes, com foco em implementação.",
        icon: GraduationCap,
        tag: "Formação",
    },
    {
        id: "bi",
        title: "BI e monitoramento",
        desc: "Painel consolidado com informações do programa e o Índice de Maturidade Digital.",
        icon: BarChart3,
        tag: "Evidência",
    },
];

export const DELIVERY_CONTENT_BY_ID: Record<DeliveryId, DeliveryContent> = {
    radar: {
        id: "radar",
        title: "Radar Minas Digital",
        icon: LayoutDashboard,
        subtitle: "Seu software de planejamento digital, do diagnóstico até a execução e o monitoramento.",
        bullets: [
            "Transforma diretriz em plano, e plano em rotina de gestão com rastreabilidade.",
            "Centraliza ações, responsáveis, prazos e evidências, reduzindo retrabalho e ruído.",
            "Conecta Planejamento Local, capacitação e BI em uma trilha única para o gestor.",
        ],
        howToUse: [
            "Entrar, selecionar território e etapa (diagnóstico, plano, execução).",
            "Gerar prioridades, registrar decisões e anexar evidências.",
            "Acompanhar evolução com BI e indicadores, com visão para equipe e liderança.",
        ],
        badge: "Produto",
    },
    planning: {
        id: "planning",
        title: "Planejamento Local",
        icon: MapPin,
        subtitle: "Encontros técnicos e colaborativos para apoiar planos locais de Saúde Digital no território.",
        bullets: [
            "Organiza prioridades do território com visão técnica e governança prática.",
            "Aproxima município, regional e nível central, com alinhamento e pactuação.",
            "Gera plano de ação com metas claras, cronograma e acompanhamento contínuo.",
        ],
        howToUse: [
            "Registrar a agenda, participantes e decisões por encontro.",
            "Converter demandas em ações e metas, com responsáveis e prazos.",
            "Acompanhar execução no Radar e monitorar resultados no BI.",
        ],
        badge: "Território",
        highlight: {
            type: "news",
            title: "Planejamento Local fortalece transformação digital na saúde pública",
            url: "https://www.saude.mg.gov.br/noticias/planejamento-local-fortalece-transformacao-digital-na-saude-publica-de-minas-gerais/",
            img: "logos/locall.jpg",
            label: "Destaque na Mídia",
            icon: Newspaper,
            buttonText: "Ler matéria",
        },
    },
    course: {
        id: "course",
        title: "Curso Saúde Digital",
        icon: GraduationCap,
        subtitle: "Capacitação objetiva para gestão e assistência, com base no ecossistema da Saúde Digital no SUS.",
        bullets: [
            "Apresenta fundamentos e aplicações no SUS, com foco em governança e execução.",
            "Aborda estratégia, Telessaúde, interoperabilidade, RNDS e e-SUS APS como contexto de sistema.",
            "Certificação por desempenho, formando gestores prontos para decidir e implementar.",
            "Parceria estratégica com a FIOCRUZ para expansão da grade e novos módulos em breve.",
        ],
        howToUse: [
            "Indicar para equipe (gestão, APS, regulação, vigilância).",
            "Usar como pré-requisito para Planejamento Local e implantação de rotinas digitais.",
            "Manter trilha de formação contínua, com registros no Radar.",
        ],
        badge: "Formação",
        highlight: {
            type: "course",
            title: "Acesse os cursos de Saúde Digital disponíveis no AVA",
            url: "https://ava.saude.mg.gov.br/course/index.php?categoryid=31",
            img: "logos/cursosaude.png",
            label: "Capacitação",
            icon: GraduationCap,
            buttonText: "Acessar AVA",
        },
    },
    bi: {
        id: "bi",
        title: "Panorama e Maturidade Digital",
        icon: BarChart3,
        subtitle: "Visão consolidada com informações iniciais do programa e o Índice de Maturidade Digital do seu município.",
        bullets: [
            "Traz o panorama inicial do programa SUS Digital para nivelar o conhecimento da gestão.",
            "Apresenta o Índice Nacional de Maturidade em Saúde Digital (INMSD) do seu território.",
            "Mapeia o cenário atual, servindo como ponto de partida antes de planejar novas ações.",
        ],
        howToUse: [
            "Acessar o painel para conhecer os dados gerais da saúde digital no estado.",
            "Consultar o nível de maturidade do seu município para embasar o diagnóstico.",
            "Utilizar as informações consolidadas como referência para as oficinas de planejamento.",
        ],
        badge: "Evidência",
        highlight: {
            type: "dashboard",
            title: "Visualize os indicadores de Saúde Digital do estado",
            url: "https://info.saude.mg.gov.br/15/paineis/72",
            img: "logos/bi.png",
            label: "Observatório de Dados",
            icon: Activity,
            buttonText: "Abrir Painéis",
        },
    },
};

export const WHY_NOW_ITEMS: WhyNowItem[] = [
    {
        icon: MapPin,
        title: "Do território para o plano",
        desc: "Planejamento Local organiza prioridades reais, reduz improviso e acelera pactuação.",
    },
    {
        icon: GraduationCap,
        title: "Da equipe para a execução",
        desc: "Formação dá linguagem comum, evita erros previsíveis e prepara implementação.",
    },
    {
        icon: BarChart3,
        title: "Do plano para o resultado",
        desc: "Radar fecha o ciclo, mostra evolução e orienta correção de rota com dados.",
    },
];

export const FAQ_ITEMS: FaqItem[] = [
    {
        q: "O que o gestor precisa entender sobre Saúde Digital, de forma prática?",
        a: "Que não é um sistema isolado. É um novo jeito de governar o cuidado e a gestão: padronizar informação, reduzir retrabalho, melhorar acesso, decidir com evidência e monitorar execução.",
    },
    {
        q: "Por que o curso de Saúde Digital é importante?",
        a: "Muitos gestores ainda veem 'digital' apenas como TI. O curso muda essa chave: ensina que saúde digital é estratégia de gestão. Sem entender isso, a equipe não usa as ferramentas, o dado não chega e o futuro da saúde não acontece.",
    },
    {
        q: "Onde o SUS Digital entra na história, para convencer quem está começando?",
        a: "Como o caminho estruturado para a transformação: formação, soluções e dados. Isso sinaliza prioridade nacional e ajuda a traduzir intenção em plano com cronograma e indicadores.",
    },
    {
        q: "O que é diferente no Radar Minas Digital?",
        a: "Ele transforma diretriz em rotina de gestão. Em vez de ficar em documentos soltos, ele organiza ações, responsáveis, evidências e monitoramento, conectado ao Planejamento Local, ao curso e ao BI.",
    },
    {
        q: "BI serve para quê, além de mostrar gráfico?",
        a: "Serve para decisão e cobrança de execução. Mostra onde atacar primeiro, o que está evoluindo e o que travou, e dá base para corrigir rota com rapidez e transparência.",
    },
];

export const FOOTER_QUICK_LINKS: QuickLink[] = [
    {
        label: "Saúde Digital MG",
        href: "https://www.saude.mg.gov.br/saudedigital/",
    },
    {
        label: "Painéis",
        href: "https://info.saude.mg.gov.br/15/paineis/72",
    },
    {
        label: "AVA",
        href: "https://ava.saude.mg.gov.br/course/index.php?categoryid=31",
    },
];
