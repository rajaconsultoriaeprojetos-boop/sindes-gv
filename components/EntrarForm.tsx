"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

export default function EntrarForm() {
  const busca = useSearchParams();
  const router = useRouter();
  const depois = busca.get("depois") ?? "";
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Navegador preenche autofill sem disparar onChange — sincroniza antes do envio.
  useEffect(() => {
    const sync = () => {
      const elEmail = document.getElementById("email") as HTMLInputElement | null;
      const elSenha = document.getElementById("senha") as HTMLInputElement | null;
      if (elEmail?.value) setEmail(elEmail.value);
      if (elSenha?.value) setSenha(elSenha.value);
    };
    sync();
    const t = window.setTimeout(sync, 200);
    const t2 = window.setTimeout(sync, 800);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(t2);
    };
  }, []);

  async function enviar(event: FormEvent) {
    event.preventDefault();
    setEnviando(true);
    setErro("");
    const elEmail = document.getElementById("email") as HTMLInputElement | null;
    const elSenha = document.getElementById("senha") as HTMLInputElement | null;
    const emailEnvio = (elEmail?.value || email).trim();
    const senhaEnvio = elSenha?.value || senha;
    try {
      const resposta = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email: emailEnvio, senha: senhaEnvio }),
      });
      const dados = (await resposta.json().catch(() => null)) as {
        redirect?: string;
        erro?: string;
      } | null;
      if (!resposta.ok) {
        setErro(dados?.erro ?? "Não foi possível entrar.");
        return;
      }
      const destino = depois || dados?.redirect || "/admin";
      if (destino.startsWith("http")) {
        window.location.assign(destino);
      } else {
        window.location.assign(destino);
      }
    } catch {
      setErro("Falha de rede. Tente de novo ou use https://www.sindesgv.com.br/entrar");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#F8FAFC] px-4 py-12">
      <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#5D25AA]">Equipe SINDES</p>
        <h1 className="mt-2 text-2xl font-semibold">Entrar</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Use o e-mail cadastrado pela administração. Primeiro acesso? Abra o link de convite recebido.
        </p>
        <form className="mt-6 space-y-4" onSubmit={enviar}>
          <div>
            <label htmlFor="email" className="block text-sm font-semibold">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base"
            />
          </div>
          <div>
            <label htmlFor="senha" className="block text-sm font-semibold">
              Senha
            </label>
            <input
              id="senha"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              onInput={(e) => setSenha((e.target as HTMLInputElement).value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base"
            />
          </div>
          {erro ? (
            <p className="text-sm text-red-700" role="alert">
              {erro}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={enviando}
            className="min-h-11 w-full rounded-lg bg-[#FCB065] text-base font-semibold text-[#1D0D2C] disabled:opacity-50"
          >
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          <Link href="/" className="font-medium text-[#5D25AA]">
            Voltar ao site
          </Link>
        </p>
      </div>
    </main>
  );
}
