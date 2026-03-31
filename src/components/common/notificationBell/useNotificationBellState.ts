import { useAuth } from '../../../auth/AuthContext';
import { isAdminLike } from '../../../lib/authHelpers';
import {
  loadNotificationRequests,
  subscribeToUserRequests,
  unsubscribeFromUserRequests,
  updateUserRequest,
  type RequestStatus,
  type UserRequest,
} from '../../../services/requestsService';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NotificationTab } from './notificationBell.types';
import {
  getReadKey,
  getReadNotifications,
  saveReadNotifications,
} from './notificationBell.utils';

const ADMIN_ACTIONABLE_NOTIFICATION_TYPES = new Set([
  'request',
  'feedback',
  'support',
  'system',
]);
const PERSONAL_PENDING_NOTIFICATION_TYPES = new Set([
  'mention',
  'announcement',
  'system',
]);

function dedupeRequestsById(items: UserRequest[]): UserRequest[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

interface UseNotificationBellStateParams {
  isOpen: boolean;
}

export function useNotificationBellState({ isOpen }: UseNotificationBellStateParams) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<UserRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<UserRequest | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(getReadNotifications);
  const [activeTab, setActiveTab] = useState<NotificationTab>('unread');

  const isAdmin = isAdminLike(user?.role);

  const isUnread = useCallback((request: UserRequest): boolean => {
    const readKey = getReadKey(request.id, request.status);
    if (readIds.has(readKey)) return false;

    if (isAdmin) {
      const isActionable = ADMIN_ACTIONABLE_NOTIFICATION_TYPES.has(request.request_type);
      const isPersonal = request.user_id === user?.id;
      return request.status === 'pending' && (isActionable || isPersonal);
    }

    if (request.status === 'pending') {
      return PERSONAL_PENDING_NOTIFICATION_TYPES.has(request.request_type);
    }

    return true;
  }, [isAdmin, readIds, user?.id]);

  const markAsRead = useCallback((request: UserRequest) => {
    const nextReadIds = new Set(readIds);
    nextReadIds.add(getReadKey(request.id, request.status));
    setReadIds(nextReadIds);
    saveReadNotifications(nextReadIds);
  }, [readIds]);

  const markAllAsRead = useCallback(() => {
    const nextReadIds = new Set(readIds);
    requests.filter((request) => isUnread(request)).forEach((request) => {
      nextReadIds.add(getReadKey(request.id, request.status));
    });
    setReadIds(nextReadIds);
    saveReadNotifications(nextReadIds);
  }, [isUnread, readIds, requests]);

  const unreadRequests = useMemo(
    () => requests.filter((request) => isUnread(request)),
    [isUnread, requests],
  );

  const notificationCount = unreadRequests.length;
  const filteredRequests = activeTab === 'unread' ? unreadRequests : requests;

  const loadRequests = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await loadNotificationRequests({
        userId: user.id,
        isAdmin,
        limit: 20,
        includeProfileDetails: true,
      });
      setRequests(dedupeRequestsById(data));
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, user]);

  const handleUpdate = useCallback(async (
    requestId: string,
    status: RequestStatus,
    note?: string,
  ) => {
    setSaving(true);
    try {
      const { success } = await updateUserRequest({
        requestId,
        status,
        adminNotes: note,
        resolvedById: user?.id,
      });

      if (!success) {
        return;
      }

      setRequests((currentRequests) => currentRequests.map((request) => (
        request.id === requestId
          ? { ...request, status, admin_notes: note ?? request.admin_notes }
          : request
      )));
      setSelectedRequest(null);
      setAdminNote('');
    } finally {
      setSaving(false);
    }
  }, [user?.id]);

  const openDetails = useCallback((request: UserRequest) => {
    setSelectedRequest(request);
    setAdminNote(request.admin_notes || '');
    markAsRead(request);
  }, [markAsRead]);

  const closeDetails = useCallback(() => {
    setSelectedRequest(null);
  }, []);

  useEffect(() => {
    if (isOpen && user) {
      void loadRequests();
    }
  }, [isOpen, loadRequests, user]);

  useEffect(() => {
    if (user) {
      void loadRequests();
    }
  }, [loadRequests, user]);

  const loadRequestsRef = useRef(loadRequests);
  useEffect(() => {
    loadRequestsRef.current = loadRequests;
  }, [loadRequests]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = subscribeToUserRequests({
      channelName: 'user_requests_changes',
      userId: user.id,
      isAdmin,
      onChange: () => {
        void loadRequestsRef.current();
      },
    });

    return () => {
      unsubscribeFromUserRequests(channel);
    };
  }, [isAdmin, user?.id]);

  useEffect(() => {
    if (!selectedRequest) return;

    const updatedRequest = requests.find((request) => request.id === selectedRequest.id);
    if (updatedRequest) {
      setSelectedRequest(updatedRequest);
    }
  }, [requests, selectedRequest]);

  return {
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
  };
}
