import { useMemo, useState, useEffect } from 'react';
import {
  ChevronRight,
  MapPin,
  X,
  Target,
  AlertOctagon,
  Maximize2
} from 'lucide-react';
import { Action } from '../../../types';
import { MICROREGIOES, getMacrorregioes, Microrregiao, MACRORREGIOES } from '../../../data/microregioes';

interface MacroRegionMapProps {
  actions: Action[];
  onViewMicrorregiao: (microId: string) => void;
  selectedMacroId?: string | null;
  onRegionChange?: (macroId: string | null) => void;
}

interface MicroStats {
  micro: Microrregiao;
  totalAcoes: number;
  concluidas: number;
  andamento: number;
  atrasadas: number;
  progressoMedio: number;
  taxaConclusao: number;
}

interface MacroStats {
  nome: string;
  micros: MicroStats[];
  totalAcoes: number;
  atrasadas: number;
  taxaGlobal: number;
  status: 'otimo' | 'bom' | 'atencao' | 'critico' | 'sem_dados';
}

// =====================================================
// 16 MACRORREGIÕES OFICIAIS DE MINAS GERAIS
// Baseado na imagem oficial (Imprensa MG) e microregioes.ts
// Paths SVG redesenhados para aproximar geografia real
// =====================================================
const MAP_REGIONS = [
  // LINHA SUPERIOR (Topo do estado)
  {
    id: 'noroeste',
    systemName: 'Noroeste', // MAC09
    name: 'Noroeste',
    path: 'M 100,80 L 160,60 L 200,80 L 220,130 L 180,160 L 130,140 L 100,100 Z',
    labelX: 155, labelY: 110
  },
  {
    id: 'norte',
    systemName: 'Norte', // MAC08
    name: 'Norte',
    path: 'M 200,80 L 280,50 L 340,70 L 360,130 L 310,160 L 220,130 Z',
    labelX: 280, labelY: 105
  },
  {
    id: 'jequitinhonha',
    systemName: 'Jequitinhonha', // MAC04
    name: 'Jequitinhonha',
    path: 'M 310,160 L 360,130 L 400,150 L 390,200 L 340,210 L 300,190 Z',
    labelX: 350, labelY: 175
  },
  {
    id: 'nordeste',
    systemName: 'Nordeste', // MAC11
    name: 'Nordeste',
    path: 'M 340,70 L 420,60 L 460,100 L 450,160 L 400,150 L 360,130 Z',
    labelX: 405, labelY: 110
  },

  // SEGUNDA LINHA (Triângulos + Centro-Norte)
  {
    id: 'triangulo_norte',
    systemName: 'Triângulo do Norte', // MAC13
    name: 'Triângulo Norte',
    path: 'M 20,160 L 80,140 L 130,160 L 130,210 L 80,230 L 30,200 Z',
    labelX: 75, labelY: 185
  },
  {
    id: 'triangulo_sul',
    systemName: 'Triângulo do Sul', // MAC12
    name: 'Triângulo Sul',
    path: 'M 30,200 L 80,230 L 130,210 L 150,260 L 100,300 L 40,270 Z',
    labelX: 90, labelY: 250
  },

  // TERCEIRA LINHA (Centro do estado)
  {
    id: 'oeste',
    systemName: 'Oeste', // MAC05
    name: 'Oeste',
    path: 'M 130,210 L 180,160 L 220,180 L 230,240 L 180,280 L 130,260 Z',
    labelX: 175, labelY: 225
  },
  {
    id: 'centro',
    systemName: 'Centro', // MAC03
    name: 'Centro',
    path: 'M 220,180 L 300,190 L 320,240 L 290,290 L 230,280 L 220,240 Z',
    labelX: 265, labelY: 235
  },
  {
    id: 'leste',
    systemName: 'Leste', // MAC06
    name: 'Leste',
    path: 'M 340,210 L 390,200 L 430,230 L 410,280 L 360,270 L 340,250 Z',
    labelX: 380, labelY: 245
  },
  {
    id: 'vale_aco',
    systemName: 'Vale do Aço', // MAC14
    name: 'Vale do Aço',
    path: 'M 300,190 L 340,210 L 340,250 L 320,260 L 300,250 L 290,220 Z',
    labelX: 315, labelY: 225
  },

  // QUARTA LINHA (Sul-Centro)
  {
    id: 'sudoeste',
    systemName: 'Sudoeste', // MAC16
    name: 'Sudoeste',
    path: 'M 100,300 L 150,260 L 180,280 L 180,330 L 140,360 L 100,340 Z',
    labelX: 140, labelY: 315
  },
  {
    id: 'sul',
    systemName: 'Sul', // MAC01
    name: 'Sul',
    path: 'M 180,330 L 230,280 L 270,310 L 260,370 L 200,400 L 160,380 Z',
    labelX: 215, labelY: 345
  },
  {
    id: 'centro_sul',
    systemName: 'Centro Sul', // MAC02
    name: 'Centro Sul',
    path: 'M 230,280 L 290,290 L 310,340 L 280,370 L 240,360 L 230,320 Z',
    labelX: 265, labelY: 325
  },
  {
    id: 'sudeste',
    systemName: 'Sudeste', // MAC07
    name: 'Sudeste',
    path: 'M 290,290 L 340,270 L 380,300 L 370,360 L 310,380 L 280,350 Z',
    labelX: 330, labelY: 330
  },
  {
    id: 'leste_sul',
    systemName: 'Leste do Sul', // MAC10
    name: 'Leste do Sul',
    path: 'M 360,270 L 410,280 L 420,330 L 390,360 L 360,350 L 350,310 Z',
    labelX: 385, labelY: 315
  },
  {
    id: 'extremo_sul',
    systemName: 'Extremo Sul', // MAC15
    name: 'Extremo Sul',
    path: 'M 200,400 L 260,370 L 310,390 L 300,440 L 240,450 L 190,430 Z',
    labelX: 250, labelY: 415
  }
];

export function MacroRegionMap({ actions, onViewMicrorregiao, selectedMacroId, onRegionChange }: MacroRegionMapProps) {
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);

  // Sync with external filter
  useEffect(() => {
    if (selectedMacroId) {
      const macro = MACRORREGIOES.find(m => m.id === selectedMacroId);
      if (macro) {
        // Robust case insensitive match
        const region = MAP_REGIONS.find(r =>
          r.systemName.toLowerCase().trim() === macro.nome.toLowerCase().trim()
        );
        if (region) {
          setSelectedRegionId(region.id);
        }
      }
    } else {
      setSelectedRegionId(null);
    }
  }, [selectedMacroId]);

  const handleRegionClick = (regionId: string) => {
    const region = MAP_REGIONS.find(r => r.id === regionId);
    if (region && onRegionChange) {
      const macro = MACRORREGIOES.find(m => m.nome.toLowerCase().trim() === region.systemName.toLowerCase().trim());
      if (macro) {
        onRegionChange(macro.id);
      }
    }
    // Also update internal state immediately for responsiveness
    setSelectedRegionId(regionId);
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRegionId(null);
    if (onRegionChange) {
      onRegionChange(null);
    }
  };

  // Calcular estatísticas reais do sistema
  const statsMap = useMemo(() => {
    const map = new Map<string, MacroStats>();
    const macrorregioes = getMacrorregioes();

    macrorregioes.forEach(macroName => {
      const micros = MICROREGIOES.filter(m => m.macrorregiao === macroName);

      const microsStats: MicroStats[] = micros.map(micro => {
        const microAcoes = actions.filter(a => a.microregiaoId === micro.id);
        const concluidas = microAcoes.filter(a => a.status === 'Concluído').length;
        const andamento = microAcoes.filter(a => a.status === 'Em Andamento').length;
        const atrasadas = microAcoes.filter(a => {
          if (a.status === 'Concluído') return false;
          const prazo = new Date(a.plannedEndDate);
          return prazo < new Date();
        }).length;
        const progressoMedio = microAcoes.length > 0
          ? Math.round(microAcoes.reduce((sum, a) => sum + a.progress, 0) / microAcoes.length)
          : 0;
        const taxaConclusao = microAcoes.length > 0
          ? Math.round((concluidas / microAcoes.length) * 100)
          : 0;

        return {
          micro,
          totalAcoes: microAcoes.length,
          concluidas,
          andamento,
          atrasadas,
          progressoMedio,
          taxaConclusao,
        };
      });

      const totalAcoes = microsStats.reduce((sum, m) => sum + m.totalAcoes, 0);
      const atrasadas = microsStats.reduce((sum, m) => sum + m.atrasadas, 0);
      const taxaGlobal = microsStats.length > 0
        ? Math.round(microsStats.reduce((sum, m) => sum + m.taxaConclusao, 0) / micros.length)
        : 0;

      let status: MacroStats['status'] = 'sem_dados';
      if (totalAcoes > 0) {
        if (atrasadas > 5) status = 'critico';
        else if (taxaGlobal < 30) status = 'atencao';
        else if (taxaGlobal < 60) status = 'bom';
        else status = 'otimo';
      }

      map.set(macroName, {
        nome: macroName,
        micros: microsStats,
        totalAcoes,
        atrasadas,
        taxaGlobal,
        status
      });
    });
    return map;
  }, [actions]);

  const getStatusColorClass = (status?: MacroStats['status']) => {
    switch (status) {
      case 'otimo': return 'fill-emerald-600 dark:fill-emerald-700';
      case 'bom': return 'fill-blue-600 dark:fill-blue-700';
      case 'atencao': return 'fill-amber-600 dark:fill-amber-700';
      case 'critico': return 'fill-rose-600 dark:fill-rose-700';
      default: return 'fill-slate-400 dark:fill-slate-600';
    }
  };

  const selectedRegionConfig = MAP_REGIONS.find(r => r.id === selectedRegionId);
  const selectedStats = selectedRegionConfig ? statsMap.get(selectedRegionConfig.systemName) : null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 transition-colors">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            Mapa Estratégico de MG
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">16 Macrorregiões de Saúde</p>
        </div>
        <div className="flex flex-wrap gap-3 text-[11px] font-medium text-slate-600 dark:text-slate-300 hidden sm:flex">
          <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/50">
            <div className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-500"></div>
            <span>Ótimo <span className="text-emerald-700 dark:text-emerald-400 font-bold">≥60%</span></span>
          </div>
          <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full border border-blue-200 dark:border-blue-800/50">
            <div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-500"></div>
            <span>Bom <span className="text-blue-700 dark:text-blue-400 font-bold">30-60%</span></span>
          </div>
          <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full border border-amber-200 dark:border-amber-800/50">
            <div className="w-2 h-2 rounded-full bg-amber-600 dark:bg-amber-500"></div>
            <span>Atenção <span className="text-amber-700 dark:text-amber-400 font-bold">&lt;30%</span></span>
          </div>
          <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-full border border-rose-200 dark:border-rose-800/50">
            <div className="w-2 h-2 rounded-full bg-rose-600 dark:bg-rose-500"></div>
            <span>Crítico <span className="text-rose-700 dark:text-rose-400 font-bold">&gt;5 atrasos</span></span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-auto lg:h-[550px]">
        {/* MAPA SVG (2/3) */}
        <div className="lg:col-span-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 relative overflow-hidden flex items-center justify-center p-4">

          {/* Botão Reset */}
          {selectedRegionId && (
            <button
              onClick={clearSelection}
              className="absolute top-4 right-4 z-20 p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              title="Restaurar visão completa"
            >
              <Maximize2 className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </button>
          )}

          {/* SVG */}
          <svg
            viewBox="0 0 480 480"
            className="w-full h-full max-h-[500px] transition-all duration-700 ease-in-out"
            style={{ filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.05))' }}
          >
            {MAP_REGIONS.map((region) => {
              const isSelected = selectedRegionId === region.id;
              const isHovered = hoveredRegionId === region.id;
              const isDimmed = selectedRegionId && !isSelected;

              return (
                <g key={region.id}>
                  <path
                    d={region.path}
                    id={region.id}
                    onClick={() => handleRegionClick(region.id)}
                    onMouseEnter={() => setHoveredRegionId(region.id)}
                    onMouseLeave={() => setHoveredRegionId(null)}
                    strokeWidth={isSelected ? 3 : 1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`
                        cursor-pointer transition-all duration-300 ease-out
                        ${getStatusColorClass(statsMap.get(region.systemName)?.status)}
                        ${isSelected
                        ? 'stroke-slate-800 dark:stroke-slate-100 opacity-100 z-30 scale-[1.02]'
                        : `stroke-white dark:stroke-slate-700 ${isHovered
                          ? 'opacity-95 z-20 brightness-95'
                          : isDimmed
                            ? 'opacity-40 grayscale-[0.5]'
                            : 'opacity-100'}`
                      }
                      `}
                    style={{
                      transformOrigin: 'center',
                      transformBox: 'fill-box',
                    }}
                  />

                  {/* LABEL INTERNO NO MAPA */}
                  <text
                    x={region.labelX}
                    y={region.labelY}
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    className={`
                            text-[8px] font-bold uppercase tracking-tight pointer-events-none select-none
                            transition-opacity duration-300
                            ${(isDimmed && !isHovered) ? 'opacity-0' : 'opacity-100'}
                            ${(isHovered || isSelected) ? 'text-[9px]' : ''}
                            fill-slate-800 dark:fill-slate-100
                            stroke-white dark:stroke-slate-900
                        `}
                    style={{
                      fontFamily: 'Inter, system-ui, sans-serif',
                      paintOrder: 'stroke',
                      strokeWidth: '3px',
                      strokeLinecap: 'round',
                      strokeLinejoin: 'round',
                    }}
                  >
                    {region.name.split(' ').map((word, i) => (
                      <tspan x={region.labelX} dy={i === 0 ? 0 : 9} key={i}>
                        {word}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Instrução Flutuante */}
          {!selectedRegionId && (
            <div className="absolute bottom-4 pointer-events-none">
              <span className="bg-white/90 dark:bg-slate-800/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-medium text-slate-500 dark:text-slate-400 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                <MapPin className="w-3 h-3" /> Clique em uma região para detalhes
              </span>
            </div>
          )}
        </div>

        {/* PAINEL LATERAL (1/3) */}
        <div className="lg:col-span-1 h-full min-h-[400px]">
          {selectedStats ? (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm h-full flex flex-col animate-in slide-in-from-right duration-300">
              {/* Header do Painel */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-700/30">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-lg leading-tight">{selectedRegionConfig?.name}</h4>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Macro: {selectedStats.nome}</span>
                  </div>
                  <button
                    onClick={clearSelection}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex gap-3 text-xs mt-2">
                  <span className="bg-slate-200/50 px-2 py-1 rounded text-slate-600 font-medium flex items-center gap-1">
                    <Target className="w-3 h-3" /> {selectedStats.totalAcoes} ações
                  </span>
                  {selectedStats.atrasadas > 0 && (
                    <span className="bg-rose-100 px-2 py-1 rounded text-rose-700 font-medium flex items-center gap-1">
                      <AlertOctagon className="w-3 h-3" /> {selectedStats.atrasadas} críticas
                    </span>
                  )}
                </div>
              </div>

              {/* Lista de Microrregiões */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                {selectedStats.micros.length > 0 ? (
                  selectedStats.micros.map((micro) => (
                    <div
                      key={micro.micro.id}
                      className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-teal-400 dark:hover:border-teal-500 hover:shadow-md transition-all group cursor-pointer"
                      onClick={() => onViewMicrorregiao(micro.micro.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-slate-700 dark:text-slate-200 text-sm">{micro.micro.nome}</h5>
                        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors" />
                      </div>

                      <div className="space-y-2">
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${micro.taxaConclusao >= 75 ? 'bg-emerald-500' :
                              micro.taxaConclusao >= 40 ? 'bg-blue-500' :
                                'bg-amber-500'
                              }`}
                            style={{ width: `${micro.taxaConclusao}%` }}
                          />
                        </div>

                        <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          <span>{micro.taxaConclusao}% concluído</span>
                          {micro.atrasadas > 0 && (
                            <span className="text-rose-600 dark:text-rose-400">{micro.atrasadas} em atraso</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
                    Nenhuma microrregião nesta área.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <MapPin className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="font-medium text-slate-600 dark:text-slate-400">Selecione uma região</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[200px]">
                Clique no mapa para ver as microrregiões
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
