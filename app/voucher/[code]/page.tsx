import CartaoVoucher from "@/components/CartaoVoucher";

export const instant = false;

export default async function PaginaVoucher({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <CartaoVoucher code={code} />;
}
