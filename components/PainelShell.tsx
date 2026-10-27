"use client";

import Link from "next/link";
import ControlesSessao from "@/components/ControlesSessao";
import { PLANTAO } from "@/components/landing/plantao-theme";
import type { PapelUsuario } from "@/lib/rbac/roles";

type Props = {
  titulo: string;
  subtitulo?: string;
  role?: PapelUsuario | null;
  email?: string;
  children: React.ReactNode;
};

export default function PainelShell({ titulo, subtitulo, role, email, children }: Props) {
  const links: { href: string; rotulo: string; papeis: PapelUsuario[] }[] = [
    { href: "/admin", rotulo: "Admin", papeis: ["superadmin", "admin"] },
    { href: "/juridico", rotulo: "Jurídico", papeis: ["superadmin", "admin", "juridico"] },
    { href: "/contador", rotulo: "Contador", papeis: ["superadmin", "admin", "contador"] },
    { href: "/calculadora", rotulo: "Calculadora", papeis: ["superadmin", "admin", "contador"] },
    { href: "/assessoria", rotulo: "Assessoria", papeis: ["superadmin", "admin", "juridico"] },
    { href: "/admin/sistema", rotulo: "Sistema", papeis: ["superadmin"] },
  ];

  const nav =
    role &&
    links
      .filter((l) => l.papeis.includes(role) || role === "superadmin")
      .map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="inline-flex min-h-10 items-center rounded-xl border border-[rgba(14,58,67,0.18)] bg-white/80 px-3 text-sm font-semibold text-[#0E3A43] transition hover:border-[#1F8A70] hover:text-[#1F8A70]"
        >
          {l.rotulo}
        </Link>
      ));

  return (
    <main className="min-h-dvh bg-[#F7FAF9] text-[#0E3A43]">
      <header
        className="border-b backdrop-blur-md"
        style={{ borderColor: PLANTAO.border, backgroundColor: "rgba(255,255,255,0.85)" }}
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0E3A43]">
              <img src="/sindes-logo.png" alt="" width={32} height={32} className="h-8 w-8 rounded-lg object-contain" />
              SINDES
            </Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{titulo}</h1>
            {subtitulo ? <p className="mt-1 text-sm text-[#0E3A43]/75">{subtitulo}</p> : null}
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
            {nav ? <div className="flex flex-wrap gap-2">{nav}</div> : null}
            <ControlesSessao email={email} />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
    </main>
  );
}
