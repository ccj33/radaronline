import {
    escapeHtml,
    formatReportDate,
    formatReportPeriod,
    sanitizeCssColor,
} from "../../../lib/reportUtils";
import type { GenerateStrategicReportHtmlParams } from "./strategicReport.types";

interface ReportAreaTag {
    color: string;
    count: number;
    id: string;
    name: string;
}

export function generateStrategicReportHTML({
    actions,
    activities,
    metrics,
    microName,
    type,
}: GenerateStrategicReportHtmlParams): string {
    const now = new Date();
    const allTags: ReportAreaTag[] = [];
    const safeMicroName = escapeHtml(microName);

    actions.forEach((action) => {
        action.tags?.forEach((tag) => {
            const existing = allTags.find((currentTag) => currentTag.id === tag.id);
            if (existing) {
                existing.count += 1;
            } else {
                allTags.push({ ...tag, count: 1 });
            }
        });
    });

    const topAreas = allTags.sort((tagA, tagB) => tagB.count - tagA.count).slice(0, 6);

    const getAreasForObjective = (objectiveId: number): Array<{ color: string; name: string }> => {
        const activityIds = activities[objectiveId]?.map((activity) => activity.id) || [];
        const objectiveActions = actions.filter((action) => activityIds.includes(action.activityId));
        const objectiveTags: Array<{ color: string; id: string; name: string }> = [];

        objectiveActions.forEach((action) => {
            action.tags?.forEach((tag) => {
                if (!objectiveTags.find((currentTag) => currentTag.id === tag.id)) {
                    objectiveTags.push(tag);
                }
            });
        });

        return objectiveTags.slice(0, 3);
    };

    const headerHTML = `
        <header class="report-header">
            <div class="brand">
                <div class="brand-logo">R</div>
                <div class="brand-text">
                    <h1>RADAR</h1>
                    <p>Painel de Gestão Regional</p>
                </div>
            </div>
            <div class="meta-info">
                <div class="meta-item">
                    <div class="meta-label">Unidade Gestora</div>
                    <div class="meta-value">${safeMicroName}</div>
                </div>
                <div class="meta-item" style="margin-top: 8px;">
                    <div class="meta-label">Data de Emissão</div>
                    <div class="meta-value">${escapeHtml(formatReportDate(now))}</div>
                </div>
            </div>
        </header>
    `;

    const heroHTML = `
        <div class="report-hero">
            <h2 class="hero-title">
                ${type === "executive" ? "RELATÓRIO EXECUTIVO" : type === "byObjective" ? "ANÁLISE POR OBJETIVO" : "RELATÓRIO ESTRATÉGICO INSTITUCIONAL"}
            </h2>
            <p class="hero-subtitle">
                Período de Referência: ${escapeHtml(formatReportPeriod(now))} •
                ${metrics.total} Ações Monitoradas
            </p>
        </div>
    `;

    const metricsHTML = `
        <div class="metrics-container">
            <div class="metric-box cursor-default">
                <div class="metric-big">${metrics.total}</div>
                <div class="metric-label">Total de Ações</div>
            </div>
            <div class="metric-box highlight">
                <div class="metric-big">${metrics.percentConcluido}%</div>
                <div class="metric-label">Conclusão Geral</div>
            </div>
            <div class="metric-box">
                <div class="metric-big">${metrics.emAndamento}</div>
                <div class="metric-label">Em Execução</div>
            </div>
            <div class="metric-box ${metrics.atrasados > 0 ? "highlight" : ""}" style="${metrics.atrasados > 0 ? "background: #fee2e2; border-color: #fecaca; color: #991b1b;" : ""}">
                <div class="metric-big">${metrics.atrasados}</div>
                <div class="metric-label">Pontos de Atenção</div>
            </div>
        </div>
    `;

    const alertsHTML = metrics.atrasados > 0 ? `
        <div class="alert-box alert-danger">
            <div style="font-size: 18px;">⚠️</div>
            <div>
                <div style="font-weight: 700; text-transform: uppercase; font-size: 11px;">Atenção Requerida</div>
                <div>Identificamos <strong>${metrics.atrasados} ações com cronograma impactado</strong>. Recomendamos revisão imediata dos prazos e alinhamento com os responsáveis.</div>
            </div>
        </div>
    ` : `
        <div class="alert-box alert-success">
            <div style="font-size: 18px;">✓</div>
            <div>
                <div style="font-weight: 700; text-transform: uppercase; font-size: 11px;">Situação Regular</div>
                <div>Todas as ações do cronograma estão seguindo conforme o planejado. Não há atrasos críticos no momento.</div>
            </div>
        </div>
    `;

    const areasOverviewHTML = topAreas.length > 0 ? `
        <div class="report-section">
            <h3 class="section-title">Áreas Envolvidas</h3>
            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                ${topAreas.map((area) => `
                    <div style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <div style="width: 12px; height: 12px; border-radius: 50%; background: ${sanitizeCssColor(area.color)};"></div>
                        <span style="font-weight: 600; font-size: 11px; color: #334155;">${escapeHtml(area.name)}</span>
                        <span style="font-size: 10px; color: #94a3b8; background: #f1f5f9; padding: 2px 6px; border-radius: 10px;">${area.count} ações</span>
                    </div>
                `).join("")}
            </div>
        </div>
    ` : "";

    const statusChartHTML = `
        <div class="report-section">
            <h3 class="section-title">Distribuição de Status</h3>
            ${metrics.statusData.map((status) => {
                const percent = metrics.total > 0 ? Math.round((status.value / metrics.total) * 100) : 0;
                return `
                    <div class="bar-chart-row">
                        <div class="bar-label">${escapeHtml(status.name)}</div>
                        <div class="bar-track">
                            <div class="bar-fill" style="width: ${percent}%; background: ${sanitizeCssColor(status.color)};"></div>
                        </div>
                        <div class="bar-value">${percent}%</div>
                    </div>
                `;
            }).join("")}
        </div>
    `;

    const deadlinesHTML = `
        <div class="report-section">
            <h3 class="section-title">Próximos Prazos (7 dias)</h3>
            ${metrics.upcomingDeadlines.length > 0 ? `
                <table style="margin-bottom: 0;">
                    <tbody>
                        ${metrics.upcomingDeadlines.map((action) => `
                            <tr>
                                <td style="width: 80px; font-weight: 600; color: #64748b;">${escapeHtml(action.plannedEndDate || action.endDate)}</td>
                                <td>${escapeHtml(action.title)}</td>
                                <td style="width: 80px; text-align: right;">
                                    <span class="status-pill ${action.status === "Atrasado" ? "pill-danger" : "pill-blue"}">
                                        ${escapeHtml(action.status)}
                                    </span>
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            ` : `
                <div style="padding: 15px; background: #f8fafc; text-align: center; color: #64748b; font-style: italic;">
                    Nenhuma entrega prevista para esta semana.
                </div>
            `}
        </div>
    `;

    const objectivesHTML = `
        <div class="report-section page-break">
            <h3 class="section-title">Performance por Objetivo Estratégico</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                ${metrics.progressoPorObjetivo.map((objective) => {
                    const objectiveAreas = getAreasForObjective(objective.id);
                    const areasHTML = objectiveAreas.length > 0
                        ? objectiveAreas
                              .map((tag) => `<span style="display: inline-block; padding: 2px 6px; border-radius: 10px; font-size: 8px; font-weight: 600; color: white; background: ${sanitizeCssColor(tag.color)}; margin-right: 3px;">${escapeHtml(tag.name)}</span>`)
                              .join("")
                        : "";

                    return `
                        <div class="obj-card">
                            <div class="obj-header">
                                <div class="obj-title">Objetivo ${objective.displayOrder}</div>
                                <div style="font-weight: 700; color: var(--primary);">${objective.progress}%</div>
                            </div>
                            <div style="font-size: 11px; margin-bottom: 8px; color: #475569; height: 32px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                                ${escapeHtml(objective.fullName)}
                            </div>
                            <div class="obj-progress-track">
                                <div class="obj-progress-fill" style="width: ${objective.progress}%"></div>
                            </div>
                            <div class="obj-meta">
                                <span>${objective.completed}/${objective.count} ações</span>
                                <span>${objective.progress === 100 ? "Finalizado" : "Em andamento"}</span>
                            </div>
                            ${areasHTML ? `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0;">${areasHTML}</div>` : ""}
                        </div>
                    `;
                }).join("")}
            </div>
        </div>
    `;

    const actionsTableHTML = `
        <div class="report-section page-break">
            <h3 class="section-title">Detalhamento do Plano de Ações</h3>
            <table>
                <thead>
                    <tr>
                        <th style="width: 50px;">ID</th>
                        <th>Ação / Iniciativa</th>
                        <th style="width: 100px;">Responsável</th>
                        <th style="width: 120px;">Áreas</th>
                        <th style="width: 80px;">Status</th>
                        <th style="width: 50px; text-align: center;">%</th>
                    </tr>
                </thead>
                <tbody>
                    ${actions.slice(0, 30).map((action) => {
                        const responsible = action.raci.find((entry) => entry.role === "R")?.name.split(" ")[0] || "-";
                        const statusClass = action.status === "Concluído"
                            ? "pill-success"
                            : action.status === "Em Andamento"
                                ? "pill-blue"
                                : action.status === "Atrasado"
                                    ? "pill-danger"
                                    : "pill-gray";
                        const areasHTML = action.tags && action.tags.length > 0
                            ? action.tags
                                  .slice(0, 2)
                                  .map((tag) => `<span style="display: inline-block; padding: 2px 6px; border-radius: 10px; font-size: 8px; font-weight: 600; color: white; background: ${sanitizeCssColor(tag.color)}; margin-right: 3px;">${escapeHtml(tag.name)}</span>`)
                                  .join("") + (action.tags.length > 2 ? `<span style="font-size: 8px; color: #94a3b8;">+${action.tags.length - 2}</span>` : "")
                            : '<span style="color: #94a3b8; font-size: 9px;">-</span>';

                        return `
                            <tr>
                                <td style="font-family: monospace; font-weight: 600; color: #64748b;">#${action.id}</td>
                                <td style="max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(action.title)}</td>
                                <td style="color: #64748b;">${escapeHtml(responsible)}</td>
                                <td style="white-space: nowrap;">${areasHTML}</td>
                                <td><span class="status-pill ${statusClass}">${escapeHtml(action.status)}</span></td>
                                <td style="text-align: center; font-weight: 600;">${action.progress}%</td>
                            </tr>
                        `;
                    }).join("")}
                </tbody>
            </table>
            ${actions.length > 30 ? `
                <div style="text-align: center; padding: 10px; color: #64748b; font-style: italic;">
                    + ${actions.length - 30} ações listadas no anexo técnico do sistema.
                </div>
            ` : ""}
        </div>
    `;

    const footerHTML = `
        <footer class="report-footer">
            <div class="footer-left">
                Documento gerado automaticamente pelo sistema RADAR<br>
                Secretaria de Estado da Saúde
            </div>
            <div class="footer-right">
                Este relatório reflete a posição dos dados em ${escapeHtml(formatReportDate(now))}<br>
                Autenticação do Sistema: ${Math.random().toString(36).substring(7).toUpperCase()}
            </div>
        </footer>
    `;

    if (type === "executive") {
        return `
            ${headerHTML}
            ${heroHTML}
            ${metricsHTML}
            ${alertsHTML}
            ${areasOverviewHTML}
            <div class="two-cols" style="margin-top: 30px;">
                <div>${statusChartHTML}</div>
                <div>${deadlinesHTML}</div>
            </div>
            ${objectivesHTML}
            ${footerHTML}
        `;
    }

    if (type === "byObjective") {
        return `
            ${headerHTML}
            ${heroHTML}
            ${metricsHTML}
            ${areasOverviewHTML}
            ${objectivesHTML}
            ${actionsTableHTML}
            ${footerHTML}
        `;
    }

    return `
        ${headerHTML}
        ${heroHTML}
        ${metricsHTML}
        ${alertsHTML}
        ${areasOverviewHTML}
        <div class="two-cols">
            <div>${statusChartHTML}</div>
            <div>${deadlinesHTML}</div>
        </div>
        ${objectivesHTML}
        ${actionsTableHTML}
        ${footerHTML}
    `;
}
