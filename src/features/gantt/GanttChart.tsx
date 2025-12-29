import React, { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import { Calendar, Download, Maximize2, Minimize2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { Action, Status, GanttRange, RaciRole } from '../../types';
import { parseDateLocal, getTodayStr, formatDateShort, ZOOM_LEVELS } from '../../lib/date';
import { RaciCompactPill } from '../../components/common';
import { Tooltip } from '../../components/common/Tooltip';

const rolePriority: Record<RaciRole, number> = { R: 0, A: 1, C: 2, I: 3 };

interface GanttChartProps {
  actions: Action[];
  ganttRange: GanttRange;
  setGanttRange: (range: GanttRange) => void;
  containerWidth: number;
  statusFilter: Status | 'all';
  setStatusFilter: (filter: Status | 'all') => void;
  onActionClick: (action: Action) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  isMobile?: boolean;
}

export const GanttChart: React.FC<GanttChartProps> = ({
  actions,
  ganttRange,
  setGanttRange,
  containerWidth,
  statusFilter,
  setStatusFilter,
  onActionClick,
  showToast,
  isMobile = false,
}) => {
  const [showLegend, setShowLegend] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const [hoveredAction, setHoveredAction] = useState<{ action: Action; rect: DOMRect } | null>(null);

  const ganttRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleBarMouseEnter = (action: Action, e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredAction({ action, rect });
  };

  const handleBarMouseLeave = () => {
    setHoveredAction(null);
  };

  useEffect(() => {
    const handleScroll = () => { if (hoveredAction) setHoveredAction(null); };
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) scrollContainer.addEventListener('scroll', handleScroll);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      if (scrollContainer) scrollContainer.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [hoveredAction]);

  const filteredActions = useMemo(() => {
    return actions
      .filter(a => statusFilter === 'all' || a.status === statusFilter)
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  }, [actions, statusFilter]);

  // Configuração do Gantt (Lógica Profissional de Zoom e Datas)
  const ganttConfig = useMemo(() => {
    // Se não tiver ações, usa Hoje. Se tiver, usa a primeira data do gráfico.
    const hasActions = filteredActions.length > 0;

    const actionDates = filteredActions.flatMap(a => [
      parseDateLocal(a.startDate),
      parseDateLocal(a.endDate),
      parseDateLocal(a.plannedEndDate)
    ]).filter((d): d is Date => d !== null && !isNaN(d.getTime()));

    let minDate: Date;
    let maxDate: Date;

    if (hasActions && actionDates.length > 0) {
      minDate = new Date(Math.min(...actionDates.map(d => d.getTime())));
      maxDate = new Date(Math.max(...actionDates.map(d => d.getTime())));
    } else {
      // Fallback se não tiver dados
      const now = parseDateLocal(getTodayStr()) || new Date();
      minDate = new Date(now.getFullYear(), 11, 1); // Dez 2025 aprox
      maxDate = new Date(now.getFullYear() + 1, 1, 1); // Fev 2026 aprox
    }

    // Margem de segurança (Buffer)
    const startDate = new Date(minDate);
    startDate.setDate(startDate.getDate() - 15);

    const endDate = new Date(maxDate);
    endDate.setDate(endDate.getDate() + 45);

    const totalDaysInRange = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // LÓGICA DE DENSIDADE (ZOOM)
    const sidebarWidth = 302;
    const availableWidth = Math.max(containerWidth - sidebarWidth, 600);

    let targetDaysInView: number;
    switch (ganttRange) {
      case '30d': targetDaysInView = 30; break;
      case '60d': targetDaysInView = 60; break;
      case '90d': targetDaysInView = 90; break;
      case 'all': targetDaysInView = totalDaysInRange; break;
      default: targetDaysInView = 30;
    }

    let columnWidth = availableWidth / targetDaysInView;

    // Guardrail: Limites Mínimos
    if (ganttRange === 'all') {
      columnWidth = Math.max(columnWidth, 5);
    } else if (ganttRange === '90d') {
      columnWidth = Math.max(columnWidth, 10);
    } else if (ganttRange === '60d') {
      columnWidth = Math.max(columnWidth, 15);
    } else {
      columnWidth = Math.max(columnWidth, 30);
    }

    const totalWidth = totalDaysInRange * columnWidth;

    const days: Date[] = [];
    let curr = new Date(startDate);
    const MAX_DAYS = 365 * 5;
    let count = 0;
    while (curr <= endDate && count < MAX_DAYS) {
      days.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
      count++;
    }

    const months: { date: Date; startIdx: number; count: number }[] = [];
    if (days.length > 0) {
      let currentMonth = days[0].getMonth();
      let currentYear = days[0].getFullYear();
      let startIdx = 0;

      days.forEach((day, i) => {
        if (day.getMonth() !== currentMonth || day.getFullYear() !== currentYear) {
          months.push({ date: new Date(currentYear, currentMonth, 1), startIdx, count: i - startIdx });
          currentMonth = day.getMonth();
          currentYear = day.getFullYear();
          startIdx = i;
        }
      });
      months.push({ date: new Date(currentYear, currentMonth, 1), startIdx, count: days.length - startIdx });
    }

    return { start: startDate, end: endDate, days, months, columnWidth, totalWidth };
  }, [filteredActions, ganttRange, containerWidth]);

  const getPosition = useCallback((date: Date | null) => {
    if (!date) return -1000;
    const diffTime = date.getTime() - ganttConfig.start.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays * ganttConfig.columnWidth;
  }, [ganttConfig]);

  const todayPos = getPosition(parseDateLocal(getTodayStr())) + (ganttConfig.columnWidth / 2);

  // Scroll centralizado
  const scrollToPosition = useCallback((pos: number, smooth = true) => {
    if (!scrollContainerRef.current) return;
    if (pos < 0 || pos > ganttConfig.totalWidth) return;

    const containerW = scrollContainerRef.current.clientWidth - 300;
    const centerOffset = Math.max(0, containerW / 2);
    const target = Math.max(0, pos - centerOffset);

    scrollContainerRef.current.scrollTo({
      left: target,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }, [ganttConfig.totalWidth]);

  useEffect(() => {
    if (!scrollContainerRef.current) return;

    const timer = setTimeout(() => {
      // Prioridade 1: Hoje (se visível dentro das datas do gráfico)
      // Prioridade 2: Primeira tarefa
      const firstTaskStart = actions.length > 0 ? parseDateLocal(actions[0].startDate) : null;

      // Verifica se Hoje está dentro do intervalo visível do gráfico
      const today = new Date();
      const isTodayInRange = today >= ganttConfig.start && today <= ganttConfig.end;

      if (isTodayInRange && todayPos > 0) {
        scrollToPosition(todayPos, true);
      } else if (firstTaskStart) {
        scrollToPosition(getPosition(firstTaskStart), true);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [ganttRange, ganttConfig.start, ganttConfig.end, scrollToPosition, todayPos, actions, getPosition]);

  const exportAsPng = useCallback(async () => {
    if (!ganttRef.current || isExporting) return;

    setIsExporting(true);
    showToast('Gerando imagem...', 'info');

    try {
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(ganttRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const link = document.createElement('a');
      link.download = `gantt-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      showToast('Imagem exportada com sucesso!', 'success');
    } catch (error) {
      showToast('Erro ao exportar imagem', 'error');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, showToast]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const isHeaderHover = target.closest('.gantt-header');

    if (isHeaderHover || e.ctrlKey) {
      e.preventDefault();
      const currentIndex = ZOOM_LEVELS.indexOf(ganttRange);
      if (currentIndex === -1) return;

      if (e.deltaY < 0) {
        const nextIndex = Math.max(0, currentIndex - 1);
        if (nextIndex !== currentIndex) setGanttRange(ZOOM_LEVELS[nextIndex]);
      } else {
        const nextIndex = Math.min(ZOOM_LEVELS.length - 1, currentIndex + 1);
        if (nextIndex !== currentIndex) setGanttRange(ZOOM_LEVELS[nextIndex]);
      }
    }
  }, [ganttRange, setGanttRange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (filteredActions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIdx(prev => Math.min(prev + 1, filteredActions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIdx(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIdx >= 0 && focusedIdx < filteredActions.length) {
          onActionClick(filteredActions[focusedIdx]);
        }
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIdx(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIdx(filteredActions.length - 1);
        break;
    }
  }, [filteredActions, focusedIdx, onActionClick]);

  const renderHeaderLabel = (day: Date, index: number) => {
    const width = ganttConfig.columnWidth;
    if (width < 12) return null;
    if (width < 20) return day.getDate() % 5 === 0 ? day.getDate() : null;
    return day.getDate();
  };

  // Versão mobile simplificada
  if (isMobile) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-full">
        {/* Header mobile */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Cronograma</h3>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as Status | 'all')}
              className="text-xs border border-slate-200 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-700 dark:text-slate-100"
            >
              <option value="all">Todos</option>
              <option value="Não Iniciado">Não Iniciado</option>
              <option value="Em Andamento">Em Andamento</option>
              <option value="Concluído">Concluído</option>
              <option value="Atrasado">Atrasado</option>
            </select>
          </div>
        </div>

        {/* Lista de cards mobile */}
        <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[60vh] overflow-y-auto">
          {filteredActions.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              Nenhuma ação encontrada
            </div>
          ) : (
            filteredActions.map(action => {
              const startDate = parseDateLocal(action.startDate);
              const endDate = parseDateLocal(action.plannedEndDate || action.endDate);
              const orderedRaci = [...action.raci].sort((a, b) => rolePriority[a.role] - rolePriority[b.role]);

              let statusColor = 'bg-slate-100 text-slate-600';
              let statusBorder = 'border-l-slate-400';
              if (action.status === 'Concluído') { statusColor = 'bg-emerald-100 text-emerald-700'; statusBorder = 'border-l-emerald-500'; }
              else if (action.status === 'Em Andamento') { statusColor = 'bg-blue-100 text-blue-700'; statusBorder = 'border-l-blue-500'; }
              else if (action.status === 'Atrasado') { statusColor = 'bg-rose-100 text-rose-700'; statusBorder = 'border-l-rose-500'; }

              return (
                <button
                  key={action.id}
                  onClick={() => onActionClick(action)}
                  className={`w-full text-left p-4 hover:bg-slate-50 transition-colors border-l-4 ${statusBorder}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[11px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{action.id}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${statusColor}`}>
                          {action.status}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-700 line-clamp-2">{action.title}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-teal-600">{action.progress}%</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all ${action.status === 'Concluído' ? 'bg-emerald-500' :
                        action.status === 'Atrasado' ? 'bg-rose-500' :
                          action.status === 'Em Andamento' ? 'bg-blue-500' : 'bg-slate-400'
                        }`}
                      style={{ width: `${action.progress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDateShort(startDate)} → {formatDateShort(endDate)}
                    </span>
                    <div className="flex gap-1">
                      {orderedRaci.slice(0, 2).map((r, i) => (
                        <RaciCompactPill key={i} person={r} />
                      ))}
                      {orderedRaci.length > 2 && (
                        <span className="text-slate-400">+{orderedRaci.length - 2}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // Versão desktop completa
  return (
    <>
      <div
        className={`flex flex-col bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-all ${isFullscreen ? 'fixed inset-4 z-50' : 'h-full'}`}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        ref={ganttRef}
      >
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex flex-col gap-2 bg-slate-50/50 dark:bg-slate-700/50 shrink-0">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Cronograma</h3>
              <span className="text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-600 px-2 py-0.5 rounded hidden sm:inline">↑↓ Navegar • Enter Editar</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Filtro de Status */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as Status | 'all')}
                className="text-[11px] border border-slate-200 dark:border-slate-600 rounded px-2 py-1.5 bg-white dark:bg-slate-700 dark:text-slate-100 font-medium"
                aria-label="Filtrar por status"
              >
                <option value="all">Todos Status</option>
                <option value="Não Iniciado">Não Iniciado</option>
                <option value="Em Andamento">Em Andamento</option>
                <option value="Concluído">Concluído</option>
                <option value="Atrasado">Atrasado</option>
              </select>

              {/* Zoom */}
              <div className="flex bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md p-0.5 shadow-sm" role="tablist">
                {(ZOOM_LEVELS).map(r => (
                  <button
                    key={r}
                    onClick={() => setGanttRange(r)}
                    role="tab"
                    aria-selected={ganttRange === r}
                    className={`px-3 py-1.5 text-[11px] font-bold rounded transition-all ${ganttRange === r ? 'bg-slate-800 dark:bg-slate-500 text-white' : 'text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'}`}
                  >
                    {r === 'all' ? 'Ver Tudo' : r === '30d' ? '30 Dias' : r === '60d' ? '60 Dias' : '90 Dias'}
                  </button>
                ))}
              </div>

              {/* Ações */}
              <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                <Tooltip content="Exportar como PNG">
                  <button
                    onClick={exportAsPng}
                    disabled={isExporting}
                    className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors disabled:opacity-50"
                    aria-label="Exportar cronograma"
                  >
                    <Download size={16} />
                  </button>
                </Tooltip>
                <Tooltip content={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}>
                  <button
                    onClick={() => setIsFullscreen(prev => !prev)}
                    className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                    aria-label={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
                  >
                    {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* Legenda */}
          {showLegend && (
            <div className="flex flex-wrap items-center gap-3 text-[11px] pt-2 border-t border-slate-100 dark:border-slate-600">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Legenda:</span>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-500"></div>
                <span className="text-slate-600 dark:text-slate-300">Concluído</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-blue-500"></div>
                <span className="text-slate-600">Em Andamento</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-slate-500"></div>
                <span className="text-slate-600">Não Iniciado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-rose-500"></div>
                <span className="text-slate-600">Atrasado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-orange-500"></div>
                <span className="text-slate-600">Desvio</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-slate-600">Hoje</span>
              </div>
              <button
                onClick={() => setShowLegend(false)}
                className="ml-auto text-slate-400 hover:text-slate-600 text-[11px]"
              >
                Ocultar
              </button>
            </div>
          )}
          {!showLegend && (
            <button
              onClick={() => setShowLegend(true)}
              className="text-[11px] text-teal-600 hover:underline self-start"
            >
              Mostrar legenda
            </button>
          )}
        </div>

        {/* Chart */}
        <div className="flex-1 relative overflow-x-auto" ref={scrollContainerRef} style={{ overflow: 'visible auto' }}>
          <div className="min-w-fit relative" style={{ overflow: 'visible' }}>
            {/* Header Row */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 h-16 bg-white dark:bg-slate-800 sticky top-0 z-40 w-full gantt-header">
              <div className="sticky left-0 z-50 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 w-[300px] shrink-0 px-4 flex items-center text-[11px] font-bold text-slate-400 uppercase shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                Atividade
              </div>
              <div className="relative h-full flex flex-col" style={{ width: ganttConfig.totalWidth }}>
                <div className="h-8 relative border-b border-slate-100 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-700/50">
                  {ganttConfig.months.map((month, i) => {
                    const label = month.date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
                    const isLongMonth = month.count * ganttConfig.columnWidth > 80;
                    return (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 border-r border-slate-200 dark:border-slate-600 flex items-center pl-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase whitespace-nowrap overflow-hidden"
                        style={{ left: month.startIdx * ganttConfig.columnWidth, width: month.count * ganttConfig.columnWidth }}
                        title={label}
                      >
                        <span className="truncate">{isLongMonth ? label : label.split(' ')[0]}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="h-8 relative">
                  {ganttConfig.days.map((day, i) => {
                    const todayDate = parseDateLocal(getTodayStr());
                    const isToday = todayDate && day.getTime() === todayDate.getTime();
                    return (
                      <div
                        key={i}
                        className={`absolute top-0 bottom-0 border-r border-slate-100 dark:border-slate-700/50 flex flex-col justify-center items-center ${isToday ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
                        style={{ left: i * ganttConfig.columnWidth, width: ganttConfig.columnWidth }}
                      >
                        <span className={`text-[11px] ${isToday ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
                          {renderHeaderLabel(day, i)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Body Rows */}
            <div className="relative" style={{ overflow: 'visible' }}>
              <div className="absolute top-0 bottom-0 left-[300px] pointer-events-none z-0" style={{ width: ganttConfig.totalWidth }}>
                {ganttConfig.months.map((month, i) => (
                  <div
                    key={`m-${i}`}
                    className={`absolute top-0 bottom-0 ${i % 2 === 0 ? 'bg-slate-50/40 dark:bg-slate-700/30' : 'bg-white dark:bg-slate-800/50'}`}
                    style={{ left: month.startIdx * ganttConfig.columnWidth, width: month.count * ganttConfig.columnWidth }}
                  />
                ))}
                {ganttConfig.days.map((day, i) => {
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  return (
                    <div
                      key={i}
                      className={`absolute top-0 bottom-0 border-r border-slate-100/60 dark:border-slate-700/30 ${isWeekend ? 'bg-slate-50/50 dark:bg-slate-600/20' : ''}`}
                      style={{ left: i * ganttConfig.columnWidth, width: ganttConfig.columnWidth }}
                    />
                  );
                })}
                {/* Linha do HOJE */}
                {todayPos >= 0 && todayPos <= ganttConfig.totalWidth && (
                  <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-[100] pointer-events-none" style={{ left: todayPos }}>
                    <div className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded absolute -top-0 left-1 shadow-md whitespace-nowrap">
                      📍 Hoje
                    </div>
                  </div>
                )}
              </div>

              {/* Renderização das ações */}
              {filteredActions.map((action, idx) => {
                const orderedRaci = [...action.raci].sort((a, b) => rolePriority[a.role] - rolePriority[b.role]);
                const extraRaci = orderedRaci.slice(2);
                const extraTitle = extraRaci.map(r => `${r.role}: ${r.name}`).join(', ');
                const startDate = parseDateLocal(action.startDate);
                // Datas principais
                const plannedEnd = parseDateLocal(action.plannedEndDate);
                const actualEnd = parseDateLocal(action.endDate);
                const effectivePlanned = plannedEnd || actualEnd; // fallback para largura da barra

                const leftStart = getPosition(startDate);
                const plannedWidth = effectivePlanned && startDate
                  ? getPosition(effectivePlanned) - getPosition(startDate) + ganttConfig.columnWidth
                  : 0;

                const isLate = actualEnd && plannedEnd && actualEnd > plannedEnd;
                const isEarly = actualEnd && plannedEnd && actualEnd < plannedEnd && (action.status === 'Concluído' || action.progress === 100);
                const isDeviation = isLate || isEarly;

                let deviationBar = null;
                if (isLate && plannedEnd && actualEnd) {
                  const widthLate = Math.max(48, getPosition(actualEnd) - getPosition(plannedEnd));
                  const daysDiff = Math.max(1, Math.round((actualEnd.getTime() - plannedEnd.getTime()) / (1000 * 60 * 60 * 24)));
                  deviationBar = (
                    <div
                      className="absolute top-0 bottom-0 bg-orange-500 rounded-r-md shadow-sm z-20 flex items-center justify-center overflow-hidden"
                      style={{ left: '100%', width: widthLate, minWidth: 48 }}
                      title={`Atraso: ${daysDiff} dias`}
                    >
                      <span className="text-[10px] font-bold text-white drop-shadow-sm px-1 w-full text-center whitespace-nowrap">+{daysDiff}d</span>
                    </div>
                  );
                } else if (isEarly && plannedEnd && actualEnd) {
                  const widthSaved = Math.max(48, getPosition(plannedEnd) - getPosition(actualEnd));
                  const daysDiff = Math.max(1, Math.round((plannedEnd.getTime() - actualEnd.getTime()) / (1000 * 60 * 60 * 24)));
                  deviationBar = (
                    <div
                      className="absolute top-0 bottom-0 bg-orange-300/40 border-l-2 border-orange-400 z-20 flex items-center justify-center overflow-hidden stripe-bg"
                      style={{
                        right: 0,
                        width: widthSaved,
                        minWidth: 48,
                        backgroundImage: 'repeating-linear-gradient(45deg, rgba(251, 146, 60, 0.3), rgba(251, 146, 60, 0.3) 10px, rgba(255, 255, 255, 0.2) 10px, rgba(255, 255, 255, 0.2) 20px)'
                      }}
                      title={`Economia: ${daysDiff} dias`}
                    >
                      <span className="text-[10px] font-bold text-orange-700 bg-white/50 px-1 rounded-sm w-full text-center whitespace-nowrap shadow-sm">−{daysDiff}d</span>
                    </div>
                  );
                }

                let barColor = "bg-slate-500";
                let statusBorder = "#64748b";
                let statusBadge = { bg: 'bg-slate-100', text: 'text-slate-600' };
                if (action.status === 'Concluído') {
                  barColor = "bg-emerald-500";
                  statusBorder = "#10b981";
                  statusBadge = { bg: 'bg-emerald-100', text: 'text-emerald-700' };
                }
                else if (action.status === 'Em Andamento') {
                  barColor = "bg-blue-500";
                  statusBorder = "#3b82f6";
                  statusBadge = { bg: 'bg-blue-100', text: 'text-blue-700' };
                }
                else if (action.status === 'Atrasado') {
                  barColor = "bg-rose-500";
                  statusBorder = "#f43f5e";
                  statusBadge = { bg: 'bg-rose-100', text: 'text-rose-700' };
                }

                const isFocused = focusedIdx === idx;

                return (
                  <div
                    key={action.id}
                    className={`flex h-auto min-h-[4.5rem] border-b border-slate-100 dark:border-slate-700/50 relative hover:bg-slate-50/50 dark:hover:bg-slate-700/30 group ${isFocused ? 'bg-blue-50/50 dark:bg-blue-900/20 ring-2 ring-blue-300 dark:ring-blue-600 ring-inset' : ''}`}
                    style={{ overflow: 'visible' }}
                  >
                    {/* Card da ação */}
                    <div className="sticky left-0 z-30 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 w-[300px] shrink-0 px-2 py-2 flex flex-col justify-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      <div
                        className="bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm p-2.5 h-full flex flex-col justify-center relative overflow-hidden border-l-4 cursor-pointer hover:shadow-md transition-shadow"
                        style={{ borderLeftColor: statusBorder }}
                        onClick={() => scrollToPosition(leftStart)}
                        tabIndex={0}
                        role="button"
                        aria-label={`Focar barra da ação ${action.title}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-300 rounded px-1.5 py-0.5 text-[10px] font-mono border border-slate-200 dark:border-slate-500">{action.id}</span>
                            {/* Badge de status */}
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${statusBadge.bg} ${statusBadge.text}`}>
                              {action.status}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-tight mb-2 line-clamp-2" title={action.title}>
                            {action.title}
                          </div>
                          <div className="flex items-end justify-between gap-1 mt-auto">
                            <div className="flex flex-col gap-0.5 text-[11px] text-slate-400">
                              <span className="flex items-center gap-1 leading-none"><Calendar size={11} /> {formatDateShort(plannedEnd)}</span>
                              {actualEnd && (
                                <span className={`leading-none ${isDeviation ? "text-orange-600 font-bold" : "text-slate-500"}`}>
                                  Real: {formatDateShort(actualEnd)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 overflow-hidden justify-end max-w-[120px] flex-wrap">
                              {orderedRaci.slice(0, 2).map((r, i) => (
                                <RaciCompactPill key={i} person={r} />
                              ))}
                              {action.raci.length > 2 && (
                                <span className="text-[10px] text-slate-400" title={extraTitle}>
                                  +{action.raci.length - 2}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="relative" style={{ width: ganttConfig.totalWidth, overflow: 'visible' }}>
                      {/* Linha de conexão */}
                      {startDate && leftStart > 0 && (
                        <div
                          className="absolute top-1/2 -translate-y-1/2 h-px border-t border-dashed border-slate-300 dark:border-slate-600"
                          style={{ left: 0, width: Math.max(0, leftStart) }}
                        />
                      )}

                      {/* Barra */}
                      {startDate && effectivePlanned && plannedWidth > 0 && (
                        <div
                          className={`absolute top-1/2 -translate-y-1/2 h-6 rounded-md shadow-sm border cursor-pointer hover:brightness-110 hover:shadow-md transition-all group/bar ${action.status === 'Concluído' ? 'bg-emerald-200 dark:bg-emerald-900/70 border-emerald-300 dark:border-emerald-700' :
                            action.status === 'Em Andamento' ? 'bg-blue-500 dark:bg-blue-600 border-blue-600 dark:border-blue-500' :
                              action.status === 'Atrasado' ? 'bg-rose-200 dark:bg-rose-900/70 border-rose-300 dark:border-rose-700' :
                                'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600'
                            }`}
                          style={{
                            left: leftStart,
                            width: Math.max(plannedWidth, ganttConfig.columnWidth * 0.6),
                          }}
                          onClick={() => onActionClick(action)}
                          onMouseEnter={(e) => handleBarMouseEnter(action, e)}
                          onMouseLeave={handleBarMouseLeave}
                          role="button"
                          aria-label={`Editar ação ${action.title}`}
                          tabIndex={0}
                        >
                          {/* Progress bar */}
                          <div
                            className={`h-full rounded-l-md ${isLate ? 'rounded-r-none' : 'rounded-r-md'} ${barColor} relative overflow-hidden transition-all duration-500 ease-out`}
                            style={{
                              width: isEarly && actualEnd && startDate
                                ? (getPosition(actualEnd) - getPosition(startDate) + ganttConfig.columnWidth)
                                : (isLate ? '100%' : `${Math.max(action.progress, 5)}%`),
                              backgroundColor: action.status === 'Em Andamento' ? '#1d4ed8' : undefined
                            }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
                            {action.status === 'Em Andamento' && action.progress > 0 && action.progress < 100 && (
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                            )}
                          </div>
                          {deviationBar}

                          {/* % dentro da barra */}
                          {plannedWidth > 60 && (
                            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/80 pointer-events-none">
                              {action.progress}%
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tooltip Fixo (Portal) */}
        {hoveredAction && (
          <div
            className="fixed z-[100] bg-slate-800 text-white text-[10px] p-2.5 rounded-lg shadow-xl pointer-events-none min-w-[180px] max-w-[220px] whitespace-normal animate-in fade-in duration-150"
            style={{
              top: hoveredAction.rect.top < 150 ? hoveredAction.rect.bottom + 8 : hoveredAction.rect.top - 8,
              left: hoveredAction.rect.left + (hoveredAction.rect.width / 2),
              transform: `translateX(-20%) ${hoveredAction.rect.top < 150 ? '' : 'translateY(-100%)'}`
            }}
          >
            <div className="font-bold mb-1.5 text-[11px] border-b border-slate-600 pb-1 truncate">{hoveredAction.action.title}</div>
            <div className="space-y-1">
              <div className="flex justify-between gap-4"><span className="text-slate-400">Progresso:</span><span className="font-bold text-emerald-400">{hoveredAction.action.progress}%</span></div>
              <div className="flex justify-between gap-4"><span className="text-slate-400">Início:</span><span>{formatDateShort(parseDateLocal(hoveredAction.action.startDate))}</span></div>
              <div className="flex justify-between gap-4"><span className="text-slate-400">Término:</span><span>{formatDateShort(parseDateLocal(hoveredAction.action.plannedEndDate))}</span></div>
              <div className="flex justify-between gap-4"><span className="text-slate-400">Status:</span><span className={
                hoveredAction.action.status === 'Concluído' ? 'text-emerald-400' :
                  hoveredAction.action.status === 'Atrasado' ? 'text-rose-400' :
                    hoveredAction.action.status === 'Em Andamento' ? 'text-blue-400' : ''
              }>{hoveredAction.action.status}</span></div>

              {hoveredAction.action.raci && hoveredAction.action.raci.length > 0 && (
                <div className="flex justify-between gap-4 pt-1 border-t border-slate-600">
                  <span className="text-slate-400">Resp.:</span>
                  <span className="truncate">{hoveredAction.action.raci[0]?.name || '-'}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
