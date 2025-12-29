import { useMemo, useState, useEffect } from 'react';
import { Activity, Filter, Search, MapPin, User, Clock, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { MICROREGIOES } from '../../../data/microregioes';
import { loggingService } from '../../../services/loggingService';
import { ActivityType, ActivityLog } from '../../../types/activity.types';

export type ActivityItem = {
  id: string;
  type: ActivityType;
  userId: string;
  userName: string;
  description: string;
  details?: string;
  timestamp: Date;
  microregiaoId?: string;
  microregiaoNome?: string;
};

// Helper para mapear log do banco para item da UI
const mapLogToItem = (log: ActivityLog): ActivityItem => {
  let details = '';
  const meta = log.metadata || {};

  // Construir detalhes baseados no tipo de ação
  switch (log.action_type) {
    case 'user_created':
      // Admin criou usuário
      const targetName = meta.target_user_name || meta.name || '';
      const targetEmail = meta.target_user_email || meta.email || '';
      const targetRole = meta.target_user_role || meta.role || '';
      details = `Usuário: ${targetName} (${targetEmail}) - Role: ${targetRole}`;
      break;
    case 'user_updated':
      // Mostrar detalhes completos (antes → depois)
      if (meta.details && Array.isArray(meta.details)) {
        details = meta.details.join(' | ');
      } else if (meta.changes && Array.isArray(meta.changes)) {
        details = `Alterou: ${meta.changes.join(', ')}`;
      }
      // Adicionar info do usuário alvo
      if (meta.target_user_name) {
        details = `[${meta.target_user_name}] ${details}`;
      }
      break;
    case 'user_deactivated':
      details = meta.target_user_name || meta.name || 'Usuário desativado';
      break;
    case 'action_created':
      details = meta.title || 'Nova ação criada';
      break;
    case 'action_updated':
      if (meta.changes && Array.isArray(meta.changes)) {
        details = `Alterou: ${meta.changes.join(', ')}`;
      } else {
        details = meta.title || 'Ação atualizada';
      }
      break;
    case 'action_deleted':
      details = meta.title || 'Ação removida';
      break;
    default:
      if (meta.name) details = meta.name;
      else if (meta.title) details = meta.title;
  }

  // Nome de quem fez a ação (o autor)
  const authorName = meta.created_by_name || log.user?.nome || 'Sistema';

  // Tentar obter microrregião dos metadados ou do usuário
  const microId = meta.microregiaoId || meta.target_user_microregiao || log.user?.microregiao_id;
  const micro = MICROREGIOES.find(m => m.id === microId);

  return {
    id: log.id,
    type: log.action_type,
    userId: log.user_id,
    userName: authorName,
    description: activityLabels[log.action_type] || 'Atividade',
    details: details,
    timestamp: new Date(log.created_at),
    microregiaoId: microId,
    microregiaoNome: micro?.nome
  };
};

const activityLabels: Record<ActivityType, string> = {
  login: 'Login',
  logout: 'Logout',
  user_created: 'Usuário criado',
  user_updated: 'Usuário atualizado',
  user_deactivated: 'Usuário desativado',
  user_deleted: 'Usuário excluído',
  lgpd_accepted: 'LGPD aceito',
  action_created: 'Ação criada',
  action_updated: 'Ação atualizada',
  action_deleted: 'Ação removida',
  view_micro: 'Visualizou microrregião',
};

const activityColors: Record<ActivityType, string> = {
  login: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700',
  logout: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700',
  user_created: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700',
  user_updated: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700',
  user_deactivated: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700',
  user_deleted: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700',
  lgpd_accepted: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700',
  action_created: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-700',
  action_updated: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700',
  action_deleted: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700',
  view_micro: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600',
};

const timePresets = [
  { id: '24h', label: '24h' },
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
  { id: 'all', label: 'Tudo' },
] as const;

type TimePreset = typeof timePresets[number]['id'];

const activityTypes = Object.keys(activityLabels) as ActivityType[];

const formatTimeAgo = (date: Date) => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Agora mesmo';
  if (diffMins < 60) return `${diffMins} min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays} dias atrás`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

const matchesPreset = (date: Date, preset: TimePreset) => {
  if (preset === 'all') return true;
  const now = new Date().getTime();
  const diff = now - date.getTime();
  if (preset === '24h') return diff <= 24 * 60 * 60 * 1000;
  if (preset === '7d') return diff <= 7 * 24 * 60 * 60 * 1000;
  if (preset === '30d') return diff <= 30 * 24 * 60 * 60 * 1000;
  return true;
};

function ActivityCard({ activity }: { activity: ActivityItem }) {
  return (
    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className={`px-2 py-1 rounded-md text-[11px] font-semibold border ${activityColors[activity.type]}`}>
          {activityLabels[activity.type]}
        </div>
        <span className="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">{formatTimeAgo(activity.timestamp)}</span>
      </div>
      <div className="mt-2 text-sm text-slate-800 dark:text-slate-100">
        <span className="font-semibold">{activity.userName}</span> — {activity.description}
      </div>
      {activity.details && (
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2" title={activity.details}>
          {activity.details}
        </div>
      )}
      {activity.microregiaoNome && (
        <div className="flex items-center gap-1 text-[11px] text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 rounded mt-2 w-fit">
          <MapPin size={12} />
          {activity.microregiaoNome}
        </div>
      )}
    </div>
  );
}

export function ActivityCenter() {
  const [microFilter, setMicroFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [timeFilter, setTimeFilter] = useState<TimePreset>('7d');
  const [expandedMicros, setExpandedMicros] = useState<Record<string, boolean>>({});

  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  // Carregar atividades reais
  const loadActivities = async () => {
    setLoading(true);
    try {
      const logs = await loggingService.fetchActivities(100);
      const items = logs.map(mapLogToItem);
      setActivities(items);
    } catch (error) {
      console.error('Erro ao carregar atividades:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();

    // Auto-refresh a cada 30 segundos
    const interval = setInterval(loadActivities, 30000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    return activities.filter(a => {
      const matchesMicro = microFilter === 'all' ? true : (microFilter === 'sem_micro' ? !a.microregiaoId : a.microregiaoId === microFilter);
      const matchesType = typeFilter === 'all' ? true : a.type === typeFilter;
      const matchesSearch = !search || `${a.userName} ${a.description} ${a.details || ''}`.toLowerCase().includes(search.toLowerCase());
      const matchesTime = matchesPreset(a.timestamp, timeFilter);
      return matchesMicro && matchesType && matchesSearch && matchesTime;
    }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [activities, microFilter, typeFilter, search, timeFilter]);

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, ActivityItem[]>>((acc, item) => {
      const key = item.microregiaoId || 'sem_micro';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [filtered]);

  const microOptions = useMemo(() => [
    { id: 'all', label: 'Todas microrregiões' },
    ...MICROREGIOES.map(m => ({ id: m.id, label: m.nome })),
    { id: 'sem_micro', label: 'Sem microrregião' },
  ], []);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300 mb-3 font-semibold">
          <div className="flex items-center gap-2">
            <Filter size={14} />
            Filtros
          </div>
          <button
            onClick={loadActivities}
            className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 transition-colors"
            disabled={loading}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Microrregião</label>
            <select
              value={microFilter}
              onChange={e => setMicroFilter(e.target.value)}
              className="w-full mt-1 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
            >
              {microOptions.map(o => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tipo</label>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as ActivityType | 'all')}
              className="w-full mt-1 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
            >
              <option value="all">Todos</option>
              {activityTypes.map(t => (
                <option key={t} value={t}>{activityLabels[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Intervalo</label>
            <div className="grid grid-cols-4 gap-1 mt-1">
              {timePresets.map(p => (
                <button
                  key={p.id}
                  onClick={() => setTimeFilter(p.id)}
                  className={`px-2 py-1.5 text-xs rounded border transition-colors ${timeFilter === p.id
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Busca</label>
            <div className="mt-1 relative">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Usuário, descrição..."
                className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm pl-9 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
              />
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Geral */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Geral</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Todas as atividades após filtro</p>
            </div>
          </div>
          <div className="p-4 space-y-3 max-h-[520px] overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum evento encontrado.</p>
            )}
            {filtered.map(item => (
              <ActivityCard key={item.id} activity={item} />
            ))}
          </div>
        </div>

        {/* Por microrregião */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Por microrregião</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Eventos agrupados</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[520px] overflow-y-auto">
            {Object.keys(grouped).length === 0 && (
              <p className="p-4 text-sm text-slate-500 dark:text-slate-400">Nenhum evento encontrado.</p>
            )}
            {Object.entries(grouped).map(([microId, items]) => {
              const microNome = microId === 'sem_micro' ? 'Sem microrregião' : (MICROREGIOES.find(m => m.id === microId)?.nome || microId);
              const open = expandedMicros[microId] ?? true;
              return (
                <div key={microId}>
                  <button
                    onClick={() => setExpandedMicros(prev => ({ ...prev, [microId]: !open }))}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-sm font-semibold text-slate-700 dark:text-slate-200"
                  >
                    <span className="flex items-center gap-2">
                      <MapPin size={14} className="text-teal-600 dark:text-teal-400" />
                      {microNome}
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">({items.length})</span>
                    </span>
                    {open ? <ChevronUp size={16} className="text-slate-400 dark:text-slate-500" /> : <ChevronDown size={16} className="text-slate-400 dark:text-slate-500" />}
                  </button>
                  {open && (
                    <div className="px-4 pb-3 space-y-2">
                      {items.map(item => (
                        <div key={item.id} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <User size={12} className="text-slate-400 dark:text-slate-500" />
                              {item.userName}
                            </span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                              <Clock size={12} /> {formatTimeAgo(item.timestamp)}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-slate-800 dark:text-slate-100 font-semibold">{activityLabels[item.type]}</div>
                          <div className="text-sm text-slate-600 dark:text-slate-300">{item.description}</div>
                          {item.details && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{item.details}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
