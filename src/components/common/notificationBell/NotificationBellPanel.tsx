import { Bell, CheckCheck, X } from 'lucide-react';
import type { RefObject } from 'react';
import type { RequestStatus, UserRequest } from '../../../services/requestsService';
import type { NotificationTab } from './notificationBell.types';
import { NotificationBellDetailView } from './NotificationBellDetailView';
import { NotificationBellListView } from './NotificationBellListView';

interface NotificationBellPanelProps {
  activeTab: NotificationTab;
  adminNote: string;
  filteredRequests: UserRequest[];
  isAdmin: boolean;
  isOpen: boolean;
  isUnread: (request: UserRequest) => boolean;
  loading: boolean;
  markAllAsRead: () => void;
  notificationCount: number;
  onAdminNoteChange: (value: string) => void;
  onClose: () => void;
  onNavigate?: (nav: 'strategy' | 'home' | 'settings' | 'dashboard' | 'news' | 'hub' | 'forums' | 'mentorship' | 'education' | 'repository') => void;
  onOpenDetails: (request: UserRequest) => void;
  onSelectTab: (tab: NotificationTab) => void;
  onUpdate: (requestId: string, status: RequestStatus, note?: string) => void | Promise<void>;
  onViewAllRequests?: () => void;
  panelRef: RefObject<HTMLDivElement>;
  requests: UserRequest[];
  saving: boolean;
  selectedRequest: UserRequest | null;
  setIsOpen: (isOpen: boolean) => void;
  setSelectedRequest: () => void;
}

export function NotificationBellPanel({
  activeTab,
  adminNote,
  filteredRequests,
  isAdmin,
  isUnread,
  loading,
  markAllAsRead,
  notificationCount,
  onAdminNoteChange,
  onClose,
  onNavigate,
  onOpenDetails,
  onSelectTab,
  onUpdate,
  onViewAllRequests,
  panelRef,
  requests,
  saving,
  selectedRequest,
  setIsOpen,
  setSelectedRequest,
}: NotificationBellPanelProps) {
  return (
    <div
      ref={panelRef}
      className="fixed top-0 right-0 h-full w-[420px] max-w-[90vw] bg-white dark:bg-slate-900 shadow-2xl z-[9999] animate-slide-in-right border-l border-slate-200 dark:border-slate-800 flex flex-col"
    >
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-50 dark:bg-teal-900/30 rounded-lg text-teal-600 dark:text-teal-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight">
                {isAdmin ? 'Solicitacoes' : 'Notificacoes'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {notificationCount > 0 ? `${notificationCount} nao lidas` : 'Nenhuma nova notificacao'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => onSelectTab('unread')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'unread'
                ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
              Nao lidas
              {notificationCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded-full">
                  {notificationCount}
                </span>
              )}
            </button>
            <button
              onClick={() => onSelectTab('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'all'
                ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
              Todas
              <span className="ml-1.5 text-slate-400 dark:text-slate-500">
                {requests.length}
              </span>
            </button>
          </div>

          {notificationCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors"
              title="Marcar todas como lidas"
            >
              <CheckCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Marcar lidas</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50 p-4">
        {selectedRequest ? (
          <NotificationBellDetailView
            adminNote={adminNote}
            isAdmin={isAdmin}
            onAdminNoteChange={onAdminNoteChange}
            onBack={setSelectedRequest}
            onNavigate={onNavigate}
            onUpdate={onUpdate}
            saving={saving}
            selectedRequest={selectedRequest}
            setIsOpen={setIsOpen}
          />
        ) : (
          <NotificationBellListView
            activeTab={activeTab}
            filteredRequests={filteredRequests}
            isAdmin={isAdmin}
            isUnread={isUnread}
            loading={loading}
            onOpenDetails={onOpenDetails}
            onViewAllRequests={onViewAllRequests}
            requests={requests}
            setIsOpen={setIsOpen}
          />
        )}
      </div>
    </div>
  );
}
