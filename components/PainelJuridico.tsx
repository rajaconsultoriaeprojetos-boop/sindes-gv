"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ListaAgendamentos from "@/components/ListaAgendamentos";
import PainelShell from "@/components/PainelShell";
import type { PapelUsuario } from "@/lib/rbac/roles";
import { ROTULO_TIPO_AGENDAMENTO } from "@/lib/tipos-agendamento";

type Agendamento = {
  id: string;
  inicio: string;
  nome: string;
  telefone: string;
  assunto?: string;
  servicoId?: string;
  googleMeetLink?: string;
  tipo: keyof typeof ROTULO_TIPO_AGENDAMENTO;
};

export default function PainelJuridico() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<PapelUsuario | null>(null);
  const [itens, setItens] = useState<Agendamento[]>([]);

  useEffect(() => {
    void fetch("/api/auth/me")
      .then(async (r) => {
        if (!r.ok) return;
        const me = (await r.json()) as { email?: string; role?: PapelUsuario };
        setEmail(me.email ?? "");
        setRole(me.role ?? null);
      })
      .then(() =>
        fetch("/api/agendamentos")
          .then((r) => r.json())
          .then((d: { agendamentos?: Agendamento[] }) => setItens(d.agendamentos ?? [])),
      );
  }, []);

  return (
    <PainelShell titulo="Painel jurídico" subtitulo="Atendimentos jurídicos agendados e consultas por Google Meet." email={email} role={role}>
      <ListaAgendamentos autenticado />
      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">Videoatendimento jurídico (Google Meet)</h2>
        <p className="text-sm text-slate-600">Use o link do Google Meet após validar os documentos do trabalhador. Chat e notas ficam na página do atendimento.</p>
        <ul className="space-y-2">
          {itens
            .filter((a) => a.tipo === "juridico")
            .map((a) => (
              <li key={a.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="font-medium">{a.nome}</p>
                <p className="text-sm text-slate-600">{new Date(a.inicio).toLocaleString("pt-BR")}</p>
                <div className="mt-2 flex flex-wrap gap-4">
                  {a.googleMeetLink ? (
                    <a
                      href={a.googleMeetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex text-sm font-semibold text-[#5D25AA]"
                    >
                      Abrir Google Meet
                    </a>
                  ) : (
                    <p className="text-xs text-slate-500">Link do Meet disponível após confirmar agendamento na agenda.</p>
                  )}
                  {a.servicoId ? (
                    <Link href={`/atendimento/${a.servicoId}?como=assessoria`} className="inline-flex text-sm font-semibold text-[#5D25AA]">
                      Chat e notas
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
        </ul>
      </section>
    </PainelShell>
  );
}
