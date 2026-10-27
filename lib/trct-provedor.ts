export type ProvedorTrct = "openrouter" | "openai" | "anthropic";

export function provedorTrctAtivo(): ProvedorTrct | null {
  const preferido = (process.env.AI_PROVIDER || "").trim().toLowerCase();
  const openrouter = Boolean(process.env.OPENROUTER_API_KEY?.trim());
  const openai = Boolean(process.env.OPENAI_API_KEY?.trim());
  const anthropic = Boolean(process.env.ANTHROPIC_API_KEY?.trim());

  if (preferido === "openrouter" && openrouter) return "openrouter";
  if (preferido === "openai" && openai) return "openai";
  if (preferido === "anthropic" && anthropic) return "anthropic";
  if (openrouter) return "openrouter";
  if (openai) return "openai";
  if (anthropic) return "anthropic";
  return null;
}

export function trctLeitorConfigurado() {
  return provedorTrctAtivo() !== null;
}
