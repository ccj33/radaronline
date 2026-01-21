import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity,
    CalendarCheck,
    TrendingUp,
    Users,
    Search,
    ChevronLeft,
    ChevronRight,
    Clock,
    Heart,
    Trophy,
    Zap,
    MapPin,
    Lightbulb,
    Megaphone
} from 'lucide-react';
import { Button } from '../../ui/Button';
import confetti from 'canvas-confetti';

import { loadAnnouncements, loadAutomatedEvents } from '../../services/dataService';
import type { AutomatedEvent } from '../../services/dataService';
import { useAuth } from '../../auth/AuthContext';
import { Announcement } from '../../types/announcement.types';

// Removendo MOCK_ANNOUNCEMENTS em favor da API real

const INITIAL_EVENTS: AutomatedEvent[] = [
    {
        id: 'e1',
        type: 'plan_completed',
        municipality: 'Ouro Preto',
        title: 'Ouro Preto conclui o Planejamento Local 2026',
        timestamp: '2h atrás',
        details: '14 UBSs finalizaram o diagnóstico, estruturando a base do Plano de Ação da Atenção Primária.',
        imageGradient: 'from-blue-600 to-cyan-500',
        likes: 24,
        footerContext: 'Marco do Planejamento Local • Equipes municipais mobilizadas',
        created_at: new Date().toISOString()
    },
    {
        id: 'e2',
        type: 'goal_reached',
        municipality: 'Mariana',
        title: 'Mariana atinge meta de adesão das equipes',
        timestamp: '4h atrás',
        details: '80% dos profissionais cadastrados passaram a utilizar a plataforma, integrando a comunicação da rede.',
        imageGradient: 'from-emerald-600 to-teal-500',
        likes: 18,
        footerContext: 'Resultado do engajamento das equipes locais',
        created_at: new Date().toISOString()
    },
    {
        id: 'e3',
        type: 'system_milestone',
        municipality: 'Regional Itabira',
        title: 'Regional de Itabira inicia monitoramento digital',
        timestamp: '5h atrás',
        details: 'Novo módulo liberado para apoiar gestores no acompanhamento das ações e resultados.',
        imageGradient: 'from-violet-600 to-purple-500',
        likes: 45,
        footerContext: 'Etapa concluída no processo de transformação digital',
        created_at: new Date().toISOString()
    }
];

// --- Components ---

const Carousel = ({ items }: { items: Announcement[] }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const next = () => setCurrentIndex(prev => (prev + 1) % items.length);
    const prev = () => setCurrentIndex(prev => (prev - 1 + items.length) % items.length);

    useEffect(() => {
        if (items.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % items.length);
        }, 8000);
        return () => clearInterval(timer);
    }, [items.length]);

    if (items.length === 0) {
        return (
            <div className="relative rounded-3xl overflow-hidden shadow-xl mb-8 h-[200px] bg-slate-100 flex items-center justify-center">
                <div className="text-center text-slate-400">
                    <Megaphone size={48} className="mx-auto mb-2 opacity-30" />
                    <p>Sem novidades no momento</p>
                </div>
            </div>
        );
    }

    const current = items[currentIndex];

    return (
        <div className="relative group rounded-3xl overflow-hidden shadow-xl mb-8 h-[300px]">
            <div className="absolute inset-0 bg-slate-900" />

            <AnimatePresence mode="wait">
                <motion.img
                    key={current.imageUrl}
                    src={current.imageUrl}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 0.5, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                    className="absolute inset-0 w-full h-full object-cover mix-blend-overlay"
                />
            </AnimatePresence>

            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent flex flex-col justify-end p-8">
                <motion.div
                    key={current.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${current.priority === 'high' ? 'bg-amber-500/90 text-white' : 'bg-blue-500/90 text-white'
                            }`}>
                            {current.priority === 'high' ? 'Importante' : 'Novidade'}
                        </span>
                        <span className="text-white/70 text-xs font-medium flex items-center gap-1">
                            <CalendarCheck size={12} /> {new Date(current.displayDate).toLocaleDateString('pt-BR')}
                        </span>
                    </div>

                    <h2 className="text-2xl md:text-3xl font-black text-white mb-2 leading-tight">
                        {current.title}
                    </h2>
                    <p className="text-white/90 text-sm md:text-base max-w-2xl leading-relaxed mb-2 line-clamp-2">
                        {current.content}
                    </p>
                </motion.div>
            </div>

            {current.linkUrl && (
                <a
                    href={current.linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute inset-0 z-10 cursor-pointer"
                    title={`Visitar ${current.title}`}
                />
            )}

            <div className="absolute bottom-6 right-6 flex gap-2 z-20">
                <button onClick={prev} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all border border-white/10">
                    <ChevronLeft size={16} />
                </button>
                <button onClick={next} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all border border-white/10">
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
};

const AutomatedEventCard = ({ event, onLike }: { event: AutomatedEvent, onLike: (id: string) => void }) => {
    const handleLike = () => {
        onLike(event.id);
        confetti({
            particleCount: 30,
            spread: 60,
            origin: { y: 0.7 },
            colors: ['#3b82f6', '#10b981', '#f59e0b']
        });
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300"
        >
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${event.imageGradient}`} />

            <div className="p-4 pl-6 flex items-start gap-4">
                <div className={`p-3 rounded-2xl bg-gradient-to-br ${event.imageGradient} text-white shadow-lg shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                    {event.type === 'plan_completed' && <Trophy size={20} />}
                    {event.type === 'goal_reached' && <TrendingUp size={20} />}
                    {event.type === 'system_milestone' && <Zap size={20} />}
                    {event.type === 'new_user' && <Users size={20} />}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <MapPin size={10} /> {event.municipality}
                        </span>
                        <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                            {event.timestamp}
                        </span>
                    </div>

                    <h3 className="font-bold text-slate-800 text-base mb-1 group-hover:text-blue-600 transition-colors">
                        {event.title}
                    </h3>

                    {event.details && (
                        <p className="text-slate-500 text-sm leading-relaxed mb-3">
                            {event.details}
                        </p>
                    )}

                    {/* Context/Footer Info */}
                    {event.footerContext && (
                        <div className="mb-3 pt-2 border-t border-slate-50 text-[10px] uppercase tracking-wide font-bold text-slate-400">
                            {event.footerContext}
                        </div>
                    )}

                    {/* Interactive Footer */}
                    <div className="flex items-center gap-1 mt-auto pt-2 border-t border-slate-50">
                        <button
                            onClick={handleLike}
                            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-pink-500 transition-colors px-2 py-1 rounded-lg hover:bg-pink-50"
                        >
                            <Heart size={14} className={event.likes > 0 ? "fill-pink-500 text-pink-500" : ""} />
                            <span>{event.likes} Aplausos</span>
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// --- Main Component ---

interface NewsFeedProps {
    onOpenRoadmap?: () => void;
}

export const NewsFeed = ({ onOpenRoadmap }: NewsFeedProps) => {
    const { user } = useAuth();
    const [events, setEvents] = useState(INITIAL_EVENTS);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);

    // Load Automated Events
    useEffect(() => {
        const loadNews = async () => {
            // Se tiver usuário logado e com micro, filtra. Senão pega geral.
            const userMicro = user?.microregiaoId;
            const data = await loadAnnouncements(userMicro);
            setAnnouncements(data);

            // Carregar eventos reais
            const autoEvents = await loadAutomatedEvents(6);
            if (autoEvents.length > 0) {
                setEvents(autoEvents);
            }
        };
        loadNews();
    }, [user?.microregiaoId]);

    // Like logic
    const handleLike = (id: string) => {
        setEvents(prev => prev.map(e => e.id === id ? { ...e, likes: e.likes + 1 } : e));
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
            {/* Header Compacto */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        Mural da Rede <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]" />
                    </h1>
                    <p className="text-sm text-slate-500">Conectando conquistas de toda Minas Gerais</p>
                </div>
                <div className="flex gap-2">
                    {onOpenRoadmap && (
                        <button
                            onClick={onOpenRoadmap}
                            className="group relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-500/30 transition-all hover:scale-105 active:scale-95 ring-1 ring-white/20"
                        >
                            <span className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Lightbulb size={16} className="text-yellow-300 fill-yellow-300" />
                            <span>Sugerir Melhoria</span>
                            <span className="flex h-2 w-2 relative ml-1">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-200 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                            </span>
                        </button>
                    )}
                    <Button variant="secondary" className="text-xs h-9 gap-2 text-slate-500">
                        <Search size={14} /> Buscar
                    </Button>
                </div>
            </div>

            {/* Layout Simplificado (Sem Sidebar) */}
            <div className="space-y-10">

                {/* 1. Carousel */}
                <section>
                    <Carousel items={announcements} />
                </section>

                {/* 2. Automated Feed */}
                <section className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-white p-2.5 rounded-xl text-blue-600 shadow-sm border border-slate-100">
                            <Activity size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg leading-none">Acontecendo Agora</h3>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">Atualizações em tempo real das microrregiões</p>
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <AnimatePresence>
                            {events.map(event => (
                                <AutomatedEventCard key={event.id} event={event} onLike={handleLike} />
                            ))}
                        </AnimatePresence>

                        {/* Skeleton items / CTA to fill space visually */}
                        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-wider bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group min-h-[160px]">
                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <Clock size={20} className="text-slate-400" />
                            </div>
                            <span>Aguardando novas conquistas...</span>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};
