import { useMemo, useState } from 'react';
import {
  TrendingUp,
  Users,
  MapPin,
  Target,
  BarChart3,
  Calendar,
  AlertOctagon,
  Clock,
  Briefcase,
  UserPlus
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts';
import { Action, TeamMember } from '../../../types';
import { User } from '../../../types/auth.types';
import { MICROREGIOES, getMicroregioesByMacro, MACRORREGIOES, getMicroregiaoById } from '../../../data/microregioes';
import { DashboardFiltersState } from './DashboardFilters';
import { KpiDetailModal } from './KpiDetailModal';

interface AdminOverviewProps {
  actions: Action[];
  users: User[];
  teams: Record<string, TeamMember[]>;
  filters?: DashboardFiltersState;
  children?: React.ReactNode;
  onTabChange?: (tab: 'alertas' | 'microregioes' | 'usuarios' | 'ranking') => void;
  pendingCount?: number;
}

// Card Minimalista Profissional
interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  onClick?: () => void;
}

function MetricCard({ title, value, subtitle, icon, trend, onClick }: MetricCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5 shadow-sm transition-all ${onClick ? 'cursor-pointer hover:shadow-md hover:border-teal-200 dark:hover:border-teal-800 active:scale-[0.99]' : ''}`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400">
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${trend.isPositive
            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
            : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400'
            }`}>
            <TrendingUp className={`w-3 h-3 ${!trend.isPositive && 'rotate-180'}`} />
            {trend.value}%
          </div>
        )}
      </div>
      <div>
        <h3 className="text-3xl font-light text-slate-900 dark:text-slate-100 tracking-tight">{value}</h3>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">{title}</p>
        {subtitle && (
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 font-light">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

// Tooltip Clean para gráficos
const CleanTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-lg shadow-xl text-sm">
        <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span>{entry.name}: <span className="font-medium text-slate-900 dark:text-slate-100">{entry.value}</span></span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function AdminOverview({ actions, users, teams, filters, children, onTabChange, pendingCount }: AdminOverviewProps) {
  // Filter actions and users based on selected filters
  const filteredData = useMemo(() => {
    let filteredActions = actions;
    let filteredUsers = users;

    if (filters?.selectedMacroId) {
      const macro = MACRORREGIOES.find(m => m.id === filters.selectedMacroId);
      if (macro) {
        const micros = getMicroregioesByMacro(macro.nome);
        const microIds = new Set(micros.map(m => m.id));
        filteredActions = actions.filter(a => microIds.has(a.microregiaoId));
        filteredUsers = users.filter(u => microIds.has(u.microregiaoId));
      }
    }

    if (filters?.selectedMicroId) {
      filteredActions = filteredActions.filter(a => a.microregiaoId === filters.selectedMicroId);
      filteredUsers = filteredUsers.filter(u => u.microregiaoId === filters.selectedMicroId);
    }

    return { actions: filteredActions, users: filteredUsers };
  }, [actions, users, filters]);

  // Calcular métricas
  const metrics = useMemo(() => {
    const { actions: filteredActions, users: filteredUsers } = filteredData;
    const totalMicros = MICROREGIOES.length;
    const microsComAcoes = new Set(filteredActions.map(a => a.microregiaoId)).size;
    const taxaCobertura = Math.round((microsComAcoes / totalMicros) * 100);

    const totalAcoes = filteredActions.length;
    const concluidas = filteredActions.filter(a => a.status === 'Concluído').length;
    const andamento = filteredActions.filter(a => a.status === 'Em Andamento').length;
    const naoIniciadas = filteredActions.filter(a => a.status === 'Não Iniciado').length;

    // Cálculo de Prazos (Deadline Horizon)
    const hoje = new Date();
    const em7Dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);
    const em30Dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);

    const atrasadas = filteredActions.filter(a => {
      if (a.status === 'Concluído') return false;
      return new Date(a.plannedEndDate) < hoje;
    }).length;

    const vencendoHoje = filteredActions.filter(a => {
      if (a.status === 'Concluído') return false;
      const prazo = new Date(a.plannedEndDate);
      return prazo >= hoje && prazo < new Date(hoje.getTime() + 24 * 60 * 60 * 1000);
    }).length;

    const vencendo7Dias = filteredActions.filter(a => {
      if (a.status === 'Concluído') return false;
      const prazo = new Date(a.plannedEndDate);
      return prazo >= hoje && prazo <= em7Dias;
    }).length;

    const vencendo30Dias = filteredActions.filter(a => {
      if (a.status === 'Concluído') return false;
      const prazo = new Date(a.plannedEndDate);
      return prazo > em7Dias && prazo <= em30Dias;
    }).length;

    const futuro = filteredActions.filter(a => {
      if (a.status === 'Concluído') return false;
      return new Date(a.plannedEndDate) > em30Dias;
    }).length;

    const taxaConclusao = totalAcoes > 0 ? Math.round((concluidas / totalAcoes) * 100) : 0;
    const usuariosAtivos = filteredUsers.filter(u => u.ativo).length;

    return {
      totalAcoes,
      concluidas,
      andamento,
      naoIniciadas,
      atrasadas,
      taxaConclusao,
      taxaCobertura,
      usuariosAtivos,
      deadlineHorizon: [
        { name: 'Atrasadas', value: atrasadas, color: '#f43f5e' }, // Rose 500
        { name: 'Hoje', value: vencendoHoje, color: '#f59e0b' }, // Amber 500
        { name: '7 Dias', value: vencendo7Dias, color: '#3b82f6' }, // Blue 500
        { name: '30 Dias', value: vencendo30Dias, color: '#64748b' }, // Slate 500
        { name: 'Futuro', value: futuro, color: '#94a3b8' }, // Slate 400
      ]
    };
  }, [filteredData]);

  // Cores sóbrias para status
  const statusData = [
    { name: 'Concluídas', value: metrics.concluidas, color: '#10b981' }, // Emerald 500
    { name: 'Em Andamento', value: metrics.andamento, color: '#3b82f6' }, // Blue 500
    { name: 'Não Iniciadas', value: metrics.naoIniciadas, color: '#94a3b8' }, // Slate 400
    { name: 'Atrasadas', value: metrics.atrasadas, color: '#f43f5e' }, // Rose 500
  ].filter(d => d.value > 0);

  // Modal state
  const [openModal, setOpenModal] = useState<'conclusao' | 'risco' | 'cobertura' | 'horizonte' | 'status' | null>(null);

  // Dados detalhados para modais
  const detailedData = useMemo(() => {
    const { actions: filteredActions } = filteredData;
    const hoje = new Date();
    const em7Dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);
    const em30Dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Helper to create action summary
    const toActionSummary = (a: Action) => {
      const micro = getMicroregiaoById(a.microregiaoId);
      return {
        uid: a.uid,
        id: a.id,
        title: a.title,
        status: a.status,
        plannedEndDate: new Date(a.plannedEndDate).toLocaleDateString('pt-BR'),
        responsible: a.raci?.find(r => r.role === 'R')?.name || '',
        microName: micro?.nome || '',
      };
    };

    // Progress by Objective (simulated - based on action title patterns)
    const objectiveProgress = [
      { id: 1, name: 'Objetivo 1 - Atenção Primária', total: 0, completed: 0, percentage: 0 },
      { id: 2, name: 'Objetivo 2 - Gestão Regional', total: 0, completed: 0, percentage: 0 },
      { id: 3, name: 'Objetivo 3 - Transformação Digital', total: 0, completed: 0, percentage: 0 },
      { id: 4, name: 'Objetivo 4 - Capacitação', total: 0, completed: 0, percentage: 0 },
    ];

    filteredActions.forEach(action => {
      const actId = typeof action.activityId === 'number' ? action.activityId : parseInt(String(action.activityId || '1'), 10);
      const objIndex = Math.floor(actId / 3);
      if (objIndex >= 0 && objIndex < objectiveProgress.length) {
        objectiveProgress[objIndex].total++;
        if (action.status === 'Concluído') {
          objectiveProgress[objIndex].completed++;
        }
      }
    });

    objectiveProgress.forEach(obj => {
      obj.percentage = obj.total > 0 ? Math.round((obj.completed / obj.total) * 100) : 0;
    });

    // Overdue Actions (para modal Risco)
    const overdueActions = filteredActions
      .filter(a => a.status !== 'Concluído' && new Date(a.plannedEndDate) < hoje)
      .map(a => {
        const prazoDate = new Date(a.plannedEndDate);
        const daysOverdue = Math.floor((hoje.getTime() - prazoDate.getTime()) / (1000 * 60 * 60 * 24));
        return {
          uid: a.uid,
          id: a.id,
          title: a.title,
          plannedEndDate: prazoDate.toLocaleDateString('pt-BR'),
          responsible: a.raci?.find(r => r.role === 'R')?.name || '',
          daysOverdue,
        };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    // Micro Coverage
    const actionCountByMicro = new Map<string, number>();
    filteredActions.forEach(a => {
      actionCountByMicro.set(a.microregiaoId, (actionCountByMicro.get(a.microregiaoId) || 0) + 1);
    });

    const microCoverage = MICROREGIOES.map(m => ({
      id: m.id,
      nome: m.nome,
      macrorregiao: m.macrorregiao,
      hasActions: actionCountByMicro.has(m.id),
      actionCount: actionCountByMicro.get(m.id) || 0,
    })).sort((a, b) => {
      if (a.hasActions !== b.hasActions) return a.hasActions ? -1 : 1;
      return a.nome.localeCompare(b.nome);
    });

    // ============ DEADLINE HORIZON COM AÇÕES ============
    const atrasadas = filteredActions.filter(a =>
      a.status !== 'Concluído' && new Date(a.plannedEndDate) < hoje
    );
    const vencendoHoje = filteredActions.filter(a => {
      if (a.status === 'Concluído') return false;
      const prazo = new Date(a.plannedEndDate);
      const amanha = new Date(hoje.getTime() + 24 * 60 * 60 * 1000);
      return prazo >= hoje && prazo < amanha;
    });
    const vencendo7Dias = filteredActions.filter(a => {
      if (a.status === 'Concluído') return false;
      const prazo = new Date(a.plannedEndDate);
      const amanha = new Date(hoje.getTime() + 24 * 60 * 60 * 1000);
      return prazo >= amanha && prazo <= em7Dias;
    });
    const vencendo30Dias = filteredActions.filter(a => {
      if (a.status === 'Concluído') return false;
      const prazo = new Date(a.plannedEndDate);
      return prazo > em7Dias && prazo <= em30Dias;
    });
    const futuro = filteredActions.filter(a => {
      if (a.status === 'Concluído') return false;
      return new Date(a.plannedEndDate) > em30Dias;
    });

    const deadlineHorizonWithActions = [
      { name: 'Atrasadas', value: atrasadas.length, color: '#f43f5e', actions: atrasadas.map(toActionSummary) },
      { name: 'Hoje', value: vencendoHoje.length, color: '#f59e0b', actions: vencendoHoje.map(toActionSummary) },
      { name: '7 Dias', value: vencendo7Dias.length, color: '#3b82f6', actions: vencendo7Dias.map(toActionSummary) },
      { name: '30 Dias', value: vencendo30Dias.length, color: '#64748b', actions: vencendo30Dias.map(toActionSummary) },
      { name: 'Futuro', value: futuro.length, color: '#94a3b8', actions: futuro.map(toActionSummary) },
    ];

    // ============ STATUS DATA COM AÇÕES ============
    const concluidas = filteredActions.filter(a => a.status === 'Concluído');
    const emAndamento = filteredActions.filter(a => a.status === 'Em Andamento');
    const naoIniciadas = filteredActions.filter(a => a.status === 'Não Iniciado');
    const atrasadasStatus = filteredActions.filter(a =>
      a.status !== 'Concluído' && new Date(a.plannedEndDate) < hoje
    );

    const statusWithActions = [
      { name: 'Concluídas', value: concluidas.length, color: '#10b981', actions: concluidas.map(toActionSummary) },
      { name: 'Em Andamento', value: emAndamento.length, color: '#3b82f6', actions: emAndamento.map(toActionSummary) },
      { name: 'Não Iniciadas', value: naoIniciadas.length, color: '#94a3b8', actions: naoIniciadas.map(toActionSummary) },
      { name: 'Atrasadas', value: atrasadasStatus.length, color: '#f43f5e', actions: atrasadasStatus.map(toActionSummary) },
    ].filter(d => d.value > 0);

    return {
      objectiveProgress: objectiveProgress.filter(o => o.total > 0),
      overdueActions,
      microCoverage,
      deadlineHorizonWithActions,
      statusWithActions,
    };
  }, [filteredData]);


  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Linha 1: KPIs Executivos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Taxa de Conclusão"
          value={`${metrics.taxaConclusao}%`}
          subtitle="Meta anual: 85%"
          icon={<Target className="w-5 h-5" />}
          trend={{ value: 2.5, isPositive: true }}
          onClick={() => setOpenModal('conclusao')}
        />
        <MetricCard
          title="Risco de Prazo"
          value={metrics.atrasadas}
          subtitle="Ações atrasadas"
          icon={<AlertOctagon className="w-5 h-5" />}
          trend={{ value: 12, isPositive: false }}
          onClick={() => setOpenModal('risco')}
        />
        <MetricCard
          title="Cobertura Regional"
          value={`${metrics.taxaCobertura}%`}
          subtitle="Microrregiões ativas"
          icon={<MapPin className="w-5 h-5" />}
          onClick={() => setOpenModal('cobertura')}
        />
        <MetricCard
          title="Força de Trabalho"
          value={metrics.usuariosAtivos}
          subtitle="Usuários ativos"
          icon={<Briefcase className="w-5 h-5" />}
          onClick={() => onTabChange?.('usuarios')}
        />
        {/* Card Pendentes - Estilo Especial */}
        {pendingCount !== undefined && pendingCount > 0 ? (
          <div
            onClick={() => onTabChange?.('usuarios')}
            className="bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-lg border border-amber-200 dark:border-amber-700 p-5 shadow-sm transition-all cursor-pointer hover:shadow-md hover:border-amber-300 dark:hover:border-amber-600 active:scale-[0.99] group"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="p-2 bg-amber-100 dark:bg-amber-800/50 rounded-lg text-amber-600 dark:text-amber-400">
                <UserPlus className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-amber-200/60 dark:bg-amber-800/50 text-amber-700 dark:text-amber-300 animate-pulse">
                Ação necessária
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-light text-amber-800 dark:text-amber-300 tracking-tight">{pendingCount}</h3>
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mt-1">Cadastros Pendentes</p>
              <p className="text-sm text-amber-600 dark:text-amber-500 mt-1 font-light group-hover:underline">Clique para gerenciar →</p>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-500 dark:text-emerald-400">
                <UserPlus className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-light text-slate-900 dark:text-slate-100 tracking-tight">0</h3>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Cadastros Pendentes</p>
              <p className="text-sm text-emerald-500 dark:text-emerald-400 mt-1 font-light">Tudo em dia ✓</p>
            </div>
          </div>
        )}
      </div>

      {children}

      {/* Linha 2: Gráficos de Gestão */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Gráfico 1: Horizonte de Prazos (2/3 largura) */}
        <div
          onClick={() => setOpenModal('horizonte')}
          className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 shadow-sm transition-all hover:shadow-md cursor-pointer"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                Horizonte de Prazos
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Volume de entregas previstas por período</p>
            </div>
            {metrics.deadlineHorizon[1].value > 0 && (
              <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                {metrics.deadlineHorizon[1].value} vencendo hoje
              </span>
            )}
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.deadlineHorizon} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.2)" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <Tooltip content={<CleanTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
                  {metrics.deadlineHorizon.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Status Donut (1/3 largura) */}
        <div
          onClick={() => setOpenModal('status')}
          className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col transition-all hover:shadow-md cursor-pointer"
        >
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            Status Global
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Distribuição atual da carteira</p>

          <div className="h-64 relative w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CleanTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Total Center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-light text-slate-900 dark:text-slate-100">{metrics.totalAcoes}</span>
              <span className="text-xs text-slate-400 uppercase tracking-widest">Total</span>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {statusData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 dark:text-slate-400">{item.name}</span>
                </div>
                <span className="font-semibold text-slate-900 dark:text-slate-200">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* KPI Detail Modals */}
      <KpiDetailModal
        type="conclusao"
        isOpen={openModal === 'conclusao'}
        onClose={() => setOpenModal(null)}
        objectiveProgress={detailedData.objectiveProgress}
        totalActions={metrics.totalAcoes}
        completedActions={metrics.concluidas}
        completionRate={metrics.taxaConclusao}
      />
      <KpiDetailModal
        type="risco"
        isOpen={openModal === 'risco'}
        onClose={() => setOpenModal(null)}
        overdueActions={detailedData.overdueActions}
      />
      <KpiDetailModal
        type="cobertura"
        isOpen={openModal === 'cobertura'}
        onClose={() => setOpenModal(null)}
        microCoverage={detailedData.microCoverage}
        coverageRate={metrics.taxaCobertura}
      />
      <KpiDetailModal
        type="horizonte"
        isOpen={openModal === 'horizonte'}
        onClose={() => setOpenModal(null)}
        deadlineHorizon={detailedData.deadlineHorizonWithActions}
      />
      <KpiDetailModal
        type="status"
        isOpen={openModal === 'status'}
        onClose={() => setOpenModal(null)}
        statusData={detailedData.statusWithActions}
        totalActions={metrics.totalAcoes}
      />
    </div>
  );
}
