import { BarChart2, Calendar, CheckCircle, Menu, MessageCircle, Rocket, Sparkles, Target, Users } from 'lucide-react';

import type { OnboardingStep } from './onboardingTour.types';

export const ONBOARDING_TOUR_STEPS: OnboardingStep[] = [
  {
    description: 'O Radar é onde o planejamento de Saúde Digital do seu município sai do papel. Você e sua equipe acompanham cada ação, prazo e responsável — em um só lugar, em tempo real.',
    icon: <Sparkles className="text-amber-500" size={28} />,
    id: 'welcome',
    position: 'center',
    title: 'Bem-vindo ao Radar! 🎯',
  },
  {
    action: 'Toque em um Objetivo para expandir e ver as Atividades dentro.',
    description: 'O menu organiza o programa em Objetivos → Atividades → Ações. Pense assim: o que precisa acontecer? Por onde começamos? Quem faz o quê? Cada nível vai afunilando até a tarefa concreta.',
    icon: <Menu className="text-teal-500" size={28} />,
    id: 'sidebar',
    position: 'right',
    targetSelector: '[data-tour="sidebar"], [aria-label="Navegacao principal"], aside',
    title: 'Seu roteiro de execução',
  },
  {
    action: 'Toque no seletor de visualização e alterne para Cronograma.',
    description: 'Use Ações para o dia a dia, Cronograma para ver o que vence quando, e Equipe para saber quem está sobrecarregado. O filtro acima ajuda a focar em uma atividade específica.',
    icon: <Target className="text-blue-500" size={28} />,
    id: 'header',
    position: 'bottom',
    targetSelector: '[data-tour="header"], header',
    title: 'Três formas de ver o mesmo plano',
  },
  {
    action: 'Toque em qualquer ação para abrir e ver os detalhes completos.',
    description: 'Cada linha é uma tarefa do plano: tem prazo, responsável e status. Ações em vermelho já estão atrasadas. Toque para abrir, atualizar o andamento e registrar o que foi feito.',
    icon: <CheckCircle className="text-emerald-500" size={28} />,
    id: 'actions',
    position: 'top',
    targetSelector: '[data-tour="actions-table"], table, .action-table',
    title: 'Onde o plano vira execução',
  },
  {
    action: 'Use o seletor acima para ativar o modo Cronograma.',
    description: 'O Cronograma exibe todas as ações numa linha do tempo. Quando muita coisa aparece empilhada num período curto, é sinal de congestionamento — dá para redistribuir antes que atrase.',
    icon: <Calendar className="text-indigo-500" size={28} />,
    id: 'gantt',
    position: 'bottom',
    targetSelector: '[data-tour="view-mode"]',
    title: 'Veja problemas antes que aconteçam',
  },
  {
    description: 'A visão de Equipe mostra cada pessoa e o que está no nome dela. A lógica é simples: quem Executa, quem precisa Aprovar e quem deve ser Informado. Chega de "achei que era você".',
    icon: <Users className="text-purple-500" size={28} />,
    id: 'team',
    position: 'center',
    title: 'Quem faz, quem aprova, quem precisa saber',
  },
  {
    description: 'O painel mostra a % de conclusão por atividade, quantas ações estão no prazo e quantas já atrasaram. Abra antes de cada reunião de acompanhamento para saber onde pressionar.',
    icon: <BarChart2 className="text-rose-500" size={28} />,
    id: 'dashboard',
    position: 'center',
    title: 'Seu espelho de gestão',
  },
  {
    action: 'Abra uma ação e teste adicionar um comentário.',
    description: 'Cada ação tem uma conversa integrada. Use @nome para avisar alguém diretamente. Decisões, atualizações e dúvidas ficam junto da tarefa — não perdidas em mensagem de grupo.',
    icon: <MessageCircle className="text-teal-500" size={28} />,
    id: 'comments',
    position: 'center',
    title: 'O histórico no lugar certo',
  },
  {
    description: 'Primeiro passo real: abra a primeira Atividade no menu, veja as ações listadas e atualize o status de pelo menos uma. Isso já conta como progresso registrado para o município.',
    icon: <Rocket className="text-teal-500" size={28} />,
    id: 'complete',
    position: 'center',
    title: 'Pronto para começar! 🚀',
  },
];

export const ONBOARDING_TOUR_STYLES = `
  .onboarding-highlight {
    position: relative !important;
    z-index: 9998 !important;
    pointer-events: auto !important;
  }

  @keyframes onboarding-pulse {
    0%, 100% {
      box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.3), 0 0 40px rgba(20, 184, 166, 0.5), inset 0 0 20px rgba(20, 184, 166, 0.1);
      transform: scale(1);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(20, 184, 166, 0.15), 0 0 60px rgba(20, 184, 166, 0.7), inset 0 0 30px rgba(20, 184, 166, 0.15);
      transform: scale(1.01);
    }
  }
`;
