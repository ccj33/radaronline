import React, { useMemo } from 'react';
import { 
  Target, CheckCircle2, Clock, AlertTriangle, Users, Calendar,
  BarChart2, PieChart
} from 'lucide-react';
import { Action, TeamMember, Objective, Activity } from '../../types';
import { StatsCard } from '../../components/common/StatsCard';
import { ProgressRing } from '../../components/common/ProgressRing';
import { parseDateLocal, getTodayStr } from '../../lib/date';

interface DashboardProps {
  actions: Action[];
  team: TeamMember[];
  objectives: Objective[];
  activities: Record<number, Activity[]>;
}

export const Dashboard: React.FC<DashboardProps> = ({
  actions,
  team,
  objectives,
  activities,
}) => {
  // Cálculo de métricas
  const metrics = useMemo(() => {
    const total = actions.length;
    const concluidos = actions.filter(a => a.status === 'Concluído').length;
    const emAndamento = actions.filter(a => a.status === 'Em Andamento').length;
    const naoIniciados = actions.filter(a => a.status === 'Não Iniciado').length;
    const atrasados = actions.filter(a => a.status === 'Atrasado').length;

    const today = parseDateLocal(getTodayStr());
    const proximosPrazos = actions.filter(a => {
      const endDate = parseDateLocal(a.plannedEndDate || a.endDate);
      if (!endDate || !today) return false;
      const diffDays = (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 7 && a.status !== 'Concluído';
    }).length;

    const progressoGeral = total > 0 
      ? actions.reduce((sum, a) => sum + a.progress, 0) / total 
      : 0;

    // Progresso por objetivo
    const progressoPorObjetivo = objectives.map(obj => {
      const actIds = activities[obj.id]?.map(a => a.id) || [];
      const objActions = actions.filter(a => actIds.includes(a.activityId));
      const objProgress = objActions.length > 0
        ? objActions.reduce((sum, a) => sum + a.progress, 0) / objActions.length
        : 0;
      return { ...obj, progress: objProgress, actionCount: objActions.length };
    });

    return {
      total,
      concluidos,
      emAndamento,
      naoIniciados,
      atrasados,
      proximosPrazos,
      progressoGeral,
      progressoPorObjetivo,
    };
  }, [actions, objectives, activities]);

  // Dados para gráfico de barras de status
  const statusData = [
    { label: 'Concluído', value: metrics.concluidos, color: 'bg-emerald-500', percent: (metrics.concluidos / metrics.total) * 100 },
    { label: 'Em Andamento', value: metrics.emAndamento, color: 'bg-blue-500', percent: (metrics.emAndamento / metrics.total) * 100 },
    { label: 'Não Iniciado', value: metrics.naoIniciados, color: 'bg-slate-400', percent: (metrics.naoIniciados / metrics.total) * 100 },
    { label: 'Atrasado', value: metrics.atrasados, color: 'bg-rose-500', percent: (metrics.atrasados / metrics.total) * 100 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Dashboard</h2>
          <p className="text-sm text-slate-500 mt-1">Visão geral do plano de ação</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 bg-white px-3 py-2 rounded-lg border border-slate-200">
          <Calendar size={16} />
          <span>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total de Ações"
          value={metrics.total}
          subtitle={`${metrics.total} ações cadastradas`}
          icon={<Target size={20} />}
          color="teal"
        />
        <StatsCard
          title="Concluídas"
          value={metrics.concluidos}
          subtitle={`${Math.round((metrics.concluidos / metrics.total) * 100) || 0}% do total`}
          icon={<CheckCircle2 size={20} />}
          color="emerald"
          trend="up"
          trendValue={`+${metrics.concluidos} concluídas`}
        />
        <StatsCard
          title="Em Andamento"
          value={metrics.emAndamento}
          subtitle="Ações em execução"
          icon={<Clock size={20} />}
          color="blue"
        />
        <StatsCard
          title="Atrasadas"
          value={metrics.atrasados}
          subtitle={metrics.atrasados > 0 ? 'Requer atenção!' : 'Tudo em dia!'}
          icon={<AlertTriangle size={20} />}
          color="rose"
          trend={metrics.atrasados > 0 ? 'down' : 'neutral'}
          trendValue={metrics.atrasados > 0 ? 'Verificar prazos' : 'Nenhum atraso'}
        />
      </div>

      {/* Progresso Geral + Distribuição de Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progresso Geral */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
            <PieChart size={16} className="text-teal-600" />
            Progresso Geral
          </h3>
          <div className="flex items-center justify-center py-4">
            <ProgressRing 
              progress={metrics.progressoGeral} 
              size={160}
              strokeWidth={12}
              color="#0891b2"
              label="Completo"
            />
          </div>
        </div>

        {/* Distribuição de Status */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
            <BarChart2 size={16} className="text-blue-600" />
            Distribuição por Status
          </h3>
          <div className="space-y-4">
            {statusData.map((item, _i) => (
              <div key={_i} className="flex items-center gap-4">
                <div className="w-24 text-xs font-medium text-slate-600">{item.label}</div>
                <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${item.color} rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                    style={{ width: `${item.percent || 0}%` }}
                  >
                    {item.percent >= 10 && (
                      <span className="text-[10px] font-bold text-white">{item.value}</span>
                    )}
                  </div>
                </div>
                <div className="w-12 text-right text-sm font-bold text-slate-700">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Progresso por Objetivo */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
          <Target size={16} className="text-purple-600" />
          Progresso por Objetivo Estratégico
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {metrics.progressoPorObjetivo.map((obj, _i) => (
            <div 
              key={obj.id} 
              className="relative overflow-hidden rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow"
            >
              {/* Barra de progresso de fundo */}
              <div 
                className="absolute inset-0 bg-gradient-to-r from-teal-50 to-emerald-50 transition-all duration-500"
                style={{ width: `${obj.progress}%` }}
              />
              
              <div className="relative">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-400 uppercase">Objetivo {obj.id}</p>
                    <p className="text-sm font-bold text-slate-700 line-clamp-2 mt-1">{obj.title}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-bold text-teal-600">{Math.round(obj.progress)}%</p>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${obj.progress}%` }}
                  />
                </div>
                
                <p className="text-xs text-slate-500 mt-2">{obj.actionCount} ações</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Próximos Prazos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Calendar size={16} className="text-amber-600" />
            Próximos 7 Dias
          </h3>
          {metrics.proximosPrazos > 0 ? (
            <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={24} className="text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700">{metrics.proximosPrazos}</p>
                <p className="text-sm text-amber-600">ações com prazo nos próximos 7 dias</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle2 size={24} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-700">Tudo em dia!</p>
                <p className="text-sm text-emerald-600">Nenhum prazo urgente</p>
              </div>
            </div>
          )}
        </div>

        {/* Equipe */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Users size={16} className="text-purple-600" />
            Equipe
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {team.slice(0, 5).map((member, _i) => (
                <div 
                  key={member.id}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-sm"
                  title={member.name}
                >
                  {member.name.charAt(0)}
                </div>
              ))}
              {team.length > 5 && (
                <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-slate-600 text-xs font-bold">
                  +{team.length - 5}
                </div>
              )}
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{team.length}</p>
              <p className="text-sm text-slate-500">membros</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

