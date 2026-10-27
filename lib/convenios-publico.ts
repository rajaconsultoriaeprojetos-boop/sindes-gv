export const CATEGORIAS = [
  { id: "farmacia", rotulo: "Farmácia" },
  { id: "psiquiatria", rotulo: "Psiquiatria e psicologia" },
  { id: "clube", rotulo: "Clube com piscina" },
  { id: "academia", rotulo: "Academia" },
  { id: "estetica", rotulo: "Estética" },
  { id: "otica", rotulo: "Ótica" },
] as const;

export type CategoriaId = (typeof CATEGORIAS)[number]["id"];

const IDS = new Set<string>(CATEGORIAS.map((item) => item.id));

export function categoriaValida(valor: string): valor is CategoriaId {
  return IDS.has(valor);
}

export function rotuloCategoria(id: string): string {
  return CATEGORIAS.find((item) => item.id === id)?.rotulo ?? id;
}

export function monograma(nome: string): string {
  const ignorar = new Set(["exemplo", "do", "da", "de", "com", "e"]);
  const partes = nome
    .split(/\s+/)
    .map((parte) => parte.trim())
    .filter((parte) => parte && !ignorar.has(parte.toLowerCase()));
  const base = partes.length > 0 ? partes : nome.split(/\s+/);
  const letras = base.slice(0, 2).map((parte) => parte[0] ?? "");
  const texto = letras.join("").toUpperCase();
  return texto || "EX";
}

export function primeiroNome(nome: string): string {
  const parte = nome.trim().split(/\s+/)[0] ?? "";
  return parte;
}
