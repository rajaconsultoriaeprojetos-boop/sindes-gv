import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { negarSemCalculadoraApi } from "@/lib/rbac/autorizacao";
import { PROMPT_SISTEMA, decidirEnvio, validarLeitura, extrairJsonRespostaIa } from "@/lib/trct";
import { lerComOpenRouter } from "@/lib/trct-leitor-openrouter";
import { provedorTrctAtivo, trctLeitorConfigurado } from "@/lib/trct-provedor";

function semCache(corpo: unknown, status: number) {
  return NextResponse.json(corpo, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function ehPdf(tipo: string, nome: string) {
  return tipo === "application/pdf" || nome.toLowerCase().endsWith(".pdf");
}

function mimeImagem(tipo: string, nome: string): "image/png" | "image/jpeg" {
  if (tipo === "image/png" || nome.toLowerCase().endsWith(".png")) return "image/png";
  return "image/jpeg";
}

async function lerComOpenAI(bytes: Buffer, pdf: boolean, mime: "image/png" | "image/jpeg", apiKey: string) {
  const cliente = new OpenAI({ apiKey });
  const base64 = bytes.toString("base64");
  const resposta = await cliente.responses.create({
    model: "gpt-4o",
    temperature: 0,
    input: [
      { role: "system", content: PROMPT_SISTEMA },
      {
        role: "user",
        content: [
          pdf
            ? {
                type: "input_file" as const,
                filename: "documento.pdf",
                file_data: `data:application/pdf;base64,${base64}`,
              }
            : {
                type: "input_image" as const,
                detail: "high" as const,
                image_url: `data:${mime};base64,${base64}`,
              },
          {
            type: "input_text" as const,
            text: "Leia o documento e responda somente com o JSON pedido.",
          },
        ],
      },
    ],
  });
  const texto = resposta.output_text.trim();
  if (!texto) throw new Error("resposta vazia");
  return texto;
}

async function lerComAnthropic(bytes: Buffer, pdf: boolean, mime: "image/png" | "image/jpeg", apiKey: string) {
  const cliente = new Anthropic({ apiKey });
  const base64 = bytes.toString("base64");
  const resposta = await cliente.messages.create({
    model: "claude-3-5-sonnet-latest",
    max_tokens: 1024,
    temperature: 0,
    system: PROMPT_SISTEMA,
    messages: [
      {
        role: "user",
        content: [
          pdf
            ? {
                type: "document" as const,
                source: {
                  type: "base64" as const,
                  media_type: "application/pdf" as const,
                  data: base64,
                },
              }
            : {
                type: "image" as const,
                source: {
                  type: "base64" as const,
                  media_type: mime,
                  data: base64,
                },
              },
          {
            type: "text" as const,
            text: "Leia o documento e responda somente com o JSON pedido.",
          },
        ],
      },
    ],
  });
  const texto = resposta.content
    .filter((bloco) => bloco.type === "text")
    .map((bloco) => bloco.text)
    .join("")
    .trim();
  if (!texto) throw new Error("resposta vazia");
  return texto;
}

export async function POST(request: Request) {
  const negado = negarSemCalculadoraApi(request);
  if (negado) return negado;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return semCache({ error: "Envie o arquivo em formato multipart." }, 400);
  }

  const bruto = form.get("arquivo");
  const arquivo = bruto instanceof File ? bruto : null;
  const provedor = provedorTrctAtivo();
  const openai = process.env.OPENAI_API_KEY;
  const anthropic = process.env.ANTHROPIC_API_KEY;
  const openrouter = process.env.OPENROUTER_API_KEY?.trim();
  const decisao = decidirEnvio(
    arquivo ? { name: arquivo.name, type: arquivo.type, size: arquivo.size } : null,
    trctLeitorConfigurado(),
  );
  if (decisao) return semCache({ error: decisao.error }, decisao.status);
  if (!arquivo) return semCache({ error: "Envie um arquivo PDF, PNG ou JPG." }, 400);

  const pdf = ehPdf(arquivo.type, arquivo.name);
  const mime = mimeImagem(arquivo.type, arquivo.name);
  const bytes = Buffer.from(await arquivo.arrayBuffer());
  let texto = "";
  try {
    if (provedor === "openrouter" && openrouter) {
      texto = await lerComOpenRouter(bytes, pdf, mime, openrouter);
    } else if (provedor === "openai" && openai) {
      texto = await lerComOpenAI(bytes, pdf, mime, openai);
    } else if (provedor === "anthropic" && anthropic) {
      texto = await lerComAnthropic(bytes, pdf, mime, anthropic);
    } else {
      return semCache({ error: "Provedor de IA não configurado no servidor." }, 503);
    }
    let brutoJson: unknown;
    try {
      brutoJson = JSON.parse(extrairJsonRespostaIa(texto));
    } catch {
      return semCache({ error: "A leitura não voltou um JSON válido. Nada foi preenchido." }, 502);
    }
    const leitura = validarLeitura(brutoJson);
    if (!leitura) {
      return semCache({ error: "A leitura não voltou os dados esperados. Nada foi preenchido." }, 502);
    }
    return semCache(leitura, 200);
  } catch {
    return semCache({ error: "A leitura falhou. Nada foi preenchido." }, 502);
  } finally {
    bytes.fill(0);
    texto = "";
  }
}
