import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Action } from '../../../types';
import type { User } from '../../../types/auth.types';
import type { PendingRegistration } from '../adminPanel.types';
import { AdminMobileLayout } from './AdminMobileLayout';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  motion: {
    aside: ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...props }: any) => (
      <aside {...props}>{children}</aside>
    ),
    button: ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...props }: any) => (
      <button {...props}>{children}</button>
    ),
  },
}));

vi.mock('../../../components/common/NotificationBell', () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

vi.mock('../../../components/common/ThemeToggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

vi.mock('../dashboard', () => ({
  ActivityCenter: () => <div data-testid="activity-center" />,
  RankingPanel: () => <div data-testid="ranking-panel" />,
  RequestsManagement: () => <div data-testid="requests-management" />,
}));

vi.mock('../AnnouncementsManagement', () => ({
  AnnouncementsManagement: () => <div data-testid="announcements-management" />,
}));

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: overrides.id || 'user-1',
    nome: overrides.nome || 'Maria Silva',
    email: overrides.email || 'maria@example.com',
    role: overrides.role || 'admin',
    microregiaoId: overrides.microregiaoId || 'MR001',
    microregiaoIds: overrides.microregiaoIds || ['MR001'],
    ativo: overrides.ativo ?? true,
    lgpdConsentimento: overrides.lgpdConsentimento ?? true,
    avatarId: overrides.avatarId || 'avatar-1',
    firstAccess: overrides.firstAccess ?? false,
    createdAt: overrides.createdAt || '2026-03-31T00:00:00.000Z',
    municipio: overrides.municipio || 'Belo Horizonte',
  };
}

function buildAction(overrides: Partial<Action> = {}): Action {
  return {
    uid: overrides.uid || 'MR001::1.1.1',
    id: overrides.id || '1.1.1',
    activityId: overrides.activityId || '1.1',
    microregiaoId: overrides.microregiaoId || 'MR001',
    title: overrides.title || 'Acao prioritaria',
    status: overrides.status || 'Em Andamento',
    startDate: overrides.startDate || '2026-03-01',
    plannedEndDate: overrides.plannedEndDate || '2026-04-02',
    endDate: overrides.endDate || '',
    progress: overrides.progress ?? 50,
    raci: overrides.raci || [],
    tags: overrides.tags || [],
    notes: overrides.notes || '',
    comments: overrides.comments || [],
  };
}

function buildPending(overrides: Partial<PendingRegistration> = {}): PendingRegistration {
  return {
    id: overrides.id || 'pending-1',
    email: overrides.email || 'pendente@example.com',
    microregiaoId: overrides.microregiaoId || 'MR001',
    municipio: overrides.municipio || 'Belo Horizonte',
    name: overrides.name || 'Cadastro Pendente',
    cargo: overrides.cargo || 'Gestora',
    createdAt: overrides.createdAt || '2026-03-31T00:00:00.000Z',
  };
}

describe('AdminMobileLayout', () => {
  it('abre o menu lateral mobile e navega entre abas do painel admin', () => {
    const onTabChange = vi.fn();

    render(
      <AdminMobileLayout
        activeTab="dashboard"
        isSuperAdmin={false}
        isLoading={false}
        searchTerm=""
        userFilterMacro="all"
        users={[buildUser()]}
        filteredUsers={[buildUser()]}
        userAvatarId="avatar-1"
        userName="Maria Silva"
        userRole="admin"
        actions={[buildAction()]}
        pendingRegistrations={[buildPending()]}
        expandedUserId={null}
        getRoleBadge={() => <span>Admin</span>}
        onTabChange={onTabChange}
        onRefreshUsers={vi.fn()}
        onOpenProfile={vi.fn()}
        onOpenSettings={vi.fn()}
        onOpenMicroSelector={vi.fn()}
        onViewMicrorregiao={vi.fn()}
        onSearchTermChange={vi.fn()}
        onUserFilterMacroChange={vi.fn()}
        onCreateUser={vi.fn()}
        onOpenUserImport={vi.fn()}
        onCreatePendingUser={vi.fn()}
        onToggleExpandedUser={vi.fn()}
        onEditUser={vi.fn()}
        onLogout={vi.fn()}
        onRequestToggleUserStatus={vi.fn()}
        onRequestDeleteUser={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu do painel admin' }));

    const adminNavigation = screen.getByRole('navigation', { name: 'Navegacao do painel admin' });
    expect(adminNavigation).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Configuracoes' })).toBeInTheDocument();

    fireEvent.click(within(adminNavigation).getByRole('button', { name: /Pedidos/i }));

    expect(onTabChange).toHaveBeenCalledWith('requests');
    expect(screen.queryByRole('navigation', { name: 'Navegacao do painel admin' })).not.toBeInTheDocument();
  }, 45000);
});
