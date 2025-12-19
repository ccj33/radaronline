import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Logging robusto para debug e monitoramento
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A',
      url: typeof window !== 'undefined' ? window.location.href : 'N/A',
    };

    console.error('[ErrorBoundary] Erro capturado:', errorDetails);
    
    // Em produção, você pode enviar para um serviço de logging (ex: Sentry, LogRocket)
    // Exemplo: logService.captureException(error, { extra: errorDetails });
    
    // Log estruturado para facilitar análise
    if (process.env.NODE_ENV === 'development') {
      console.group('🔴 Detalhes do Erro');
      console.error('Mensagem:', error.message);
      console.error('Stack:', error.stack);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[300px] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-rose-500" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">
              Ops! Algo deu errado
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              Ocorreu um erro inesperado. Tente recarregar a página ou clique no botão abaixo.
            </p>
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
            >
              <RefreshCw size={16} />
              Tentar Novamente
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left bg-slate-100 rounded-lg p-3">
                <summary className="text-xs font-medium text-slate-600 cursor-pointer">
                  Detalhes do erro (dev)
                </summary>
                <pre className="mt-2 text-[10px] text-rose-600 overflow-auto whitespace-pre-wrap">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}




