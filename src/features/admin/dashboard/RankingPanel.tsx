import { useMemo, useState } from 'react';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Medal,
  ArrowDown,
  Eye,
  ChevronDown
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { Action } from '../../../types';
import { MICROREGIOES } from '../../../data/microregioes';

interface RankingPanelProps {
  actions: Action[];
  onViewMicrorregiao: (microId: string) => void;
}

type SortBy = 'progresso' | 'concluidas' | 'atraso';

interface MicroRanking {
  id: string;
  nome: string;
  macrorregiao: string;
  totalAcoes: number;
  concluidas: number;
  andamento: number;
  atrasadas: number;
  progressoMedio: number;
  taxaConclusao: number;
}

export function RankingPanel({ actions, onViewMicrorregiao }: RankingPanelProps) {
  const [sortBy, setSortBy] = useState<SortBy>('progresso');
  const [showAll, setShowAll] = useState(false);

  const rankings = useMemo(() => {
    const microStats: MicroRanking[] = MICROREGIOES.map(micro => {
      const microAcoes = actions.filter(a => a.microregiaoId === micro.id);
      const concluidas = microAcoes.filter(a => a.status === 'Concluído').length;
      const andamento = microAcoes.filter(a => a.status === 'Em Andamento').length;
      const atrasadas = microAcoes.filter(a => {
        if (a.status === 'Concluído') return false;
        const hoje = new Date();
        const prazo = new Date(a.plannedEndDate);
        return prazo < hoje;
      }).length;
      const progressoMedio = microAcoes.length > 0
        ? Math.round(microAcoes.reduce((sum, a) => sum + a.progress, 0) / microAcoes.length)
        : 0;
      const taxaConclusao = microAcoes.length > 0
        ? Math.round((concluidas / microAcoes.length) * 100)
        : 0;

      return {
        id: micro.id,
        nome: micro.nome,
        macrorregiao: micro.macrorregiao,
        totalAcoes: microAcoes.length,
        concluidas,
        andamento,
        atrasadas,
        progressoMedio,
        taxaConclusao,
      };
    }).filter(m => m.totalAcoes > 0); // Só mostrar micros com ações

    // Ordenar baseado no critério selecionado
    return microStats.sort((a, b) => {
      switch (sortBy) {
        case 'progresso':
          return b.progressoMedio - a.progressoMedio;
        case 'concluidas':
          return b.taxaConclusao - a.taxaConclusao;
        case 'atraso':
          return a.atrasadas - b.atrasadas; // Menos atrasos = melhor
        default:
          return 0;
      }
    });
  }, [actions, sortBy]);

  const topRankings = showAll ? rankings : rankings.slice(0, 10);
  const bottomRankings = rankings.slice(-5).reverse();

  const getMedalColor = (position: number) => {
    if (position === 0) return 'text-yellow-500';
    if (position === 1) return 'text-slate-400';
    if (position === 2) return 'text-amber-600';
    return 'text-slate-300';
  };

  const getMedalBg = (position: number) => {
    if (position === 0) return 'bg-yellow-50 border-yellow-200';
    if (position === 1) return 'bg-slate-50 border-slate-200';
    if (position === 2) return 'bg-amber-50 border-amber-200';
    return 'bg-white border-slate-100';
  };

  return (
    <div className="space-y-6">
      {/* Top 3 Destaque */}
      <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-xl border border-teal-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <h3 className="font-bold text-slate-800 text-lg">Top 3 Microrregiões</h3>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="progresso">Por Progresso</option>
            <option value="concluidas">Por Taxa de Conclusão</option>
            <option value="atraso">Por Menos Atrasos</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rankings.slice(0, 3).map((micro, index) => (
            <div
              key={micro.id}
              className={`relative p-4 rounded-xl border-2 ${getMedalBg(index)} transition-transform hover:scale-105`}
            >
              {/* Medal */}
              <div className="absolute -top-3 -left-2">
                <div className={`p-1.5 rounded-full bg-white shadow-md ${getMedalColor(index)}`}>
                  <Medal className="w-5 h-5" />
                </div>
              </div>

              {/* Position */}
              <div className="absolute top-2 right-3 text-3xl font-bold opacity-10">
                #{index + 1}
              </div>

              <div className="mt-2">
                <h4 className="font-semibold text-slate-800 truncate" title={micro.nome}>
                  {micro.nome}
                </h4>
                <p className="text-xs text-slate-500">{micro.macrorregiao}</p>

                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Progresso</span>
                    <span className="font-bold text-slate-700">{micro.progressoMedio}%</span>
                  </div>
                  <div className="h-2 bg-white/80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 transition-all"
                      style={{ width: `${micro.progressoMedio}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{micro.concluidas}/{micro.totalAcoes} concluídas</span>
                    {micro.atrasadas > 0 && (
                      <span className="text-red-500">{micro.atrasadas} atrasadas</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onViewMicrorregiao(micro.id)}
                  className="mt-3 w-full flex items-center justify-center gap-1 py-2 text-xs font-medium text-teal-600 hover:bg-teal-100 rounded-lg transition-colors"
                >
                  <Eye className="w-3 h-3" />
                  Visualizar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gráfico de Barras Horizontais - Top 10 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-500" />
            Top 10 por Progresso
          </h3>
          <span className="text-xs text-slate-500">Clique na barra para ver detalhes</span>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rankings.slice(0, 10).map(m => ({
                name: m.nome.length > 15 ? m.nome.substring(0, 15) + '...' : m.nome,
                fullName: m.nome,
                progresso: m.progressoMedio,
                id: m.id,
                concluidas: m.concluidas,
                atrasadas: m.atrasadas,
              }))}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-800 text-white text-sm px-3 py-2 rounded-lg shadow-lg">
                        <p className="font-semibold">{data.fullName}</p>
                        <p className="text-teal-300">Progresso: {data.progresso}%</p>
                        <p className="text-green-300">Concluídas: {data.concluidas}</p>
                        {data.atrasadas > 0 && (
                          <p className="text-red-300">Atrasadas: {data.atrasadas}</p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="progresso"
                radius={[0, 4, 4, 0]}
                onClick={(data) => data?.id && onViewMicrorregiao(data.id)}
                style={{ cursor: 'pointer' }}
              >
                {rankings.slice(0, 10).map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.progressoMedio >= 75 ? '#10b981' :
                        entry.progressoMedio >= 50 ? '#3b82f6' :
                          entry.progressoMedio >= 25 ? '#f59e0b' : '#ef4444'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela de Ranking */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Ranking Completo
          </h3>
          <span className="text-xs text-slate-500">
            {rankings.length} microrregiões com dados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">#</th>
                <th className="px-4 py-3 text-left font-semibold">Microrregião</th>
                <th className="px-4 py-3 text-center font-semibold">Ações</th>
                <th className="px-4 py-3 text-center font-semibold">
                  <button
                    onClick={() => setSortBy('concluidas')}
                    className={`hover:text-teal-600 ${sortBy === 'concluidas' ? 'text-teal-600' : ''}`}
                  >
                    Concluídas
                  </button>
                </th>
                <th className="px-4 py-3 text-center font-semibold">
                  <button
                    onClick={() => setSortBy('atraso')}
                    className={`hover:text-teal-600 ${sortBy === 'atraso' ? 'text-teal-600' : ''}`}
                  >
                    Atrasadas
                  </button>
                </th>
                <th className="px-4 py-3 text-center font-semibold">
                  <button
                    onClick={() => setSortBy('progresso')}
                    className={`hover:text-teal-600 ${sortBy === 'progresso' ? 'text-teal-600' : ''}`}
                  >
                    Progresso
                  </button>
                </th>
                <th className="px-4 py-3 text-center font-semibold">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topRankings.map((micro, index) => (
                <tr key={micro.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`font-bold ${index < 3 ? getMedalColor(index) : 'text-slate-400'}`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-800">{micro.nome}</p>
                      <p className="text-xs text-slate-400">{micro.macrorregiao}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-slate-600">
                    {micro.totalAcoes}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                      {micro.concluidas}
                      <span className="text-green-500">({micro.taxaConclusao}%)</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {micro.atrasadas > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                        {micro.atrasadas}
                      </span>
                    ) : (
                      <span className="text-xs text-green-500">✓</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${micro.progressoMedio >= 75 ? 'bg-green-500' :
                            micro.progressoMedio >= 50 ? 'bg-blue-500' :
                              micro.progressoMedio >= 25 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                          style={{ width: `${micro.progressoMedio}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-600 w-10 text-right">
                        {micro.progressoMedio}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onViewMicrorregiao(micro.id)}
                      className="p-1.5 hover:bg-teal-50 rounded-lg text-teal-600 transition-colors"
                      title="Visualizar painel"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rankings.length > 10 && !showAll && (
          <div className="p-3 border-t border-slate-100 text-center">
            <button
              onClick={() => setShowAll(true)}
              className="flex items-center gap-1 mx-auto text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              <ChevronDown className="w-4 h-4" />
              Ver todas as {rankings.length} microrregiões
            </button>
          </div>
        )}
      </div>

      {/* Bottom 5 - Precisam de Atenção */}
      {bottomRankings.length > 0 && bottomRankings[0].progressoMedio < 50 && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-red-800">Precisam de Atenção</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {bottomRankings.filter(m => m.progressoMedio < 50).slice(0, 5).map((micro, index) => (
              <button
                key={micro.id}
                onClick={() => onViewMicrorregiao(micro.id)}
                className="p-3 bg-white rounded-lg border border-red-200 text-left hover:shadow-md transition-all hover:scale-105"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-red-400 font-mono">#{rankings.length - index}</span>
                  <ArrowDown className="w-3 h-3 text-red-500" />
                </div>
                <p className="text-sm font-medium text-slate-800 truncate">{micro.nome}</p>
                <p className="text-xs text-slate-500 mb-2">{micro.atrasadas} atrasadas</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-red-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500"
                      style={{ width: `${micro.progressoMedio}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-red-600">{micro.progressoMedio}%</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}




