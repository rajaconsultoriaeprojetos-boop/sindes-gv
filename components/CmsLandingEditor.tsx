"use client";

import { useEffect, useRef, useState } from "react";
import type { DestaqueCct, NoticiaFeed } from "@/components/landing/conteudo-instagram";
import { INSTAGRAM_PERFIL } from "@/components/landing/conteudo-instagram";
import { btnPrimary, btnSecondary, campoClasse, glassCard, rotuloClasse } from "@/components/landing/plantao-theme";
import { landingCmsPadrao, type LandingCms } from "@/lib/cms/landing-model";
import { prepararLandingParaPublicar } from "@/lib/cms/mesclar-formulario-landing";
import {
  MAX_RESUMO_NOTICIA,
  normalizarLandingCmsParaSalvar,
  validarLandingCms,
  validarLandingCmsFormulario,
  isErroCampoLista,
  isErroImpactStatObj,
  type ErroCampoLista,
  type ErroImpactStat,
} from "@/lib/cms/validar-landing";
import {
  gravarRascunhoLandingLocal,
  lerRascunhoLandingLocal,
  limparRascunhoLandingLocal,
  preferirRascunhoLocal,
} from "@/lib/cms/rascunho-landing-local";
import { mensagemErroRespostaApi } from "@/lib/cms/resposta-api";
import type { PapelUsuario } from "@/lib/rbac/roles";

type Props = {
  role?: PapelUsuario | null;
  email?: string;
};

function CheckboxConfirmar({
  checked,
  onChange,
  idFor,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  idFor: string;
}) {
  return (
    <label htmlFor={idFor} className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-[#F2A20C]/35 bg-[#F2A20C]/8 px-3 py-2.5 text-sm leading-snug text-[#0E3A43]">
      <input
        id={idFor}
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#1F8A70]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <strong className="font-semibold">Ainda não confirmado pela diretoria</strong> — mostra aviso{" "}
        <span className="whitespace-nowrap">[CONFIRMAR]</span> no site público
      </span>
    </label>
  );
}

function Secao({
  titulo,
  descricao,
  ordem,
  children,
  defaultOpen,
}: {
  titulo: string;
  descricao: string;
  ordem: number | string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className={`${glassCard} group overflow-hidden`}>
      <summary className="cursor-pointer list-none px-4 py-4 sm:px-6 sm:py-5 [&::-webkit-details-marker]:hidden">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1F8A70]/15 text-sm font-bold text-[#1F8A70]">
            {ordem}
          </span>
          <div>
            <h3 className="text-lg font-semibold text-[#0E3A43]">{titulo}</h3>
            <p className="mt-1 text-sm leading-relaxed text-[#0E3A43]/70">{descricao}</p>
          </div>
        </div>
      </summary>
      <div className="border-t border-[rgba(14,58,67,0.08)] px-4 pb-5 pt-4 sm:px-6">{children}</div>
    </details>
  );
}

const ROTULO_TIPO: Record<NoticiaFeed["tipo"], string> = {
  assembleia: "Assembleia",
  cct: "CCT / convenção",
  presidencia: "Presidência",
  video: "Vídeo / Sindes News",
};

export default function CmsLandingEditor({ role, email }: Props) {
  const [dados, setDados] = useState<LandingCms>(() => landingCmsPadrao());
  const [carregando, setCarregando] = useState(true);
  const [publicando, setPublicando] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const [jsonAvancado, setJsonAvancado] = useState("");
  const [mostrarJson, setMostrarJson] = useState(false);
  const [erroImpact, setErroImpact] = useState<ErroImpactStat | null>(null);
  const [erroLista, setErroLista] = useState<ErroCampoLista | null>(null);
  const superadmin = role === "superadmin";
  const podePublicarCms = role === "admin" || role === "superadmin" || role == null;
  const focoImpactRef = useRef<"valor" | "rotulo" | null>(null);
  const servidorAtualizadoEmRef = useRef("");

  useEffect(() => {
    let vivo = true;
    const rascunho = lerRascunhoLandingLocal();
    void (async () => {
      try {
        const resposta = await fetch("/api/admin/cms/landing", { credentials: "include" });
        if (!resposta.ok) {
          const msg = await mensagemErroRespostaApi(resposta, "Não foi possível carregar o CMS.");
          if (!vivo) return;
          if (rascunho) {
            setDados(rascunho.dados);
            setJsonAvancado(JSON.stringify(rascunho.dados, null, 2));
            setErro(`${msg} Rascunho local restaurado neste navegador.`);
          } else {
            setErro(msg);
          }
          return;
        }
        const cms = (await resposta.json()) as LandingCms;
        if (!vivo) return;
        servidorAtualizadoEmRef.current = cms.atualizadoEm ?? "";
        const usarRascunho = rascunho && preferirRascunhoLocal(rascunho, cms);
        const exibir = usarRascunho ? rascunho!.dados : cms;
        if (usarRascunho) {
          setErro(
            "Rascunho local restaurado (ainda não publicado no servidor). Revise e clique em Publicar alterações.",
          );
        }
        setDados(exibir);
        const limpo = normalizarLandingCmsParaSalvar(exibir);
        setJsonAvancado(JSON.stringify(limpo, null, 2));
      } catch {
        if (!vivo) return;
        if (rascunho) {
          setDados(rascunho.dados);
          setJsonAvancado(JSON.stringify(rascunho.dados, null, 2));
          setErro("Falha de rede ao carregar — rascunho local restaurado.");
        } else {
          setErro("Não foi possível carregar o conteúdo da landing.");
        }
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    if (carregando) return;
    gravarRascunhoLandingLocal(dados, servidorAtualizadoEmRef.current);
  }, [dados, carregando]);

  useEffect(() => {
    const salvar = () => gravarRascunhoLandingLocal(dados, servidorAtualizadoEmRef.current);
    window.addEventListener("beforeunload", salvar);
    return () => window.removeEventListener("beforeunload", salvar);
  }, [dados]);

  function atualizar(fn: (prev: LandingCms) => LandingCms) {
    setDados((prev) => fn(prev));
    setOk("");
    setErroImpact(null);
    setErroLista(null);
  }

  function focarFeedbackPublicacao() {
    document.getElementById("cms-feedback-top")?.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("cms-publicar-fixo")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function idCardLista(lista: ErroCampoLista["lista"], indice: number) {
    if (lista === "noticias") return `noticia-card-${indice}`;
    if (lista === "conquistasLinhaDoTempo") return `conq-card-${indice}`;
    if (lista === "depoimentos") return `dep-card-${indice}`;
    return `cct-card-${indice}`;
  }

  useEffect(() => {
    if (erroImpact && erroImpact !== "nenhuma") {
      const card = document.getElementById(`stat-card-${erroImpact.indice}`);
      card?.scrollIntoView({ behavior: "smooth", block: "center" });
      const alvo =
        focoImpactRef.current === "rotulo"
          ? document.getElementById(`stat-rot-${erroImpact.indice}`)
          : document.getElementById(`stat-val-${erroImpact.indice}`);
      alvo?.focus();
      focoImpactRef.current = null;
      return;
    }
    if (!erroLista) return;
    document.getElementById(idCardLista(erroLista.lista, erroLista.indice))?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    document.getElementById(erroLista.focoId)?.focus();
  }, [erroImpact, erroLista]);

  function atualizarNoticia(indice: number, patch: Partial<NoticiaFeed>) {
    atualizar((p) => {
      const noticias = [...p.noticias];
      noticias[indice] = { ...noticias[indice], ...patch };
      return { ...p, noticias };
    });
  }

  function sincronizarResumoNoticia(indice: number, el: HTMLTextAreaElement) {
    atualizarNoticia(indice, { resumo: el.value });
  }

  async function publicar() {
    if (!podePublicarCms) {
      setErro(
        "Esta conta não tem permissão de admin para publicar. Entre com sindesoficial@gmail.com (ou outra conta admin) em /entrar.",
      );
      return;
    }
    setErro("");
    setOk("");
    setErroImpact(null);
    setErroLista(null);
    setPublicando(true);
    try {
      const editado = prepararLandingParaPublicar(dados);
      const formulario = validarLandingCmsFormulario(editado);
      if (isErroCampoLista(formulario)) {
        setErroLista(formulario);
        setErro(`${formulario.rotuloCard}: ${Object.values(formulario.campos)[0]}`);
        focarFeedbackPublicacao();
        return;
      }
      if (isErroImpactStatObj(formulario)) {
        setErroImpact(formulario);
        focoImpactRef.current = formulario.valor ? "valor" : "rotulo";
        setErro(
          formulario.valor
            ? `Estatística ${formulario.indice + 1}: ${formulario.valor}`
            : `Estatística ${formulario.indice + 1}: ${formulario.rotulo}`,
        );
        focarFeedbackPublicacao();
        return;
      }
      const payload = normalizarLandingCmsParaSalvar(editado);
      const falha = validarLandingCms(editado);
      if (falha) {
        setErro(falha);
        focarFeedbackPublicacao();
        return;
      }
      const resposta = await fetch("/api/admin/cms/landing", {
        method: "PUT",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resposta.ok) {
        setErro(await mensagemErroRespostaApi(resposta, "Não foi possível publicar."));
        focarFeedbackPublicacao();
        return;
      }
      const salvo = normalizarLandingCmsParaSalvar((await resposta.json()) as LandingCms);
      servidorAtualizadoEmRef.current = salvo.atualizadoEm ?? "";
      setDados(salvo);
      setJsonAvancado(JSON.stringify(salvo, null, 2));
      limparRascunhoLandingLocal();
      setOk("Publicado — a página inicial usa este conteúdo imediatamente.");
      focarFeedbackPublicacao();
    } catch {
      setErro("Falha de rede ao publicar. Seu texto continua salvo como rascunho neste navegador.");
      focarFeedbackPublicacao();
    } finally {
      setPublicando(false);
    }
  }

  async function publicarJsonAvancado() {
    setErro("");
    setOk("");
    setErroLista(null);
    setErroImpact(null);
    let parsed: LandingCms;
    try {
      parsed = JSON.parse(jsonAvancado) as LandingCms;
    } catch {
      setErro("JSON inválido no modo avançado.");
      return;
    }
    const falha = validarLandingCms(parsed);
    if (falha) {
      setErro(falha);
      return;
    }
    const payload = normalizarLandingCmsParaSalvar(parsed);
    setPublicando(true);
    try {
      const resposta = await fetch("/api/admin/cms/landing", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resposta.ok) {
        setErro(await mensagemErroRespostaApi(resposta, "Não foi possível publicar o JSON."));
        return;
      }
      const salvo = (await resposta.json()) as LandingCms;
      servidorAtualizadoEmRef.current = salvo.atualizadoEm ?? "";
      setDados(salvo);
      setJsonAvancado(JSON.stringify(salvo, null, 2));
      limparRascunhoLandingLocal();
      setOk("JSON avançado publicado.");
    } catch {
      setErro("Falha de rede ao publicar JSON.");
    } finally {
      setPublicando(false);
    }
  }

  if (carregando) {
    return <p className="text-sm text-[#0E3A43]/70">Carregando editor da landing…</p>;
  }

  const feedback = (
    <div className="space-y-2 rounded-xl border border-[rgba(14,58,67,0.1)] bg-[#F7FAF9]/95 px-3 py-3 backdrop-blur-sm">
      {publicando ? (
        <p className="text-sm font-semibold text-[#0E3A43]" role="status" aria-live="polite">
          Publicando… aguarde a confirmação verde.
        </p>
      ) : null}
      {erro ? (
        <p className="text-sm font-semibold text-red-800" role="alert">
          {erro}
        </p>
      ) : null}
      {ok ? (
        <p className="text-sm font-semibold text-[#1F8A70]" role="status">
          {ok}
        </p>
      ) : null}
      {!publicando && !erro && !ok ? (
        <p className="text-xs text-[#0E3A43]/55">
          Alterações ficam salvas como rascunho neste navegador até publicar com sucesso. Data pode ser texto livre (ex.:{" "}
          <span className="whitespace-nowrap">23 de outubro de 2026</span>).
        </p>
      ) : null}
    </div>
  );

  return (
    <section className="space-y-4 pb-32">
      <div>
        <h2 className="text-2xl font-semibold text-[#0E3A43]">Editor da página inicial</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#0E3A43]/75">
          Sessão CMS:{" "}
          <strong>{email?.trim() ? email : "código legado (sem e-mail RBAC)"}</strong>
          {role ? (
            <>
              {" "}
              · papel <strong>{role}</strong>
            </>
          ) : (
            <> · use /entrar com conta admin para publicar com e-mail</>
          )}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[#0E3A43]/75">
          Edite na mesma ordem em que o visitante vê o site. Campos com aviso de confirmação aparecem com badge{" "}
          <strong>[CONFIRMAR]</strong> até a diretoria validar o número ou texto.
        </p>
      </div>

      <div id="cms-feedback-top" className="sticky top-0 z-10">
        {feedback}
      </div>

      <Secao
        ordem={1}
        titulo="Estatísticas de impacto"
        descricao="Faixa branca logo abaixo do banner principal (hero): números grandes com legenda."
        defaultOpen
      >
        <ul className="space-y-4">
          {dados.impactStats.map((stat, i) => {
            const cardErro = erroImpact && erroImpact !== "nenhuma" && erroImpact.indice === i;
            return (
              <li
                key={i}
                id={`stat-card-${i}`}
                className={`rounded-xl border bg-white/90 p-4 ${
                  cardErro ? "border-red-400 ring-2 ring-red-200" : "border-[rgba(14,58,67,0.12)]"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-[#1F8A70]">Destaque {i + 1}</p>
                <label className={`${rotuloClasse} mt-3`} htmlFor={`stat-val-${i}`}>
                  Número ou texto do destaque
                </label>
                <p className="mb-1 text-xs text-[#0E3A43]/55">Número ou texto curto na faixa branca (só publique dados confirmados pela diretoria)</p>
                <input
                  id={`stat-val-${i}`}
                  className={`${campoClasse} ${cardErro && erroImpact.valor ? "border-red-500 ring-1 ring-red-300" : ""}`}
                  value={stat.valor}
                  aria-invalid={!!(cardErro && erroImpact.valor)}
                  onChange={(e) =>
                    atualizar((p) => {
                      const impactStats = [...p.impactStats];
                      impactStats[i] = { ...impactStats[i], valor: e.target.value };
                      return { ...p, impactStats };
                    })
                  }
                />
                {cardErro && erroImpact.valor ? (
                  <p className="mt-1 text-sm text-red-800" role="alert">
                    {erroImpact.valor}
                  </p>
                ) : null}
                <label className={`${rotuloClasse} mt-3`} htmlFor={`stat-rot-${i}`}>
                  Legenda abaixo do número
                </label>
                <input
                  id={`stat-rot-${i}`}
                  className={`${campoClasse} ${cardErro && erroImpact.rotulo ? "border-red-500 ring-1 ring-red-300" : ""}`}
                  value={stat.rotulo}
                  aria-invalid={!!(cardErro && erroImpact.rotulo)}
                  onChange={(e) =>
                    atualizar((p) => {
                      const impactStats = [...p.impactStats];
                      impactStats[i] = { ...impactStats[i], rotulo: e.target.value };
                      return { ...p, impactStats };
                    })
                  }
                />
                {cardErro && erroImpact.rotulo ? (
                  <p className="mt-1 text-sm text-red-800" role="alert">
                    {erroImpact.rotulo}
                  </p>
                ) : null}
                <CheckboxConfirmar
                  idFor={`stat-conf-${i}`}
                  checked={!!stat.confirmar}
                  onChange={(v) =>
                    atualizar((p) => {
                      const impactStats = [...p.impactStats];
                      impactStats[i] = { ...impactStats[i], confirmar: v };
                      return { ...p, impactStats };
                    })
                  }
                />
                <button
                  type="button"
                  className="mt-3 text-sm font-semibold text-red-800 underline"
                  onClick={() =>
                    atualizar((p) => ({
                      ...p,
                      impactStats: p.impactStats.filter((_, idx) => idx !== i),
                    }))
                  }
                >
                  Remover esta estatística
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          className={`${btnSecondary} mt-4`}
          onClick={() =>
            atualizar((p) => ({
              ...p,
              impactStats: [...p.impactStats, { valor: "", rotulo: "", confirmar: false }],
            }))
          }
        >
          Adicionar estatística
        </button>
      </Secao>

      <Secao
        ordem={2}
        titulo="Linha do tempo de conquistas"
        descricao='Seção "Quem somos e por que confiar" — lista cronológica à esquerda.'
      >
        <ul className="space-y-4">
          {dados.conquistasLinhaDoTempo.map((item, i) => {
            const errosConq =
              erroLista?.lista === "conquistasLinhaDoTempo" && erroLista.indice === i ? erroLista.campos : null;
            return (
            <li
              key={i}
              id={`conq-card-${i}`}
              className={`rounded-xl border bg-white/90 p-4 ${
                errosConq ? "border-red-400 ring-2 ring-red-200" : "border-[rgba(14,58,67,0.12)]"
              }`}
            >
              <p className="text-sm font-semibold text-[#0E3A43]">Marco {i + 1}</p>
              <label className={`${rotuloClasse} mt-3`} htmlFor={`conq-ano-${i}`}>
                Ano ou período (ex.: 2024–2026)
              </label>
              <input
                id={`conq-ano-${i}`}
                className={`${campoClasse} ${errosConq?.ano ? "border-red-500 ring-1 ring-red-300" : ""}`}
                value={item.ano}
                onChange={(e) =>
                  atualizar((p) => {
                    const conquistasLinhaDoTempo = [...p.conquistasLinhaDoTempo];
                    conquistasLinhaDoTempo[i] = { ...conquistasLinhaDoTempo[i], ano: e.target.value };
                    return { ...p, conquistasLinhaDoTempo };
                  })
                }
              />
              {errosConq?.ano ? <p className="mt-1 text-sm text-red-800">{errosConq.ano}</p> : null}
              <label className={`${rotuloClasse} mt-3`} htmlFor={`conq-txt-${i}`}>
                Texto da conquista
              </label>
              <textarea
                id={`conq-txt-${i}`}
                rows={2}
                className={`${campoClasse} min-h-[4.5rem] py-2 ${errosConq?.texto ? "border-red-500 ring-1 ring-red-300" : ""}`}
                value={item.texto}
                onChange={(e) =>
                  atualizar((p) => {
                    const conquistasLinhaDoTempo = [...p.conquistasLinhaDoTempo];
                    conquistasLinhaDoTempo[i] = { ...conquistasLinhaDoTempo[i], texto: e.target.value };
                    return { ...p, conquistasLinhaDoTempo };
                  })
                }
              />
              {errosConq?.texto ? <p className="mt-1 text-sm text-red-800">{errosConq.texto}</p> : null}
              <CheckboxConfirmar
                idFor={`conq-conf-${i}`}
                checked={!!item.confirmar}
                onChange={(v) =>
                  atualizar((p) => {
                    const conquistasLinhaDoTempo = [...p.conquistasLinhaDoTempo];
                    conquistasLinhaDoTempo[i] = { ...conquistasLinhaDoTempo[i], confirmar: v };
                    return { ...p, conquistasLinhaDoTempo };
                  })
                }
              />
              <button
                type="button"
                className="mt-3 text-sm font-semibold text-red-800 underline"
                onClick={() =>
                  atualizar((p) => ({
                    ...p,
                    conquistasLinhaDoTempo: p.conquistasLinhaDoTempo.filter((_, idx) => idx !== i),
                  }))
                }
              >
                Remover item
              </button>
            </li>
          );
          })}
        </ul>
        <button
          type="button"
          className={`${btnSecondary} mt-4`}
          onClick={() =>
            atualizar((p) => ({
              ...p,
              conquistasLinhaDoTempo: [...p.conquistasLinhaDoTempo, { ano: "", texto: "", confirmar: false }],
            }))
          }
        >
          Adicionar marco
        </button>
      </Secao>

      <Secao
        ordem={3}
        titulo="Depoimentos"
        descricao='Três cartões de citação na mesma seção "Quem somos", logo após a linha do tempo.'
      >
        <ul className="space-y-4">
          {dados.depoimentos.map((d, i) => {
            const errosDep = erroLista?.lista === "depoimentos" && erroLista.indice === i ? erroLista.campos : null;
            return (
            <li
              key={i}
              id={`dep-card-${i}`}
              className={`rounded-xl border bg-white/90 p-4 ${
                errosDep ? "border-red-400 ring-2 ring-red-200" : "border-[rgba(14,58,67,0.12)]"
              }`}
            >
              <p className="text-sm font-semibold text-[#0E3A43]">Depoimento {i + 1}</p>
              <label className={`${rotuloClasse} mt-3`} htmlFor={`dep-nome-${i}`}>
                Nome ou função (rodapé do depoimento)
              </label>
              <input
                id={`dep-nome-${i}`}
                className={`${campoClasse} ${errosDep?.nome ? "border-red-500 ring-1 ring-red-300" : ""}`}
                value={d.nome}
                onChange={(e) =>
                  atualizar((p) => {
                    const depoimentos = [...p.depoimentos];
                    depoimentos[i] = { ...depoimentos[i], nome: e.target.value };
                    return { ...p, depoimentos };
                  })
                }
              />
              {errosDep?.nome ? <p className="mt-1 text-sm text-red-800">{errosDep.nome}</p> : null}
              <label className={`${rotuloClasse} mt-3`} htmlFor={`dep-txt-${i}`}>
                Citação entre aspas no site
              </label>
              <textarea
                id={`dep-txt-${i}`}
                rows={3}
                className={`${campoClasse} min-h-[5rem] py-2 ${errosDep?.texto ? "border-red-500 ring-1 ring-red-300" : ""}`}
                value={d.texto}
                onChange={(e) =>
                  atualizar((p) => {
                    const depoimentos = [...p.depoimentos];
                    depoimentos[i] = { ...depoimentos[i], texto: e.target.value };
                    return { ...p, depoimentos };
                  })
                }
              />
              {errosDep?.texto ? <p className="mt-1 text-sm text-red-800">{errosDep.texto}</p> : null}
              <CheckboxConfirmar
                idFor={`dep-conf-${i}`}
                checked={!!d.confirmar}
                onChange={(v) =>
                  atualizar((p) => {
                    const depoimentos = [...p.depoimentos];
                    depoimentos[i] = { ...depoimentos[i], confirmar: v };
                    return { ...p, depoimentos };
                  })
                }
              />
              <button
                type="button"
                className="mt-3 text-sm font-semibold text-red-800 underline"
                onClick={() =>
                  atualizar((p) => ({
                    ...p,
                    depoimentos: p.depoimentos.filter((_, idx) => idx !== i),
                  }))
                }
              >
                Remover depoimento
              </button>
            </li>
          );
          })}
        </ul>
        <button
          type="button"
          className={`${btnSecondary} mt-4`}
          onClick={() =>
            atualizar((p) => ({
              ...p,
              depoimentos: [...p.depoimentos, { nome: "", texto: "", confirmar: false }],
            }))
          }
        >
          Adicionar depoimento
        </button>
      </Secao>

      <Secao
        ordem={4}
        titulo="Destaques de CCT (hospitais)"
        descricao='Seção "Notícias, CCT e Sindes News" — cards grandes com piso, adicionais e jornada por hospital.'
      >
        <ul className="space-y-4">
          {dados.destaquesCct.map((cct, i) => {
            const errosCct = erroLista?.lista === "destaquesCct" && erroLista.indice === i ? erroLista.campos : null;
            return (
            <li
              key={i}
              id={`cct-card-${i}`}
              className={`rounded-xl border bg-white/90 p-4 ${
                errosCct ? "border-red-400 ring-2 ring-red-200" : "border-[rgba(14,58,67,0.12)]"
              }`}
            >
              <p className="text-sm font-semibold text-[#0E3A43]">CCT {i + 1}</p>
              <label className={`${rotuloClasse} mt-3`} htmlFor={`cct-h-${i}`}>
                Nome do hospital ou instituição (título do card)
              </label>
              <input
                id={`cct-h-${i}`}
                className={`${campoClasse} ${errosCct?.hospital ? "border-red-500 ring-1 ring-red-300" : ""}`}
                value={cct.hospital}
                onChange={(e) =>
                  atualizar((p) => {
                    const destaquesCct = [...p.destaquesCct];
                    destaquesCct[i] = { ...destaquesCct[i], hospital: e.target.value };
                    return { ...p, destaquesCct };
                  })
                }
              />
              {errosCct?.hospital ? <p className="mt-1 text-sm text-red-800">{errosCct.hospital}</p> : null}
              <label className={`${rotuloClasse} mt-3`} htmlFor={`cct-vig-${i}`}>
                Linha verde de vigência (ex.: CCT 2026 — …)
              </label>
              <input
                id={`cct-vig-${i}`}
                className={`${campoClasse} ${errosCct?.vigencia ? "border-red-500 ring-1 ring-red-300" : ""}`}
                value={cct.vigencia}
                onChange={(e) =>
                  atualizar((p) => {
                    const destaquesCct = [...p.destaquesCct];
                    destaquesCct[i] = { ...destaquesCct[i], vigencia: e.target.value };
                    return { ...p, destaquesCct };
                  })
                }
              />
              {errosCct?.vigencia ? <p className="mt-1 text-sm text-red-800">{errosCct.vigencia}</p> : null}
              {(
                [
                  ["piso", "Piso / reajuste"],
                  ["adicionais", "Adicionais"],
                  ["jornada", "Jornada / plantão"],
                ] as const
              ).map(([campo, rotulo]) => (
                <div key={campo} className="mt-3">
                  <label className={rotuloClasse} htmlFor={`cct-${campo}-${i}`}>
                    {rotulo}
                  </label>
                  <textarea
                    id={`cct-${campo}-${i}`}
                    rows={2}
                    className={`${campoClasse} min-h-[3.5rem] py-2`}
                    value={cct[campo]}
                    onChange={(e) =>
                      atualizar((p) => {
                        const destaquesCct = [...p.destaquesCct];
                        destaquesCct[i] = { ...destaquesCct[i], [campo]: e.target.value };
                        return { ...p, destaquesCct };
                      })
                    }
                  />
                </div>
              ))}
              <CheckboxConfirmar
                idFor={`cct-conf-${i}`}
                checked={cct.confirmar}
                onChange={(v) =>
                  atualizar((p) => {
                    const destaquesCct = [...p.destaquesCct];
                    destaquesCct[i] = { ...destaquesCct[i], confirmar: v };
                    return { ...p, destaquesCct };
                  })
                }
              />
              <button
                type="button"
                className="mt-3 text-sm font-semibold text-red-800 underline"
                onClick={() =>
                  atualizar((p) => ({
                    ...p,
                    destaquesCct: p.destaquesCct.filter((_, idx) => idx !== i),
                  }))
                }
              >
                Remover hospital
              </button>
            </li>
          );
          })}
        </ul>
        <button
          type="button"
          className={`${btnSecondary} mt-4`}
          onClick={() =>
            atualizar((p) => ({
              ...p,
              destaquesCct: [
                ...p.destaquesCct,
                {
                  hospital: "",
                  vigencia: "",
                  piso: "",
                  adicionais: "",
                  jornada: "",
                  confirmar: false,
                } satisfies DestaqueCct,
              ],
            }))
          }
        >
          Adicionar hospital (CCT)
        </button>
      </Secao>

      <Secao
        ordem={5}
        titulo="Feed de notícias"
        descricao='Mesma seção de notícias — cartões menores com link "Ver no Instagram" ou outra URL.'
      >
        <p className="mb-4 text-xs text-[#0E3A43]/60">
          Link sugerido para posts: {INSTAGRAM_PERFIL}
        </p>
        <ul className="space-y-4">
          {dados.noticias.map((n, i) => {
            const errosNot = erroLista?.lista === "noticias" && erroLista.indice === i ? erroLista.campos : null;
            return (
            <li
              key={i}
              id={`noticia-card-${i}`}
              className={`rounded-xl border bg-white/90 p-4 ${
                errosNot ? "border-red-400 ring-2 ring-red-200" : "border-[rgba(14,58,67,0.12)]"
              }`}
            >
              <p className="text-sm font-semibold text-[#0E3A43]">
                Notícia {i + 1}
                {n.titulo.trim() ? (
                  <span className="ml-2 font-normal text-[#0E3A43]/60">— {n.titulo.trim().slice(0, 48)}</span>
                ) : null}
              </p>
              <label className={`${rotuloClasse} mt-3`} htmlFor={`not-tipo-${i}`}>
                Tipo (rótulo colorido no card)
              </label>
              <select
                id={`not-tipo-${i}`}
                className={campoClasse}
                value={n.tipo}
                onChange={(e) =>
                  atualizar((p) => {
                    const noticias = [...p.noticias];
                    noticias[i] = { ...noticias[i], tipo: e.target.value as NoticiaFeed["tipo"] };
                    return { ...p, noticias };
                  })
                }
              >
                {(Object.keys(ROTULO_TIPO) as NoticiaFeed["tipo"][]).map((t) => (
                  <option key={t} value={t}>
                    {ROTULO_TIPO[t]}
                  </option>
                ))}
              </select>
              <label className={`${rotuloClasse} mt-3`} htmlFor={`not-data-${i}`}>
                Data ou rótulo ao lado do tipo (ex.: 2026, Canal social)
              </label>
              <input
                id={`not-data-${i}`}
                className={`${campoClasse} ${errosNot?.data ? "border-red-500 ring-1 ring-red-300" : ""}`}
                value={n.data}
                onChange={(e) =>
                  atualizar((p) => {
                    const noticias = [...p.noticias];
                    noticias[i] = { ...noticias[i], data: e.target.value };
                    return { ...p, noticias };
                  })
                }
              />
              {errosNot?.data ? <p className="mt-1 text-sm text-red-800">{errosNot.data}</p> : null}
              <label className={`${rotuloClasse} mt-3`} htmlFor={`not-tit-${i}`}>
                Título do card
              </label>
              <input
                id={`not-tit-${i}`}
                className={`${campoClasse} ${errosNot?.titulo ? "border-red-500 ring-1 ring-red-300" : ""}`}
                value={n.titulo}
                onChange={(e) =>
                  atualizar((p) => {
                    const noticias = [...p.noticias];
                    noticias[i] = { ...noticias[i], titulo: e.target.value };
                    return { ...p, noticias };
                  })
                }
              />
              {errosNot?.titulo ? <p className="mt-1 text-sm text-red-800">{errosNot.titulo}</p> : null}
              <label className={`${rotuloClasse} mt-3`} htmlFor={`not-res-${i}`}>
                Resumo (parágrafo curto — aceita colar texto longo, quebras de linha e emoji)
              </label>
              <textarea
                id={`not-res-${i}`}
                name={`noticia-resumo-${i}`}
                rows={6}
                className={`${campoClasse} min-h-[7rem] py-2 ${errosNot?.resumo ? "border-red-500 ring-1 ring-red-300" : ""}`}
                value={n.resumo ?? ""}
                onChange={(e) => sincronizarResumoNoticia(i, e.currentTarget)}
                onInput={(e) => sincronizarResumoNoticia(i, e.currentTarget)}
                onPaste={() => {
                  queueMicrotask(() => {
                    const el = document.getElementById(`not-res-${i}`);
                    if (el instanceof HTMLTextAreaElement) sincronizarResumoNoticia(i, el);
                  });
                }}
              />
              <p className="mt-1 text-xs text-[#0E3A43]/55">
                {n.resumo.length.toLocaleString("pt-BR")} / {MAX_RESUMO_NOTICIA.toLocaleString("pt-BR")} caracteres
              </p>
              {errosNot?.resumo ? <p className="mt-1 text-sm text-red-800">{errosNot.resumo}</p> : null}
              <label className={`${rotuloClasse} mt-3`} htmlFor={`not-href-${i}`}>
                Link do botão (https://… ou /caminho interno)
              </label>
              <input
                id={`not-href-${i}`}
                className={`${campoClasse} ${errosNot?.href ? "border-red-500 ring-1 ring-red-300" : ""}`}
                inputMode="url"
                value={n.href}
                placeholder={INSTAGRAM_PERFIL}
                onChange={(e) =>
                  atualizar((p) => {
                    const noticias = [...p.noticias];
                    noticias[i] = { ...noticias[i], href: e.target.value };
                    return { ...p, noticias };
                  })
                }
              />
              {errosNot?.href ? <p className="mt-1 text-sm text-red-800">{errosNot.href}</p> : null}
              <CheckboxConfirmar
                idFor={`not-conf-${i}`}
                checked={!!n.confirmar}
                onChange={(v) =>
                  atualizar((p) => {
                    const noticias = [...p.noticias];
                    noticias[i] = { ...noticias[i], confirmar: v };
                    return { ...p, noticias };
                  })
                }
              />
              <button
                type="button"
                className="mt-3 text-sm font-semibold text-red-800 underline"
                onClick={() =>
                  atualizar((p) => ({
                    ...p,
                    noticias: p.noticias.filter((_, idx) => idx !== i),
                  }))
                }
              >
                Remover notícia
              </button>
            </li>
          );
          })}
        </ul>
        <button
          type="button"
          className={`${btnSecondary} mt-4`}
          onClick={() =>
            atualizar((p) => ({
              ...p,
              noticias: [
                ...p.noticias,
                {
                  titulo: "",
                  resumo: "",
                  data: "",
                  tipo: "presidencia",
                  href: INSTAGRAM_PERFIL,
                  confirmar: false,
                },
              ],
            }))
          }
        >
          Adicionar notícia
        </button>
      </Secao>

      <Secao
        ordem={6}
        titulo="Conteúdo fixo no site (não editável aqui)"
        descricao="Estes blocos continuam no código da landing; alterações exigem suporte técnico."
      >
        <ul className="list-disc space-y-2 pl-5 text-sm text-[#0E3A43]/75">
          <li>
            <strong>Hero</strong> — frase principal, subtítulo e botões no topo com foto de fundo
          </li>
          <li>
            <strong>Serviços protagonistas</strong> — três cards (auditoria, jurídico, denúncia)
          </li>
          <li>
            <strong>Convênios</strong> — teaser e vitrine vêm de /convenios e admin de parceiros
          </li>
          <li>
            <strong>Portal, denúncia e rodapé</strong> — textos legais e formulários nesta página
          </li>
          <li>
            <strong>Faixa Instagram</strong> — link @sindesgv fixo no layout
          </li>
        </ul>
      </Secao>

      <div
        id="cms-publicar-fixo"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[rgba(14,58,67,0.12)] bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(14,58,67,0.08)] backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">{feedback}</div>
          <button
            type="button"
            disabled={publicando || !podePublicarCms}
            onClick={() => void publicar()}
            className={`${btnPrimary} w-full shrink-0 sm:w-auto disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {publicando ? "Publicando…" : "Publicar alterações"}
          </button>
        </div>
        {dados.atualizadoEm ? (
          <p className="mx-auto mt-2 max-w-5xl text-xs text-[#0E3A43]/55">
            Última publicação no servidor:{" "}
            {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(dados.atualizadoEm))}
          </p>
        ) : (
          <p className="mx-auto mt-2 max-w-5xl text-xs text-amber-900/80">Nenhuma publicação registrada no servidor ainda.</p>
        )}
      </div>

      {superadmin ? (
        <details
          className="rounded-xl border border-dashed border-[rgba(14,58,67,0.25)] bg-white/50 p-4"
          open={mostrarJson}
          onToggle={(e) => setMostrarJson((e.target as HTMLDetailsElement).open)}
        >
          <summary className="cursor-pointer text-sm font-semibold text-[#0E3A43]">Modo avançado JSON (superadmin)</summary>
          <p className="mt-2 text-xs text-[#0E3A43]/65">Somente para emergências. Prefira o formulário acima.</p>
          <textarea
            value={jsonAvancado}
            onChange={(e) => setJsonAvancado(e.target.value)}
            rows={12}
            className="mt-3 w-full rounded-xl border border-[rgba(14,58,67,0.18)] font-mono text-xs"
          />
          <button type="button" className={`${btnSecondary} mt-3`} onClick={() => void publicarJsonAvancado()}>
            Publicar JSON
          </button>
        </details>
      ) : null}
    </section>
  );
}
