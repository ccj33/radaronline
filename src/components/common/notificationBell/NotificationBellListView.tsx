import {
  AtSign,
  Bell,
  Check,
  ChevronRight,
  Clock,
  Megaphone,
  XCircle,
} from 'lucide-react';
import type { UserRequest } from '../../../services/requestsService';
import type { NotificationTab } from './notificationBell.types';

interface NotificationBellListViewProps {
  activeTab: NotificationTab;
  filteredRequests: UserRequest[];
  isAdmin: boolean;
  isUnread: (request: UserRequest) => boolean;
  loading: boolean;
  onOpenDetails: (request: UserRequest) => void;
  onViewAllRequests?: () => void;
  requests: UserRequest[];
  setIsOpen: (isOpen: boolean) => void;
}

export function NotificationBellListView({
  activeTab,
  filteredRequests,
  isAdmin,
  isUnread,
  loading,
  onOpenDetails,
  onViewAllRequests,
  requests,
  setIsOpen,
}: NotificationBellListViewProps) {
  return (
    <>
      <div className="space-y-3">
        {loading && requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 animate-pulse">
            <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-full mb-3" />
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
              <Bell className="w-10 h-10 text-slate-300 dark:text-slate-600" />
            </div>
            <h4 className="text-slate-900 dark:text-slate-100 font-bold text-lg mb-1">
              {activeTab === 'unread' ? 'Tudo em dia!' : 'Nenhuma notificacao'}
            </h4>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-[200px]">
              {activeTab === 'unread'
                ? 'Voce nao tem notificacoes nao lidas.'
                : 'Voce ainda nao tem notificacoes.'}
            </p>
          </div>
        ) : (
          filteredRequests.slice(0, 20).map((request) => {
            const unread = isUnread(request);
            const requesterLabel = request.user?.nome || 'Usuário';
            const responderLabel = request.resolved_by_name || 'Administrador';
            return (
              <div
                key={request.id}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenDetails(request);
                }}
                className={`
                  group relative bg-white dark:bg-slate-900 rounded-xl p-4 cursor-pointer transition-all duration-200
                  border border-transparent hover:border-teal-500/30 hover:shadow-md
                  ${unread ? 'shadow-sm ring-1 ring-blue-500/20 border-blue-500/10 bg-blue-50/10' : 'shadow-sm border-slate-200/60 dark:border-slate-800'}
                `}
              >
                <div className="flex gap-4">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm border
                    ${request.request_type === 'mention' ? 'bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800' :
                      request.request_type === 'announcement' ? 'bg-teal-100 text-teal-600 border-teal-200 dark:bg-teal-900/30 dark:border-teal-800' :
                        request.status === 'pending' ? 'bg-amber-100 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800' :
                          request.status === 'resolved' ? 'bg-green-100 text-green-600 border-green-200 dark:bg-green-900/30 dark:border-green-800' :
                            'bg-red-100 text-red-600 border-red-200 dark:bg-red-900/30 dark:border-red-800'}
                  `}
                  >
                    {request.request_type === 'mention' ? <AtSign className="w-5 h-5" /> :
                      request.request_type === 'announcement' ? <Megaphone className="w-5 h-5" /> :
                        request.status === 'pending' ? <Clock className="w-5 h-5" /> :
                          request.status === 'resolved' ? <Check className="w-5 h-5" /> :
                            <XCircle className="w-5 h-5" />}
                  </div>

                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-sm ${unread ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                        {request.request_type === 'mention' ? 'Mencao' :
                          request.request_type === 'announcement' ? 'Comunicado' :
                            isAdmin ? requesterLabel : 'Solicitacao'}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                        {new Date(request.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                      </span>
                    </div>

                    <p className={`text-sm leading-snug line-clamp-2 ${unread ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>
                      {request.content}
                    </p>

                    {request.status !== 'pending' ? (
                      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                        Respondido por: {responderLabel}
                      </p>
                    ) : null}

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 border-dashed">
                      <span className={`
                        inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide
                        ${request.status === 'pending' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          request.status === 'resolved' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'}
                      `}
                      >
                        {request.status === 'pending' ? 'Pendente' :
                          request.status === 'resolved' ? 'Resolvido' : 'Rejeitado'}
                      </span>

                      <span className="text-xs text-teal-600 dark:text-teal-400 font-medium group-hover:translate-x-1 transition-transform flex items-center">
                        Ver detalhes <ChevronRight size={12} className="ml-0.5" />
                      </span>
                    </div>
                  </div>
                </div>

                {unread && (
                  <div className="absolute top-4 right-4 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-pulse" />
                )}
              </div>
            );
          })
        )}
      </div>

      {isAdmin && requests.length > 0 && onViewAllRequests && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={() => {
              setIsOpen(false);
              onViewAllRequests();
            }}
            className="w-full py-3 text-sm font-bold text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            Ver todas as solicitacoes
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </>
  );
}
