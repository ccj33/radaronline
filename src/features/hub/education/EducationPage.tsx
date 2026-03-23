import React, { useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Clock,
  GraduationCap,
  Layers,
  Search,
  Users,
} from 'lucide-react';
import { useEducacao } from '../../../hooks/useEducacao';
import type {
  Course,
  CourseCategory,
  CourseLevel,
  Trail,
} from '../../../types/education.types';
import { CATEGORIES, LEVEL_CONFIG } from '../../../types/education.types';

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };
const stagger = { animate: { transition: { staggerChildren: 0.06 } } };
const surfaceClassName =
  'rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900';

const LevelBadge: React.FC<{ level: CourseLevel }> = ({ level }) => {
  const config = LEVEL_CONFIG[level];

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${config.bg} ${config.color}`}>
      {config.label}
    </span>
  );
};

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

const ProgressBar: React.FC<{ value: number }> = ({ value }) => (
  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
    <div
      className={`h-full rounded-full transition-all ${value >= 100 ? 'bg-emerald-500' : 'bg-slate-900 dark:bg-white'}`}
      style={{ width: `${Math.min(value, 100)}%` }}
    />
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

const CourseRow: React.FC<{ course: Course; onEnroll: (courseId: string) => void }> = React.memo(
  ({ course, onEnroll }) => (
    <motion.div
      variants={fadeIn}
      className="border-b border-slate-100 last:border-0 px-4 py-4 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <GraduationCap size={20} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-bold text-slate-900 dark:text-white text-base hover:text-teal-600 transition-colors cursor-pointer">{course.title}</h3>
            <LevelBadge level={course.level} />
          </div>

          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
            {course.description}
          </p>

          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {course.duration}
            </span>
            <span className="flex items-center gap-1">
              <Users size={12} />
              {course.enrolled}
            </span>
            <span>{course.format}</span>
          </div>

          {course.progress > 0 ? (
            <div className="mt-3 space-y-2 max-w-xs">
              <ProgressBar value={course.progress} />
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {course.progress}% concluido
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onEnroll(course.id)}
              className="mt-3 text-sm font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
            >
              Iniciar curso &rarr;
            </button>
          )}
        </div>
      </div>
    </motion.div>
  ),
);

const TrailRow: React.FC<{ trail: Trail }> = React.memo(({ trail }) => (
  <motion.div
    variants={fadeIn}
    className="border-b border-slate-100 last:border-0 px-4 py-4 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
  >
    <div className="flex items-start gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
        <Layers size={20} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
           <h3 className="font-bold text-slate-900 dark:text-white text-base">{trail.title}</h3>
           <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full dark:bg-amber-900/20 dark:text-amber-400">Trilha</span>
        </div>
        <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
          {trail.description}
        </p>

        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400 dark:text-slate-500">
          <span className="flex items-center gap-1">
            <BookOpen size={12} />
            {trail.coursesCount} cursos
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {trail.totalHours}h
          </span>
        </div>
      </div>
    </div>
  </motion.div>
));

interface EducationPageProps {
  userId?: string;
}

export const EducationPage: React.FC<EducationPageProps> = React.memo(({ userId: _userId }) => {
  const [categoryFilter, setCategoryFilter] = useState<CourseCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { courses, trails, enrolledCourses, loading, error, stats, enrollInCourse } = useEducacao();

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesSearch =
        !searchTerm || course.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || course.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [courses, searchTerm, categoryFilter]);

  const continueCourses = useMemo(
    () => enrolledCourses.filter((course) => course.progress > 0 && course.progress < 100),
    [enrolledCourses],
  );
  const completedCourses = useMemo(
    () => enrolledCourses.filter((course) => course.progress >= 100).slice(0, 2),
    [enrolledCourses],
  );
  const highlightedTrails = useMemo(() => {
    const inProgressTrails = trails.filter((trail) => trail.progress > 0);
    return (inProgressTrails.length > 0 ? inProgressTrails : trails).slice(0, 2);
  }, [trails]);

  const handleEnroll = useCallback(
    async (courseId: string) => {
      await enrollInCourse(courseId);
    },
    [enrollInCourse],
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900 dark:border-slate-700 dark:border-t-white" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6">
      <motion.section {...fadeIn} className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Educacao
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Continuar aprendendo sem voltar para um dashboard.
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              A tela agora abre com continuidade, depois catalogo e trilhas. Menos blocos de
              contagem, mais decisao util.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <SummaryChip label={`${stats.inProgress} em andamento`} />
            <SummaryChip label={`${stats.completed} concluidos`} />
            <SummaryChip label={`${stats.totalTrails} trilhas`} />
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100">
            O modulo de educacao ainda depende da consolidacao do backend atual e pode ter lacunas
            de dados ate o Hub definitivo.
          </div>
        ) : null}
      </motion.section>

      <motion.section {...fadeIn} className={`${surfaceClassName} p-5 sm:p-6`}>
        <SectionHeader
          eyebrow="Continuar"
          title="O que merece retorno"
          description="A primeira dobra precisa mostrar progresso e proximos passos, nao um painel de numeros."
        />

        <div className="mt-4 space-y-3">
          {continueCourses.length > 0 ? (
            continueCourses.map((course) => (
              <CourseRow key={course.id} course={course} onEnroll={handleEnroll} />
            ))
          ) : completedCourses.length > 0 ? (
            completedCourses.map((course) => (
              <CourseRow key={course.id} course={course} onEnroll={handleEnroll} />
            ))
          ) : highlightedTrails.length > 0 ? (
            highlightedTrails.map((trail) => <TrailRow key={trail.id} trail={trail} />)
          ) : (
            <EmptyState
              title="Nada em andamento ainda"
              description="Quando a pessoa ainda nao comecou, o espaco deve sugerir um proximo passo curto e claro."
            />
          )}
        </div>
      </motion.section>

      <motion.section {...fadeIn} className={`${surfaceClassName} overflow-hidden`}>
        <div className="border-b border-slate-200/80 px-5 py-5 dark:border-slate-700/80 sm:px-6">
          <SectionHeader
            eyebrow="Cursos"
            title="Catalogo direto"
            description="Busca curta, filtros leves e lista limpa. O conteudo vem antes da moldura."
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
                placeholder="Buscar curso"
                className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`rounded-full border px-3 py-2 text-sm font-semibold transition-colors ${
                  categoryFilter === 'all'
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                Todos
              </button>
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setCategoryFilter(category)}
                  className={`rounded-full border px-3 py-2 text-sm font-semibold transition-colors ${
                    categoryFilter === category
                      ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {filteredCourses.length === 0 ? (
            <EmptyState
              title="Nenhum curso encontrado"
              description="Se o filtro zerar a lista, o estado vazio precisa ser pequeno e util."
              actionLabel="Limpar filtros"
              onAction={() => {
                setSearchTerm('');
                setCategoryFilter('all');
              }}
            />
          ) : (
            <motion.div
              variants={stagger}
              initial="initial"
              animate="animate"
              className="space-y-3"
            >
              {filteredCourses.map((course) => (
                <CourseRow key={course.id} course={course} onEnroll={handleEnroll} />
              ))}
            </motion.div>
          )}
        </div>
      </motion.section>

      <motion.section {...fadeIn} className={`${surfaceClassName} p-5 sm:p-6`}>
        <SectionHeader
          eyebrow="Trilhas"
          title="Percursos com mais contexto"
          description="Trilhas entram como complemento natural, nao como aba concorrendo com cursos."
        />

        <div className="mt-4">
          {trails.length === 0 ? (
            <EmptyState
              title="Nenhuma trilha disponivel"
              description="A area de trilhas deve aparecer so quando houver conteudo real para sustentar a navegacao."
            />
          ) : (
            <motion.div
              variants={stagger}
              initial="initial"
              animate="animate"
              className="space-y-3"
            >
              {trails.map((trail) => (
                <TrailRow key={trail.id} trail={trail} />
              ))}
            </motion.div>
          )}
        </div>
      </motion.section>
    </div>
  );
});
