import { ExtendedAuthContextType } from '../../auth/AuthContext';
import { log, logError } from '../../lib/logger';
import * as authService from '../../services/authService';
import { User } from '../../types/auth.types';
import { MunicipalityOnboardingModal } from '../auth/MunicipalityOnboardingModal';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface FirstAccessModalFlowProps {
  authContext: Pick<ExtendedAuthContextType, 'login'> | null;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onOpenOnboarding: () => void;
  onShowToast: (message: string, type?: ToastType) => void;
  user: User | null;
}

export function FirstAccessModalFlow({
  authContext,
  isOpen,
  onClose,
  onComplete,
  onOpenOnboarding,
  onShowToast,
  user,
}: FirstAccessModalFlowProps) {
  if (!isOpen || !user) {
    return null;
  }

  return (
    <MunicipalityOnboardingModal
      user={user}
      onSave={async (municipio, novaSenha, microregiaoId) => {
        try {
          await authService.completeFirstAccess(
            user.id,
            user.email,
            municipio,
            novaSenha,
            microregiaoId
          );

          if (authContext) {
            log('FirstAccessModalFlow', 'Reautenticando apos alteracao de senha...');
            const loginResult = await authContext.login(user.email, novaSenha);
            if (!loginResult.success) {
              throw new Error(loginResult.error || 'Falha ao reautenticar apos configurar o primeiro acesso.');
            }
          }

          onClose();
          onComplete();
          onShowToast('Configuracao concluida! Bem-vindo(a) ao sistema.', 'success');

          const onboardingKey = `radar_onboarding_completed_${user.id}`;
          const hasCompletedOnboarding = localStorage.getItem(onboardingKey);
          if (!hasCompletedOnboarding) {
            window.setTimeout(onOpenOnboarding, 500);
          }
        } catch (error: any) {
          logError('FirstAccessModalFlow', 'Erro no primeiro acesso', error);
          throw error;
        }
      }}
    />
  );
}
