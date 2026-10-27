#!/usr/bin/env node
/**
 * Smoke OpenRouter a partir do .env.local do servidor (não imprime segredos).
 * Uso na VPS: cd /var/www/sindes && node scripts/smoke-openrouter.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

function carregarEnvLocal() {
  const caminho = join(process.cwd(), ".env.local");
  const texto = readFileSync(caminho, "utf8");
  for (const linha of texto.split("\n")) {
    const t = linha.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const chave = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[chave]) process.env[chave] = val;
  }
}

try {
  carregarEnvLocal();
} catch {
  console.error("smoke-openrouter: .env.local não encontrado");
  process.exit(1);
}

const key = process.env.OPENROUTER_API_KEY?.trim();
if (!key) {
  console.error("smoke-openrouter: OPENROUTER_API_KEY ausente");
  process.exit(1);
}

const model = (process.env.AI_MODEL || "anthropic/claude-haiku-4.5").trim();

const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://sindesgv.com.br",
    "X-Title": process.env.OPENROUTER_APP_NAME || "SINDES Calculadora TRCT",
  },
  body: JSON.stringify({
    model,
    max_tokens: 12,
    messages: [{ role: "user", content: "Responda apenas OK" }],
  }),
});

if (!res.ok) {
  const t = await res.text().catch(() => "");
  console.error("smoke-openrouter: HTTP", res.status, t.slice(0, 120));
  process.exit(1);
}

console.log("smoke-openrouter: ok model=" + model);
process.exit(0);
