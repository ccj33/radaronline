import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  CircleAlert,
  MessagesSquare,
  MessageCircle,
  Eye,
  ThumbsUp,
  Pin,
  Star,
  Search,
  ArrowLeft,
  Plus,
  CheckCircle2,
  Clock,
  Send,
  ChevronUp,
  ChevronDown,
  Award,
  Globe2,
  Flame,
  type LucideIcon,
  Map,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../../auth';
import { getMicroregiaoById } from '../../../data/microregioes';
import { useForums, useForumTopics, useForumTopic, useCreateTopic, useCreateReply, useAcceptForumReply, useForumVote, useForumExperts } from '../../../hooks/useForums';
import type { Forum, ForumTopic, ForumTopicType } from '../../../types/forum.types';
import { TOPIC_TYPE_CONFIG, TOPIC_STATUS_CONFIG } from '../../../types/forum.types';

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -12 } };
const stagger = { animate: { transition: { staggerChildren: 0.05 } } };

type DiscussionScope = 'global' | 'micro' | 'municipality';
type TopicFeedMode = 'recent' | 'hot' | 'unanswered' | 'resolved';

interface ScopeOption {
  id: DiscussionScope;
  title: string;
  audience: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  accent: string;
  soft: string;
  border: string;
  icon: LucideIcon;
}

const QUICK_ACTIONS: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
  topicType: ForumTopicType;
}> = [
  {
    title: 'Pedir ajuda',
    description: 'Abra uma duvida objetiva e receba retorno da rede.',
    icon: MessageCircle,
    topicType: 'qa',
  },
  {
    title: 'Compartilhar pratica',
    description: 'Mostre o que funcionou na implantacao ou operacao.',
    icon: Sparkles,
    topicType: 'best_practice',
  },
  {
    title: 'Publicar aviso',
    description: 'Use para orientacoes institucionais e recados formais.',
    icon: ShieldCheck,
    topicType: 'announcement',
  },
];

const FEED_MODES: Array<{
  id: TopicFeedMode;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    id: 'recent',
    label: 'Recentes',
    description: 'Ultimas movimentacoes primeiro.',
    icon: Clock,
  },
  {
    id: 'hot',
    label: 'Em alta',
    description: 'Mais votos, respostas e atividade.',
    icon: Flame,
  },
  {
    id: 'unanswered',
    label: 'Sem resposta',
    description: 'Perguntas que ainda precisam de retorno.',
    icon: MessageCircle,
  },
  {
    id: 'resolved',
    label: 'Resolvidos',
    description: 'Topicos que ja fecharam um encaminhamento.',
    icon: CheckCircle2,
  },
];

const COMPOSER_GUIDES: Record<ForumTopicType, {
  titleSuggestion: string;
  bodySuggestion: string;
  helper: string;
  titlePlaceholder: string;
  contentPlaceholder: string;
}> = {
  qa: {
    titleSuggestion: 'Preciso de apoio com...',
    bodySuggestion: [
      'Contexto rapido:',
      '-',
      '',
      'O que ja foi tentado:',
      '-',
      '',
      'Qual retorno voce precisa da rede:',
      '-',
    ].join('\n'),
    helper: 'Perguntas objetivas recebem resposta melhor e mais rapida.',
    titlePlaceholder: 'Ex: Como organizar o fluxo de acompanhamento desta frente?',
    contentPlaceholder: 'Explique o contexto, o que ja foi tentado e qual decisao voce precisa tomar.',
  },
  best_practice: {
    titleSuggestion: 'Boa pratica para...',
    bodySuggestion: [
      'Cenario:',
      '-',
      '',
      'O que foi feito:',
      '-',
      '',
      'Resultado observado:',
      '-',
      '',
      'Como outra equipe pode replicar:',
      '-',
    ].join('\n'),
    helper: 'Boas praticas funcionam melhor quando sao replicaveis.',
    titlePlaceholder: 'Ex: Boa pratica para organizar ponto focal municipal',
    contentPlaceholder: 'Conte o contexto, a acao aplicada e o resultado que vale compartilhar.',
  },
  problem_solution: {
    titleSuggestion: 'Problema recorrente em...',
    bodySuggestion: [
      'Problema:',
      '-',
      '',
      'Impacto no trabalho:',
      '-',
      '',
      'Tentativa de solucao:',
      '-',
      '',
      'Apoio esperado da rede:',
      '-',
    ].join('\n'),
    helper: 'Separe problema, impacto e pedido de apoio.',
    titlePlaceholder: 'Ex: Problema recorrente na comunicacao entre equipes',
    contentPlaceholder: 'Descreva o problema, o impacto e a ajuda que voce espera receber.',
  },
  announcement: {
    titleSuggestion: 'Aviso importante sobre...',
    bodySuggestion: [
      'Resumo do aviso:',
      '-',
      '',
      'Quem precisa agir:',
      '-',
      '',
      'Prazo ou data importante:',
      '-',
      '',
      'Link, documento ou contato:',
      '-',
    ].join('\n'),
    helper: 'Avisos funcionam melhor quando deixam claro publico, prazo e proxima acao.',
    titlePlaceholder: 'Ex: Aviso sobre atualizacao do cronograma regional',
    contentPlaceholder: 'Registre o aviso de forma direta: publico afetado, prazo, documento e proxima acao.',
  },
};

function getAuthorLabel(name?: string | null): string {
  return name?.trim() || 'Anonimo';
}

function formatDate(value?: string | null): string {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function readStoredValue<T>(key: string | null): T | null {
  if (!key || typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeStoredValue(key: string | null, value: unknown) {
  if (!key || typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore browser storage failures.
  }
}

function removeStoredValue(key: string | null) {
  if (!key || typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore browser storage failures.
  }
}

function getTopicDraftStorageKey(forumId: string, userId: string): string {
  return `forums:create-topic:${forumId}:${userId}`;
}

function getReplyDraftStorageKey(topicId: string, userId: string): string {
  return `forums:reply:${topicId}:${userId}`;
}

function isResolvedTopic(topic: ForumTopic): boolean {
  return topic.status === 'resolved' || topic.status === 'validated' || Boolean(topic.bestReplyId);
}

function getTopicHotScore(topic: ForumTopic): number {
  const ageHours = Math.max((Date.now() - new Date(topic.updatedAt || topic.createdAt).getTime()) / (1000 * 60 * 60), 1);

  return (
    (topic.isPinned ? 50 : 0) +
    (topic.isFeatured ? 20 : 0) +
    (topic.bestReplyId ? 12 : 0) +
    topic.votesScore * 6 +
    topic.repliesCount * 3 +
    Math.log(topic.viewsCount + 1) * 2 -
    ageHours / 18
  );
}

function inferForumScope(forum: Forum): DiscussionScope {
  const haystack = `${forum.slug} ${forum.name} ${forum.description}`.toLowerCase();

  if (haystack.includes('municip')) {
    return 'municipality';
  }

  if (haystack.includes('micro') || haystack.includes('regional') || haystack.includes('territ')) {
    return 'micro';
  }

  return 'global';
}

function buildScopeOptions(microName: string, municipalityName: string): ScopeOption[] {
  return [
    {
      id: 'global',
      title: 'Global',
      audience: 'Toda a rede estadual',
      description: 'Comunicados amplos, boas praticas e duvidas de alcance geral.',
      emptyTitle: 'Espaco global pronto para orientacoes amplas',
      emptyDescription: 'Use esta camada para temas transversais, praticas replicaveis e mensagens de interesse estadual.',
      accent: 'from-sky-600 to-cyan-500',
      soft: 'bg-sky-50 dark:bg-sky-950/30',
      border: 'border-sky-200 dark:border-sky-800/60',
      icon: Globe2,
    },
    {
      id: 'micro',
      title: 'Minha Micro',
      audience: microName,
      description: 'Troca regional entre municipios, apoio de implantacao e alinhamento da microrregiao.',
      emptyTitle: 'Sua micro ainda nao tem um espaco dedicado',
      emptyDescription: 'A interface ja esta pronta para a camada regional. Falta provisionar ou classificar os foruns da microrregiao no Hub.',
      accent: 'from-teal-600 to-emerald-500',
      soft: 'bg-teal-50 dark:bg-teal-950/30',
      border: 'border-teal-200 dark:border-teal-800/60',
      icon: Map,
    },
    {
      id: 'municipality',
      title: 'Meu Municipio',
      audience: municipalityName,
      description: 'Canal operacional local para combinados, duvidas rapidas e alinhamentos do municipio.',
      emptyTitle: 'Seu municipio ainda nao tem um espaco operacional no Hub',
      emptyDescription: 'Quando esse espaco for provisionado, ele vira o lugar mais simples para combinados locais e acompanhamento rapido.',
      accent: 'from-amber-500 to-orange-500',
      soft: 'bg-amber-50 dark:bg-amber-950/30',
      border: 'border-amber-200 dark:border-amber-800/60',
      icon: Building2,
    },
  ];
}

// =====================================================
// Sub-components
// =====================================================

const StatCard: React.FC<{ label: string; value: number | string; accent?: boolean }> = ({ label, value, accent }) => (
  <div className={`rounded-xl border p-4 ${accent ? 'border-teal-200 bg-teal-50/50 dark:border-teal-800 dark:bg-teal-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'} transition-colors`}>
    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</p>
    <p className={`text-2xl font-bold ${accent ? 'text-teal-600 dark:text-teal-400' : 'text-slate-900 dark:text-white'}`}>{value}</p>
  </div>
);

const ScopeBadge: React.FC<{ scope: ScopeOption }> = ({ scope }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${scope.border} ${scope.soft} text-slate-700 dark:text-slate-200`}>
    <scope.icon size={12} />
    {scope.title}
  </span>
);

const ScopeSelectorCard: React.FC<{
  option: ScopeOption;
  active: boolean;
  onClick: () => void;
}> = ({ option, active, onClick }) => (
  <motion.button
    variants={fadeIn}
    whileHover={{ y: -2 }}
    whileTap={{ scale: 0.99 }}
    onClick={onClick}
    className={`w-full rounded-2xl border p-5 text-left transition-all ${
      active
        ? `${option.border} ${option.soft} shadow-md`
        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800'
    }`}
  >
    <div className="flex items-start gap-4">
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${option.accent} text-white shadow-md`}>
        <option.icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{option.title}</h3>
          {active ? (
            <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:bg-slate-900/60 dark:text-slate-300">
              Ativo
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">{option.audience}</p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{option.description}</p>
      </div>
    </div>
  </motion.button>
);

const QuickActionButton: React.FC<{
  title: string;
  description: string;
  icon: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
}> = ({ title, description, icon: Icon, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`rounded-2xl border p-4 text-left shadow-sm transition-all ${
      disabled
        ? 'cursor-not-allowed border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60'
        : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-teal-700'
    }`}
  >
    <div className="flex items-start gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${disabled ? 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200'}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-900 dark:text-white">{title}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
  </button>
);

const ScopeEmptyState: React.FC<{ scope: ScopeOption; showHubWarning: boolean }> = ({ scope, showHubWarning }) => (
  <div className={`rounded-3xl border p-6 ${scope.border} ${scope.soft}`}>
    <ScopeBadge scope={scope} />
    <h3 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">{scope.emptyTitle}</h3>
    <p className="mt-3 max-w-3xl text-sm text-slate-600 dark:text-slate-300">{scope.emptyDescription}</p>

    <div className="mt-6 grid gap-4 md:grid-cols-3">
      {QUICK_ACTIONS.map((action) => (
        <QuickActionButton
          key={action.title}
          title={action.title}
          description={`${action.description} Aguarde o espaco ser provisionado.`}
          icon={action.icon}
          disabled
        />
      ))}
    </div>

    {showHubWarning ? (
      <div className="mt-5 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
        <CircleAlert size={16} className="mt-0.5 shrink-0" />
        O layout do forum foi organizado, mas o backend do Hub ainda precisa ser provisionado para este espaco carregar conteudo real.
      </div>
    ) : null}
  </div>
);

const ForumCardItem: React.FC<{ forum: Forum; scope: ScopeOption; onClick: (f: Forum) => void }> = React.memo(({ forum, scope, onClick }) => (
  <motion.button
    variants={fadeIn}
    whileHover={{ y: -2 }}
    whileTap={{ scale: 0.99 }}
    onClick={() => onClick(forum)}
    className="group w-full text-left rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 hover:shadow-lg hover:border-teal-200 dark:hover:border-teal-700 transition-all"
  >
    <div className="flex items-start gap-4">
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${scope.accent} flex items-center justify-center text-2xl text-white shrink-0 shadow-md`}>
        {forum.icon || '💬'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="mb-3">
          <ScopeBadge scope={scope} />
        </div>
        <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors mb-1">
          {forum.name}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{forum.description}</p>
        <div className="flex items-center gap-4 mt-3 text-xs text-slate-400 dark:text-slate-500">
          <span className="flex items-center gap-1"><MessageCircle size={13} /> {forum.topicsCount} tópicos</span>
          <span className="flex items-center gap-1"><MessagesSquare size={13} /> {forum.membersCount} membros</span>
        </div>
      </div>
    </div>
  </motion.button>
));

const TopicTypeBadge: React.FC<{ type: ForumTopicType }> = ({ type }) => {
  const config = TOPIC_TYPE_CONFIG[type];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${config.bgLight} ${config.bgDark} ${config.color}`}>
      {config.icon} {config.label}
    </span>
  );
};

const TopicStatusBadge: React.FC<{ status: ForumTopic['status'] }> = ({ status }) => {
  const config = TOPIC_STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${config.bg} ${config.color}`}>
      {status === 'resolved' && <CheckCircle2 size={10} />}
      {status === 'awaiting_feedback' && <Clock size={10} />}
      {config.label}
    </span>
  );
};

const FeedModeButton: React.FC<{
  label: string;
  description: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
}> = ({ label, description, icon: Icon, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-xl border px-3 py-2 text-left transition-all ${
      active
        ? 'border-teal-200 bg-teal-50 text-teal-700 shadow-sm dark:border-teal-800 dark:bg-teal-900/20 dark:text-teal-200'
        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
    }`}
  >
    <div className="flex items-center gap-2 text-sm font-semibold">
      <Icon size={14} />
      {label}
    </div>
    <p className="mt-1 text-[11px] leading-5 opacity-80">{description}</p>
  </button>
);

const TopicListItem: React.FC<{ topic: ForumTopic; onClick: (id: string) => void }> = React.memo(({ topic, onClick }) => (
  <motion.button
    variants={fadeIn}
    whileHover={{ x: 4 }}
    onClick={() => onClick(topic.id)}
    className="w-full text-left p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-md hover:border-teal-200 dark:hover:border-teal-700 transition-all"
  >
    <div className="flex items-start gap-3">
      {/* Vote score column */}
      <div className="flex flex-col items-center gap-0.5 pt-0.5 min-w-[40px]">
        <ThumbsUp size={14} className="text-slate-400" />
        <span className={`text-sm font-bold ${topic.votesScore > 0 ? 'text-teal-600 dark:text-teal-400' : topic.votesScore < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
          {topic.votesScore}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          {topic.isPinned && <Pin size={12} className="text-amber-500" />}
          {topic.isFeatured && <Star size={12} className="text-amber-400" />}
          <TopicTypeBadge type={topic.topicType} />
          <TopicStatusBadge status={topic.status} />
          {topic.repliesCount === 0 && !isResolvedTopic(topic) && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
              Sem resposta
            </span>
          )}
          {topic.bestReplyId && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
              <CheckCircle2 size={10} />
              Melhor resposta
            </span>
          )}
        </div>
        <h4 className="font-semibold text-slate-900 dark:text-white text-sm line-clamp-1">{topic.title}</h4>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 line-clamp-1">{topic.content}</p>
        <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400 dark:text-slate-500">
          <span>{topic.author?.fullName || 'Anônimo'}</span>
          <span className="flex items-center gap-1"><MessageCircle size={11} /> {topic.repliesCount}</span>
          <span className="flex items-center gap-1"><Eye size={11} /> {topic.viewsCount}</span>
          <span>Atualizado em {formatDate(topic.updatedAt || topic.createdAt)}</span>
        </div>
      </div>
    </div>
  </motion.button>
));

// =====================================================
// Create Topic Modal
// =====================================================

const CreateTopicModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  forumId: string;
  forumName: string;
  userId: string;
  initialTopicType?: ForumTopicType | null;
  onCreated: () => void;
}> = React.memo(({ isOpen, onClose, forumId, forumName, userId, initialTopicType, onCreated }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [topicType, setTopicType] = useState<ForumTopicType>('qa');
  const [showPreview, setShowPreview] = useState(false);
  const { createTopic, creating } = useCreateTopic(forumId);
  const activeGuide = COMPOSER_GUIDES[topicType];
  const draftKey = useMemo(() => getTopicDraftStorageKey(forumId, userId), [forumId, userId]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const storedDraft = readStoredValue<{ title: string; content: string; topicType: ForumTopicType }>(draftKey);

    if (storedDraft) {
      setTitle(storedDraft.title || '');
      setContent(storedDraft.content || '');
      setTopicType(storedDraft.topicType || initialTopicType || 'qa');
    } else {
      setTitle('');
      setContent('');
      setTopicType(initialTopicType || 'qa');
    }

    setShowPreview(false);
  }, [draftKey, initialTopicType, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    writeStoredValue(draftKey, { title, content, topicType });
  }, [content, draftKey, isOpen, title, topicType]);

  const handleSeedDraft = useCallback(() => {
    setTitle(previous => previous.trim() || activeGuide.titleSuggestion);
    setContent(previous => previous.trim() || activeGuide.bodySuggestion);
  }, [activeGuide.bodySuggestion, activeGuide.titleSuggestion]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim() || !content.trim()) return;
    const result = await createTopic({ title: title.trim(), content: content.trim(), topicType, authorId: userId });
    if (result) {
      removeStoredValue(draftKey);
      setTitle('');
      setContent('');
      setTopicType(initialTopicType || 'qa');
      setShowPreview(false);
      onCreated();
      onClose();
    }
  }, [title, content, topicType, userId, createTopic, onCreated, onClose, draftKey, initialTopicType]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Novo topico</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{forumName}</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Escreva com contexto suficiente para a rede responder com clareza.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className={`rounded-xl px-3 py-2 text-sm font-semibold ${!showPreview ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-200'}`}
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className={`rounded-xl px-3 py-2 text-sm font-semibold ${showPreview ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-200'}`}
              >
                Preview
              </button>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {/* Topic type */}
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(TOPIC_TYPE_CONFIG) as ForumTopicType[]).map(type => {
                const config = TOPIC_TYPE_CONFIG[type];
                return (
                  <button
                    key={type}
                    onClick={() => setTopicType(type)}
                    className={`p-3 rounded-xl border text-left text-sm transition-all ${topicType === type
                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 ring-2 ring-teal-500/20'
                      : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span className="mr-2 inline-flex min-w-[24px] justify-center rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-200">{config.icon}</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
            {activeGuide.helper}
          </p>
          {/* Title */}
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={activeGuide.titlePlaceholder}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-sm"
          />
          {/* Content */}
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={activeGuide.contentPlaceholder}
            rows={7}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-sm resize-none"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleSeedDraft}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-600"
            >
              Inserir modelo guiado
            </button>
            <button
              type="button"
              onClick={() => setShowPreview(previous => !previous)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-600"
            >
              {showPreview ? 'Ocultar preview' : 'Mostrar preview'}
            </button>
          </div>
          {showPreview && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900/40">
              <div className="flex items-center gap-2">
                <TopicTypeBadge type={topicType} />
                <span className="text-xs text-slate-400 dark:text-slate-500">Preview da publicacao</span>
              </div>
              <h4 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
                {title.trim() || 'Seu titulo aparece aqui'}
              </h4>
              <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600 dark:text-slate-300">
                {content.trim() || 'O conteudo do topico aparece aqui para revisao antes de publicar.'}
              </div>
            </div>
          )}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
            <p className="font-bold">Cuidado com LGPD</p>
            <p className="mt-2 leading-6">
              Nao publique nome de paciente, CPF, prontuario, telefone ou qualquer dado sensivel.
            </p>
          </div>
        </div>
        <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={creating || !title.trim() || !content.trim()}
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {creating ? 'Publicando...' : 'Publicar topico'}
          </button>
        </div>
      </motion.div>
    </div>
  );
});

// =====================================================
// Topic Detail View
// =====================================================

const TopicDetailView: React.FC<{
  topicId: string;
  userId?: string;
  onBack: () => void;
}> = React.memo(({ topicId, userId, onBack }) => {
  const { user } = useAuth();
  const { topic, replies, loading, error, refetch } = useForumTopic(topicId);
  const { createReply, creating } = useCreateReply(topicId);
  const { acceptReply, updating: acceptingReply } = useAcceptForumReply(topicId);
  const { vote } = useForumVote();
  const [replyContent, setReplyContent] = useState('');
  const replyDraftKey = useMemo(
    () => (userId ? getReplyDraftStorageKey(topicId, userId) : null),
    [topicId, userId],
  );

  useEffect(() => {
    const storedDraft = readStoredValue<{ content: string }>(replyDraftKey);
    setReplyContent(storedDraft?.content || '');
  }, [replyDraftKey]);

  useEffect(() => {
    if (!replyDraftKey) {
      return;
    }

    writeStoredValue(replyDraftKey, { content: replyContent });
  }, [replyContent, replyDraftKey]);

  const canMarkBestAnswer = Boolean(
    user &&
    topic &&
    (user.id === topic.authorId || user.role === 'admin' || user.role === 'superadmin'),
  );

  const handleSubmitReply = useCallback(async () => {
    if (!replyContent.trim() || !userId) return;
    const ok = await createReply(replyContent.trim(), userId);
    if (ok) {
      setReplyContent('');
      removeStoredValue(replyDraftKey);
      void refetch();
    }
  }, [replyContent, userId, createReply, refetch, replyDraftKey]);

  const handleVote = useCallback(async (value: 1 | -1, target: { topicId?: string; replyId?: string }) => {
    if (!userId) return;
    await vote(userId, value, target);
    void refetch();
  }, [userId, vote, refetch]);

  const handleAcceptReply = useCallback(async (replyId: string) => {
    const ok = await acceptReply(replyId);
    if (ok) {
      void refetch();
    }
  }, [acceptReply, refetch]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" /></div>;
  }

  if (!topic) {
    return <div className="text-center py-12 text-slate-500">{error || 'Topico nao encontrado'}</div>;
  }

  return (
    <motion.div {...fadeIn} className="space-y-6">
      {/* Back nav */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-teal-600 transition-colors">
        <ArrowLeft size={16} /> Voltar ao fórum
      </button>

      {/* Topic header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <TopicTypeBadge type={topic.topicType} />
          <TopicStatusBadge status={topic.status} />
          {topic.bestReplyId && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
              <CheckCircle2 size={10} />
              Melhor resposta definida
            </span>
          )}
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{topic.title}</h2>
        <div className="prose prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
          {topic.content}
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>{getAuthorLabel(topic.author?.fullName)}</span>
            <span>{new Date(topic.createdAt).toLocaleDateString('pt-BR')}</span>
            <span><Eye size={12} className="inline mr-1" />{topic.viewsCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => handleVote(1, { topicId: topic.id })} className="p-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 text-slate-400 hover:text-teal-600 transition-colors">
              <ChevronUp size={18} />
            </button>
            <span className={`text-sm font-bold min-w-[24px] text-center ${topic.votesScore > 0 ? 'text-teal-600' : topic.votesScore < 0 ? 'text-rose-500' : 'text-slate-400'}`}>{topic.votesScore}</span>
            <button onClick={() => handleVote(-1, { topicId: topic.id })} className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-500 transition-colors">
              <ChevronDown size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Replies */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {replies.length} {replies.length === 1 ? 'Resposta' : 'Respostas'}
        </h3>
        {replies.map(reply => (
          <div
            key={reply.id}
            className={`rounded-xl border p-5 transition-all ${reply.isAccepted
              ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-900/20'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
            }`}
          >
            {reply.isAccepted && (
              <div className="flex items-center gap-1.5 mb-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                <CheckCircle2 size={14} /> Melhor Resposta
              </div>
            )}
            <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{reply.content}</div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <div className="text-xs text-slate-400">
                {getAuthorLabel(reply.author?.fullName)} · {new Date(reply.createdAt).toLocaleDateString('pt-BR')}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleVote(1, { replyId: reply.id })} className="p-1 rounded hover:bg-teal-50 dark:hover:bg-teal-900/20 text-slate-400 hover:text-teal-600 transition-colors">
                  <ChevronUp size={14} />
                </button>
                <span className={`text-xs font-bold ${reply.votesScore > 0 ? 'text-teal-600' : 'text-slate-400'}`}>{reply.votesScore}</span>
                <button onClick={() => handleVote(-1, { replyId: reply.id })} className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-500 transition-colors">
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>
            {canMarkBestAnswer && !reply.isAccepted && (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleAcceptReply(reply.id)}
                  disabled={acceptingReply}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
                >
                  {acceptingReply ? 'Salvando...' : 'Marcar como melhor resposta'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Reply form */}
      {userId && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Responda com orientacao pratica. O rascunho fica salvo neste navegador.
            </p>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-200">
              Rascunho salvo
            </span>
          </div>
          <textarea
            value={replyContent}
            onChange={e => setReplyContent(e.target.value)}
            placeholder="Escreva sua resposta. Se puder, detalhe o passo a passo para o gestor executar."
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-sm resize-none mb-3"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              Evite expor dado pessoal de paciente ou servidor.
            </div>
            <button
              onClick={handleSubmitReply}
              disabled={creating || !replyContent.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Send size={14} /> {creating ? 'Enviando...' : 'Responder'}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
});

// =====================================================
// Forum Detail View (Topic list)
// =====================================================

const ForumDetailView: React.FC<{
  forum: Forum;
  scope: ScopeOption;
  userId?: string;
  initialTopicType?: ForumTopicType | null;
  onBack: () => void;
  onSelectTopic: (topicId: string) => void;
  onComposerIntentHandled: () => void;
}> = React.memo(({ forum, scope, userId, initialTopicType, onBack, onSelectTopic, onComposerIntentHandled }) => {
  const { topics, loading, error, refetch } = useForumTopics(forum.id);
  const { experts } = useForumExperts(forum.id);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [composerTopicType, setComposerTopicType] = useState<ForumTopicType | null>(initialTopicType || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<ForumTopicType | 'all'>('all');
  const [feedMode, setFeedMode] = useState<TopicFeedMode>('recent');

  const filteredTopics = useMemo(() => {
    const matchingTopics = topics.filter(t => {
      const matchesSearch = !searchTerm || t.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || t.topicType === typeFilter;
      return matchesSearch && matchesType;
    });

    const sortedTopics = [...matchingTopics].sort((left, right) => {
      if (left.isPinned !== right.isPinned) {
        return Number(right.isPinned) - Number(left.isPinned);
      }

      if (left.isFeatured !== right.isFeatured) {
        return Number(right.isFeatured) - Number(left.isFeatured);
      }

      if (feedMode === 'hot') {
        return getTopicHotScore(right) - getTopicHotScore(left);
      }

      return new Date(right.updatedAt || right.createdAt).getTime() - new Date(left.updatedAt || left.createdAt).getTime();
    });

    if (feedMode === 'unanswered') {
      return sortedTopics.filter(topic => topic.repliesCount === 0 && !isResolvedTopic(topic));
    }

    if (feedMode === 'resolved') {
      return sortedTopics.filter(isResolvedTopic);
    }

    return sortedTopics;
  }, [topics, searchTerm, typeFilter, feedMode]);

  const openTopicsCount = useMemo(() => topics.filter(topic => !isResolvedTopic(topic)).length, [topics]);
  const unansweredTopicsCount = useMemo(() => topics.filter(topic => topic.repliesCount === 0 && !isResolvedTopic(topic)).length, [topics]);
  const resolvedTopicsCount = useMemo(() => topics.filter(isResolvedTopic).length, [topics]);

  useEffect(() => {
    if (!initialTopicType) {
      return;
    }

    setComposerTopicType(initialTopicType);
    setShowCreateModal(true);
    onComposerIntentHandled();
  }, [initialTopicType, onComposerIntentHandled]);

  return (
    <motion.div {...fadeIn} className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-teal-600 transition-colors">
        <ArrowLeft size={16} /> Voltar aos fóruns
      </button>

      {/* Forum header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${scope.accent} flex items-center justify-center text-3xl text-white shadow-md`}>
            {forum.icon || '💬'}
          </div>
          <div className="flex-1">
            <div className="mb-3">
              <ScopeBadge scope={scope} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{forum.name}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{forum.description}</p>
          </div>
          {userId && (
            <button
              onClick={() => {
                setComposerTopicType(null);
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 transition-all shrink-0"
            >
              <Plus size={16} /> Novo Tópico
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Topicos abertos" value={openTopicsCount} accent />
        <StatCard label="Sem resposta" value={unansweredTopicsCount} />
        <StatCard label="Resolvidos" value={resolvedTopicsCount} />
      </div>

      {userId && (
        <div className="grid gap-3 md:grid-cols-3">
          {QUICK_ACTIONS.map(action => (
            <QuickActionButton
              key={action.title}
              title={action.title}
              description={action.description}
              icon={action.icon}
              onClick={() => {
                setComposerTopicType(action.topicType);
                setShowCreateModal(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Experts sidebar — small cards on top for mobile, side on desktop */}
      {experts.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Award size={12} className="text-amber-500" /> Especialistas
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {experts.map(e => (
              <div key={e.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 shrink-0">
                <div className="w-7 h-7 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-xs font-bold text-amber-700 dark:text-amber-200">
                  {(e.user?.fullName || '?')[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{e.user?.fullName || 'Anônimo'}</p>
                  <p className="text-[10px] text-slate-400">{e.helpfulRepliesCount} respostas úteis</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          <CircleAlert size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar topicos..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
            />
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as ForumTopicType | 'all')}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-teal-500/20 outline-none"
          >
            <option value="all">Todos os tipos</option>
            {(Object.keys(TOPIC_TYPE_CONFIG) as ForumTopicType[]).map(t => (
              <option key={t} value={t}>{TOPIC_TYPE_CONFIG[t].label}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 lg:grid-cols-4">
          {FEED_MODES.map(mode => (
            <FeedModeButton
              key={mode.id}
              label={mode.label}
              description={mode.description}
              icon={mode.icon}
              active={feedMode === mode.id}
              onClick={() => setFeedMode(mode.id)}
            />
          ))}
        </div>
      </div>

      {/* Topics */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
        </div>
      ) : filteredTopics.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <MessagesSquare size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Nenhum tópico ainda</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Seja o primeiro a iniciar uma discussão!</p>
        </div>
      ) : (
        <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-3">
          {filteredTopics.map(topic => (
            <TopicListItem key={topic.id} topic={topic} onClick={onSelectTopic} />
          ))}
        </motion.div>
      )}

      <CreateTopicModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        forumId={forum.id}
        forumName={forum.name}
        userId={userId || ''}
        initialTopicType={composerTopicType}
        onCreated={refetch}
      />
    </motion.div>
  );
});

// =====================================================
// Main Forums Page
// =====================================================

interface ForumsPageProps {
  userId?: string;
}

export const ForumsPage: React.FC<ForumsPageProps> = React.memo(({ userId }) => {
  const { forums, loading, error } = useForums();
  const { user, currentMicrorregiao } = useAuth();
  const [selectedScope, setSelectedScope] = useState<DiscussionScope>('global');
  const [selectedForum, setSelectedForum] = useState<Forum | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [composerIntent, setComposerIntent] = useState<ForumTopicType | null>(null);

  const microName = currentMicrorregiao?.nome || (user?.microregiaoId ? getMicroregiaoById(user.microregiaoId)?.nome : null) || 'Sua microrregiao';
  const municipalityName = user?.municipio || 'Seu municipio';
  const scopeOptions = useMemo(() => buildScopeOptions(microName, municipalityName), [microName, municipalityName]);
  const activeScope = useMemo(() => scopeOptions.find(scope => scope.id === selectedScope) || scopeOptions[0], [scopeOptions, selectedScope]);
  const forumsByScope = useMemo(() => ({
    global: forums.filter(forum => inferForumScope(forum) === 'global'),
    micro: forums.filter(forum => inferForumScope(forum) === 'micro'),
    municipality: forums.filter(forum => inferForumScope(forum) === 'municipality'),
  }), [forums]);
  const scopedForums = forumsByScope[selectedScope];
  const selectedForumScope = selectedForum ? inferForumScope(selectedForum) : selectedScope;
  const selectedForumScopeOption = useMemo(
    () => scopeOptions.find(scope => scope.id === selectedForumScope) || activeScope,
    [scopeOptions, selectedForumScope, activeScope]
  );
  const totalTopics = useMemo(() => forums.reduce((acc, f) => acc + f.topicsCount, 0), [forums]);
  const totalMembers = useMemo(() => forums.reduce((acc, f) => acc + f.membersCount, 0), [forums]);
  const scopedTopics = useMemo(() => scopedForums.reduce((acc, forum) => acc + forum.topicsCount, 0), [scopedForums]);

  const openForum = useCallback((forum: Forum) => {
    setComposerIntent(null);
    setSelectedForum(forum);
  }, []);

  const handleQuickAction = useCallback((topicType: ForumTopicType) => {
    if (!scopedForums.length) {
      return;
    }

    setComposerIntent(topicType);
    setSelectedForum(scopedForums[0]);
  }, [scopedForums]);

  // Topic detail view
  if (selectedTopicId && selectedForum) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <TopicDetailView
          topicId={selectedTopicId}
          userId={userId}
          onBack={() => setSelectedTopicId(null)}
        />
      </div>
    );
  }

  // Forum detail view (topics list)
  if (selectedForum) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <ForumDetailView
          forum={selectedForum}
          scope={selectedForumScopeOption}
          userId={userId}
          initialTopicType={composerIntent}
          onBack={() => {
            setSelectedForum(null);
            setComposerIntent(null);
          }}
          onSelectTopic={setSelectedTopicId}
          onComposerIntentHandled={() => setComposerIntent(null)}
        />
      </div>
    );
  }

  const useScopedLanding = scopeOptions.length > 0;

  if (useScopedLanding) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <motion.div {...fadeIn} className="space-y-6">
          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="p-6 sm:p-8">
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:bg-slate-700 dark:text-slate-200">
                  <MessagesSquare size={14} />
                  Comunidade de pratica
                </div>
                <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                  Um forum mais simples para gestores trocarem ajuda, pratica e orientacao.
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                  A entrada agora e territorial. Primeiro voce escolhe o escopo da conversa: global, microrregiao ou municipio.
                </p>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {QUICK_ACTIONS.map(action => (
                    <QuickActionButton
                      key={action.title}
                      title={action.title}
                      description={action.description}
                      icon={action.icon}
                      disabled={scopedForums.length === 0}
                      onClick={() => handleQuickAction(action.topicType)}
                    />
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200 bg-slate-50/80 p-6 dark:border-slate-700 dark:bg-slate-900/50 lg:border-l lg:border-t-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Como organizar o forum</p>
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Global</p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Comunicados amplos, duvidas transversais e referencias da rede.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Minha Micro</p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Colaboracao regional entre municipios da mesma microrregiao.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Meu Municipio</p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Canal curto para operacao local e alinhamentos internos.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Foruns Ativos" value={forums.length} accent />
            <StatCard label="Total de Topicos" value={totalTopics} />
            <StatCard label="Participantes" value={totalMembers} />
            <StatCard label="No Escopo" value={scopedTopics} />
          </div>

          {error ? (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              <CircleAlert size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          ) : null}

          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Escolha o territorio</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Onde esta sua conversa?</h2>
            </div>

            <motion.div variants={stagger} initial="initial" animate="animate" className="grid gap-4 lg:grid-cols-3">
              {scopeOptions.map(scope => (
                <ScopeSelectorCard
                  key={scope.id}
                  option={scope}
                  active={scope.id === selectedScope}
                  onClick={() => setSelectedScope(scope.id)}
                />
              ))}
            </motion.div>
          </div>

          <div className={`overflow-hidden rounded-[28px] border ${activeScope.border} bg-white shadow-sm dark:bg-slate-800`}>
            <div className={`bg-gradient-to-r ${activeScope.accent} p-6 text-white`}>
              <div className="flex flex-wrap items-center gap-2">
                <ScopeBadge scope={activeScope} />
                <span className="rounded-full bg-white/15 px-2 py-1 text-[11px] font-semibold">{activeScope.audience}</span>
              </div>
              <h2 className="mt-4 text-3xl font-bold">{activeScope.title}</h2>
              <p className="mt-3 max-w-3xl text-sm text-white/90">{activeScope.description}</p>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-700 animate-pulse" />)}
                </div>
              ) : scopedForums.length === 0 ? (
                <ScopeEmptyState scope={activeScope} showHubWarning={Boolean(error) || forums.length === 0} />
              ) : (
                <motion.div variants={stagger} initial="initial" animate="animate" className="grid gap-4 xl:grid-cols-2">
                  {scopedForums.map(forum => (
                    <ForumCardItem key={forum.id} forum={forum} scope={activeScope} onClick={openForum} />
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Forums listing
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <motion.div {...fadeIn} className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fóruns de Discussão</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Comunidade de prática para troca de experiências e suporte mútuo</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Fóruns Ativos" value={forums.length} accent />
          <StatCard label="Total de Tópicos" value={totalTopics} />
          <StatCard label="Participantes" value={totalMembers} />
          <StatCard label="Tempo Médio" value="--" />
        </div>

        {/* Forum list */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
          </div>
        ) : forums.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
            <MessagesSquare size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">Nenhum fórum disponível</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Os fóruns temáticos serão exibidos aqui quando configurados.</p>
          </div>
        ) : (
          <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-4">
            {forums.map(forum => (
              <ForumCardItem key={forum.id} forum={forum} scope={activeScope} onClick={openForum} />
            ))}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
});
