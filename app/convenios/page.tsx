import type { Metadata } from "next";
import VitrineConvenios from "@/components/VitrineConvenios";

export const metadata: Metadata = {
  title: "Convênios — SINDES",
  description: "Descontos publicados pela administração. O voucher só existe depois que a administração emite.",
};

export default function PaginaConvenios() {
  return <VitrineConvenios />;
}
