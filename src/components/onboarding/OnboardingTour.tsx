import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ChevronRight, ChevronLeft, Target, Calendar, 
  Users, BarChart2, CheckCircle, Sparkles,
  Zap, MessageCircle, Menu, Rocket
} from 'lucide-react';
import { logWarn } from '../../lib/logger';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  targetSelector?: string; // CSS selector for spotlight element
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao Radar! 🎯',
    description: 'Este é o seu painel de gestão estratégica. Vamos fazer um tour rápido pelas principais funcionalidades.',
    icon: <Sparkles className="text-amber-500" size={28} />,
    position: 'center',
  },
  {
    id: 'sidebar',
    title: 'Menu de Navegação',
    description: 'Aqui você encontra os Objetivos e Atividades organizados. Clique para navegar entre diferentes níveis do planejamento.',
    icon: <Menu className="text-teal-500" size={28} />,
    targetSelector: '[data-tour="sidebar"], aside, .sidebar-container',
    position: 'right',
    action: 'Clique nos objetivos para expandir as atividades.',
  },
  {
    id: 'header',
    title: 'Barra de Controle',
    description: 'Alterne entre visualizações (Ações, Cronograma, Equipe), filtre dados e acesse configurações.',
    icon: <Target className="text-blue-500" size={28} />,
    targetSelector: '[data-tour="header"], header',
    position: 'bottom',
  },
  {
    id: 'actions',
    title: 'Tabela de Ações',
    description: 'Cada linha representa uma ação. Clique para ver detalhes, editar progresso ou adicionar comentários.',
    icon: <CheckCircle className="text-emerald-500" size={28} />,
    targetSelector: '[data-tour="actions-table"], table, .action-table',
    position: 'top',
    action: 'Clique em qualquer ação para expandir detalhes.',
  },
  {
    id: 'gantt',
    title: 'Visualização Cronograma',
    description: 'Mude para o modo Cronograma para ver as ações em formato de timeline visual.',
    icon: <Calendar className="text-indigo-500" size={28} />,
    targetSelector: '[data-tour="view-mode"]',
    position: 'bottom',
    action: 'Use o seletor de visualização para alternar.',
  },
  {
    id: 'team',
    title: 'Gestão de Equipe',
    description: 'Visualize sua equipe e atribua responsabilidades usando a matriz RACI (Responsável, Aprovador, Consultado, Informado).',
    icon: <Users className="text-purple-500" size={28} />,
    position: 'center',
  },
  {
    id: 'dashboard',
    title: 'Dashboard de Métricas',
    description: 'Acompanhe o progresso geral com gráficos interativos. Identifique rapidamente ações atrasadas.',
    icon: <BarChart2 className="text-rose-500" size={28} />,
    position: 'center',
  },
  {
    id: 'comments',
    title: 'Sistema de Comentários',
    description: 'Adicione comentários nas ações e mencione colegas usando @nome para notificá-los.',
    icon: <MessageCircle className="text-teal-500" size={28} />,
    position: 'center',
  },
  {
    id: 'complete',
    title: 'Pronto para começar! 🚀',
    description: 'Agora você conhece as principais funcionalidades. Explore o sistema e qualquer dúvida, procure seu gestor!',
    icon: <Rocket className="text-teal-500" size={28} />,
    position: 'center',
  },
];

interface TooltipPosition {
  top: number;
  left: number;
  arrowPosition: 'top' | 'bottom' | 'left' | 'right' | 'none';
}

interface OnboardingTourProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  isOpen,
  onComplete,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({ top: 0, left: 0, arrowPosition: 'none' });
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  const step = ONBOARDING_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  // Find and highlight target element
  const findTargetElement = useCallback(() => {
    if (!step.targetSelector) {
      setTargetRect(null);
      return null;
    }

    // Try multiple selectors separated by comma
    const selectors = step.targetSelector.split(',').map(s => s.trim());
    
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          const rect = element.getBoundingClientRect();
          // Only use if element is visible
          if (rect.width > 0 && rect.height > 0) {
            setTargetRect(rect);
            return element;
          }
        }
      } catch (e) {
        logWarn('OnboardingTour', `Invalid selector: ${selector}`);
      }
    }
    
    setTargetRect(null);
    return null;
  }, [step.targetSelector]);

  // Calculate tooltip position based on target element
  const calculateTooltipPosition = useCallback(() => {
    const tooltipWidth = Math.min(350, window.innerWidth - 32);
    const tooltipHeight = tooltipRef.current?.offsetHeight || 250;
    const padding = 16;
    const arrowOffset = 16;

    if (!targetRect || step.position === 'center') {
      // Center position
      setTooltipPosition({
        top: Math.max(padding, (window.innerHeight - tooltipHeight) / 2),
        left: Math.max(padding, (window.innerWidth - tooltipWidth) / 2),
        arrowPosition: 'none'
      });
      return;
    }

    let top = 0;
    let left = 0;
    let arrowPosition: 'top' | 'bottom' | 'left' | 'right' = 'top';

    const centerX = targetRect.left + targetRect.width / 2;
    const centerY = targetRect.top + targetRect.height / 2;

    switch (step.position) {
      case 'bottom':
        top = targetRect.bottom + padding + arrowOffset;
        left = Math.max(padding, Math.min(centerX - tooltipWidth / 2, window.innerWidth - tooltipWidth - padding));
        arrowPosition = 'top';
        break;
      case 'top':
        top = targetRect.top - tooltipHeight - padding - arrowOffset;
        left = Math.max(padding, Math.min(centerX - tooltipWidth / 2, window.innerWidth - tooltipWidth - padding));
        arrowPosition = 'bottom';
        break;
      case 'left':
        top = Math.max(padding, Math.min(centerY - tooltipHeight / 2, window.innerHeight - tooltipHeight - padding));
        left = targetRect.left - tooltipWidth - padding - arrowOffset;
        arrowPosition = 'right';
        break;
      case 'right':
        top = Math.max(padding, Math.min(centerY - tooltipHeight / 2, window.innerHeight - tooltipHeight - padding));
        left = targetRect.right + padding + arrowOffset;
        arrowPosition = 'left';
        break;
    }

    // Clamp to viewport
    top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding));
    left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));

    setTooltipPosition({ top, left, arrowPosition });
  }, [targetRect, step.position]);

  // Update on step change
  useEffect(() => {
    if (!isOpen) return;
    
    // Remove previous highlights
    document.querySelectorAll('.onboarding-highlight').forEach(el => {
      el.classList.remove('onboarding-highlight');
    });

    const element = findTargetElement();
    
    // Add highlight class to element
    if (element) {
      element.classList.add('onboarding-highlight');
      // Scroll element into view smoothly
      setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }, 100);
    }

    // Small delay for scroll and measure
    const timer = setTimeout(() => {
      findTargetElement(); // Re-measure after scroll
      calculateTooltipPosition();
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [isOpen, currentStep, findTargetElement, calculateTooltipPosition]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      document.querySelectorAll('.onboarding-highlight').forEach(el => {
        el.classList.remove('onboarding-highlight');
      });
    }
  }, [isOpen]);

  // Recalculate on resize
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      findTargetElement();
      setTimeout(calculateTooltipPosition, 50);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isOpen, findTargetElement, calculateTooltipPosition]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  }, [isLastStep, onComplete]);

  const handlePrev = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  }, [isFirstStep]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        onSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onSkip]);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence mode="wait">
      <div className="fixed inset-0 z-[9999]">
        {/* Dark overlay with spotlight cutout */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
          style={{
            background: targetRect
              ? undefined
              : 'rgba(0, 0, 0, 0.85)',
          }}
        >
          {/* SVG mask for spotlight effect */}
          {targetRect && (
            <svg className="absolute inset-0 w-full h-full">
              <defs>
                <mask id="spotlight-mask">
                  <rect width="100%" height="100%" fill="white" />
                  <rect
                    x={targetRect.left - 8}
                    y={targetRect.top - 8}
                    width={targetRect.width + 16}
                    height={targetRect.height + 16}
                    rx="12"
                    fill="black"
                  />
                </mask>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="rgba(0, 0, 0, 0.85)"
                mask="url(#spotlight-mask)"
              />
            </svg>
          )}
        </motion.div>

        {/* Pulsing border around highlighted element */}
        {targetRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute pointer-events-none"
            style={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              borderRadius: 12,
              border: '3px solid #14b8a6',
              boxShadow: '0 0 0 4px rgba(20, 184, 166, 0.3), 0 0 40px rgba(20, 184, 166, 0.5), inset 0 0 20px rgba(20, 184, 166, 0.1)',
              animation: 'onboarding-pulse 2s ease-in-out infinite',
            }}
          />
        )}

        {/* Click blocker except on highlighted area */}
        <div 
          className="absolute inset-0" 
          onClick={(e) => {
            // Allow clicks on the highlighted element
            if (targetRect) {
              const x = e.clientX;
              const y = e.clientY;
              const inSpotlight = 
                x >= targetRect.left - 8 && 
                x <= targetRect.right + 8 && 
                y >= targetRect.top - 8 && 
                y <= targetRect.bottom + 8;
              
              if (!inSpotlight) {
                e.preventDefault();
                e.stopPropagation();
              }
            }
          }}
        />

        {/* Tooltip Card */}
        <motion.div
          ref={tooltipRef}
          key={currentStep}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="absolute z-10"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            width: Math.min(350, window.innerWidth - 32),
          }}
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden relative">
            {/* Arrow pointer */}
            {tooltipPosition.arrowPosition !== 'none' && (
              <div
                className="absolute w-4 h-4 bg-white dark:bg-slate-800 border-teal-400 dark:border-teal-500 rotate-45"
                style={{
                  ...(tooltipPosition.arrowPosition === 'top' && {
                    top: -8,
                    left: '50%',
                    marginLeft: -8,
                    borderTop: '2px solid',
                    borderLeft: '2px solid',
                  }),
                  ...(tooltipPosition.arrowPosition === 'bottom' && {
                    bottom: -8,
                    left: '50%',
                    marginLeft: -8,
                    borderBottom: '2px solid',
                    borderRight: '2px solid',
                  }),
                  ...(tooltipPosition.arrowPosition === 'left' && {
                    left: -8,
                    top: '50%',
                    marginTop: -8,
                    borderBottom: '2px solid',
                    borderLeft: '2px solid',
                  }),
                  ...(tooltipPosition.arrowPosition === 'right' && {
                    right: -8,
                    top: '50%',
                    marginTop: -8,
                    borderTop: '2px solid',
                    borderRight: '2px solid',
                  }),
                }}
              />
            )}

            {/* Progress bar */}
            <div className="h-1.5 bg-slate-100 dark:bg-slate-700">
              <motion.div
                className="h-full bg-gradient-to-r from-teal-500 to-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>

            {/* Content */}
            <div className="p-5">
              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/30 dark:to-emerald-900/30 shrink-0 shadow-sm">
                  {step.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">
                    {step.title}
                  </h3>
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                    Passo {currentStep + 1} de {ONBOARDING_STEPS.length}
                  </span>
                </div>
                <button
                  onClick={onSkip}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  aria-label="Pular tour"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Description */}
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                {step.description}
              </p>

              {/* Action hint */}
              {step.action && (
                <div className="flex items-start gap-2 p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl mb-4 border border-amber-200/50 dark:border-amber-800/30">
                  <Zap size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <span className="text-xs text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
                    💡 {step.action}
                  </span>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={handlePrev}
                  disabled={isFirstStep}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={16} />
                  <span className="hidden sm:inline">Anterior</span>
                </button>

                {/* Step dots */}
                <div className="flex items-center gap-1">
                  {ONBOARDING_STEPS.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentStep(idx)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        idx === currentStep
                          ? 'w-6 bg-teal-500'
                          : idx < currentStep
                          ? 'w-2 bg-teal-300 dark:bg-teal-700 hover:bg-teal-400'
                          : 'w-2 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300'
                      }`}
                      aria-label={`Ir para passo ${idx + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={handleNext}
                  className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:scale-105 active:scale-95"
                >
                  {isLastStep ? '🚀 Começar!' : 'Próximo'}
                  {!isLastStep && <ChevronRight size={16} />}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bottom skip hint */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="fixed bottom-4 left-0 right-0 text-center pointer-events-none"
        >
          <span className="text-xs text-white/50">
            Pressione <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/70">Esc</kbd> para pular
          </span>
        </motion.div>

        {/* CSS for animations */}
        <style>{`
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
        `}</style>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default OnboardingTour;
