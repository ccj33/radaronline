import { Cpu, LayoutDashboard, ShieldCheck, Users } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

import { GRADIENT, GRADIENT_SOFT } from "../landingOnboarding.constants";

export function LandingStickyStory() {
    const ref = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

    const opacity1 = useTransform(scrollYProgress, [0, 0.22, 0.3], [1, 1, 0]);
    const scale1 = useTransform(scrollYProgress, [0, 0.3], [1, 0.88]);
    const blur1 = useTransform(scrollYProgress, [0.2, 0.3], ["0px", "10px"]);

    const opacity2 = useTransform(scrollYProgress, [0.3, 0.42, 0.62], [0, 1, 0]);
    const y2 = useTransform(scrollYProgress, [0.3, 0.42, 0.62], [50, 0, -50]);

    const opacity3 = useTransform(scrollYProgress, [0.62, 0.72, 0.88], [0, 1, 0]);
    const y3 = useTransform(scrollYProgress, [0.62, 0.72, 0.88], [50, 0, -50]);

    const opacity4 = useTransform(scrollYProgress, [0.88, 0.95, 1], [0, 1, 1]);
    const scale4 = useTransform(scrollYProgress, [0.88, 1], [0.85, 1]);

    const background = useTransform(scrollYProgress, [0, 0.5, 1], ["#06140F", "#06201A", "#06140F"]);
    const rotation = useTransform(scrollYProgress, [0, 1], [0, 160]);

    return (
        <motion.section ref={ref} id="story" className="relative h-[460vh]" style={{ backgroundColor: background }}>
            <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
                <motion.div style={{ rotate: rotation }} className="absolute w-[160vw] h-[160vw] rounded-[42%]">
                    <div className="w-full h-full rounded-[42%]" style={{ border: "2px solid rgba(255,255,255,0.06)" }} />
                </motion.div>

                <div className="absolute left-6 md:left-10 top-1/2 -translate-y-1/2 h-80 w-2 bg-white/10 rounded-full overflow-hidden hidden md:block">
                    <motion.div style={{ scaleY: scrollYProgress, originY: 0 }} className="w-full h-full">
                        <div
                            className="w-full h-full"
                            style={{
                                background:
                                    "linear-gradient(180deg, rgba(24,195,160,1), rgba(53,211,255,1), rgba(30,107,255,1))",
                            }}
                        />
                    </motion.div>
                </div>

                <div className="w-full h-full flex items-center justify-center relative px-6">
                    <motion.div style={{ opacity: opacity1, scale: scale1, filter: blur1 }} className="absolute text-center max-w-6xl">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/5 mb-8">
                            <Cpu className="text-white" size={18} />
                            <span className="text-white/90 font-black uppercase tracking-wider text-xs md:text-sm">
                                Transformação digital no SUS
                            </span>
                        </div>

                        <h2 className="text-4xl md:text-7xl font-black text-white leading-tight">
                            A gestão em saúde entrou em uma nova era, com dados, integração e serviço digital como{" "}
                            <span className="inline-block bg-white text-black px-3 pt-0 pb-0.5 rounded-lg align-middle leading-none mx-1">
                                parte do cuidado
                            </span>
                            .
                        </h2>

                        <p className="mt-6 text-white/75 text-lg md:text-2xl font-semibold max-w-4xl mx-auto">
                            O gestor que entende isso ganha velocidade, previsibilidade e capacidade real de priorizar.
                        </p>
                    </motion.div>

                    <motion.div style={{ opacity: opacity2, y: y2 }} className="absolute text-center max-w-6xl">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/5 mb-8">
                            <ShieldCheck className="text-white" size={18} />
                            <span className="text-white/90 font-black uppercase tracking-wider text-xs md:text-sm">
                                SUS Digital como caminho
                            </span>
                        </div>

                        <h2 className="text-4xl md:text-7xl font-black text-white leading-tight">
                            O programa{" "}
                            <span style={{ background: GRADIENT, WebkitBackgroundClip: "text", color: "transparent" }}>
                                SUS Digital
                            </span>{" "}
                            organiza a transformação com três eixos: formação, soluções e dados.
                        </h2>

                        <p className="mt-6 text-white/75 text-lg md:text-2xl font-semibold max-w-4xl mx-auto">
                            Cultura e educação permanente, soluções e serviços digitais, interoperabilidade, análise e
                            disseminação de informações.
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
                            <span className="inline-block bg-white text-black px-3 pt-0 pb-0.5 rounded-lg align-middle leading-none mx-1">
                                entrega no território
                            </span>
                            .
                        </h2>

                        <p className="mt-6 text-white/75 text-lg md:text-2xl font-semibold max-w-4xl mx-auto">
                            O foco é o cidadão no centro do cuidado, com gestão baseada em evidências, padronização e uso
                            racional de recursos.
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
}
