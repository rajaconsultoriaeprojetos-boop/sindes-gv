import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Atendimento jurídico — SINDES",
  description: "Sala, notas e chat de um atendimento jurídico gravado neste servidor.",
};

export default function LayoutAtendimento({ children }: { children: React.ReactNode }) {
  return children;
}
