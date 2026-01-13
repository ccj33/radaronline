import { useMemo, useState, useEffect } from 'react';
import {
  Activity, Filter, Search, MapPin, User, Clock, ChevronDown, ChevronUp, RefreshCw,
  Calendar, Zap, LogIn, LogOut, CheckCircle, XCircle, AlertTriangle, Trash2, Edit, Plus, Shield,
  TrendingUp, Users, AlertOctagon, LayoutList, CheckSquare
} from 'lucide-react';
import { MICROREGIOES } from '../../../data/microregioes';
import { loggingService } from '../../../services/loggingService';
import { ActivityType, ActivityLog } from '../../../types/activity.types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { logError } from '../../../lib/logger';

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
    case 'user_created': {
      const targetName = meta.target_user_name || meta.name || '';
      const targetEmail = meta.target_user_email || meta.email || '';
      const targetRole = meta.target_user_role || meta.role || '';
      details = `Criou usuário: ${targetName} (${targetRole})`;
      break;
    }
    case 'user_updated': {
      if (meta.details && Array.isArray(meta.details)) {
        details = meta.details.join(' | ');
      } else if (meta.changes && Array.isArray(meta.changes)) {
        details = `Alterou: ${meta.changes.join(', ')}`;
      }
      if (meta.target_user_name) {
        details = `[${meta.target_user_name}] ${details}`;
      }
      break;
    }
    case 'user_deactivated': {
      details = meta.target_user_name ? `Desativou: ${meta.target_user_name}` : 'Usuário desativado';
      break;
    }
    case 'action_created': {
      details = meta.title || 'Nova ação criada';
      break;
    }
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
  user_created: 'Usuário',
  user_updated: 'Usuário',
  user_deactivated: 'Usuário',
  user_deleted: 'Usuário',
  lgpd_accepted: 'LGPD',
  first_access_completed: 'Primeiro Acesso',
  action_created: 'Ação',
  action_updated: 'Ação',
  action_deleted: 'Ação',
  view_micro: 'Visualização',
};

// Configuration for icons and colors per activity type
const activityConfig: Record<ActivityType, { icon: any, color: string, bg: string, border: string }> = {
  login: { icon: LogIn, color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200' },
  logout: { icon: LogOut, color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-200' },
  user_created: { icon: User, color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200' },
  user_updated: { icon: Edit, color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200' },
  user_deactivated: { icon: User, color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200' },
  user_deleted: { icon: Trash2, color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200' },
  lgpd_accepted: { icon: Shield, color: 'text-purple-600', bg: 'bg-purple-100', border: 'border-purple-200' },
  first_access_completed: { icon: CheckCircle, color: 'text-cyan-600', bg: 'bg-cyan-100', border: 'border-cyan-200' },
  action_created: { icon: Plus, color: 'text-teal-600', bg: 'bg-teal-100', border: 'border-teal-200' },
  action_updated: { icon: Edit, color: 'text-indigo-600', bg: 'bg-indigo-100', border: 'border-indigo-200' },
  action_deleted: { icon: Trash2, color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200' },
  view_micro: { icon: MapPin, color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200' },
};

const activityTypes = Object.keys(activityLabels) as ActivityType[];

// --- STATS COMPONENT ---
function ActivityStats({ activities }: { activities: ActivityItem[] }) {
  const stats = useMemo(() => {
    const total = activities.length;
    const today = new Date();
    const last24h = activities.filter(a => (today.getTime() - a.timestamp.getTime()) < 24 * 60 * 60 * 1000).length;

    // Top User
    const userCounts = activities.reduce((acc, curr) => {
      acc[curr.userName] = (acc[curr.userName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topUser = Object.entries(userCounts).sort((a, b) => b[1] - a[1])[0];

    // Top Micro
    const microCounts = activities.reduce((acc, curr) => {
      if (curr.microregiaoNome) {
        acc[curr.microregiaoNome] = (acc[curr.microregiaoNome] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    const topMicro = Object.entries(microCounts).sort((a, b) => b[1] - a[1])[0];

    return { total, last24h, topUser, topMicro };
  }, [activities]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
          <Activity size={24} />
        </div>
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Total de Eventos</p>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.total}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
          <Clock size={24} />
        </div>
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Últimas 24h</p>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.last24h}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
          <Users size={24} />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-slate-500 dark:text-slate-400">Usuário Mais Ativo</p>
          <div className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate">
            {stats.topUser ? stats.topUser[0] : '-'}
          </div>
          <p className="text-xs text-slate-400">{stats.topUser ? `${stats.topUser[1]} ações` : ''}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg">
          <MapPin size={24} />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-slate-500 dark:text-slate-400">Região Mais Ativa</p>
          <div className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate">
            {stats.topMicro ? stats.topMicro[0] : '-'}
          </div>
          <p className="text-xs text-slate-400">{stats.topMicro ? `${stats.topMicro[1]} ações` : ''}</p>
        </div>
      </div>
    </div>
  );
}

// --- TIMELINE ITEM COMPONENT ---
function TimelineItem({ item, isLast }: { item: ActivityItem, isLast: boolean }) {
  const config = activityConfig[item.type] || { icon: Activity, color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-200' };
  const Icon = config.icon;

  return (
    <div className="flex gap-4 group">
      {/* Time & Line */}
      <div className="flex flex-col items-center min-w-[60px]">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 py-1">
          {format(item.timestamp, 'HH:mm')}
        </span>
        <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-sm ${config.bg} ${config.color}`}>
          <Icon size={14} />
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 my-1 group-last:hidden" />
        )}
      </div>

      {/* Content Card */}
      <div className="flex-1 pb-8 min-w-0">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-all hover:border-teal-200 dark:hover:border-teal-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-800 dark:text-slate-100">{item.userName}</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {item.type.includes('action') ? 'realizou uma alteração em' : 'registrou atividade:'}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bg} ${config.color} border ${config.border}`}>
                {activityLabels[item.type]}
              </span>
            </div>
            {item.microregiaoNome && (
              <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded shrink-0">
                <MapPin size={10} />
                {item.microregiaoNome}
              </div>
            )}
          </div>

          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 break-words mb-1">
            {item.description} {item.details ? `- ${item.details}` : ''}
          </p>
        </div>
      </div>
    </div>
  );
}

// --- MAIN COMPONENT ---
export function ActivityCenter() {
  const [microFilter, setMicroFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  // Carregar atividades
  const loadActivities = async () => {
    setLoading(true);
    try {
      const logs = await loggingService.fetchActivities(100);
      const items = logs.map(mapLogToItem);
      setActivities(items);
    } catch (error) {
      logError('ActivityCenter', 'Erro ao carregar atividades', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
    const interval = setInterval(loadActivities, 60000); // 1 min refresh
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    return activities.filter(a => {
      const matchesMicro = microFilter === 'all' ? true : (microFilter === 'sem_micro' ? !a.microregiaoId : a.microregiaoId === microFilter);
      const matchesType = typeFilter === 'all' ? true : a.type === typeFilter;
      const matchesSearch = !search || `${a.userName} ${a.description} ${a.details || ''}`.toLowerCase().includes(search.toLowerCase());
      return matchesMicro && matchesType && matchesSearch;
    }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [activities, microFilter, typeFilter, search]);

  // Group by Date for Timeline
  const groupedByDate = useMemo(() => {
    const groups: Record<string, ActivityItem[]> = {};
    const today = new Date().toLocaleDateString();

    filtered.forEach(item => {
      const dateKey = item.timestamp.toLocaleDateString();
      const displayKey = dateKey === today ? 'Hoje' : dateKey;
      if (!groups[displayKey]) groups[displayKey] = [];
      groups[displayKey].push(item);
    });
    return groups;
  }, [filtered]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col gap-6">
        <ActivityStats activities={filtered} />
      </div>

      {/* Filters Overlay */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm sticky top-0 z-10 transition-shadow">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por usuário, ação ou detalhe..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
            <select
              value={microFilter}
              onChange={e => setMicroFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-teal-500 outline-none min-w-[160px]"
            >
              <option value="all">Todas as Regiões</option>
              {MICROREGIOES.map(m => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as ActivityType | 'all')}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-teal-500 outline-none min-w-[140px]"
            >
              <option value="all">Todos os Tipos</option>
              {Object.entries(activityLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            <button
              onClick={loadActivities}
              disabled={loading}
              className="p-2 text-teal-600 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-900/30 rounded-lg transition-colors ml-auto md:ml-0"
              title="Atualizar"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Timeline View */}
      <div className="space-y-8 animate-in fade-in duration-500">
        {Object.entries(groupedByDate).length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 border-dashed">
            <LayoutList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Nenhuma atividade encontrada</h3>
            <p className="text-slate-500">Tente ajustar os filtros ou busque por outro termo.</p>
          </div>
        ) : (
          Object.entries(groupedByDate).map(([date, items]) => (
            <div key={date}>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1 bg-slate-200 dark:border-slate-700"></div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 px-4 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                  {date}
                </h3>
                <div className="h-px flex-1 bg-slate-200 dark:border-slate-700"></div>
              </div>

              <div className="space-y-0">
                {items.map((item, idx) => (
                  <TimelineItem
                    key={item.id}
                    item={item}
                    isLast={idx === items.length - 1}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
