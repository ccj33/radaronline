import { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardPaste,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react';

import {
  type UserImportCommitResponse,
  type UserImportInputRow,
  type UserImportPreviewResponse,
} from '../../services/adminUsersApi';
import {
  commitUsersImport,
  getAdminUserImportMode,
  previewUsersImport,
} from '../../services/adminUserImportService';
import type { UserRole } from '../../types/auth.types';

interface UserImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported?: (result: UserImportCommitResponse) => Promise<void> | void;
  fullScreen?: boolean;
  currentUserRole?: UserRole;
}

type ImportStep = 'paste' | 'preview';
type ColumnKey = 'name' | 'email' | 'role' | 'microregions' | 'municipality';

const HEADER_ALIASES: Record<ColumnKey, string[]> = {
  name: ['nome', 'nome completo', 'colaborador', 'pessoa'],
  email: ['email', 'e-mail', 'mail'],
  role: ['role', 'perfil', 'nivel de acesso', 'nivel acesso', 'acesso', 'papel'],
  microregions: [
    'microrregiao',
    'microregiao',
    'microrregioes',
    'microregioes',
    'micro',
    'micros',
    'regiao',
    'regioes',
  ],
  municipality: ['municipio', 'cidade'],
};

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function detectDelimiter(line: string): '\t' | ';' | ',' {
  if (line.includes('\t')) {
    return '\t';
  }

  const semicolonCount = (line.match(/;/g) || []).length;
  const commaCount = (line.match(/,/g) || []).length;

  return semicolonCount > commaCount ? ';' : ',';
}

function parseDelimitedLine(line: string, delimiter: '\t' | ';' | ','): string[] {
  if (delimiter === '\t') {
    return line.split('\t').map((cell) => cell.trim());
  }

  const cells: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (insideQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === delimiter && !insideQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function detectHeaderMap(cells: string[]): Partial<Record<ColumnKey, number>> | null {
  const headerMap: Partial<Record<ColumnKey, number>> = {};

  cells.forEach((cell, index) => {
    const normalized = normalizeText(cell);

    (Object.keys(HEADER_ALIASES) as ColumnKey[]).forEach((key) => {
      if (HEADER_ALIASES[key].includes(normalized) && headerMap[key] === undefined) {
        headerMap[key] = index;
      }
    });
  });

  return Object.keys(headerMap).length >= 2 ? headerMap : null;
}

function parseRows(rawText: string): UserImportInputRow[] {
  const normalizedText = rawText.replace(/\r/g, '');
  const lines = normalizedText.split('\n').filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return [];
  }

  const delimiter = detectDelimiter(lines[0]);
  const firstLineCells = parseDelimitedLine(lines[0], delimiter);
  const headerMap = detectHeaderMap(firstLineCells);
  const startIndex = headerMap ? 1 : 0;

  return lines.slice(startIndex).reduce<UserImportInputRow[]>((accumulator, line) => {
    const cells = parseDelimitedLine(line, delimiter);
    if (cells.every((cell) => !cell.trim())) {
      return accumulator;
    }

    const rowNumber = accumulator.length + 1;
    const getCell = (column: ColumnKey, fallbackIndex: number): string => {
      const index = headerMap?.[column] ?? fallbackIndex;
      return (cells[index] || '').trim();
    };

    accumulator.push({
      rowNumber,
      name: getCell('name', 0),
      email: getCell('email', 1),
      role: getCell('role', 2),
      microregions: getCell('microregions', 3),
      municipality: getCell('municipality', 4),
    });

    return accumulator;
  }, []);
}

function downloadCsv(fileName: string, csvContent: string): void {
  const blob = new Blob(['\uFEFF', csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function statusBadge(status: string) {
  switch (status) {
    case 'ready':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    case 'review':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'duplicate':
      return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200';
    default:
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'ready':
      return 'Pronto';
    case 'review':
      return 'Revisar';
    case 'duplicate':
      return 'Duplicado';
    default:
      return 'Erro';
  }
}

export function UserImportModal({
  isOpen,
  onClose,
  onImported,
  fullScreen = false,
  currentUserRole,
}: UserImportModalProps) {
  const importMode = getAdminUserImportMode();
  const [rawText, setRawText] = useState('');
  const [step, setStep] = useState<ImportStep>('paste');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<UserImportPreviewResponse | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const parsedRows = useMemo(() => parseRows(rawText), [rawText]);
  const readyRowsCount = preview?.summary.ready || 0;

  const resetState = () => {
    setRawText('');
    setStep('paste');
    setError(null);
    setPreview(null);
    setIsPreviewing(false);
    setIsImporting(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handlePreview = async () => {
    if (parsedRows.length === 0) {
      setError('Cole pelo menos uma linha da planilha para gerar a previa.');
      return;
    }

    setError(null);
    setIsPreviewing(true);

    try {
      const result = await previewUsersImport(parsedRows, currentUserRole);
      setPreview(result);
      setStep('preview');
    } catch (previewError) {
      setError(
        previewError instanceof Error
          ? previewError.message
          : 'Nao foi possivel processar a previa do lote.'
      );
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) {
      setError('Nao ha linhas validas para importar.');
      return;
    }

    setError(null);
    setIsImporting(true);

    try {
      const result = await commitUsersImport({
        rows: parsedRows,
        loginUrl: window.location.origin,
        actorRole: currentUserRole,
      });

      downloadCsv(result.csvFileName, result.csvContent);
      await onImported?.(result);
      handleClose();
    } catch (commitError) {
      setError(
        commitError instanceof Error
          ? commitError.message
          : 'Nao foi possivel concluir a importacao do lote.'
      );
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[60] flex ${
        fullScreen ? 'items-start justify-start p-0' : 'items-center justify-center p-4'
      } bg-black/60 backdrop-blur-sm`}
      onClick={handleClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className={`bg-white dark:bg-slate-800 ${
          fullScreen ? 'w-full h-full rounded-none' : 'w-full max-w-6xl rounded-2xl'
        } overflow-hidden shadow-2xl flex flex-col`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 dark:bg-teal-900/40 rounded-xl">
              <FileSpreadsheet className="w-5 h-5 text-teal-600 dark:text-teal-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Importar usuarios em lote
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Cole a planilha, valide as microrregioes e baixe o retorno com as senhas temporarias.
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {step === 'paste' && (
            <div className="space-y-4">
              <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-4">
                <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
                  <div className="flex gap-3">
                    <ClipboardPaste className="w-5 h-5 text-blue-600 dark:text-blue-300 shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                      <p className="font-semibold">Fluxo pensado para operacao pequena</p>
                      <p>
                        O sistema aceita colagem de planilha, normaliza maiusculas, minusculas e acentos, e
                        segura qualquer microrregiao ambigua para revisao.
                      </p>
                      <p>
                        O retorno do commit sai em CSV com `login_url` e `senha_temporaria` por pessoa, para
                        voce disparar os e-mails manualmente.
                      </p>
                      {importMode === 'legacy' && (
                        <p>
                          Neste ambiente o processamento roda no fluxo administrativo legado atual, sem depender
                          do backend novo.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                    Colunas esperadas
                  </p>
                  <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 font-mono">
                    <p>nome | email | role | microrregiao | municipio</p>
                    <p>ou cabecalhos equivalentes</p>
                    <p>ex.: `nivel de acesso`, `microrregioes`</p>
                  </div>
                </div>
              </div>

              <textarea
                value={rawText}
                onChange={(event) => setRawText(event.target.value)}
                placeholder="Cole aqui as linhas da planilha..."
                className="w-full h-72 p-4 border border-slate-300 dark:border-slate-600 rounded-2xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono text-sm resize-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900/30">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Linhas detectadas
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {parsedRows.length} linha(s) prontas para gerar a previa do lote.
                    </p>
                  </div>
                  <button
                    onClick={handlePreview}
                    disabled={isPreviewing}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl font-medium transition-colors"
                  >
                    {isPreviewing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Gerar previa
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && preview && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                      {preview.summary.ready}
                    </span>
                  </div>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">Prontas para importar</p>
                </div>

                <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <span className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                      {preview.summary.review}
                    </span>
                  </div>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">Precisam revisao</p>
                </div>

                <div className="p-4 rounded-2xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="text-2xl font-bold text-red-700 dark:text-red-300">
                      {preview.summary.error}
                    </span>
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">Com erro</p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40">
                  <div className="flex items-center gap-2">
                    <Download className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    <span className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                      {preview.summary.duplicate}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Duplicadas</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                          Linha
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                          Nome
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                          Email
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                          Role
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                          Micros normalizadas
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                          Observacoes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {preview.rows.map((row) => (
                        <tr key={row.rowNumber} className="align-top">
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{row.rowNumber}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${statusBadge(row.status)}`}
                            >
                              {statusLabel(row.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{row.name || '-'}</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{row.email || '-'}</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                            {row.role || row.roleInput || '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                            {row.normalizedMicroregionIds.length > 0 ? (
                              <div className="space-y-1">
                                {row.normalizedMicroregionIds.map((id, index) => (
                                  <div key={`${row.rowNumber}-${id}`} className="text-xs">
                                    <span className="font-semibold">{id}</span>
                                    {' - '}
                                    {row.normalizedMicroregionNames[index]}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                            <div className="space-y-1">
                              {row.issues.map((issue) => (
                                <div key={`issue-${row.rowNumber}-${issue}`} className="text-red-600 dark:text-red-300">
                                  {issue}
                                </div>
                              ))}
                              {row.warnings.map((warning) => (
                                <div key={`warning-${row.rowNumber}-${warning}`} className="text-amber-600 dark:text-amber-300">
                                  {warning}
                                </div>
                              ))}
                              {row.issues.length === 0 && row.warnings.length === 0 && (
                                <span className="text-emerald-600 dark:text-emerald-300">
                                  Linha pronta para criacao.
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
          <button
            type="button"
            onClick={() => {
              if (step === 'preview') {
                setStep('paste');
                setPreview(null);
                setError(null);
                return;
              }

              handleClose();
            }}
            className="px-4 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl font-medium transition-colors"
          >
            {step === 'preview' ? 'Voltar para colagem' : 'Cancelar'}
          </button>

          {step === 'preview' ? (
            <button
              type="button"
              onClick={handleImport}
              disabled={isImporting || readyRowsCount === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl font-medium transition-colors"
            >
              {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Importar {readyRowsCount} linha(s) prontas
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePreview}
              disabled={isPreviewing}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl font-medium transition-colors"
            >
              {isPreviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Gerar previa
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
