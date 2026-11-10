import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

type EstadoVisto = {
  vistoEm: string;
};

const PADRAO: EstadoVisto = { vistoEm: "" };

let arquivoAtual = path.join(process.cwd(), "data", "agendamentos-admin-visto.json");
let fila: Promise<void> = Promise.resolve();

export function usarArquivoAgendamentosAdminVisto(caminho: string) {
  arquivoAtual = caminho;
  fila = Promise.resolve();
}

function emFila<T>(tarefa: () => Promise<T>): Promise<T> {
  const resultado = fila.then(tarefa, tarefa);
  fila = resultado.then(
    () => undefined,
    () => undefined,
  );
  return resultado;
}

async function ler(): Promise<EstadoVisto> {
  try {
    const texto = await readFile(arquivoAtual, "utf8");
    const dados = JSON.parse(texto) as unknown;
    if (!dados || typeof dados !== "object") return { ...PADRAO };
    const item = dados as EstadoVisto;
    return { vistoEm: typeof item.vistoEm === "string" ? item.vistoEm : "" };
  } catch (erro) {
    if ((erro as NodeJS.ErrnoException).code === "ENOENT") {
      await mkdir(path.dirname(arquivoAtual), { recursive: true });
      await gravar({ ...PADRAO });
      return { ...PADRAO };
    }
    throw erro;
  }
}

async function gravar(estado: EstadoVisto) {
  await mkdir(path.dirname(arquivoAtual), { recursive: true });
  const temporario = `${arquivoAtual}.tmp`;
  await writeFile(temporario, `${JSON.stringify(estado, null, 2)}\n`, "utf8");
  await rename(temporario, arquivoAtual);
}

export function instanteUltimaVisualizacaoAdmin() {
  return emFila(async () => {
    const estado = await ler();
    return estado.vistoEm;
  });
}

export function marcarAgendamentosVistosPeloAdmin() {
  return emFila(async () => {
    await gravar({ vistoEm: new Date().toISOString() });
  });
}

export function agendamentoNovoParaAdmin(createdAt: string, vistoEm: string) {
  if (!vistoEm) return true;
  const criado = Date.parse(createdAt);
  const visto = Date.parse(vistoEm);
  if (Number.isNaN(criado)) return false;
  if (Number.isNaN(visto)) return true;
  return criado > visto;
}

export function contarNovosAgendamentosAdmin(criadosEm: string[]) {
  return emFila(async () => {
    const vistoEm = (await ler()).vistoEm;
    return criadosEm.filter((c) => agendamentoNovoParaAdmin(c, vistoEm)).length;
  });
}
