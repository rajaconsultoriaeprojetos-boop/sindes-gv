import { PROMPT_SISTEMA } from "./trct";

const PADRAO_MODELO = "anthropic/claude-haiku-4.5";

export function modeloOpenRouter() {
  const bruto = (process.env.AI_MODEL || process.env.OPENROUTER_MODEL || PADRAO_MODELO).trim();
  return bruto || PADRAO_MODELO;
}

export function openRouterConfigurado() {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

type ParteUsuario =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | {
      type: "file";
      file: { filename: string; file_data: string };
    };

export async function lerComOpenRouter(
  bytes: Buffer,
  pdf: boolean,
  mime: "image/png" | "image/jpeg",
  apiKey: string,
) {
  const base64 = bytes.toString("base64");
  const partes: ParteUsuario[] = [
    pdf
      ? {
          type: "file",
          file: {
            filename: "trct.pdf",
            file_data: `data:application/pdf;base64,${base64}`,
          },
        }
      : {
          type: "image_url",
          image_url: { url: `data:${mime};base64,${base64}` },
        },
    { type: "text", text: "Leia o documento e responda somente com o JSON pedido." },
  ];

  const resposta = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL?.trim() || "https://sindesgv.com.br",
      "X-Title": process.env.OPENROUTER_APP_NAME?.trim() || "SINDES Calculadora TRCT",
    },
    body: JSON.stringify({
      model: modeloOpenRouter(),
      temperature: 0,
      max_tokens: 1024,
      messages: [
        { role: "system", content: PROMPT_SISTEMA },
        { role: "user", content: partes },
      ],
    }),
  });

  if (!resposta.ok) {
    const corpo = await resposta.text().catch(() => "");
    throw new Error(`openrouter ${resposta.status}${corpo ? `: ${corpo.slice(0, 200)}` : ""}`);
  }

  const json = (await resposta.json()) as {
    choices?: { message?: { content?: string | { type: string; text?: string }[] } }[];
  };
  const bruto = json.choices?.[0]?.message?.content;
  let texto = "";
  if (typeof bruto === "string") texto = bruto.trim();
  else if (Array.isArray(bruto)) {
    texto = bruto
      .map((p) => (p && typeof p === "object" && "text" in p && typeof p.text === "string" ? p.text : ""))
      .join("")
      .trim();
  }
  if (!texto) throw new Error("resposta vazia");
  return texto;
}

/** Smoke test (sem documento) — só verifica chave e modelo. */
export async function pingOpenRouter(apiKey: string) {
  const resposta = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL?.trim() || "https://sindesgv.com.br",
      "X-Title": process.env.OPENROUTER_APP_NAME?.trim() || "SINDES Calculadora TRCT",
    },
    body: JSON.stringify({
      model: modeloOpenRouter(),
      max_tokens: 8,
      messages: [{ role: "user", content: 'Responda só: {"ok":true}' }],
    }),
  });
  return resposta.ok;
}
