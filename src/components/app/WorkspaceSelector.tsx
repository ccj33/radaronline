import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Target, Users, ChevronRight, Triangle } from 'lucide-react';

export type Workspace = 'planning' | 'community';

interface WorkspaceSelectorProps {
  userName?: string;
  onSelect: (workspace: Workspace) => void;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

export const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = React.memo(({ userName, onSelect }) => {
  const handlePlanning = useCallback(() => onSelect('planning'), [onSelect]);
  const handleCommunity = useCallback(() => onSelect('community'), [onSelect]);

  const firstName = userName?.split(' ')[0] || 'Usuário';

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 via-white to-teal-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 flex items-center justify-center p-4 font-sans">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 max-w-2xl w-full"
      >
        {/* Logo + Greeting */}
        <motion.div variants={item} className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Triangle size={24} fill="white" className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                RADAR <span className="font-light text-teal-600 dark:text-teal-400">NSDIGI</span>
              </h1>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Olá, <span className="font-semibold text-slate-700 dark:text-slate-200">{firstName}</span>! Para onde deseja ir?
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <motion.button
            variants={item}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePlanning}
            className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 text-left shadow-sm hover:shadow-xl hover:border-teal-300 dark:hover:border-teal-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            {/* Gradient accent top */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-600 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-500/10 to-emerald-500/10 dark:from-teal-500/20 dark:to-emerald-500/20 flex items-center justify-center shrink-0 group-hover:from-teal-500/20 group-hover:to-emerald-500/20 transition-colors">
                <Target size={28} className="text-teal-600 dark:text-teal-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                  Planejamento
                  <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 group-hover:text-teal-500 transition-colors group-hover:translate-x-1 transform duration-200" />
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Gerencie objetivos estratégicos, ações, equipes e acompanhamento da sua microrregião.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {['Objetivos', 'Ações', 'Equipe', 'Gantt'].map(tag => (
                <span key={tag} className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300">
                  {tag}
                </span>
              ))}
            </div>
          </motion.button>

          <motion.button
            variants={item}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCommunity}
            className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 text-left shadow-sm hover:shadow-xl hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            {/* Gradient accent top */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10 dark:from-purple-500/20 dark:to-indigo-500/20 flex items-center justify-center shrink-0 group-hover:from-purple-500/20 group-hover:to-indigo-500/20 transition-colors">
                <Users size={28} className="text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                  Hub
                  <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 group-hover:text-purple-500 transition-colors group-hover:translate-x-1 transform duration-200" />
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Fóruns, mentorias, cursos e repositório de materiais para a rede de saúde digital.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {['Fóruns', 'Mentorias', 'Educação', 'Repositório'].map(tag => (
                <span key={tag} className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300">
                  {tag}
                </span>
              ))}
            </div>
          </motion.button>
        </div>

        {/* Footer hint */}
        <motion.p variants={item} className="text-center mt-8 text-xs text-slate-400 dark:text-slate-500">
          Você pode alternar entre os espaços a qualquer momento pelo menu lateral.
        </motion.p>
      </motion.div>
    </div>
  );
});
