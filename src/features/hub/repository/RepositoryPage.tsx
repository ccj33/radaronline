import React, { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  Calendar,
  ExternalLink,
  FileCheck,
  FileText,
  HelpCircle,
  Plus,
  Search,
  Tag,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { useRepository } from '../../../hooks/useRepository';
import type { Material, MaterialCategory, MaterialType } from '../../../types/repository.types';
import { MATERIAL_CATEGORIES, MATERIAL_TYPE_CONFIG } from '../../../types/repository.types';

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };
const stagger = { animate: { transition: { staggerChildren: 0.06 } } };
const overlay = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
const surfaceClassName =
  'rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900';

const iconMap: Record<MaterialType, React.ElementType> = {
  video: Video,
  manual: FileText,
  faq: HelpCircle,
  template: FileCheck,
  legislacao: BookOpen,
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

const TypeIcon: React.FC<{ type: MaterialType; size?: number }> = ({ type, size = 18 }) => {
  const Icon = iconMap[type];
  const config = MATERIAL_TYPE_CONFIG[type];

  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${config.bg}`}>
      <Icon size={size} className={config.color} />
    </div>
  );
};

const MaterialRow: React.FC<{ material: Material }> = React.memo(({ material }) => {
  const config = MATERIAL_TYPE_CONFIG[material.type];

  return (
    <motion.div
      variants={fadeIn}
      className="border-b border-slate-100 last:border-0 px-4 py-4 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
    >
      <div className="flex items-start gap-4">
        <TypeIcon type={material.type} />

        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-900 dark:text-white text-base hover:text-teal-600 transition-colors cursor-pointer">
             {material.title}
          </h3>

          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400 mt-0.5">
             {material.description || 'Sem descricao.'}
          </p>

          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400 dark:text-slate-500">
            <span className={`font-semibold ${config.color} bg-white dark:bg-transparent`}>{config.label}</span>
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {new Date(material.createdAt).toLocaleDateString('pt-BR')}
            </span>
            {material.downloads > 0 && <span>{material.downloads} downloads</span>}
          </div>
        </div>

        {material.fileUrl ? (
          <a
            href={material.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-teal-600 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
            title="Abrir material"
          >
            <ExternalLink size={14} />
          </a>
        ) : null}
      </div>
    </motion.div>
  );
});

interface AddMaterialModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    type: MaterialType;
    category: MaterialCategory;
    url: string;
    author: string;
  }) => void;
}

const AddMaterialModal: React.FC<AddMaterialModalProps> = ({ open, onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<MaterialType>('video');
  const [category, setCategory] = useState<MaterialCategory>(MATERIAL_CATEGORIES[0]);
  const [url, setUrl] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!title.trim()) {
      return;
    }

    onSubmit({ title, description, type, category, url, author: '' });
    setTitle('');
    setDescription('');
    setUrl('');
    onClose();
  };

  if (!open) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        {...overlay}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          className="w-full max-w-lg rounded-[28px] bg-white shadow-2xl dark:bg-slate-900"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <Upload size={18} className="text-slate-500" />
              Adicionar material
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-5">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                Titulo
              </label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                placeholder="Nome do material"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                Descricao
              </label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                placeholder="Breve descricao do material"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                  Tipo
                </label>
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value as MaterialType)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  {(Object.keys(MATERIAL_TYPE_CONFIG) as MaterialType[]).map((item) => (
                    <option key={item} value={item}>
                      {MATERIAL_TYPE_CONFIG[item].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                  Categoria
                </label>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value as MaterialCategory)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  {MATERIAL_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                Link
              </label>
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                placeholder="https://..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!title.trim()}
                className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                Adicionar
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

interface RepositoryPageProps {
  userId?: string;
}

export const RepositoryPage: React.FC<RepositoryPageProps> = React.memo(({ userId: _userId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<MaterialType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<MaterialCategory | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const { materials, loading, error, isFallback, addMaterial } = useRepository();

  const filteredMaterials = useMemo(() => {
    return materials.filter((material) => {
      const description = material.description?.toLowerCase() || '';
      const matchesSearch =
        !searchTerm ||
        material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        description.includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || material.type === typeFilter;
      const matchesCategory = categoryFilter === 'all' || material.category === categoryFilter;

      return matchesSearch && matchesType && matchesCategory;
    });
  }, [materials, searchTerm, typeFilter, categoryFilter]);

  const featuredMaterials = useMemo(() => materials.slice(0, 3), [materials]);

  const handleAddMaterial = useCallback(
    async (data: {
      title: string;
      description: string;
      type: MaterialType;
      category: MaterialCategory;
      url: string;
      author: string;
    }) => {
      await addMaterial({ ...data, author: data.author || 'Anonimo' });
    },
    [addMaterial],
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
              Biblioteca
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Buscar referencia sem atravessar um painel.
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              A experiencia agora fica mais proxima de uma biblioteca real: busca, filtros curtos e
              resultado em lista.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <SummaryChip label={`${materials.length} itens`} />
            <SummaryChip label={`${filteredMaterials.length} resultados`} />
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              <Plus size={16} className="mr-2" />
              Adicionar
            </button>
          </div>
        </div>

        {isFallback ? (
          <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50/80 px-4 py-3 text-sm text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/20 dark:text-sky-100">
            Biblioteca em modo local: os materiais adicionados aqui ficam salvos no navegador ate
            a trilha definitiva do Hub ficar pronta.
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100">
            A biblioteca ainda depende do backend atual do Hub e pode ter inconsistencias de
            catalogacao ate a trilha definitiva.
          </div>
        ) : null}
      </motion.section>

      <motion.section {...fadeIn} className={`${surfaceClassName} p-5 sm:p-6`}>
        <SectionHeader
          eyebrow="Destaques"
          title="Materiais mais recentes"
          description="Essa faixa ajuda quando a pessoa ainda nao quer filtrar nada e so precisa de um ponto de partida."
        />

        <div className="mt-4">
          {featuredMaterials.length === 0 ? (
            <EmptyState
              title="Nenhum material em destaque"
              description="Quando o catalogo estiver vazio, a tela deve assumir isso com honestidade e pouco ruído."
            />
          ) : (
            <motion.div
              variants={stagger}
              initial="initial"
              animate="animate"
              className="space-y-3"
            >
              {featuredMaterials.map((material) => (
                <MaterialRow key={material.id} material={material} />
              ))}
            </motion.div>
          )}
        </div>
      </motion.section>

      <motion.section {...fadeIn} className={`${surfaceClassName} overflow-hidden`}>
        <div className="border-b border-slate-200/80 px-5 py-5 dark:border-slate-700/80 sm:px-6">
          <SectionHeader
            eyebrow="Busca"
            title="Catalogo filtrado"
            description="Biblioteca boa e quase invisivel: voce pensa no que procura, nao na interface."
          />

          <div className="mt-4 space-y-3">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar material"
                className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                className={`rounded-full border px-3 py-2 text-sm font-semibold transition-colors ${
                  typeFilter === 'all'
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                Todos
              </button>
              {(Object.keys(MATERIAL_TYPE_CONFIG) as MaterialType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTypeFilter(type)}
                  className={`rounded-full border px-3 py-2 text-sm font-semibold transition-colors ${
                    typeFilter === type
                      ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {MATERIAL_TYPE_CONFIG[type].label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Tag size={14} className="text-slate-400" />
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  categoryFilter === 'all'
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                Todas
              </button>
              {MATERIAL_CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setCategoryFilter(category)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
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
          {filteredMaterials.length === 0 ? (
            <EmptyState
              title="Nenhum material encontrado"
              description="Se a busca zerar o catalogo, o vazio precisa caber no contexto e oferecer saida rapida."
              actionLabel="Limpar filtros"
              onAction={() => {
                setSearchTerm('');
                setTypeFilter('all');
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
              {filteredMaterials.map((material) => (
                <MaterialRow key={material.id} material={material} />
              ))}
            </motion.div>
          )}
        </div>
      </motion.section>

      <AddMaterialModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddMaterial}
      />
    </div>
  );
});
