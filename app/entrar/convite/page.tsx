import { Suspense } from "react";
import ConviteSenhaForm from "@/components/ConviteSenhaForm";

export default function PaginaConvite() {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-[#F8FAFC] px-4 py-16 text-center">Carregando…</main>}>
      <ConviteSenhaForm />
    </Suspense>
  );
}
