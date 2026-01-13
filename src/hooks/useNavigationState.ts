import { useState, useEffect } from 'react';
import { User } from '../types/auth.types';

interface UseNavigationStateProps {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isMobile: boolean;
}

export function useNavigationState({ user, isAuthenticated, isAdmin, isMobile }: UseNavigationStateProps) {
  const [currentPage, setCurrentPage] = useState<'main' | 'admin' | 'lgpd'>('main');
  const [didAutoOpenAdmin, setDidAutoOpenAdmin] = useState(false);
  const [selectedObjective, setSelectedObjective] = useState<number>(1);
  const [selectedActivity, setSelectedActivity] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'gantt' | 'team' | 'optimized' | 'calendar'>('table');
  const [ganttRange, setGanttRange] = useState<'all' | '3months' | '6months' | '1year'>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(!isMobile);
  const [currentNav, setCurrentNav] = useState<'strategy' | 'home' | 'settings'>('strategy');
  const [showStickyActivity, setShowStickyActivity] = useState<boolean>(false);
  const [ganttStatusFilter, setGanttStatusFilter] = useState<'Não Iniciado' | 'Em Andamento' | 'Concluído' | 'Atrasado' | 'all'>('all');
  const [isCreateActionModalOpen, setIsCreateActionModalOpen] = useState(false);
  const [createActionMicroId, setCreateActionMicroId] = useState<string>('');

  // ✅ FASE 2: Consolidar useEffects relacionados a autenticação e navegação
  useEffect(() => {
    // Verificar se precisa aceitar LGPD
    if (user && !user.lgpdConsentimento && currentPage !== 'lgpd') {
      setCurrentPage('lgpd');
      return;
    }

    // Administrador entra direto no painel admin após login
    if (isAuthenticated && isAdmin && !didAutoOpenAdmin) {
      setCurrentPage('admin');
      setDidAutoOpenAdmin(true);
      return;
    }

    // Reset flag ao sair
    if (!isAuthenticated && didAutoOpenAdmin) {
      setDidAutoOpenAdmin(false);
    }
  }, [user, currentPage, isAuthenticated, isAdmin, didAutoOpenAdmin]);

  // ✅ FASE 2: Consolidar useEffects relacionados a navegação e view mode
  useEffect(() => {
    // Close sidebar on mobile when navigating
    if (isMobile) {
      setIsSidebarOpen(false);
    }

    // Ao entrar no modo Gantt, usar range "Tudo" por padrão
    if (viewMode === 'gantt') {
      setGanttRange('all');
    }
  }, [viewMode, selectedObjective, isMobile]);

  return {
    currentPage,
    setCurrentPage,
    didAutoOpenAdmin,
    selectedObjective,
    setSelectedObjective,
    selectedActivity,
    setSelectedActivity,
    viewMode,
    setViewMode,
    ganttRange,
    setGanttRange,
    isSidebarOpen,
    setIsSidebarOpen,
    currentNav,
    setCurrentNav,
    showStickyActivity,
    setShowStickyActivity,
    ganttStatusFilter,
    setGanttStatusFilter,
    isCreateActionModalOpen,
    setIsCreateActionModalOpen,
    createActionMicroId,
    setCreateActionMicroId,
  };
}

