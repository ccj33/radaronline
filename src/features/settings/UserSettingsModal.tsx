import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/common/Toast';
import { logError } from '../../lib/logger';
import { isAdminLike } from '../../lib/authHelpers';
import {
  createUserRequest,
  loadUserRequests,
  subscribeToUserRequests,
  unsubscribeFromUserRequests,
  type UserRequest,
} from '../../services/requestsService';
import {
  getReadKey,
  getReadNotifications,
  saveReadNotifications,
} from '../../components/common/notificationBell/notificationBell.utils';
import { updateUserAvatar } from '../../services/profileService';
import { AVATAR_LIST } from './avatarUtils';
import { MOCK_SUGGESTIONS } from './userSettings.constants';
import type { Suggestion, UserSettingsTab } from './userSettings.types';
import { UserSettingsAvatarMode } from './components/UserSettingsAvatarMode';
import { UserSettingsSettingsMode } from './components/UserSettingsSettingsMode';
import { UserSettingsSuggestionModal } from './components/UserSettingsSuggestionModal';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: UserSettingsTab;
  mode?: 'settings' | 'avatar';
}

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

export function UserSettingsModal({
  isOpen,
  onClose,
  initialTab,
  mode = 'settings',
}: UserSettingsModalProps) {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<UserSettingsTab>('profile');
  const isAvatarMode = mode === 'avatar';

  const [suggestions, setSuggestions] = useState<Suggestion[]>(MOCK_SUGGESTIONS);
  const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatarId || 'zg10');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [changeRequest, setChangeRequest] = useState('');
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [requests, setRequests] = useState<UserRequest[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [readIds, setReadIds] = useState<Set<string>>(getReadNotifications);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (activeTab === 'security') {
      scrollToBottom();
    }
  }, [requests, activeTab]);

  const isAdmin = isAdminLike(user?.role);

  const isUnread = useCallback((request: UserRequest): boolean => {
    const readKey = getReadKey(request.id, request.status);
    if (readIds.has(readKey)) return false;

    if (request.status === 'pending') {
      return request.request_type === 'mention' || request.request_type === 'announcement' || request.request_type === 'system';
    }

    return true;
  }, [readIds]);

  const loadRequests = useCallback(async () => {
    if (!user) return;

    setLoadingNotifications(true);
    try {
      const data = await loadUserRequests({
        userId: user.id,
        isAdmin: false,
        limit: 20,
        includeProfileDetails: true,
      });
      setRequests(dedupeRequestsById(data));
    } finally {
      setLoadingNotifications(false);
    }
  }, [user]);

  const markAsRead = (requestId: string) => {
    const request = requests.find((item) => item.id === requestId);
    if (!request) {
      return;
    }

    const nextReadIds = new Set(readIds);
    nextReadIds.add(getReadKey(request.id, request.status));
    setReadIds(nextReadIds);
    saveReadNotifications(nextReadIds);
  };

  useEffect(() => {
    if ((activeTab === 'notifications' || activeTab === 'security') && user) {
      void loadRequests();
    }
  }, [activeTab, user, loadRequests]);

  const loadRequestsRef = useRef(loadRequests);
  useEffect(() => {
    loadRequestsRef.current = loadRequests;
  }, [loadRequests]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = subscribeToUserRequests({
      channelName: 'user_requests_modal_changes',
      userId: user.id,
      isAdmin: false,
      onChange: () => {
        void loadRequestsRef.current();
      },
    });

    return () => {
      unsubscribeFromUserRequests(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    if (isOpen && user) {
      setSelectedAvatar(user.avatarId || 'zg10');
      setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');

      if (initialTab) {
        setActiveTab(initialTab);
      } else if (isAvatarMode) {
        setActiveTab('profile');
      } else {
        setActiveTab('profile');
      }
    }
  }, [initialTab, isAvatarMode, isOpen, user]);

  useEffect(() => {
    if (isOpen && initialTab) {
      const timer = setTimeout(() => {
        setActiveTab(initialTab);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [initialTab, isOpen]);

  if (!isOpen || !user) {
    return null;
  }

  const filteredAvatars = selectedCategory === 'all'
    ? AVATAR_LIST
    : AVATAR_LIST.filter((avatar) => avatar.category === selectedCategory);

  const handleVote = (id: string) => {
    setSuggestions((currentSuggestions) => currentSuggestions.map((suggestion) => (
      suggestion.id === id
        ? { ...suggestion, votes: suggestion.votes + 1, hasVoted: true }
        : suggestion
    )));
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const result = await updateUserAvatar(user.id, selectedAvatar);
      if (!result.success) {
        throw new Error(result.error || 'Erro ao atualizar avatar');
      }

      await refreshUser();
      showToast('Perfil atualizado com sucesso!', 'success');
      onClose();
    } catch (error) {
      logError('UserSettingsModal', 'Error saving profile', error);
      showToast('Erro ao salvar perfil', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendRequest = async () => {
    if (isSendingRequest || !changeRequest.trim()) return;

    setIsSendingRequest(true);
    try {
      const { data, error } = await createUserRequest(
        user.id,
        'support',
        changeRequest.trim(),
      );

      if (error) {
        throw new Error(error);
      }

      if (data) {
        setRequests((currentRequests) => dedupeRequestsById([data, ...currentRequests]));
      }

      showToast('Solicitacao enviada!', 'success');
      setChangeRequest('');
    } catch (error) {
      logError('UserSettingsModal', 'Error sending request', error);
      showToast('Erro ao enviar solicitacao', 'error');
    } finally {
      setIsSendingRequest(false);
    }
  };

  const toggleTheme = (nextTheme: 'light' | 'dark' | 'system') => {
    setTheme(nextTheme);

    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      return;
    }

    if (nextTheme === 'light') {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      return;
    }

    localStorage.removeItem('theme');
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleSuggestionSubmit = () => {
    showToast('Sugestao enviada para analise!', 'success');
    setIsSuggestionModalOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div key="settings-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {isAvatarMode ? (
            <UserSettingsAvatarMode
              activeTab={activeTab}
              filteredAvatars={filteredAvatars}
              isSaving={isSaving}
              loadingNotifications={loadingNotifications}
              markAsRead={markAsRead}
              onClose={onClose}
              onSaveProfile={handleSaveProfile}
              requests={requests}
              selectedAvatar={selectedAvatar}
              selectedCategory={selectedCategory}
              setActiveTab={setActiveTab}
              setSelectedAvatar={setSelectedAvatar}
              setSelectedCategory={setSelectedCategory}
              user={user}
              isUnread={isUnread}
            />
          ) : (
            <UserSettingsSettingsMode
              activeTab={activeTab}
              changeRequest={changeRequest}
              chatContainerRef={chatContainerRef}
              handleSendRequest={handleSendRequest}
              isAdmin={isAdmin}
              isSendingRequest={isSendingRequest}
              isUnread={isUnread}
              loadRequests={loadRequests}
              loadingNotifications={loadingNotifications}
              markAsRead={markAsRead}
              onClose={onClose}
              onOpenSuggestionModal={() => setIsSuggestionModalOpen(true)}
              onVote={handleVote}
              requests={requests}
              setActiveTab={setActiveTab}
              setChangeRequest={setChangeRequest}
              suggestions={suggestions}
              theme={theme}
              toggleTheme={toggleTheme}
              user={user}
            />
          )}
        </div>
      )}

      <UserSettingsSuggestionModal
        key="suggestion-modal"
        isOpen={isSuggestionModalOpen}
        onClose={() => setIsSuggestionModalOpen(false)}
        onSubmit={handleSuggestionSubmit}
      />
    </AnimatePresence>
  );
}
