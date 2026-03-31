import { AtSign, Bell, Check, Clock, MessageSquare, RotateCcw, XCircle } from 'lucide-react';
import type { UserRequest } from '../../../services/requestsService';

interface UserSettingsNotificationsTabProps {
  isAdmin: boolean;
  isUnread: (request: UserRequest) => boolean;
  loadRequests: () => void | Promise<void>;
  loadingNotifications: boolean;
  markAsRead: (requestId: string) => void;
  requests: UserRequest[];
}

export function UserSettingsNotificationsTab({
  isAdmin,
  isUnread,
  loadRequests,
  loadingNotifications,
  markAsRead,
  requests,
}: UserSettingsNotificationsTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Notificações</h3>
          <p className="text-slate-500 dark:text-slate-400">Acompanhe suas solicitações e avisos do sistema.</p>
        </div>
        <button
          onClick={() => void loadRequests()}
          className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title="Atualizar"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {loadingNotifications ? (
          <div className="p-8 text-center text-slate-400">
            <div className="animate-spin w-6 h-6 border-2 border-current border-t-transparent rounded-full mx-auto mb-2" />
            Carregando...
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
            <Bell className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">Nenhuma notificação encontrada</p>
          </div>
        ) : (
          requests.map((request) => {
            const unread = isUnread(request);
            const requesterLabel = request.user?.nome || 'Usuário';
            const responderLabel = request.resolved_by_name || 'Administrador';
            return (
              <div
                key={request.id}
                onClick={() => markAsRead(request.id)}
                className={`relative p-4 rounded-xl border transition-all ${unread
                  ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
              >
                {unread && (
                  <div className="absolute top-4 right-4 w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
                )}

                <div className="flex items-start gap-4">
                  <div
                    className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${request.request_type === 'mention'
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                      : request.status === 'pending'
                        ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                        : request.status === 'resolved'
                          ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                  >
                    {request.request_type === 'mention' ? <AtSign className="w-5 h-5" /> :
                      request.request_type === 'system' ? <Clock className="w-5 h-5" /> :
                        request.status === 'pending' ? <Clock className="w-5 h-5" /> :
                          request.status === 'resolved' ? <Check className="w-5 h-5" /> :
                            <XCircle className="w-5 h-5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm ${unread ? 'font-bold text-slate-800 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                        {request.request_type === 'mention' ? 'Você foi mencionado' :
                          request.request_type === 'system' ? 'Aviso do Sistema' :
                            isAdmin ? requesterLabel : 'Minha solicitação'}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold ${request.status === 'pending'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : request.status === 'resolved'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}
                      >
                        {request.status === 'pending' ? 'Pendente' : request.status === 'resolved' ? 'Resolvido' : 'Rejeitado'}
                      </span>
                    </div>

                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      {request.content}
                    </p>

                    {request.admin_notes && (
                      <div className="mt-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-sm border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-medium mb-1 text-xs uppercase tracking-wide">
                          <MessageSquare className="w-3 h-3" />
                          Resposta de {responderLabel}
                        </div>
                        <p className="text-slate-600 dark:text-slate-400">
                          {request.admin_notes}
                        </p>
                      </div>
                    )}

                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                      {new Date(request.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
