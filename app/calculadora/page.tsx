import type { Metadata } from "next";
import { Suspense } from "react";
import CalculadoraProtegida from "./CalculadoraProtegida";

export const metadata: Metadata = {
  title: "Auditoria de rescisão — Assessoria SINDES",
  description: "Ferramenta interna da assessoria para homologação e leitura de TRCT.",
  robots: { index: false, follow: false },
};

function CarregandoCalculadora() {
  return (
    <main className="min-h-dvh bg-[#F8FAFC] px-4 py-16 text-center text-[#0E3A43]">
      <p className="text-sm font-medium">Verificando acesso da assessoria…</p>
    </main>
  );
}

export default function PaginaCalculadora() {
  return (
    <Suspense fallback={<CarregandoCalculadora />}>
      <CalculadoraProtegida />
    </Suspense>
  );
}
