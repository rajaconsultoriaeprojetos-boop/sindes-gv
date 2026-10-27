import AtendimentoJuridico from "@/components/AtendimentoJuridico";

export const instant = false;

export default async function PaginaAtendimentoSalvo({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AtendimentoJuridico atendimentoId={id} />;
}
