import ScrollReveal from "@/components/landing/ScrollReveal";
import InstagramIconGradient from "@/components/landing/InstagramIconGradient";
import { INSTAGRAM_PERFIL } from "@/components/landing/conteudo-instagram";
import { btnPrimary } from "@/components/landing/plantao-theme";

export default function InstagramFollowBand() {
  return (
    <section
      id="instagram"
      tabIndex={-1}
      className="scroll-mt-20 border-t border-[rgba(14,58,67,0.08)] bg-gradient-to-br from-[#0E3A43] via-[#0E3A43] to-[#1F8A70]/80 px-4 py-16 sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <ScrollReveal>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-6 shadow-[0_16px_48px_rgba(0,0,0,0.25)] backdrop-blur-md sm:flex sm:items-center sm:gap-8 sm:p-10">
            <div className="flex shrink-0 justify-center sm:justify-start">
              <InstagramIconGradient className="h-20 w-20 sm:h-24 sm:w-24" />
            </div>
            <div className="mt-6 text-center sm:mt-0 sm:flex-1 sm:text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#F2A20C]">
                Sindes no Instagram
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Acompanhe @sindesgv no plantão e fora dele
              </h2>
              <p className="mt-3 max-w-xl text-base leading-7 text-white/85">
                Notícias do sindicato, CCT, convocação de assembleia, coberturas e vídeos do Sindes News —
                tudo no feed oficial. Siga para não perder piso, adicional e orientação da diretoria.
              </p>
              <a
                href={INSTAGRAM_PERFIL}
                target="_blank"
                rel="noopener noreferrer"
                className={`${btnPrimary} mt-6 w-full sm:w-auto`}
              >
                Seguir @sindesgv no Instagram
              </a>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
