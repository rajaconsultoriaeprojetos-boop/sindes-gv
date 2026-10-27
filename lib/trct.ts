export const LIMITE_BYTES = 5 * 1024 * 1024;

export const PROMPT_SISTEMA = `Você extrai dados de TRCT e contracheques brasileiros com precisão absoluta.
Copie os valores decimais exatamente como estão impressos.
Converta o formato brasileiro 1.234,56 para número JSON 1234.56.
Não arredonde. Não calcule. Não invente.
Se um campo não puder ser lido com certeza, use null.
Responda somente com JSON, sem markdown, neste formato:
{
  "dadosContratuais": {
    "dataAdmissao": "YYYY-MM-DD",
    "dataDemissao": "YYYY-MM-DD",
    "motivoAfastamento": "string",
    "salarioBase": 0,
    "grauInsalubridade": null,
    "mediaHorasExtras": null,
    "adicionalNoturno": null
  },
  "verbasPagasEmpregador": {
    "saldoSalario": 0,
    "avisoPrevioIndenizado": 0,
    "decimoTerceiroProporcional": 0,
    "feriasProporcionais": 0,
    "tercoConstitucionalFerias": 0,
    "valorTotalLiquido": 0
  }
}
Datas no formato YYYY-MM-DD ou null. motivoAfastamento é o texto impresso ou null. Números são JSON numbers ou null. Não use string no lugar de número.
grauInsalubridade só pode ser 0, 10, 20 ou 40, e somente se o grau estiver impresso. mediaHorasExtras e adicionalNoturno só entram se a média estiver impressa. Se não estiver no documento, use null. Não chute, não complete e não arredonde esses três campos.`;

export type GrauLido = 0 | 10 | 20 | 40;

export type DadosContratuais = {
  dataAdmissao: string | null;
  dataDemissao: string | null;
  motivoAfastamento: string | null;
  salarioBase: number | null;
  grauInsalubridade?: GrauLido | null;
  mediaHorasExtras?: number | null;
  adicionalNoturno?: number | null;
};

export type VerbasPagasEmpregador = {
  saldoSalario: number | null;
  avisoPrevioIndenizado: number | null;
  decimoTerceiroProporcional: number | null;
  feriasProporcionais: number | null;
  tercoConstitucionalFerias: number | null;
  valorTotalLiquido: number | null;
};

export type LeituraTrct = {
  dadosContratuais: DadosContratuais;
  verbasPagasEmpregador: VerbasPagasEmpregador;
};

export type RejeicaoArquivo = {
  status: 400 | 413;
  error: string;
};

const EXTENSOES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

export function decidirEnvio(
  arquivo: { name: string; type: string; size: number } | null,
  temLeitor: boolean,
): RejeicaoArquivo | { status: 503; error: string } | null {
  if (!arquivo) {
    return { status: 400, error: "Envie um arquivo PDF, PNG ou JPG." };
  }
  const rejeicao = avaliarArquivo(arquivo);
  if (rejeicao) return rejeicao;
  if (!temLeitor) {
    return {
      status: 503,
      error:
        "Nenhum leitor de TRCT está configurado. Defina OPENROUTER_API_KEY (recomendado), OPENAI_API_KEY ou ANTHROPIC_API_KEY.",
    };
  }
  return null;
}

export function avaliarArquivo(arquivo: { name: string; type: string; size: number }): RejeicaoArquivo | null {
  if (arquivo.size === 0) {
    return { status: 400, error: "O arquivo está vazio." };
  }
  const nome = arquivo.name.toLowerCase();
  const ponto = nome.lastIndexOf(".");
  const extensao = ponto >= 0 ? nome.slice(ponto) : "";
  const mimeEsperado = EXTENSOES[extensao];
  const mime = arquivo.type.toLowerCase();
  const mimeCompativel =
    mime === "" ||
    mime === "application/octet-stream" ||
    mime === mimeEsperado ||
    (mime === "image/jpg" && (extensao === ".jpg" || extensao === ".jpeg"));
  if (!mimeEsperado || !mimeCompativel) {
    return { status: 400, error: "Envie apenas PDF, PNG ou JPG." };
  }
  if (arquivo.size > LIMITE_BYTES) {
    return { status: 413, error: "O arquivo passa de 5 MB." };
  }
  return null;
}

const CHAVES_DADOS = ["dataAdmissao", "dataDemissao", "motivoAfastamento", "salarioBase"] as const;
const CHAVES_DADOS_OPCIONAIS = ["grauInsalubridade", "mediaHorasExtras", "adicionalNoturno"] as const;
const GRAUS_LIDOS = new Set([0, 10, 20, 40]);
const CHAVES_VERBAS = [
  "saldoSalario",
  "avisoPrevioIndenizado",
  "decimoTerceiroProporcional",
  "feriasProporcionais",
  "tercoConstitucionalFerias",
  "valorTotalLiquido",
] as const;

function objetoPermitido(
  valor: unknown,
  obrigatorias: readonly string[],
  opcionais: readonly string[] = [],
): Record<string, unknown> | null {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;
  const registro = valor as Record<string, unknown>;
  const permitidas = new Set<string>([...obrigatorias, ...opcionais]);
  if (!obrigatorias.every((chave) => Object.prototype.hasOwnProperty.call(registro, chave))) return null;
  if (Object.keys(registro).some((chave) => !permitidas.has(chave))) return null;
  return registro;
}

function numeroOpcional(registro: Record<string, unknown>, chave: string): number | null | undefined | "invalido" {
  if (!Object.prototype.hasOwnProperty.call(registro, chave)) return undefined;
  const valor = registro[chave];
  if (valor === null) return null;
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;
  return "invalido";
}

function dataOuNulo(valor: unknown): valor is string | null {
  if (valor === null) return true;
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [ano, mes, dia] = valor.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
}

function numeroOuNulo(valor: unknown): valor is number | null {
  return valor === null || (typeof valor === "number" && Number.isFinite(valor));
}

function textoOuNulo(valor: unknown): valor is string | null {
  return valor === null || typeof valor === "string";
}

export function validarLeitura(valor: unknown): LeituraTrct | null {
  const raiz = objetoPermitido(valor, ["dadosContratuais", "verbasPagasEmpregador"]);
  if (!raiz) return null;
  const dados = objetoPermitido(raiz.dadosContratuais, CHAVES_DADOS, CHAVES_DADOS_OPCIONAIS);
  const verbas = objetoPermitido(raiz.verbasPagasEmpregador, CHAVES_VERBAS);
  if (!dados || !verbas) return null;
  if (!dataOuNulo(dados.dataAdmissao) || !dataOuNulo(dados.dataDemissao)) return null;
  if (!textoOuNulo(dados.motivoAfastamento) || !numeroOuNulo(dados.salarioBase)) return null;
  if (!CHAVES_VERBAS.every((chave) => numeroOuNulo(verbas[chave]))) return null;
  const grau = numeroOpcional(dados, "grauInsalubridade");
  const horas = numeroOpcional(dados, "mediaHorasExtras");
  const noturno = numeroOpcional(dados, "adicionalNoturno");
  if (grau === "invalido" || horas === "invalido" || noturno === "invalido") return null;
  const grauLido = grau === undefined || grau === null || GRAUS_LIDOS.has(grau) ? grau : null;
  return {
    dadosContratuais: {
      dataAdmissao: dados.dataAdmissao,
      dataDemissao: dados.dataDemissao,
      motivoAfastamento: dados.motivoAfastamento,
      salarioBase: dados.salarioBase,
      ...(grauLido !== undefined ? { grauInsalubridade: grauLido as GrauLido | null } : {}),
      ...(horas !== undefined ? { mediaHorasExtras: horas } : {}),
      ...(noturno !== undefined ? { adicionalNoturno: noturno } : {}),
    },
    verbasPagasEmpregador: {
      saldoSalario: verbas.saldoSalario as number | null,
      avisoPrevioIndenizado: verbas.avisoPrevioIndenizado as number | null,
      decimoTerceiroProporcional: verbas.decimoTerceiroProporcional as number | null,
      feriasProporcionais: verbas.feriasProporcionais as number | null,
      tercoConstitucionalFerias: verbas.tercoConstitucionalFerias as number | null,
      valorTotalLiquido: verbas.valorTotalLiquido as number | null,
    },
  };
}

export function classificarMotivo(texto: string): "sem-justa-causa" | "pedido-demissao" | null {
  const normal = texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  const pedido = normal.includes("pedido de demissao");
  const semJustaCausa = normal.includes("sem justa causa");
  if (pedido === semJustaCausa) return null;
  return pedido ? "pedido-demissao" : "sem-justa-causa";
}

/** Respostas de IA costumam vir em bloco ```json ... ``` */
export function extrairJsonRespostaIa(texto: string): string {
  const bruto = texto.trim();
  const cercado = bruto.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (cercado) return cercado[1].trim();
  return bruto.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}
