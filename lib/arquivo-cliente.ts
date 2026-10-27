import { LIMITE_BYTES } from "./trct";

export type NomeNeutro = "contracheque.pdf" | "contracheque.png" | "contracheque.jpg" | "documento.pdf" | "documento.png" | "documento.jpg";

function nomeNeutro(arquivo: File, prefixo: "contracheque" | "documento"): NomeNeutro | null {
  const nome = arquivo.name.toLowerCase();
  if (nome.endsWith(".pdf")) return `${prefixo}.pdf` as NomeNeutro;
  if (nome.endsWith(".png")) return `${prefixo}.png` as NomeNeutro;
  if (nome.endsWith(".jpg") || nome.endsWith(".jpeg")) return `${prefixo}.jpg` as NomeNeutro;
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
        reject(new Error("Não foi possível preparar a imagem. O arquivo original não foi enviado."));
        return;
      }
      contexto.drawImage(imagem, 0, 0);
      tela.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob) {
            reject(new Error("Não foi possível preparar a imagem. O arquivo original não foi enviado."));
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
      reject(new Error("Não foi possível preparar a imagem. O arquivo original não foi enviado."));
    };
    imagem.src = url;
  });
}

export async function prepararArquivoTrabalhador(arquivo: File, prefixo: "contracheque" | "documento") {
  const nome = arquivo.name.toLowerCase();
  if (!nome.endsWith(".pdf") && !nome.endsWith(".png") && !nome.endsWith(".jpg") && !nome.endsWith(".jpeg")) {
    throw new Error("Envie apenas PDF, PNG ou JPG.");
  }
  if (arquivo.size > LIMITE_BYTES) {
    throw new Error("O arquivo passa de 5 MB.");
  }
  const neutro = nomeNeutro(arquivo, prefixo);
  if (!neutro) throw new Error("Envie apenas PDF, PNG ou JPG.");
  if (neutro.endsWith(".pdf")) {
    return {
      blob: new Blob([await arquivo.arrayBuffer()], { type: "application/pdf" }),
      nomeNeutro: neutro,
    };
  }
  const blob = await imagemSemMetadados(arquivo, neutro.endsWith(".png") ? "image/png" : "image/jpeg");
  return { blob, nomeNeutro: neutro };
}

export const TEXTO_CONSENTIMENTO_VALIDACAO =
  "O contracheque e o documento com foto serão vistos somente pela equipe do sindicato para confirmar que trabalho na categoria deste pedido. Esses arquivos não são enviados a serviço de inteligência artificial.";
