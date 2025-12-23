import { useMemo } from 'react';
import {
  TrendingUp,
  Users,
  MapPin,
  Target,
  BarChart3,
  Calendar,
  AlertOctagon,
  Clock,
  Briefcase
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
import { MICROREGIOES } from '../../../data/microregioes';

interface AdminOverviewProps {
  actions: Action[];
  users: User[];
  teams: Record<string, TeamMember[]>;
}

// Card Minimalista Profissional
interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
}

function MetricCard({ title, value, subtitle, icon, trend }: MetricCardProps) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <div className="p-2 bg-slate-50 rounded-lg text-slate-500">
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${trend.isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}>
            <TrendingUp className={`w-3 h-3 ${!trend.isPositive && 'rotate-180'}`} />
            {trend.value}%
          </div>
        )}
      </div>
      <div>
        <h3 className="text-3xl font-light text-slate-900 tracking-tight">{value}</h3>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">{title}</p>
        {subtitle && (
          <p className="text-sm text-slate-400 mt-1 font-light">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

// Tooltip Clean para gráficos
const CleanTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-xl text-sm">
        <p className="font-semibold text-slate-800 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-slate-600">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span>{entry.name}: <span className="font-medium text-slate-900">{entry.value}</span></span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function AdminOverview({ actions, users, teams }: AdminOverviewProps) {
  // Calcular métricas
  const metrics = useMemo(() => {
    const totalMicros = MICROREGIOES.length;
    const microsComAcoes = new Set(actions.map(a => a.microregiaoId)).size;
    const taxaCobertura = Math.round((microsComAcoes / totalMicros) * 100);

    const totalAcoes = actions.length;
    const concluidas = actions.filter(a => a.status === 'Concluído').length;
    const andamento = actions.filter(a => a.status === 'Em Andamento').length;
    const naoIniciadas = actions.filter(a => a.status === 'Não Iniciado').length;

    // Cálculo de Prazos (Deadline Horizon)
    const hoje = new Date();
    const em7Dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);
    const em30Dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);

    const atrasadas = actions.filter(a => {
      if (a.status === 'Concluído') return false;
      return new Date(a.plannedEndDate) < hoje;
    }).length;

    const vencendoHoje = actions.filter(a => {
      if (a.status === 'Concluído') return false;
      const prazo = new Date(a.plannedEndDate);
      return prazo >= hoje && prazo < new Date(hoje.getTime() + 24 * 60 * 60 * 1000);
    }).length;

    const vencendo7Dias = actions.filter(a => {
      if (a.status === 'Concluído') return false;
      const prazo = new Date(a.plannedEndDate);
      return prazo >= hoje && prazo <= em7Dias;
    }).length;

    const vencendo30Dias = actions.filter(a => {
      if (a.status === 'Concluído') return false;
      const prazo = new Date(a.plannedEndDate);
      return prazo > em7Dias && prazo <= em30Dias;
    }).length;

    const futuro = actions.filter(a => {
      if (a.status === 'Concluído') return false;
      return new Date(a.plannedEndDate) > em30Dias;
    }).length;

    const taxaConclusao = totalAcoes > 0 ? Math.round((concluidas / totalAcoes) * 100) : 0;
    const usuariosAtivos = users.filter(u => u.ativo).length;

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
  }, [actions, users, teams]);

  // Cores sóbrias para status
  const statusData = [
    { name: 'Concluídas', value: metrics.concluidas, color: '#10b981' }, // Emerald 500
    { name: 'Em Andamento', value: metrics.andamento, color: '#3b82f6' }, // Blue 500
    { name: 'Não Iniciadas', value: metrics.naoIniciadas, color: '#94a3b8' }, // Slate 400
    { name: 'Atrasadas', value: metrics.atrasadas, color: '#f43f5e' }, // Rose 500
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Linha 1: KPIs Executivos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Taxa de Conclusão"
          value={`${metrics.taxaConclusao}%`}
          subtitle="Meta anual: 85%"
          icon={<Target className="w-5 h-5" />}
          trend={{ value: 2.5, isPositive: true }}
        />
        <MetricCard
          title="Risco de Prazo"
          value={metrics.atrasadas}
          subtitle="Ações atrasadas"
          icon={<AlertOctagon className="w-5 h-5" />}
          trend={{ value: 12, isPositive: false }}
        />
        <MetricCard
          title="Cobertura Regional"
          value={`${metrics.taxaCobertura}%`}
          subtitle="Microrregiões ativas"
          icon={<MapPin className="w-5 h-5" />}
        />
        <MetricCard
          title="Força de Trabalho"
          value={metrics.usuariosAtivos}
          subtitle="Usuários ativos"
          icon={<Briefcase className="w-5 h-5" />}
        />
      </div>

      {/* Linha 2: Gráficos de Gestão */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Gráfico 1: Horizonte de Prazos (2/3 largura) */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-slate-500" />
                Horizonte de Prazos
              </h3>
              <p className="text-sm text-slate-500">Volume de entregas previstas por período</p>
            </div>
            {metrics.deadlineHorizon[1].value > 0 && (
              <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                {metrics.deadlineHorizon[1].value} vencendo hoje
              </span>
            )}
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.deadlineHorizon} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
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
                <Tooltip content={<CleanTooltip />} cursor={{ fill: '#f1f5f9' }} />
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
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm flex flex-col">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-slate-500" />
            Status Global
          </h3>
          <p className="text-sm text-slate-500 mb-6">Distribuição atual da carteira</p>

          <div className="flex-1 min-h-[200px] relative">
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
              <span className="text-3xl font-light text-slate-900">{metrics.totalAcoes}</span>
              <span className="text-xs text-slate-400 uppercase tracking-widest">Total</span>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {statusData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <span className="font-semibold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
