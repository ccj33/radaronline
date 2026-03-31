import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

import { ONBOARDING_TOUR_STYLES } from './tour/onboardingTour.constants';
import { OnboardingTooltipCard } from './tour/OnboardingTooltipCard';
import type { OnboardingTourProps } from './tour/onboardingTour.types';
import { useOnboardingTour } from './tour/useOnboardingTour';

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  isOpen,
  onComplete,
  onSkip,
}) => {
  const {
    currentStep,
    handleNext,
    handlePrev,
    isFirstStep,
    isLastStep,
    progress,
    setCurrentStep,
    step,
    targetRect,
    tooltipPosition,
    tooltipRef,
  } = useOnboardingTour({ isOpen, onComplete, onSkip });

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <AnimatePresence mode="wait">
      <div className="fixed inset-0 z-[9999]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
          style={{
            background: targetRect ? undefined : 'rgba(0, 0, 0, 0.85)',
          }}
        >
          {targetRect ? (
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
              <rect width="100%" height="100%" fill="rgba(0, 0, 0, 0.85)" mask="url(#spotlight-mask)" />
            </svg>
          ) : null}
        </motion.div>

        {targetRect ? (
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
        ) : null}

        <div
          className="absolute inset-0"
          onClick={(event) => {
            if (!targetRect) {
              return;
            }

            const inSpotlight =
              event.clientX >= targetRect.left - 8 &&
              event.clientX <= targetRect.right + 8 &&
              event.clientY >= targetRect.top - 8 &&
              event.clientY <= targetRect.bottom + 8;

            if (!inSpotlight) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
        />

        <OnboardingTooltipCard
          currentStep={currentStep}
          handleNext={handleNext}
          handlePrev={handlePrev}
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
          onSkip={onSkip}
          progress={progress}
          setCurrentStep={setCurrentStep}
          step={step}
          tooltipPosition={tooltipPosition}
          tooltipRef={tooltipRef}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="fixed bottom-4 left-0 right-0 text-center pointer-events-none"
        >
          <span className="hidden sm:inline text-xs text-white/50">
            Pressione <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/70">Esc</kbd> para pular
          </span>
          <span className="sm:hidden text-xs text-white/50">
            Toque em <span className="px-1.5 py-0.5 bg-white/10 rounded text-white/70">×</span> para pular
          </span>
        </motion.div>

        <style>{ONBOARDING_TOUR_STYLES}</style>
      </div>
    </AnimatePresence>,
    document.body,
  );
};

export default OnboardingTour;

