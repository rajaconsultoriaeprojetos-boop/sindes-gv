import type { Metadata } from "next";
import AdminConvenios from "@/components/AdminConvenios";

export const metadata: Metadata = {
  title: "Administração de convênios — SINDES",
  description: "Área local para cadastrar convênios e emitir vouchers.",
};

export default function PaginaAdmin() {
  return <AdminConvenios />;
}
