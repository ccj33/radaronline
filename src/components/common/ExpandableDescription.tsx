import React, { useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';

interface ExpandableDescriptionProps {
  text: string;
}

export const ExpandableDescription: React.FC<ExpandableDescriptionProps> = ({ text }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text) return null;

  const isLong = text.length > 150;

  return (
    <div className="flex gap-3 mb-6 px-1 animate-fade-in group">
      <div className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 transition-colors group-hover:bg-blue-100">
        <Info size={16} />
      </div>

      <div className="flex-1 min-w-0 pt-1">
        <div className={`text-slate-600 text-sm leading-relaxed ${!isExpanded && isLong ? "line-clamp-2" : ""}`}>
          <span className="font-semibold text-slate-900 mr-2">Sobre esta atividade:</span>
          {text}
        </div>

        {isLong && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-600 text-xs font-bold mt-1.5 flex items-center gap-1 hover:text-blue-700 transition-colors p-1 -ml-1 rounded hover:bg-blue-50 w-fit"
          >
            {isExpanded ? "Mostrar menos" : "Mostrar mais"}
            <ChevronDown size={12} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
    </div>
  );
};
