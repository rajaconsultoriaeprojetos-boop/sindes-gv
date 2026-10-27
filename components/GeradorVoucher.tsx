"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { btnPrimary, glassCard, rotuloClasse } from "@/components/landing/plantao-theme";
import { formatarTelefoneDigitando } from "@/lib/telefone";

type Parceiro = { id: string; name: string; discountPercent: number; benefit: string; logoUrl: string | null };

type Pedido = {
  id: string;
  name: string;
  telefone: string;
  partnerId: string;
  partnerName: string;
  validacaoStatus: string;
  voucherCode: string | null;
};

type Validacao = {
  id: string;
  nomeCompleto: string;
  telefone: string;
  cargo: string;
  localTrabalho: string;
  status: string;
};

export type VoucherResumo = {
  code: string;
  partnerName: string;
  discountPercent: number;
  benefit?: string;
  workerName: string;
  workerTelefone?: string;
  situacao: string;
  validUntil: string;
  issuedAt: string;
  issuedByEmail?: string;
};

type Props = {
  parceiros: Parceiro[];
  pedidos: Pedido[];
  vouchers: VoucherResumo[];
  onEmitido: () => void | Promise<void>;
  onMarcar: (code: string, status: "utilizado" | "cancelado") => void | Promise<void>;
  cabecalhoJson: () => Record<string, string>;
};

const campo =
  "mt-1 min-h-12 w-full rounded-xl border border-[rgba(14,58,67,0.18)] bg-white/90 px-3.5 text-base text-[#0E3A43] shadow-sm focus-visible:border-[#1F8A70] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F8A70]/25";

function rotuloSituacao(s: string) {
  if (s === "valido") return "Ativo";
  if (s === "utilizado") return "Usado";
  if (s === "cancelado") return "Cancelado";
  if (s === "expirado") return "Expirado";
  return s;
}

function dataCurta(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(d);
}

export default function GeradorVoucher({
  parceiros,
  pedidos,
  vouchers,
  onEmitido,
  onMarcar,
  cabecalhoJson,
}: Props) {
  const [modo, setModo] = useState<"pedido" | "manual">("pedido");
  const [partnerId, setPartnerId] = useState("");
  const [requestId, setRequestId] = useState("");
  const [validacaoId, setValidacaoId] = useState("");
  const [workerName, setWorkerName] = useState("");
  const [workerTelefone, setWorkerTelefone] = useState("");
  const [validUntilDays, setValidUntilDays] = useState("30");
  const [validacoesAprovadas, setValidacoesAprovadas] = useState<Validacao[]>([]);
  const [erro, setErro] = useState("");
  const [gerando, setGerando] = useState(false);
  const [preview, setPreview] = useState<VoucherResumo | null>(null);

  const pedidosEmitiveis = useMemo(
    () => pedidos.filter((p) => p.validacaoStatus === "aprovado" && !p.voucherCode),
    [pedidos],
  );

  const carregarValidacoes = useCallback(async () => {
    const resposta = await fetch("/api/admin/validacoes?status=aprovado");
    const dados = (await resposta.json().catch(() => null)) as { validacoes?: Validacao[] } | null;
    if (resposta.ok && dados?.validacoes) setValidacoesAprovadas(dados.validacoes);
  }, []);

  useEffect(() => {
    void carregarValidacoes();
  }, [carregarValidacoes, pedidos.length]);

  useEffect(() => {
    if (modo !== "manual" || !validacaoId) return;
    const v = validacoesAprovadas.find((item) => item.id === validacaoId);
    if (!v) return;
    setWorkerName(v.nomeCompleto);
    setWorkerTelefone(formatarTelefoneDigitando(v.telefone));
  }, [modo, validacaoId, validacoesAprovadas]);

  useEffect(() => {
    if (modo !== "pedido" || !requestId) return;
    const p = pedidosEmitiveis.find((item) => item.id === requestId);
    if (p) setPartnerId(p.partnerId);
  }, [modo, requestId, pedidosEmitiveis]);

  const parceiroAtual = parceiros.find((p) => p.id === partnerId);

  async function gerar() {
    setErro("");
    setPreview(null);
    setGerando(true);
    try {
      const corpo: Record<string, string | number> = {
        validUntilDays: Number(validUntilDays) || 30,
      };
      if (modo === "pedido") {
        if (!requestId) {
          setErro("Escolha um pedido aprovado.");
          return;
        }
        corpo.requestId = requestId;
      } else {
        if (!partnerId) {
          setErro("Escolha o convênio parceiro.");
          return;
        }
        corpo.partnerId = partnerId;
        if (validacaoId) corpo.validacaoId = validacaoId;
        corpo.workerName = workerName.trim();
        corpo.workerTelefone = workerTelefone.replace(/\D/g, "");
      }
      const resposta = await fetch("/api/admin/vouchers", {
        method: "POST",
        headers: cabecalhoJson(),
        body: JSON.stringify(corpo),
      });
      const dados = (await resposta.json().catch(() => null)) as (VoucherResumo & { erro?: string }) | null;
      if (!resposta.ok || !dados?.code) {
        setErro(dados?.erro ?? "Não foi possível emitir o voucher.");
        return;
      }
      setPreview(dados);
      await onEmitido();
      await carregarValidacoes();
      if (modo === "pedido") setRequestId("");
      if (modo === "manual") {
        setWorkerName("");
        setWorkerTelefone("");
        setValidacaoId("");
      }
    } finally {
      setGerando(false);
    }
  }

  const urlPublica =
    typeof window !== "undefined" && preview?.code
      ? `${window.location.origin}/voucher/${preview.code}`
      : preview?.code
        ? `/voucher/${preview.code}`
        : "";

  return (
    <section className={`${glassCard} p-5 sm:p-8`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1F8A70]">Convênios</p>
      <h2 className="mt-2 text-2xl font-semibold text-[#0E3A43]">Gerador de voucher</h2>
      <p className="mt-2 text-sm leading-6 text-[#0E3A43]/75">
        Emite cartão de desconto para parceiros. Use pedido aprovado ou emissão manual pela equipe (com validação aprovada
        ou nome e telefone).
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {(
          [
            ["pedido", "Pedido aprovado"],
            ["manual", "Emissão manual"],
          ] as const
        ).map(([id, rotulo]) => (
          <button
            key={id}
            type="button"
            onClick={() => setModo(id)}
            className={`min-h-11 rounded-xl px-4 text-sm font-semibold transition ${
              modo === id ? "bg-[#0E3A43] text-white" : "border border-[rgba(14,58,67,0.2)] bg-white/80 text-[#0E3A43]"
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {modo === "pedido" ? (
          <div>
            <label htmlFor="gv-pedido" className={rotuloClasse}>
              Pedido com validação aprovada
            </label>
            <select id="gv-pedido" className={campo} value={requestId} onChange={(e) => setRequestId(e.target.value)}>
              <option value="">Selecione…</option>
              {pedidosEmitiveis.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.partnerName} · {formatarTelefoneDigitando(p.telefone)}
                </option>
              ))}
            </select>
            {pedidosEmitiveis.length === 0 ? (
              <p className="mt-2 text-sm text-[#0E3A43]/65">Nenhum pedido aprovado aguardando voucher.</p>
            ) : null}
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="gv-parceiro" className={rotuloClasse}>
                Convênio parceiro
              </label>
              <select id="gv-parceiro" className={campo} value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
                <option value="">Selecione…</option>
                {parceiros.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.discountPercent}%)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="gv-validacao" className={rotuloClasse}>
                Validação aprovada (opcional)
              </label>
              <select
                id="gv-validacao"
                className={campo}
                value={validacaoId}
                onChange={(e) => setValidacaoId(e.target.value)}
              >
                <option value="">Sem vínculo / preencher manualmente</option>
                {validacoesAprovadas.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nomeCompleto} · {v.cargo} · {v.localTrabalho}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="gv-nome" className={rotuloClasse}>
                Nome do trabalhador
              </label>
              <input
                id="gv-nome"
                className={campo}
                value={workerName}
                onChange={(e) => setWorkerName(e.target.value)}
                autoComplete="name"
              />
            </div>
            <div>
              <label htmlFor="gv-tel" className={rotuloClasse}>
                Telefone
              </label>
              <input
                id="gv-tel"
                className={campo}
                inputMode="tel"
                value={workerTelefone}
                onChange={(e) => setWorkerTelefone(formatarTelefoneDigitando(e.target.value))}
              />
            </div>
          </>
        )}

        <div>
          <label htmlFor="gv-validade" className={rotuloClasse}>
            Validade (dias)
          </label>
          <input
            id="gv-validade"
            type="number"
            min={1}
            max={365}
            className={campo}
            value={validUntilDays}
            onChange={(e) => setValidUntilDays(e.target.value)}
          />
        </div>

        {parceiroAtual && modo === "manual" ? (
          <p className="rounded-xl border border-[#F2A20C]/30 bg-[#F2A20C]/10 px-4 py-3 text-sm text-[#0E3A43]">
            Desconto: <strong>{parceiroAtual.discountPercent}%</strong> · {parceiroAtual.benefit}
          </p>
        ) : null}

        {erro ? (
          <p className="text-sm font-medium text-red-700" role="alert">
            {erro}
          </p>
        ) : null}

        <button type="button" disabled={gerando} className={btnPrimary} onClick={() => void gerar()}>
          {gerando ? "Gerando…" : "Gerar voucher"}
        </button>
      </div>

      {preview ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_auto]">
          <article className="rounded-2xl border-2 border-[#F2A20C]/50 bg-white p-5 shadow-md">
            <p className="text-xs uppercase tracking-wide text-[#0E3A43]/60">Pré-visualização</p>
            <p className="mt-2 text-3xl font-semibold text-[#1F8A70]">{preview.discountPercent}%</p>
            <p className="font-semibold text-[#0E3A43]">{preview.partnerName}</p>
            <p className="mt-2 text-sm text-[#0E3A43]/80">{preview.workerName}</p>
            <p className="font-mono text-sm font-semibold tracking-wide">{preview.code}</p>
            <p className="mt-2 text-xs text-[#0E3A43]/65">Válido até {dataCurta(preview.validUntil)}</p>
            <Link href={`/voucher/${preview.code}`} className="mt-4 inline-flex text-sm font-semibold text-[#1F8A70]">
              Abrir cartão público →
            </Link>
          </article>
          {urlPublica ? (
            <div className="flex flex-col items-center gap-2">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(urlPublica)}`}
                alt="QR code do voucher"
                width={160}
                height={160}
                className="rounded-lg border border-[rgba(14,58,67,0.15)] bg-white p-2"
              />
              <p className="max-w-[10rem] text-center text-xs text-[#0E3A43]/65">QR para o parceiro escanear</p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-10">
        <h3 className="text-lg font-semibold text-[#0E3A43]">Vouchers recentes</h3>
        {vouchers.length === 0 ? (
          <p className="mt-2 text-sm text-[#0E3A43]/65">Nenhum voucher emitido ainda.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {vouchers.slice(0, 15).map((v) => (
              <li key={v.code} className="rounded-xl border border-[rgba(14,58,67,0.12)] bg-white/90 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[#0E3A43]">
                      {v.code} · {v.discountPercent}% · {rotuloSituacao(v.situacao)}
                    </p>
                    <p className="text-sm text-[#0E3A43]/75">
                      {v.workerName} · {v.partnerName}
                    </p>
                    <p className="text-xs text-[#0E3A43]/60">
                      Emitido {dataCurta(v.issuedAt)}
                      {v.issuedByEmail ? ` · por ${v.issuedByEmail}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:items-end">
                    <Link href={`/voucher/${v.code}`} className="text-sm font-semibold text-[#1F8A70]">
                      Cartão
                    </Link>
                    {v.situacao === "valido" ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void onMarcar(v.code, "utilizado")}
                          className="min-h-10 rounded-lg border border-[rgba(14,58,67,0.2)] px-3 text-xs font-semibold text-[#0E3A43]"
                        >
                          Marcar usado
                        </button>
                        <button
                          type="button"
                          onClick={() => void onMarcar(v.code, "cancelado")}
                          className="min-h-10 rounded-lg border border-[rgba(14,58,67,0.2)] px-3 text-xs font-semibold text-[#0E3A43]"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
