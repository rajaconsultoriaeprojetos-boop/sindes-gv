"use client";

import { useEffect, useState } from "react";
import type { PapelUsuario } from "@/lib/rbac/roles";

type Usuario = {
  id: string;
  email: string;
  role: PapelUsuario;
  status: string;
  precisaConvite?: boolean;
};

export default function GestaoUsuarios() {
  const [lista, setLista] = useState<Usuario[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<PapelUsuario>("juridico");
  const [aviso, setAviso] = useState("");
  const [erro, setErro] = useState("");
  const [ultimoConvite, setUltimoConvite] = useState("");

  async function carregar() {
    const resposta = await fetch("/api/admin/usuarios");
    const dados = (await resposta.json()) as { usuarios?: Usuario[] };
    if (resposta.ok && dados.usuarios) setLista(dados.usuarios);
  }

  useEffect(() => {
    void carregar();
  }, []);

  async function convidar(event: React.FormEvent) {
    event.preventDefault();
    setErro("");
    setAviso("");
    const resposta = await fetch("/api/admin/usuarios", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const dados = (await resposta.json()) as { inviteUrl?: string; erro?: string };
    if (!resposta.ok) {
      setErro(dados.erro ?? "Não foi possível convidar.");
      return;
    }
    setEmail("");
    setUltimoConvite(typeof window !== "undefined" ? `${window.location.origin}${dados.inviteUrl}` : dados.inviteUrl ?? "");
    setAviso("Convite criado. Copie o link e envie ao colaborador.");
    await carregar();
  }

  async function alterar(id: string, patch: { status?: string; role?: PapelUsuario }) {
    await fetch("/api/admin/usuarios", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    await carregar();
  }

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Usuários da equipe</h2>
      <p className="text-sm text-slate-600">Admin cria jurídico e contador. Superadmin não pode ser rebaixado.</p>
      <form onSubmit={convidar} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label className="text-sm font-semibold">E-mail</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" />
        </div>
        <div>
          <label className="text-sm font-semibold">Papel</label>
          <select value={role} onChange={(e) => setRole(e.target.value as PapelUsuario)} className="mt-1 min-h-11 rounded-lg border border-slate-300 px-3">
            <option value="juridico">Jurídico</option>
            <option value="contador">Contador</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button type="submit" className="min-h-11 rounded-lg bg-[#5D25AA] px-4 font-semibold text-white">
          Convidar
        </button>
      </form>
      {erro ? <p className="text-sm text-red-700">{erro}</p> : null}
      {aviso ? <p className="text-sm text-green-800">{aviso}</p> : null}
      {ultimoConvite ? (
        <p className="break-all rounded-lg bg-slate-100 p-3 text-xs">
          Link: {ultimoConvite}
        </p>
      ) : null}
      <ul className="space-y-2">
        {lista.map((u) => (
          <li key={u.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{u.email}</p>
              <p className="text-sm text-slate-600">
                {u.role} · {u.status}
              </p>
            </div>
            {u.role !== "superadmin" ? (
              <div className="flex flex-wrap gap-2">
                {u.status === "ativo" ? (
                  <button type="button" onClick={() => void alterar(u.id, { status: "desabilitado" })} className="rounded border px-2 py-1 text-sm">
                    Desabilitar
                  </button>
                ) : (
                  <button type="button" onClick={() => void alterar(u.id, { status: "ativo" })} className="rounded border px-2 py-1 text-sm">
                    Reativar
                  </button>
                )}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
