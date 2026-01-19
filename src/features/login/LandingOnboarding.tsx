import React, { useMemo, useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
    ArrowDown,
    ChevronDown,
    ChevronUp,
    Sparkles,
    ExternalLink,
    ShieldCheck,
    GraduationCap,
    MapPin,
    BarChart3,
    LayoutDashboard,
    Users,
    Cpu,
    X,
    ArrowRight,
    MousePointerClick,
    Wifi,
    Stethoscope,
    Activity,
    Newspaper,
} from "lucide-react";

/**
 * Radar Minas Digital
 * Landing + Onboarding (primeiro acesso) em tela cheia, com scrollytelling e foco nas entregas:
 * - Planejamento Local
 * - Curso Saúde Digital
 * - Radar Minas Digital
 * - BI (painéis/observatório)
 *
 * Stack: React + Tailwind + framer-motion + lucide-react
 */

const COLORS = {
    bgLight: "#F4FFF9",
    bgDark: "#06140F",
    ink: "#07120E",
    white: "#FFFFFF",
    stroke: "rgba(7, 18, 14, 0.12)",
    glass: "rgba(255,255,255,0.78)",
    glass2: "rgba(255,255,255,0.88)",
    black: "#000000",
    g1: "rgba(24,195,160,1)",
    g2: "rgba(53,211,255,1)",
    g3: "rgba(30,107,255,1)",
};

const GRADIENT = "linear-gradient(90deg, rgba(24,195,160,1), rgba(53,211,255,1), rgba(30,107,255,0.96))";
const GRADIENT_SOFT =
    "linear-gradient(135deg, rgba(24,195,160,0.35), rgba(53,211,255,0.28), rgba(30,107,255,0.18))";

const NoiseOverlay = () => (
    <div
        className="fixed inset-0 pointer-events-none z-50 opacity-[0.035] mix-blend-overlay"
        style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 240 240' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.85'/%3E%3C/svg%3E")`,
        }}
    />
);

const GradientBlob = ({ className = "", style = {} }: { className?: string; style?: React.CSSProperties }) => (
    <div
        className={`absolute rounded-full blur-3xl opacity-40 ${className}`}
        style={{
            background:
                "radial-gradient(circle at 30% 30%, rgba(53,211,255,0.95), rgba(24,195,160,0.75), rgba(30,107,255,0.22), transparent 70%)",
            ...style,
        }}
    />
);

const AnimatedTitle = ({ text, className = "" }: { text: string; className?: string }) => {
    const words = text.split(" ");
    const container = {
        hidden: { opacity: 0 },
        visible: (i = 1) => ({
            opacity: 1,
            transition: { staggerChildren: 0.06, delayChildren: 0.05 * i },
        }),
    };
    const child = {
        visible: {
            opacity: 1,
            y: 0,
            rotate: 0,
            transition: { type: "spring" as const, damping: 14, stiffness: 120 },
        },
        hidden: {
            opacity: 0,
            y: 60,
            rotate: 6,
            transition: { type: "spring" as const, damping: 14, stiffness: 120 },
        },
    };

    return (
        <motion.div
            className={className}
            style={{ overflow: "hidden", display: "flex", flexWrap: "wrap", justifyContent: "center" }}
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
        >
            {words.map((word, wi) => (
                <span key={wi} className="inline-block mr-3 md:mr-5 whitespace-nowrap">
                    {Array.from(word).map((letter, li) => (
                        <motion.span key={li} variants={child} className="inline-block">
                            {letter}
                        </motion.span>
                    ))}
                </span>
            ))}
        </motion.div>
    );
};

const PrimaryButton = ({ children, href, onClick }: { children: React.ReactNode; href?: string; onClick?: () => void }) => {
    const Comp = href ? "a" : "button";
    return (
        <motion.div whileHover={{ scale: 1.04, rotate: -0.6 }} whileTap={{ scale: 0.98 }}>
            <Comp
                href={href}
                target={href ? "_blank" : undefined}
                rel={href ? "noreferrer" : undefined}
                onClick={onClick}
                className="inline-flex items-center justify-center gap-3 px-7 py-4 rounded-2xl font-extrabold text-base md:text-lg cursor-pointer"
                style={{
                    color: "#04110C",
                    background: GRADIENT,
                    boxShadow: "10px 10px 0px rgba(0,0,0,1)",
                    border: "2px solid #000",
                }}
            >
                <Sparkles size={18} />
                {children}
                {href ? <ExternalLink size={18} /> : null}
            </Comp>
        </motion.div>
    );
};

const SecondaryButton = ({ children, href, onClick }: { children: React.ReactNode; href?: string; onClick?: () => void }) => {
    const Comp = href ? "a" : "button";
    return (
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <Comp
                href={href}
                target={href ? "_blank" : undefined}
                rel={href ? "noreferrer" : undefined}
                onClick={onClick}
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold cursor-pointer"
                style={{
                    background: "rgba(255,255,255,0.92)",
                    border: "2px solid #000",
                    boxShadow: "8px 8px 0px rgba(0,0,0,1)",
                    color: COLORS.ink,
                }}
            >
                {children}
                {href ? <ExternalLink size={18} /> : null}
            </Comp>
        </motion.div>
    );
};

const Hero = ({ onContinue }: { onContinue: () => void }) => {
    const { scrollY } = useScroll();
    const y1 = useTransform(scrollY, [0, 700], [0, 220]);
    const y2 = useTransform(scrollY, [0, 700], [0, -140]);
    const rot = useTransform(scrollY, [0, 700], [0, 18]);

    return (
        <section
            className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden py-20"
            style={{
                background:
                    "radial-gradient(1200px 800px at 50% 20%, rgba(53,211,255,0.25), transparent 60%), radial-gradient(1200px 900px at 20% 70%, rgba(24,195,160,0.18), transparent 55%), linear-gradient(180deg, #F4FFF9 0%, #ECFFF6 60%, #F7FFFB 100%)",
                color: COLORS.ink,
            }}
        >
            <GradientBlob className="-top-24 -left-24 w-[520px] h-[520px]" />
            <GradientBlob className="top-1/3 -right-24 w-[620px] h-[620px] opacity-30" />

            {/* Ícone de Estetoscópio Flutuante (Esquerda) */}
            <motion.div style={{ y: y2, rotate: rot }} className="absolute -top-10 left-0 md:left-10 hidden md:block opacity-40">
                <div
                    className="w-48 h-48 rounded-[3rem] border-2 flex items-center justify-center backdrop-blur-sm"
                    style={{
                        borderColor: "rgba(24,195,160,0.2)",
                        background: "linear-gradient(135deg, rgba(255,255,255,0.4), rgba(24,195,160,0.1))",
                    }}
                >
                    <Stethoscope size={96} className="text-[#18C3A0] opacity-80" />
                </div>
            </motion.div>

            {/* Ícone de Wifi/Conectividade Flutuante (Direita) */}
            <motion.div style={{ y: y1, rotate: rot }} className="absolute top-32 right-0 md:right-12 hidden md:block opacity-40">
                <div
                    className="w-56 h-56 rounded-full border-[2px] border-dashed flex items-center justify-center backdrop-blur-sm"
                    style={{ borderColor: "rgba(30,107,255,0.25)", background: "linear-gradient(135deg, rgba(255,255,255,0.3), rgba(30,107,255,0.05))" }}
                >
                    <Wifi size={108} className="text-[#1E6BFF] opacity-70" />
                </div>
            </motion.div>

            <div className="relative z-10 max-w-6xl flex flex-col items-center">
                {/* LOGO E NÚCLEO - Centralizado no topo como "Autoridade" */}
                <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="mb-6 inline-flex items-center gap-5 px-6 py-3 rounded-full border border-black/5 bg-white/60 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all cursor-default"
                >
                    <img
                        src="https://aquiotremprospera.com.br/wp-content/themes/secom-lp/images/logo-mg.png"
                        alt="Governo de Minas Gerais"
                        className="h-10 md:h-12 w-auto object-contain opacity-90 grayscale-[0.2] hover:grayscale-0 transition-all"
                    />
                    <div className="h-8 w-px bg-black/10" />
                    <div className="flex flex-col items-start text-left">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 leading-none mb-1">Núcleo</span>
                        <span className="text-lg font-black tracking-tight leading-none" style={{ color: COLORS.ink }}>NSDIGI</span>
                    </div>
                </motion.div>

                <div className="uppercase leading-[0.85] font-black tracking-tighter text-5xl md:text-8xl">
                    <AnimatedTitle text="Radar Minas Digital" />
                </div>

                <motion.p
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.7 }}
                    className="mt-6 text-lg md:text-2xl font-semibold opacity-80 leading-snug max-w-3xl mx-auto"
                >
                    O primeiro acesso que faz o gestor entender, com clareza, por que a transformação digital
                    é o futuro do SUS e como Minas Gerais já está executando isso agora.
                </motion.p>
            </div>

            <motion.div
                animate={{ y: [0, 14, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                className="absolute bottom-10 flex flex-col items-center gap-3 cursor-pointer z-20"
                onClick={() => document.getElementById("story")?.scrollIntoView({ behavior: "smooth" })}
            >
                <div
                    className="px-6 py-3 rounded-full font-black text-xs md:text-sm uppercase tracking-widest border-2 flex items-center gap-2 transition-transform hover:scale-105"
                    style={{
                        background: GRADIENT,
                        color: "#04110C",
                        borderColor: "#000",
                        boxShadow: "5px 5px 0px rgba(0,0,0,1)",
                    }}
                >
                    <Sparkles size={16} />
                    Começar a jornada
                </div>
                <ArrowDown size={32} strokeWidth={3} color={COLORS.ink} className="mt-1 opacity-80" />
            </motion.div>
        </section>
    );
};

const StickyStory = () => {
    const ref = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

    const opacity1 = useTransform(scrollYProgress, [0, 0.22, 0.30], [1, 1, 0]);
    const scale1 = useTransform(scrollYProgress, [0, 0.30], [1, 0.88]);
    const blur1 = useTransform(scrollYProgress, [0.20, 0.30], ["0px", "10px"]);

    const opacity2 = useTransform(scrollYProgress, [0.30, 0.42, 0.62], [0, 1, 0]);
    const x2 = useTransform(scrollYProgress, [0.30, 0.42, 0.62], [120, 0, -120]);

    const opacity3 = useTransform(scrollYProgress, [0.62, 0.72, 0.88], [0, 1, 0]);
    const y3 = useTransform(scrollYProgress, [0.62, 0.72, 0.88], [50, 0, -50]);

    const opacity4 = useTransform(scrollYProgress, [0.88, 0.95, 1], [0, 1, 1]);
    const scale4 = useTransform(scrollYProgress, [0.88, 1], [0.85, 1]);

    const bg = useTransform(scrollYProgress, [0, 0.5, 1], ["#06140F", "#06201A", "#06140F"]);
    const rot = useTransform(scrollYProgress, [0, 1], [0, 160]);

    return (
        <motion.section ref={ref} id="story" className="relative h-[460vh]" style={{ backgroundColor: bg }}>
            <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
                <motion.div style={{ rotate: rot }} className="absolute w-[160vw] h-[160vw] rounded-[42%]">
                    <div className="w-full h-full rounded-[42%]" style={{ border: "2px solid rgba(255,255,255,0.06)" }} />
                </motion.div>

                <div className="absolute left-6 md:left-10 top-1/2 -translate-y-1/2 h-80 w-2 bg-white/10 rounded-full overflow-hidden hidden md:block">
                    <motion.div style={{ scaleY: scrollYProgress, originY: 0 }} className="w-full h-full">
                        <div className="w-full h-full" style={{ background: "linear-gradient(180deg, rgba(24,195,160,1), rgba(53,211,255,1), rgba(30,107,255,1))" }} />
                    </motion.div>
                </div>

                <div className="w-full h-full flex items-center justify-center relative px-6">
                    <motion.div
                        style={{ opacity: opacity1, scale: scale1, filter: blur1 }}
                        className="absolute text-center max-w-6xl"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/5 mb-8">
                            <Cpu className="text-white" size={18} />
                            <span className="text-white/90 font-black uppercase tracking-wider text-xs md:text-sm">
                                Transformação digital no SUS
                            </span>
                        </div>

                        <h2 className="text-4xl md:text-7xl font-black text-white leading-tight">
                            A gestão em saúde entrou em uma nova era, com dados, integração e serviço digital como{" "}
                            <span className="inline-block bg-white text-black px-4 rounded-xl">
                                parte do cuidado
                            </span>
                            .
                        </h2>

                        <p className="mt-6 text-white/75 text-lg md:text-2xl font-semibold max-w-4xl mx-auto">
                            O gestor que entende isso ganha velocidade, previsibilidade e capacidade real de priorizar.
                        </p>
                    </motion.div>

                    <motion.div style={{ opacity: opacity2, x: x2 }} className="absolute text-center max-w-6xl">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/5 mb-8">
                            <ShieldCheck className="text-white" size={18} />
                            <span className="text-white/90 font-black uppercase tracking-wider text-xs md:text-sm">
                                SUS Digital como caminho
                            </span>
                        </div>

                        <h2 className="text-4xl md:text-7xl font-black text-white leading-tight">
                            O programa <span style={{ background: GRADIENT, WebkitBackgroundClip: "text", color: "transparent" }}>SUS Digital</span>{" "}
                            organiza a transformação com três eixos: formação, soluções e dados.
                        </h2>

                        <p className="mt-6 text-white/75 text-lg md:text-2xl font-semibold max-w-4xl mx-auto">
                            Cultura e educação permanente, soluções e serviços digitais, interoperabilidade, análise e disseminação de informações.
                        </p>
                    </motion.div>

                    <motion.div style={{ opacity: opacity3, y: y3 }} className="absolute text-center max-w-6xl">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/5 mb-8">
                            <Users className="text-white" size={18} />
                            <span className="text-white/90 font-black uppercase tracking-wider text-xs md:text-sm">
                                Minas Gerais em execução
                            </span>
                        </div>

                        <h2 className="text-4xl md:text-7xl font-black text-white leading-tight">
                            Em Minas, a Saúde Digital deixa de ser discurso e vira{" "}
                            <span className="inline-block bg-white text-black px-4 rounded-xl">
                                entrega no território
                            </span>
                            .
                        </h2>

                        <p className="mt-6 text-white/75 text-lg md:text-2xl font-semibold max-w-4xl mx-auto">
                            O foco é o cidadão no centro do cuidado, com gestão baseada em evidências, padronização e uso racional de recursos.
                        </p>
                    </motion.div>

                    <motion.div style={{ opacity: opacity4, scale: scale4 }} className="absolute text-center max-w-6xl">
                        <motion.div
                            animate={{ rotate: [0, 7, -7, 0] }}
                            transition={{ duration: 5, repeat: Infinity }}
                            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-8"
                            style={{ background: GRADIENT_SOFT, border: "1px solid rgba(255,255,255,0.12)" }}
                        >
                            <LayoutDashboard size={38} className="text-white" />
                        </motion.div>

                        <h2 className="text-5xl md:text-[7rem] font-black text-white uppercase leading-none tracking-tighter">
                            Entregas que você usa agora
                        </h2>

                        <p className="mt-6 text-white/75 text-xl md:text-3xl font-semibold">
                            Planejamento Local, Curso de Saúde Digital, BI e o próprio Radar como motor de execução.
                        </p>
                    </motion.div>
                </div>
            </div>
        </motion.section>
    );
};

interface DeliveryContent {
    id: string;
    title: string;
    icon: React.ElementType;
    subtitle: string;
    bullets: string[];
    howToUse: string[];
    badge: string;
    highlight?: {
        type: string;
        title: string;
        url: string;
        img: string;
        label: string;
        icon: React.ElementType;
        buttonText: string;
    };
}

const DeliveryCard = ({ index, title, desc, icon: Icon, tag, active, onClick }: {
    index: number;
    title: string;
    desc: string;
    icon: React.ElementType;
    tag?: string;
    active: boolean;
    onClick: () => void;
}) => (
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
            opacity: 1
        }}
        whileTap={{ scale: 0.98 }}
    >
        <div
            className="absolute top-6 right-8 text-6xl font-black tracking-tighter opacity-5 pointer-events-none select-none transition-opacity group-hover:opacity-10"
            style={{ color: COLORS.ink }}
        >
            0{index + 1}
        </div>

        {active && (
            <motion.div
                layoutId="active-indicator"
                className="hidden md:flex absolute -right-6 top-1/2 -translate-y-1/2 z-20 items-center justify-center"
            >
                <div className="bg-black text-white p-2 rounded-full shadow-xl">
                    <ArrowRight size={24} />
                </div>
            </motion.div>
        )}

        <div className="flex items-start justify-between gap-4 relative z-10">
            <div>
                <div className="flex items-center gap-3">
                    <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-300"
                        style={{
                            background: active ? GRADIENT : "rgba(0,0,0,0.05)",
                            borderColor: active ? "rgba(0,0,0,1)" : "rgba(0,0,0,0.1)",
                            transform: "rotate(0deg)"
                        }}
                    >
                        <Icon size={22} className={active ? "text-black" : "text-gray-500 group-hover:text-black"} />
                    </div>
                    <div className={`font-black text-xl md:text-2xl transition-colors ${active ? "text-black" : "text-gray-600 group-hover:text-black"}`}>
                        {title}
                    </div>
                </div>
                <p className={`mt-3 text-base md:text-lg font-semibold transition-opacity ${active ? "opacity-90 text-black" : "opacity-60 text-gray-700"}`}>
                    {desc}
                </p>
            </div>

            {tag ? (
                <span
                    className="shrink-0 px-3 py-2 rounded-full text-xs font-black uppercase tracking-wider border transition-colors hidden sm:inline-block"
                    style={{
                        background: active ? "rgba(0,0,0,0.06)" : "transparent",
                        borderColor: "rgba(0,0,0,0.15)",
                        color: active ? COLORS.ink : "#888"
                    }}
                >
                    {tag}
                </span>
            ) : null}
        </div>
    </motion.button>
);

const Deliveries = () => {
    const [active, setActive] = useState("radar");

    const content: DeliveryContent = useMemo(() => {
        const map: Record<string, DeliveryContent> = {
            radar: {
                id: "radar",
                title: "Radar Minas Digital",
                icon: LayoutDashboard,
                subtitle: "Seu software de planejamento digital, do diagnóstico até a execução e o monitoramento.",
                bullets: [
                    "Transforma diretriz em plano, e plano em rotina de gestão com rastreabilidade.",
                    "Centraliza ações, responsáveis, prazos e evidências, reduzindo retrabalho e ruído.",
                    "Conecta Planejamento Local, capacitação e BI em uma trilha única para o gestor.",
                ],
                howToUse: [
                    "Entrar, selecionar território e etapa (diagnóstico, plano, execução).",
                    "Gerar prioridades, registrar decisões e anexar evidências.",
                    "Acompanhar evolução com BI e indicadores, com visão para equipe e liderança.",
                ],
                badge: "Produto",
            },
            planejl: {
                id: "planejl",
                title: "Planejamento Local",
                icon: MapPin,
                subtitle: "Encontros técnicos e colaborativos para apoiar planos locais de Saúde Digital no território.",
                bullets: [
                    "Organiza prioridades do território com visão técnica e governança prática.",
                    "Aproxima município, regional e nível central, com alinhamento e pactuação.",
                    "Gera plano de ação com metas claras, cronograma e acompanhamento contínuo.",
                ],
                howToUse: [
                    "Registrar a agenda, participantes e decisões por encontro.",
                    "Converter demandas em ações e metas, com responsáveis e prazos.",
                    "Acompanhar execução no Radar e monitorar resultados no BI.",
                ],
                badge: "Território",
                highlight: {
                    type: "news",
                    title: "Planejamento Local fortalece transformação digital na saúde pública",
                    url: "https://www.saude.mg.gov.br/noticias/planejamento-local-fortalece-transformacao-digital-na-saude-publica-de-minas-gerais/",
                    img: "logos/locall.jpg",
                    label: "Destaque na Mídia",
                    icon: Newspaper,
                    buttonText: "Ler matéria"
                }
            },
            curso: {
                id: "curso",
                title: "Curso Saúde Digital",
                icon: GraduationCap,
                subtitle: "Capacitação objetiva para gestão e assistência, com base no ecossistema da Saúde Digital no SUS.",
                bullets: [
                    "Apresenta fundamentos e aplicações no SUS, com foco em governança e execução.",
                    "Aborda estratégia, Telessaúde, interoperabilidade, RNDS e e-SUS APS como contexto de sistema.",
                    "Certificação por desempenho, formando gestores prontos para decidir e implementar.",
                    "Parceria estratégica com a FIOCRUZ para expansão da grade e novos módulos em breve.",
                ],
                howToUse: [
                    "Indicar para equipe (gestão, APS, regulação, vigilância).",
                    "Usar como pré-requisito para Planejamento Local e implantação de rotinas digitais.",
                    "Manter trilha de formação contínua, com registros no Radar.",
                ],
                badge: "Formação",
                highlight: {
                    type: "course",
                    title: "Acesse os cursos de Saúde Digital disponíveis no AVA",
                    url: "https://ava.saude.mg.gov.br/course/index.php?categoryid=31",
                    img: "logos/cursosaude.png",
                    label: "Capacitação",
                    icon: GraduationCap,
                    buttonText: "Acessar AVA"
                }
            },
            bi: {
                id: "bi",
                title: "Do plano para o resultado",
                icon: BarChart3,
                subtitle: "Radar fecha o ciclo, mostra evolução e orienta correção de rota com dados.",
                bullets: [
                    "Dá visibilidade para gestão local e regional, apoiando tomada de decisão.",
                    "Permite acompanhar execução, maturidade e gargalos, com linguagem de gestão.",
                    "Fecha o ciclo: planejar, executar, medir, ajustar, repetir.",
                ],
                howToUse: [
                    "Abrir painéis para diagnóstico rápido e definição de prioridade.",
                    "Acompanhar indicadores ao longo do plano, com revisão periódica.",
                    "Usar evidência no diálogo com equipe, regional e liderança.",
                ],
                badge: "Evidência",
                highlight: {
                    type: "dashboard",
                    title: "Visualize os indicadores de Saúde Digital do estado",
                    url: "https://info.saude.mg.gov.br/15/paineis/72",
                    img: "logos/bi.png",
                    label: "Observatório de Dados",
                    icon: Activity,
                    buttonText: "Abrir Painéis"
                }
            },
        };
        return map[active];
    }, [active]);

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
                    Uma jornada integrada que une Planejamento Local, Capacitação e BI ao Radar, transformando estratégia em execução e resultados práticos.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center justify-center gap-2 mt-8 text-sm font-bold uppercase tracking-widest opacity-50"
                >
                    <MousePointerClick size={16} />
                    <span>Selecione abaixo para ver detalhes</span>
                </motion.div>

                <div className="mt-8 grid md:grid-cols-2 gap-6 md:gap-8 items-start">
                    <div className="grid gap-4">
                        <DeliveryCard
                            index={0}
                            title="Radar Minas Digital"
                            desc="O ambiente de execução: planejar, organizar e acompanhar."
                            icon={LayoutDashboard}
                            tag="Produto"
                            active={active === "radar"}
                            onClick={() => setActive("radar")}
                        />
                        <DeliveryCard
                            index={1}
                            title="Planejamento Local"
                            desc="Pactuação técnica no território, virando plano e cronograma."
                            icon={MapPin}
                            tag="Território"
                            active={active === "planejl"}
                            onClick={() => setActive("planejl")}
                        />
                        <DeliveryCard
                            index={2}
                            title="Curso Saúde Digital"
                            desc="Formação rápida para gestores e equipes, com foco em implementação."
                            icon={GraduationCap}
                            tag="Formação"
                            active={active === "curso"}
                            onClick={() => setActive("curso")}
                        />
                        <DeliveryCard
                            index={3}
                            title="BI e monitoramento"
                            desc="Painéis para evidência, priorização e cobrança de execução."
                            icon={BarChart3}
                            tag="Evidência"
                            active={active === "bi"}
                            onClick={() => setActive("bi")}
                        />
                    </div>

                    <div className="sticky top-10">
                        <motion.div
                            key={active}
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
                                <content.icon size={400} className="text-slate-900/5" />
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
                                    <h3 className="text-2xl md:text-3xl font-black text-slate-900 leading-none">{content.title}</h3>
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
                                        {content.bullets.map((p, i) => (
                                            <li key={i} className="flex gap-2 text-slate-600 text-xs md:text-sm font-medium leading-snug">
                                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 bg-blue-400" />
                                                <span>{p}</span>
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
                                        {content.howToUse.map((p, i) => (
                                            <li key={i} className="flex gap-2 text-slate-600 text-xs md:text-sm font-medium leading-snug">
                                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 bg-teal-400" />
                                                <span>{p}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* CARD DE DESTAQUE COMPACTO */}
                            {content.highlight && (
                                <div className="mt-6 relative group/card">
                                    <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs font-black uppercase tracking-wider">
                                        <content.highlight.icon size={12} />
                                        <span>{content.highlight.label}</span>
                                    </div>

                                    <a
                                        href={content.highlight.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block relative w-full h-32 md:h-40 rounded-2xl overflow-hidden border-[4px] border-white shadow-xl transition-all hover:scale-[1.02] hover:shadow-2xl"
                                    >
                                        {/* Imagem de Fundo */}
                                        <img
                                            src={content.highlight.img}
                                            alt={content.highlight.title}
                                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110"
                                        />

                                        {/* Gradiente Overlay para Leitura */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/40 to-transparent opacity-90" />

                                        {/* Conteúdo Sobreposto */}
                                        <div className="absolute inset-0 p-4 flex flex-row items-center justify-between gap-4">
                                            <div className="max-w-[65%]">
                                                <h4 className="text-white font-bold leading-tight text-sm md:text-base drop-shadow-md line-clamp-3">
                                                    {content.highlight.title}
                                                </h4>
                                            </div>

                                            {/* Botão "No Quadrado" (Overlay) */}
                                            <div
                                                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg backdrop-blur-md border border-white/30 bg-white/10 text-white text-[10px] md:text-xs font-black uppercase tracking-wide hover:bg-white hover:text-black transition-all shadow-lg"
                                            >
                                                <span>{content.highlight.buttonText}</span>
                                                <ArrowRight size={14} />
                                            </div>
                                        </div>
                                    </a>
                                </div>
                            )}

                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
};

const WhyNow = () => {
    return (
        <section className="relative py-28 md:py-36 px-6 overflow-hidden" style={{ backgroundColor: COLORS.bgDark }}>
            <GradientBlob className="-top-32 left-10 w-[560px] h-[560px] opacity-25" />
            <GradientBlob className="bottom-[-120px] right-[-120px] w-[680px] h-[680px] opacity-25" />

            <div className="max-w-6xl mx-auto relative z-10">
                <motion.h2
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-4xl md:text-6xl font-black tracking-tight text-center text-white"
                >
                    O recado para o gestor no primeiro acesso
                </motion.h2>

                <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="mt-5 text-center text-lg md:text-2xl font-semibold text-white/75 max-w-4xl mx-auto"
                >
                    Isso não é moda, é capacidade de governar: planejar melhor, executar com rastreabilidade e provar resultado com evidência.
                </motion.p>

                <div className="mt-14 grid lg:grid-cols-3 gap-6 md:gap-8">
                    {[
                        {
                            icon: MapPin,
                            title: "Do território para o plano",
                            desc: "Planejamento Local organiza prioridades reais, reduz improviso e acelera pactuação.",
                        },
                        {
                            icon: GraduationCap,
                            title: "Da equipe para a execução",
                            desc: "Formação dá linguagem comum, evita erros previsíveis e prepara implementação.",
                        },
                        {
                            icon: BarChart3,
                            title: "Do plano para o resultado",
                            desc: "Radar fecha o ciclo, mostra evolução e orienta correção de rota com dados.",
                        },
                    ].map((it, idx) => (
                        <motion.div
                            key={it.title}
                            initial={{ opacity: 0, y: 18 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.06 }}
                            className="p-8 rounded-[2.2rem] border-2"
                            style={{
                                background: "rgba(255,255,255,0.06)",
                                borderColor: "rgba(255,255,255,0.14)",
                                boxShadow: "12px 12px 0px rgba(0,0,0,1)",
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center border" style={{ borderColor: "rgba(255,255,255,0.16)", background: GRADIENT_SOFT }}>
                                    <it.icon className="text-white" size={22} />
                                </div>
                                <h3 className="text-2xl font-black text-white">{it.title}</h3>
                            </div>
                            <p className="mt-4 text-white/80 text-lg font-semibold leading-relaxed">{it.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const AccordionItem = ({ q, a, isOpen, onClick, index }: {
    q: string;
    a: string;
    isOpen: boolean;
    onClick: () => void;
    index: number;
}) => (
    <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.08 }}
        className="mb-4"
    >
        <button
            onClick={onClick}
            className="w-full flex items-center justify-between p-7 md:p-8 rounded-[2rem] border-2 border-black relative overflow-hidden"
            style={{
                background: isOpen
                    ? "linear-gradient(90deg, rgba(24,195,160,0.20), rgba(53,211,255,0.16), rgba(30,107,255,0.14))"
                    : "rgba(255,255,255,0.92)",
            }}
        >
            <span className="text-left text-lg md:text-2xl font-black" style={{ color: COLORS.ink }}>
                {q}
            </span>
            <span className="p-2 rounded-full text-white" style={{ backgroundColor: "#000" }}>
                {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </span>
        </button>

        <motion.div initial={false} animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }} className="overflow-hidden">
            <div
                className="p-7 md:p-8 text-base md:text-lg font-semibold leading-relaxed ml-6 my-3 border-l-4"
                style={{ borderColor: "#000", color: COLORS.ink, background: "rgba(255,255,255,0.78)" }}
            >
                {a}
            </div>
        </motion.div>
    </motion.div>
);

const FAQ = () => {
    const [open, setOpen] = useState(0);
    const faqs = [
        {
            q: "O que o gestor precisa entender sobre Saúde Digital, de forma prática?",
            a: "Que não é um sistema isolado. É um novo jeito de governar o cuidado e a gestão: padronizar informação, reduzir retrabalho, melhorar acesso, decidir com evidência e monitorar execução.",
        },
        {
            q: "Por que o curso de Saúde Digital é importante?",
            a: "Muitos gestores ainda veem 'digital' apenas como TI. O curso muda essa chave: ensina que saúde digital é estratégia de gestão. Sem entender isso, a equipe não usa as ferramentas, o dado não chega e o futuro da saúde não acontece.",
        },
        {
            q: "Onde o SUS Digital entra na história, para convencer quem está começando?",
            a: "Como o caminho estruturado para a transformação: formação, soluções e dados. Isso sinaliza prioridade nacional e ajuda a traduzir intenção em plano com cronograma e indicadores.",
        },
        {
            q: "O que é diferente no Radar Minas Digital?",
            a: "Ele transforma diretriz em rotina de gestão. Em vez de ficar em documentos soltos, ele organiza ações, responsáveis, evidências e monitoramento, conectado ao Planejamento Local, ao curso e ao BI.",
        },
        {
            q: "BI serve para quê, além de mostrar gráfico?",
            a: "Serve para decisão e cobrança de execução. Mostra onde atacar primeiro, o que está evoluindo e o que travou, e dá base para corrigir rota com rapidez e transparência.",
        },
    ];

    return (
        <section
            className="py-28 md:py-36 px-6"
            style={{
                background:
                    "radial-gradient(900px 700px at 20% 20%, rgba(24,195,160,0.12), transparent 60%), radial-gradient(900px 650px at 80% 70%, rgba(30,107,255,0.12), transparent 60%), linear-gradient(180deg, #F7FFFB 0%, #F4FFF9 100%)",
            }}
        >
            <div className="max-w-4xl mx-auto">
                <motion.h2
                    initial={{ opacity: 0, scale: 0.96 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="text-4xl md:text-6xl font-black text-center tracking-tight"
                    style={{ color: COLORS.ink }}
                >
                    Perguntas frequentes
                </motion.h2>

                <div className="mt-14">
                    {faqs.map((f, i) => (
                        <AccordionItem key={i} index={i} q={f.q} a={f.a} isOpen={open === i} onClick={() => setOpen(open === i ? -1 : i)} />
                    ))}
                </div>

                <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                    <PrimaryButton href="https://www.saude.mg.gov.br/saudedigital/">Portal Saúde Digital MG</PrimaryButton>

                </div>
            </div>
        </section>
    );
};

const Footer = ({ onContinue }: { onContinue: () => void }) => (
    <footer className="relative py-24 px-6 pb-40 overflow-hidden" style={{ backgroundColor: COLORS.bgDark }}>
        <div className="absolute inset-0 opacity-10 flex justify-center items-center pointer-events-none">
            <h1 className="text-[18vw] font-black leading-none text-white">MINAS</h1>
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
            <div className="grid md:grid-cols-2 gap-8 items-start">
                <div>
                    <h3 className="text-3xl md:text-4xl font-black text-white tracking-tight">Radar Minas Digital</h3>
                    <p className="mt-4 text-white/70 text-lg font-semibold leading-relaxed max-w-xl">
                        Uma jornada integrada que une Planejamento Local, Capacitação e BI ao Radar, transformando estratégia em execução e resultados práticos.
                    </p>
                </div>

                <div className="space-y-3">
                    <div className="text-white/80 font-black uppercase tracking-wider">Links rápidos</div>
                    <div className="flex flex-wrap gap-3">
                        <SecondaryButton href="https://www.saude.mg.gov.br/saudedigital/">Saúde Digital MG</SecondaryButton>
                        <SecondaryButton href="https://info.saude.mg.gov.br/15/paineis/72">Painéis</SecondaryButton>
                        <SecondaryButton href="https://ava.saude.mg.gov.br/course/index.php?categoryid=31">AVA</SecondaryButton>
                    </div>
                    <div className="mt-4 text-white/55 text-sm font-mono">Suporte: saudedigital@saude.mg.gov.br</div>
                </div>
            </div>

            <div className="mt-8 text-center text-white/45 text-xs md:text-sm font-mono space-y-1">
                <p>SES - Secretaria de Estado de Saúde</p>
                <p>Núcleo de Saúde Digital – SES/GAB/ATI-NSDIGI</p>
            </div>
        </div>
    </footer>
);

// Floating CTA Button - Appears only when scrolled to bottom
const FloatingCTA = ({ onClick, isVisible }: { onClick: () => void; isVisible: boolean }) => {
    if (!isVisible) return null;

    return (
        <div
            className="fixed bottom-0 left-0 right-0 p-4 md:p-6"
            style={{ zIndex: 9999, pointerEvents: 'auto' }}
        >
            <div
                className="max-w-4xl mx-auto p-4 md:p-6 rounded-2xl md:rounded-3xl border-2 border-black flex flex-col md:flex-row items-center justify-between gap-4"
                style={{
                    background: "rgba(255,255,255,0.98)",
                    boxShadow: "0 -10px 40px rgba(0,0,0,0.3), 0 4px 0 rgba(0,0,0,1)"
                }}
            >
                <div className="text-center md:text-left">
                    <p className="text-lg md:text-xl font-black" style={{ color: COLORS.ink }}>
                        Pronto para começar?
                    </p>
                    <p className="text-sm md:text-base font-semibold opacity-70" style={{ color: COLORS.ink }}>
                        Aceite os termos de uso e acesse o Radar
                    </p>
                </div>

                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onClick();
                    }}
                    className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black text-lg cursor-pointer whitespace-nowrap transition-transform hover:scale-105 active:scale-95"
                    style={{
                        color: "#04110C",
                        background: GRADIENT,
                        boxShadow: "6px 6px 0px rgba(0,0,0,1)",
                        border: "2px solid #000",
                        pointerEvents: 'auto',
                        position: 'relative',
                        zIndex: 10000,
                    }}
                >
                    <Sparkles size={20} />
                    Aceitar e Continuar
                    <ArrowRight size={20} />
                </button>
            </div>
        </div>
    );
};

interface LandingOnboardingProps {
    onComplete: () => void;
}

export function LandingOnboarding({ onComplete }: LandingOnboardingProps) {
    const [showFloatingCTA, setShowFloatingCTA] = useState(false);

    // Detectar scroll para mostrar CTA flutuante
    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = (scrollTop / docHeight) * 100;

            // Mostrar quando passou de 70% da página
            setShowFloatingCTA(scrollPercent > 70);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleContinue = () => {
        onComplete();
    };

    return (
        <div className="font-sans antialiased cursor-default" style={{ backgroundColor: COLORS.bgLight }}>
            <NoiseOverlay />

            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
        html { scroll-behavior: smooth; }
        ::selection { background: rgba(30,107,255,0.25); color: #04110C; }

        ::-webkit-scrollbar { width: 12px; }
        ::-webkit-scrollbar-track { background: #06140F; }
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(24,195,160,1), rgba(53,211,255,1), rgba(30,107,255,1));
          border: 3px solid #06140F;
          border-radius: 10px;
        }
      `}</style>

            <Hero onContinue={handleContinue} />
            <StickyStory />
            <Deliveries />
            <WhyNow />
            <FAQ />
            <Footer onContinue={handleContinue} />

            {/* BOTÃO FLUTUANTE - aparece só no final da página */}
            <FloatingCTA onClick={handleContinue} isVisible={showFloatingCTA} />
        </div>
    );
}
