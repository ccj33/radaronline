// ============================================
// Strategic Report Generator Component
// Gerador de Relatório Estratégico Institucional
// ============================================

import React, { useState } from 'react';
import { X, FileText, Printer, Calendar, Target, Filter, Eye } from 'lucide-react';
import { Action, Objective, Activity, TeamMember } from '../../types';
import { printReport, formatReportDate, formatReportPeriod } from '../../lib/reportUtils';

interface StrategicReportGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  // Dados
  actions: Action[];
  objectives: Objective[];
  activities: Record<number, Activity[]>;
  team: TeamMember[];
  // Contexto
  microName?: string;
  userName?: string;
}

type ReportType = 'consolidated' | 'executive' | 'byObjective';

export function StrategicReportGenerator({
  isOpen,
  onClose,
  actions,
  objectives,
  activities,
  team,
  microName = 'Microrregião',
  userName = 'Gestor'
}: StrategicReportGeneratorProps) {
  const [reportType, setReportType] = useState<ReportType>('consolidated');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  // Métricas calculadas
  const metrics = calculateMetrics(actions, objectives, activities, team);

  const handleGenerate = () => {
    setIsGenerating(true);

    const reportHTML = generateStrategicReportHTML({
      type: reportType,
      metrics,
      actions,
      objectives,
      activities,
      team,
      microName,
      userName
    });

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = reportHTML;

    printReport(tempDiv, `Relatório Estratégico - ${microName}`);

    setTimeout(() => {
      setIsGenerating(false);
    }, 500);
  };

  const reportTypes = [
    {
      id: 'consolidated' as ReportType,
      title: 'Relatório Consolidado',
      description: 'Visão completa com todos os indicadores e ações',
      icon: <FileText className="w-5 h-5" />
    },
    {
      id: 'executive' as ReportType,
      title: 'Sumário Executivo',
      description: 'Versão resumida para tomada de decisão rápida',
      icon: <Target className="w-5 h-5" />
    },
    {
      id: 'byObjective' as ReportType,
      title: 'Por Objetivo',
      description: 'Detalhamento organizado por objetivo estratégico',
      icon: <Filter className="w-5 h-5" />
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-800 to-slate-900 text-white relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-teal-500/20 rounded-full blur-xl" />

          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Exportar Relatório</h2>
                <p className="text-white/70 text-sm mt-1">Gere um documento pronto para impressão</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Preview de Métricas */}
          <div className="mt-6 grid grid-cols-4 gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{metrics.total}</div>
              <div className="text-xs text-white/70">Ações</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-teal-300">{metrics.percentConcluido}%</div>
              <div className="text-xs text-white/70">Conclusão</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{metrics.emAndamento}</div>
              <div className="text-xs text-white/70">Em Exec.</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className={`text-2xl font-bold ${metrics.atrasados > 0 ? 'text-rose-300' : ''}`}>{metrics.atrasados}</div>
              <div className="text-xs text-white/70">Atenção</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[50vh]">
          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 block flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Tipo de Relatório
            </label>
            <div className="space-y-2">
              {reportTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => setReportType(type.id)}
                  className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${reportType === type.id
                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                >
                  <div className={`p-2 rounded-lg ${reportType === type.id
                    ? 'bg-teal-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}>
                    {type.icon}
                  </div>
                  <div>
                    <div className={`font-semibold ${reportType === type.id
                      ? 'text-teal-700 dark:text-teal-300'
                      : 'text-slate-800 dark:text-slate-200'
                      }`}>
                      {type.title}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {type.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Info do Relatório */}
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 mb-2">
              <Calendar className="w-4 h-4" />
              <span className="font-medium">Informações do Relatório</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-slate-500 dark:text-slate-400">Unidade:</div>
              <div className="text-slate-700 dark:text-slate-200 font-medium">{microName}</div>
              <div className="text-slate-500 dark:text-slate-400">Período:</div>
              <div className="text-slate-700 dark:text-slate-200 font-medium">{formatReportPeriod(new Date())}</div>
              <div className="text-slate-500 dark:text-slate-400">Data de Geração:</div>
              <div className="text-slate-700 dark:text-slate-200 font-medium">{formatReportDate(new Date())}</div>
              <div className="text-slate-500 dark:text-slate-400">Objetivos:</div>
              <div className="text-slate-700 dark:text-slate-200 font-medium">{objectives.length}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-slate-200 dark:border-slate-600 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            {isGenerating ? 'Gerando...' : 'Gerar Relatório'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

interface Metrics {
  total: number;
  concluidos: number;
  emAndamento: number;
  naoIniciados: number;
  atrasados: number;
  percentConcluido: number;
  statusData: { name: string; value: number; color: string }[];
  progressoPorObjetivo: { id: number; name: string; fullName: string; progress: number; count: number; completed: number }[];
  upcomingDeadlines: Action[];
  actionsByMember: { name: string; fullName: string; count: number }[];
}

function calculateMetrics(
  actions: Action[],
  objectives: Objective[],
  activities: Record<number, Activity[]>,
  team: TeamMember[]
): Metrics {
  const total = actions.length;
  const concluidos = actions.filter(a => a.status === 'Concluído').length;
  const emAndamento = actions.filter(a => a.status === 'Em Andamento').length;
  const naoIniciados = actions.filter(a => a.status === 'Não Iniciado').length;
  const atrasados = actions.filter(a => a.status === 'Atrasado').length;

  const statusData = [
    { name: 'Concluído', value: concluidos, color: '#10b981' },
    { name: 'Em Andamento', value: emAndamento, color: '#3b82f6' },
    { name: 'Não Iniciado', value: naoIniciados, color: '#94a3b8' },
    { name: 'Atrasado', value: atrasados, color: '#f43f5e' },
  ].filter(d => d.value > 0);

  const progressoPorObjetivo = objectives.map(obj => {
    const actIds = activities[obj.id]?.map(a => a.id) || [];
    const objActions = actions.filter(a => actIds.includes(a.activityId));
    const completed = objActions.filter(a => a.status === 'Concluído').length;
    const percentage = objActions.length > 0
      ? Math.round(objActions.reduce((sum, a) => sum + a.progress, 0) / objActions.length)
      : 0;
    return {
      id: obj.id,
      name: `Obj ${obj.id}`,
      fullName: obj.title,
      progress: percentage,
      count: objActions.length,
      completed
    };
  });

  const today = new Date();
  const upcomingDeadlines = actions.filter(a => {
    if (!a.plannedEndDate && !a.endDate) return false;
    const endDate = new Date(a.plannedEndDate || a.endDate);
    const diffDays = (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 7 && a.status !== 'Concluído';
  }).sort((a, b) => {
    const dateA = new Date(a.plannedEndDate || a.endDate).getTime();
    const dateB = new Date(b.plannedEndDate || b.endDate).getTime();
    return dateA - dateB;
  }).slice(0, 5);

  const actionsByMember = team.map(member => {
    const count = actions.filter(a =>
      a.raci.some(r => r.name === member.name && r.role === 'R') &&
      a.status !== 'Concluído'
    ).length;
    return { name: member.name.split(' ')[0], fullName: member.name, count };
  }).sort((a, b) => b.count - a.count).slice(0, 5);

  const percentConcluido = total > 0 ? Math.round((concluidos / total) * 100) : 0;

  return {
    total,
    concluidos,
    emAndamento,
    naoIniciados,
    atrasados,
    percentConcluido,
    statusData,
    progressoPorObjetivo,
    upcomingDeadlines,
    actionsByMember
  };
}

// ============================================
// GERADOR DE HTML DO RELATÓRIO
// ============================================

// ============================================
// GERADOR DE HTML DO RELATÓRIO
// ============================================

interface ReportGeneratorProps {
  type: ReportType;
  metrics: Metrics;
  actions: Action[];
  objectives: Objective[];
  activities: Record<number, Activity[]>;
  team: TeamMember[];
  microName: string;
  userName: string;
}

function generateStrategicReportHTML(props: ReportGeneratorProps): string {
  const { type, metrics, actions, objectives, activities, microName } = props;
  const now = new Date();

  // --- CÁLCULO DE ÁREAS ENVOLVIDAS ---

  // Agregar todas as tags de todas as ações
  const allTags: { id: string; name: string; color: string; count: number }[] = [];
  actions.forEach(action => {
    action.tags?.forEach(tag => {
      const existing = allTags.find(t => t.id === tag.id);
      if (existing) {
        existing.count++;
      } else {
        allTags.push({ ...tag, count: 1 });
      }
    });
  });
  const topAreas = allTags.sort((a, b) => b.count - a.count).slice(0, 6);

  // Função para obter áreas de um objetivo específico
  const getAreasForObjective = (objId: number): { name: string; color: string }[] => {
    const actIds = activities[objId]?.map(a => a.id) || [];
    const objActions = actions.filter(a => actIds.includes(a.activityId));
    const objTags: { id: string; name: string; color: string }[] = [];
    objActions.forEach(action => {
      action.tags?.forEach(tag => {
        if (!objTags.find(t => t.id === tag.id)) {
          objTags.push(tag);
        }
      });
    });
    return objTags.slice(0, 3);
  };

  // --- SEÇÕES ESTRUTURAIS ---

  // Cabeçalho
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
                    <div class="meta-value">${microName}</div>
                </div>
                <div class="meta-item" style="margin-top: 8px;">
                    <div class="meta-label">Data de Emissão</div>
                    <div class="meta-value">${formatReportDate(now)}</div>
                </div>
            </div>
        </header>
    `;

  // Hero / Título
  const heroHTML = `
        <div class="report-hero">
            <h2 class="hero-title">
                ${type === 'executive' ? 'RELATÓRIO EXECUTIVO' :
      type === 'byObjective' ? 'ANÁLISE POR OBJETIVO' :
        'RELATÓRIO ESTRATÉGICO INSTITUCIONAL'}
            </h2>
            <p class="hero-subtitle">
                Periodo de Referência: ${formatReportPeriod(now)} • 
                ${metrics.total} Ações Monitoradas
            </p>
        </div>
    `;

  // Métricas
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
            <div class="metric-box ${metrics.atrasados > 0 ? 'highlight' : ''}" 
                 style="${metrics.atrasados > 0 ? 'background: #fee2e2; border-color: #fecaca; color: #991b1b;' : ''}">
                <div class="metric-big">${metrics.atrasados}</div>
                <div class="metric-label">Pontos de Atenção</div>
            </div>
        </div>
    `;

  // Alertas (se houver atrasos)
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

  // Seção: Áreas Envolvidas (visão rápida)
  const areasOverviewHTML = topAreas.length > 0 ? `
        <div class="report-section">
            <h3 class="section-title">Áreas Envolvidas</h3>
            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                ${topAreas.map(area => `
                    <div style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <div style="width: 12px; height: 12px; border-radius: 50%; background: ${area.color};"></div>
                        <span style="font-weight: 600; font-size: 11px; color: #334155;">${area.name}</span>
                        <span style="font-size: 10px; color: #94a3b8; background: #f1f5f9; padding: 2px 6px; border-radius: 10px;">${area.count} ações</span>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';

  // Gráfico de Status (Barras CSS)
  const statusChartHTML = `
        <div class="report-section">
            <h3 class="section-title">Distribuição de Status</h3>
            ${metrics.statusData.map(s => {
    const percent = metrics.total > 0 ? Math.round((s.value / metrics.total) * 100) : 0;
    return `
                <div class="bar-chart-row">
                    <div class="bar-label">${s.name}</div>
                    <div class="bar-track">
                        <div class="bar-fill" style="width: ${percent}%; background: ${s.color};"></div>
                    </div>
                    <div class="bar-value">${percent}%</div>
                </div>
                `;
  }).join('')}
        </div>
    `;

  // Próximos Prazos
  const deadlinesHTML = `
        <div class="report-section">
            <h3 class="section-title">Próximos Prazos (7 dias)</h3>
            ${metrics.upcomingDeadlines.length > 0 ? `
                <table style="margin-bottom: 0;">
                    <tbody>
                        ${metrics.upcomingDeadlines.map(a => `
                        <tr>
                            <td style="width: 80px; font-weight: 600; color: #64748b;">${a.plannedEndDate || a.endDate}</td>
                            <td>${a.title}</td>
                            <td style="width: 80px; text-align: right;">
                                <span class="status-pill ${a.status === 'Atrasado' ? 'pill-danger' : 'pill-blue'}">
                                    ${a.status}
                                </span>
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : `
                <div style="padding: 15px; background: #f8fafc; text-align: center; color: #64748b; font-style: italic;">
                    Nenhuma entrega prevista para esta semana.
                </div>
            `}
        </div>
    `;

  // Objetivos Detalhados
  const objectivesHTML = `
        <div class="report-section page-break">
            <h3 class="section-title">Performance por Objetivo Estratégico</h3>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                ${metrics.progressoPorObjetivo.map(obj => {
    const objAreas = getAreasForObjective(obj.id);
    const areasHTML = objAreas.length > 0
      ? objAreas.map(t => `<span style="display: inline-block; padding: 2px 6px; border-radius: 10px; font-size: 8px; font-weight: 600; color: white; background: ${t.color}; margin-right: 3px;">${t.name}</span>`).join('')
      : '';

    return `
                <div class="obj-card">
                    <div class="obj-header">
                        <div class="obj-title">Objetivo ${obj.id}</div>
                        <div style="font-weight: 700; color: var(--primary);">${obj.progress}%</div>
                    </div>
                    <div style="font-size: 11px; margin-bottom: 8px; color: #475569; height: 32px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                        ${obj.fullName}
                    </div>
                    <div class="obj-progress-track">
                        <div class="obj-progress-fill" style="width: ${obj.progress}%"></div>
                    </div>
                    <div class="obj-meta">
                        <span>${obj.completed}/${obj.count} ações</span>
                        <span>${obj.progress === 100 ? 'Finalizado' : 'Em andamento'}</span>
                    </div>
                    ${areasHTML ? `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0;">${areasHTML}</div>` : ''}
                </div>
                `;
  }).join('')}
            </div>
        </div>
    `;

  // Tabela de Ações
  const actionsTableHTML = `
        <div class="report-section page-break">
            <h3 class="section-title">Detalhamento da Carteira de Ações</h3>
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
                    ${actions.slice(0, 30).map(a => {
    const responsible = a.raci.find(r => r.role === 'R')?.name.split(' ')[0] || '-';
    const statusClass =
      a.status === 'Concluído' ? 'pill-success' :
        a.status === 'Em Andamento' ? 'pill-blue' :
          a.status === 'Atrasado' ? 'pill-danger' : 'pill-gray';

    // Renderiza as tags/áreas envolvidas
    const areasHTML = a.tags && a.tags.length > 0
      ? a.tags.slice(0, 2).map(tag =>
        `<span style="display: inline-block; padding: 2px 6px; border-radius: 10px; font-size: 8px; font-weight: 600; color: white; background: ${tag.color}; margin-right: 3px;">${tag.name}</span>`
      ).join('') + (a.tags.length > 2 ? `<span style="font-size: 8px; color: #94a3b8;">+${a.tags.length - 2}</span>` : '')
      : '<span style="color: #94a3b8; font-size: 9px;">-</span>';

    return `
                        <tr>
                            <td style="font-family: monospace; font-weight: 600; color: #64748b;">#${a.id}</td>
                            <td style="max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${a.title}</td>
                            <td style="color: #64748b;">${responsible}</td>
                            <td style="white-space: nowrap;">${areasHTML}</td>
                            <td><span class="status-pill ${statusClass}">${a.status}</span></td>
                            <td style="text-align: center; font-weight: 600;">${a.progress}%</td>
                        </tr>
                        `;
  }).join('')}
                </tbody>
            </table>
            ${actions.length > 30 ? `
                <div style="text-align: center; padding: 10px; color: #64748b; font-style: italic;">
                    + ${actions.length - 30} ações listadas no anexo técnico do sistema.
                </div>
            ` : ''
    }
        </div>
    `;

  // Footer Institucional
  const footerHTML = `
        <footer class="report-footer">
            <div class="footer-left">
                Documento gerado automaticamente pelo sistema RADAR<br>
                Secretaria de Estado da Saúde
            </div>
            <div class="footer-right">
                Este relatório reflete a posição dos dados em ${formatReportDate(now)}<br>
                Autenticação do Sistema: ${Math.random().toString(36).substring(7).toUpperCase()}
            </div>
        </footer>
    `;


  // --- MONTAGEM FINAL ---

  let contentBody = '';

  if (type === 'executive') {
    contentBody = `
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
  else if (type === 'byObjective') {
    contentBody = `
            ${headerHTML}
            ${heroHTML}
            ${metricsHTML}
            ${areasOverviewHTML}
            ${objectivesHTML}
            ${actionsTableHTML}
            ${footerHTML}
  `;
  }
  else {
    // Consolidated (Padrão)
    contentBody = `
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

  return contentBody;
}

export default StrategicReportGenerator;
