import React, { useMemo } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Target, CheckCircle2, Clock, AlertTriangle, Calendar,
  ArrowUpRight, ArrowDownRight, Activity as ActivityIcon, Users,
  BarChart2, PieChart as PieChartIcon, UserPlus
} from 'lucide-react';
import { Action, TeamMember, Objective, Activity } from '../../types';
import { parseDateLocal, getTodayStr } from '../../lib/date';
import { useAuth } from '../../auth';

interface DashboardProps {
  actions: Action[];
  team: TeamMember[];
  objectives: Objective[];
  activities: Record<number, Activity[]>;
  onNavigate: (view: 'list', filters?: { status?: string; objectiveId?: number }) => void;
}

const COLORS = {
  concluido: '#10b981', // emerald-500
  emAndamento: '#3b82f6', // blue-500
  naoIniciado: '#94a3b8', // slate-400
  atrasado: '#f43f5e', // rose-500
  teal: '#14b8a6', // teal-500
  violet: '#8b5cf6', // violet-500
};

export const Dashboard: React.FC<DashboardProps> = ({
  actions,
  team,
  objectives,
  activities,
  onNavigate
}) => {
  const { user } = useAuth();

  const handleCardClick = (status?: string) => {
    onNavigate('list', { status });
  };

  // Calcular membros pendentes
  const pendingMembers = useMemo(() => {
    return team.filter(m => m.isRegistered === false);
  }, [team]);

  // Cálculo de métricas
  const metrics = useMemo(() => {
    const total = actions.length;
    const concluidos = actions.filter(a => a.status === 'Concluído').length;
    const emAndamento = actions.filter(a => a.status === 'Em Andamento').length;
    const naoIniciados = actions.filter(a => a.status === 'Não Iniciado').length;
    const atrasados = actions.filter(a => a.status === 'Atrasado').length;

    // Status Data para gráfico
    const statusData = [
      { name: 'Concluído', value: concluidos, color: COLORS.concluido },
      { name: 'Em Andamento', value: emAndamento, color: COLORS.emAndamento },
      { name: 'Não Iniciado', value: naoIniciados, color: COLORS.naoIniciado },
      { name: 'Atrasado', value: atrasados, color: COLORS.atrasado },
    ].filter(d => d.value > 0);

    // Progresso por objetivo
    const progressoPorObjetivo = objectives.map(obj => {
      const actIds = activities[obj.id]?.map(a => a.id) || [];
      const objActions = actions.filter(a => actIds.includes(a.activityId));
      const percentage = objActions.length > 0
        ? Math.round(objActions.reduce((sum, a) => sum + a.progress, 0) / objActions.length)
        : 0;
      return {
        name: `Obj ${obj.id}`,
        fullName: obj.title,
        progress: percentage,
        count: objActions.length
      };
    });

    // Próximos prazos (7 dias)
    const today = parseDateLocal(getTodayStr());
    const upcomingDeadlines = actions.filter(a => {
      const endDate = parseDateLocal(a.plannedEndDate || a.endDate);
      if (!endDate || !today) return false;
      const diffDays = (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 7 && a.status !== 'Concluído';
    }).sort((a, b) => {
      const dateA = parseDateLocal(a.plannedEndDate || a.endDate)?.getTime() || 0;
      const dateB = parseDateLocal(b.plannedEndDate || b.endDate)?.getTime() || 0;
      return dateA - dateB;
    }).slice(0, 5); // Top 5

    // Ações por membro da equipe (Top 5)
    // Considerando Membros com papel 'R' (Responsável)
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
  }, [actions, objectives, activities, team]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 shadow-lg rounded-lg text-xs">
          <p className="font-bold text-slate-800 dark:text-slate-100">{label || payload[0].name}</p>
          <p className="text-slate-600 dark:text-slate-400">
            {payload[0].value} {payload[0].dataKey === 'progress' ? '%' : 'ações'}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-8 animate-fade-in">
      {/* Alerta de Membros Pendentes */}
      {pendingMembers.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 flex items-start gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-800/50 rounded-lg shrink-0">
            <UserPlus className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-amber-800 dark:text-amber-300 text-sm">
              {pendingMembers.length} membro{pendingMembers.length > 1 ? 's' : ''} aguardando cadastro
            </h4>
            <p className="text-amber-700 dark:text-amber-400 text-xs mt-0.5">
              {pendingMembers.map(m => m.name).slice(0, 3).join(', ')}
              {pendingMembers.length > 3 && ` e mais ${pendingMembers.length - 3}...`}
            </p>
            <p className="text-amber-600 dark:text-amber-500 text-xs mt-1">
              Contate um administrador para criar as contas de acesso.
            </p>
          </div>
        </div>
      )}

      {/* Header com Boas-vindas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Visão Geral <span className="text-teal-600 dark:text-teal-400">Estratégica</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Olá, <strong>{user?.nome || 'Gestor'}</strong>! Aqui está o resumo atualizado da sua microrregião.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium">
          <Calendar size={16} className="text-teal-600 dark:text-teal-400" />
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* KPI Cards Modernos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total de Ações"
          value={metrics.total}
          icon={<Target size={24} className="text-white" />}
          gradient="from-slate-700 to-slate-800"
          subtext="Nos objetivos"
          onClick={() => onNavigate('list', {})}
        />
        <KpiCard
          title="Conclusão Geral"
          value={`${metrics.percentConcluido}%`}
          icon={<ActivityIcon size={24} className="text-white" />}
          gradient="from-teal-500 to-emerald-500"
          subtext={`${metrics.concluidos} concluídas`}
          trend="up"
          onClick={() => handleCardClick('Concluído')}
        />
        <KpiCard
          title="Em Execução"
          value={metrics.emAndamento}
          icon={<Clock size={24} className="text-white" />}
          gradient="from-blue-500 to-indigo-500"
          subtext="Ações ativas agora"
          onClick={() => handleCardClick('Em Andamento')}
        />
        <KpiCard
          title="Atenção Necessária"
          value={metrics.atrasados}
          icon={<AlertTriangle size={24} className="text-white" />}
          gradient={metrics.atrasados > 0 ? "from-rose-500 to-red-600" : "from-slate-400 to-slate-500"}
          subtext={metrics.atrasados > 0 ? "Ações atrasadas" : "Tudo dentro do prazo!"}
          trend={metrics.atrasados > 0 ? "down" : "neutral"}
          onClick={() => handleCardClick('Atrasado')}
        />
      </div>

      {/* Área Principal de Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Status Chart (Donut) */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-center">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2 w-full flex items-center gap-2">
            <PieChartIcon size={18} className="text-slate-400" />
            Distribuição de Status
          </h3>
          <div className="w-full h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                  onClick={(data) => handleCardClick(data.name)}
                  className="cursor-pointer"
                >
                  {metrics.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} className="hover:opacity-80 transition-opacity cursor-pointer" />
                  ))}
                </Pie>
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
            {/* Total Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
              <span className="text-3xl font-bold text-slate-800 dark:text-slate-100">{metrics.total}</span>
              <span className="text-xs text-slate-400 font-medium uppercase">Ações</span>
            </div>
          </div>
        </div>

        {/* Progresso por Objetivo (Bar Chart) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-6 w-full flex items-center gap-2">
            <BarChart2 size={18} className="text-slate-400" />
            Performance por Objetivo
          </h3>
          <div className="w-full h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={metrics.progressoPorObjetivo}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                layout="vertical"
                onClick={(data: any) => {
                  if (data && data.activePayload && data.activePayload.length > 0) {
                    const objId = data.activePayload[0].payload.id;
                    onNavigate('list', { objectiveId: objId });
                  }
                }}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(148, 163, 184, 0.2)" />
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis dataKey="name" type="category" width={50} tick={{ fontSize: 12, fill: '#64748b' }} />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                  content={({ active, payload }) => {
                    if (active && payload?.[0]) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg text-xs max-w-[200px]">
                          <p className="font-bold text-slate-800 dark:text-slate-100 mb-1">{data.fullName}</p>
                          <div className="flex justify-between gap-4">
                            <span>Progresso:</span>
                            <span className="font-bold text-teal-600 dark:text-teal-400">{data.progress}%</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span>Ações:</span>
                            <span className="font-bold">{data.count}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="progress" radius={[0, 4, 4, 0]} barSize={20} className="cursor-pointer">
                  {metrics.progressoPorObjetivo.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.progress === 100 ? COLORS.concluido : COLORS.teal} className="hover:opacity-80 transition-opacity" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Linha Inferior: Equipe e Prazos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Próximas Entregas */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Clock size={18} className="text-amber-500" />
            Próximos Prazos (7 dias)
          </h3>
          <div className="space-y-3">
            {metrics.upcomingDeadlines.length > 0 ? (
              metrics.upcomingDeadlines.map(action => (
                <div key={action.uid} className="flex items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-200 font-bold text-xs shadow-sm">
                    {action.id}
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{action.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Calendar size={10} />
                      {action.plannedEndDate || action.endDate}
                    </p>
                  </div>
                  <div className="ml-2">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${action.status === 'Atrasado' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      }`}>
                      {action.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50 dark:bg-slate-700/50 rounded-xl border-dashed border-2 border-slate-200 dark:border-slate-600">
                <CheckCircle2 size={32} className="text-emerald-400 mb-2" />
                <p className="text-slate-600 dark:text-slate-300 font-medium">Tudo tranquilo!</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Nenhuma entrega urgente para os próximos dias.</p>
              </div>
            )}
          </div>
        </div>

        {/* Carga de Trabalho da Equipe */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Users size={18} className="text-violet-500" />
            Ações Pendentes por Membro
          </h3>
          <div className="space-y-4">
            {metrics.actionsByMember.map((member, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold border border-slate-200 dark:border-slate-600">
                  {member.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{member.fullName}</span>
                    <span className="text-slate-500 dark:text-slate-400 font-medium">{member.count} ações</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-500 rounded-full"
                      style={{ width: `${Math.min((member.count / 10) * 100, 100)}%` }} // Escala arbitrária de 10 como "muito"
                    />
                  </div>
                </div>
              </div>
            ))}
            {metrics.actionsByMember.length === 0 && (
              <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-sm italic">
                Nenhuma ação atribuída ainda.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

// Subcomponente de Card KPI
const KpiCard = ({ title, value, icon, gradient, subtext, trend, onClick }: any) => (
  <div
    onClick={onClick}
    className={`p-5 rounded-2xl shadow-lg bg-gradient-to-br ${gradient} text-white relative overflow-hidden group hover:scale-[1.02] transition-transform ${onClick ? 'cursor-pointer active:scale-95' : ''}`}
  >
    {/* Decoração de fundo */}
    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>

    <div className="flex justify-between items-start relative z-10">
      <div>
        <p className="text-white/80 text-xs font-semibold uppercase tracking-wider mb-1">{title}</p>
        <h3 className="text-3xl font-bold">{value}</h3>
      </div>
      <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
        {icon}
      </div>
    </div>

    <div className="mt-4 flex items-center gap-2 relative z-10">
      {trend === 'up' && <div className="bg-emerald-500/20 p-0.5 rounded text-emerald-100"><ArrowUpRight size={14} /></div>}
      {trend === 'down' && <div className="bg-rose-500/20 p-0.5 rounded text-rose-100"><ArrowDownRight size={14} /></div>}
      <p className="text-xs text-white/70 font-medium">
        {subtext}
      </p>
    </div>
  </div>
);
