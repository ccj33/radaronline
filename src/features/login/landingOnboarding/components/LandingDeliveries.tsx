import { ArrowRight, MousePointerClick, ShieldCheck, Sparkles, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";

import {
    COLORS,
    DELIVERY_CARD_ITEMS,
    DELIVERY_CONTENT_BY_ID,
    GRADIENT,
} from "../landingOnboarding.constants";
import type { DeliveryCardItem, DeliveryId } from "../landingOnboarding.types";

function DeliveryCard({
    index,
    title,
    desc,
    icon: Icon,
    tag,
    active,
    onClick,
}: DeliveryCardItem & {
    index: number;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <motion.button
            layout
            onClick={onClick}
            className="group relative text-left w-full p-6 md:p-8 rounded-[2rem] border-2 transition-all duration-500 outline-none"
            style={{
                backgroundColor: active ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.4)",
                borderColor: active ? "#000" : "rgba(0,0,0,0.08)",
                boxShadow: active
                    ? "0px 0px 40px -10px rgba(53,211,255,0.4), 12px 12px 0px rgba(0,0,0,1)"
                    : "none",
                opacity: active ? 1 : 0.65,
            }}
            whileHover={{
                scale: active ? 1.02 : 1.01,
                backgroundColor: "rgba(255,255,255,0.9)",
                opacity: 1,
            }}
            whileTap={{ scale: 0.98 }}
        >
            <div
                className="absolute top-6 right-8 text-6xl font-black tracking-tighter opacity-5 pointer-events-none select-none transition-opacity group-hover:opacity-10"
                style={{ color: COLORS.ink }}
            >
                0{index + 1}
            </div>

            {active ? (
                <motion.div
                    layoutId="active-indicator"
                    className="hidden md:flex absolute -right-6 top-1/2 -translate-y-1/2 z-20 items-center justify-center"
                >
                    <div className="bg-black text-white p-2 rounded-full shadow-xl">
                        <ArrowRight size={24} />
                    </div>
                </motion.div>
            ) : null}

            <div className="flex items-start justify-between gap-4 relative z-10">
                <div>
                    <div className="flex items-center gap-3">
                        <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-300"
                            style={{
                                background: active ? GRADIENT : "rgba(0,0,0,0.05)",
                                borderColor: active ? "rgba(0,0,0,1)" : "rgba(0,0,0,0.1)",
                                transform: "rotate(0deg)",
                            }}
                        >
                            <Icon size={22} className={active ? "text-black" : "text-gray-500 group-hover:text-black"} />
                        </div>
                        <div
                            className={`font-black text-xl md:text-2xl transition-colors ${active ? "text-black" : "text-gray-600 group-hover:text-black"}`}
                        >
                            {title}
                        </div>
                    </div>
                    <p
                        className={`mt-3 text-base md:text-lg font-semibold transition-opacity ${active ? "opacity-90 text-black" : "opacity-60 text-gray-700"}`}
                    >
                        {desc}
                    </p>
                </div>

                <span
                    className="shrink-0 px-3 py-2 rounded-full text-xs font-black uppercase tracking-wider border transition-colors hidden sm:inline-block"
                    style={{
                        background: active ? "rgba(0,0,0,0.06)" : "transparent",
                        borderColor: "rgba(0,0,0,0.15)",
                        color: active ? COLORS.ink : "#888",
                    }}
                >
                    {tag}
                </span>
            </div>
        </motion.button>
    );
}

export function LandingDeliveries() {
    const [activeId, setActiveId] = useState<DeliveryId>("radar");
    const content = useMemo(() => DELIVERY_CONTENT_BY_ID[activeId], [activeId]);
    const ContentIcon = content.icon;
    const HighlightIcon = content.highlight?.icon;

    return (
        <section
            className="relative py-28 md:py-36 px-6 overflow-hidden"
            style={{
                background:
                    "radial-gradient(900px 600px at 80% 20%, rgba(30,107,255,0.12), transparent 60%), radial-gradient(900px 700px at 10% 80%, rgba(24,195,160,0.10), transparent 60%), linear-gradient(180deg, #F7FFFB 0%, #F2FFF8 100%)",
            }}
        >
            <div className="max-w-6xl mx-auto">
                <motion.h2
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-4xl md:text-6xl font-black tracking-tight text-center"
                    style={{ color: COLORS.ink }}
                >
                    O que já está em entrega em Minas
                </motion.h2>

                <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="mt-5 text-center text-lg md:text-2xl font-semibold opacity-80 max-w-4xl mx-auto"
                    style={{ color: COLORS.ink }}
                >
                    Uma jornada integrada que une Planejamento Local, Capacitação e BI ao Radar, transformando
                    estratégia em execução e resultados práticos.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center justify-center gap-2 mt-8 text-sm font-bold uppercase tracking-widest opacity-50"
                >
                    <MousePointerClick size={16} />
                    <span className="hidden md:inline">Selecione abaixo para ver detalhes</span>
                    <span className="md:hidden">Toque nas opções para explorar</span>
                </motion.div>

                <div className="mt-8 grid md:grid-cols-2 gap-6 md:gap-8 items-start">
                    <div>
                        <div className="md:hidden mb-6">
                            <div className="grid grid-cols-2 gap-3">
                                {DELIVERY_CARD_ITEMS.map((item) => {
                                    const Icon = item.icon;
                                    const active = activeId === item.id;

                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => setActiveId(item.id)}
                                            aria-pressed={active}
                                            className="relative flex flex-col items-center justify-center text-center p-4 rounded-[1.5rem] border-2 transition-all duration-300"
                                            style={{
                                                background: active ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.4)",
                                                borderColor: active ? "#000" : "rgba(0,0,0,0.08)",
                                                boxShadow: active ? "4px 4px 0px rgba(0,0,0,1)" : "none",
                                                opacity: active ? 1 : 0.65,
                                            }}
                                        >
                                            <div
                                                className="w-12 h-12 rounded-[1rem] border flex items-center justify-center mb-3 transition-colors"
                                                style={{
                                                    background: active ? GRADIENT : "rgba(0,0,0,0.05)",
                                                    borderColor: active ? "rgba(0,0,0,1)" : "rgba(0,0,0,0.1)",
                                                }}
                                            >
                                                <Icon size={22} className={active ? "text-black" : "text-gray-500"} />
                                            </div>
                                            <span className={`font-black text-[13px] leading-tight ${active ? "text-slate-900" : "text-slate-600"}`}>
                                                {item.title}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="hidden md:grid gap-4">
                        {DELIVERY_CARD_ITEMS.map((item, index) => (
                            <DeliveryCard
                                key={item.id}
                                index={index}
                                active={activeId === item.id}
                                onClick={() => setActiveId(item.id)}
                                {...item}
                            />
                        ))}
                        </div>
                    </div>

                    <div className="md:sticky md:top-10">
                        <motion.div
                            key={activeId}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="p-6 md:p-8 rounded-[2rem] border-2 relative overflow-hidden flex flex-col justify-center"
                            style={{
                                background: "rgba(255,255,255,0.9)",
                                backdropFilter: "blur(24px)",
                                WebkitBackdropFilter: "blur(24px)",
                                borderColor: "#000",
                                boxShadow: "12px 12px 0px #000, 0px 0px 40px -10px rgba(53,211,255,0.3)",
                            }}
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                            <motion.div
                                initial={{ rotate: -10, scale: 0.8, opacity: 0 }}
                                animate={{ rotate: 15, scale: 1, opacity: 0.03 }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className="absolute -bottom-10 -right-10 pointer-events-none"
                            >
                                <ContentIcon size={400} className="text-slate-900/5" />
                            </motion.div>

                            <div className="flex items-center gap-3 relative z-10">
                                <div
                                    className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm"
                                    style={{ borderColor: "rgba(0,0,0,0.06)", background: "white" }}
                                >
                                    <ShieldCheck className="text-blue-600" size={22} />
                                </div>

                                <div>
                                    <div className="text-slate-500 text-xs font-black uppercase tracking-wider">
                                        {content.badge}
                                    </div>
                                    <h3 className="text-2xl md:text-3xl font-black text-slate-900 leading-none">
                                        {content.title}
                                    </h3>
                                </div>
                            </div>

                            <p className="mt-4 text-slate-700 text-lg md:text-xl font-bold leading-tight relative z-10">
                                {content.subtitle}
                            </p>

                            <div className="w-12 h-1 bg-slate-200 rounded-full my-5 relative z-10" />

                            <div className="relative z-10 grid gap-4 md:grid-cols-2">
                                <div>
                                    <div className="flex items-center gap-2 mb-2 text-blue-600 text-xs font-black uppercase tracking-wider">
                                        <Sparkles size={12} />
                                        <span>Por que importa</span>
                                    </div>
                                    <ul className="space-y-2">
                                        {content.bullets.map((item, index) => (
                                            <li key={index} className="flex gap-2 text-slate-600 text-xs md:text-sm font-medium leading-snug">
                                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 bg-blue-400" />
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 mb-2 text-blue-600 text-xs font-black uppercase tracking-wider">
                                        <Users size={12} />
                                        <span>Uso prático</span>
                                    </div>
                                    <ul className="space-y-2">
                                        {content.howToUse.map((item, index) => (
                                            <li key={index} className="flex gap-2 text-slate-600 text-xs md:text-sm font-medium leading-snug">
                                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 bg-teal-400" />
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {content.highlight && HighlightIcon ? (
                                <div className="mt-6 relative group/card">
                                    <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs font-black uppercase tracking-wider">
                                        <HighlightIcon size={12} />
                                        <span>{content.highlight.label}</span>
                                    </div>

                                    <a
                                        href={content.highlight.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block relative w-full h-32 md:h-40 rounded-2xl overflow-hidden border-[4px] border-white shadow-xl transition-all hover:scale-[1.02] hover:shadow-2xl"
                                    >
                                        <img
                                            src={content.highlight.img}
                                            alt={content.highlight.title}
                                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/40 to-transparent opacity-90" />

                                        <div className="absolute inset-0 p-4 flex flex-row items-center justify-between gap-4">
                                            <div className="max-w-[65%]">
                                                <h4 className="text-white font-bold leading-tight text-sm md:text-base drop-shadow-md line-clamp-3">
                                                    {content.highlight.title}
                                                </h4>
                                            </div>

                                            <div className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg backdrop-blur-md border border-white/30 bg-white/10 text-white text-[10px] md:text-xs font-black uppercase tracking-wide hover:bg-white hover:text-black transition-all shadow-lg">
                                                <span>{content.highlight.buttonText}</span>
                                                <ArrowRight size={14} />
                                            </div>
                                        </div>
                                    </a>
                                </div>
                            ) : null}
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}
