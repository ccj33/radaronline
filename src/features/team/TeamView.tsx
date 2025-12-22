import { useMemo, useState } from 'react';
import { TeamMember } from '../../types';
import { getMicroregiaoById, getMunicipiosByMicro } from '../../data/microregioes';
import { ConfirmModal } from '../../components/common';
import {
  Mail, MapPin, Edit3, Trash2, Plus,
  User as UserIcon, Search, X,
  ChevronDown, Filter
} from 'lucide-react';

// Melhores Práticas: Definir papeis padrão para evitar "Lider", "Chefe", "Resp." misturados
const ROLES_OPTIONS = [
  'Responsável',
  'Aprovador',
  'Consultado',
  'Informado',
  'Membro'
];

// --- Componentes Auxiliares ---

// Gera cor do badge baseado no cargo
const getRoleBadgeColor = (role: string) => {
  const normalized = role.toLowerCase();
  if (normalized.includes('respons')) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (normalized.includes('aprov')) return 'bg-purple-50 text-purple-700 border-purple-200';
  if (normalized.includes('consult')) return 'bg-amber-50 text-amber-700 border-amber-200';
  if (normalized.includes('inform')) return 'bg-slate-50 text-slate-600 border-slate-200';
  return 'bg-gray-50 text-gray-600 border-gray-200';
};

const getInitials = (name: string) => {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// --- Componente Principal ---

type TeamViewProps = {
  team: TeamMember[];
  microId: string;
  onUpdateTeam?: (microId: string, team: TeamMember[]) => void;
  readOnly?: boolean;
};

type NewMember = Pick<TeamMember, 'name' | 'role' | 'email' | 'municipio'>;
const emptyMember: NewMember = { name: '', role: 'Consultado', email: '', municipio: '' };

export function TeamView({ team, microId, onUpdateTeam, readOnly = false }: TeamViewProps) {
  const [isAddOpen, setIsAddOpen] = useState(false); // UI State: Controla visibilidade do form
  const [form, setForm] = useState<NewMember>(emptyMember);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<NewMember>(emptyMember);
  const [removeConfirm, setRemoveConfirm] = useState<{ open: boolean; memberId: number | null; memberName?: string }>({ open: false, memberId: null });

  // UX Melhorada: Busca única + Filtro de Role
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const microMeta = microId ? getMicroregiaoById(microId) : undefined;

  // Lista de municípios da microrregião selecionada, ordenados alfabeticamente
  const municipiosOrdenados = useMemo(() => {
    if (!microId) return [];
    return getMunicipiosByMicro(microId)
      .map(m => m.nome)
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [microId]);

  // Filtragem Otimizada
  const filteredTeam = useMemo(() => {
    return team.filter(member => {
      const searchLower = searchTerm.toLowerCase();

      const matchesSearch = !searchTerm ||
        member.name.toLowerCase().includes(searchLower) ||
        member.email.toLowerCase().includes(searchLower) ||
        member.municipio.toLowerCase().includes(searchLower);

      const matchesRole = !roleFilter || member.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [team, searchTerm, roleFilter]);

  const handleAdd = () => {
    if (readOnly || !microId) return;
    if (!form.name.trim()) return;
    const next: TeamMember = {
      id: Date.now(),
      name: form.name.trim(),
      role: form.role,
      email: form.email.trim(),
      municipio: form.municipio.trim(),
      microregiaoId: microId,
    };
    onUpdateTeam?.(microId, [...team, next]);
    setForm(emptyMember);
    setIsAddOpen(false); // Fecha form após adicionar
  };

  const handleRemove = (memberId: number) => {
    if (readOnly || !microId) return;
    const member = team.find(m => m.id === memberId);
    setRemoveConfirm({ open: true, memberId, memberName: member?.name });
  };

  const startEdit = (member: TeamMember) => {
    setEditingId(member.id);
    setEditForm({ name: member.name, role: member.role, email: member.email, municipio: member.municipio });
  };

  const saveEdit = (memberId: number) => {
    if (readOnly || !microId) return;
    const updated = team.map(m =>
      m.id === memberId ? { ...m, ...editForm } : m
    );
    onUpdateTeam?.(microId, updated);
    setEditingId(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header com Design Elevado */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <UserIcon size={20} className="stroke-[2.5]" />
            <span className="text-xs font-bold uppercase tracking-wider">Gestão de Equipe</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Membros & Atribuições</h2>
          <p className="text-slate-500 text-sm max-w-lg">
            Gerencie quem faz o que. Mantenha os dados de contato e atribuições RACI atualizados para a microrregião.
          </p>
        </div>

        {microMeta && (
          <div className="flex flex-col items-end gap-1">
            <span className="px-3 py-1 rounded-full bg-slate-900 text-slate-50 text-xs font-medium shadow-sm">
              {microMeta.nome}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {filteredTeam.length} {filteredTeam.length === 1 ? 'membro' : 'membros'}
            </span>
          </div>
        )}
      </div>

      {/* Barra de Ferramentas (Busca & Ações) */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome, email ou cidade..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="relative min-w-[160px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <select
            className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 shadow-sm cursor-pointer"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">Todos Cargos</option>
            {ROLES_OPTIONS.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
        </div>

        {!readOnly && (
          <button
            onClick={() => setIsAddOpen(!isAddOpen)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95 ${isAddOpen
              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
              }`}
          >
            {isAddOpen ? <X size={18} /> : <Plus size={18} />}
            <span className="hidden sm:inline">{isAddOpen ? 'Cancelar' : 'Novo Membro'}</span>
            <span className="sm:hidden">{isAddOpen ? 'Fechar' : 'Novo'}</span>
          </button>
        )}
      </div>

      {/* Formulário de Adição (Colapsável) */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isAddOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-2xl p-5 md:p-6 shadow-inner">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
              Adicionar Novo Colaborador
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-indigo-900/60 ml-1">Nome Completo</label>
              <input
                className="w-full px-3 py-2 bg-white border border-indigo-200/60 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all placeholder:text-slate-300"
                placeholder="Ex: Maria Silva"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-indigo-900/60 ml-1">Cargo / Função</label>
              <div className="relative">
                <select
                  className="w-full px-3 py-2 bg-white border border-indigo-200/60 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all appearance-none cursor-pointer"
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                >
                  {ROLES_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-300 pointer-events-none" size={14} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-indigo-900/60 ml-1">Email</label>
              <input
                className="w-full px-3 py-2 bg-white border border-indigo-200/60 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all placeholder:text-slate-300"
                placeholder="maria@exemplo.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-indigo-900/60 ml-1">Município</label>
              <div className="relative">
                <select
                  className="w-full px-3 py-2 bg-white border border-indigo-200/60 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all appearance-none cursor-pointer"
                  value={form.municipio}
                  onChange={e => setForm({ ...form, municipio: e.target.value })}
                >
                  <option value="">Selecione o município...</option>
                  {municipiosOrdenados.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-300 pointer-events-none" size={14} />
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={handleAdd}
              disabled={!form.name.trim()}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirmar Adição
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Cards (Mobile First & Responsive) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeam.map((member) => {
          const isEditing = editingId === member.id;

          if (isEditing) {
            // Card em Modo de Edição
            return (
              <div key={member.id} className="bg-white rounded-2xl p-5 shadow-lg border-2 border-indigo-100 ring-2 ring-indigo-50 relative animate-in fade-in zoom-in-95 duration-200">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Editando Membro</h4>
                  </div>
                  <input
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-200"
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Nome"
                  />
                  <select
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200"
                    value={editForm.role}
                    onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                  >
                    {ROLES_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <input
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200"
                    value={editForm.email}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                    placeholder="Email"
                  />
                  <div className="relative">
                    <select
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 appearance-none cursor-pointer"
                      value={editForm.municipio}
                      onChange={e => setEditForm({ ...editForm, municipio: e.target.value })}
                    >
                      <option value="">Selecione o município...</option>
                      {municipiosOrdenados.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => saveEdit(member.id)} className="flex-1 bg-indigo-600 text-white py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700">Salvar</button>
                    <button onClick={() => setEditingId(null)} className="flex-1 bg-white border border-slate-200 text-slate-600 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50">Cancelar</button>
                  </div>
                </div>
              </div>
            );
          }

          // Card em Modo de Visualização
          return (
            <div key={member.id} className="group bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-100 transition-all duration-300 relative">

              {/* Cabeçalho do Card */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 font-bold text-lg flex items-center justify-center shadow-inner">
                    {getInitials(member.name)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base leading-tight group-hover:text-indigo-700 transition-colors">
                      {member.name}
                    </h3>
                    <div className={`inline-flex items-center px-2 py-0.5 mt-1 rounded-md border text-[10px] font-bold uppercase tracking-wider ${getRoleBadgeColor(member.role)}`}>
                      {member.role}
                    </div>
                  </div>
                </div>

                {/* Ações (Aparecem no hover em desktop, ou sempre visíveis se mobile) */}
                {!readOnly && (
                  <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(member)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                      <Edit3 size={16} />
                    </button>
                    <button onClick={() => handleRemove(member.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Detalhes do Card */}
              <div className="space-y-2">
                {member.email ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors">
                    <div className="p-1.5 bg-slate-50 rounded-md text-slate-400">
                      <Mail size={14} />
                    </div>
                    <span className="truncate">{member.email}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-slate-300 italic">
                    <div className="p-1.5 bg-slate-50 rounded-md">
                      <Mail size={14} />
                    </div>
                    Sem email
                  </div>
                )}

                {member.municipio ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors">
                    <div className="p-1.5 bg-slate-50 rounded-md text-slate-400">
                      <MapPin size={14} />
                    </div>
                    <span className="truncate">{member.municipio}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-slate-300 italic">
                    <div className="p-1.5 bg-slate-50 rounded-md">
                      <MapPin size={14} />
                    </div>
                    Sem município
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredTeam.length === 0 && (
        <div className="text-center py-16 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
          <div className="mx-auto w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
            <Search size={24} />
          </div>
          <h3 className="text-slate-900 font-semibold text-lg">Nenhum membro encontrado</h3>
          <p className="text-slate-500 max-w-xs mx-auto mt-1">
            Tente ajustar seus filtros ou adicione um novo colaborador à equipe.
          </p>
          {!readOnly && (
            <button onClick={() => { setSearchTerm(''); setRoleFilter(''); setIsAddOpen(true) }} className="mt-4 text-indigo-600 font-semibold text-sm hover:underline">
              Limpar filtros e adicionar novo
            </button>
          )}
        </div>
      )}

      {/* Modal de Confirmação */}
      <ConfirmModal
        isOpen={removeConfirm.open}
        onClose={() => setRemoveConfirm({ open: false, memberId: null })}
        onConfirm={() => {
          if (!removeConfirm.memberId || !microId) return;
          onUpdateTeam?.(microId, team.filter(m => m.id !== removeConfirm.memberId));
          setRemoveConfirm({ open: false, memberId: null });
        }}
        title="Remover Colaborador"
        message={`Você está prestes a remover ${removeConfirm.memberName} da equipe. Esta ação não pode ser desfeita.`}
        confirmText="Sim, Remover"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
}
