import { connection } from "next/server";
import { redirect } from "next/navigation";
import CalculadoraHomologacao from "@/components/CalculadoraHomologacao";
import { calculadoraAutenticadaServidor } from "@/lib/sessao-pagina";

export default async function CalculadoraProtegida() {
  await connection();
  if (!(await calculadoraAutenticadaServidor())) {
    redirect("/entrar?depois=/calculadora");
  }
  return <CalculadoraHomologacao />;
}
