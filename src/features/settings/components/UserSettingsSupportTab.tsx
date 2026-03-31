import { Check, Clock, MessageSquare, Send } from 'lucide-react';
import type { RefObject } from 'react';
import type { UserRequest } from '../../../services/requestsService';

interface UserSettingsSupportTabProps {
  changeRequest: string;
  chatContainerRef: RefObject<HTMLDivElement>;
  currentUserId: string;
  handleSendRequest: () => void | Promise<void>;
  isSendingRequest: boolean;
  loadingNotifications: boolean;
  requests: UserRequest[];
  setChangeRequest: (value: string) => void;
}

export function UserSettingsSupportTab({
  changeRequest,
  chatContainerRef,
  currentUserId,
  handleSendRequest,
  isSendingRequest,
  loadingNotifications,
  requests,
  setChangeRequest,
}: UserSettingsSupportTabProps) {
  const supportRequests = requests
    .filter((request) => request.user_id === currentUserId && request.request_type !== 'announcement')
    .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime());

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Central de Suporte</h3>
        <p className="text-slate-500 dark:text-slate-400">Solicite alterações de dados ou tire suas dúvidas.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[400px]">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Suporte e Solicitações</span>
        </div>

        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 dark:bg-slate-950/30 scroll-smooth">
          {loadingNotifications ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">Carregando...</div>
          ) : supportRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm gap-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-slate-300" />
              </div>
              <p>Nenhuma mensagem ainda.</p>
            </div>
          ) : (
            supportRequests.map((request) => (
              <div key={request.id} className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex justify-end">
                  <div className="bg-teal-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%] shadow-sm">
                    <div className="text-[10px] uppercase tracking-wide opacity-80 mb-1">{request.user?.nome || 'Voce'}</div>
                    <p className="text-sm">{request.content}</p>
                    <div className="flex items-center justify-end gap-2 mt-1 opacity-70">
                      <span className="text-[10px]">{new Date(request.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {request.status === 'pending' && <Clock className="w-3 h-3" />}
                      {request.status === 'resolved' && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                </div>

                {request.admin_notes && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] shadow-sm">
                      <p className="text-sm">{request.admin_notes}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase">
                          {request.resolved_by_name || 'Suporte'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          <div className="flex gap-2 relative">
            <input
              type="text"
              value={changeRequest}
              onChange={(event) => setChangeRequest(event.target.value)}
              placeholder="Digite sua solicitação ou dúvida..."
              className="flex-1 bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all placeholder:text-slate-400 pr-12"
              onKeyDown={(event) => event.key === 'Enter' && changeRequest.trim() && void handleSendRequest()}
            />
            <button
              onClick={() => void handleSendRequest()}
              disabled={isSendingRequest || !changeRequest.trim()}
              className="absolute right-1.5 top-1.5 p-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:bg-slate-300"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 text-center">
            Precisa de ajuda urgente? Contate o suporte técnico diretamente.
          </p>
        </div>
      </div>
    </div>
  );
}
