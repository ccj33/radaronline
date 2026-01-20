import React, { useMemo, useState, useEffect } from 'react';
import { format, differenceInDays, isToday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { Action, Activity, Objective } from '../../../types';
import { MICROREGIOES } from '../../../data/microregioes';
import { getActionDisplayId } from '../../../lib/text';
import { filterOrphanedActions, hasValidDate, createActivityToObjectiveMap } from '../../../lib/actionValidation';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ZoomIn, ZoomOut, Target, X, AlertCircle, CalendarDays, Clock, ArrowRight } from 'lucide-react';

interface LinearCalendarProps {
    actions: Action[];
    activities: Record<number, Activity[]>;
    objectives: Objective[];
    microId?: string | null;
}

// Objective colors matching the project theme
const OBJECTIVE_COLORS: Record<number, { bg: string; border: string; bar: string; text: string }> = {
    1: { bg: 'bg-cyan-50 dark:bg-cyan-900/30', border: 'border-cyan-200 dark:border-cyan-800', bar: 'bg-cyan-500', text: 'text-cyan-600 dark:text-cyan-400' },
    2: { bg: 'bg-indigo-50 dark:bg-indigo-900/30', border: 'border-indigo-200 dark:border-indigo-800', bar: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400' },
    3: { bg: 'bg-amber-50 dark:bg-amber-900/30', border: 'border-amber-200 dark:border-amber-800', bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
};

// Status colors for visual indication
const STATUS_COLORS: Record<string, string> = {
    'Concluído': 'bg-emerald-500',
    'Em Andamento': 'bg-blue-500',
    'Atrasado': 'bg-rose-500',
    'Não Iniciado': 'bg-slate-400',
};

type ViewType = 'year' | 'month' | 'week' | 'day';

export function LinearCalendar({ actions, activities, objectives, microId }: LinearCalendarProps) {
    const [selectedMicro, setSelectedMicro] = useState<string | null>(microId || null);
    const [selectedObjective, setSelectedObjective] = useState<number | 'all'>('all');
    const [viewType, setViewType] = useState<ViewType>('year');
    const [focusDate, setFocusDate] = useState(new Date(2026, 0, 1));
    const [zoomLevel, setZoomLevel] = useState(1);
    const [hoveredActionId, setHoveredActionId] = useState<string | null>(null);
    const [selectedAction, setSelectedAction] = useState<Action | null>(null);
    const [selectedDay, setSelectedDay] = useState<{ dateKey: string; dateObj: Date } | null>(null);
    const [expandedActionId, setExpandedActionId] = useState<string | null>(null);

    useEffect(() => {
        if (microId !== undefined) setSelectedMicro(microId);
    }, [microId]);

    // Build activity to objective mapping
    const activityToObjective = useMemo(() => {
        return createActivityToObjectiveMap(activities);
    }, [activities]);

    // Filtrar ações válidas (não órfãs) primeiro
    const validActions = useMemo(() => {
        return filterOrphanedActions(actions, activities);
    }, [actions, activities]);

    // Ações filtradas por microrregião e objetivo (todas válidas)
    const microFilteredActions = useMemo(() => {
        let filtered = validActions;
        if (selectedMicro && selectedMicro !== 'all') {
            filtered = filtered.filter(a => a.microregiaoId === selectedMicro);
        }
        if (selectedObjective !== 'all') {
            filtered = filtered.filter(a => activityToObjective[a.activityId] === selectedObjective);
        }
        return filtered;
    }, [validActions, selectedMicro, selectedObjective, activityToObjective]);

    // Estatísticas de ações
    const actionStats = useMemo(() => {
        const total = microFilteredActions.length;
        const withDate = microFilteredActions.filter(hasValidDate).length;
        const withoutDate = total - withDate;
        return { total, withDate, withoutDate };
    }, [microFilteredActions]);

    // Filter actions para a agenda (apenas com data válida)
    const filteredActions = useMemo(() => {
        return microFilteredActions
            .filter(hasValidDate)
            .sort((a, b) => {
                const startA = new Date(a.startDate || a.plannedEndDate).getTime();
                const startB = new Date(b.startDate || b.plannedEndDate).getTime();
                return startA - startB;
            });
    }, [microFilteredActions]);

    const microName = useMemo(() => {
        if (!selectedMicro || selectedMicro === 'all') return 'Todas as Microrregiões';
        return MICROREGIOES.find(m => m.id === selectedMicro)?.nome || 'Microrregião Selecionada';
    }, [selectedMicro]);

    // --- HELPERS DE DATA ---
    const pad = (n: number) => String(n).padStart(2, '0');
    const toDateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

    // Navegação
    const handleNavigate = (direction: number) => {
        const newDate = new Date(focusDate);
        if (viewType === 'year') newDate.setFullYear(newDate.getFullYear() + direction);
        else if (viewType === 'month') newDate.setMonth(newDate.getMonth() + direction);
        else if (viewType === 'week') newDate.setDate(newDate.getDate() + (direction * 7));
        else newDate.setDate(newDate.getDate() + direction);
        setFocusDate(newDate);
    };

    const getNavTitle = () => {
        const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        if (viewType === 'year') return `${focusDate.getFullYear()}`;
        if (viewType === 'month') return `${monthNames[focusDate.getMonth()]} ${focusDate.getFullYear()}`;
        if (viewType === 'week') {
            const start = new Date(focusDate);
            start.setDate(start.getDate() - start.getDay());
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            return `${start.getDate()} ${monthNames[start.getMonth()].slice(0, 3)} - ${end.getDate()} ${monthNames[end.getMonth()].slice(0, 3)}`;
        }
        return `${focusDate.getDate()} de ${monthNames[focusDate.getMonth()]}`;
    };

    // --- GERADOR DE GRADE DINÂMICA ---
    const gridData = useMemo(() => {
        const days: { dateObj: Date; day: number; month: number; dow: number; dateKey: string; isWeekend: boolean; isFirstDay: boolean; isCurrentMonth: boolean; index: number }[] = [];
        let startDate: Date;
        let totalDays: number;
        let cols: number;

        if (viewType === 'year') {
            startDate = new Date(focusDate.getFullYear(), 0, 1);
            totalDays = (focusDate.getFullYear() % 4 === 0) ? 366 : 365;
            cols = 24;
        } else if (viewType === 'month') {
            const firstDayOfMonth = new Date(focusDate.getFullYear(), focusDate.getMonth(), 1);
            startDate = new Date(firstDayOfMonth);
            startDate.setDate(startDate.getDate() - startDate.getDay());
            totalDays = 42;
            cols = 7;
        } else if (viewType === 'week') {
            startDate = new Date(focusDate);
            startDate.setDate(startDate.getDate() - startDate.getDay());
            totalDays = 7;
            cols = 7;
        } else {
            startDate = new Date(focusDate);
            totalDays = 1;
            cols = 1;
        }

        for (let i = 0; i < totalDays; i++) {
            const current = new Date(startDate);
            current.setDate(startDate.getDate() + i);
            const day = current.getDate();
            const month = current.getMonth();
            const dow = current.getDay();
            const dateKey = toDateKey(current);
            const isCurrentMonth = viewType === 'month' ? month === focusDate.getMonth() : true;

            days.push({
                dateObj: current,
                day, month, dow, dateKey,
                isWeekend: dow === 0 || dow === 6,
                isFirstDay: day === 1,
                isCurrentMonth,
                index: i
            });
        }
        return { days, cols };
    }, [viewType, focusDate]);

    // --- SLOTTING E DADOS ---
    const { actionsPerDay, ganttSlotsMap } = useMemo(() => {
        const map: Record<string, Action[]> = {};
        const slots: Record<string, (Action & { isStart: boolean; isEnd: boolean; isVisualStart: boolean })[]> = {};

        const viewStart = gridData.days[0]?.dateKey || '';
        const viewEnd = gridData.days[gridData.days.length - 1]?.dateKey || '';

        const visibleActions = filteredActions.filter(a => {
            const startStr = a.startDate || a.plannedEndDate;
            const endStr = a.plannedEndDate || a.endDate || startStr;
            return endStr >= viewStart && startStr <= viewEnd;
        });

        gridData.days.forEach(day => {
            map[day.dateKey] = visibleActions.filter(a => {
                const startStr = a.startDate || a.plannedEndDate;
                const endStr = a.plannedEndDate || a.endDate || startStr;
                return startStr <= day.dateKey && endStr >= day.dateKey;
            });
        });

        const sortedActions = [...visibleActions].sort((a, b) => {
            const startA = a.startDate || a.plannedEndDate;
            const startB = b.startDate || b.plannedEndDate;
            if (startA !== startB) return startA.localeCompare(startB);
            const endA = a.plannedEndDate || a.endDate || startA;
            const endB = b.plannedEndDate || b.endDate || startB;
            return endB.localeCompare(endA);
        });

        const occupied: Record<string, boolean[]> = {};

        sortedActions.forEach(action => {
            const startStr = action.startDate || action.plannedEndDate;
            const endStr = action.plannedEndDate || action.endDate || startStr;

            const startIndex = gridData.days.findIndex(d => d.dateKey === startStr);
            const endIndex = gridData.days.findIndex(d => d.dateKey === endStr);

            const paintStart = startIndex === -1 ? 0 : startIndex;
            const paintEnd = endIndex === -1 ? gridData.days.length - 1 : endIndex;

            if (endStr < viewStart || startStr > viewEnd) return;

            let chosenSlot = -1;
            const maxSlots = viewType === 'day' ? 50 : 6;

            for (let slot = 0; slot < maxSlots; slot++) {
                let isFree = true;
                for (let i = paintStart; i <= paintEnd; i++) {
                    const dKey = gridData.days[i].dateKey;
                    if (!occupied[dKey]) occupied[dKey] = [];
                    if (occupied[dKey][slot]) { isFree = false; break; }
                }
                if (isFree) { chosenSlot = slot; break; }
            }

            if (chosenSlot !== -1) {
                for (let i = paintStart; i <= paintEnd; i++) {
                    const dKey = gridData.days[i].dateKey;
                    if (!slots[dKey]) slots[dKey] = [];
                    if (!occupied[dKey]) occupied[dKey] = [];
                    occupied[dKey][chosenSlot] = true;

                    const isRealStart = dKey === startStr;
                    const isRealEnd = dKey === endStr;

                    slots[dKey][chosenSlot] = {
                        ...action,
                        isStart: isRealStart,
                        isEnd: isRealEnd,
                        isVisualStart: i === paintStart
                    };
                }
            }
        });

        return { actionsPerDay: map, ganttSlotsMap: slots };
    }, [filteredActions, gridData]);

    // Retorna o número sequencial do objetivo (1, 2, 3...) baseado na posição na lista
    const getObjectiveDisplayNumber = (action: Action): number => {
        const objectiveDbId = activityToObjective[action.activityId];
        if (!objectiveDbId) return 1;

        // Encontra a posição (índice + 1) do objetivo na lista
        const index = objectives.findIndex(o => o.id === objectiveDbId);
        return index >= 0 ? index + 1 : 1;
    };

    // Retorna o ID do banco do objetivo (para buscar dados)
    const getObjectiveDbId = (action: Action): number => {
        return activityToObjective[action.activityId] || objectives[0]?.id || 1;
    };

    const monthNamesShort = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
    const weekNames = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

    const getCellHeight = () => {
        if (viewType === 'year') return 'min-h-[140px]';
        if (viewType === 'month') return 'min-h-[140px]';
        if (viewType === 'week') return 'min-h-[400px]';
        return 'min-h-[600px]';
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden">
            {/* Header Controls */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm z-20 shrink-0">
                {/* Top Row */}
                <div className="px-4 py-3 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            <CalendarIcon size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-none">Agenda de Ações</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                {microName} • {actionStats.total} ações
                                {actionStats.withoutDate > 0 && (
                                    <span className="text-amber-500 dark:text-amber-400 ml-1">
                                        ({actionStats.withoutDate} sem data)
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Date Navigation */}
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                            <button onClick={() => handleNavigate(-1)} className="p-1.5 hover:bg-white dark:hover:bg-slate-600 rounded-md transition-colors">
                                <ChevronLeft size={16} className="text-slate-600 dark:text-slate-300" />
                            </button>
                            <span className="text-sm font-bold min-w-[140px] text-center text-slate-700 dark:text-slate-200 select-none">{getNavTitle()}</span>
                            <button onClick={() => handleNavigate(1)} className="p-1.5 hover:bg-white dark:hover:bg-slate-600 rounded-md transition-colors">
                                <ChevronRight size={16} className="text-slate-600 dark:text-slate-300" />
                            </button>
                        </div>

                        {/* View Type Selector */}
                        <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                            {(['day', 'week', 'month', 'year'] as ViewType[]).map(v => (
                                <button
                                    key={v}
                                    onClick={() => { setViewType(v); setZoomLevel(1); }}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewType === v ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-300 shadow' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                                >
                                    {v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : v === 'month' ? 'Mês' : 'Ano'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Filter Row */}
                    <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2 text-sm">
                            <Target size={14} className="text-slate-400" />
                            <span className="text-slate-500 dark:text-slate-400 font-medium">Objetivos:</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setSelectedObjective('all')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${selectedObjective === 'all' ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800 border-slate-800 dark:border-slate-200' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}`}
                            >
                                Todos
                            </button>
                            {objectives.map((obj, objIndex) => {
                                const displayNum = objIndex + 1;
                                const colors = OBJECTIVE_COLORS[displayNum] || OBJECTIVE_COLORS[1];
                                const isSelected = selectedObjective === obj.id;
                                return (
                                    <button
                                        key={obj.id}
                                        onClick={() => setSelectedObjective(obj.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-2 ${isSelected ? `${colors.bar} text-white border-transparent` : `bg-white dark:bg-slate-700 ${colors.text} ${colors.border} hover:${colors.bg}`}`}
                                    >
                                        <Target size={12} />
                                        Obj. {displayNum}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Zoom Slider */}
                        <div className="flex items-center gap-2 ml-2 pl-3 border-l border-slate-200 dark:border-slate-600">
                            <ZoomOut size={14} className="text-slate-400" />
                            <input
                                type="range"
                                min="0.5"
                                max="1.5"
                                step="0.05"
                                value={zoomLevel}
                                onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                                className="w-24 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full appearance-none cursor-pointer accent-indigo-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
                                title={`Zoom: ${Math.round(zoomLevel * 100)}%`}
                            />
                            <ZoomIn size={14} className="text-slate-400" />
                        </div>

                        <div className="ml-auto flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500"></span> Concluído</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500"></span> Em Andamento</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-500"></span> Atrasado</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-400"></span> Não Iniciado</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid Calendar Area */}
            <div className="flex-1 w-full overflow-auto bg-slate-100/50 dark:bg-slate-900 p-4 flex justify-center custom-scrollbar">
                <div
                    className="bg-white dark:bg-slate-800 shadow-xl transition-transform duration-200 origin-top border border-slate-200 dark:border-slate-700 rounded-lg"
                    style={{
                        width: '100%',
                        maxWidth: viewType === 'day' ? '600px' : '1800px',
                        display: 'grid',
                        gridTemplateColumns: `repeat(${gridData.cols}, 1fr)`,
                        gap: '1px',
                        backgroundColor: 'rgb(226 232 240)',
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: 'top center',
                        marginBottom: '100px'
                    }}
                >
                    {gridData.days.map((day) => {
                        const dailyActions = actionsPerDay[day.dateKey] || [];
                        const count = dailyActions.length;
                        const isHighDensity = (viewType === 'year' || viewType === 'month') && count > 6;
                        const isDimmed = !day.isCurrentMonth && viewType === 'month';
                        const isTodayCell = isToday(day.dateObj);

                        return (
                            <div
                                key={day.dateKey}
                                onClick={() => {
                                    setSelectedDay({ dateKey: day.dateKey, dateObj: day.dateObj });
                                }}
                                className={`
                                    relative ${getCellHeight()} p-1 flex flex-col group cursor-pointer transition-colors
                                    ${day.isWeekend ? 'bg-slate-50/60 dark:bg-slate-800/60' : 'bg-white dark:bg-slate-800'}
                                    ${day.isFirstDay && viewType !== 'week' && viewType !== 'day' ? 'border-l-2 border-slate-600 dark:border-slate-400' : ''}
                                    ${isDimmed ? 'opacity-40 bg-slate-100 dark:bg-slate-900' : 'hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10'}
                                    ${isTodayCell ? 'ring-2 ring-inset ring-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/20' : ''}
                                `}
                            >
                                {/* Header da Célula */}
                                <div className="flex justify-between items-start mb-1 select-none pointer-events-none z-0">
                                    {(day.isFirstDay || day.index === 0) && viewType !== 'day' ? (
                                        <span className="bg-slate-700 dark:bg-slate-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm shadow-sm z-10">
                                            {monthNamesShort[day.month]}
                                        </span>
                                    ) : (
                                        <span className="text-[9px] font-semibold text-slate-300 dark:text-slate-500 uppercase mt-1 ml-1">
                                            {weekNames[day.dow]}
                                        </span>
                                    )}
                                    <div className="flex items-center gap-1">
                                        {count > 0 && isHighDensity && (
                                            <span className="text-[9px] font-bold px-1 rounded-sm bg-indigo-600 text-white">{count}</span>
                                        )}
                                        {isTodayCell ? (
                                            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center mr-0.5">
                                                {day.day}
                                            </span>
                                        ) : (
                                            <span className={`text-sm font-bold mr-1 ${day.isFirstDay ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>
                                                {day.day}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Conteúdo da Célula */}
                                <div className="flex-1 relative w-full z-10">
                                    {isHighDensity ? (
                                        <div className="grid grid-cols-4 gap-1 p-1 content-start">
                                            {dailyActions.slice(0, 20).map(a => {
                                                const objId = getObjectiveDisplayNumber(a);
                                                const objColors = OBJECTIVE_COLORS[objId] || OBJECTIVE_COLORS[1];
                                                return (
                                                    <div
                                                        key={`${a.uid}-dot`}
                                                        className={`w-2 h-2 rounded-full ${objColors.bar} opacity-80`}
                                                        title={a.title}
                                                    />
                                                );
                                            })}
                                            {count > 20 && <div className="col-span-4 text-[9px] text-slate-400 text-center">+{count - 20}</div>}
                                        </div>
                                    ) : (
                                        Array.from({ length: viewType === 'day' ? 50 : 6 }).map((_, i) => {
                                            const slots = ganttSlotsMap[day.dateKey] || [];
                                            const action = slots[i];
                                            if (!action) return null;
                                            const isHovered = hoveredActionId === action.uid;
                                            const objId = getObjectiveDisplayNumber(action);
                                            const objColors = OBJECTIVE_COLORS[objId] || OBJECTIVE_COLORS[1];
                                            const statusColor = STATUS_COLORS[action.status] || 'bg-slate-400';

                                            return (
                                                <div
                                                    key={i}
                                                    onMouseEnter={(e) => { e.stopPropagation(); setHoveredActionId(action.uid); }}
                                                    onMouseLeave={(e) => { e.stopPropagation(); setHoveredActionId(null); }}
                                                    onClick={(e) => { e.stopPropagation(); setSelectedAction(action); }}
                                                    className={`
                                                        absolute left-0 right-0 h-[18px] mb-[2px] rounded-[2px] cursor-pointer
                                                        ${statusColor} transition-all duration-150
                                                        ${hoveredActionId && !isHovered ? 'opacity-20 grayscale' : 'opacity-90'}
                                                        ${isHovered ? 'z-50 shadow-lg ring-1 ring-white scale-y-110' : 'z-10'}
                                                    `}
                                                    style={{
                                                        top: `${i * 20}px`,
                                                        borderRadius: action.isStart ? '4px 0 0 4px' : (action.isEnd ? '0 4px 4px 0' : '0'),
                                                        borderTopLeftRadius: !action.isStart && action.isVisualStart ? '0' : undefined,
                                                        borderBottomLeftRadius: !action.isStart && action.isVisualStart ? '0' : undefined,
                                                        marginLeft: (!action.isStart && action.isVisualStart) ? '-1px' : '0',
                                                        borderLeft: action.isStart ? `3px solid ${objId === 1 ? '#06b6d4' : objId === 2 ? '#6366f1' : '#f59e0b'}` : undefined
                                                    }}
                                                >
                                                    {(action.isVisualStart || isHovered) && (
                                                        <span className="text-[9px] text-white font-bold px-1 truncate block leading-[18px] drop-shadow-md select-none">
                                                            {action.title}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Action Detail Modal (Read-Only) */}
            {selectedAction && (
                <>
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={() => setSelectedAction(null)} />
                    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl z-50 w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div className={`px-5 py-4 ${OBJECTIVE_COLORS[getObjectiveDisplayNumber(selectedAction)]?.bg || 'bg-slate-50'} border-b ${OBJECTIVE_COLORS[getObjectiveDisplayNumber(selectedAction)]?.border || 'border-slate-200'} flex items-center justify-between`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold ${OBJECTIVE_COLORS[getObjectiveDisplayNumber(selectedAction)]?.bar || 'bg-slate-500'}`}>
                                    {getObjectiveDisplayNumber(selectedAction)}
                                </div>
                                <div>
                                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">A{getActionDisplayId(selectedAction.id)}</span>
                                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight">{selectedAction.title}</h3>
                                </div>
                            </div>
                            <button onClick={() => setSelectedAction(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Status</label>
                                    <span className={`inline-flex px-3 py-1.5 rounded-full text-sm font-bold text-white ${STATUS_COLORS[selectedAction.status]}`}>
                                        {selectedAction.status}
                                    </span>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Progresso</label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                            <div className={`h-full ${selectedAction.progress >= 100 ? 'bg-emerald-500' : selectedAction.progress >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${selectedAction.progress}%` }} />
                                        </div>
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{selectedAction.progress}%</span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Início</label>
                                    <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">{selectedAction.startDate ? format(new Date(selectedAction.startDate), 'dd/MM/yyyy') : '-'}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Previsão de Término</label>
                                    <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">{selectedAction.plannedEndDate ? format(new Date(selectedAction.plannedEndDate), 'dd/MM/yyyy') : '-'}</p>
                                </div>
                            </div>
                            {selectedAction.endDate && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Término Real</label>
                                    <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">{format(new Date(selectedAction.endDate), 'dd/MM/yyyy')}</p>
                                </div>
                            )}
                            {selectedAction.raci && selectedAction.raci.length > 0 && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Equipe RACI</label>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedAction.raci.map((member, idx) => (
                                            <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm">
                                                <span className={`w-5 h-5 rounded text-xs font-bold flex items-center justify-center text-white ${member.role === 'R' ? 'bg-blue-500' : member.role === 'A' ? 'bg-purple-500' : 'bg-slate-400'}`}>
                                                    {member.role}
                                                </span>
                                                <span className="text-slate-700 dark:text-slate-200">{member.name}</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                            <button onClick={() => setSelectedAction(null)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                Fechar
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Day Detail Modal - Shows all actions for a selected day */}
            {selectedDay && (() => {
                // Normaliza "hoje" para meia-noite para comparação correta de dias
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                // Garante que a data selecionada também seja considerada meia-noite
                const selectedDateNormalized = new Date(selectedDay.dateObj);
                selectedDateNormalized.setHours(0, 0, 0, 0);

                const dayDiff = differenceInDays(selectedDateNormalized, today);
                const isTodaySelected = isToday(selectedDay.dateObj);
                const dayActions = actionsPerDay[selectedDay.dateKey] || [];

                // Group actions by objective
                const actionsByObjective = dayActions.reduce((acc, action) => {
                    const objId = getObjectiveDisplayNumber(action);
                    if (!acc[objId]) acc[objId] = [];
                    acc[objId].push(action);
                    return acc;
                }, {} as Record<number, Action[]>);

                const getDayDiffText = () => {
                    if (isTodaySelected) return 'Hoje';
                    if (dayDiff === 1) return 'Amanhã';
                    if (dayDiff === -1) return 'Ontem';
                    if (dayDiff > 0) return `Daqui a ${dayDiff} dias`;
                    return `Há ${Math.abs(dayDiff)} dias`;
                };

                const dayOfWeek = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][selectedDay.dateObj.getDay()];

                return (
                    <>
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setSelectedDay(null)} />
                        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl z-50 w-full max-w-lg max-h-[85vh] overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col">
                            {/* Header with date info */}
                            <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-4 text-white shrink-0">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                            <CalendarDays size={24} />
                                        </div>
                                        <div>
                                            <p className="text-indigo-100 text-sm font-medium">{dayOfWeek}</p>
                                            <h3 className="text-2xl font-bold leading-tight">
                                                {format(selectedDay.dateObj, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                            </h3>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedDay(null)}
                                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Date comparison info */}
                                <div className="mt-4 flex items-center gap-4 text-sm">
                                    <div className="flex items-center gap-2 bg-white/15 rounded-lg px-3 py-2 backdrop-blur-sm">
                                        <Clock size={14} />
                                        <span>Hoje: {format(today, "dd/MM/yyyy")}</span>
                                    </div>
                                    <div className="flex items-center text-indigo-100">
                                        <ArrowRight size={14} className="mx-2" />
                                    </div>
                                    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 font-bold ${isTodaySelected ? 'bg-emerald-500/80' :
                                        dayDiff > 0 ? 'bg-blue-500/80' : 'bg-amber-500/80'
                                        }`}>
                                        {getDayDiffText()}
                                    </div>
                                </div>
                            </div>

                            {/* Actions content - scrollable */}
                            <div className="flex-1 overflow-y-auto p-5">
                                {dayActions.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                            <CalendarDays size={28} className="text-slate-400" />
                                        </div>
                                        <h4 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-1">
                                            Nenhuma ação programada
                                        </h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            Não há ações previstas para este dia.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                                            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                                                {dayActions.length} {dayActions.length === 1 ? 'ação' : 'ações'} neste dia
                                            </span>
                                        </div>

                                        {/* Actions grouped by objective */}
                                        {Object.entries(actionsByObjective)
                                            .sort(([a], [b]) => Number(a) - Number(b))
                                            .map(([objId, objActions]) => {
                                                const numObjId = Number(objId);
                                                const colors = OBJECTIVE_COLORS[numObjId] || OBJECTIVE_COLORS[1];
                                                const objective = objectives.find((o, idx) => (idx + 1) === numObjId);

                                                return (
                                                    <div key={objId} className={`rounded-xl border ${colors.border} ${colors.bg} overflow-hidden`}>
                                                        {/* Objective header */}
                                                        <div className={`px-4 py-3 flex items-center gap-3 border-b ${colors.border}`}>
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm ${colors.bar}`}>
                                                                {numObjId}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <span className={`text-xs font-bold uppercase tracking-wide ${colors.text}`}>
                                                                    Objetivo {numObjId}
                                                                </span>
                                                                {objective && (
                                                                    <p className="text-sm text-slate-600 dark:text-slate-300 truncate">
                                                                        {objective.title.replace(/^\d+\.\s*/, '')}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${colors.bar} text-white`}>
                                                                {objActions.length}
                                                            </span>
                                                        </div>

                                                        {/* Actions list */}
                                                        <div className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
                                                            {objActions.map((action) => {
                                                                const isExpanded = expandedActionId === action.uid;
                                                                return (
                                                                    <div
                                                                        key={action.uid}
                                                                        className={`transition-colors ${isExpanded ? 'bg-slate-50 dark:bg-slate-800/80' : 'hover:bg-white/50 dark:hover:bg-slate-700/30'}`}
                                                                    >
                                                                        {/* Header da Ação (Clicável) */}
                                                                        <div
                                                                            className="px-4 py-3 cursor-pointer select-none"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setExpandedActionId(isExpanded ? null : action.uid);
                                                                            }}
                                                                        >
                                                                            <div className="flex items-start gap-3">
                                                                                <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${STATUS_COLORS[action.status]}`} />
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="flex items-center gap-2 mb-1">
                                                                                        <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
                                                                                            A{getActionDisplayId(action.id)}
                                                                                        </span>
                                                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${action.status === 'Concluído' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                                                            action.status === 'Em Andamento' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                                                                action.status === 'Atrasado' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                                                                                                    'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                                                                            }`}>
                                                                                            {action.status}
                                                                                        </span>
                                                                                    </div>
                                                                                    <h5 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1 line-clamp-2">
                                                                                        {action.title}
                                                                                    </h5>
                                                                                    {!isExpanded && (
                                                                                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                                                                            <span className="flex items-center gap-1">
                                                                                                <div className="w-20 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                                                                                    <div
                                                                                                        className={`h-full ${action.progress >= 100 ? 'bg-emerald-500' : action.progress >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                                                                                                        style={{ width: `${action.progress}%` }}
                                                                                                    />
                                                                                                </div>
                                                                                                <span className="font-medium">{action.progress}%</span>
                                                                                            </span>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Detalhes Expandidos */}
                                                                        {isExpanded && (
                                                                            <div className="px-4 pb-4 pl-9 animate-in slide-in-from-top-2 duration-200">
                                                                                <div className="grid grid-cols-2 gap-4 mb-4">
                                                                                    <div>
                                                                                        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Início</label>
                                                                                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                                                                            {action.startDate ? format(new Date(action.startDate), 'dd/MM/yyyy') : '-'}
                                                                                        </p>
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Previsão</label>
                                                                                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                                                                            {action.plannedEndDate ? format(new Date(action.plannedEndDate), 'dd/MM/yyyy') : '-'}
                                                                                        </p>
                                                                                    </div>
                                                                                </div>

                                                                                <div className="mb-4">
                                                                                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Progresso</label>
                                                                                    <div className="flex items-center gap-2">
                                                                                        <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                                            <div
                                                                                                className={`h-full ${action.progress >= 100 ? 'bg-emerald-500' : action.progress >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                                                                                                style={{ width: `${action.progress}%` }}
                                                                                            />
                                                                                        </div>
                                                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{action.progress}%</span>
                                                                                    </div>
                                                                                </div>

                                                                                {action.raci && action.raci.length > 0 && (
                                                                                    <div>
                                                                                        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Equipe RACI</label>
                                                                                        <div className="flex flex-wrap gap-2">
                                                                                            {action.raci.map((member, idx) => (
                                                                                                <span key={idx} className="inline-flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-xs">
                                                                                                    <span className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center text-white ${member.role === 'R' ? 'bg-blue-500' : member.role === 'A' ? 'bg-purple-500' : 'bg-slate-400'}`}>
                                                                                                        {member.role}
                                                                                                    </span>
                                                                                                    <span className="text-slate-700 dark:text-slate-300">{member.name}</span>
                                                                                                </span>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        }
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end shrink-0">
                                <button
                                    onClick={() => setSelectedDay(null)}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </>
                );
            })()}
        </div>
    );
}
