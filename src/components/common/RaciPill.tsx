import React from 'react';
import { X } from 'lucide-react';
import { RaciMember } from '../../types';
import { getInitials } from '../../lib/text';

// Cores vibrantes consistentes com o modal
const RACI_COLORS = {
  R: { bg: "bg-purple-600", text: "text-purple-800", border: "border-purple-200", label: "Responsável" },
  A: { bg: "bg-blue-600", text: "text-blue-800", border: "border-blue-200", label: "Aprovador" },
  C: { bg: "bg-emerald-600", text: "text-emerald-800", border: "border-emerald-200", label: "Consultado" },
  I: { bg: "bg-amber-500", text: "text-amber-800", border: "border-amber-200", label: "Informado" },
};

interface RaciCompactPillProps {
  person: RaciMember;
}

/**
 * Visualização compacta de membro RACI - Avatar circular com badge de role
 */
export const RaciCompactPill: React.FC<RaciCompactPillProps> = ({ person }) => {
  const colors = RACI_COLORS[person.role] || RACI_COLORS.I;
  const initials = getInitials(person.name);

  return (
    <div
      className="relative group shrink-0"
      title={`${person.name} (${colors.label})`}
    >
      {/* Avatar circular */}
      <div
        className={`w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-[9px] font-bold shadow-sm ${colors.bg}`}
      >
        {initials}
      </div>
      {/* Badge de role */}
      <div
        className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border border-white text-[6px] font-bold flex items-center justify-center ${colors.bg} text-white`}
      >
        {person.role}
      </div>
    </div>
  );
};

interface RaciTagProps {
  person: RaciMember;
  onRemove?: () => void;
}

/**
 * Tag de RACI com opção de remoção
 */
export const RaciTag: React.FC<RaciTagProps> = ({ person, onRemove }) => {
  const colors = RACI_COLORS[person.role] || RACI_COLORS.I;

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium bg-white ${colors.border}`}>
      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold ${colors.bg}`}>
        {person.role}
      </div>
      <span className={`${colors.text} font-semibold`}>{person.name}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label={`Remover ${person.name || 'membro'}`}
          className="ml-0.5 text-slate-400 hover:text-red-600 opacity-60 hover:opacity-100 transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};
