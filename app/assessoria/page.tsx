import type { Metadata } from "next";
import AssessoriaLista from "@/components/AssessoriaLista";

export const metadata: Metadata = {
  title: "Assessoria — SINDES",
  description: "Lista dos atendimentos jurídicos gravados neste servidor.",
};

export default function PaginaAssessoria() {
  return <AssessoriaLista />;
}
