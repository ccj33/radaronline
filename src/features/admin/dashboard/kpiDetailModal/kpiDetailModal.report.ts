import { getActionDisplayId } from "../../../../lib/text";
import {
  escapeHtml,
  formatReportDate,
  formatReportPeriod,
  sanitizeCssColor,
} from "../../../../lib/reportUtils";

import { KPI_MODAL_CONFIGS } from "./kpiDetailModal.constants";
import type { KpiDetailModalProps, KpiType } from "./kpiDetailModal.types";

interface GenerateKpiReportParams extends Pick<
  KpiDetailModalProps,
  "objectiveProgress" | "overdueActions" | "microCoverage" | "deadlineHorizon" | "statusData" | "totalActions" | "completedActions" | "completionRate" | "coverageRate"
> {
  type: KpiType;
}

export function generateKpiReportHTML({
  type,
  objectiveProgress = [],
  overdueActions = [],
  microCoverage = [],
  deadlineHorizon = [],
  statusData = [],
  totalActions = 0,
  completedActions = 0,
  completionRate = 0,
  coverageRate = 0,
}: GenerateKpiReportParams) {
  const now = new Date();
  let metricsHTML = "";
  let sectionsHTML = "";

  if (type === "conclusao") {
    metricsHTML = `
      <div class="metrics-grid">
        <div class="metric-card highlight"><div class="metric-value">${completionRate}%</div><div class="metric-label">Taxa de Conclusão</div></div>
        <div class="metric-card"><div class="metric-value">${completedActions}</div><div class="metric-label">Concluídas</div></div>
        <div class="metric-card"><div class="metric-value">${totalActions}</div><div class="metric-label">Total</div></div>
      </div>
    `;
    sectionsHTML =
      objectiveProgress.length > 0
        ? `
      <div class="report-section">
        <h3 class="section-title">Progresso por Objetivo</h3>
        ${objectiveProgress
          .map(
            (objective) => `
          <div class="progress-item">
            <span class="progress-label">${escapeHtml(objective.name)}</span>
            <div class="progress-bar-container"><div class="progress-bar" style="width: ${objective.percentage}%"></div></div>
            <span class="progress-value">${objective.completed}/${objective.total} (${objective.percentage}%)</span>
          </div>
        `,
          )
          .join("")}
      </div>
    `
        : "";
  } else if (type === "risco") {
    metricsHTML = `
      <div class="metrics-grid">
        <div class="metric-card highlight" style="background: linear-gradient(135deg, #f43f5e, #e11d48);"><div class="metric-value">${overdueActions.length}</div><div class="metric-label">Ações Atrasadas</div></div>
      </div>
    `;
    sectionsHTML =
      overdueActions.length > 0
        ? `
      <div class="report-section">
        <h3 class="section-title">Ações Atrasadas</h3>
        <table class="data-table">
          <thead><tr><th>ID</th><th>Título</th><th>Prazo</th><th>Dias Atraso</th></tr></thead>
          <tbody>
            ${overdueActions
              .slice(0, 15)
              .map(
                (action) => `
              <tr>
                <td>#${getActionDisplayId(action.id)}</td>
                <td>${escapeHtml(action.title)}</td>
                <td>${escapeHtml(action.plannedEndDate)}</td>
                <td><span class="status-badge status-atrasado">${action.daysOverdue} dias</span></td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `
        : '<p style="text-align: center; color: #10b981; padding: 24px;">✓ Nenhuma ação atrasada!</p>';
  } else if (type === "cobertura") {
    const withActions = microCoverage.filter((micro) => micro.hasActions).length;
    metricsHTML = `
      <div class="metrics-grid">
        <div class="metric-card highlight"><div class="metric-value">${coverageRate}%</div><div class="metric-label">Cobertura</div></div>
        <div class="metric-card"><div class="metric-value">${withActions}</div><div class="metric-label">Com Ações</div></div>
        <div class="metric-card"><div class="metric-value">${microCoverage.length - withActions}</div><div class="metric-label">Sem Ações</div></div>
      </div>
    `;
    sectionsHTML = `
      <div class="report-section">
        <h3 class="section-title">Status por Microrregião</h3>
        <table class="data-table">
          <thead><tr><th>Microrregião</th><th>Macrorregião</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            ${microCoverage
              .map(
                (micro) => `
              <tr>
                <td>${escapeHtml(micro.nome)}</td>
                <td>${escapeHtml(micro.macrorregiao)}</td>
                <td><span class="status-badge ${micro.hasActions ? "status-concluido" : "status-nao-iniciado"}">${micro.hasActions ? "Com Ações" : "Sem Ações"}</span></td>
                <td>${micro.actionCount}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  } else if (type === "horizonte") {
    const total = deadlineHorizon.reduce((sum, item) => sum + item.value, 0);
    metricsHTML = `
      <div class="metrics-grid">
        <div class="metric-card highlight" style="background: linear-gradient(135deg, #f59e0b, #d97706);"><div class="metric-value">${total}</div><div class="metric-label">Ações no Horizonte</div></div>
      </div>
    `;
    sectionsHTML = `
      <div class="report-section">
        <h3 class="section-title">Distribuição por Prazo</h3>
        ${deadlineHorizon
          .map(
            (item) => `
          <div class="progress-item">
            <span class="progress-label">${escapeHtml(item.name)}</span>
            <div class="progress-bar-container"><div class="progress-bar" style="width: ${total > 0 ? (item.value / total) * 100 : 0}%; background: ${sanitizeCssColor(item.color)}"></div></div>
            <span class="progress-value">${item.value} ações</span>
          </div>
        `,
          )
          .join("")}
      </div>
    `;
  } else if (type === "status") {
    const total = statusData.reduce((sum, item) => sum + item.value, 0);
    metricsHTML = `
      <div class="metrics-grid">
        ${statusData.map((item) => `<div class="metric-card"><div class="metric-value" style="color: ${sanitizeCssColor(item.color)}">${item.value}</div><div class="metric-label">${escapeHtml(item.name)}</div></div>`).join("")}
      </div>
    `;
    sectionsHTML = `
      <div class="report-section">
        <h3 class="section-title">Distribuição por Status</h3>
        ${statusData
          .map(
            (item) => `
          <div class="progress-item">
            <span class="progress-label">${escapeHtml(item.name)}</span>
            <div class="progress-bar-container"><div class="progress-bar" style="width: ${total > 0 ? (item.value / total) * 100 : 0}%; background: ${sanitizeCssColor(item.color)}"></div></div>
            <span class="progress-value">${item.value} (${total > 0 ? Math.round((item.value / total) * 100) : 0}%)</span>
          </div>
        `,
          )
          .join("")}
      </div>
    `;
  }

  return `
    <div class="report-container">
      <header class="report-header">
        <div class="report-logo">
          <div class="report-logo-icon">R</div>
          <div class="report-logo-text">
            <h1>RADAR</h1>
            <p>Painel de Gestão Regional</p>
          </div>
        </div>
        <div class="report-meta">
          <p><strong>Data:</strong> ${escapeHtml(formatReportDate(now))}</p>
          <p><strong>Período:</strong> ${escapeHtml(formatReportPeriod(now))}</p>
        </div>
      </header>
      <div class="report-title-section">
        <h2 class="report-title">${escapeHtml(KPI_MODAL_CONFIGS[type].title)}</h2>
        <p class="report-subtitle">${escapeHtml(KPI_MODAL_CONFIGS[type].subtitle)}</p>
      </div>
      ${metricsHTML}
      ${sectionsHTML}
      <footer class="report-footer">
        <span>Relatório gerado automaticamente pelo sistema RADAR</span>
        <span>Página 1 de 1</span>
      </footer>
    </div>
  `;
}
