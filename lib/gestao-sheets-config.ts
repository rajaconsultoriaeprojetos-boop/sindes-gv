import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type ConfigGestaoSheets = {
  spreadsheetId: string;
  syncEnabled: boolean;
  lastError: string;
  lastSyncAt: string;
  lastCalendarError: string;
  lastCalendarSyncAt: string;
};

const PADRAO: ConfigGestaoSheets = {
  spreadsheetId: "",
  syncEnabled: false,
  lastError: "",
  lastSyncAt: "",
  lastCalendarError: "",
  lastCalendarSyncAt: "",
};

let diretorio = path.join(process.cwd(), "data");
let fila: Promise<void> = Promise.resolve();

export function usarDiretorioGestaoSheets(caminho: string) {
  diretorio = caminho;
  fila = Promise.resolve();
}

function arquivo() {
  return path.join(diretorio, "gestao-sheets.json");
}

function emFila<T>(tarefa: () => Promise<T>): Promise<T> {
  const resultado = fila.then(tarefa, tarefa);
  fila = resultado.then(
    () => undefined,
    () => undefined,
  );
  return resultado;
}

function validar(valor: unknown): ConfigGestaoSheets {
  if (!valor || typeof valor !== "object") return { ...PADRAO };
  const item = valor as ConfigGestaoSheets;
  return {
    spreadsheetId: typeof item.spreadsheetId === "string" ? item.spreadsheetId.trim() : "",
    syncEnabled: item.syncEnabled === true,
    lastError: typeof item.lastError === "string" ? item.lastError : "",
    lastSyncAt: typeof item.lastSyncAt === "string" ? item.lastSyncAt : "",
    lastCalendarError: typeof item.lastCalendarError === "string" ? item.lastCalendarError : "",
    lastCalendarSyncAt: typeof item.lastCalendarSyncAt === "string" ? item.lastCalendarSyncAt : "",
  };
}

export function lerConfigGestaoSheets() {
  return emFila(() => lerDireto());
}

async function lerDireto(): Promise<ConfigGestaoSheets> {
  try {
    const texto = await readFile(arquivo(), "utf8");
    return validar(JSON.parse(texto) as unknown);
  } catch (erro) {
    if ((erro as NodeJS.ErrnoException).code === "ENOENT") return { ...PADRAO };
    throw erro;
  }
}

export function salvarConfigGestaoSheets(parcial: Partial<ConfigGestaoSheets>) {
  return emFila(async () => {
    const atual = await lerDireto();
    const novo: ConfigGestaoSheets = {
      spreadsheetId:
        typeof parcial.spreadsheetId === "string" ? parcial.spreadsheetId.trim() : atual.spreadsheetId,
      syncEnabled: typeof parcial.syncEnabled === "boolean" ? parcial.syncEnabled : atual.syncEnabled,
      lastError: typeof parcial.lastError === "string" ? parcial.lastError : atual.lastError,
      lastSyncAt: typeof parcial.lastSyncAt === "string" ? parcial.lastSyncAt : atual.lastSyncAt,
      lastCalendarError:
        typeof parcial.lastCalendarError === "string" ? parcial.lastCalendarError : atual.lastCalendarError,
      lastCalendarSyncAt:
        typeof parcial.lastCalendarSyncAt === "string" ? parcial.lastCalendarSyncAt : atual.lastCalendarSyncAt,
    };
    await mkdir(diretorio, { recursive: true });
    const destino = arquivo();
    const temporario = `${destino}.tmp`;
    await writeFile(temporario, `${JSON.stringify(novo, null, 2)}\n`, "utf8");
    await rename(temporario, destino);
    return novo;
  });
}

export function planilhaEfetiva(config: ConfigGestaoSheets) {
  const doPainel = config.spreadsheetId.trim();
  if (doPainel) return doPainel;
  return (process.env.GOOGLE_SHEETS_SPREADSHEET_ID ?? "").trim();
}
