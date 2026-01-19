import { useMemo, useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
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
import { staggerContainer, staggerItem, cardHover } from '../../../lib/motion';

// Safe ResponsiveContainer that prevents rendering with invalid dimensions
function SafeResponsiveContainer({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    let animationFrameId: number;

    const checkDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        // Check for valid dimensions (minimum 100px to be safe)
        if (width >= 100 && height >= 100) {
          setDimensions({ width, height });
        } else {
          setDimensions(null);
        }
      }
    };

    checkDimensions();

    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(checkDimensions);
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '300px', minHeight: '300px', position: 'relative' }}>
      {dimensions ? (
        <div style={{ width: dimensions.width, height: dimensions.height, position: 'absolute', top: 0, left: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{
          width: '100%',
          height: '300px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          color: '#6c757d'
        }}>
          Carregando gráfico...
        </div>
      )}
    </div>
  );
}

interface RankingPanelProps {
  actions: Action[];
  onViewMicrorregiao: (microId: string) => void;
  compact?: boolean;
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

export function RankingPanel({ actions, onViewMicrorregiao, compact = false }: RankingPanelProps) {
  const [sortBy, setSortBy] = useState<SortBy>('progresso');
  const [showAll, setShowAll] = useState(false);

  // In compact mode, only show top 5
  const maxItems = compact ? 5 : (showAll ? undefined : 10);

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

  // Se não há rankings, mostrar estado vazio
  if (rankings.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
        <Trophy className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <h3 className="font-semibold text-slate-600 dark:text-slate-400 mb-2">
          Nenhum ranking disponível
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-500">
          Ainda não há ações cadastradas para gerar o ranking das microrregiões.
        </p>
      </div>
    );
  }

  const topRankings = maxItems ? rankings.slice(0, maxItems) : (showAll ? rankings : rankings.slice(0, 10));
  const bottomRankings = rankings.slice(-5).reverse();

  // Compact mode - simplified list
  if (compact) {
    return (
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {topRankings.map((micro, index) => (
          <div
            key={micro.id}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
            onClick={() => onViewMicrorregiao(micro.id)}
          >
            <span className={`text-sm font-bold w-5 ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-slate-400' : index === 2 ? 'text-amber-600' : 'text-slate-400'
              }`}>
              {index + 1}º
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{micro.nome}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full"
                  style={{ width: `${micro.progressoMedio}%` }}
                />
              </div>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400 w-8 text-right">
                {Math.round(micro.progressoMedio)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const getMedalColor = (position: number) => {
    if (position === 0) return 'text-yellow-500';
    if (position === 1) return 'text-slate-400';
    if (position === 2) return 'text-amber-600';
    return 'text-slate-300';
  };

  const getMedalBg = (position: number) => {
    if (position === 0) return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700';
    if (position === 1) return 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600';
    if (position === 2) return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700';
    return 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700';
  };

  return (
    <div className="space-y-6">
      {/* Top 3 Destaque */}
      <div className="bg-gradient-to-br from-teal-50 to-blue-50 dark:from-teal-900/20 dark:to-blue-900/20 rounded-xl border border-teal-100 dark:border-teal-800/50 p-6 transition-colors">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Top 3 Microrregiões</h3>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="progresso">Por Progresso</option>
            <option value="concluidas">Por Taxa de Conclusão</option>
            <option value="atraso">Por Menos Atrasos</option>
          </select>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {rankings.slice(0, 3).map((micro, index) => (
            <motion.div
              variants={staggerItem}
              whileHover={cardHover}
              key={micro.id}
              className={`relative p-4 rounded-xl border-2 ${getMedalBg(index)} cursor-pointer`}
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
                <h4 className="font-semibold text-slate-800 dark:text-slate-100 truncate" title={micro.nome}>
                  {micro.nome}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">{micro.macrorregiao}</p>

                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Progresso</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{micro.progressoMedio}%</span>
                  </div>
                  <div className="h-2 bg-white/80 dark:bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 transition-all"
                      style={{ width: `${micro.progressoMedio}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>{micro.concluidas}/{micro.totalAcoes} concluídas</span>
                    {micro.atrasadas > 0 && (
                      <span className="text-red-500 dark:text-red-400">{micro.atrasadas} atrasadas</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onViewMicrorregiao(micro.id)}
                  className="mt-3 w-full flex items-center justify-center gap-1 py-2 text-xs font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-900/30 rounded-lg transition-colors"
                >
                  <Eye className="w-3 h-3" />
                  Visualizar
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Gráfico de Barras Horizontais - Top 10 */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-500" />
            Top 10 por Progresso
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">Clique na barra para ver detalhes</span>
        </div>
        <div className="h-80" style={{ minHeight: '320px' }}>
          <SafeResponsiveContainer>
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
          </SafeResponsiveContainer>
        </div>
      </div>

      {/* Tabela de Ranking */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Ranking Completo
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {rankings.length} microrregiões com dados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs text-slate-500 dark:text-slate-400 uppercase">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">#</th>
                <th className="px-4 py-3 text-left font-semibold">Microrregião</th>
                <th className="px-4 py-3 text-center font-semibold">Ações</th>
                <th className="px-4 py-3 text-center font-semibold">
                  <button
                    onClick={() => setSortBy('concluidas')}
                    className={`hover:text-teal-600 dark:hover:text-teal-400 ${sortBy === 'concluidas' ? 'text-teal-600 dark:text-teal-400' : ''}`}
                  >
                    Concluídas
                  </button>
                </th>
                <th className="px-4 py-3 text-center font-semibold">
                  <button
                    onClick={() => setSortBy('atraso')}
                    className={`hover:text-teal-600 dark:hover:text-teal-400 ${sortBy === 'atraso' ? 'text-teal-600 dark:text-teal-400' : ''}`}
                  >
                    Atrasadas
                  </button>
                </th>
                <th className="px-4 py-3 text-center font-semibold">
                  <button
                    onClick={() => setSortBy('progresso')}
                    className={`hover:text-teal-600 dark:hover:text-teal-400 ${sortBy === 'progresso' ? 'text-teal-600 dark:text-teal-400' : ''}`}
                  >
                    Progresso
                  </button>
                </th>
                <th className="px-4 py-3 text-center font-semibold">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {topRankings.map((micro, index) => (
                <tr key={micro.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`font-bold ${index < 3 ? getMedalColor(index) : 'text-slate-400 dark:text-slate-500'}`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-200">{micro.nome}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{micro.macrorregiao}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-slate-600 dark:text-slate-300">
                    {micro.totalAcoes}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full">
                      {micro.concluidas}
                      <span className="text-green-500">({micro.taxaConclusao}%)</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {micro.atrasadas > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-full">
                        {micro.atrasadas}
                      </span>
                    ) : (
                      <span className="text-xs text-green-500">✓</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${micro.progressoMedio >= 75 ? 'bg-green-500' :
                            micro.progressoMedio >= 50 ? 'bg-blue-500' :
                              micro.progressoMedio >= 25 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                          style={{ width: `${micro.progressoMedio}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300 w-10 text-right">
                        {micro.progressoMedio}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onViewMicrorregiao(micro.id)}
                      className="p-1.5 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-lg text-teal-600 dark:text-teal-400 transition-colors"
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
          <div className="p-3 border-t border-slate-100 dark:border-slate-700 text-center">
            <button
              onClick={() => setShowAll(true)}
              className="flex items-center gap-1 mx-auto text-sm text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium"
            >
              <ChevronDown className="w-4 h-4" />
              Ver todas as {rankings.length} microrregiões
            </button>
          </div>
        )}
      </div>

      {/* Bottom 5 - Precisam de Atenção */}
      {bottomRankings.length > 0 && bottomRankings[0].progressoMedio < 50 && (
        <div className="bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-900/30 p-4 transition-colors">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-red-800 dark:text-red-300">Precisam de Atenção</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {bottomRankings.filter(m => m.progressoMedio < 50).slice(0, 5).map((micro, index) => (
              <button
                key={micro.id}
                onClick={() => onViewMicrorregiao(micro.id)}
                className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-red-200 dark:border-red-900/30 text-left hover:shadow-md transition-all hover:scale-105"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-red-400 font-mono">#{rankings.length - index}</span>
                  <ArrowDown className="w-3 h-3 text-red-500" />
                </div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{micro.nome}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{micro.atrasadas} atrasadas</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-red-100 dark:bg-red-900/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500"
                      style={{ width: `${micro.progressoMedio}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-red-600 dark:text-red-400">{micro.progressoMedio}%</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}




