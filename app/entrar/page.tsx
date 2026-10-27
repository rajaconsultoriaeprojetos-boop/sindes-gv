import { Suspense } from "react";
import EntrarForm from "@/components/EntrarForm";

export default function PaginaEntrar() {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-[#F8FAFC] px-4 py-16 text-center">Carregando…</main>}>
      <EntrarForm />
    </Suspense>
  );
}
