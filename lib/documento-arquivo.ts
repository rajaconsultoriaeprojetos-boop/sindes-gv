import { LIMITE_BYTES, avaliarArquivo } from "./trct";

export type TipoDocumentoSalvo = "pdf" | "png" | "jpeg";

export type ResultadoValidacaoBytes =
  | { ok: true; tipo: TipoDocumentoSalvo }
  | { ok: false; status: 400 | 413; erro: string };

export function validarBytesDocumento(
  bytes: Buffer,
  metadados: { name: string; type: string; size: number },
): ResultadoValidacaoBytes {
  const rejeicao = avaliarArquivo(metadados);
  if (rejeicao) {
    return { ok: false, status: rejeicao.status, erro: rejeicao.error };
  }
  if (bytes.length === 0) {
    return { ok: false, status: 400, erro: "O arquivo está vazio." };
  }
  if (bytes.length > LIMITE_BYTES) {
    return { ok: false, status: 413, erro: "O arquivo passa de 5 MB." };
  }
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return { ok: true, tipo: "pdf" };
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { ok: true, tipo: "png" };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ok: true, tipo: "jpeg" };
  }
  return { ok: false, status: 400, erro: "Envie apenas PDF, PNG ou JPG." };
}

export function extensaoSalva(tipo: TipoDocumentoSalvo): "pdf" | "png" | "jpg" {
  return tipo === "jpeg" ? "jpg" : tipo;
}

export function mimeSalvo(tipo: TipoDocumentoSalvo): string {
  if (tipo === "pdf") return "application/pdf";
  if (tipo === "png") return "image/png";
  return "image/jpeg";
}
