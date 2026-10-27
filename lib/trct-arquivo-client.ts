import { LIMITE_BYTES, avaliarArquivo } from "./trct";

export type NomeNeutroTrct = "trct.pdf" | "trct.png" | "trct.jpg";

export function nomeNeutroTrct(arquivo: File): NomeNeutroTrct | null {
  const nome = arquivo.name.toLowerCase();
  if (nome.endsWith(".pdf")) return "trct.pdf";
  if (nome.endsWith(".png")) return "trct.png";
  if (nome.endsWith(".jpg") || nome.endsWith(".jpeg")) return "trct.jpg";
  return null;
}

function imagemSemMetadados(arquivo: File, tipo: "image/png" | "image/jpeg"): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const imagem = new Image();
    imagem.onload = () => {
      const tela = document.createElement("canvas");
      tela.width = imagem.naturalWidth;
      tela.height = imagem.naturalHeight;
      const contexto = tela.getContext("2d");
      if (!contexto || tela.width === 0 || tela.height === 0) {
        URL.revokeObjectURL(url);
        reject(new Error("Não foi possível limpar a imagem. O arquivo original não foi enviado."));
        return;
      }
      contexto.drawImage(imagem, 0, 0);
      tela.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob) {
            reject(new Error("Não foi possível limpar a imagem. O arquivo original não foi enviado."));
            return;
          }
          resolve(blob);
        },
        tipo,
        0.92,
      );
    };
    imagem.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível limpar a imagem. O arquivo original não foi enviado."));
    };
    imagem.src = url;
  });
}

export async function prepararArquivoTrct(arquivo: File): Promise<{ blob: Blob; nome: NomeNeutroTrct }> {
  const rejeicao = avaliarArquivo(arquivo);
  if (rejeicao) throw new Error(rejeicao.error);
  if (arquivo.size > LIMITE_BYTES) throw new Error("O arquivo passa de 5 MB.");
  const nome = nomeNeutroTrct(arquivo);
  if (!nome) throw new Error("Envie apenas PDF, PNG ou JPG.");
  if (nome === "trct.pdf") {
    return {
      blob: new Blob([await arquivo.arrayBuffer()], { type: "application/pdf" }),
      nome,
    };
  }
  const blob = await imagemSemMetadados(arquivo, nome === "trct.png" ? "image/png" : "image/jpeg");
  return { blob, nome };
}

export async function enviarArquivoTrctApi(blob: Blob, nome: NomeNeutroTrct): Promise<unknown> {
  const corpo = new FormData();
  corpo.append("arquivo", blob, nome);
  const resposta = await fetch("/api/analisar-trct", { method: "POST", body: corpo });
  const dados: unknown = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    const mensagem =
      dados && typeof dados === "object" && "error" in dados && typeof dados.error === "string"
        ? dados.error
        : "Não foi possível ler o arquivo.";
    throw new Error(mensagem);
  }
  return dados;
}
