import { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Archive,
  BarChart2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  Globe,
  MapPin,
  Save,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { MICROREGIOES } from '../../data/microregioes';
import {
  deleteAutomatedEvent,
  loadAutomatedEvents,
  toggleAutomatedEventActive,
} from '../../services/automatedEventsService';
import type { AutomatedEvent, AutomatedEventType } from '../../services/automatedEventsService';
import {
  DEFAULT_MURAL_CONFIG,
  loadMuralConfig,
  saveMuralConfig,
} from '../../services/muralConfigService';
import type { MuralConfig } from '../../services/muralConfigService';

// ─── Constantes ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<AutomatedEventType, string> = {
  plan_completed: 'Ação Concluída',
  activity_completed: 'Atividade Concluída',
  progress_milestone: 'Marco de Progresso',
  goal_reached: 'Objetivo Atingido',
  new_user: 'Novo Membro na Equipe',
  system_milestone: 'Marco do Sistema',
};

const TYPE_DESC: Record<AutomatedEventType, string> = {
  plan_completed: 'Quando uma microrregião conclui uma ação do plano',
  activity_completed: 'Quando todas as ações de uma atividade são concluídas',
  progress_milestone: 'Quando uma microrregião atinge 25%, 50%, 75% ou 100% do plano',
  goal_reached: 'Quando um objetivo estratégico é atingido',
  new_user: 'Quando um novo colaborador entra para a equipe',
  system_milestone: 'Marcos gerados pelo sistema (primeiros acessos, etc.)',
};

const ALL_TYPES = Object.keys(TYPE_LABELS) as AutomatedEventType[];

const TYPE_COLORS: Record<AutomatedEventType, string> = {
  plan_completed: 'bg-blue-50 border-blue-200 text-blue-700',
  activity_completed: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  progress_milestone: 'bg-violet-50 border-violet-200 text-violet-700',
  goal_reached: 'bg-amber-50 border-amber-200 text-amber-700',
  new_user: 'bg-teal-50 border-teal-200 text-teal-700',
  system_milestone: 'bg-slate-50 border-slate-200 text-slate-600',
};

function TypeIcon({ type, size = 16 }: { type: AutomatedEventType; size?: number }) {
  switch (type) {
    case 'plan_completed': return <Trophy size={size} />;
    case 'activity_completed': return <CheckCircle2 size={size} />;
    case 'progress_milestone': return <BarChart2 size={size} />;
    case 'goal_reached': return <TrendingUp size={size} />;
    case 'new_user': return <Users size={size} />;
    case 'system_milestone': return <Zap size={size} />;
    default: return <Activity size={size} />;
  }
}

// ─── Seção de Configuração ─────────────────────────────────────────────────────

function ConfigSection() {
  const [config, setConfig] = useState<MuralConfig>(DEFAULT_MURAL_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [microSearch, setMicroSearch] = useState('');
  const [showMicroList, setShowMicroList] = useState(false);

  const allMicros = MICROREGIOES;
  const filteredMicros = allMicros.filter(m =>
    m.nome.toLowerCase().includes(microSearch.toLowerCase())
  );

  useEffect(() => {
    loadMuralConfig().then((c) => {
      setConfig(c);
      setLoading(false);
    });
  }, []);

  const toggleType = (type: AutomatedEventType) => {
    setConfig((prev) => {
      const current = prev.enabledTypes ?? ALL_TYPES;
      const next = current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type];
      return { ...prev, enabledTypes: next.length === ALL_TYPES.length ? null : next };
    });
  };

  const isTypeEnabled = (type: AutomatedEventType) =>
    config.enabledTypes === null || config.enabledTypes.includes(type);

  const toggleMicro = (microName: string) => {
    setConfig((prev) => {
      const current = prev.microNames;
      const next = current.includes(microName)
        ? current.filter((n) => n !== microName)
        : [...current, microName];
      return { ...prev, microNames: next };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(false);
    try {
      await saveMuralConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setSaveError(true);
      setTimeout(() => setSaveError(false), 4000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-slate-400 text-sm">
        <Clock size={16} className="animate-spin" />
        Carregando configuração...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            Configuração de Visibilidade
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Define o que aparece no Mural da Rede para <strong>todos os usuários</strong>.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all shrink-0 ${
            saveError
              ? 'bg-rose-500 text-white'
              : saved
              ? 'bg-emerald-500 text-white'
              : 'bg-teal-600 hover:bg-teal-700 text-white'
          } disabled:opacity-50`}
        >
          {saveError ? <AlertCircle size={15} /> : saved ? <Check size={15} /> : saving ? <Clock size={15} className="animate-spin" /> : <Save size={15} />}
          {saveError ? 'Erro ao salvar' : saved ? 'Salvo!' : saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      {/* Tipos de evento */}
      <div>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Quais tipos de evento aparecem
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {ALL_TYPES.map((type) => {
            const enabled = isTypeEnabled(type);
            return (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                  enabled
                    ? `${TYPE_COLORS[type]} border-current/30`
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-50'
                }`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                  enabled
                    ? 'bg-current border-current'
                    : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {enabled && <Check size={10} className="text-white" />}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <TypeIcon type={type} size={12} />
                    {TYPE_LABELS[type]}
                  </div>
                  <p className="text-[10px] opacity-70 mt-0.5 leading-tight">{TYPE_DESC[type]}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Escopo de microrregiões */}
      <div>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          De quais microrregiões
        </p>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setConfig((p) => ({ ...p, microScope: 'all', microNames: [] }))}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
              config.microScope === 'all'
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-teal-400'
            }`}
          >
            <Globe size={15} />
            Todas as microrregiões
          </button>
          <button
            onClick={() => {
              setConfig((p) => ({ ...p, microScope: 'specific' }));
              setShowMicroList(true);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
              config.microScope === 'specific'
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-teal-400'
            }`}
          >
            <MapPin size={15} />
            Específicas
            {config.microScope === 'specific' && config.microNames.length > 0 && (
              <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-xs">
                {config.microNames.length}
              </span>
            )}
          </button>
        </div>

        {config.microScope === 'specific' && (
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            {/* Search + toggle */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <input
                type="text"
                placeholder="Buscar microrregião..."
                value={microSearch}
                onChange={(e) => setMicroSearch(e.target.value)}
                className="flex-1 text-xs bg-transparent outline-none text-slate-700 dark:text-slate-200 placeholder-slate-400"
              />
              <button
                onClick={() => setShowMicroList((v) => !v)}
                className="text-slate-400 hover:text-slate-600 ml-2"
              >
                {showMicroList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {showMicroList && (
              <div className="max-h-48 overflow-y-auto p-2 grid gap-1 sm:grid-cols-2">
                {filteredMicros.map((micro) => {
                  const selected = config.microNames.includes(micro.nome);
                  return (
                    <button
                      key={micro.id}
                      onClick={() => toggleMicro(micro.nome)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left transition-all ${
                        selected
                          ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-700'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                        selected ? 'bg-teal-500 border-teal-500' : 'border-slate-300'
                      }`}>
                        {selected && <Check size={8} className="text-white" />}
                      </div>
                      {micro.nome}
                    </button>
                  );
                })}
              </div>
            )}

            {config.microNames.length > 0 && (
              <div className="px-3 py-2 bg-teal-50 dark:bg-teal-900/20 border-t border-slate-200 dark:border-slate-700 text-xs text-teal-700 dark:text-teal-400 font-medium">
                {config.microNames.length} selecionada{config.microNames.length !== 1 ? 's' : ''}:&nbsp;
                {config.microNames.slice(0, 3).join(', ')}
                {config.microNames.length > 3 && ` +${config.microNames.length - 3}`}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Seção de Gerenciamento ────────────────────────────────────────────────────

function EventsSection() {
  const [events, setEvents] = useState<AutomatedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<AutomatedEventType | 'all' | 'archived'>('all');

  useEffect(() => {
    // Painel admin: carrega todos, em modo admin (inclui arquivados)
    loadAutomatedEvents(200, undefined, true).then((data) => {
      setEvents(data);
      setLoading(false);
    });
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteAutomatedEvent(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setDeletingId(null);
  };

  const handleToggle = async (event: AutomatedEvent) => {
    setTogglingId(event.id);
    try {
      await toggleAutomatedEventActive(event.id, !event.isActive);
      setEvents((prev) => prev.map((e) => e.id === event.id ? { ...e, isActive: !e.isActive } : e));
    } finally {
      setTogglingId(null);
    }
  };

  const activeEvents = events.filter((e) => e.isActive);
  const archivedEvents = events.filter((e) => !e.isActive);

  const countByType = ALL_TYPES.reduce<Record<string, number>>((acc, type) => {
    acc[type] = activeEvents.filter((e) => e.type === type).length;
    return acc;
  }, {});

  const filtered = activeFilter === 'archived'
    ? archivedEvents
    : activeFilter === 'all'
    ? activeEvents
    : activeEvents.filter((e) => e.type === activeFilter);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-800 dark:text-white">Eventos no Mural</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {activeEvents.length} no ar · {archivedEvents.length} arquivados · todas as microrregiões
        </p>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveFilter('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
            activeFilter === 'all'
              ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-800 border-slate-800 dark:border-white'
              : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-400'
          }`}
        >
          <Eye size={11} />
          No ar
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-700 text-slate-500">
            {activeEvents.length}
          </span>
        </button>

        <button
          onClick={() => setActiveFilter('archived')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
            activeFilter === 'archived'
              ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-800 border-slate-800 dark:border-white'
              : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-400'
          }`}
        >
          <Archive size={11} />
          Arquivados
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-700 text-slate-500">
            {archivedEvents.length}
          </span>
        </button>

        {ALL_TYPES.filter((t) => countByType[t] > 0).map((type) => (
          <button
            key={type}
            onClick={() => setActiveFilter(type)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              activeFilter === type
                ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-800 border-slate-800 dark:border-white'
                : `bg-white dark:bg-slate-800 border ${TYPE_COLORS[type]}`
            }`}
          >
            <TypeIcon type={type} size={11} />
            {TYPE_LABELS[type]}
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-700 text-slate-500">
              {countByType[type]}
            </span>
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400 text-sm gap-2">
          <Clock size={16} className="animate-spin" /> Carregando eventos...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
          <Target size={36} className="opacity-30" />
          <p className="text-sm font-medium">Nenhum evento encontrado</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((event) => (
            <div
              key={event.id}
              className={`relative bg-white dark:bg-slate-900 rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow ${
                event.isActive
                  ? 'border-slate-200 dark:border-slate-700'
                  : 'border-slate-200 dark:border-slate-700 opacity-60'
              }`}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-gradient-to-b ${event.imageGradient}`} />

              <div className="pl-3 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <MapPin size={9} />
                    {event.municipality}
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">{event.timestamp}</span>
                </div>

                <span className={`self-start flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${TYPE_COLORS[event.type]}`}>
                  <TypeIcon type={event.type} size={9} />
                  {TYPE_LABELS[event.type]}
                </span>

                <p className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-snug">
                  {event.title}
                </p>
                {event.details && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                    {event.details}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 mt-auto gap-1">
                  {event.footerContext && (
                    <span className="text-[10px] uppercase font-bold tracking-wide text-slate-400 flex-1 truncate">
                      {event.footerContext}
                    </span>
                  )}
                  <div className="flex items-center gap-1 ml-auto shrink-0">
                    <button
                      onClick={() => handleToggle(event)}
                      disabled={togglingId === event.id}
                      title={event.isActive ? 'Arquivar (tirar do ar)' : 'Colocar no ar'}
                      className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg transition-all disabled:opacity-40 ${
                        event.isActive
                          ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                          : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                      }`}
                    >
                      {togglingId === event.id
                        ? <Clock size={11} className="animate-spin" />
                        : event.isActive ? <Archive size={11} /> : <Eye size={11} />
                      }
                      {event.isActive ? 'Arquivar' : 'Publicar'}
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      disabled={deletingId === event.id}
                      title="Excluir permanentemente"
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all disabled:opacity-40"
                    >
                      {deletingId === event.id
                        ? <Clock size={11} className="animate-spin" />
                        : <Trash2 size={11} />
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────

export function MuralEventsPanel() {
  return (
    <div className="divide-y divide-slate-200 dark:divide-slate-700">
      <ConfigSection />
      <EventsSection />
    </div>
  );
}
