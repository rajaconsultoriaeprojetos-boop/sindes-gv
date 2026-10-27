"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function ConviteSenhaForm() {
  const busca = useSearchParams();
  const router = useRouter();
  const token = busca.get("token") ?? "";
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(event: FormEvent) {
    event.preventDefault();
    if (senha !== confirmacao) {
      setErro("As senhas não coincidem.");
      return;
    }
    setEnviando(true);
    setErro("");
    try {
      const resposta = await fetch("/api/auth/convite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, senha }),
      });
      const dados = (await resposta.json().catch(() => null)) as { redirect?: string; erro?: string } | null;
      if (!resposta.ok) {
        setErro(dados?.erro ?? "Convite inválido.");
        return;
      }
      router.push(dados?.redirect ?? "/admin");
    } finally {
      setEnviando(false);
    }
  }

  if (!token) {
    return (
      <main className="min-h-dvh bg-[#F8FAFC] px-4 py-12 text-center">
        <p className="text-base text-red-700">Link de convite incompleto.</p>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#F8FAFC] px-4 py-12">
      <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-semibold">Defina sua senha</h1>
        <p className="mt-2 text-sm text-slate-600">Mínimo de 8 caracteres. Você entrará automaticamente após salvar.</p>
        <form className="mt-6 space-y-4" onSubmit={enviar}>
          <div>
            <label htmlFor="senha" className="block text-sm font-semibold">
              Nova senha
            </label>
            <input
              id="senha"
              type="password"
              minLength={8}
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"
            />
          </div>
          <div>
            <label htmlFor="conf" className="block text-sm font-semibold">
              Confirmar senha
            </label>
            <input
              id="conf"
              type="password"
              minLength={8}
              required
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"
            />
          </div>
          {erro ? <p className="text-sm text-red-700">{erro}</p> : null}
          <button type="submit" disabled={enviando} className="min-h-11 w-full rounded-lg bg-[#5D25AA] font-semibold text-white disabled:opacity-50">
            {enviando ? "Salvando…" : "Ativar conta"}
          </button>
        </form>
      </div>
    </main>
  );
}
