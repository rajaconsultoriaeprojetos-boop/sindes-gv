"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import CamposValidacaoTrabalhador from "@/components/CamposValidacaoTrabalhador";
import { prepararArquivoTrabalhador } from "@/lib/arquivo-cliente";
import { formatarCpfDigitando } from "@/lib/cpf";
import {
  DESCRICAO_TIPO_AGENDAMENTO,
  ROTULO_TIPO_AGENDAMENTO,
  exigeValidacaoDocumentos,
  tipoAgendamentoValido,
  type TipoAgendamento,
} from "@/lib/tipos-agendamento";

type Parceiro = { id: string; name: string };
type Slot = { inicio: string; fim: string; rotulo: string };

const TIPOS: TipoAgendamento[] = ["juridico", "presencial", "voucher", "homologacao"];
const PASSOS = ["Serviço", "Seus dados", "Horário", "Confirmação"] as const;

export default function PortalTrabalhador() {
  const busca = useSearchParams();
  const tipoInicial = busca.get("tipo");
  const [passo, setPasso] = useState(0);
  const [tipo, setTipo] = useState<TipoAgendamento | null>(
    tipoInicial && tipoAgendamentoValido(tipoInicial) ? tipoInicial : null,
  );

  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [telefone, setTelefone] = useState("");
  const [localTrabalho, setLocalTrabalho] = useState("");
  const [cpf, setCpf] = useState("");
  const [assunto, setAssunto] = useState("");
  const [preferencias, setPreferencias] = useState("");
  const [consentimento, setConsentimento] = useState(false);
  const [contracheque, setContracheque] = useState<File | null>(null);
  const [documento, setDocumento] = useState<File | null>(null);
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [partnerId, setPartnerId] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotEscolhido, setSlotEscolhido] = useState<Slot | null>(null);
  const [carregandoSlots, setCarregandoSlots] = useState(false);
  const [erro, setErro] = useState("");
  const [tentouAvancarDados, setTentouAvancarDados] = useState(false);
  const [errosDocumentos, setErrosDocumentos] = useState<{ contracheque?: string; documento?: string }>({});
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState<{
    inicio: string;
    aguardandoValidacao: boolean;
    googleMeetLink?: string | null;
    tipo?: TipoAgendamento;
  } | null>(null);

  useEffect(() => {
    if (tipo !== "voucher") return;
    void fetch("/api/convenios/parceiros")
      .then((r) => r.json())
      .then((d: { parceiros?: Parceiro[] }) => setParceiros(d.parceiros ?? []))
      .catch(() => setParceiros([]));
  }, [tipo]);

  const carregarSlots = useCallback(async (tipoAtual: TipoAgendamento) => {
    setCarregandoSlots(true);
    setErro("");
    try {
      const resposta = await fetch(`/api/agendamento/slots?tipo=${encodeURIComponent(tipoAtual)}`);
      const dados = (await resposta.json().catch(() => null)) as { slots?: Slot[]; erro?: string } | null;
      if (!resposta.ok) {
        setErro(dados?.erro ?? "Não foi possível carregar horários.");
        setSlots([]);
        return;
      }
      setSlots(dados?.slots ?? []);
    } finally {
      setCarregandoSlots(false);
    }
  }, []);

  useEffect(() => {
    if (passo === 2 && tipo) void carregarSlots(tipo);
  }, [passo, tipo, carregarSlots]);

  useEffect(() => {
    if (contracheque) setErrosDocumentos((atual) => ({ ...atual, contracheque: undefined }));
  }, [contracheque]);

  useEffect(() => {
    if (documento) setErrosDocumentos((atual) => ({ ...atual, documento: undefined }));
  }, [documento]);

  const partnerName = useMemo(
    () => parceiros.find((p) => p.id === partnerId)?.name ?? "",
    [parceiros, partnerId],
  );

  function escolherTipo(novo: TipoAgendamento) {
    setTipo(novo);
    setPasso(1);
    setSlotEscolhido(null);
    setErro("");
    setTentouAvancarDados(false);
    setErrosDocumentos({});
  }

  function validarPassoDados() {
    const docsErro: { contracheque?: string; documento?: string } = {};
    if (!tipo) return "Escolha um serviço.";
    if (!nome.trim() || !cargo.trim() || !telefone.trim() || !localTrabalho.trim()) {
      return "Preencha nome, telefone, cargo e local de trabalho.";
    }
    if (!consentimento) return "Marque o consentimento LGPD para continuar.";
    if (exigeValidacaoDocumentos(tipo)) {
      if (!contracheque) docsErro.contracheque = "Selecione o contracheque para continuar o agendamento.";
      if (!documento) docsErro.documento = "Selecione o documento de identificação para continuar.";
      if (docsErro.contracheque || docsErro.documento) {
        setErrosDocumentos(docsErro);
        return "Envie contracheque e documento com foto para continuar.";
      }
      setErrosDocumentos({});
    }
    if (tipo === "juridico") {
      if (cpf.replace(/\D/g, "").length !== 11) return "Informe um CPF válido.";
      if (!assunto.trim()) return "Descreva o assunto jurídico.";
    }
    if (tipo === "voucher" && !partnerId) return "Escolha o convênio para retirada.";
    if (tipo === "presencial" && !assunto.trim()) return "Informe o assunto do atendimento presencial.";
    if (tipo === "homologacao" && cpf.replace(/\D/g, "").length !== 11) return "Informe CPF para homologação.";
    return "";
  }

  function avancarDados(event: FormEvent) {
    event.preventDefault();
    setTentouAvancarDados(true);
    const msg = validarPassoDados();
    if (msg) {
      setErro(msg);
      return;
    }
    setErro("");
    setPasso(2);
  }

  function passoDadosValido() {
    if (!tipo) return false;
    if (!nome.trim() || !cargo.trim() || !telefone.trim() || !localTrabalho.trim()) return false;
    if (!consentimento) return false;
    if (exigeValidacaoDocumentos(tipo) && (!contracheque || !documento)) return false;
    if (tipo === "juridico") {
      if (cpf.replace(/\D/g, "").length !== 11) return false;
      if (!assunto.trim()) return false;
    }
    if (tipo === "voucher" && !partnerId) return false;
    if (tipo === "presencial" && !assunto.trim()) return false;
    if (tipo === "homologacao" && cpf.replace(/\D/g, "").length !== 11) return false;
    return true;
  }

  async function confirmarAgendamento() {
    if (!tipo || !slotEscolhido || enviando) return;
    setTentouAvancarDados(true);
    const msg = validarPassoDados();
    if (msg) {
      setErro(msg);
      return;
    }
    if (exigeValidacaoDocumentos(tipo) && (!contracheque || !documento)) {
      setErro("Envie contracheque e documento com foto para confirmar.");
      return;
    }
    setEnviando(true);
    setErro("");
    try {
      const formulario = new FormData();
      formulario.set("tipo", tipo);
      formulario.set("slotInicio", slotEscolhido.inicio);
      formulario.set("slotFim", slotEscolhido.fim);
      formulario.set("name", nome.trim());
      formulario.set("cargo", cargo.trim());
      formulario.set("telefone", telefone.replace(/\D/g, ""));
      formulario.set("localTrabalho", localTrabalho.trim());
      formulario.set("preferencias", preferencias.trim());
      formulario.set("consent", "true");
      if (assunto.trim()) formulario.set("subject", assunto.trim());
      if (cpf.trim()) formulario.set("cpf", cpf.replace(/\D/g, ""));
      if (tipo === "voucher") {
        formulario.set("partnerId", partnerId);
        formulario.set("partnerName", partnerName);
      }
      if (exigeValidacaoDocumentos(tipo)) {
        const pay = await prepararArquivoTrabalhador(contracheque!, "contracheque");
        const id = await prepararArquivoTrabalhador(documento!, "documento");
        formulario.set("contracheque", new File([pay.blob], pay.nomeNeutro, { type: pay.blob.type }));
        formulario.set("documento", new File([id.blob], id.nomeNeutro, { type: id.blob.type }));
      }

      const resposta = await fetch("/api/agendamento", { method: "POST", body: formulario });
      const dados = (await resposta.json().catch(() => null)) as {
        inicio?: string;
        aguardandoValidacao?: boolean;
        googleMeetLink?: string | null;
        tipo?: TipoAgendamento;
        erro?: string;
        avisoGoogle?: string | null;
      } | null;
      if (!resposta.ok || !dados?.inicio) {
        setErro(dados?.erro ?? "Não foi possível confirmar o agendamento.");
        if (tipo) void carregarSlots(tipo);
        return;
      }
      setSucesso({
        inicio: dados.inicio,
        aguardandoValidacao: Boolean(dados.aguardandoValidacao),
        googleMeetLink: dados.googleMeetLink ?? null,
        tipo: dados.tipo,
      });
      if (dados.avisoGoogle) setErro("");
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : "Não foi possível confirmar.");
    } finally {
      setEnviando(false);
    }
  }

  const indicePasso = passo;

  return (
    <main className="min-h-dvh bg-[#F8FAFC] text-[#1D0D2C]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
            <img src="/sindes-logo.png" alt="" width={36} height={36} className="h-9 w-9 rounded-lg object-contain" />
            SINDES
          </Link>
          <Link href="/" className="rounded-md text-sm font-medium text-[#5D25AA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5D25AA] focus-visible:ring-offset-2">
            Voltar ao início
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5D25AA]">Portal do trabalhador</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance">Agendar atendimento</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
          Escolha o serviço, informe seus dados e reserve um horário com a equipe do sindicato. Jurídico e voucher exigem
          validação de documentos antes do dia marcado.
        </p>

        {!sucesso ? (
          <>
            <ol className="mt-8 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500" aria-label="Etapas">
              {PASSOS.map((rotulo, i) => (
                <li
                  key={rotulo}
                  className={`rounded-full px-3 py-1 ${i === indicePasso ? "bg-[#5D25AA] text-white" : i < indicePasso ? "bg-[#5D25AA]/15 text-[#5D25AA]" : "bg-slate-200"}`}
                >
                  {i + 1}. {rotulo}
                </li>
              ))}
            </ol>

            {passo === 0 ? (
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {TIPOS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => escolherTipo(item)}
                    className="rounded-xl border border-slate-200 bg-white p-5 text-left transition hover:border-[#5D25AA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5D25AA]"
                  >
                    <p className="text-lg font-semibold">{ROTULO_TIPO_AGENDAMENTO[item]}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{DESCRICAO_TIPO_AGENDAMENTO[item]}</p>
                  </button>
                ))}
              </div>
            ) : null}

            {passo === 1 && tipo ? (
              <form className="mt-8 space-y-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-6" onSubmit={avancarDados} noValidate>
                <p className="text-sm font-semibold text-[#5D25AA]">{ROTULO_TIPO_AGENDAMENTO[tipo]}</p>
                <CamposValidacaoTrabalhador
                  idPrefixo="portal"
                  nome={nome}
                  setNome={setNome}
                  cargo={cargo}
                  setCargo={setCargo}
                  telefone={telefone}
                  setTelefone={setTelefone}
                  localTrabalho={localTrabalho}
                  setLocalTrabalho={setLocalTrabalho}
                  consentimento={consentimento}
                  setConsentimento={setConsentimento}
                  contracheque={contracheque}
                  setContracheque={setContracheque}
                  documento={documento}
                  setDocumento={setDocumento}
                  mostrarDocumentos={exigeValidacaoDocumentos(tipo)}
                  errosDocumentos={tentouAvancarDados ? errosDocumentos : undefined}
                />
                {!exigeValidacaoDocumentos(tipo) ? (
                  <p className="text-sm text-slate-600">
                    Para este serviço não pedimos contracheque aqui; traga documentos no dia se a equipe solicitar.
                  </p>
                ) : null}
                {tipo === "voucher" ? (
                  <div>
                    <label htmlFor="convenio" className="block text-base font-semibold">
                      Convênio
                    </label>
                    <select
                      id="convenio"
                      className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base"
                      value={partnerId}
                      onChange={(e) => setPartnerId(e.target.value)}
                      required
                    >
                      <option value="">Selecione…</option>
                      {parceiros.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                {(tipo === "juridico" || tipo === "presencial" || tipo === "homologacao") && (
                  <div>
                    <label htmlFor="cpf-trabalhador" className="block text-base font-semibold">
                      CPF {tipo === "presencial" ? "(opcional)" : ""}
                    </label>
                    <input
                      id="cpf-trabalhador"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={(event) => setCpf(formatarCpfDigitando(event.target.value))}
                      className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5D25AA]"
                      required={tipo !== "presencial"}
                    />
                  </div>
                )}
                {(tipo === "juridico" || tipo === "presencial") && (
                  <div>
                    <label htmlFor="assunto" className="block text-base font-semibold">
                      Assunto
                    </label>
                    <input
                      id="assunto"
                      className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base"
                      value={assunto}
                      maxLength={280}
                      onChange={(event) => setAssunto(event.target.value)}
                      required
                    />
                  </div>
                )}
                <div>
                  <label htmlFor="preferencias" className="block text-base font-semibold">
                    Preferências ou observações (opcional)
                  </label>
                  <textarea
                    id="preferencias"
                    rows={3}
                    maxLength={500}
                    value={preferencias}
                    onChange={(e) => setPreferencias(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
                  />
                </div>
                {erro ? (
                  <p className="text-base text-red-700" role="alert">
                    {erro}
                  </p>
                ) : null}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={() => setPasso(0)} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-4 text-base font-semibold">
                    Voltar
                  </button>
                  <button
                    type="submit"
                    aria-disabled={!passoDadosValido()}
                    className={`inline-flex min-h-11 items-center justify-center rounded-lg bg-[#FCB065] px-4 text-base font-semibold text-[#1D0D2C] ${!passoDadosValido() ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    Escolher horário
                  </button>
                </div>
              </form>
            ) : null}

            {passo === 2 && tipo ? (
              <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
                <p className="text-base font-semibold">Horários disponíveis</p>
                <p className="mt-1 text-sm text-slate-600">Segunda a sexta, manhã e tarde (horário de Governador Valadares).</p>
                {carregandoSlots ? <p className="mt-4 text-sm">Carregando…</p> : null}
                {!carregandoSlots && slots.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-600">Não há horários livres nos próximos dias. Tente mais tarde ou ligue para a sede.</p>
                ) : (
                  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                    {slots.slice(0, 40).map((slot) => (
                      <li key={slot.inicio}>
                        <button
                          type="button"
                          onClick={() => {
                            setTentouAvancarDados(true);
                            const msg = validarPassoDados();
                            if (msg) {
                              setErro(msg);
                              setPasso(1);
                              return;
                            }
                            setSlotEscolhido(slot);
                            setPasso(3);
                            setErro("");
                          }}
                          className={`min-h-11 w-full rounded-lg border px-3 text-sm font-medium ${slotEscolhido?.inicio === slot.inicio ? "border-[#5D25AA] bg-[#5D25AA]/10" : "border-slate-300 hover:border-[#5D25AA]"}`}
                        >
                          {slot.rotulo}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {erro ? (
                  <p className="mt-4 text-base text-red-700" role="alert">
                    {erro}
                  </p>
                ) : null}
                <button type="button" onClick={() => setPasso(1)} className="mt-6 inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 text-base font-semibold">
                  Voltar
                </button>
              </div>
            ) : null}

            {passo === 3 && tipo && slotEscolhido ? (
              <div className="mt-8 space-y-4 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
                <h2 className="text-lg font-semibold">Confirme seu agendamento</h2>
                <ul className="space-y-2 text-base text-slate-700">
                  <li>
                    <span className="font-semibold">Serviço:</span> {ROTULO_TIPO_AGENDAMENTO[tipo]}
                  </li>
                  <li>
                    <span className="font-semibold">Horário:</span> {slotEscolhido.rotulo}
                  </li>
                  <li>
                    <span className="font-semibold">Nome:</span> {nome}
                  </li>
                  <li>
                    <span className="font-semibold">Telefone:</span> {telefone}
                  </li>
                </ul>
                <p className="text-sm leading-6 text-slate-600">
                  Seus dados ficam neste servidor para este atendimento. Com Google configurado, o horário também entra na
                  agenda interna do sindicato.
                </p>
                {erro ? (
                  <p className="text-base text-red-700" role="alert">
                    {erro}
                  </p>
                ) : null}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={() => setPasso(2)} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-4 text-base font-semibold">
                    Voltar
                  </button>
                  <button
                    type="button"
                    disabled={enviando}
                    onClick={() => void confirmarAgendamento()}
                    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#FCB065] px-4 text-base font-semibold text-[#1D0D2C] disabled:opacity-50"
                  >
                    {enviando ? "Confirmando…" : "Confirmar agendamento"}
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 sm:p-6" role="status">
            <p className="text-lg font-semibold">Agendamento confirmado</p>
            <p className="mt-3 text-base leading-7 text-slate-600">
              Reservamos{" "}
              {new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short" }).format(new Date(sucesso.inicio))}.
              {sucesso.tipo === "juridico"
                ? sucesso.aguardandoValidacao
                  ? " A equipe vai validar seus documentos antes do videoatendimento. Guarde o link do Google Meet abaixo."
                  : " No horário, entre na videochamada pelo Google Meet."
                : sucesso.aguardandoValidacao
                  ? " A equipe vai validar seus documentos antes do atendimento. Você receberá retorno pelo telefone informado."
                  : " Compareça no horário com documento de identidade."}
            </p>
            {sucesso.tipo === "juridico" && sucesso.googleMeetLink ? (
              <p className="mt-4">
                <a
                  href={sucesso.googleMeetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#5D25AA] px-4 text-base font-semibold text-white"
                >
                  Abrir Google Meet
                </a>
              </p>
            ) : null}
            {sucesso.tipo === "juridico" && !sucesso.googleMeetLink ? (
              <p className="mt-3 text-sm text-amber-800">
                O link do Meet será enviado após a validação ou estará no convite da agenda do sindicato.
              </p>
            ) : null}
            <Link href="/" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#FCB065] px-4 text-base font-semibold text-[#1D0D2C]">
              Voltar ao início
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
