import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Voucher — SINDES",
  description: "Cartão de desconto emitido pela administração do SINDES.",
};

export default function LayoutVoucher({ children }: { children: React.ReactNode }) {
  return children;
}
