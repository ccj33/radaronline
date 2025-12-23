import { useMemo } from 'react';
import {
  AlertTriangle,
  Clock,
  UserX,
  Shield,
  MapPin,
  TrendingUp,
  Award,
  CheckCircle2,
  Zap,
  ChevronRight,
  Activity,
  Calendar
} from 'lucide-react';
import { Action } from '../../../types';
import { User } from '../../../types/auth.types';
import { getMicroregiaoById } from '../../../data/microregioes';

interface AlertsPanelProps {
  actions: Action[];
  users: User[];
  onViewMicrorregiao: (microId: string) => void;
}

type InsightType = 'alert_critico' | 'alert_warning' | 'alert_info' | 'insight_positive' | 'insight_neutral';

interface IntelligenceItem {
  id: string;
  type: InsightType;
  icon: any;
  title: string;
  description: string;
  value?: string;
  trend?: string; // "+10%"
  color: string; // "red", "amber", "emerald", "blue"
  actionLabel?: string;
  actionFn?: () => void;
  date?: string;
}

export function AlertsPanel({ actions, users, onViewMicrorregiao }: AlertsPanelProps) {
  const intelligenceItems = useMemo(() => {
    const items: IntelligenceItem[] = [];
    const hoje = new Date();
    const em7Dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);

    // ==========================================
    // 1. DETECÇÃO DE ALERTAS (Risco/Atenção)
    // ==========================================

    // Ações atrasadas (Crítico)
    actions.forEach(action => {
      if (action.status === 'Concluído') return;
      const prazo = new Date(action.plannedEndDate);

      if (prazo < hoje) {
        const diasAtraso = Math.ceil((hoje.getTime() - prazo.getTime()) / (1000 * 60 * 60 * 24));
        const micro = getMicroregiaoById(action.microregiaoId);

        items.push({
          id: `atraso-${action.uid}`,
          type: 'alert_critico',
          icon: AlertTriangle,
          title: 'Ação Atrasada',
          description: `${action.title} (${diasAtraso} dias)`,
          value: `-${diasAtraso}d`,
          color: 'red',
          actionLabel: micro?.nome,
          actionFn: () => onViewMicrorregiao(action.microregiaoId),
          date: action.plannedEndDate
        });
      }
    });

    // Ações vencendo (Atenção)
    actions.forEach(action => {
      if (action.status === 'Concluído') return;
      const prazo = new Date(action.plannedEndDate);

      if (prazo >= hoje && prazo <= em7Dias) {
        const diasRestantes = Math.ceil((prazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        const micro = getMicroregiaoById(action.microregiaoId);

        items.push({
          id: `vence-${action.uid}`,
          type: 'alert_warning',
          icon: Clock,
          title: 'Prazo Próximo',
          description: `${action.title}`,
          value: `${diasRestantes}d`,
          color: 'amber',
          actionLabel: micro?.nome,
          actionFn: () => onViewMicrorregiao(action.microregiaoId),
          date: action.plannedEndDate
        });
      }
    });

    // LGPD e Inativos
    users.forEach(user => {
      if (user.ativo && !user.lgpdConsentimento) {
        items.push({
          id: `lgpd-${user.id}`,
          type: 'alert_info',
          icon: Shield,
          title: 'Pendência LGPD',
          description: user.nome,
          color: 'purple',
          actionLabel: 'Ver',
          actionFn: () => { }
        });
      }
      if (!user.ativo) {
        items.push({
          id: `inativo-${user.id}`,
          type: 'alert_info',
          icon: UserX,
          title: 'Usuário Inativo',
          description: user.nome,
          color: 'slate',
          actionLabel: 'Gerenciar',
          actionFn: () => { }
        });
      }
    });

    // ==========================================
    // 2. GERAÇÃO DE INSIGHTS POSITIVOS
    // Só gera se não houver muitos alertas críticos explodindo a tela
    // ==========================================

    // Insights de Produtividade (Semanal)
    // Verifica se "endDate" existe, senão usa updatedAt como fallback se status for Concluído
    const sevenDaysAgo = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
    const completedLastWeek = actions.filter(a =>
      a.status === 'Concluído' &&
      new Date(a.endDate || a.updatedAt || '').getTime() >= sevenDaysAgo.getTime()
    ).length;

    if (completedLastWeek > 0) {
      items.push({
        id: 'insight-produtividade',
        type: 'insight_positive',
        icon: Zap,
        title: 'Alta Produtividade',
        description: `${completedLastWeek} ações concluídas nos últimos 7 dias`,
        value: `+${completedLastWeek}`,
        color: 'emerald',
      });
    }

    // Top Região (Maior % de Conclusão)
    const regionStats = new Map<string, { total: number, done: number }>();
    actions.forEach(a => {
      const micro = getMicroregiaoById(a.microregiaoId);
      if (!micro) return;
      // Agrupar por Macrorregião
      const macro = micro.macrorregiao || 'Outros';

      const stat = regionStats.get(macro) || { total: 0, done: 0 };
      stat.total++;
      if (a.status === 'Concluído') stat.done++;
      regionStats.set(macro, stat);
    });

    let topRegion = { name: '', percent: 0 };
    regionStats.forEach((stat, name) => {
      if (stat.total < 3) return; // Ignorar regiões com pouquíssimas ações
      const pct = (stat.done / stat.total) * 100;
      if (pct > topRegion.percent) {
        topRegion = { name, percent: pct };
      }
    });

    if (topRegion.percent > 50) {
      items.push({
        id: 'insight-top-region',
        type: 'insight_positive',
        icon: Award,
        title: 'Região Destaque',
        description: `${topRegion.name} lidera com ${Math.round(topRegion.percent)}% de eficácia`,
        color: 'blue'
      });
    }

    // Progresso Global
    const totalActions = actions.length;
    const totalDone = actions.filter(a => a.status === 'Concluído').length;
    const globalProgress = totalActions > 0 ? (totalDone / totalActions) * 100 : 0;

    if (globalProgress > 30) {
      items.push({
        id: 'insight-global',
        type: 'insight_neutral',
        icon: TrendingUp,
        title: 'Progresso Global',
        description: `Avanço geral do projeto atingiu ${Math.round(globalProgress)}%`,
        color: 'violet'
      });
    }

    // Ordenação Inteligente: Críticos > Warning > Positivos > Info
    const sortScore = (type: InsightType) => {
      switch (type) {
        case 'alert_critico': return 0;
        case 'alert_warning': return 1;
        case 'insight_positive': return 2;
        case 'alert_info': return 3;
        case 'insight_neutral': return 4;
        default: return 5;
      }
    };

    return items.sort((a, b) => sortScore(a.type) - sortScore(b.type));
  }, [actions, users]);

  const criticalCount = intelligenceItems.filter(i => i.type === 'alert_critico').length;
  const isAllClear = criticalCount === 0;

  // Render Helpers
  const getColorClasses = (color: string, type: InsightType) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const isInsight = type.startsWith('insight');

    // Mapeamento explícito para Tailwind safelist (se necessário) ou apenas garantir classes dinâmicas
    // Nota: Tailwind não gosta de classes dinâmicas como `bg-${color}-50`. 
    // É MELHOR usar um switch ou objeto de mapa.

    switch (color) {
      case 'red': return { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-700', iconBg: 'bg-red-100', iconColor: 'text-red-600', hoverBorder: 'hover:border-red-200' };
      case 'amber': return { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', hoverBorder: 'hover:border-amber-200' };
      case 'emerald': return { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', hoverBorder: 'hover:border-emerald-200' };
      case 'blue': return { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', hoverBorder: 'hover:border-blue-200' };
      case 'violet': return { bg: 'bg-violet-50', border: 'border-violet-100', text: 'text-violet-700', iconBg: 'bg-violet-100', iconColor: 'text-violet-600', hoverBorder: 'hover:border-violet-200' };
      case 'purple': return { bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-700', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', hoverBorder: 'hover:border-purple-200' };
      case 'slate':
      default: return { bg: 'bg-slate-50', border: 'border-slate-100', text: 'text-slate-700', iconBg: 'bg-slate-100', iconColor: 'text-slate-600', hoverBorder: 'hover:border-slate-200' };
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-100">
            <Activity className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Radar de Inteligência</h3>
            <p className="text-xs text-slate-500 font-medium">Insights e alertas em tempo real</p>
          </div>
        </div>
        {!isAllClear && (
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-200">
        {/* State: All Clear Celebration */}
        {isAllClear && intelligenceItems.filter(i => i.type.startsWith('alert')).length === 0 && (
          <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-6 text-center">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-emerald-100">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h4 className="font-bold text-emerald-900 text-sm mb-1">Tudo Operando Normalmente</h4>
            <p className="text-xs text-emerald-700 leading-relaxed">
              Não há alertas críticos ou pendências urgentes no momento.
              O desempenho geral da equipe está positivo.
            </p>
          </div>
        )}

        {/* Intelligence Feed */}
        {intelligenceItems.map((item) => {
          const colors = getColorClasses(item.color, item.type);

          return (
            <div
              key={item.id}
              className={`
                group relative flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-200
                hover:shadow-md ${colors.hoverBorder} bg-white
                ${item.type === 'alert_critico' ? 'border-red-100 bg-red-50/30' : 'border-slate-100'}
              `}
            >
              {/* Icon */}
              <div className={`p-2 rounded-lg shrink-0 ${colors.bg} ${colors.iconColor}`}>
                <item.icon className="w-4 h-4" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex justify-between items-start gap-2">
                  <h4 className={`text-sm font-semibold ${item.type === 'alert_critico' ? 'text-red-700' : 'text-slate-700'}`}>
                    {item.title}
                  </h4>
                  {item.value && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                      {item.value}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  {item.description}
                </p>

                {/* Footer Meta */}
                <div className="flex items-center gap-3 mt-2">
                  {item.date && (
                    <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                      <Calendar className="w-3 h-3" />
                      {formatDate(item.date)}
                    </div>
                  )}

                  {item.actionLabel && (
                    <button
                      onClick={item.actionFn}
                      className={`
                        flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide
                        hover:underline decoration-2 underline-offset-2 transition-all
                        ${colors.text}
                      `}
                    >
                      {item.actionLabel}
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {intelligenceItems.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <Activity className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-500">Aguardando dados...</p>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="py-2.5 px-5 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[10px] font-medium text-slate-500 uppercase tracking-wider">
        <span>Atualizado agora</span>
        <span>{intelligenceItems.length} Itens no Radar</span>
      </div>
    </div>
  );
}
