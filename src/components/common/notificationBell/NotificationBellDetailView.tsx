import {
  Check,
  ChevronLeft,
  Clock,
  Megaphone,
  RotateCcw,
  Shield,
  XCircle,
} from 'lucide-react';
import { getMicroregiaoById } from '../../../data/microregioes';
import type {
  RequestStatus,
  UserRequest,
} from '../../../services/requestsService';

interface NotificationBellDetailViewProps {
  adminNote: string;
  isAdmin: boolean;
  onAdminNoteChange: (value: string) => void;
  onBack: () => void;
  onNavigate?: (nav: 'strategy' | 'home' | 'settings' | 'dashboard' | 'news' | 'hub' | 'forums' | 'mentorship' | 'education' | 'repository') => void;
  onUpdate: (requestId: string, status: RequestStatus, note?: string) => void | Promise<void>;
  saving: boolean;
  selectedRequest: UserRequest;
  setIsOpen: (isOpen: boolean) => void;
}

export function NotificationBellDetailView({
  adminNote,
  isAdmin,
  onAdminNoteChange,
  onBack,
  onNavigate,
  onUpdate,
  saving,
  selectedRequest,
  setIsOpen,
}: NotificationBellDetailViewProps) {
  return (
    <div className="animate-fade-in">
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl mb-4 transition-all shadow-sm group"
      >
        <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        Voltar para lista
      </button>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className={`p-5 border-b border-slate-100 dark:border-slate-800 ${selectedRequest.request_type === 'announcement' ? 'bg-teal-50/50 dark:bg-teal-900/10' : 'bg-slate-50/50 dark:bg-slate-900/50'}`}>
          <div className="flex justify-between items-start gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${selectedRequest.request_type === 'announcement'
                ? 'bg-teal-100 text-teal-600 dark:bg-teal-900/50 dark:text-teal-400'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                {selectedRequest.request_type === 'announcement'
                  ? <Megaphone size={20} />
                  : (selectedRequest.user?.nome || 'U')[0].toUpperCase()}
              </div>

              <div>
                <div className="font-bold text-slate-800 dark:text-slate-100 text-base">
                  {selectedRequest.request_type === 'announcement'
                    ? 'Mural da Rede'
                    : isAdmin
                      ? selectedRequest.user?.nome
                      : 'Sua Solicitacao'}
                </div>

                {selectedRequest.request_type === 'announcement' ? (
                  <div className="text-xs text-teal-600 dark:text-teal-400 font-medium mt-0.5">
                    Comunicado Oficial
                  </div>
                ) : (isAdmin && selectedRequest.user && (
                  <div className="flex flex-wrap gap-x-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {selectedRequest.user.cargo && (
                      <span className="font-medium text-teal-600 dark:text-teal-400">
                        {selectedRequest.user.cargo}
                      </span>
                    )}

                    {(selectedRequest.user.cargo && (selectedRequest.user.microregiao_id || selectedRequest.user.municipio)) && (
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                    )}

                    {selectedRequest.user.microregiao_id && (
                      <span>
                        {getMicroregiaoById(selectedRequest.user.microregiao_id)?.nome || 'Regional'}
                      </span>
                    )}

                    {(selectedRequest.user.microregiao_id && selectedRequest.user.municipio) && (
                      <span className="text-slate-300 dark:text-slate-600">/</span>
                    )}

                    {selectedRequest.user.municipio && (
                      <span>{selectedRequest.user.municipio}</span>
                    )}
                  </div>
                ))}

                <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                  <Clock size={10} />
                  {new Date(selectedRequest.created_at).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' })}
                </div>
              </div>
            </div>

            {selectedRequest.request_type !== 'announcement' && (
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${selectedRequest.status === 'pending'
                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30'
                : selectedRequest.status === 'resolved'
                  ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30'
                  : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30'
                }`}
              >
                {selectedRequest.status === 'pending'
                  ? 'PENDENTE'
                  : selectedRequest.status === 'resolved'
                    ? 'RESOLVIDO'
                    : 'REJEITADO'}
              </span>
            )}

            {selectedRequest.request_type === 'announcement' && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-900/30 flex items-center gap-1">
                <Megaphone size={12} />
                NOVO
              </span>
            )}
          </div>
        </div>

        <div className="p-5">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="text-slate-800 dark:text-slate-300 leading-relaxed text-sm whitespace-pre-wrap">
              {selectedRequest.content}
            </p>
          </div>

          {(selectedRequest.admin_notes || isAdmin) && (
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
              {selectedRequest.request_type === 'announcement' && !isAdmin ? (
                <div className="flex justify-end">
                  <button
                    className="flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-900/20 dark:text-teal-300 dark:hover:bg-teal-900/30 rounded-lg text-sm font-bold transition-colors"
                    onClick={() => {
                      setIsOpen(false);
                      onNavigate?.('news');
                    }}
                  >
                    <Megaphone size={16} />
                    Ir para o Mural
                  </button>
                </div>
              ) : (
                <>
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    {isAdmin ? 'Area Administrativa' : 'Resposta da Administracao'}
                  </h5>

                  {!isAdmin && selectedRequest.admin_notes && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-lg p-4">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                          <Shield className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1">Radar Admin</div>
                          <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                            {selectedRequest.admin_notes}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {isAdmin && (
                    <div className="space-y-4">
                      <textarea
                        value={adminNote}
                        onChange={(event) => onAdminNoteChange(event.target.value)}
                        placeholder="Digite sua resposta ou observacao interna..."
                        rows={4}
                        className="w-full px-4 py-3 text-sm text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all resize-none placeholder:text-slate-400"
                      />

                      <div className="flex flex-wrap items-center gap-2 justify-end">
                        {selectedRequest.status !== 'pending' && (
                          <button
                            onClick={() => void onUpdate(selectedRequest.id, 'pending', adminNote)}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg transition-colors border border-amber-200/50"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Reabrir
                          </button>
                        )}
                        {selectedRequest.status !== 'rejected' && (
                          <button
                            onClick={() => void onUpdate(selectedRequest.id, 'rejected', adminNote)}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all shadow-sm"
                          >
                            <XCircle className="w-3 h-3" />
                            Rejeitar
                          </button>
                        )}
                        {selectedRequest.status !== 'resolved' && (
                          <button
                            onClick={() => void onUpdate(selectedRequest.id, 'resolved', adminNote)}
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2 text-xs font-bold bg-teal-600 text-white hover:bg-teal-700 rounded-lg shadow-md hover:shadow-lg transition-all"
                          >
                            {saving ? 'Salvando...' : 'Resolver & Responder'}
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
