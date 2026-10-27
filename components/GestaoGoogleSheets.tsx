"use client";

import { useEffect, useState, type FormEvent } from "react";

type Estado = {
  credenciaisConfiguradas: boolean;
  spreadsheetId: string;
  syncEnabled: boolean;
  lastError: string;
  lastSyncAt: string;
  calendarConfigurado?: boolean;
  calendarId?: string;
  lastCalendarError?: string;
  lastCalendarSyncAt?: string;
  oauthClienteConfigurado?: boolean;
  oauthConectado?: boolean;
  calendarMeetConfigurado?: boolean;
  oauthRedirectUri?: string;
};

function hora(iso: string) {
  if (!iso) return "—";
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(data);
}

export default function GestaoGoogleSheets() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [planilha, setPlanilha] = useState("");
  const [aviso, setAviso] = useState("");
  const [testando, setTestando] = useState(false);
  const [conectandoOAuth, setConectandoOAuth] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/sheets")
      .then((r) => r.json())
      .then((d: Estado) => {
        setEstado(d);
        setPlanilha(d.spreadsheetId ?? "");
      })
      .catch(() => setEstado(null));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const resultado = params.get("google_oauth");
    if (!resultado) return;
    if (resultado === "ok") {
      setAviso("Google Calendar (OAuth) conectado. Agendamentos jurídicos passam a gerar Google Meet.");
    } else {
      setAviso("Não foi possível concluir a conexão OAuth. Tente novamente ou use o script no servidor.");
    }
    params.delete("google_oauth");
    params.delete("motivo");
    const nova = params.toString();
    window.history.replaceState({}, "", nova ? `?${nova}` : window.location.pathname);
    void fetch("/api/admin/sheets")
      .then((r) => r.json())
      .then((d: Estado) => setEstado(d))
      .catch(() => undefined);
  }, []);

  async function salvar(parcial: Partial<Estado>) {
    const resposta = await fetch("/api/admin/sheets", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parcial),
    });
    const dados = (await resposta.json()) as Estado;
    setEstado(dados);
    setPlanilha(dados.spreadsheetId);
  }

  async function testar(event: FormEvent) {
    event.preventDefault();
    setTestando(true);
    setAviso("");
    try {
      const resposta = await fetch("/api/admin/sheets/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ spreadsheetId: planilha.trim() }),
      });
      const dados = (await resposta.json()) as { ok?: boolean; erro?: string };
      if (!resposta.ok || !dados.ok) {
        setAviso(dados.erro ?? "Não foi possível conectar.");
        return;
      }
      setAviso("Conexão com a planilha confirmada.");
      await salvar({ spreadsheetId: planilha.trim() });
    } finally {
      setTestando(false);
    }
  }

  async function conectarCalendarOAuth() {
    setConectandoOAuth(true);
    setAviso("");
    try {
      const resposta = await fetch("/api/admin/google-oauth", { method: "POST" });
      const dados = (await resposta.json()) as { url?: string; erro?: string };
      if (!resposta.ok || !dados.url) {
        setAviso(dados.erro ?? "Não foi possível iniciar a conexão OAuth.");
        return;
      }
      window.location.href = dados.url;
    } finally {
      setConectandoOAuth(false);
    }
  }

  if (!estado) {
    return <p className="mt-3 text-base">Carregando integração com Google Sheets...</p>;
  }

  return (
    <section>
      <h2 className="text-2xl font-semibold">Google (Sheets e Calendar)</h2>
      <p className="mt-2 text-base leading-7 text-slate-600">
        Planilha: pedidos, trabalhadores e agendamentos (conta de serviço). Calendário: eventos ao confirmar horário no
        portal. Atendimento jurídico com Google Meet exige OAuth da conta sindesgvoficial@gmail.com.
      </p>
      {estado.calendarConfigurado ? (
        <p className="mt-2 text-sm text-slate-600">
          Calendário ativo: <span className="font-medium">{estado.calendarId}</span> · último evento:{" "}
          {hora(estado.lastCalendarSyncAt ?? "")}
        </p>
      ) : estado.credenciaisConfiguradas ? (
        <p className="mt-2 text-sm text-amber-900">
          Defina <code className="text-xs">GOOGLE_CALENDAR_ID</code> no servidor (ex.: sindesgvoficial@gmail.com) e
          compartilhe o calendário com a conta de serviço.
        </p>
      ) : null}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-lg font-semibold">Google Calendar + Meet (OAuth)</h3>
        {estado.calendarMeetConfigurado ? (
          <p className="mt-2 text-sm text-green-900">Conectado — agendamentos jurídicos geram link Google Meet.</p>
        ) : estado.oauthConectado ? (
          <p className="mt-2 text-sm text-amber-900">Refresh token presente, mas faltam client ID/secret no servidor.</p>
        ) : estado.oauthClienteConfigurado ? (
          <p className="mt-2 text-sm text-slate-600">
            Cliente OAuth configurado. Conecte uma vez com a conta <strong>sindesgvoficial@gmail.com</strong>.
          </p>
        ) : (
          <p className="mt-2 text-sm text-amber-900">
            Configure <code className="text-xs">GOOGLE_OAUTH_CLIENT_ID</code> e{" "}
            <code className="text-xs">GOOGLE_OAUTH_CLIENT_SECRET</code> no servidor, ou rode{" "}
            <code className="text-xs">node scripts/google-oauth-setup.mjs</code> na VPS.
          </p>
        )}
        {estado.oauthRedirectUri ? (
          <p className="mt-1 text-xs text-slate-500">
            Redirect URI (cadastre no Google Cloud): {estado.oauthRedirectUri}
          </p>
        ) : null}
        <button
          type="button"
          disabled={conectandoOAuth || !estado.oauthClienteConfigurado}
          onClick={() => void conectarCalendarOAuth()}
          className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg border border-[#5D25AA] bg-white px-4 text-base font-semibold text-[#5D25AA] disabled:opacity-50"
        >
          {conectandoOAuth ? "Abrindo Google..." : "Conectar Google Calendar (OAuth)"}
        </button>
      </div>
      {estado.lastCalendarError ? (
        <p className="mt-2 text-sm font-medium text-red-700" role="alert">
          Calendar: {estado.lastCalendarError}
        </p>
      ) : null}
      {!estado.credenciaisConfiguradas ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-950">
          As credenciais do Google ainda não estão no servidor. Os pedidos continuam funcionando sem sincronizar.
        </p>
      ) : null}
      <form className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-white p-4" onSubmit={testar}>
        <div>
          <label htmlFor="planilha-id" className="text-base font-semibold">
            ID da planilha
          </label>
          <input
            id="planilha-id"
            value={planilha}
            onChange={(event) => setPlanilha(event.target.value)}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base"
            placeholder="Cole o ID da planilha do Google"
          />
        </div>
        <label className="flex items-center gap-3 text-base">
          <input
            type="checkbox"
            checked={estado.syncEnabled}
            onChange={(event) => void salvar({ syncEnabled: event.target.checked })}
          />
          Sincronizar pedidos novos
        </label>
        <p className="text-sm text-slate-600">Última sincronização: {hora(estado.lastSyncAt)}</p>
        {estado.lastError ? (
          <p className="text-sm font-medium text-red-700" role="alert">
            {estado.lastError}
          </p>
        ) : null}
        {aviso ? (
          <p className="text-sm" role="status">
            {aviso}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={testando}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#5D25AA] px-4 text-base font-semibold text-white disabled:opacity-50"
        >
          {testando ? "Testando..." : "Testar conexão"}
        </button>
      </form>
    </section>
  );
}
