import { connection } from "next/server";
import { Suspense } from "react";
import SindesLanding from "@/components/SindesLanding";
import { lerLandingCms } from "@/lib/cms/landing";

function CarregandoLanding() {
  return (
    <main className="min-h-dvh bg-[#F8FAFC] px-4 py-16 text-center">
      <p className="text-sm font-medium text-[#1D0D2C]">Carregando…</p>
    </main>
  );
}

async function LandingComCms() {
  await connection();
  const cms = await lerLandingCms();
  return <SindesLanding cms={cms} />;
}

export default function Home() {
  return (
    <Suspense fallback={<CarregandoLanding />}>
      <LandingComCms />
    </Suspense>
  );
}
