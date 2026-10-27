import type { Metadata } from "next";
import { Suspense } from "react";
import PortalTrabalhador from "@/components/PortalTrabalhador";

export const metadata: Metadata = {
  title: "Portal do Trabalhador — SINDES",
  description: "Agende atendimento jurídico, presencial, retirada de voucher ou homologação de rescisão.",
};

function CarregandoPortal() {
  return (
    <main className="min-h-dvh bg-[#F8FAFC] px-4 py-16 text-center">
      <p className="text-sm font-medium text-[#1D0D2C]">Carregando portal…</p>
    </main>
  );
}

export default function PaginaPortal() {
  return (
    <Suspense fallback={<CarregandoPortal />}>
      <PortalTrabalhador />
    </Suspense>
  );
}
