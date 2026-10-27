"use client";

import { useRouter } from "next/navigation";
import { btnSecondary } from "@/components/landing/plantao-theme";
import { encerrarSessao } from "@/lib/sair-sessao";

type Props = {
  email?: string;
  redirectTo?: string;
};

export default function ControlesSessao({ email, redirectTo = "/entrar" }: Props) {
  const router = useRouter();

  async function sair() {
    await encerrarSessao();
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
      {email ? (
        <span
          className="max-w-[10rem] truncate text-xs font-medium text-[#0E3A43]/70 sm:max-w-[14rem] sm:text-sm"
          title={email}
        >
          {email}
        </span>
      ) : null}
      <button type="button" onClick={() => void sair()} className={`${btnSecondary} min-h-10 px-4 py-2 text-sm`}>
        Sair
      </button>
    </div>
  );
}
