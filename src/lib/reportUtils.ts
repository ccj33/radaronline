// ============================================
// Report Utilities - Radar
// Utilitários para geração de relatórios A4
// ============================================

/**
 * Formata data para exibição em relatórios
 */
export function formatReportDate(date: Date = new Date()): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formata período para exibição em relatórios
 */
export function formatReportPeriod(date: Date = new Date()): string {
  return date.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Configurações de impressão A4
 */
export const PRINT_CONFIG = {
  pageSize: 'A4',
  orientation: 'portrait',
  margins: {
    top: '15mm',
    right: '15mm',
    bottom: '15mm',
    left: '15mm'
  }
};

/**
 * Interface para dados do relatório
 */
export interface ReportData {
  title: string;
  subtitle?: string;
  period?: string;
  generatedAt: Date;
  metrics?: {
    label: string;
    value: string | number;
    color?: string;
  }[];
  sections?: {
    title: string;
    items: {
      label: string;
      value: string | number;
      percentage?: number;
      color?: string;
    }[];
  }[];
  footer?: string;
}

export function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeCssColor(value: string | null | undefined, fallback = '#0f766e'): string {
  const normalized = String(value ?? '').trim();
  if (
    normalized &&
    /^(#[0-9a-fA-F]{3,8}|(?:rgb|rgba|hsl|hsla)\([0-9.,%\s]+\)|[a-zA-Z]+)$/.test(normalized)
  ) {
    return normalized;
  }

  return fallback;
}

/**
 * Cria uma nova janela com o conteúdo do relatório para impressão
 */
/**
 * Cria uma nova janela com o conteúdo do relatório para impressão
 */
export function printReport(contentElement: HTMLElement, reportTitle: string = 'Relatório'): void {
  const printWindow = window.open('', '_blank', 'width=1000,height=800');

  if (!printWindow) {
    alert('Por favor, permita pop-ups para imprimir o relatório.');
    return;
  }

  const printContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${escapeHtml(reportTitle)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        @page {
          size: A4;
          margin: 10mm;
        }

        :root {
            --primary: #0f766e; /* teal-700 */
            --primary-light: #ccfbf1; /* teal-100 */
            --text-main: #1e293b; /* slate-800 */
            --text-muted: #64748b; /* slate-500 */
            --border: #e2e8f0; /* slate-200 */
            --bg-subtle: #f8fafc; /* slate-50 */
        }
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        body {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          font-size: 11px;
          line-height: 1.4;
          color: var(--text-main);
          background: white;
        }
        
        .report-page {
          width: 210mm;
          min-height: 297mm;
          padding: 10mm 15mm;
          margin: 0 auto;
          background: white;
          position: relative;
        }

        /* --- HEADER --- */
        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 20px;
          border-bottom: 2px solid var(--primary);
          margin-bottom: 30px;
        }

        .brand {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .brand-logo {
            width: 50px;
            height: 50px;
            background: var(--primary);
            color: white;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 24px;
        }

        .brand-text h1 {
            font-size: 22px;
            color: var(--text-main);
            letter-spacing: -0.5px;
            line-height: 1;
        }

        .brand-text p {
            color: var(--text-muted);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 4px;
        }

        .meta-info {
            text-align: right;
        }

        .meta-item {
            margin-bottom: 4px;
        }

        .meta-label {
            color: var(--text-muted);
            font-size: 10px;
            text-transform: uppercase;
        }

        .meta-value {
            font-weight: 600;
            font-size: 12px;
        }

        /* --- TITLE HERO --- */
        .report-hero {
            text-align: center;
            padding: 30px;
            background: var(--bg-subtle);
            border-radius: 12px;
            border: 1px solid var(--border);
            margin-bottom: 40px;
        }

        .hero-title {
            font-size: 28px;
            font-weight: 800;
            color: var(--primary);
            margin-bottom: 8px;
            letter-spacing: -0.5px;
        }

        .hero-subtitle {
            font-size: 14px;
            color: var(--text-muted);
        }

        /* --- SECTIONS --- */
        .section-title {
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--primary);
            border-bottom: 1px solid var(--border);
            padding-bottom: 8px;
            margin: 30px 0 20px 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .two-cols {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
        }

        /* --- METRICS CARDS --- */
        .metrics-container {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 30px;
        }

        .metric-box {
            background: white;
            border: 1px solid var(--border);
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }

        .metric-box.highlight {
            background: var(--primary);
            border-color: var(--primary);
            color: white;
        }

        .metric-box.highlight .metric-label {
            color: rgba(255,255,255,0.8);
        }

        .metric-big {
            font-size: 32px;
            font-weight: 800;
            line-height: 1;
            margin-bottom: 5px;
        }

        .metric-label {
            font-size: 11px;
            font-weight: 500;
            color: var(--text-muted);
            text-transform: uppercase;
        }

        /* --- PROGRESS BARS --- */
        .bar-chart-row {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
            font-size: 11px;
        }

        .bar-label {
            width: 120px;
            font-weight: 500;
            color: var(--text-main);
        }

        .bar-track {
            flex: 1;
            height: 12px;
            background: #f1f5f9;
            border-radius: 6px;
            overflow: hidden;
            margin: 0 12px;
        }

        .bar-fill {
            height: 100%;
            border-radius: 6px;
        }

        .bar-value {
            width: 50px;
            text-align: right;
            font-weight: 600;
        }

        /* --- OBJECTIVE CARDS --- */
        .obj-card {
            background: white;
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 12px;
            page-break-inside: avoid;
        }

        .obj-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }

        .obj-title {
            font-weight: 700;
            color: var(--text-main);
        }

        .obj-progress-track {
            height: 6px;
            background: #f1f5f9;
            border-radius: 3px;
            margin-bottom: 8px;
        }

        .obj-progress-fill {
            height: 100%;
            background: var(--primary);
            border-radius: 3px;
        }

        .obj-meta {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: var(--text-muted);
        }

        /* --- DATA TABLE --- */
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            margin-bottom: 20px;
        }

        th {
            text-align: left;
            padding: 8px 12px;
            background: var(--bg-subtle);
            color: var(--text-muted);
            font-weight: 600;
            text-transform: uppercase;
            border-bottom: 2px solid var(--border);
        }

        td {
            padding: 10px 12px;
            border-bottom: 1px solid var(--border);
            color: var(--text-main);
        }

        tr:last-child td {
            border-bottom: none;
        }

        .status-pill {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 9px;
            text-transform: uppercase;
        }

        .pill-success { background: #d1fae5; color: #065f46; }
        .pill-blue { background: #dbeafe; color: #1e40af; }
        .pill-gray { background: #f1f5f9; color: #64748b; }
        .pill-danger { background: #fee2e2; color: #991b1b; }

        /* --- FOOTER --- */
        .report-footer {
            margin-top: 40px;
            padding-top: 15px;
            border-top: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            color: var(--text-muted);
            font-size: 9px;
        }

        /* --- ALERTS --- */
        .alert-box {
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 15px;
            display: flex;
            gap: 12px;
            align-items: flex-start;
        }

        .alert-danger {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #991b1b;
        }

        .alert-success {
            background: #ecfdf5;
            border: 1px solid #a7f3d0;
            color: #065f46;
        }

        /* Print optimization */
        @media print {
            .no-print { display: none; }
            .page-break { page-break-before: always; }
        }
      </style>
    </head>
    <body>
      <div class="report-page">
        ${contentElement.innerHTML}
      </div>
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
            // window.close(); // Opcional: manter aberto para debug
          }, 300);
        };
      </script>
    </body>
    </html>
    `;

  printWindow.document.write(printContent);
  printWindow.document.close();
}

/**
 * Gera o conteúdo HTML do relatório baseado nos dados
 */
export function generateReportHTML(data: ReportData): string {
  const metricsHTML = data.metrics?.map(m => `
    <div class="metric-card${m.color ? ' highlight' : ''}">
      <div class="metric-value">${escapeHtml(m.value)}</div>
      <div class="metric-label">${escapeHtml(m.label)}</div>
    </div>
  `).join('') || '';

  const sectionsHTML = data.sections?.map(section => `
    <div class="report-section">
      <h3 class="section-title">${escapeHtml(section.title)}</h3>
      ${section.items.map(item => `
        <div class="progress-item">
          <span class="progress-label">${escapeHtml(item.label)}</span>
          <div class="progress-bar-container">
            <div class="progress-bar" style="width: ${item.percentage || 0}%"></div>
          </div>
          <span class="progress-value">${escapeHtml(item.value)}${item.percentage !== undefined ? ` (${item.percentage}%)` : ''}</span>
        </div>
      `).join('')}
    </div>
  `).join('') || '';

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
          <p><strong>Data:</strong> ${escapeHtml(formatReportDate(data.generatedAt))}</p>
          <p><strong>Período:</strong> ${escapeHtml(data.period || formatReportPeriod(data.generatedAt))}</p>
        </div>
      </header>

      <div class="report-title-section">
        <h2 class="report-title">${escapeHtml(data.title)}</h2>
        ${data.subtitle ? `<p class="report-subtitle">${escapeHtml(data.subtitle)}</p>` : ''}
      </div>

      ${metricsHTML ? `<div class="metrics-grid">${metricsHTML}</div>` : ''}
      
      ${sectionsHTML}

      <footer class="report-footer">
        <span>${escapeHtml(data.footer || 'Relatório gerado automaticamente pelo sistema RADAR')}</span>
        <span>Página 1 de 1</span>
      </footer>
    </div>
  `;
}
