import React from 'react';
import { X, Building2, Activity, ChevronRight, Printer } from 'lucide-react';
import { getMicroregiaoById } from '../../../data/microregioes';
import { Action } from '../../../types';
import { printReport, formatReportDate, formatReportPeriod } from '../../../lib/reportUtils';

interface Props {
  isOpen: boolean;
  microId: string | null;
  onClose: () => void;
  onOpenPanel: (microId: string) => void;
  actions?: Action[];
  users?: any[];
}

export default function MicroDetailModal({ isOpen, microId, onClose, onOpenPanel, actions = [], users = [] }: Props) {
  if (!isOpen || !microId) return null;
  const micro = getMicroregiaoById(microId);
  const microActions = actions.filter(a => a.microregiaoId === microId);
  const usersCount = users.filter(u => u.microregiaoId === microId).length;
  const progressoMedio = microActions.length > 0 ? Math.round(microActions.reduce((s, a) => s + (a.progress || 0), 0) / microActions.length) : 0;

  // Contagem por status
  const statusCounts = {
    concluido: microActions.filter(a => a.status === 'Concluído').length,
    emAndamento: microActions.filter(a => a.status === 'Em Andamento').length,
    naoIniciado: microActions.filter(a => a.status === 'Não Iniciado').length,
    atrasado: microActions.filter(a => a.status === 'Atrasado').length,
  };

  // Função de impressão do relatório
  const handlePrint = () => {
    const now = new Date();
    const reportHTML = `
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
            <p><strong>Data:</strong> ${formatReportDate(now)}</p>
            <p><strong>Período:</strong> ${formatReportPeriod(now)}</p>
          </div>
        </header>

        <div class="report-title-section">
          <h2 class="report-title">${micro?.nome || 'Microrregião'}</h2>
          <p class="report-subtitle">${micro?.macrorregiao || ''}</p>
        </div>

        <div class="metrics-grid">
          <div class="metric-card highlight">
            <div class="metric-value">${progressoMedio}%</div>
            <div class="metric-label">Progresso Médio</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${microActions.length}</div>
            <div class="metric-label">Total de Ações</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${usersCount}</div>
            <div class="metric-label">Usuários</div>
          </div>
        </div>

        <div class="report-section">
          <h3 class="section-title">Distribuição por Status</h3>
          <div class="progress-item">
            <span class="progress-label">Concluídas</span>
            <div class="progress-bar-container"><div class="progress-bar" style="width: ${microActions.length > 0 ? (statusCounts.concluido / microActions.length * 100) : 0}%; background: #10b981"></div></div>
            <span class="progress-value">${statusCounts.concluido}</span>
          </div>
          <div class="progress-item">
            <span class="progress-label">Em Andamento</span>
            <div class="progress-bar-container"><div class="progress-bar" style="width: ${microActions.length > 0 ? (statusCounts.emAndamento / microActions.length * 100) : 0}%; background: #3b82f6"></div></div>
            <span class="progress-value">${statusCounts.emAndamento}</span>
          </div>
          <div class="progress-item">
            <span class="progress-label">Não Iniciadas</span>
            <div class="progress-bar-container"><div class="progress-bar" style="width: ${microActions.length > 0 ? (statusCounts.naoIniciado / microActions.length * 100) : 0}%; background: #94a3b8"></div></div>
            <span class="progress-value">${statusCounts.naoIniciado}</span>
          </div>
          <div class="progress-item">
            <span class="progress-label">Atrasadas</span>
            <div class="progress-bar-container"><div class="progress-bar" style="width: ${microActions.length > 0 ? (statusCounts.atrasado / microActions.length * 100) : 0}%; background: #f43f5e"></div></div>
            <span class="progress-value">${statusCounts.atrasado}</span>
          </div>
        </div>

        ${microActions.length > 0 ? `
        <div class="report-section">
          <h3 class="section-title">Ações (${microActions.length})</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Status</th>
                <th>Progresso</th>
              </tr>
            </thead>
            <tbody>
              ${microActions.slice(0, 15).map(a => `
                <tr>
                  <td>${a.title || 'Ação'}</td>
                  <td><span class="status-badge status-${a.status === 'Concluído' ? 'concluido' : a.status === 'Em Andamento' ? 'em-andamento' : a.status === 'Atrasado' ? 'atrasado' : 'nao-iniciado'}">${a.status || '-'}</span></td>
                  <td>${a.progress || 0}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ${microActions.length > 15 ? `<p style="text-align: center; color: #64748b; font-size: 11px; margin-top: 8px;">... e mais ${microActions.length - 15} ações</p>` : ''}
        </div>
        ` : '<p style="text-align: center; color: #64748b; padding: 24px;">Nenhuma ação encontrada nesta microrregião.</p>'}

        <footer class="report-footer">
          <span>Relatório gerado automaticamente pelo sistema RADAR</span>
          <span>Página 1 de 1</span>
        </footer>
      </div>
    `;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = reportHTML;
    printReport(tempDiv, `Relatório - ${micro?.nome || 'Microrregião'}`);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-start sm:items-center sm:justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full h-full sm:w-[520px] sm:max-h-[80vh] bg-white dark:bg-slate-800 rounded-none sm:rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col" style={{ maxHeight: '100dvh' }}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{micro?.nome || 'Microrregião'}</h3>
              <div className="text-xs text-slate-500">{micro?.macrorregiao}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrint}
              title="Imprimir relatório"
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-teal-600 transition-colors"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>
        <div className="p-4 space-y-4 overflow-auto flex-1" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-500">Ações</div>
              <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{microActions.length}</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-500">Usuários</div>
              <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{usersCount}</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-500">Progresso</div>
              <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{microActions.length > 0 ? `${progressoMedio}%` : '-'}</div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Ações recentes</h4>
            {microActions.slice(0, 8).map(a => (
              <div key={a.id} className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg mb-2">
                <div className="w-9 h-9 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-800 dark:text-slate-100 text-sm">{a.title || 'Ação'}</div>
                  <div className="text-xs text-slate-500">{a.status || ''}</div>
                </div>
              </div>
            ))}
            {microActions.length === 0 && (
              <div className="text-sm text-slate-500">Nenhuma ação encontrada</div>
            )}
          </div>
        </div>

        <div className="p-4 border-t bg-slate-50 dark:bg-slate-800/30 flex items-center gap-3 flex-shrink-0" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
          <button onClick={() => { if (microId) onOpenPanel(microId); }} className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium flex items-center justify-center gap-2">
            Abrir painel
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="py-3 px-4 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">Fechar</button>
        </div>
      </div>
    </div>
  );
}

