import React from "react";
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  Building2,
  CalendarClock,
  ChevronRight,
  Minus,
  Printer,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

import { getMicroregiaoById } from "../../../data/microregioes";
import { getDerivedActionStatus } from "../../../lib/actionPortfolio";
import { formatDateBr } from "../../../lib/date";
import { buildMicroDetailInsights, type MicroAlert } from "../../../lib/microInsights";
import { escapeHtml, formatReportDate, formatReportPeriod, printReport } from "../../../lib/reportUtils";
import { getActionDisplayId } from "../../../lib/text";
import type { Action } from "../../../types";
import type { User } from "../../../types/auth.types";

interface Props {
  isOpen: boolean;
  microId: string | null;
  onClose: () => void;
  onOpenPanel: (microId: string) => void;
  actions?: Action[];
  users?: User[];
}

function responsibleName(action: Action): string | undefined {
  return action.raci?.find((member) => member.role === "R")?.name;
}

function toneClasses(tone: MicroAlert["tone"]) {
  if (tone === "critical") {
    return {
      badge: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-900/40",
      card: "border-rose-200 bg-rose-50/80 dark:border-rose-900/40 dark:bg-rose-900/10",
      ring: "#f43f5e",
      text: "text-rose-600 dark:text-rose-300",
    };
  }

  if (tone === "warning") {
    return {
      badge: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-900/40",
      card: "border-amber-200 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-900/10",
      ring: "#f59e0b",
      text: "text-amber-600 dark:text-amber-300",
    };
  }

  if (tone === "positive") {
    return {
      badge: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-900/40",
      card: "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/40 dark:bg-emerald-900/10",
      ring: "#10b981",
      text: "text-emerald-600 dark:text-emerald-300",
    };
  }

  return {
    badge: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    card: "border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/40",
    ring: "#64748b",
    text: "text-slate-600 dark:text-slate-300",
  };
}

function toneIcon(tone: MicroAlert["tone"]) {
  if (tone === "critical") return <ShieldAlert className="w-4 h-4" />;
  if (tone === "warning") return <AlertTriangle className="w-4 h-4" />;
  if (tone === "positive") return <Sparkles className="w-4 h-4" />;
  return <BarChart3 className="w-4 h-4" />;
}

function trendIcon(direction: "up" | "down" | "stable") {
  if (direction === "up") return <TrendingUp className="w-4 h-4" />;
  if (direction === "down") return <TrendingDown className="w-4 h-4" />;
  return <Minus className="w-4 h-4" />;
}

function statusClasses(status: Action["status"]) {
  if (status === "Conclu\u00eddo") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300";
  if (status === "Atrasado") return "bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300";
  if (status === "Em Andamento") return "bg-sky-100 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300";
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function daysLabel(daysRemaining: number) {
  if (daysRemaining < 0) return `${Math.abs(daysRemaining)}d de atraso`;
  if (daysRemaining === 0) return "vence hoje";
  if (daysRemaining === 1) return "vence amanha";
  return `${daysRemaining} dias`;
}

export default function MicroDetailModal({ isOpen, microId, onClose, onOpenPanel, actions = [], users = [] }: Props) {
  if (!isOpen || !microId) return null;

  const today = new Date();
  const micro = getMicroregiaoById(microId);
  const insights = buildMicroDetailInsights(microId, actions, users, today);
  const healthTone = toneClasses(insights.healthScore.tone);
  const benchmarkTone = toneClasses(
    insights.benchmark?.direction === "above"
      ? "positive"
      : insights.benchmark?.direction === "below"
        ? "warning"
        : "neutral",
  );
  const statusItems = [
    { label: "Concluidas", value: insights.statusBreakdown.completed, color: "bg-emerald-500" },
    { label: "Em andamento", value: insights.statusBreakdown.inProgress, color: "bg-sky-500" },
    { label: "Nao iniciadas", value: insights.statusBreakdown.notStarted, color: "bg-slate-400" },
    { label: "Atrasadas", value: insights.statusBreakdown.late, color: "bg-rose-500" },
  ];

  const handlePrint = () => {
    const alertsHtml = insights.alerts.map((alert) => `<li><strong>${escapeHtml(alert.title)}</strong>: ${escapeHtml(alert.description)}</li>`).join("");
    const upcomingHtml = insights.upcomingActions.length > 0
      ? insights.upcomingActions.map((action) => `<li><strong>${escapeHtml(action.displayId)}</strong> - ${escapeHtml(action.title)} - ${escapeHtml(action.responsible || "Sem responsavel")} - ${escapeHtml(formatDateBr(action.plannedEndDate))} - ${escapeHtml(daysLabel(action.daysRemaining))}</li>`).join("")
      : "<li>Nenhuma entrega critica nos proximos 7 dias.</li>";
    const focusHtml = insights.focusActions.length > 0
      ? insights.focusActions.map((action) => {
        const status = getDerivedActionStatus(action, today);
        return `<li><strong>${escapeHtml(getActionDisplayId(action.id))}</strong> - ${escapeHtml(action.title)} - ${escapeHtml(status)} - ${escapeHtml(responsibleName(action) || "Sem responsavel")}</li>`;
      }).join("")
      : "<li>Nenhuma acao em foco encontrada.</li>";

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = `
      <div class="report-page">
        <header class="report-header">
          <div class="brand"><div class="brand-logo">R</div><div class="brand-text"><h1>RADAR</h1><p>Leitura executiva da micro</p></div></div>
          <div class="meta-info">
            <div class="meta-item"><div class="meta-label">Gerado em</div><div class="meta-value">${escapeHtml(formatReportDate(today))}</div></div>
            <div class="meta-item"><div class="meta-label">Periodo</div><div class="meta-value">${escapeHtml(formatReportPeriod(today))}</div></div>
          </div>
        </header>
        <section class="report-hero"><div class="hero-title">${escapeHtml(micro?.nome || "Microrregiao")}</div><div class="hero-subtitle">${escapeHtml(micro?.macrorregiao || "")}</div></section>
        <section class="metrics-container">
          <div class="metric-card"><div class="metric-value">${insights.healthScore.score}</div><div class="metric-label">Score de saude</div></div>
          <div class="metric-card"><div class="metric-value">${insights.averageProgress}%</div><div class="metric-label">Progresso medio</div></div>
          <div class="metric-card"><div class="metric-value">${insights.completionRate}%</div><div class="metric-label">Taxa de conclusao</div></div>
          <div class="metric-card"><div class="metric-value">${insights.responsibleCoverage}%</div><div class="metric-label">Cobertura de responsaveis</div></div>
        </section>
        <h3 class="section-title">O que fazer agora</h3>
        <p><strong>${escapeHtml(insights.recommendation.title)}</strong></p>
        <p style="color:#64748b;margin-top:8px;">${escapeHtml(insights.recommendation.description)}</p>
        <p style="color:#64748b;margin-top:8px;">Tendencia: ${escapeHtml(insights.trend.label)}. ${escapeHtml(insights.trend.summary)}</p>
        <h3 class="section-title">Alertas automaticos</h3>
        <ul style="padding-left:18px;line-height:1.7;">${alertsHtml}</ul>
        <h3 class="section-title">Proximas entregas</h3>
        <ul style="padding-left:18px;line-height:1.7;">${upcomingHtml}</ul>
        <h3 class="section-title">Carteira em foco</h3>
        <ul style="padding-left:18px;line-height:1.7;">${focusHtml}</ul>
      </div>
    `;
    printReport(tempDiv, `Leitura executiva - ${micro?.nome || "Microrregiao"}`);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-start sm:items-center sm:justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full h-full sm:w-[720px] lg:w-[820px] sm:max-h-[88vh] bg-white dark:bg-slate-900 rounded-none sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden" style={{ maxHeight: "100dvh" }}>
        <div className="relative border-b border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.22),transparent_38%),radial-gradient(circle_at_left,rgba(15,23,42,0.14),transparent_42%)]" />
          <div className="relative px-4 sm:px-6 py-4 sm:py-5 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 flex items-center justify-center shadow-sm">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">{micro?.nome || "Microrregiao"}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{micro?.macrorregiao} {micro?.urs ? `- URS ${micro.urs}` : ""}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${healthTone.badge}`}>
                    <Target className="w-3.5 h-3.5" />
                    Score {insights.healthScore.score} - {insights.healthScore.label}
                  </span>
                  {insights.benchmark && (
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${benchmarkTone.badge}`}>
                      <BarChart3 className="w-3.5 h-3.5" />
                      Ranking {insights.benchmark.rank}/{insights.benchmark.totalPeers} na {insights.benchmark.macroName}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handlePrint} title="Imprimir leitura executiva" className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-teal-600 transition-colors"><Printer className="w-5 h-5" /></button>
              <button onClick={onClose} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500"><X className="w-5 h-5" /></button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5 bg-slate-50/60 dark:bg-slate-900">
          <div className="grid gap-4 lg:grid-cols-[280px,1fr]">
            <section className={`rounded-2xl border p-4 sm:p-5 ${healthTone.card}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Saude da micro</div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{insights.healthScore.summary}</p>
                </div>
                <div className="w-24 h-24 rounded-full p-2 shrink-0 shadow-inner" style={{ background: `conic-gradient(${healthTone.ring} ${insights.healthScore.score}%, rgba(148,163,184,0.18) 0)` }}>
                  <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex flex-col items-center justify-center text-center">
                    <div className="text-2xl font-black text-slate-900 dark:text-slate-50">{insights.healthScore.score}</div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">score</div>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/70 dark:border-slate-800">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl ${healthTone.badge}`}>{trendIcon(insights.trend.direction)}</span>
                  {insights.trend.label}
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{insights.trend.summary}</p>
              </div>
            </section>

            <section className={`rounded-2xl border p-4 sm:p-5 ${toneClasses(insights.recommendation.tone).card}`}>
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 inline-flex items-center justify-center w-10 h-10 rounded-2xl ${toneClasses(insights.recommendation.tone).badge}`}>{toneIcon(insights.recommendation.tone)}</span>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">O que fazer agora</div>
                  <h4 className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-50">{insights.recommendation.title}</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{insights.recommendation.description}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/80 bg-white/80 dark:border-slate-800 dark:bg-slate-900/60 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Benchmark macro</div>
                  {insights.benchmark ? (
                    <>
                      <div className={`mt-2 text-2xl font-black ${benchmarkTone.text}`}>{insights.benchmark.differenceFromMacro > 0 ? "+" : ""}{insights.benchmark.differenceFromMacro}</div>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        {insights.benchmark.direction === "above" ? "Acima" : insights.benchmark.direction === "below" ? "Abaixo" : "Alinhada"} da media da {insights.benchmark.macroName}.
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Ainda nao ha base suficiente para comparacao.</p>
                  )}
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/80 dark:border-slate-800 dark:bg-slate-900/60 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Destaque operacional</div>
                  {insights.topPerformer ? (
                    <>
                      <div className="mt-2 flex items-center gap-2 text-slate-900 dark:text-slate-50"><Award className="w-4 h-4 text-amber-500" /><span className="font-bold">{insights.topPerformer.name}</span></div>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{insights.topPerformer.completedCount} entregas concluidas e {insights.topPerformer.assignedCount} acoes acompanhadas.</p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Ainda nao ha responsavel com historico suficiente para destaque.</p>
                  )}
                </div>
              </div>
            </section>
          </div>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4 shadow-sm"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Carteira</div><div className="mt-3 text-2xl font-black text-slate-900 dark:text-slate-50">{insights.totalActions}</div><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{insights.completionRate}% da carteira concluida</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4 shadow-sm"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Progresso medio</div><div className="mt-3 text-2xl font-black text-slate-900 dark:text-slate-50">{insights.averageProgress}%</div><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{insights.statusBreakdown.completed} concluidas e {insights.statusBreakdown.late} atrasadas</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4 shadow-sm"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Equipe</div><div className="mt-3 text-2xl font-black text-slate-900 dark:text-slate-50">{insights.activeUsers}/{insights.totalUsers}</div><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">usuarios ativos - {insights.responsibleCoverage}% com responsavel</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4 shadow-sm"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Entrega recente</div><div className="mt-3 text-2xl font-black text-slate-900 dark:text-slate-50">{insights.trend.currentPeriodCompleted}</div><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">concluidas nos ultimos 30 dias</p></div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4 sm:p-5 shadow-sm">
            <h4 className="text-base font-bold text-slate-900 dark:text-slate-50">Alertas automaticos</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">Aqui o modal tenta orientar a decisao, nao so mostrar inventario.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {insights.alerts.map((alert) => (
                <div key={alert.id} className={`rounded-2xl border p-4 ${toneClasses(alert.tone).card}`}>
                  <div className="flex items-start gap-3">
                    <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${toneClasses(alert.tone).badge}`}>{toneIcon(alert.tone)}</span>
                    <div><div className="font-semibold text-slate-900 dark:text-slate-50">{alert.title}</div><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{alert.description}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[1.05fr,0.95fr]">
            <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4 sm:p-5 shadow-sm">
              <div className="flex items-center gap-2"><CalendarClock className="w-4 h-4 text-teal-600" /><h4 className="text-base font-bold text-slate-900 dark:text-slate-50">Proximas entregas</h4></div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">O que pode virar atraso se nao receber acompanhamento nesta semana.</p>
              <div className="mt-4 space-y-3">
                {insights.upcomingActions.length > 0 ? insights.upcomingActions.map((action) => (
                  <div key={action.uid} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/80 dark:bg-slate-950/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300 px-2 py-0.5 text-[11px] font-bold">{action.displayId}</span>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClasses(action.status)}`}>{action.status}</span>
                        </div>
                        <div className="mt-2 font-semibold text-slate-900 dark:text-slate-50">{action.title}</div>
                        <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">{action.responsible || "Sem responsavel"} - prazo {formatDateBr(action.plannedEndDate)}</div>
                      </div>
                      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-right shadow-sm">
                        <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">janela</div>
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-50">{daysLabel(action.daysRemaining)}</div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-sm text-slate-500 dark:text-slate-400">Nenhuma entrega critica nos proximos 7 dias.</div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4 sm:p-5 shadow-sm">
              <div className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-teal-600" /><h4 className="text-base font-bold text-slate-900 dark:text-slate-50">Distribuicao da carteira</h4></div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Como a carga desta micro esta distribuida hoje.</p>
              <div className="mt-4 space-y-4">
                {statusItems.map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-sm"><span className="font-medium text-slate-700 dark:text-slate-300">{item.label}</span><span className="text-slate-500 dark:text-slate-400">{item.value}</span></div>
                    <div className="mt-2 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className={`h-full rounded-full ${item.color}`} style={{ width: `${insights.totalActions > 0 ? (item.value / insights.totalActions) * 100 : 0}%` }} /></div>
                  </div>
                ))}
              </div>
              <div className={`mt-5 rounded-2xl border p-4 ${benchmarkTone.card}`}>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Leitura comparativa</div>
                <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                  {insights.benchmark
                    ? `${insights.benchmark.direction === "above" ? "Acima" : insights.benchmark.direction === "below" ? "Abaixo" : "Alinhada"} da media da ${insights.benchmark.macroName}. Progresso medio da macro: ${insights.benchmark.averageProgress}%.`
                    : "Ainda nao ha base suficiente para comparar esta micro com as demais da mesma macro."}
                </p>
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-teal-600" /><h4 className="text-base font-bold text-slate-900 dark:text-slate-50">Carteira em foco</h4></div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">As acoes que merecem acompanhamento imediato nesta micro.</p>
            <div className="mt-4 grid gap-3">
              {insights.focusActions.length > 0 ? insights.focusActions.map((action) => {
                const status = getDerivedActionStatus(action, today);
                return (
                  <div key={action.uid} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/80 dark:bg-slate-950/40">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900 px-2 py-0.5 text-[11px] font-bold">{getActionDisplayId(action.id)}</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClasses(status)}`}>{status}</span>
                    </div>
                    <div className="mt-2 font-semibold text-slate-900 dark:text-slate-50">{action.title}</div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                      <span>{responsibleName(action) || "Sem responsavel"}</span>
                      <span>progresso {action.progress}%</span>
                      <span>{action.plannedEndDate ? `prazo ${formatDateBr(action.plannedEndDate)}` : "prazo nao definido"}</span>
                    </div>
                  </div>
                );
              }) : (
                <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-sm text-slate-500 dark:text-slate-400">Nenhuma acao em foco encontrada.</div>
              )}
            </div>
          </section>
        </div>

        <div className="p-4 border-t bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-800 flex items-center gap-3 flex-shrink-0" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}>
          <button onClick={() => { if (microId) onOpenPanel(microId); }} className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 shadow-sm">
            Abrir painel da micro
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="py-3 px-4 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-300">Fechar</button>
        </div>
      </div>
    </div>
  );
}
