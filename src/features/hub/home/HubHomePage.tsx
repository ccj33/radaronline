import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpenCheck,
  FolderOpen,
  GraduationCap,
  LayoutGrid,
  MessagesSquare,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useForums } from '../../../hooks/useForums';
import { useEducacao } from '../../../hooks/useEducacao';
import { useRepository } from '../../../hooks/useRepository';
import { useMentors, useMentorshipMatches } from '../../../hooks/useMentorship';
import type { Forum } from '../../../types/forum.types';
import type { Mentor } from '../../../types/mentorship.types';
import type { Course } from '../../../types/education.types';
import type { Material } from '../../../types/repository.types';

type CommunityDestination = 'forums' | 'mentorship' | 'education' | 'repository';

interface HubHomePageProps {
  userId?: string;
  currentMicroLabel?: string;
  onNavigate: (nav: CommunityDestination) => void;
}

function formatDateLabel(dateString: string): string {
  const value = new Date(dateString);

  if (Number.isNaN(value.getTime())) {
    return 'Atualizado recentemente';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(value);
}

const fadeInUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: 'easeOut' as const },
};

const surfaceClassName = 'rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900';

interface ModuleRowProps {
  title: string;
  description: string;
  meta: string;
  icon: React.ReactNode;
  onClick: () => void;
}

const ModuleRow: React.FC<ModuleRowProps> = ({ description, icon, meta, onClick, title }) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex w-full items-center justify-between gap-4 px-5 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
  >
    <div className="flex items-center gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400 group-hover:bg-white group-hover:shadow-sm transition-all">
        {icon}
      </div>
      <div>
        <p className="font-bold text-slate-900 dark:text-white text-base">{title}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
    <div className="flex shrink-0 items-center gap-3">
      <span className="text-xs font-semibold text-slate-400 group-hover:text-teal-600 transition-colors">
        {meta}
      </span>
      <ArrowRight size={16} className="text-slate-300 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-teal-500" />
    </div>
  </button>
);

interface SummaryRowProps {
  title: string;
  description: string;
  helper?: string;
  onClick?: () => void;
}

const SummaryRow: React.FC<SummaryRowProps> = ({ description, helper, onClick, title }) => {
  const content = (
    <div className="w-full px-2 py-2 text-left">
      <p className="font-semibold text-slate-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400 transition-colors">{title}</p>
      <p className="mt-0.5 text-sm leading-6 text-slate-500 dark:text-slate-400 line-clamp-2">{description}</p>
      {helper ? (
        <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">{helper}</p>
      ) : null}
    </div>
  );

  if (!onClick) {
    return <div className="border-b border-slate-100 last:border-0 dark:border-slate-800/50">{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full border-b border-slate-100 last:border-0 hover:bg-slate-50/50 dark:border-slate-800/50 dark:hover:bg-slate-800/30 transition-colors rounded-lg"
    >
      {content}
    </button>
  );
};

function buildForumMeta(forum: Forum): string {
  return `${forum.topicsCount} topicos  ${forum.membersCount} pessoas`;
}

function buildMentorMeta(mentor: Mentor): string {
  if (mentor.profile?.jobTitle) {
    return mentor.profile.jobTitle;
  }

  if (mentor.organization) {
    return mentor.organization;
  }

  return 'Especialista da rede';
}

function buildCourseMeta(course: Course): string {
  return `${course.duration}  ${course.progress > 0 ? `${course.progress}%` : 'Novo'}`;
}

function buildMaterialMeta(material: Material): string {
  return `${material.category}  ${formatDateLabel(material.createdAt)}`;
}

export const HubHomePage: React.FC<HubHomePageProps> = React.memo(({
  userId,
  currentMicroLabel,
  onNavigate,
}) => {
  const { forums, loading: forumsLoading, error: forumsError, isFallback: forumsFallback } = useForums();
  const {
    mentors,
    loading: mentorsLoading,
    error: mentorsError,
    isFallback: mentorsFallback,
  } = useMentors({ verifiedOnly: true });
  const { matches, loading: rawMentorshipLoading, isFallback: matchesFallback } = useMentorshipMatches(userId);
  const {
    courses,
    trails,
    enrolledCourses,
    loading: educationLoading,
    error: educationError,
    isFallback: educationFallback,
  } = useEducacao();
  const {
    materials,
    loading: repositoryLoading,
    error: repositoryError,
    isFallback: repositoryFallback,
  } = useRepository();

  const mentorshipLoading = userId ? rawMentorshipLoading : false;
  const communityMentorshipLoading = mentorshipLoading || mentorsLoading;
  const activeMatches = matches.filter(match => match.status === 'active').length;
  const pendingMatches = matches.filter(match => match.status === 'pending').length;
  const featuredForums = forums.slice(0, 3);
  const featuredMentors = mentors.slice(0, 3);
  const continueCourses = enrolledCourses.filter(course => course.progress > 0 && course.progress < 100).slice(0, 2);
  const suggestedCourses = continueCourses.length > 0 ? continueCourses : courses.slice(0, 2);
  const featuredMaterials = materials.slice(0, 2);
  const highlightedTrail = trails[0];

  const availabilityNotes = useMemo(() => {
    const notes: string[] = [];

    if (forumsFallback || mentorsFallback || matchesFallback || educationFallback || repositoryFallback) {
      notes.push('Hub rodando em modo local: os dados desta area estao salvos no navegador ate o banco definitivo ser provisionado.');
    }
    if (forumsError) {
      notes.push('Foruns ainda dependem do backend definitivo do Hub.');
    }
    if (mentorsError) {
      notes.push('Mentorias ainda precisam de saneamento de perfis.');
    }
    if (educationError) {
      notes.push('Educacao ainda precisa de consolidacao de dados.');
    }
    if (repositoryError) {
      notes.push('Biblioteca ainda precisa de curadoria e governanca.');
    }

    return notes;
  }, [
    educationError,
    educationFallback,
    forumsError,
    forumsFallback,
    matchesFallback,
    mentorsError,
    mentorsFallback,
    repositoryError,
    repositoryFallback,
  ]);

  const moduleRows = [
    {
      id: 'forums' as const,
      title: 'Foruns',
      description: 'Entrar na conversa certa, no escopo certo.',
      meta: forumsLoading ? 'Carregando' : `${forums.length} espacos`,
      icon: <MessagesSquare size={18} />,
    },
    {
      id: 'mentorship' as const,
      title: 'Mentorias',
      description: 'Encontrar ajuda pratica e retomar jornadas ativas.',
      meta: communityMentorshipLoading ? 'Carregando' : `${activeMatches} ativas`,
      icon: <Users size={18} />,
    },
    {
      id: 'education' as const,
      title: 'Educacao',
      description: 'Continuar trilhas e cursos sem voltar ao zero.',
      meta: educationLoading ? 'Carregando' : `${continueCourses.length || suggestedCourses.length} em foco`,
      icon: <GraduationCap size={18} />,
    },
    {
      id: 'repository' as const,
      title: 'Biblioteca',
      description: 'Achar materiais e referencias sem passar por excesso de filtros.',
      meta: repositoryLoading ? 'Carregando' : `${materials.length} itens`,
      icon: <FolderOpen size={18} />,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <motion.section {...fadeInUp} className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              <LayoutGrid className="text-teal-600 dark:text-teal-400" size={28} />
              Hub da Rede
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Acompanhe debates, mentorias e novidades da rede em tempo real.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigate('forums')}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Abrir foruns
            </button>
            <button
              type="button"
              onClick={() => onNavigate('mentorship')}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Ver mentorias
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {currentMicroLabel ? `Micro ativa: ${currentMicroLabel}` : 'Contexto global'}
          </span>
          {pendingMatches > 0 ? (
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
              {pendingMatches} pedidos de mentoria aguardando
            </span>
          ) : null}
        </div>

        {availabilityNotes.length > 0 ? (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100">
            <ShieldCheck size={17} className="mt-0.5 shrink-0" />
            <div className="space-y-1">
              {availabilityNotes.map(note => (
                <p key={note} className="leading-6">{note}</p>
              ))}
            </div>
          </div>
        ) : null}
      </motion.section>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <motion.section {...fadeInUp} className={`${surfaceClassName} overflow-hidden`}>
          <div className="border-b border-slate-200/80 px-5 py-4 dark:border-slate-700/80 sm:px-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500" />
              Recursos
            </h2>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {moduleRows.map(item => (
              <ModuleRow
                key={item.id}
                title={item.title}
                description={item.description}
                meta={item.meta}
                icon={item.icon}
                onClick={() => onNavigate(item.id)}
              />
            ))}
          </div>
        </motion.section>

        <motion.section {...fadeInUp} className={`${surfaceClassName} p-5 sm:p-6`}>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Para continuar
          </h2>

          <div className="mt-4 space-y-3">
            <SummaryRow
              title={activeMatches > 0 ? `${activeMatches} mentorias em andamento` : 'Mentorias'}
              description={activeMatches > 0 ? 'Retome a proxima conversa ou registre um novo passo.' : 'Use mentorias como jornada, nao como diretorio.'}
              helper={pendingMatches > 0 ? `${pendingMatches} pendentes` : undefined}
              onClick={() => onNavigate('mentorship')}
            />

            {suggestedCourses[0] ? (
              <SummaryRow
                title={suggestedCourses[0].title}
                description="Continue aprendendo sem voltar ao catalogo inteiro."
                helper={buildCourseMeta(suggestedCourses[0])}
                onClick={() => onNavigate('education')}
              />
            ) : null}

            {highlightedTrail ? (
              <SummaryRow
                title={highlightedTrail.title}
                description="Trilha em destaque para consolidar aprendizado."
                helper={`${highlightedTrail.coursesCount} cursos  ${highlightedTrail.totalHours}h`}
                onClick={() => onNavigate('education')}
              />
            ) : null}

            {featuredMaterials[0] ? (
              <SummaryRow
                title={featuredMaterials[0].title}
                description="Referencia recente para apoiar a operacao."
                helper={buildMaterialMeta(featuredMaterials[0])}
                onClick={() => onNavigate('repository')}
              />
            ) : null}
          </div>
        </motion.section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <motion.section {...fadeInUp} className={`${surfaceClassName} p-5 sm:p-6`}>
          <div className="flex items-center gap-2 mb-4">
            <MessagesSquare size={18} className="text-slate-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Conversas</h2>
          </div>

           <div className="space-y-1">
            {featuredForums.length === 0 ? (
              <SummaryRow
                title="Nenhum forum em destaque ainda"
                description="Quando o backend definitivo estiver provisionado, as conversas principais devem aparecer aqui em formato de lista."
              />
            ) : (
              featuredForums.map(forum => (
                <SummaryRow
                  key={forum.id}
                  title={forum.name}
                  description={forum.description}
                  helper={buildForumMeta(forum)}
                  onClick={() => onNavigate('forums')}
                />
              ))
            )}
          </div>
        </motion.section>

        <motion.section {...fadeInUp} className={`${surfaceClassName} p-5 sm:p-6`}>
          <div className="flex items-center gap-2 mb-4">
            <BookOpenCheck size={18} className="text-slate-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Referencias</h2>
          </div>

          <div className="space-y-1">
            {featuredMentors[0] ? (
              featuredMentors.map(mentor => (
                <SummaryRow
                  key={mentor.id}
                  title={mentor.profile?.fullName || 'Especialista da rede'}
                  description="Mentor em destaque para apoio pratico."
                  helper={buildMentorMeta(mentor)}
                  onClick={() => onNavigate('mentorship')}
                />
              ))
            ) : featuredMaterials.length > 0 ? (
              featuredMaterials.map(material => (
                 <SummaryRow
                  key={material.id}
                  title={material.title}
                  description="Referencia recente para consulta rapida."
                  helper={buildMaterialMeta(material)}
                  onClick={() => onNavigate('repository')}
                />
              ))
            ) : (
              <SummaryRow
                title="Sem destaques ainda"
                description="Esta area deve mostrar mentores, materiais e referencias com pouca moldura e leitura rapida."
              />
            )}
          </div>
        </motion.section>
      </div>
    </div>
  );
});

HubHomePage.displayName = 'HubHomePage';
