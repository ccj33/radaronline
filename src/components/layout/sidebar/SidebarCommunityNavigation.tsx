import React from 'react';
import {
  ArrowLeftRight,
  FolderOpen,
  GraduationCap,
  LayoutGrid,
  MessagesSquare,
  Users,
} from 'lucide-react';
import { SidebarItem } from './SidebarItem';
import { SidebarSectionTitle } from './SidebarSectionTitle';

interface SidebarCommunityNavigationProps {
  isOpen: boolean;
  currentNav: string;
  onNavigate: (nav: string) => void;
  onSwitchWorkspace: () => void;
}

export const SidebarCommunityNavigation = React.memo<SidebarCommunityNavigationProps>(({
  isOpen,
  currentNav,
  onNavigate,
  onSwitchWorkspace,
}) => {
  return (
    <>
      <button
        onClick={onSwitchWorkspace}
        className={`group mb-3 flex w-full items-center gap-3 rounded-xl border border-white/10 px-3 py-2.5 font-medium text-white/60 transition-all duration-200 hover:bg-white/10 hover:text-white ${isOpen ? '' : 'justify-center'}`}
        title={isOpen ? '' : 'Voltar ao Planejamento'}
      >
        <ArrowLeftRight size={16} className="shrink-0" />
        {isOpen && <span className="text-xs truncate">Voltar ao Planejamento</span>}
      </button>

      {isOpen && (
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-white shadow-lg shadow-slate-950/10 backdrop-blur-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-100/80">Hub da Rede</p>
          <p className="mt-2 text-sm font-semibold leading-6">Comunidade, mentoria, aprendizagem e acervo em um mesmo fluxo.</p>
          <p className="mt-2 text-xs leading-5 text-white/70">
            A entrada do workspace agora comeca pelo Hub para conectar jornadas, nao apenas trocar de tela.
          </p>
        </div>
      )}

      <SidebarSectionTitle collapsed={!isOpen}>Explorar</SidebarSectionTitle>

      <SidebarItem
        icon={LayoutGrid}
        label="Hub"
        isActive={currentNav === 'hub'}
        onClick={() => onNavigate('hub')}
        collapsed={!isOpen}
      />
      <SidebarItem
        icon={MessagesSquare}
        label="Foruns"
        isActive={currentNav === 'forums'}
        onClick={() => onNavigate('forums')}
        collapsed={!isOpen}
      />
      <SidebarItem
        icon={Users}
        label="Mentorias"
        isActive={currentNav === 'mentorship'}
        onClick={() => onNavigate('mentorship')}
        collapsed={!isOpen}
      />

      <SidebarSectionTitle collapsed={!isOpen}>Aprender</SidebarSectionTitle>

      <SidebarItem
        icon={GraduationCap}
        label="Educacao"
        isActive={currentNav === 'education'}
        onClick={() => onNavigate('education')}
        collapsed={!isOpen}
      />
      <SidebarItem
        icon={FolderOpen}
        label="Biblioteca"
        isActive={currentNav === 'repository'}
        onClick={() => onNavigate('repository')}
        collapsed={!isOpen}
      />
    </>
  );
});

SidebarCommunityNavigation.displayName = 'SidebarCommunityNavigation';
