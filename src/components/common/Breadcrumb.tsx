import React from 'react';
import { ChevronRight, Home, Target, FileText } from 'lucide-react';
import { getActivityDisplayId } from '../../lib/text';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  icon?: React.ReactNode;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  return (
    <nav
      aria-label="Navegação estrutural"
      className="flex items-center gap-1 text-xs font-medium overflow-x-auto pb-1"
    >
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <ChevronRight size={12} className="text-slate-300 shrink-0" />
          )}
          {item.onClick ? (
            <button
              onClick={item.onClick}
              className="flex items-center gap-1.5 text-slate-500 hover:text-teal-600 transition-colors truncate max-w-[150px] sm:max-w-[200px]"
              title={item.label}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
            </button>
          ) : (
            <span
              className="flex items-center gap-1.5 text-slate-700 font-semibold truncate max-w-[150px] sm:max-w-[200px]"
              title={item.label}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

// Helper para criar items de breadcrumb padrão
export const createBreadcrumbItems = (
  currentNav: 'home' | 'strategy' | 'settings',
  objectiveTitle?: string,
  activityId?: string,
  activityTitle?: string,
  onHomeClick?: () => void,
  onObjectiveClick?: () => void,
): BreadcrumbItem[] => {
  const items: BreadcrumbItem[] = [];

  // Home sempre primeiro
  items.push({
    label: 'Início',
    icon: <Home size={12} />,
    onClick: onHomeClick,
  });

  if (currentNav === 'strategy' && objectiveTitle) {
    items.push({
      label: objectiveTitle,
      icon: <Target size={12} />,
      onClick: onObjectiveClick,
    });

    if (activityId && activityTitle) {
      items.push({
        label: `${getActivityDisplayId(activityId)} - ${activityTitle}`,
        icon: <FileText size={12} />,
      });
    }
  } else if (currentNav === 'settings') {
    items.push({
      label: 'Configurações',
    });
  }

  return items;
};




