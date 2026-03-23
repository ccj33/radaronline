import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { NotificationBellButton } from './notificationBell/NotificationBellButton';
import { NotificationBellPanel } from './notificationBell/NotificationBellPanel';
import { useNotificationBellState } from './notificationBell/useNotificationBellState';

export interface NotificationBellProps {
  className?: string;
  collapsed?: boolean;
  onViewAllRequests?: () => void;
  onNavigate?: (nav: 'strategy' | 'home' | 'settings' | 'dashboard' | 'news' | 'hub' | 'forums' | 'mentorship' | 'education' | 'repository') => void;
}

export function NotificationBell({
  className = '',
  collapsed = false,
  onViewAllRequests,
  onNavigate,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const {
    activeTab,
    adminNote,
    closeDetails,
    filteredRequests,
    handleUpdate,
    isAdmin,
    isUnread,
    loading,
    markAllAsRead,
    notificationCount,
    openDetails,
    requests,
    saving,
    selectedRequest,
    setActiveTab,
    setAdminNote,
    user,
  } = useNotificationBellState({ isOpen });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsideButton = buttonRef.current && !buttonRef.current.contains(target);
      const isOutsidePanel = panelRef.current && !panelRef.current.contains(target);

      if (isOutsideButton && isOutsidePanel) {
        setIsOpen(false);
        closeDetails();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeDetails]);

  if (!user) {
    return null;
  }

  return (
    <>
      <NotificationBellButton
        buttonRef={buttonRef}
        className={className}
        collapsed={collapsed}
        isOpen={isOpen}
        notificationCount={notificationCount}
        onOpen={() => setIsOpen(true)}
      />

      {isOpen && createPortal(
        <>
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-[9998]"
            onClick={() => {
              setIsOpen(false);
              closeDetails();
            }}
            aria-hidden="true"
          />

          <NotificationBellPanel
            activeTab={activeTab}
            adminNote={adminNote}
            filteredRequests={filteredRequests}
            isAdmin={isAdmin}
            isOpen={isOpen}
            isUnread={isUnread}
            loading={loading}
            markAllAsRead={markAllAsRead}
            notificationCount={notificationCount}
            onAdminNoteChange={setAdminNote}
            onClose={() => {
              setIsOpen(false);
              closeDetails();
            }}
            onNavigate={onNavigate}
            onOpenDetails={openDetails}
            onSelectTab={setActiveTab}
            onUpdate={handleUpdate}
            onViewAllRequests={onViewAllRequests}
            panelRef={panelRef}
            requests={requests}
            saving={saving}
            selectedRequest={selectedRequest}
            setIsOpen={setIsOpen}
            setSelectedRequest={closeDetails}
          />
        </>,
        document.body,
      )}
    </>
  );
}
