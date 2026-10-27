"use client";

import { useEffect, useRef, useState } from "react";
import ConfirmarBadge from "./ConfirmarBadge";

type Props = {
  valor?: number;
  /** Quando informado, exibe texto fixo (ex.: "100%") sem animação numérica. */
  valorTexto?: string;
  sufixo?: string;
  rotulo: string;
  confirmar?: boolean;
};

function ImpactStatTexto({ valorTexto, rotulo, confirmar }: Pick<Props, "valorTexto" | "rotulo" | "confirmar">) {
  return (
    <div className="text-center">
      <p className="flex flex-wrap items-center justify-center gap-2 text-3xl font-bold tracking-tight text-[#0E3A43] sm:text-4xl">
        {valorTexto}
        {confirmar ? <ConfirmarBadge /> : null}
      </p>
      <p className="mt-2 text-sm font-medium leading-snug text-[#0E3A43]/70">{rotulo}</p>
    </div>
  );
}

function ImpactStatAnimado({ valor, sufixo, rotulo, confirmar }: Required<Pick<Props, "valor" | "sufixo" | "rotulo" | "confirmar">>) {
  const ref = useRef<HTMLDivElement>(null);
  const [display, setDisplay] = useState(0);
  const [animar, setAnimar] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setAnimar(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    if (reduced) setDisplay(valor);
    return () => obs.disconnect();
  }, [valor]);

  useEffect(() => {
    if (!animar) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDisplay(valor);
      return;
    }
    const inicio = performance.now();
    const duracao = 1200;
    let frame = 0;
    function tick(agora: number) {
      const t = Math.min(1, (agora - inicio) / duracao);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(valor * ease));
      if (t < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [animar, valor]);

  return (
    <div ref={ref} className="text-center">
      <p className="flex flex-wrap items-center justify-center gap-2 text-3xl font-bold tabular-nums tracking-tight text-[#0E3A43] sm:text-4xl">
        {display.toLocaleString("pt-BR")}
        {sufixo}
        {confirmar ? <ConfirmarBadge /> : null}
      </p>
      <p className="mt-2 text-sm font-medium leading-snug text-[#0E3A43]/70">{rotulo}</p>
    </div>
  );
}

export default function ImpactStat(props: Props) {
  const { valorTexto, valor = 0, sufixo = "", rotulo, confirmar = false } = props;
  if (valorTexto) return <ImpactStatTexto valorTexto={valorTexto} rotulo={rotulo} confirmar={confirmar} />;
  return <ImpactStatAnimado valor={valor} sufixo={sufixo} rotulo={rotulo} confirmar={confirmar} />;
}
