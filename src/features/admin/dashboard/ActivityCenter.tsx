import { useEffect, useMemo, useState } from 'react';
import { Activity, Clock3, Eye, LogIn, PencilLine, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { getMicroregiaoById } from '../../../data/microregioes';
import { logError } from '../../../lib/logger';
import {
  type ActionAuditLog,
  fetchActionAuditEvents,
} from '../../../services/actionAuditService';
import { getAvatarUrl } from '../../settings/avatarUtils';

type ActionAuditFilter = 'all' | 'login' | 'action_viewed' | 'action_updated' | 'action_deleted';

const FILTER_LABELS: Record<ActionAuditFilter, string> = {
  all: 'Todas',
  login: 'Logins',
  action_viewed: 'Visualizacoes',
  action_updated: 'Edicoes',
  action_deleted: 'Exclusoes',
};

function getLogMetadata(log: ActionAuditLog): Record<string, unknown> {
  return (log.metadata || {}) as Record<string, unknown>;
}

function getActionTitle(log: ActionAuditLog): string {
  const metadata = getLogMetadata(log);
  return typeof metadata.title === 'string' && metadata.title.trim()
    ? metadata.title
    : 'Acao sem titulo';
}

function getActionId(log: ActionAuditLog): string | null {
  const metadata = getLogMetadata(log);
  if (typeof metadata.action_id === 'string' && metadata.action_id.trim()) {
    return metadata.action_id;
  }
  return null;
}

function getActorName(log: ActionAuditLog): string {
  const metadata = getLogMetadata(log);
  if (log.user?.nome) {
    return log.user.nome;
  }
  if (typeof metadata.created_by_name === 'string' && metadata.created_by_name.trim()) {
    return metadata.created_by_name;
  }
  return 'Usuario';
}

function getActorAvatarId(log: ActionAuditLog): string {
  return log.user?.avatar_id || 'zg10';
}

function getMicroName(log: ActionAuditLog): string | null {
  const metadata = getLogMetadata(log);
  const microId =
    typeof metadata.microregiao_id === 'string'
      ? metadata.microregiao_id
      : typeof metadata.microregiaoId === 'string'
        ? metadata.microregiaoId
        : log.user?.microregiao_id;

  if (!microId) {
    return null;
  }

  return getMicroregiaoById(microId)?.nome || null;
}

function getEventCopy(type: ActionAuditLog['action_type']) {
  switch (type) {
    case 'login':
      return {
        Icon: LogIn,
        badge: 'Login',
        sentence: 'fez login no sistema',
        className: 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-300',
        isAction: false,
      };
    case 'action_viewed':
      return {
        Icon: Eye,
        badge: 'Visualizou',
        sentence: 'visualizou a acao',
        className: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300',
        isAction: true,
      };
    case 'action_deleted':
      return {
        Icon: Trash2,
        badge: 'Excluiu',
        sentence: 'excluiu a acao',
        className: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300',
        isAction: true,
      };
    case 'action_created':
      return {
        Icon: Plus,
        badge: 'Criou',
        sentence: 'criou a acao',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300',
        isAction: true,
      };
    case 'action_updated':
    default:
      return {
        Icon: PencilLine,
        badge: 'Editou',
        sentence: 'editou a acao',
        className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300',
        isAction: true,
      };
  }
}

function formatRelativeTime(value: string): string {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'Agora';
  if (diffMinutes < 60) return `${diffMinutes} min atras`;
  if (diffHours < 24) return `${diffHours}h atras`;
  if (diffDays < 7) return `${diffDays}d atras`;

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ActivityCenter() {
  const [logs, setLogs] = useState<ActionAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<ActionAuditFilter>('all');

  useEffect(() => {
    let isMounted = true;

    const loadLogs = async () => {
      setLoading(true);
      try {
          const result = await fetchActionAuditEvents(500);
        if (isMounted) {
          setLogs(result);
        }
      } catch (error) {
        logError('ActivityCenter', 'Erro ao carregar historico de acoes', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadLogs();
    const interval = window.setInterval(() => {
      void loadLogs();
    }, 60000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const filteredLogs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return logs.filter((log) => {
      if (filter !== 'all' && log.action_type !== filter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        getActorName(log),
        getActionTitle(log),
        getActionId(log) || '',
        getMicroName(log) || '',
      ].join(' ').toLowerCase();

      return haystack.includes(query);
    });
  }, [filter, logs, searchTerm]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <Activity className="h-5 w-5 text-teal-500" />
              <h2 className="text-lg font-semibold">Atividades</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Historico de quem fez login, visualizou, editou ou excluiu acoes.
            </p>
          </div>

          <button
            type="button"
            onClick={async () => {
              setLoading(true);
              try {
                setLogs(await fetchActionAuditEvents(500));
              } catch (error) {
                logError('ActivityCenter', 'Erro ao atualizar historico de acoes', error);
              } finally {
                setLoading(false);
              }
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-teal-200 hover:text-teal-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-teal-800 dark:hover:text-teal-300"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por pessoa, acao ou microrregiao..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-teal-500"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(Object.keys(FILTER_LABELS) as ActionAuditFilter[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  filter === item
                    ? 'bg-teal-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {FILTER_LABELS[item]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
        {loading && logs.length === 0 ? (
          <div className="flex min-h-[220px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            Carregando atividades...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center dark:border-slate-700 dark:bg-slate-900/40">
            <Activity className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Nenhum log encontrado</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Ajuste o filtro ou aguarde novas interacoes nas acoes.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => {
              const event = getEventCopy(log.action_type);
              const EventIcon = event.Icon;
              const actionId = getActionId(log);
              const microName = getMicroName(log);
              const actorName = getActorName(log);

              return (
                <div
                  key={log.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-teal-200 hover:bg-white dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-teal-900 dark:hover:bg-slate-900"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={getAvatarUrl(getActorAvatarId(log))}
                      alt={actorName}
                      className="h-11 w-11 rounded-full border border-slate-200 object-cover shadow-sm dark:border-slate-700"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-800 dark:text-slate-100">{actorName}</span>
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${event.className}`}>
                              <EventIcon className="h-3.5 w-3.5" />
                              {event.badge}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                            <span className="font-medium">{actorName}</span> {event.sentence}
                            {event.isAction ? (
                              <>
                                :{' '}
                                <span className="font-semibold text-slate-800 dark:text-slate-100">{getActionTitle(log)}</span>
                              </>
                            ) : (
                              '.'
                            )}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                            {event.isAction && actionId && (
                              <span className="rounded-full bg-slate-200 px-2.5 py-1 dark:bg-slate-700/70">
                                Acao {actionId}
                              </span>
                            )}
                            {microName && (
                              <span className="rounded-full bg-slate-200 px-2.5 py-1 dark:bg-slate-700/70">
                                {microName}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                          <Clock3 className="h-3.5 w-3.5" />
                          <span title={formatTimestamp(log.created_at)}>{formatRelativeTime(log.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
