"use client";

import SindesBrandLogoSvg from "@/components/landing/SindesBrandLogoSvg";

/**
 * Marca Sindes-GV em órbita 3D — SVG inline (vetor nítido em qualquer DPI).
 * Rotação lenta Y (~22s) + inclinação X; reduced-motion = estático.
 */
export default function HeroLogoOrbit() {
  return (
    <div
      className="hero-orbit-scene mx-auto w-full max-w-[min(88vw,560px)] lg:mx-0 lg:max-w-[620px]"
      aria-hidden="true"
    >
      <div className="hero-orbit-ring relative aspect-square w-full min-h-[240px] sm:min-h-[300px] lg:min-h-[min(52vw,520px)]">
        <div className="hero-orbit-glow pointer-events-none absolute inset-[2%] rounded-full bg-[#5D25AA]/35 blur-[80px]" />
        <div className="hero-orbit-glow pointer-events-none absolute inset-[12%] rounded-full bg-[#FCB065]/20 blur-[70px]" />
        <div className="hero-orbit-glow pointer-events-none absolute inset-[15%] rounded-full bg-[#1E6FD9]/22 blur-[70px]" />
        <div className="hero-orbit-spinner absolute inset-0">
          <div className="hero-orbit-tilt flex h-full w-full items-center justify-center">
            <SindesBrandLogoSvg
              variant="onDark"
              className="hero-orbit-logo h-[94%] w-[94%] max-w-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
