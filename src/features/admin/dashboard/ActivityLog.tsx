import { useMemo } from 'react';
import {
  Activity,
  UserPlus,
  UserCheck,
  UserX,
  Edit3,
  Plus,
  Trash2,
  Shield,
  LogIn,
  LogOut,
  Eye,
  Clock
} from 'lucide-react';

// Tipos de atividade
type ActivityType =
  | 'login'
  | 'logout'
  | 'user_created'
  | 'user_updated'
  | 'user_deactivated'
  | 'lgpd_accepted'
  | 'action_created'
  | 'action_updated'
  | 'action_deleted'
  | 'view_micro';

interface ActivityItem {
  id: string;
  type: ActivityType;
  userId: string;
  userName: string;
  description: string;
  details?: string;
  timestamp: Date;
  microregiaoId?: string;
  microregiaoNome?: string;
}

interface ActivityLogProps {
  maxItems?: number;
}

// Mock de atividades recentes (em produção, virá do Supabase)
const MOCK_ACTIVITIES: ActivityItem[] = [
  {
    id: '1',
    type: 'login',
    userId: 'usr_001',
    userName: 'Administrador Sistema',
    description: 'Realizou login no sistema',
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 min atrás
  },
  {
    id: '2',
    type: 'action_updated',
    userId: 'usr_002',
    userName: 'Maria Silva',
    description: 'Atualizou ação',
    details: 'Mapear o ambiente de informação - Progresso: 100%',
    timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 min atrás
    microregiaoId: 'MR009',
    microregiaoNome: 'Poços de Caldas',
  },
  {
    id: '3',
    type: 'user_created',
    userId: 'usr_001',
    userName: 'Administrador Sistema',
    description: 'Criou novo usuário',
    details: 'João Santos (usuario.pocos@saude.mg.gov.br)',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2h atrás
  },
  {
    id: '4',
    type: 'lgpd_accepted',
    userId: 'usr_003',
    userName: 'João Santos',
    description: 'Aceitou termos LGPD',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3h atrás
  },
  {
    id: '5',
    type: 'action_created',
    userId: 'usr_002',
    userName: 'Maria Silva',
    description: 'Criou nova ação',
    details: 'Realizar capacitação técnica',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5h atrás
    microregiaoId: 'MR009',
    microregiaoNome: 'Poços de Caldas',
  },
  {
    id: '6',
    type: 'view_micro',
    userId: 'usr_001',
    userName: 'Administrador Sistema',
    description: 'Visualizou microrregião',
    details: 'Belo Horizonte',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6h atrás
    microregiaoId: 'MR001',
    microregiaoNome: 'Belo Horizonte',
  },
  {
    id: '7',
    type: 'user_deactivated',
    userId: 'usr_001',
    userName: 'Administrador Sistema',
    description: 'Desativou usuário',
    details: 'Usuário Inativo',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 dia atrás
  },
  {
    id: '8',
    type: 'action_deleted',
    userId: 'usr_004',
    userName: 'Ana Oliveira',
    description: 'Removeu ação',
    details: 'Ação duplicada removida',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 dias atrás
    microregiaoId: 'MR010',
    microregiaoNome: 'Varginha',
  },
];

export function ActivityLog({ maxItems = 10 }: ActivityLogProps) {
  const activities = useMemo(() => {
    return MOCK_ACTIVITIES.slice(0, maxItems);
  }, [maxItems]);

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'login': return <LogIn className="w-4 h-4" />;
      case 'logout': return <LogOut className="w-4 h-4" />;
      case 'user_created': return <UserPlus className="w-4 h-4" />;
      case 'user_updated': return <UserCheck className="w-4 h-4" />;
      case 'user_deactivated': return <UserX className="w-4 h-4" />;
      case 'lgpd_accepted': return <Shield className="w-4 h-4" />;
      case 'action_created': return <Plus className="w-4 h-4" />;
      case 'action_updated': return <Edit3 className="w-4 h-4" />;
      case 'action_deleted': return <Trash2 className="w-4 h-4" />;
      case 'view_micro': return <Eye className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: ActivityType) => {
    switch (type) {
      case 'login':
      case 'logout':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/30';
      case 'user_created':
      case 'user_updated':
        return 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/30';
      case 'user_deactivated':
        return 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/30';
      case 'lgpd_accepted':
        return 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/30';
      case 'action_created':
        return 'bg-teal-100 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800/30';
      case 'action_updated':
        return 'bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/30';
      case 'action_deleted':
        return 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/30';
      case 'view_micro':
        return 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600';
      default:
        return 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600';
    }
  };

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

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Atividade Recente</h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Últimas atividades
          </span>
        </div>
      </div>

      {/* Activity List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
        {activities.map((activity, index) => (
          <div
            key={activity.id}
            className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
          >
            <div className="flex gap-3">
              {/* Icon */}
              <div className={`p-2 rounded-lg border ${getActivityColor(activity.type)} flex-shrink-0`}>
                {getActivityIcon(activity.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-slate-800 dark:text-slate-200">
                      <span className="font-medium">{activity.userName}</span>
                      {' '}
                      <span className="text-slate-500 dark:text-slate-400">{activity.description}</span>
                    </p>
                    {activity.details && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate" title={activity.details}>
                        {activity.details}
                      </p>
                    )}
                    {activity.microregiaoNome && (
                      <span className="inline-flex items-center gap-1 mt-1 text-xs text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 px-2 py-0.5 rounded">
                        📍 {activity.microregiaoNome}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
                    {formatTimeAgo(activity.timestamp)}
                  </span>
                </div>
              </div>
            </div>

            {/* Timeline connector */}
            {index < activities.length - 1 && (
              <div className="ml-5 mt-3 h-3 border-l-2 border-dashed border-slate-200 dark:border-slate-700" />
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-700 text-center bg-slate-50 dark:bg-slate-700/30">
        <button className="text-sm text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium">
          Ver histórico completo
        </button>
      </div>
    </div>
  );
}




