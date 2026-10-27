"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Calculator,
  Instagram,
  MapPin,
  Menu,
  MessageCircle,
  Scale,
  ShieldAlert,
  X,
} from "lucide-react";
import ConfirmarBadge from "@/components/landing/ConfirmarBadge";
import EcgDivider from "@/components/landing/EcgDivider";
import HeroLogoOrbit from "@/components/landing/HeroLogoOrbit";
import ImpactStat from "@/components/landing/ImpactStat";
import InstagramFollowBand from "@/components/landing/InstagramFollowBand";
import WhatsAppFab from "@/components/landing/WhatsAppFab";
import ScrollReveal from "@/components/landing/ScrollReveal";
import ServiceDetailModal from "@/components/landing/ServiceDetailModal";
import { INSTAGRAM_PERFIL } from "@/components/landing/conteudo-instagram";
import type { LandingCms } from "@/lib/cms/landing-model";
import { parseValorImpacto } from "@/lib/cms/validar-landing";
import {
  btnPrimary,
  btnSecondary,
  campoClasse,
  glassCard,
  rotuloClasse,
} from "@/components/landing/plantao-theme";
import { SINDES_WHATSAPP_URL } from "@/lib/whatsapp-sindes";

const NAV = [
  { href: "#inicio", rotulo: "Início" },
  { href: "#servicos", rotulo: "Serviços" },
  { href: "/convenios", rotulo: "Convênios" },
  { href: "#noticias", rotulo: "Notícias" },
  { href: "#confianca", rotulo: "Quem somos" },
  { href: "#contato", rotulo: "Contato" },
] as const;

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1920&q=80";

function protocoloLocal(prefixo: string): string {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return `${prefixo}-${(buffer[0] % 900000) + 100000}`;
}

type ServicoModal = "auditoria" | "plantao" | "denuncias" | null;

function Marca({ sobreEscuro = false }: { sobreEscuro?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <img
        src="/sindes-logo.png"
        alt=""
        width={36}
        height={36}
        className="h-9 w-9 shrink-0 rounded-lg bg-white object-contain"
      />
      <span className="min-w-0 text-left">
        <span
          className={`block text-[15px] font-semibold leading-none tracking-tight ${
            sobreEscuro ? "text-white" : "text-[#0E3A43]"
          }`}
        >
          SINDES
        </span>
        <span
          className={`mt-1 block whitespace-nowrap text-[10px] font-medium uppercase leading-none tracking-[0.14em] ${
            sobreEscuro ? "text-white/75" : "text-[#0E3A43]/60"
          }`}
        >
          Saúde · GV
        </span>
      </span>
    </span>
  );
}

type Props = {
  cms?: LandingCms;
};

function AvisoSecaoVazia({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-[rgba(14,58,67,0.18)] bg-white/60 px-4 py-5 text-sm leading-6 text-[#0E3A43]/65">
      {children}
    </p>
  );
}

export default function SindesLanding({ cms }: Props) {
  const noticias = cms?.noticias ?? [];
  const destaquesCct = cms?.destaquesCct ?? [];
  const conquistas = cms?.conquistasLinhaDoTempo ?? [];
  const depoimentos = cms?.depoimentos ?? [];
  const impactStats = cms?.impactStats ?? [];
  const temNoticiasOuCct = destaquesCct.length > 0 || noticias.length > 0;
  const [menuAberto, setMenuAberto] = useState(false);
  const [servicoModal, setServicoModal] = useState<ServicoModal>(null);

  const [nome, setNome] = useState("");
  const [contato, setContato] = useState("");
  const [tema, setTema] = useState("Rescisão e verbas");
  const [relatoAgenda, setRelatoAgenda] = useState("");
  const [consentimento, setConsentimento] = useState(false);
  const [erroAgenda, setErroAgenda] = useState("");
  const [protocoloAgenda, setProtocoloAgenda] = useState("");

  const [categoria, setCategoria] = useState("Atraso de salário ou verbas");
  const [relatoDenuncia, setRelatoDenuncia] = useState("");
  const [semDadosDeSaude, setSemDadosDeSaude] = useState(false);
  const [erroDenuncia, setErroDenuncia] = useState("");
  const [protocoloDenuncia, setProtocoloDenuncia] = useState("");

  useEffect(() => {
    document.body.style.overflow = menuAberto || servicoModal ? "hidden" : "";
    if (!menuAberto) return;
    function fechar(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuAberto(false);
    }
    window.addEventListener("keydown", fechar);
    return () => {
      if (!servicoModal) document.body.style.overflow = "";
      window.removeEventListener("keydown", fechar);
    };
  }, [menuAberto, servicoModal]);

  function enviarAgenda(event: FormEvent) {
    event.preventDefault();
    if (nome.trim().length < 3) {
      setErroAgenda("Informe seu nome para o retorno.");
      return;
    }
    if (contato.trim().length < 6) {
      setErroAgenda("Informe um e-mail ou telefone para a equipe retornar.");
      return;
    }
    if (relatoAgenda.trim().length < 10) {
      setErroAgenda("Descreva o assunto em pelo menos uma frase.");
      return;
    }
    if (!consentimento) {
      setErroAgenda("Marque o consentimento para registrar o pedido nesta tela.");
      return;
    }
    setErroAgenda("");
    setProtocoloAgenda(protocoloLocal("ATD"));
  }

  function enviarDenuncia(event: FormEvent) {
    event.preventDefault();
    if (relatoDenuncia.trim().length < 20) {
      setErroDenuncia("O relato precisa explicar o fato, a unidade e o período.");
      return;
    }
    if (!semDadosDeSaude) {
      setErroDenuncia("Confirme que o texto não traz dado de paciente.");
      return;
    }
    setErroDenuncia("");
    setProtocoloDenuncia(protocoloLocal("DEN"));
  }

  const servicos = [
    {
      id: "auditoria" as const,
      icon: Calculator,
      titulo: "Auditoria de Rescisão",
      descricao:
        "A assessoria confere verbas e TRCT na homologação. Ferramenta interna — não simule rescisão nesta página.",
      passos: ["Agende pelo portal", "Envie documentos", "Homologação com a assessoria"],
      href: "/portal",
      cta: "Agendar assessoria",
    },
    {
      id: "plantao" as const,
      icon: Scale,
      titulo: "Plantão Jurídico Digital",
      descricao: "Fale com a assessoria por vídeo e chat quando o caso não puder esperar o fim do turno.",
      passos: ["Portal do trabalhador", "Validação da categoria", "Sala jurídica online"],
      href: "/portal",
      cta: "Falar com a assessoria",
    },
    {
      id: "denuncias" as const,
      icon: ShieldAlert,
      titulo: "Denúncias Seguras",
      descricao: "Relate irregularidade na unidade sem informar seu nome e sem dado de paciente.",
      passos: ["Escolha a categoria", "Descreva o fato", "Protocolo anônimo nesta página"],
      href: "#denuncias",
      cta: "Ir à denúncia",
    },
  ];

  return (
    <div className="min-h-full overflow-x-hidden bg-[#F7FAF9] text-[#0E3A43]">
      <a
        href="#inicio"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:shadow"
      >
        Ir para o conteúdo
      </a>

      <header className="sticky top-0 z-50 border-b border-[rgba(14,58,67,0.08)] bg-[#F7FAF9]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <a
            href="#inicio"
            className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F8A70] focus-visible:ring-offset-2"
            onClick={() => setMenuAberto(false)}
          >
            <Marca />
          </a>
          <nav className="hidden items-center gap-5 lg:flex" aria-label="Institucional">
            {NAV.map((item) =>
              item.href.startsWith("/") ? (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md text-sm font-medium text-[#0E3A43]/75 transition hover:text-[#0E3A43]"
                >
                  {item.rotulo}
                </Link>
              ) : (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-md text-sm font-medium text-[#0E3A43]/75 transition hover:text-[#0E3A43]"
                >
                  {item.rotulo}
                </a>
              ),
            )}
            <Link href="/portal" className={btnPrimary}>
              Portal do Trabalhador
            </Link>
          </nav>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[rgba(14,58,67,0.12)] bg-white/80 lg:hidden"
            aria-expanded={menuAberto}
            aria-controls="menu-mobile"
            onClick={() => setMenuAberto((aberto) => !aberto)}
          >
            {menuAberto ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            <span className="sr-only">{menuAberto ? "Fechar menu" : "Abrir menu"}</span>
          </button>
        </div>
        {menuAberto ? (
          <div id="menu-mobile" className="border-t border-[rgba(14,58,67,0.08)] bg-[#F7FAF9] lg:hidden">
            <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3" aria-label="Institucional móvel">
              {NAV.map((item) =>
                item.href.startsWith("/") ? (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-lg px-3 py-3 text-base font-medium"
                    onClick={() => setMenuAberto(false)}
                  >
                    {item.rotulo}
                  </Link>
                ) : (
                  <a
                    key={item.href}
                    href={item.href}
                    className="rounded-lg px-3 py-3 text-base font-medium"
                    onClick={() => setMenuAberto(false)}
                  >
                    {item.rotulo}
                  </a>
                ),
              )}
              <Link href="/portal" onClick={() => setMenuAberto(false)} className={`${btnPrimary} mt-2`}>
                Portal do Trabalhador
              </Link>
            </nav>
          </div>
        ) : null}
      </header>

      <main>
        <section id="inicio" tabIndex={-1} className="relative scroll-mt-20 overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src={HERO_IMAGE}
              alt="Profissionais de saúde ao fim de um plantão"
              fill
              priority
              className="object-cover object-center"
              sizes="100vw"
            />
            <div
              className="absolute inset-0 bg-gradient-to-br from-[#0E3A43]/92 via-[#0E3A43]/78 to-[#1F8A70]/55"
              aria-hidden="true"
            />
          </div>
          <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 py-16 sm:py-24 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-6 lg:py-28">
            <div className="order-2 lg:order-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                Sindicato dos Trabalhadores da Saúde de Governador Valadares
              </p>
              <h1 className="mt-4 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-white text-balance sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
                Quem cuida de GV também precisa ter quem cuide dos seus direitos
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/90 sm:text-lg">
                Plantão jurídico digital, auditoria de rescisão e denúncias seguras — três serviços
                pensados para quem vive o plantão CLT na saúde.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/portal" className={btnPrimary}>
                  Falar com a assessoria
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <a href="#servicos" className={btnSecondary}>
                  Conhecer os serviços
                </a>
              </div>
            </div>
            <div className="order-1 flex w-full justify-center lg:order-2 lg:justify-end lg:pl-2">
              <HeroLogoOrbit />
            </div>
          </div>
          <EcgDivider variant="dark" className="relative bg-[#0E3A43]/30" />
        </section>

        {impactStats.length > 0 ? (
          <>
            <section className="border-b border-[rgba(14,58,67,0.06)] bg-white/60 px-4 py-12 backdrop-blur-sm">
              <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
                {impactStats.map((stat) => {
                  const parsed = parseValorImpacto(stat.valor);
                  return (
                    <ImpactStat
                      key={`${stat.valor}-${stat.rotulo}`}
                      valor={parsed.valor}
                      valorTexto={parsed.valorTexto}
                      sufixo={parsed.sufixo}
                      rotulo={stat.rotulo}
                      confirmar={stat.confirmar}
                    />
                  );
                })}
              </div>
            </section>
            <EcgDivider className="bg-[#F7FAF9]" />
          </>
        ) : null}

        <section id="servicos" tabIndex={-1} className="scroll-mt-20 px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <ScrollReveal>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Serviços protagonistas</h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[#0E3A43]/75">
                Três caminhos claros. Toque em &quot;Como funciona&quot; para ver o passo a passo ou vá direto
                à ferramenta.
              </p>
            </ScrollReveal>
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {servicos.map((s, i) => (
                <ScrollReveal key={s.id} delayMs={i * 80}>
                  <article className={`${glassCard} flex h-full flex-col p-6`}>
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#1F8A70]/12 text-[#1F8A70]">
                      <s.icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 text-lg font-semibold">{s.titulo}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#0E3A43]/70">{s.descricao}</p>
                    <ol className="mt-4 flex flex-wrap gap-2">
                      {s.passos.map((passo, idx) => (
                        <li
                          key={passo}
                          className="rounded-full border border-[#1F8A70]/25 bg-[#1F8A70]/8 px-2.5 py-1 text-xs font-medium text-[#0E3A43]"
                        >
                          {idx + 1}. {passo}
                        </li>
                      ))}
                    </ol>
                    <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-[rgba(14,58,67,0.15)] bg-white/90 text-sm font-semibold transition hover:bg-white"
                        onClick={() => setServicoModal(s.id)}
                      >
                        Como funciona
                      </button>
                      <a href={s.href} className={`${btnPrimary} flex-1 text-center`}>
                        {s.cta}
                      </a>
                    </div>
                  </article>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <ServiceDetailModal
          aberto={servicoModal === "auditoria"}
          titulo="Auditoria de Rescisão"
          onFechar={() => setServicoModal(null)}
          hrefAcao="/portal"
          rotuloAcao="Ir ao portal do trabalhador"
        >
          <p>
            A auditoria de rescisão e a leitura de TRCT ficam na área interna da assessoria (presidência e
            equipe jurídica), após login com o código institucional. Trabalhadores agendam orientação pelo
            portal — a homologação continua sendo o passo decisivo.
          </p>
        </ServiceDetailModal>
        <ServiceDetailModal
          aberto={servicoModal === "plantao"}
          titulo="Plantão Jurídico Digital"
          onFechar={() => setServicoModal(null)}
          hrefAcao="/portal"
          rotuloAcao="Ir ao portal do trabalhador"
        >
          <p>
            Envie contracheque e documento no portal. A equipe valida que você trabalha na categoria e
            libera a sala de vídeo com chat e notas — o mesmo fluxo usado pela assessoria em{" "}
            <Link href="/assessoria" className="font-semibold text-[#1F8A70] underline">
              /assessoria
            </Link>
            .
          </p>
        </ServiceDetailModal>
        <ServiceDetailModal
          aberto={servicoModal === "denuncias"}
          titulo="Denúncias Seguras"
          onFechar={() => setServicoModal(null)}
          hrefAcao="#denuncias"
          rotuloAcao="Registrar denúncia anônima"
        >
          <p>
            Sem campo de nome. Descreva unidade, período e o fato — nunca dados de paciente. Nesta versão
            da landing o protocolo fica no navegador; para apuração formal, combine com a sede do sindicato.
          </p>
        </ServiceDetailModal>

        <section id="convenios" tabIndex={-1} className="scroll-mt-20 border-y border-[rgba(14,58,67,0.08)] bg-white/50 px-4 py-16">
          <div className="mx-auto max-w-6xl">
            <ScrollReveal>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1F8A70]">Convênios</p>
              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Descontos para quem está no plantão</h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[#0E3A43]/70">
                Farmácia, psicologia, clube, academia, estética e ótica. Parceiros publicados pela
                administração aparecem na vitrine.
              </p>
              <Link href="/convenios" className={`${btnPrimary} mt-6`}>
                Ver descontos
              </Link>
            </ScrollReveal>
          </div>
        </section>

        <section id="confianca" tabIndex={-1} className="scroll-mt-20 px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <ScrollReveal>
              <h2 className="text-2xl font-bold sm:text-3xl">Quem somos e por que confiar</h2>
              <p className="mt-3 max-w-2xl text-[#0E3A43]/75">
                Representação sindical na saúde pública e privada de Governador Valadares — SUS e hospitais
                conveniados.
              </p>
            </ScrollReveal>

            {conquistas.length > 0 ? (
              <ScrollReveal className="mt-10">
                <div className={`${glassCard} p-6 sm:p-8`}>
                  <h3 className="text-lg font-semibold">Linha do tempo de conquistas</h3>
                  <ul className="mt-4 space-y-4 border-l-2 border-[#1F8A70]/30 pl-4 sm:columns-2 sm:gap-8">
                    {conquistas.map((item, idx) => (
                      <li key={`${item.ano}-${idx}`} className="break-inside-avoid pb-2">
                        <span className="text-sm font-bold text-[#1F8A70]">{item.ano}</span>
                        <p className="text-sm leading-6 text-[#0E3A43]/80">
                          {item.texto} {item.confirmar ? <ConfirmarBadge className="ml-1 inline" /> : null}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollReveal>
            ) : (
              <ScrollReveal className="mt-10">
                <AvisoSecaoVazia>
                  Linha do tempo em atualização — marcos históricos serão publicados pela diretoria no CMS.
                </AvisoSecaoVazia>
              </ScrollReveal>
            )}

            {depoimentos.length > 0 ? (
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {depoimentos.map((d, i) => (
                  <ScrollReveal key={`${d.nome}-${i}`} delayMs={i * 60}>
                    <blockquote className={`${glassCard} p-5`}>
                      <p className="text-sm leading-6 text-[#0E3A43]/85">&ldquo;{d.texto}&rdquo;</p>
                      <footer className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#1F8A70]">
                        {d.nome}
                        {d.confirmar ? <ConfirmarBadge /> : null}
                      </footer>
                    </blockquote>
                  </ScrollReveal>
                ))}
              </div>
            ) : null}

            <ScrollReveal className="mt-8">
              <div className="rounded-2xl border border-[#1F8A70]/20 bg-[#1F8A70]/8 px-6 py-5 text-center sm:text-left">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#1F8A70]">
                  Saúde pública e privada
                </p>
                <p className="mt-2 text-sm leading-6 text-[#0E3A43]/80">
                  O SINDES representa trabalhadores da saúde em Governador Valadares. Antes de assinar rescisão
                  ou acordo, fale com a assessoria.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <EcgDivider className="bg-[#F7FAF9]" />

        <section id="portal" tabIndex={-1} className="scroll-mt-20 px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <ScrollReveal>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1F8A70]">
                Área do trabalhador
              </p>
              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Portal, plantão e denúncia</h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[#0E3A43]/75">
                Atendimento identificado no portal (persiste neste servidor). Agendamento rápido e denúncia
                anônima nesta página, em superfícies amplas e tranquilas.
              </p>
              <Link
                href="/portal"
                className="mt-4 inline-flex min-h-11 items-center font-semibold text-[#1F8A70] underline decoration-2 underline-offset-4"
              >
                Abrir o portal completo
              </Link>
            </ScrollReveal>

            <div className="mt-10 grid gap-8 lg:grid-cols-2">
              <ScrollReveal>
                <article
                  id="atendimento"
                  tabIndex={-1}
                  className={`scroll-mt-24 ${glassCard} p-6 sm:p-8`}
                >
                  <h3 className="text-xl font-semibold">Agendar atendimento jurídico</h3>
                  <p className="mt-2 text-sm leading-6 text-[#0E3A43]/70">
                    Horário de referência da sede: dias úteis, em Governador Valadares. Para fila oficial
                    com validação, use o portal.
                  </p>
                  <Link
                    href="/atendimento"
                    className="mt-3 inline-flex min-h-11 items-center font-semibold text-[#1F8A70] underline decoration-2 underline-offset-4"
                  >
                    Abrir ambiente de atendimento
                  </Link>
                  {protocoloAgenda ? (
                    <div className="mt-6 rounded-xl border border-[#1F8A70]/20 bg-white/90 p-5" role="status">
                      <p className="text-sm font-semibold">Pedido registrado nesta tela</p>
                      <p className="mt-2 text-2xl font-bold tracking-tight">{protocoloAgenda}</p>
                      <p className="mt-2 text-sm leading-6 text-[#0E3A43]/70">
                        Nenhum dado foi enviado. Feche a aba e o protocolo some. Quando o canal oficial
                        estiver no ar, um atendente poderá retornar de fato.
                      </p>
                      <button
                        type="button"
                        className="mt-4 text-sm font-semibold text-[#1F8A70]"
                        onClick={() => {
                          setProtocoloAgenda("");
                          setNome("");
                          setContato("");
                          setRelatoAgenda("");
                          setConsentimento(false);
                        }}
                      >
                        Fazer outro pedido
                      </button>
                    </div>
                  ) : (
                    <form className="mt-6 space-y-4" onSubmit={enviarAgenda} noValidate>
                      <div>
                        <label className={rotuloClasse} htmlFor="nome">
                          Nome
                        </label>
                        <input
                          id="nome"
                          className={campoClasse}
                          autoComplete="name"
                          value={nome}
                          onChange={(e) => setNome(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className={rotuloClasse} htmlFor="retorno">
                          E-mail ou telefone
                        </label>
                        <input
                          id="retorno"
                          className={campoClasse}
                          autoComplete="tel"
                          value={contato}
                          onChange={(e) => setContato(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className={rotuloClasse} htmlFor="tema">
                          Tema
                        </label>
                        <select
                          id="tema"
                          className={campoClasse}
                          value={tema}
                          onChange={(e) => setTema(e.target.value)}
                        >
                          <option>Rescisão e verbas</option>
                          <option>Homologação</option>
                          <option>Assédio ou jornada</option>
                          <option>Convenção coletiva</option>
                          <option>Outro assunto</option>
                        </select>
                      </div>
                      <div>
                        <label className={rotuloClasse} htmlFor="relato-agenda">
                          O que aconteceu
                        </label>
                        <textarea
                          id="relato-agenda"
                          className="min-h-32 w-full rounded-xl border border-[rgba(14,58,67,0.18)] bg-white/90 px-3.5 py-3 text-sm shadow-sm"
                          maxLength={2000}
                          value={relatoAgenda}
                          onChange={(e) => setRelatoAgenda(e.target.value)}
                        />
                      </div>
                      <label className="flex items-start gap-2 text-sm leading-6 text-[#0E3A43]/80">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-[#0E3A43]/30"
                          checked={consentimento}
                          onChange={(e) => setConsentimento(e.target.checked)}
                        />
                        Autorizo o uso do nome e do contato só para este pedido. Sei que, nesta versão,
                        nada é enviado a um servidor.
                      </label>
                      {erroAgenda ? (
                        <p className="text-sm text-red-700" role="alert">
                          {erroAgenda}
                        </p>
                      ) : null}
                      <button type="submit" className={btnPrimary}>
                        Registrar pedido
                      </button>
                    </form>
                  )}
                </article>
              </ScrollReveal>

              <ScrollReveal delayMs={80}>
                <article
                  id="denuncias"
                  tabIndex={-1}
                  className={`scroll-mt-24 ${glassCard} border-[#0E3A43]/15 bg-[#0E3A43]/[0.03] p-6 sm:p-8`}
                >
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-[#1F8A70]" aria-hidden="true" />
                    <h3 className="text-xl font-semibold">Denúncias anônimas</h3>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#0E3A43]/70">
                    Sem campo de nome. Não escreva nome de paciente, prontuário ou outro dado de saúde.
                  </p>
                  {protocoloDenuncia ? (
                    <div className="mt-6 rounded-xl border border-[#1F8A70]/20 bg-white/90 p-5" role="status">
                      <p className="text-sm font-semibold">Relato guardado só nesta aba</p>
                      <p className="mt-2 text-2xl font-bold tracking-tight">{protocoloDenuncia}</p>
                      <p className="mt-2 text-sm leading-6 text-[#0E3A43]/70">
                        A denúncia não foi transmitida. Use o canal presencial da sede quando precisar que
                        a diretoria apure o fato.
                      </p>
                      <button
                        type="button"
                        className="mt-4 text-sm font-semibold text-[#1F8A70]"
                        onClick={() => {
                          setProtocoloDenuncia("");
                          setRelatoDenuncia("");
                          setSemDadosDeSaude(false);
                        }}
                      >
                        Registrar outro relato
                      </button>
                    </div>
                  ) : (
                    <form className="mt-6 space-y-4" onSubmit={enviarDenuncia} autoComplete="off" noValidate>
                      <div>
                        <label className={rotuloClasse} htmlFor="categoria">
                          Categoria
                        </label>
                        <select
                          id="categoria"
                          className={campoClasse}
                          value={categoria}
                          onChange={(e) => setCategoria(e.target.value)}
                        >
                          <option>Atraso de salário ou verbas</option>
                          <option>Descumprimento de acordo</option>
                          <option>Assédio</option>
                          <option>Condição de trabalho</option>
                          <option>Outro</option>
                        </select>
                      </div>
                      <div>
                        <label className={rotuloClasse} htmlFor="relato-denuncia">
                          Relato
                        </label>
                        <textarea
                          id="relato-denuncia"
                          className="min-h-40 w-full rounded-xl border border-[rgba(14,58,67,0.18)] bg-white/90 px-3.5 py-3 text-sm"
                          maxLength={2000}
                          placeholder="Unidade, período e o que ocorreu, sem identificar você nem pacientes."
                          value={relatoDenuncia}
                          onChange={(e) => setRelatoDenuncia(e.target.value)}
                        />
                      </div>
                      <label className="flex items-start gap-2 text-sm leading-6 text-[#0E3A43]/80">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4"
                          checked={semDadosDeSaude}
                          onChange={(e) => setSemDadosDeSaude(e.target.checked)}
                        />
                        Confirmo que o texto não traz nome de paciente, prontuário nem outro dado de
                        saúde de terceiros.
                      </label>
                      {erroDenuncia ? (
                        <p className="text-sm text-red-700" role="alert">
                          {erroDenuncia}
                        </p>
                      ) : null}
                      <button type="submit" className={btnPrimary}>
                        Registrar denúncia nesta tela
                      </button>
                    </form>
                  )}
                </article>
              </ScrollReveal>
            </div>
          </div>
        </section>

        <section id="noticias" tabIndex={-1} className="scroll-mt-20 border-t border-[rgba(14,58,67,0.08)] bg-white/40 px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <ScrollReveal>
              <h2 className="text-2xl font-bold sm:text-3xl">Notícias, CCT e Sindes News</h2>
              <p className="mt-3 max-w-2xl text-sm text-[#0E3A43]/70">
                Acompanhe também no{" "}
                <a href={INSTAGRAM_PERFIL} className="font-semibold text-[#1F8A70] underline" target="_blank" rel="noopener noreferrer">
                  @sindesgv
                </a>
                .
              </p>
            </ScrollReveal>

            {!temNoticiasOuCct ? (
              <AvisoSecaoVazia>
                Notícias e destaques de CCT serão publicados aqui pela administração. Enquanto isso, use o Instagram
                oficial do sindicato.
              </AvisoSecaoVazia>
            ) : null}

            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              {destaquesCct.map((cct, i) => (
                <ScrollReveal key={`${cct.hospital}-${i}`} delayMs={i * 70}>
                  <article className={`${glassCard} p-6`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{cct.hospital}</h3>
                      {cct.confirmar ? <ConfirmarBadge /> : null}
                    </div>
                    <p className="mt-2 text-xs font-medium uppercase tracking-wide text-[#1F8A70]">
                      {cct.vigencia}
                    </p>
                    <dl className="mt-4 space-y-3 text-sm">
                      <div>
                        <dt className="font-semibold text-[#0E3A43]">Piso / reajuste</dt>
                        <dd className="text-[#0E3A43]/75">{cct.piso}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-[#0E3A43]">Adicionais</dt>
                        <dd className="text-[#0E3A43]/75">{cct.adicionais}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-[#0E3A43]">Jornada / plantão</dt>
                        <dd className="text-[#0E3A43]/75">{cct.jornada}</dd>
                      </div>
                    </dl>
                  </article>
                </ScrollReveal>
              ))}
            </div>

            <ul className="mt-8 grid gap-4 md:grid-cols-3">
              {noticias.map((n, i) => (
                <ScrollReveal key={`${n.titulo}-${i}`} delayMs={i * 50}>
                  <li className={`${glassCard} p-5`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1F8A70]">
                      {n.tipo} · {n.data}
                    </p>
                    <p className="mt-2 font-semibold">{n.titulo}</p>
                    <p className="mt-2 text-sm leading-6 text-[#0E3A43]/70">{n.resumo}</p>
                    <a
                      href={n.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#1F8A70] underline"
                    >
                      Ver no Instagram
                      {n.confirmar ? <ConfirmarBadge className="ml-2" /> : null}
                    </a>
                  </li>
                </ScrollReveal>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-[rgba(14,58,67,0.08)] px-4 py-16">
          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2">
            <article id="privacidade" tabIndex={-1} className="scroll-mt-24">
              <h2 className="text-xl font-bold">Privacidade e LGPD</h2>
              <p className="mt-3 text-sm leading-6 text-[#0E3A43]/75">
                O pedido no portal grava nome, CPF e assunto neste servidor, só para aquele atendimento,
                até o sindicato definir a retenção. A denúncia nesta página permanece no navegador. O texto
                completo está nos{" "}
                <Link href="/privacidade" className="font-semibold text-[#1F8A70] underline">
                  Termos de Privacidade
                </Link>
                .
              </p>
            </article>
            <article id="termos" tabIndex={-1} className="scroll-mt-24">
              <h2 className="text-xl font-bold">Termos de uso</h2>
              <p className="mt-3 text-sm leading-6 text-[#0E3A43]/75">
                Os textos são informativos. A estimativa de rescisão não é termo de homologação, não aplica
                convenção coletiva específica e não substitui a orientação de um advogado do sindicato.
              </p>
            </article>
          </div>
        </section>

        <InstagramFollowBand />
      </main>

      <footer id="contato" tabIndex={-1} className="scroll-mt-20 bg-[#0E3A43] px-4 py-12 text-white/90">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <Marca sobreEscuro />
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/75">
              Sindicato dos Trabalhadores da Saúde de Governador Valadares.
            </p>
            <a
              href={SINDES_WHATSAPP_URL}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-semibold text-white transition hover:bg-[#20bd5a]"
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              WhatsApp da assessoria
            </a>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em]">Institucional</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link className="rounded-sm hover:text-white" href="/privacidade">
                  Termos de Privacidade
                </Link>
              </li>
              <li>
                <a className="rounded-sm hover:text-white" href="#termos">
                  Termos de uso
                </a>
              </li>
              <li>
                <a className="rounded-sm hover:text-white" href="#denuncias">
                  Denúncias anônimas
                </a>
              </li>
              <li>
                <Link className="rounded-sm hover:text-white" href="/convenios">
                  Convênios
                </Link>
              </li>
              <li>
                <Link className="rounded-sm hover:text-white" href="/portal">
                  Portal do trabalhador
                </Link>
              </li>
              <li>
                <Link className="rounded-sm hover:text-white" href="/assessoria">
                  Assessoria (equipe)
                </Link>
              </li>
              <li>
                <Link className="rounded-sm hover:text-white" href="/admin">
                  Admin
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em]">Onde estamos</h2>
            <p className="mt-3 flex flex-wrap items-start gap-2 text-sm leading-6">
              <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Governador Valadares — MG (endereço e horário da sede conforme comunicados oficiais)</span>
            </p>
            <a
              href={INSTAGRAM_PERFIL}
              className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium hover:text-white"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Instagram aria-hidden="true" className="h-4 w-4" />
              @sindesgv
            </a>
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-6xl border-t border-white/10 pt-6 text-xs text-white/55">
          © 2026 SINDES. Portal e landing — rotas de admin, assessoria e convênios preservadas.
        </p>
      </footer>

      <WhatsAppFab />
    </div>
  );
}
