"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ListaAgendamentos from "@/components/ListaAgendamentos";
import PainelShell from "@/components/PainelShell";
import type { PapelUsuario } from "@/lib/rbac/roles";

export default function PainelContador() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<PapelUsuario | null>(null);

  useEffect(() => {
    void fetch("/api/auth/me").then(async (r) => {
      if (!r.ok) return;
      const me = (await r.json()) as { email?: string; role?: PapelUsuario };
      setEmail(me.email ?? "");
      setRole(me.role ?? null);
    });
  }, []);

  return (
    <PainelShell titulo="Painel contador" subtitulo="Homologações de rescisão agendadas pelo portal." email={email} role={role}>
      <ListaAgendamentos autenticado />
      <div className="mt-8 rounded-xl border border-[#5D25AA]/25 bg-[#5D25AA]/5 p-4">
        <p className="font-semibold">Calculadora de homologação</p>
        <p className="mt-1 text-sm text-slate-600">Ferramenta interna para conferência de verbas e TRCT.</p>
        <Link href="/calculadora" className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-[#5D25AA] px-4 text-sm font-semibold text-white">
          Abrir calculadora
        </Link>
      </div>
    </PainelShell>
  );
}
