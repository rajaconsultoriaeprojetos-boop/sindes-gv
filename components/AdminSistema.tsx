"use client";

import { useEffect, useState } from "react";
import PainelShell from "@/components/PainelShell";
import type { PapelUsuario } from "@/lib/rbac/roles";

export default function AdminSistema() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<PapelUsuario | null>(null);
  const [flags, setFlags] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void fetch("/api/auth/me").then(async (r) => {
      if (!r.ok) return;
      const me = (await r.json()) as { email?: string; role?: PapelUsuario };
      setEmail(me.email ?? "");
      setRole(me.role ?? null);
    });
    void fetch("/api/admin/sistema")
      .then((r) => r.json())
      .then((d: { flags?: Record<string, boolean> }) => setFlags(d.flags ?? {}))
      .catch(() => undefined);
  }, []);

  return (
    <PainelShell titulo="Sistema" subtitulo="Configuração sensível — apenas superadmin." email={email} role={role}>
      <ul className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <li>
          <span className="font-semibold">Credenciais Google (servidor):</span>{" "}
          {flags.googleCredenciais ? "configuradas" : "ausentes"}
        </li>
        <li>
          <span className="font-semibold">Google Calendar:</span> {flags.googleCalendar ? "ativo" : "não configurado"}
        </li>
        <li>
          <span className="font-semibold">Sincronização Sheets (admin):</span>{" "}
          {flags.sheetsSync ? "ligada" : "desligada ou indisponível"}
        </li>
        <li>
          <span className="font-semibold">Login legado (ADMIN_CODIGO / ASSESSORIA_CODIGO):</span>{" "}
          {flags.legadoCodigos ? "ainda aceito nas APIs" : "não configurado"}
        </li>
      </ul>
      <p className="mt-4 text-xs text-slate-500">Segredos e JSON de serviço nunca aparecem aqui — só no `.env.local` da VPS.</p>
    </PainelShell>
  );
}
