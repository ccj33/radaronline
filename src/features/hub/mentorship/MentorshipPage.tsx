import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Search,
  Sparkles,
  Star,
} from 'lucide-react';
import {
  useMentorProfile,
  useMentorshipBadges,
  useMentorshipMatches,
  useMentors,
} from '../../../hooks/useMentorship';
import type { Mentor, MentorshipMatch, MentorshipSpecialty } from '../../../types/mentorship.types';
import {
  BADGE_CONFIG,
  JOURNEY_PHASE_CONFIG,
  SPECIALTY_CONFIG,
} from '../../../types/mentorship.types';

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };
const stagger = { animate: { transition: { staggerChildren: 0.06 } } };
const surfaceClassName =
  'rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900';

const SpecialtyBadge: React.FC<{ specialty: MentorshipSpecialty; size?: 'sm' | 'md' }> = ({
  specialty,
  size = 'sm',
}) => {
  const config = SPECIALTY_CONFIG[specialty];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${config.bg} ${config.color} ${
        size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
      }`}
    >
      {config.icon} {config.label}
    </span>
  );
};

const RatingStars: React.FC<{ rating: number; count?: number }> = ({ rating, count }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((item) => (
      <Star
        key={item}
        size={12}
        className={
          item <= Math.round(rating)
            ? 'fill-amber-400 text-amber-400'
            : 'text-slate-300 dark:text-slate-600'
        }
      />
    ))}
    <span className="ml-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
      {rating.toFixed(1)}
    </span>
    {count !== undefined ? (
      <span className="text-[11px] text-slate-400 dark:text-slate-500">({count})</span>
    ) : null}
  </div>
);

const SummaryChip: React.FC<{ label: string }> = ({ label }) => (
  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
    {label}
  </span>
);

const SectionHeader: React.FC<{ eyebrow: string; title: string; description?: string }> = ({
  eyebrow,
  title,
  description,
}) => (
  <div>
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
      {eyebrow}
    </p>
    <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
    {description ? (
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
    ) : null}
  </div>
);

const EmptyState: React.FC<{
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, description, actionLabel, onAction }) => (
  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-8 text-center dark:border-slate-700 dark:bg-slate-800/60">
    <p className="font-semibold text-slate-700 dark:text-slate-200">{title}</p>
    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
    {actionLabel && onAction ? (
      <button
        type="button"
        onClick={onAction}
        className="mt-4 inline-flex items-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        {actionLabel}
      </button>
    ) : null}
  </div>
);

const MentorCard: React.FC<{ mentor: Mentor; onSelect: (mentor: Mentor) => void }> = React.memo(
  ({ mentor, onSelect }) => {
    const hasCapacity = mentor.currentMentees < mentor.maxMentees;

    return (
      <motion.button
        variants={fadeIn}
        type="button"
        onClick={() => onSelect(mentor)}
        className="group flex w-full items-start gap-4 border-b border-slate-100 last:border-0 px-4 py-4 text-left transition-colors hover:bg-slate-50 dark:border-slate-800/50 dark:hover:bg-slate-800/30"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {(mentor.profile?.fullName || 'M')[0].toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">
              {mentor.profile?.fullName || 'Mentor da rede'}
            </h3>
            {mentor.isVerified ? <CheckCircle2 size={14} className="text-teal-500" /> : null}
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400">
             {mentor.profile?.jobTitle || 'Especialista'}
          </p>

          <div className="mt-2 flex flex-wrap gap-2">
            {mentor.specialties.slice(0, 3).map((specialty) => (
              <SpecialtyBadge key={specialty} specialty={specialty} />
            ))}
          </div>

          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
            <RatingStars rating={mentor.avgRating} count={mentor.ratingCount} />
            <span className="flex items-center gap-1">
              <BookOpen size={12} />
              {mentor.yearsExperience}a xp
            </span>
             {hasCapacity ? (
               <span className="text-emerald-600 font-medium">Disponivel</span>
             ) : (
               <span className="text-slate-400">Agenda cheia</span>
             )}
          </div>
        </div>

        <ChevronRight
          size={16}
          className="mt-1 shrink-0 text-slate-300 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-teal-500"
        />
      </motion.button>
    );
  },
);

const MentorProfileView: React.FC<{
  mentor: Mentor;
  onBack: () => void;
}> = React.memo(({ mentor, onBack }) => {
  const hasCapacity = mentor.currentMentees < mentor.maxMentees;

  return (
    <motion.div {...fadeIn} className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft size={16} />
        Voltar
      </button>

      <section className={`${surfaceClassName} p-6`}>
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-slate-100 text-3xl font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {(mentor.profile?.fullName || 'M')[0].toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {mentor.profile?.fullName || 'Mentor da rede'}
              </h2>
              {mentor.isVerified ? <CheckCircle2 size={18} className="text-teal-500" /> : null}
            </div>

            {mentor.profile?.jobTitle ? (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {mentor.profile.jobTitle}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              {mentor.municipality ? <SummaryChip label={mentor.municipality} /> : null}
              <SummaryChip label={`${mentor.yearsExperience} anos de experiencia`} />
              <SummaryChip label={`${mentor.totalSessions} sessoes`} />
              <SummaryChip label={`${mentor.totalHours}h acumuladas`} />
              <SummaryChip label={`${mentor.currentMentees}/${mentor.maxMentees} mentorados`} />
            </div>

            {mentor.bio ? (
              <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {mentor.bio}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {mentor.specialties.map((specialty) => (
            <SpecialtyBadge key={specialty} specialty={specialty} size="md" />
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Avaliacao media
          </span>
          <div className="rounded-full bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
            <RatingStars rating={mentor.avgRating} count={mentor.ratingCount} />
          </div>
          <span
            className={`rounded-full px-3 py-1.5 ${
              hasCapacity
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
            }`}
          >
            {hasCapacity ? 'Pronto para novas mentorias' : 'Sem novas vagas no momento'}
          </span>
        </div>
      </section>

      {hasCapacity ? (
        <button
          type="button"
          className="inline-flex items-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Solicitar mentoria
        </button>
      ) : null}
    </motion.div>
  );
});

const MatchCard: React.FC<{ match: MentorshipMatch }> = ({ match }) => {
  const phase = JOURNEY_PHASE_CONFIG[match.currentPhase];

  return (
    <div className="rounded-2xl border border-slate-200 px-4 py-4 dark:border-slate-700">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${phase.bg} ${phase.color}`}>
              {phase.icon} {phase.label}
            </span>
            {match.matchScore ? <SummaryChip label={`Score ${match.matchScore}`} /> : null}
          </div>
          <p className="mt-3 font-semibold text-slate-900 dark:text-white">Mentoria ativa</p>
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {match.goals || 'Jornada em andamento com foco em aplicacao pratica.'}
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {match.phaseProgress}% da fase
        </span>
      </div>

      {match.matchedSpecialties.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {match.matchedSpecialties.map((specialty) => (
            <SpecialtyBadge key={specialty} specialty={specialty} />
          ))}
        </div>
      ) : null}

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-slate-900 transition-all dark:bg-white"
          style={{ width: `${match.phaseProgress}%` }}
        />
      </div>
    </div>
  );
};

interface MentorshipPageProps {
  userId?: string;
}

export const MentorshipPage: React.FC<MentorshipPageProps> = React.memo(({ userId }) => {
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState<MentorshipSpecialty | 'all'>('all');

  const { mentors, loading, error } = useMentors();
  const { matches } = useMentorshipMatches(userId);
  const { badges } = useMentorshipBadges(userId);
  const { mentor: myMentorProfile } = useMentorProfile(userId);

  const filteredMentors = useMemo(() => {
    return mentors.filter((mentor) => {
      const matchesSearch =
        !searchTerm ||
        (mentor.profile?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSpecialty =
        specialtyFilter === 'all' || mentor.specialties.includes(specialtyFilter);

      return matchesSearch && matchesSpecialty;
    });
  }, [mentors, searchTerm, specialtyFilter]);

  const activeMatches = useMemo(
    () => matches.filter((match) => match.status === 'active'),
    [matches],
  );
  const visibleBadges = badges.slice(0, 6);

  if (selectedMentor) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <MentorProfileView mentor={selectedMentor} onBack={() => setSelectedMentor(null)} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6">
      <motion.section {...fadeIn} className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Mentorias
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Apoio pratico sem interface demais.
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              A pagina agora prioriza continuidade, descoberta de mentores e o seu espaco de
              acompanhamento.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <SummaryChip label={`${activeMatches.length} ativas`} />
            <SummaryChip label={`${mentors.length} mentores`} />
            <SummaryChip label={`${visibleBadges.length} badges`} />
            {myMentorProfile ? <SummaryChip label="Voce tambem e mentor" /> : null}
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100">
            A listagem ainda depende do backend atual de mentorias e pode voltar incompleta ate a
            trilha definitiva do Hub.
          </div>
        ) : null}
      </motion.section>

      <motion.section {...fadeIn} className={`${surfaceClassName} p-5 sm:p-6`}>
        <SectionHeader
          eyebrow="Continuar"
          title="Mentorias em andamento"
          description="Primeiro vem o que ja esta em curso. So depois entra a exploracao."
        />

        <div className="mt-4 space-y-3">
          {activeMatches.length === 0 ? (
            <EmptyState
              title="Nenhuma mentoria ativa"
              description="Quando houver uma jornada em andamento, ela precisa aparecer aqui com progresso e proximo contexto, sem esconder a acao principal."
            />
          ) : (
            activeMatches.map((match) => <MatchCard key={match.id} match={match} />)
          )}
        </div>

        {visibleBadges.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              <Sparkles size={14} />
              Reconhecimentos
            </span>
            {visibleBadges.map((badge) => (
              <span
                key={badge.id}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
              >
                {badge.badgeIcon || BADGE_CONFIG[badge.badgeType]?.icon || '*'} {badge.badgeName}
              </span>
            ))}
          </div>
        ) : null}
      </motion.section>

      <motion.section {...fadeIn} className={`${surfaceClassName} overflow-hidden`}>
        <div className="border-b border-slate-200/80 px-5 py-5 dark:border-slate-700/80 sm:px-6">
          <SectionHeader
            eyebrow="Encontrar mentor"
            title="Busca direta"
            description="Menos chrome, mais leitura rapida: busca, filtro e lista."
          />

          <div className="mt-4 flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar mentor"
                className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSpecialtyFilter('all')}
                className={`rounded-full border px-3 py-2 text-sm font-semibold transition-colors ${
                  specialtyFilter === 'all'
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                Todas
              </button>
              {(Object.keys(SPECIALTY_CONFIG) as MentorshipSpecialty[]).map((specialty) => (
                <button
                  key={specialty}
                  type="button"
                  onClick={() => setSpecialtyFilter(specialty)}
                  className={`rounded-full border px-3 py-2 text-sm font-semibold transition-colors ${
                    specialtyFilter === specialty
                      ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {SPECIALTY_CONFIG[specialty].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800"
                />
              ))}
            </div>
          ) : filteredMentors.length === 0 ? (
            <EmptyState
              title="Nenhum mentor encontrado"
              description="Se a busca ficar vazia, a tela deve ser curta e objetiva, sem ocupar mais espaco do que o problema merece."
              actionLabel="Limpar filtros"
              onAction={() => {
                setSearchTerm('');
                setSpecialtyFilter('all');
              }}
            />
          ) : (
            <motion.div
              variants={stagger}
              initial="initial"
              animate="animate"
              className="space-y-3"
            >
              {filteredMentors.map((mentor) => (
                <MentorCard key={mentor.id} mentor={mentor} onSelect={setSelectedMentor} />
              ))}
            </motion.div>
          )}
        </div>
      </motion.section>

      <motion.section {...fadeIn} className={`${surfaceClassName} p-5 sm:p-6`}>
        <SectionHeader
          eyebrow="Como mentor"
          title="Seu espaco na rede"
          description="Sem dashboard separado. So o contexto essencial para atuar como mentor."
        />

        {myMentorProfile ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-slate-200 px-4 py-4 dark:border-slate-700">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {myMentorProfile.profile?.fullName || 'Seu perfil de mentor'}
                  </p>
                  {myMentorProfile.profile?.jobTitle ? (
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {myMentorProfile.profile.jobTitle}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <SummaryChip label={`${myMentorProfile.currentMentees} mentorados`} />
                  <SummaryChip label={`${myMentorProfile.totalSessions} sessoes`} />
                  <SummaryChip label={`${myMentorProfile.totalHours}h`} />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {myMentorProfile.specialties.map((specialty) => (
                  <SpecialtyBadge key={specialty} specialty={specialty} />
                ))}
              </div>

              <div className="mt-4 rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                Avaliacao media: {myMentorProfile.avgRating.toFixed(1)}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState
              title="Voce ainda nao esta como mentor"
              description="O melhor caminho aqui e convite claro e pequeno. Nao precisa de um dashboard vazio antes de a jornada existir."
              actionLabel="Quero orientar a rede"
              onAction={() => undefined}
            />
          </div>
        )}
      </motion.section>
    </div>
  );
});
