import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isToday } from "date-fns";

import type { Action, Activity, Objective } from "../../../types";
import { MICROREGIOES } from "../../../data/microregioes";
import { getActionDisplayId, getCorrectActionDisplayId, findObjectiveIdByActivityId } from "../../../lib/text";
import { createActivityToObjectiveMap, filterOrphanedActions, hasValidDate } from "../../../lib/actionValidation";
import { LinearCalendarActionModal } from "./linearCalendar/LinearCalendarActionModal";
import { LinearCalendarDayModal } from "./linearCalendar/LinearCalendarDayModal";
import { LinearCalendarHeader, type DensityMode, type ViewType } from "./linearCalendar/LinearCalendarHeader";
import {
    MONTH_NAMES_SHORT,
    OBJECTIVE_COLORS,
    STATUS_COLORS,
    WEEK_NAMES,
} from "./linearCalendar/linearCalendar.constants";

interface LinearCalendarProps {
    actions: Action[];
    activities: Record<number, Activity[]>;
    objectives: Objective[];
    microId?: string | null;
}

const MIN_CALENDAR_ZOOM = 0.7;
const MAX_CALENDAR_ZOOM = 1.5;

export function LinearCalendar({ actions, activities, objectives, microId }: LinearCalendarProps) {
    const [selectedMicro, setSelectedMicro] = useState<string | null>(microId || null);
    const [selectedObjective, setSelectedObjective] = useState<number | "all">("all");
    const [viewType, setViewType] = useState<ViewType>("year");
    const [focusDate, setFocusDate] = useState(new Date(2026, 0, 1));
    const [densityMode, setDensityMode] = useState<DensityMode>("default");
    const [zoomLevel, setZoomLevel] = useState(1);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [selectedAction, setSelectedAction] = useState<Action | null>(null);
    const [selectedDay, setSelectedDay] = useState<{ dateKey: string; dateObj: Date } | null>(null);
    const calendarScrollRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (microId !== undefined) {
            setSelectedMicro(microId);
        }
    }, [microId]);

    useEffect(() => {
        const container = calendarScrollRef.current;
        if (!container) {
            return;
        }

        if (zoomLevel <= MIN_CALENDAR_ZOOM + 0.001) {
            const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
            container.scrollLeft = maxScrollLeft / 2;
        }
    }, [zoomLevel, viewType]);

    const activityToObjective = useMemo(() => createActivityToObjectiveMap(activities), [activities]);
    const validActions = useMemo(() => filterOrphanedActions(actions, activities), [actions, activities]);

    const microFilteredActions = useMemo(() => {
        let filtered = validActions;
        if (selectedMicro && selectedMicro !== "all") {
            filtered = filtered.filter((action) => action.microregiaoId === selectedMicro);
        }
        if (selectedObjective !== "all") {
            filtered = filtered.filter((action) => activityToObjective[action.activityId] === selectedObjective);
        }
        return filtered;
    }, [activityToObjective, selectedMicro, selectedObjective, validActions]);

    const actionStats = useMemo(() => {
        const total = microFilteredActions.length;
        const withDate = microFilteredActions.filter(hasValidDate).length;
        const withoutDate = total - withDate;
        return { total, withDate, withoutDate };
    }, [microFilteredActions]);

    const filteredActions = useMemo(() => {
        return microFilteredActions
            .filter(hasValidDate)
            .sort((left, right) => {
                const leftStart = new Date(left.startDate || left.plannedEndDate).getTime();
                const rightStart = new Date(right.startDate || right.plannedEndDate).getTime();
                return leftStart - rightStart;
            });
    }, [microFilteredActions]);

    const microName = useMemo(() => {
        if (!selectedMicro || selectedMicro === "all") {
            return "Todas as Microrregiões";
        }

        return MICROREGIOES.find((micro) => micro.id === selectedMicro)?.nome || "Microrregião Selecionada";
    }, [selectedMicro]);

    const filteredObjectives = useMemo(() => {
        if (!selectedMicro || selectedMicro === "all") {
            return objectives;
        }

        return objectives.filter((objective) => objective.microregiaoId === selectedMicro);
    }, [objectives, selectedMicro]);

    const getCorrectId = (action: Action): string => {
        const objectiveId = findObjectiveIdByActivityId(action.activityId, activities);
        if (objectiveId === null) {
            return getActionDisplayId(action.id);
        }

        return getCorrectActionDisplayId(
            action.id,
            action.activityId,
            objectiveId,
            filteredObjectives,
            activities,
            filteredActions,
        );
    };

    const toDateKey = useCallback((date: Date) => {
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${date.getFullYear()}-${month}-${day}`;
    }, []);

    const densityConfig = useMemo(() => {
        if (densityMode === "compact") {
            return {
                regularSlots: 8,
                daySlots: 56,
                barHeight: 16,
                barStep: 18,
            };
        }

        if (densityMode === "comfortable") {
            return {
                regularSlots: 5,
                daySlots: 40,
                barHeight: 20,
                barStep: 24,
            };
        }

        return {
            regularSlots: 6,
            daySlots: 50,
            barHeight: 18,
            barStep: 20,
        };
    }, [densityMode]);

    const maxSlotsPerCell = viewType === "day" ? densityConfig.daySlots : densityConfig.regularSlots;

    const handleNavigate = (direction: number) => {
        const nextDate = new Date(focusDate);
        if (viewType === "year") nextDate.setFullYear(nextDate.getFullYear() + direction);
        else if (viewType === "month") nextDate.setMonth(nextDate.getMonth() + direction);
        else if (viewType === "week") nextDate.setDate(nextDate.getDate() + direction * 7);
        else nextDate.setDate(nextDate.getDate() + direction);
        setFocusDate(nextDate);
    };

    const handleGoToToday = useCallback(() => {
        setFocusDate(new Date());
    }, []);

    const isTodayContext = useMemo(() => {
        const today = new Date();

        if (viewType === "year") {
            return focusDate.getFullYear() === today.getFullYear();
        }

        if (viewType === "month") {
            return focusDate.getFullYear() === today.getFullYear() && focusDate.getMonth() === today.getMonth();
        }

        if (viewType === "week") {
            const start = new Date(focusDate);
            start.setDate(start.getDate() - start.getDay());
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            const todayKey = toDateKey(today);
            return toDateKey(start) <= todayKey && toDateKey(end) >= todayKey;
        }

        return toDateKey(focusDate) === toDateKey(today);
    }, [focusDate, toDateKey, viewType]);

    const getNavTitle = () => {
        const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        if (viewType === "year") return `${focusDate.getFullYear()}`;
        if (viewType === "month") return `${monthNames[focusDate.getMonth()]} ${focusDate.getFullYear()}`;
        if (viewType === "week") {
            const start = new Date(focusDate);
            start.setDate(start.getDate() - start.getDay());
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            return `${start.getDate()} ${monthNames[start.getMonth()].slice(0, 3)} - ${end.getDate()} ${monthNames[end.getMonth()].slice(0, 3)}`;
        }
        return `${focusDate.getDate()} de ${monthNames[focusDate.getMonth()]}`;
    };

    const gridData = useMemo(() => {
        const days: { dateObj: Date; day: number; month: number; dow: number; dateKey: string; isWeekend: boolean; isFirstDay: boolean; isCurrentMonth: boolean; index: number }[] = [];
        let startDate: Date;
        let totalDays: number;
        let cols: number;

        if (viewType === "year") {
            startDate = new Date(focusDate.getFullYear(), 0, 1);
            totalDays = focusDate.getFullYear() % 4 === 0 ? 366 : 365;
            cols = 24;
        } else if (viewType === "month") {
            const firstDayOfMonth = new Date(focusDate.getFullYear(), focusDate.getMonth(), 1);
            startDate = new Date(firstDayOfMonth);
            startDate.setDate(startDate.getDate() - startDate.getDay());
            totalDays = 42;
            cols = 7;
        } else if (viewType === "week") {
            startDate = new Date(focusDate);
            startDate.setDate(startDate.getDate() - startDate.getDay());
            totalDays = 7;
            cols = 7;
        } else {
            startDate = new Date(focusDate);
            totalDays = 1;
            cols = 1;
        }

        for (let index = 0; index < totalDays; index += 1) {
            const current = new Date(startDate);
            current.setDate(startDate.getDate() + index);
            const day = current.getDate();
            const month = current.getMonth();
            const dow = current.getDay();
            const dateKey = toDateKey(current);
            const isCurrentMonth = viewType === "month" ? month === focusDate.getMonth() : true;

            days.push({
                dateObj: current,
                day,
                month,
                dow,
                dateKey,
                isWeekend: dow === 0 || dow === 6,
                isFirstDay: day === 1,
                isCurrentMonth,
                index,
            });
        }

        return { days, cols };
    }, [focusDate, toDateKey, viewType]);

    const { actionsPerDay, ganttSlotsMap } = useMemo(() => {
        const map: Record<string, Action[]> = {};
        const slots: Record<string, (Action & { isStart: boolean; isEnd: boolean; isVisualStart: boolean })[]> = {};
        const viewStart = gridData.days[0]?.dateKey || "";
        const viewEnd = gridData.days[gridData.days.length - 1]?.dateKey || "";

        const visibleActions = filteredActions.filter((action) => {
            const startStr = action.startDate || action.plannedEndDate;
            const endStr = action.plannedEndDate || action.endDate || startStr;
            return endStr >= viewStart && startStr <= viewEnd;
        });

        gridData.days.forEach((day) => {
            map[day.dateKey] = visibleActions.filter((action) => {
                const startStr = action.startDate || action.plannedEndDate;
                const endStr = action.plannedEndDate || action.endDate || startStr;
                return startStr <= day.dateKey && endStr >= day.dateKey;
            });
        });

        const sortedActions = [...visibleActions].sort((left, right) => {
            const leftStart = left.startDate || left.plannedEndDate;
            const rightStart = right.startDate || right.plannedEndDate;
            if (leftStart !== rightStart) return leftStart.localeCompare(rightStart);
            const leftEnd = left.plannedEndDate || left.endDate || leftStart;
            const rightEnd = right.plannedEndDate || right.endDate || rightStart;
            return rightEnd.localeCompare(leftEnd);
        });

        const occupied: Record<string, boolean[]> = {};

        sortedActions.forEach((action) => {
            const startStr = action.startDate || action.plannedEndDate;
            const endStr = action.plannedEndDate || action.endDate || startStr;
            const startIndex = gridData.days.findIndex((day) => day.dateKey === startStr);
            const endIndex = gridData.days.findIndex((day) => day.dateKey === endStr);
            const paintStart = startIndex === -1 ? 0 : startIndex;
            const paintEnd = endIndex === -1 ? gridData.days.length - 1 : endIndex;

            if (endStr < viewStart || startStr > viewEnd) {
                return;
            }

            let chosenSlot = -1;
            const maxSlots = maxSlotsPerCell;

            for (let slot = 0; slot < maxSlots; slot += 1) {
                let isFree = true;
                for (let index = paintStart; index <= paintEnd; index += 1) {
                    const dateKey = gridData.days[index].dateKey;
                    if (!occupied[dateKey]) occupied[dateKey] = [];
                    if (occupied[dateKey][slot]) {
                        isFree = false;
                        break;
                    }
                }
                if (isFree) {
                    chosenSlot = slot;
                    break;
                }
            }

            if (chosenSlot !== -1) {
                for (let index = paintStart; index <= paintEnd; index += 1) {
                    const dateKey = gridData.days[index].dateKey;
                    if (!slots[dateKey]) slots[dateKey] = [];
                    if (!occupied[dateKey]) occupied[dateKey] = [];
                    occupied[dateKey][chosenSlot] = true;

                    const isRealStart = dateKey === startStr;
                    const isRealEnd = dateKey === endStr;

                    slots[dateKey][chosenSlot] = {
                        ...action,
                        isStart: isRealStart,
                        isEnd: isRealEnd,
                        isVisualStart: index === paintStart,
                    };
                }
            }
        });

        return { actionsPerDay: map, ganttSlotsMap: slots };
    }, [filteredActions, gridData, maxSlotsPerCell]);

    const getObjectiveDisplayNumber = (action: Action): number => {
        const objectiveDbId = activityToObjective[action.activityId];
        if (!objectiveDbId) {
            return 1;
        }

        const index = filteredObjectives.findIndex((objective) => objective.id === objectiveDbId);
        return index >= 0 ? index + 1 : 1;
    };

    const getCellHeight = () => {
        if (viewType === "year" || viewType === "month") {
            if (densityMode === "compact") return "min-h-[120px]";
            if (densityMode === "comfortable") return "min-h-[160px]";
            return "min-h-[140px]";
        }

        if (viewType === "week") {
            if (densityMode === "compact") return "min-h-[340px]";
            if (densityMode === "comfortable") return "min-h-[480px]";
            return "min-h-[400px]";
        }

        if (densityMode === "compact") return "min-h-[520px]";
        if (densityMode === "comfortable") return "min-h-[720px]";
        return "min-h-[600px]";
    };

    const getCellPadding = () => {
        if (densityMode === "compact") return "p-0.5";
        if (densityMode === "comfortable") return "p-1.5";
        return "p-1";
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden">
            <LinearCalendarHeader
                microName={microName}
                actionStats={actionStats}
                navTitle={getNavTitle()}
                viewType={viewType}
                filteredObjectives={filteredObjectives}
                selectedObjective={selectedObjective}
                densityMode={densityMode}
                zoomLevel={zoomLevel}
                isFocusMode={isFocusMode}
                isTodayContext={isTodayContext}
                onNavigate={handleNavigate}
                onGoToToday={handleGoToToday}
                onViewChange={(nextView) => {
                    setViewType(nextView);
                    setZoomLevel(1);
                }}
                onDensityModeChange={setDensityMode}
                onToggleFocusMode={() => setIsFocusMode((previous) => !previous)}
                onObjectiveChange={setSelectedObjective}
                onZoomLevelChange={(nextZoom) => {
                    const clampedZoom = Math.max(MIN_CALENDAR_ZOOM, Math.min(MAX_CALENDAR_ZOOM, nextZoom));
                    setZoomLevel(clampedZoom);
                }}
            />

            <div ref={calendarScrollRef} className="flex-1 w-full overflow-auto bg-slate-100/50 dark:bg-slate-900 p-4 flex justify-center custom-scrollbar">
                <div
                    className="bg-white dark:bg-slate-800 shadow-xl transition-transform duration-200 origin-top border border-slate-200 dark:border-slate-700 rounded-lg"
                    style={{
                        width: "100%",
                        maxWidth: viewType === "day" ? "600px" : "1800px",
                        display: "grid",
                        gridTemplateColumns: `repeat(${gridData.cols}, 1fr)`,
                        gap: "1px",
                        backgroundColor: "rgb(226 232 240)",
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: "top center",
                        marginBottom: "100px",
                    }}
                >
                    {gridData.days.map((day) => {
                        const dailyActions = actionsPerDay[day.dateKey] || [];
                        const count = dailyActions.length;
                        const isHighDensity = (viewType === "year" || viewType === "month") && count > 6;
                        const isDimmed = !day.isCurrentMonth && viewType === "month";
                        const isTodayCell = isToday(day.dateObj);

                        return (
                            <div
                                key={day.dateKey}
                                onClick={() => setSelectedDay({ dateKey: day.dateKey, dateObj: day.dateObj })}
                                className={`relative ${getCellHeight()} ${getCellPadding()} flex flex-col group cursor-pointer transition-colors ${day.isWeekend ? "bg-slate-50/60 dark:bg-slate-800/60" : "bg-white dark:bg-slate-800"} ${day.isFirstDay && viewType !== "week" && viewType !== "day" ? "border-l-2 border-slate-600 dark:border-slate-400" : ""} ${isDimmed ? "opacity-40 bg-slate-100 dark:bg-slate-900" : "hover:ring-1 hover:ring-inset hover:ring-slate-300/70 dark:hover:ring-slate-600/70"} ${isTodayCell ? "ring-2 ring-inset ring-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/20" : ""}`}
                            >
                                <div className="flex justify-between items-start mb-1 select-none pointer-events-none z-0">
                                    {day.isFirstDay || day.index === 0 ? (
                                        viewType !== "day" ? (
                                            <span className="bg-slate-700 dark:bg-slate-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm shadow-sm z-10">
                                                {MONTH_NAMES_SHORT[day.month]}
                                            </span>
                                        ) : null
                                    ) : (
                                        <span className="text-[9px] font-semibold text-slate-300 dark:text-slate-500 uppercase mt-1 ml-1">
                                            {WEEK_NAMES[day.dow]}
                                        </span>
                                    )}
                                    <div className="flex items-center gap-1">
                                        {count > 0 && isHighDensity ? <span className="text-[9px] font-bold px-1 rounded-sm bg-indigo-600 text-white">{count}</span> : null}
                                        {isTodayCell ? (
                                            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center mr-0.5">
                                                {day.day}
                                            </span>
                                        ) : (
                                            <span className={`text-sm font-bold mr-1 ${day.isFirstDay ? "text-slate-800 dark:text-slate-100" : "text-slate-400 dark:text-slate-500"}`}>
                                                {day.day}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1 relative w-full z-10">
                                    {isHighDensity ? (
                                        <div className="grid grid-cols-4 gap-1 p-1 content-start">
                                            {dailyActions.slice(0, 20).map((action) => {
                                                const objectiveId = getObjectiveDisplayNumber(action);
                                                const objectiveColors = OBJECTIVE_COLORS[objectiveId] || OBJECTIVE_COLORS[1];
                                                return (
                                                    <div key={`${action.uid}-dot`} className={`w-2 h-2 rounded-full ${objectiveColors.bar} opacity-80`} title={action.title} />
                                                );
                                            })}
                                            {count > 20 ? <div className="col-span-4 text-[9px] text-slate-400 text-center">+{count - 20}</div> : null}
                                        </div>
                                    ) : (
                                        Array.from({ length: maxSlotsPerCell }).map((_, index) => {
                                            const slots = ganttSlotsMap[day.dateKey] || [];
                                            const action = slots[index];
                                            if (!action) {
                                                return null;
                                            }

                                            const objectiveId = getObjectiveDisplayNumber(action);
                                            const statusColor = STATUS_COLORS[action.status] || "bg-slate-400";

                                            return (
                                                <div
                                                    key={index}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        setSelectedAction(action);
                                                    }}
                                                    className={`absolute left-0 right-0 rounded-[2px] cursor-pointer ${statusColor} opacity-90 z-10`}
                                                    style={{
                                                        top: index * densityConfig.barStep,
                                                        height: densityConfig.barHeight,
                                                        borderRadius: action.isStart ? "4px 0 0 4px" : action.isEnd ? "0 4px 4px 0" : "0",
                                                        borderTopLeftRadius: !action.isStart && action.isVisualStart ? "0" : undefined,
                                                        borderBottomLeftRadius: !action.isStart && action.isVisualStart ? "0" : undefined,
                                                        marginLeft: !action.isStart && action.isVisualStart ? "-1px" : "0",
                                                        borderLeft: action.isStart
                                                            ? `3px solid ${objectiveId === 1 ? "#06b6d4" : objectiveId === 2 ? "#6366f1" : "#f59e0b"}`
                                                            : undefined,
                                                    }}
                                                >
                                                    {action.isVisualStart ? (
                                                        <span
                                                            className="text-[9px] text-white font-bold px-1 truncate block drop-shadow-md select-none"
                                                            style={{ lineHeight: `${densityConfig.barHeight}px` }}
                                                        >
                                                            {action.title}
                                                        </span>
                                                    ) : null}
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

            <LinearCalendarActionModal
                action={selectedAction}
                onClose={() => setSelectedAction(null)}
                getObjectiveDisplayNumber={getObjectiveDisplayNumber}
                getCorrectId={getCorrectId}
            />

            <LinearCalendarDayModal
                selectedDay={selectedDay}
                actionsPerDay={actionsPerDay}
                objectives={objectives}
                onClose={() => setSelectedDay(null)}
                getObjectiveDisplayNumber={getObjectiveDisplayNumber}
                getCorrectId={getCorrectId}
            />
        </div>
    );
}
