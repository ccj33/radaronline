import React, { useState } from 'react';
import { List, BarChart2, Menu, Shield, MapPin, Zap, Pencil, Info } from 'lucide-react';
import { Objective } from '../../types';
import { UserRole } from '../../types/auth.types';
import { ThemeToggle } from '../common/ThemeToggle';
import { ZoomControl } from '../common/ZoomControl';
import { NotificationBell } from '../common/NotificationBell';
import { getObjectiveTitleWithoutNumber } from '../../lib/text';
import { EixoSelectorModal } from '../modals/EixoSelectorModal';
import { EixoConfig, EIXOS_PREDEFINIDOS } from '../../lib/eixosConfig';

interface HeaderProps {
  macro: string;
  micro?: string;
  currentNav: 'strategy' | 'home' | 'settings' | 'dashboard' | 'news' | 'hub' | 'forums' | 'mentorship' | 'education' | 'repository';
  selectedObjective: number;
  objectives: Objective[];
  viewMode: 'table' | 'gantt' | 'team' | 'optimized' | 'calendar';
  setViewMode: (mode: 'table' | 'gantt' | 'team' | 'optimized' | 'calendar') => void;
  onMenuClick?: () => void;
  isMobile?: boolean;
  isAdmin?: boolean;
  userRole?: UserRole;
  onAdminClick?: () => void;
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
  onUpdateObjective?: (id: number, field: 'eixo' | 'eixoLabel' | 'eixoColor' | 'description', value: string | number) => void;
  onNavigate?: (nav: 'strategy' | 'home' | 'settings' | 'dashboard' | 'news' | 'hub' | 'forums' | 'mentorship' | 'education' | 'repository') => void;
}

export const Header: React.FC<HeaderProps> = ({
  macro,
  micro,
  currentNav,
  selectedObjective,
  objectives,
  viewMode,
  setViewMode,
  onMenuClick,
  isMobile = false,
  isAdmin = false,
  userRole,
  onAdminClick,
  isEditMode = false,
  onToggleEditMode,
  onUpdateObjective,
  onNavigate,
}) => {
  const objectiveIndex = objectives.findIndex(o => o.id === selectedObjective);
  const objective = objectives[objectiveIndex];
  const rawTitle = objective?.title || '';
  // Usa a posição sequencial (índice + 1) e remove o número do título se existir
  const objectiveTitle = objectiveIndex >= 0
    ? `Obj. ${objectiveIndex + 1}. ${getObjectiveTitleWithoutNumber(rawTitle)}`
    : rawTitle;

  // State para modal de seleção de Eixo
  const [isEixoModalOpen, setIsEixoModalOpen] = useState(false);

  // Handler para salvar eixo selecionado
  const handleSaveEixo = (eixo: EixoConfig) => {
    if (!objective || !onUpdateObjective) return;
    onUpdateObjective(objective.id, 'eixo', eixo.numero);
    onUpdateObjective(objective.id, 'eixoLabel', eixo.nome);
    onUpdateObjective(objective.id, 'eixoColor', eixo.cor);
    // A descrição do eixo é buscada automaticamente de EIXOS_PREDEFINIDOS
    // baseado no número do eixo, então não precisa salvar separadamente
  };

  // Busca a descrição do eixo atual
  const eixoAtual = EIXOS_PREDEFINIDOS.find(e => e.numero === objective?.eixo);
  const eixoDescricao = eixoAtual?.descricao || objective?.description || 'Sem descrição detalhada para este eixo.';
  const pageTitle = currentNav === 'home'
    ? 'Dashboard'
    : currentNav === 'news'
      ? 'Mural da Rede'
      : currentNav === 'dashboard'
        ? 'Relatorios'
        : currentNav === 'hub'
          ? 'Hub da Rede'
          : currentNav === 'forums'
            ? 'Foruns'
            : currentNav === 'mentorship'
              ? 'Mentorias'
              : currentNav === 'education'
                ? 'Educacao'
                : currentNav === 'repository'
                  ? 'Biblioteca'
                  : 'Configuracoes';



  // =============================================
  // HEADER MOBILE - Layout simplificado e limpo
  // =============================================
  if (isMobile) {
    return (
      <header
        data-tour="header"
        className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 py-2.5 shrink-0 z-30 sticky top-0 safe-area-top"
      >
        {/* Linha 1: Menu + Localização + Ações rápidas */}
        <div className="flex items-center justify-between gap-2">
          {/* Lado esquerdo: Menu + Badge de localização */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {onMenuClick && (
              <button
                onClick={onMenuClick}
                className="p-2 -ml-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg shrink-0 transition-colors"
                aria-label="Abrir menu"
              >
                <Menu size={20} />
              </button>
            )}

            {/* Badge de localização compacto */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-700/80 min-w-0 flex-1">
              <MapPin size={12} className="text-teal-500 shrink-0" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                {micro || macro || 'Minas Gerais'}
              </span>
            </div>
          </div>

          {/* Lado direito: Ações compactas */}
          <div className="flex items-center gap-1 shrink-0">
            <NotificationBell onNavigate={onNavigate} />
            <ZoomControl />
            <ThemeToggle size="sm" />
          </div>
        </div>

        {/* Linha 2: Título da página/objetivo (apenas no modo estratégia) */}
        {currentNav === 'strategy' && (
          <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
            <h1
              className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate flex-1"
              title={objectiveTitle}
            >
              {objectiveTitle || 'Selecione um objetivo'}
            </h1>

            {/* Edit mode toggle para admin */}
            {(isAdmin || userRole === 'superadmin') && onToggleEditMode && viewMode === 'table' && (
              <button
                onClick={onToggleEditMode}
                className={`
                  p-1.5 rounded-lg transition-all shrink-0
                  ${isEditMode
                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400'
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500'}
                `}
                title={isEditMode ? "Modo de edição ativo" : "Ativar modo de edição"}
              >
                <Pencil size={14} />
              </button>
            )}
          </div>
        )}

        {/* Título para outras páginas */}
        {currentNav !== 'strategy' && (
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
            <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {pageTitle}
            </h1>
          </div>
        )}
      </header>
    );
  }

  // =============================================
  // HEADER DESKTOP - Layout completo com hierarquia visual
  // Estrutura: Esquerda (Contexto) | Centro (Navegação) | Direita (Ações + Utilitários)
  // =============================================
  return (
    <header data-tour="header" className="bg-white/95 dark:bg-slate-800/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-3 lg:px-6 h-14 lg:h-16 flex items-center justify-between gap-2 lg:gap-4 shrink-0 z-30 sticky top-0 transition-all duration-200 shadow-sm">

      {/* ====== ESQUERDA: Contexto (Badge Eixo + Nome + Info) ====== */}
      <div className="flex items-center gap-2 lg:gap-3 min-w-0 shrink-0">
        {currentNav !== 'strategy' && (
          <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
            {pageTitle}
          </h1>
        )}

        {currentNav === 'strategy' && objective && (
          <div className="flex items-center gap-2 lg:gap-3 animate-fade-in">
            {/* Badge Eixo - abre modal em modo edição */}
            <div
              className={`
                flex items-center justify-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm
                ${objective.eixoColor === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800' :
                  objective.eixoColor === 'emerald' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800' :
                    objective.eixoColor === 'rose' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 ring-1 ring-rose-200 dark:ring-rose-800' :
                      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700'}
                ${isEditMode && onUpdateObjective ? 'cursor-pointer hover:brightness-95' : ''}
              `}
              onClick={() => isEditMode && setIsEixoModalOpen(true)}
              title={isEditMode ? "Clique para selecionar outro Eixo" : ""}
            >
              Eixo {objective.eixo}
            </div>

            {/* Nome do Eixo - abre modal em modo edição */}
            <h2
              className={`hidden lg:block text-sm font-bold text-slate-700 dark:text-slate-200 truncate max-w-[100px] xl:max-w-[180px] ${isEditMode && onUpdateObjective ? 'cursor-pointer hover:underline decoration-dashed decoration-slate-300 underline-offset-4 transition-all' : ''}`}
              onClick={() => isEditMode && setIsEixoModalOpen(true)}
              title={isEditMode ? "Clique para selecionar outro Eixo" : objective.eixoLabel}
            >
              {objective.eixoLabel}
            </h2>

            {/* Info com Tooltip - mostra descrição do eixo */}
            <div className="group relative flex items-center cursor-help">
              <Info size={14} className="text-slate-400 hover:text-teal-500 transition-colors" />

              {/* Tooltip Content */}
              <div className="absolute left-0 top-full mt-2 w-80 p-3 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-100 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  <span className="font-bold block mb-1 text-slate-800 dark:text-slate-100">Sobre o Eixo:</span>
                  <span className="whitespace-pre-line">{eixoDescricao}</span>
                </div>
                {/* Seta do Tooltip */}
                <div className="absolute -top-1 left-3 w-2 h-2 bg-white dark:bg-slate-800 transform rotate-45 border-t border-l border-slate-100 dark:border-slate-700"></div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Seleção de Eixo */}
        <EixoSelectorModal
          isOpen={isEixoModalOpen}
          onClose={() => setIsEixoModalOpen(false)}
          onSave={handleSaveEixo}
          currentEixo={objective?.eixo || 1}
        />
      </div>

      {/* ====== CENTRO: Navegação (Tabs de Visualização) ====== */}
      <div className="flex-1 flex justify-center min-w-0">
        {currentNav === 'strategy' && (
          <div data-tour="view-mode" className="flex bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
            <TabButton
              active={viewMode === 'table'}
              onClick={() => setViewMode('table')}
              icon={<List size={14} />}
              label="Tabela"
            />
            <TabButton
              active={viewMode === 'gantt'}
              onClick={() => setViewMode('gantt')}
              icon={<BarChart2 size={14} />}
              label="Cronograma"
            />
            <TabButton
              active={viewMode === 'optimized'}
              onClick={() => setViewMode('optimized')}
              icon={<Zap size={14} />}
              label="Visão Rápida"
            />
          </div>
        )}
      </div>

      {/* ====== DIREITA: Ações Primárias + Separador + Utilitários ====== */}
      <div className="flex items-center gap-1.5 lg:gap-2 shrink-0">

        {/* Grupo de Ações Primárias (EDITAR + ADMIN) */}
        <div className="flex items-center gap-1.5 lg:gap-2">
          {/* Edit Mode Toggle - FUNDO ROXO SÓLIDO */}
          {(isAdmin || userRole === 'superadmin') && currentNav === 'strategy' && onToggleEditMode && viewMode === 'table' && (
            <button
              onClick={onToggleEditMode}
              className={`
                flex items-center gap-1 lg:gap-2 px-2 lg:px-3 py-1 lg:py-1.5 rounded-md lg:rounded-lg text-[10px] lg:text-[11px] font-bold tracking-tight transition-all
                ${isEditMode
                  ? 'bg-amber-500 text-white shadow-md hover:bg-amber-600 ring-2 ring-amber-300/50'
                  : 'bg-purple-600 text-white shadow-md hover:bg-purple-700'}
              `}
              title={isEditMode ? "Modo de edição ativo" : "Ativar modo de edição"}
            >
              <Pencil size={12} />
              <span className="hidden sm:inline">{isEditMode ? 'EDITANDO' : 'EDITAR'}</span>
            </button>
          )}

          {/* Botão Admin - OUTLINE ROXO */}
          {isAdmin && onAdminClick && (
            <button
              onClick={onAdminClick}
              className="flex items-center gap-1 lg:gap-1.5 px-2 lg:px-3 py-1 lg:py-1.5 bg-transparent hover:bg-purple-50 dark:hover:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-md lg:rounded-lg text-[10px] lg:text-[11px] font-bold transition-all border-2 border-purple-600 dark:border-purple-500"
            >
              <Shield size={12} />
              <span className="hidden sm:inline">ADMIN</span>
            </button>
          )}
        </div>

        {/* Separador Visual */}
        <div className="h-5 lg:h-6 w-px bg-slate-200 dark:bg-slate-600 mx-1 lg:mx-2" />

        {/* Grupo de Utilitários (Sino, Zoom, Tema) - DESTAQUE MÍNIMO */}
        <div className="flex items-center gap-0.5 lg:gap-1">
          {/* Notification Bell */}
          {micro && <NotificationBell onNavigate={onNavigate} />}
          <ZoomControl />
          <ThemeToggle size="sm" />
        </div>
      </div>
    </header>
  );
};

// Componente auxiliar para abas limpas - responsivo
const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`
      flex items-center gap-1.5 px-2 lg:px-3 py-1 lg:py-1.5 transition-all rounded-md lg:rounded-lg font-bold text-[10px] lg:text-[11px] tracking-tight
      ${active
        ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-600/50'
        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-700/40'
      }
    `}
    title={label}
  >
    <span className={active ? 'text-teal-500' : 'text-slate-400 dark:text-slate-500'}>{icon}</span>
    <span className="hidden xl:inline">{label}</span>
  </button>
);
