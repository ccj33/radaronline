import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessagesSquare,
  MessageCircle,
  Eye,
  Pin,
  Search,
  ArrowLeft,
  ArrowRight,
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
  Building2,
  ShieldCheck,
  CircleAlert,
  HelpCircle,
  Megaphone,
  Lightbulb,
  X,
} from 'lucide-react';
import { useAuth } from '../../../auth';
import { getMicroregiaoById } from '../../../data/microregioes';
import {
  useForums,
  useForumTopics,
  useForumTopic,
  useCreateTopic,
  useCreateReply,
  useAcceptForumReply,
  useForumVote,
  useForumExperts,
} from '../../../hooks/useForums';
import type { Forum, ForumTopic, ForumTopicType } from '../../../types/forum.types';
import { TOPIC_TYPE_CONFIG, TOPIC_STATUS_CONFIG } from '../../../types/forum.types';

// =====================================================
// Animation
// =====================================================

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.04 } },
};

// =====================================================
// Types
// =====================================================

type DiscussionScope = 'global' | 'micro' | 'municipality';
type TopicFeedMode = 'recent' | 'hot' | 'unanswered' | 'resolved';

// =====================================================
// Utilities
// =====================================================

function formatRelativeDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return 'agora mesmo';
  if (mins < 60) return `há ${mins}min`;
  if (hours < 24) return `há ${hours}h`;
  if (days === 1) return 'ontem';
  if (days < 7) return `há ${days} dias`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

const AVATAR_PALETTE = [
  'bg-teal-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-emerald-500',
  'bg-indigo-500',
  'bg-orange-500',
];

function getAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function getInitials(name?: string | null): string {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Read tracking — bold = unread, normal = read
const READ_TOPICS_KEY = 'forums:read-topics';

function getReadTopics(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_TOPICS_KEY);
    return new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set<string>();
  }
}

function markTopicAsRead(topicId: string): void {
  try {
    const set = getReadTopics();
    set.add(topicId);
    const arr = Array.from(set).slice(-300);
    localStorage.setItem(READ_TOPICS_KEY, JSON.stringify(arr));
  } catch {
    // ignore
  }
}

function readStoredValue<T>(key: string | null): T | null {
  if (!key || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeStoredValue(key: string | null, value: unknown): void {
  if (!key || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function removeStoredValue(key: string | null): void {
  if (!key || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function getTopicDraftKey(forumId: string, userId: string): string {
  return `forums:create-topic:${forumId}:${userId}`;
}

function getReplyDraftKey(topicId: string, userId: string): string {
  return `forums:reply:${topicId}:${userId}`;
}

function isResolvedTopic(topic: ForumTopic): boolean {
  return topic.status === 'resolved' || topic.status === 'validated' || Boolean(topic.bestReplyId);
}

function getTopicHotScore(topic: ForumTopic): number {
  const ageHours = Math.max(
    (Date.now() - new Date(topic.updatedAt || topic.createdAt).getTime()) / 3_600_000,
    1,
  );
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
  const h = `${forum.slug} ${forum.name} ${forum.description}`.toLowerCase();
  if (h.includes('municip')) return 'municipality';
  if (h.includes('micro') || h.includes('regional') || h.includes('territ')) return 'micro';
  return 'global';
}

// =====================================================
// Scope config
// =====================================================

interface ScopeConfig {
  id: DiscussionScope;
  title: string;
  audienceLabel: string;
  description: string;
  color: string;
  bg: string;
  border: string;
  dot: string;
  icon: LucideIcon;
  emptyPrompt: string;
}

function buildScopeConfigs(microName: string, municipalityName: string): ScopeConfig[] {
  return [
    {
      id: 'global',
      title: 'Global',
      audienceLabel: 'Toda a rede',
      description: 'Comunicados amplos, boas práticas e dúvidas de alcance geral.',
      color: 'text-sky-600 dark:text-sky-400',
      bg: 'bg-sky-50 dark:bg-sky-950/30',
      border: 'border-sky-200 dark:border-sky-800/60',
      dot: 'bg-sky-500',
      icon: Globe2,
      emptyPrompt: 'Tem uma dúvida que vale para toda a rede? Inicie o primeiro tópico.',
    },
    {
      id: 'micro',
      title: 'Minha Micro',
      audienceLabel: microName,
      description: 'Troca regional entre municípios e alinhamento da microrregião.',
      color: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-50 dark:bg-teal-950/30',
      border: 'border-teal-200 dark:border-teal-800/60',
      dot: 'bg-teal-500',
      icon: Map,
      emptyPrompt: 'Este espaço estará disponível quando o Hub da microrregião for provisionado.',
    },
    {
      id: 'municipality',
      title: 'Meu Município',
      audienceLabel: municipalityName,
      description: 'Canal operacional local para combinados e alinhamentos rápidos.',
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      border: 'border-amber-200 dark:border-amber-800/60',
      dot: 'bg-amber-500',
      icon: Building2,
      emptyPrompt: 'O espaço municipal ainda não foi provisionado. Quando estiver, será o canal mais direto.',
    },
  ];
}

// =====================================================
// Composer guides
// =====================================================

const COMPOSER_GUIDES: Record<ForumTopicType, {
  titleSuggestion: string;
  bodySuggestion: string;
  helper: string;
  titlePlaceholder: string;
  contentPlaceholder: string;
}> = {
  qa: {
    titleSuggestion: 'Preciso de apoio com...',
    bodySuggestion: 'Contexto rápido:\n-\n\nO que já foi tentado:\n-\n\nQual retorno você precisa da rede:\n-',
    helper: 'Perguntas objetivas recebem resposta melhor e mais rápida.',
    titlePlaceholder: 'Ex: Como organizar o fluxo de acompanhamento desta frente?',
    contentPlaceholder: 'Explique o contexto, o que já foi tentado e qual decisão você precisa tomar.',
  },
  best_practice: {
    titleSuggestion: 'Boa prática para...',
    bodySuggestion: 'Cenário:\n-\n\nO que foi feito:\n-\n\nResultado observado:\n-\n\nComo outra equipe pode replicar:\n-',
    helper: 'Boas práticas funcionam melhor quando são replicáveis.',
    titlePlaceholder: 'Ex: Boa prática para organizar ponto focal municipal',
    contentPlaceholder: 'Conte o contexto, a ação aplicada e o resultado que vale compartilhar.',
  },
  problem_solution: {
    titleSuggestion: 'Problema recorrente em...',
    bodySuggestion: 'Problema:\n-\n\nImpacto no trabalho:\n-\n\nTentativa de solução:\n-\n\nApoio esperado da rede:\n-',
    helper: 'Separe problema, impacto e pedido de apoio.',
    titlePlaceholder: 'Ex: Problema recorrente na comunicação entre equipes',
    contentPlaceholder: 'Descreva o problema, o impacto e a ajuda que você espera receber.',
  },
  announcement: {
    titleSuggestion: 'Aviso importante sobre...',
    bodySuggestion: 'Resumo do aviso:\n-\n\nQuem precisa agir:\n-\n\nPrazo ou data importante:\n-\n\nLink, documento ou contato:\n-',
    helper: 'Avisos funcionam melhor quando deixam claro público, prazo e próxima ação.',
    titlePlaceholder: 'Ex: Aviso sobre atualização do cronograma regional',
    contentPlaceholder: 'Registre o aviso de forma direta: público afetado, prazo, documento e próxima ação.',
  },
};

const TOPIC_TYPE_ICONS: Record<ForumTopicType, LucideIcon> = {
  qa: HelpCircle,
  best_practice: Lightbulb,
  problem_solution: CircleAlert,
  announcement: Megaphone,
};

const QUICK_ACTIONS: Array<{ label: string; type: ForumTopicType; icon: LucideIcon }> = [
  { label: 'Pedir ajuda', type: 'qa', icon: HelpCircle },
  { label: 'Boa prática', type: 'best_practice', icon: Lightbulb },
  { label: 'Aviso', type: 'announcement', icon: Megaphone },
];

// =====================================================
// Atoms
// =====================================================

const Avatar: React.FC<{ name?: string | null; size?: 'xs' | 'sm' | 'md' }> = ({ name, size = 'md' }) => {
  const seed = name?.trim() || '?';
  const color = getAvatarColor(seed);
  const sizeClass =
    size === 'xs' ? 'w-5 h-5 text-[9px]' :
    size === 'sm' ? 'w-6 h-6 text-[10px]' :
    'w-8 h-8 text-xs';
  return (
    <div className={`${sizeClass} ${color} rounded-full flex items-center justify-center font-bold text-white shrink-0 select-none`}>
      {getInitials(seed)}
    </div>
  );
};

const TypePill: React.FC<{ type: ForumTopicType }> = ({ type }) => {
  const config = TOPIC_TYPE_CONFIG[type];
  const Icon = TOPIC_TYPE_ICONS[type];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.bgLight} ${config.bgDark} ${config.color}`}>
      <Icon size={9} />
      {config.label}
    </span>
  );
};

// =====================================================
// Topic List Item
// =====================================================

const TopicListItem: React.FC<{
  topic: ForumTopic;
  isRead: boolean;
  onClick: (id: string) => void;
  onVote?: (value: 1 | -1, topicId: string) => void;
}> = React.memo(({ topic, isRead, onClick, onVote }) => {
  const resolved = isResolvedTopic(topic);
  const unanswered = topic.repliesCount === 0 && !resolved;

  return (
    <motion.div
      variants={fadeIn}
      className={`group relative flex gap-0 rounded-xl border transition-all cursor-pointer overflow-hidden
        hover:shadow-md
        ${resolved
          ? 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-emerald-200 dark:hover:border-emerald-800/60'
          : unanswered
          ? 'border-amber-100 dark:border-amber-900/30 bg-white dark:bg-slate-900/80 hover:border-amber-300 dark:hover:border-amber-700'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-teal-200 dark:hover:border-teal-700'
        }`}
      onClick={() => onClick(topic.id)}
    >
      {/* Pinned left accent */}
      {topic.isPinned && (
        <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-400" />
      )}

      {/* Vote column */}
      <div
        className="flex flex-col items-center justify-center gap-0.5 px-2.5 py-3 border-r border-slate-100 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-900/40 min-w-[40px]"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => onVote?.(1, topic.id)}
          className="p-0.5 text-slate-300 hover:text-teal-500 transition-colors"
          aria-label="Votar positivo"
        >
          <ChevronUp size={14} />
        </button>
        <span className={`text-xs font-bold leading-none tabular-nums ${
          topic.votesScore > 0
            ? 'text-teal-600 dark:text-teal-400'
            : topic.votesScore < 0
            ? 'text-rose-500'
            : 'text-slate-400'
        }`}>
          {topic.votesScore}
        </span>
        <button
          onClick={() => onVote?.(-1, topic.id)}
          className="p-0.5 text-slate-300 hover:text-rose-400 transition-colors"
          aria-label="Votar negativo"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 px-3.5 py-3">
        {/* Badges row */}
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          <TypePill type={topic.topicType} />
          {resolved && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={9} /> Resolvido
            </span>
          )}
          {topic.isPinned && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-500">
              <Pin size={9} /> Fixado
            </span>
          )}
        </div>

        {/* Title — bold if unread */}
        <h4 className={`text-sm leading-5 line-clamp-2 transition-colors group-hover:text-teal-600 dark:group-hover:text-teal-400 ${
          isRead
            ? 'font-medium text-slate-600 dark:text-slate-400'
            : 'font-semibold text-slate-900 dark:text-white'
        }`}>
          {topic.title}
        </h4>

        {/* Meta row */}
        <div className="flex items-center gap-2.5 mt-1.5 text-[11px] text-slate-400 dark:text-slate-500 flex-wrap">
          <span className="flex items-center gap-1">
            <Avatar name={topic.author?.fullName} size="xs" />
            <span className="truncate max-w-[100px]">{topic.author?.fullName || 'Anônimo'}</span>
          </span>
          <span className="flex items-center gap-0.5">
            <MessageCircle size={10} />
            {topic.repliesCount}
          </span>
          <span className="flex items-center gap-0.5">
            <Eye size={10} />
            {topic.viewsCount}
          </span>
          <span className="ml-auto shrink-0">{formatRelativeDate(topic.updatedAt || topic.createdAt)}</span>
        </div>
      </div>

      {/* Unanswered pulse dot */}
      {unanswered && (
        <div className="flex items-center pr-3 shrink-0">
          <span
            className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"
            title="Ainda sem resposta"
          />
        </div>
      )}
    </motion.div>
  );
});

TopicListItem.displayName = 'TopicListItem';

// =====================================================
// Feed mode tabs
// =====================================================

const FEED_MODES: Array<{ id: TopicFeedMode; label: string; icon: LucideIcon }> = [
  { id: 'recent', label: 'Recentes', icon: Clock },
  { id: 'hot', label: 'Em alta', icon: Flame },
  { id: 'unanswered', label: 'Sem resposta', icon: HelpCircle },
  { id: 'resolved', label: 'Resolvidos', icon: CheckCircle2 },
];

const FeedModeTabs: React.FC<{
  mode: TopicFeedMode;
  onChange: (m: TopicFeedMode) => void;
  counts: Record<TopicFeedMode, number>;
}> = ({ mode, onChange, counts }) => (
  <div className="flex items-center gap-1 flex-wrap">
    {FEED_MODES.map(m => {
      const Icon = m.icon;
      const active = mode === m.id;
      return (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            active
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60'
          }`}
        >
          <Icon size={11} />
          {m.label}
          {counts[m.id] > 0 && (
            <span className={`text-[10px] font-bold ${active ? 'opacity-60' : 'text-slate-400 dark:text-slate-500'}`}>
              {counts[m.id]}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

// =====================================================
// Scope sidebar (desktop)
// =====================================================

const ScopeSidebar: React.FC<{
  scopes: ScopeConfig[];
  selected: DiscussionScope;
  onSelect: (s: DiscussionScope) => void;
  forumCounts: Record<DiscussionScope, number>;
}> = ({ scopes, selected, onSelect, forumCounts }) => (
  <div className="space-y-1">
    {scopes.map(scope => {
      const Icon = scope.icon;
      const active = scope.id === selected;
      return (
        <button
          key={scope.id}
          onClick={() => onSelect(scope.id)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
            active
              ? `${scope.bg} ${scope.border} border`
              : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent'
          }`}
        >
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
            active ? 'bg-white/60 dark:bg-slate-800/60' : 'bg-slate-100 dark:bg-slate-700/60'
          }`}>
            <Icon size={14} className={active ? scope.color : 'text-slate-500 dark:text-slate-400'} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold truncate ${
              active ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
            }`}>
              {scope.title}
            </p>
            <p className="text-[11px] text-slate-400 truncate">{scope.audienceLabel}</p>
          </div>
          {forumCounts[scope.id] > 0 && (
            <span className={`text-[11px] font-bold shrink-0 ${active ? scope.color : 'text-slate-400'}`}>
              {forumCounts[scope.id]}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

// =====================================================
// Create topic modal
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
  const draftKey = useMemo(() => getTopicDraftKey(forumId, userId), [forumId, userId]);
  const guide = COMPOSER_GUIDES[topicType];

  useEffect(() => {
    if (!isOpen) return;
    const draft = readStoredValue<{ title: string; content: string; topicType: ForumTopicType }>(draftKey);
    if (draft) {
      setTitle(draft.title || '');
      setContent(draft.content || '');
      setTopicType(draft.topicType || initialTopicType || 'qa');
    } else {
      setTitle('');
      setContent('');
      setTopicType(initialTopicType || 'qa');
    }
    setShowPreview(false);
  }, [draftKey, initialTopicType, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    writeStoredValue(draftKey, { title, content, topicType });
  }, [content, draftKey, isOpen, title, topicType]);

  const handleSeed = useCallback(() => {
    setTitle(p => p.trim() || guide.titleSuggestion);
    setContent(p => p.trim() || guide.bodySuggestion);
  }, [guide.titleSuggestion, guide.bodySuggestion]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim() || !content.trim()) return;
    const ok = await createTopic({ title: title.trim(), content: content.trim(), topicType, authorId: userId });
    if (ok) {
      removeStoredValue(draftKey);
      setTitle('');
      setContent('');
      onCreated();
      onClose();
    }
  }, [title, content, topicType, userId, createTopic, draftKey, onCreated, onClose]);

  const TYPE_OPTIONS: Array<{ id: ForumTopicType; label: string; desc: string; icon: LucideIcon }> = [
    { id: 'qa', label: 'Pergunta', desc: 'Tenho uma dúvida', icon: HelpCircle },
    { id: 'best_practice', label: 'Boa prática', desc: 'Quero compartilhar', icon: Lightbulb },
    { id: 'problem_solution', label: 'Problema', desc: 'Preciso de apoio', icon: CircleAlert },
    { id: 'announcement', label: 'Aviso', desc: 'Comunicado formal', icon: Megaphone },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', damping: 32, stiffness: 380 }}
          onClick={e => e.stopPropagation()}
          className="bg-white dark:bg-slate-800 w-full sm:rounded-2xl sm:max-w-2xl border-t sm:border border-slate-200 dark:border-slate-700 max-h-[92vh] overflow-y-auto rounded-t-2xl"
        >
          {/* Header */}
          <div className="sticky top-0 flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 z-10">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Novo tópico</p>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{forumName}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Type selector */}
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const active = topicType === opt.id;
                const config = TOPIC_TYPE_CONFIG[opt.id];
                return (
                  <button
                    key={opt.id}
                    onClick={() => setTopicType(opt.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      active
                        ? `${config.bgLight} ${config.bgDark} border-current ${config.color} ring-2 ring-current/15`
                        : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <Icon size={16} className={active ? config.color : 'text-slate-400'} />
                    <div>
                      <p className={`text-xs font-bold ${active ? config.color : ''}`}>{opt.label}</p>
                      <p className="text-[10px] text-slate-400">{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Guide hint */}
            <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-xl px-4 py-2.5 border border-slate-100 dark:border-slate-700">
              {guide.helper}
            </p>

            {/* Title */}
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={guide.titlePlaceholder}
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-sm font-medium"
            />

            {/* Content */}
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={guide.contentPlaceholder}
              rows={7}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-sm resize-none"
            />

            {/* Helper actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleSeed}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Inserir modelo
              </button>
              <button
                onClick={() => setShowPreview(p => !p)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                {showPreview ? 'Ocultar preview' : 'Preview'}
              </button>
            </div>

            {/* Preview */}
            {showPreview && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-4">
                <TypePill type={topicType} />
                <h4 className="mt-3 font-bold text-slate-900 dark:text-white">
                  {title || 'Seu título aparece aqui'}
                </h4>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {content || 'O conteúdo aparece aqui para revisão.'}
                </p>
              </div>
            )}

            {/* LGPD — compact */}
            <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl px-3 py-2">
              Não publique nome de paciente, CPF, prontuário ou qualquer dado sensível (LGPD).
            </p>
          </div>

          {/* Footer */}
          <div className="px-5 pb-5 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-700 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={creating || !title.trim() || !content.trim()}
              className="px-5 py-2.5 text-sm font-bold bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-teal-500/30 transition-all"
            >
              {creating ? 'Publicando...' : 'Publicar'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
});

CreateTopicModal.displayName = 'CreateTopicModal';

// =====================================================
// Topic detail view
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
  const [replyFocused, setReplyFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const replyDraftKey = useMemo(() => (userId ? getReplyDraftKey(topicId, userId) : null), [topicId, userId]);

  useEffect(() => {
    const draft = readStoredValue<{ content: string }>(replyDraftKey);
    setReplyContent(draft?.content || '');
    markTopicAsRead(topicId);
  }, [replyDraftKey, topicId]);

  useEffect(() => {
    writeStoredValue(replyDraftKey, { content: replyContent });
  }, [replyContent, replyDraftKey]);

  const canMarkBest = Boolean(
    user && topic && (user.id === topic.authorId || user.role === 'admin' || user.role === 'superadmin'),
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

  const handleAccept = useCallback(async (replyId: string) => {
    const ok = await acceptReply(replyId);
    if (ok) void refetch();
  }, [acceptReply, refetch]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse max-w-3xl mx-auto">
        <div className="h-5 w-28 rounded bg-slate-100 dark:bg-slate-700" />
        <div className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-700" />
        <div className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-700" />
      </div>
    );
  }

  if (!topic) {
    return <div className="text-center py-20 text-slate-500 text-sm">{error || 'Tópico não encontrado.'}</div>;
  }

  // Accepted answer first, then by vote score
  const sortedReplies = [...replies].sort((a, b) => {
    if (a.isAccepted !== b.isAccepted) return a.isAccepted ? -1 : 1;
    return b.votesScore - a.votesScore;
  });

  return (
    <motion.div {...fadeIn} className="space-y-4 max-w-3xl mx-auto">
      {/* Back */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
      >
        <ArrowLeft size={15} /> Voltar ao fórum
      </button>

      {/* Topic card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex">
          {/* Vote column */}
          <div className="flex flex-col items-center gap-1 px-3.5 pt-5 pb-4 bg-slate-50 dark:bg-slate-900/60 border-r border-slate-100 dark:border-slate-700 min-w-[48px]">
            <button
              onClick={() => handleVote(1, { topicId: topic.id })}
              className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
            >
              <ChevronUp size={18} />
            </button>
            <span className={`text-base font-bold tabular-nums ${
              topic.votesScore > 0 ? 'text-teal-600 dark:text-teal-400' :
              topic.votesScore < 0 ? 'text-rose-500' : 'text-slate-400'
            }`}>
              {topic.votesScore}
            </span>
            <button
              onClick={() => handleVote(-1, { topicId: topic.id })}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
            >
              <ChevronDown size={18} />
            </button>
            {topic.bestReplyId && (
              <CheckCircle2 size={16} className="text-emerald-500 mt-2" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-5">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <TypePill type={topic.topicType} />
              {topic.status !== 'open' && (
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${TOPIC_STATUS_CONFIG[topic.status].bg} ${TOPIC_STATUS_CONFIG[topic.status].color}`}>
                  {TOPIC_STATUS_CONFIG[topic.status].label}
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-snug mb-4">
              {topic.title}
            </h2>

            <div className="text-sm leading-7 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {topic.content}
            </div>

            <div className="flex items-center gap-3 mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
              <Avatar name={topic.author?.fullName} size="sm" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {topic.author?.fullName || 'Anônimo'}
              </span>
              <span className="text-xs text-slate-400 ml-auto flex items-center gap-1">
                <Eye size={11} /> {topic.viewsCount}
              </span>
              <span className="text-xs text-slate-400">{formatRelativeDate(topic.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Replies header */}
      {replies.length > 0 && (
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">
          {replies.length} {replies.length === 1 ? 'resposta' : 'respostas'}
        </p>
      )}

      {/* Replies */}
      <div className="space-y-3">
        {sortedReplies.map(reply => (
          <div
            key={reply.id}
            className={`rounded-2xl border overflow-hidden ${
              reply.isAccepted
                ? 'border-emerald-200 dark:border-emerald-700/60'
                : 'border-slate-200 dark:border-slate-700'
            } bg-white dark:bg-slate-800`}
          >
            <div className="flex">
              {/* Vote column */}
              <div
                className={`flex flex-col items-center gap-1 px-3 py-4 min-w-[40px] border-r ${
                  reply.isAccepted
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/40'
                    : 'bg-slate-50 dark:bg-slate-900/60 border-slate-100 dark:border-slate-700'
                }`}
                onClick={e => e.stopPropagation()}
              >
                {reply.isAccepted && <CheckCircle2 size={15} className="text-emerald-500 mb-1" />}
                <button
                  onClick={() => handleVote(1, { replyId: reply.id })}
                  className="p-0.5 text-slate-300 hover:text-teal-500 transition-colors"
                >
                  <ChevronUp size={13} />
                </button>
                <span className={`text-xs font-bold tabular-nums ${reply.votesScore > 0 ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`}>
                  {reply.votesScore}
                </span>
                <button
                  onClick={() => handleVote(-1, { replyId: reply.id })}
                  className="p-0.5 text-slate-300 hover:text-rose-400 transition-colors"
                >
                  <ChevronDown size={13} />
                </button>
              </div>

              {/* Reply content */}
              <div className="flex-1 p-4">
                {reply.isAccepted && (
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1">
                    <CheckCircle2 size={11} /> Melhor resposta
                  </p>
                )}
                <div className="text-sm leading-7 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {reply.content}
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <Avatar name={reply.author?.fullName} size="xs" />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {reply.author?.fullName || 'Anônimo'}
                  </span>
                  <span className="text-xs text-slate-400 ml-auto">{formatRelativeDate(reply.createdAt)}</span>
                  {canMarkBest && !reply.isAccepted && (
                    <button
                      onClick={() => handleAccept(reply.id)}
                      disabled={acceptingReply}
                      className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50 ml-2 transition-opacity"
                    >
                      {acceptingReply ? '…' : 'Marcar como melhor'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Reply composer — inline expandable */}
      {userId && (
        <div className={`bg-white dark:bg-slate-800 rounded-2xl border transition-all ${
          replyFocused
            ? 'border-teal-300 dark:border-teal-700 shadow-md shadow-teal-500/5'
            : 'border-slate-200 dark:border-slate-700'
        }`}>
          <div className="flex items-start gap-3 p-4">
            <Avatar name={user?.nome} size="md" />
            <div className="flex-1 space-y-3">
              <textarea
                ref={textareaRef}
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                onFocus={() => setReplyFocused(true)}
                onBlur={() => !replyContent && setReplyFocused(false)}
                placeholder="Escreva sua resposta. Se puder, detalhe o passo a passo."
                rows={replyFocused || replyContent ? 5 : 2}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-sm resize-none transition-all"
              />
              {(replyFocused || replyContent) && (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">
                    Não exponha dados pessoais de pacientes ou servidores.
                  </p>
                  <button
                    onClick={handleSubmitReply}
                    disabled={creating || !replyContent.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Send size={13} />
                    {creating ? 'Enviando…' : 'Responder'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
});

TopicDetailView.displayName = 'TopicDetailView';

// =====================================================
// Forum card (in the listing)
// =====================================================

const ForumCard: React.FC<{
  forum: Forum;
  scope: ScopeConfig;
  onClick: (f: Forum) => void;
}> = React.memo(({ forum, scope, onClick }) => {
  const ScopeIcon = scope.icon;
  return (
    <motion.button
      variants={fadeIn}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onClick(forum)}
      className={`group w-full text-left rounded-2xl border p-4 hover:shadow-md transition-all bg-white dark:bg-slate-800 ${scope.border}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-xl shadow-sm shrink-0 border border-slate-100 dark:border-slate-700">
          {forum.icon || '💬'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <ScopeIcon size={11} className={scope.color} />
            <span className={`text-[11px] font-semibold ${scope.color}`}>{scope.audienceLabel}</span>
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-1">
            {forum.name}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-5">
            {forum.description}
          </p>
          <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
            <span className="flex items-center gap-1"><MessageCircle size={10} /> {forum.topicsCount} tópicos</span>
            <span className="flex items-center gap-1"><Eye size={10} /> {forum.membersCount} membros</span>
          </div>
        </div>
        <ArrowRight size={14} className="text-slate-300 group-hover:text-teal-400 shrink-0 mt-1 transition-colors" />
      </div>
    </motion.button>
  );
});

ForumCard.displayName = 'ForumCard';

// =====================================================
// Forum detail view (topic list)
// =====================================================

const ForumDetailView: React.FC<{
  forum: Forum;
  scope: ScopeConfig;
  userId?: string;
  initialTopicType?: ForumTopicType | null;
  onBack: () => void;
  onSelectTopic: (topicId: string) => void;
  onComposerIntentHandled: () => void;
}> = React.memo(({ forum, scope, userId, initialTopicType, onBack, onSelectTopic, onComposerIntentHandled }) => {
  const { topics, loading, error, refetch } = useForumTopics(forum.id);
  const { experts } = useForumExperts(forum.id);
  const { vote } = useForumVote();
  const [showCreate, setShowCreate] = useState(false);
  const [composerType, setComposerType] = useState<ForumTopicType | null>(initialTopicType || null);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [feedMode, setFeedMode] = useState<TopicFeedMode>('recent');
  const readTopics = useMemo(() => getReadTopics(), []);
  const ScopeIcon = scope.icon;

  useEffect(() => {
    if (!initialTopicType) return;
    setComposerType(initialTopicType);
    setShowCreate(true);
    onComposerIntentHandled();
  }, [initialTopicType, onComposerIntentHandled]);

  const filteredTopics = useMemo(() => {
    let result = topics.filter(t =>
      !search || t.title.toLowerCase().includes(search.toLowerCase()),
    );

    result = [...result].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return Number(b.isPinned) - Number(a.isPinned);
      if (a.isFeatured !== b.isFeatured) return Number(b.isFeatured) - Number(a.isFeatured);
      if (feedMode === 'hot') return getTopicHotScore(b) - getTopicHotScore(a);
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });

    if (feedMode === 'unanswered') return result.filter(t => t.repliesCount === 0 && !isResolvedTopic(t));
    if (feedMode === 'resolved') return result.filter(isResolvedTopic);
    return result;
  }, [topics, search, feedMode]);

  const feedCounts = useMemo<Record<TopicFeedMode, number>>(() => ({
    recent: topics.length,
    hot: topics.length,
    unanswered: topics.filter(t => t.repliesCount === 0 && !isResolvedTopic(t)).length,
    resolved: topics.filter(isResolvedTopic).length,
  }), [topics]);

  const handleVote = useCallback(async (value: 1 | -1, topicId: string) => {
    if (!userId) return;
    await vote(userId, value, { topicId });
    void refetch();
  }, [userId, vote, refetch]);

  return (
    <motion.div {...fadeIn} className="space-y-4 max-w-3xl mx-auto">
      {/* Back */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
      >
        <ArrowLeft size={15} /> Voltar aos fóruns
      </button>

      {/* Forum header */}
      <div className={`rounded-2xl border p-5 ${scope.border} ${scope.bg}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/60 dark:bg-slate-800/60 flex items-center justify-center text-xl shadow-sm shrink-0">
              {forum.icon || '💬'}
            </div>
            <div>
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${scope.color}`}>
                <ScopeIcon size={11} /> {scope.title} · {scope.audienceLabel}
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{forum.name}</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5 leading-5">{forum.description}</p>
            </div>
          </div>

          {userId && (
            <button
              onClick={() => { setComposerType(null); setShowCreate(true); }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 transition-all shrink-0"
            >
              <Plus size={15} /> Novo tópico
            </button>
          )}
        </div>

        {/* Stats chips — clickable shortcuts to feed mode */}
        <div className="flex gap-2 mt-4 flex-wrap">
          <button
            onClick={() => setFeedMode('recent')}
            className="text-xs font-semibold px-3 py-1 rounded-full bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300"
          >
            {feedCounts.recent} tópicos
          </button>
          {feedCounts.unanswered > 0 && (
            <button
              onClick={() => setFeedMode('unanswered')}
              className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-100/80 dark:bg-amber-900/30 hover:bg-amber-200/80 dark:hover:bg-amber-900/50 transition-colors text-amber-700 dark:text-amber-300"
            >
              {feedCounts.unanswered} sem resposta
            </button>
          )}
          {feedCounts.resolved > 0 && (
            <button
              onClick={() => setFeedMode('resolved')}
              className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100/80 dark:bg-emerald-900/30 hover:bg-emerald-200/80 dark:hover:bg-emerald-900/50 transition-colors text-emerald-700 dark:text-emerald-300"
            >
              {feedCounts.resolved} resolvidos
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-xs text-amber-800 dark:text-amber-200">
          <CircleAlert size={14} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {/* Quick actions + search toggle */}
      {userId && (
        <div className="flex items-center gap-2 flex-wrap">
          {QUICK_ACTIONS.map(a => (
            <button
              key={a.type}
              onClick={() => { setComposerType(a.type); setShowCreate(true); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <a.icon size={12} /> {a.label}
            </button>
          ))}
          <button
            onClick={() => setShowSearch(p => !p)}
            className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              showSearch
                ? 'border-teal-300 dark:border-teal-600 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300'
                : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
            }`}
          >
            <Search size={12} /> Buscar
          </button>
        </div>
      )}

      {/* Search input — expandable */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar tópicos…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Experts strip */}
      {experts.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
            <Award size={11} className="text-amber-400" /> Especialistas neste fórum
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {experts.map(e => (
              <div
                key={e.id}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50/80 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 shrink-0"
              >
                <Avatar name={e.user?.fullName} size="sm" />
                <div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{e.user?.fullName || 'Anônimo'}</p>
                  <p className="text-[10px] text-amber-600 dark:text-amber-400">{e.helpfulRepliesCount} respostas úteis</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feed mode tabs */}
      <FeedModeTabs mode={feedMode} onChange={setFeedMode} counts={feedCounts} />

      {/* Topics */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filteredTopics.length === 0 ? (
        <div className="text-center py-14 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
          <MessagesSquare size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {feedMode === 'unanswered'
              ? 'Ótimo — todas as perguntas foram respondidas.'
              : search
              ? `Nenhum tópico com "${search}".`
              : 'Nenhum tópico ainda.'}
          </p>
          {feedMode !== 'unanswered' && !search && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {userId ? 'Seja o primeiro a iniciar uma discussão.' : 'Entre para participar.'}
            </p>
          )}
        </div>
      ) : (
        <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-2">
          {filteredTopics.map(topic => (
            <TopicListItem
              key={topic.id}
              topic={topic}
              isRead={readTopics.has(topic.id)}
              onClick={onSelectTopic}
              onVote={userId ? handleVote : undefined}
            />
          ))}
        </motion.div>
      )}

      <CreateTopicModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        forumId={forum.id}
        forumName={forum.name}
        userId={userId || ''}
        initialTopicType={composerType}
        onCreated={refetch}
      />
    </motion.div>
  );
});

ForumDetailView.displayName = 'ForumDetailView';

// =====================================================
// Main Forums Page
// =====================================================

interface ForumsPageProps {
  userId?: string;
}

export const ForumsPage: React.FC<ForumsPageProps> = React.memo(({ userId }) => {
  const { forums, loading, error, isFallback } = useForums();
  const { user, currentMicrorregiao } = useAuth();
  const [selectedScope, setSelectedScope] = useState<DiscussionScope>('global');
  const [selectedForum, setSelectedForum] = useState<Forum | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [composerIntent, setComposerIntent] = useState<ForumTopicType | null>(null);

  const microName =
    currentMicrorregiao?.nome ||
    (user?.microregiaoId ? getMicroregiaoById(user.microregiaoId)?.nome : null) ||
    'Sua microrregião';
  const municipalityName = user?.municipio || 'Seu município';

  const scopes = useMemo(() => buildScopeConfigs(microName, municipalityName), [microName, municipalityName]);
  const activeScope = useMemo(() => scopes.find(s => s.id === selectedScope) || scopes[0], [scopes, selectedScope]);

  const forumsByScope = useMemo(() => ({
    global: forums.filter(f => inferForumScope(f) === 'global'),
    micro: forums.filter(f => inferForumScope(f) === 'micro'),
    municipality: forums.filter(f => inferForumScope(f) === 'municipality'),
  }), [forums]);

  const forumCounts = useMemo<Record<DiscussionScope, number>>(() => ({
    global: forumsByScope.global.length,
    micro: forumsByScope.micro.length,
    municipality: forumsByScope.municipality.length,
  }), [forumsByScope]);

  const scopedForums = forumsByScope[selectedScope];

  const selectedForumScope = useMemo(
    () => (selectedForum ? inferForumScope(selectedForum) : selectedScope),
    [selectedForum, selectedScope],
  );
  const selectedScopeConfig = useMemo(
    () => scopes.find(s => s.id === selectedForumScope) || activeScope,
    [scopes, selectedForumScope, activeScope],
  );

  const openForum = useCallback((forum: Forum) => {
    setComposerIntent(null);
    setSelectedForum(forum);
  }, []);

  // — Topic detail —
  if (selectedTopicId && selectedForum) {
    return (
      <div className="p-4 sm:p-6">
        <TopicDetailView
          topicId={selectedTopicId}
          userId={userId}
          onBack={() => setSelectedTopicId(null)}
        />
      </div>
    );
  }

  // — Forum detail —
  if (selectedForum) {
    return (
      <div className="p-4 sm:p-6">
        <ForumDetailView
          forum={selectedForum}
          scope={selectedScopeConfig}
          userId={userId}
          initialTopicType={composerIntent}
          onBack={() => { setSelectedForum(null); setComposerIntent(null); }}
          onSelectTopic={id => { markTopicAsRead(id); setSelectedTopicId(id); }}
          onComposerIntentHandled={() => setComposerIntent(null)}
        />
      </div>
    );
  }

  // — Forums listing —
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <motion.div {...fadeIn} className="space-y-5">
        {/* Page header */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Fóruns</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Acompanhe debates por território e área de interesse.
            </p>
          </div>
          <div className="text-xs text-slate-400 shrink-0 hidden sm:block">
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {forums.reduce((a, f) => a + f.topicsCount, 0)}
            </span>{' '}
            tópicos ·{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {forums.reduce((a, f) => a + f.membersCount, 0)}
            </span>{' '}
            membros
          </div>
        </div>

        {/* Alerts */}
        {isFallback && (
          <div className="flex items-center gap-2 rounded-xl border border-sky-200 dark:border-sky-800/50 bg-sky-50 dark:bg-sky-950/20 px-4 py-3 text-xs text-sky-700 dark:text-sky-300">
            <ShieldCheck size={14} className="shrink-0" />
            Fóruns em modo local — dados salvos no navegador até o Hub definitivo ser provisionado.
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
            <CircleAlert size={14} className="shrink-0" /> {error}
          </div>
        )}

        {/* Two-column layout on desktop */}
        <div className="flex gap-7">
          {/* Scope sidebar — desktop only */}
          <aside className="hidden lg:block w-52 shrink-0 space-y-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
                Escopo
              </p>
              <ScopeSidebar
                scopes={scopes}
                selected={selectedScope}
                onSelect={setSelectedScope}
                forumCounts={forumCounts}
              />
            </div>

            {/* Global stats */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Atividade
              </p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Fóruns ativos</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{forums.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Tópicos</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {forums.reduce((a, f) => a + f.topicsCount, 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Membros</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {forums.reduce((a, f) => a + f.membersCount, 0)}
                  </span>
                </div>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Mobile scope selector */}
            <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {scopes.map(scope => {
                const Icon = scope.icon;
                const active = scope.id === selectedScope;
                return (
                  <button
                    key={scope.id}
                    onClick={() => setSelectedScope(scope.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold shrink-0 border transition-colors ${
                      active
                        ? `${scope.bg} ${scope.border} ${scope.color}`
                        : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <Icon size={13} />
                    {scope.title}
                    <span className={`text-[10px] font-bold ${active ? '' : 'text-slate-400'}`}>
                      {forumCounts[scope.id]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Scope label */}
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${activeScope.dot}`} />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">{activeScope.title}</h2>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">{activeScope.audienceLabel}</span>
            </div>

            {/* Forums */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                ))}
              </div>
            ) : scopedForums.length === 0 ? (
              <div className={`rounded-2xl border p-6 ${activeScope.border} ${activeScope.bg}`}>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Nenhum fórum neste escopo ainda.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-5">
                  {activeScope.emptyPrompt}
                </p>
              </div>
            ) : (
              <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-3">
                {scopedForums.map(forum => (
                  <ForumCard key={forum.id} forum={forum} scope={activeScope} onClick={openForum} />
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
});

ForumsPage.displayName = 'ForumsPage';
