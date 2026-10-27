import { google } from "googleapis";
import { lerConfigGestaoSheets, planilhaEfetiva, salvarConfigGestaoSheets } from "./gestao-sheets-config";
import type { Agendamento } from "./agendamentos";
import { ROTULO_TIPO_AGENDAMENTO } from "./tipos-agendamento";
import type { RegistroValidacao, StatusValidacao, TipoServicoValidacao } from "./validacao-trabalhador";
import { authGoogle, credenciaisGoogleConfiguradas } from "./google-credenciais";

const ABA_PEDIDOS = "Pedidos";
const ABA_TRABALHADORES = "Trabalhadores";
const ABA_AGENDAMENTOS = "Agendamentos";

export { credenciaisGoogleConfiguradas };

export function statusPlanilha(status: StatusValidacao): "aguardando_validacao" | "aprovado" | "recusado" {
  if (status === "pendente") return "aguardando_validacao";
  return status;
}

function linhaDoPedido(registro: Pick<RegistroValidacao, "createdAt" | "tipo" | "nomeCompleto" | "telefone" | "localTrabalho" | "cargo" | "status" | "servicoId" | "id">) {
  return [
    registro.createdAt,
    registro.tipo,
    registro.nomeCompleto,
    registro.telefone,
    registro.localTrabalho,
    registro.cargo,
    statusPlanilha(registro.status),
    registro.servicoId,
    registro.id,
  ];
}

async function clienteSheets() {
  const auth = await authGoogle(["https://www.googleapis.com/auth/spreadsheets"]);
  if (!auth) return null;
  const config = await lerConfigGestaoSheets();
  const spreadsheetId = planilhaEfetiva(config);
  if (!spreadsheetId) return null;
  return { sheets: google.sheets({ version: "v4", auth }), spreadsheetId, config };
}

export async function testarConexaoGoogle(spreadsheetIdInformado?: string) {
  if (!credenciaisGoogleConfiguradas()) {
    return { ok: false as const, erro: "As credenciais do Google não foram configuradas no servidor." };
  }
  const config = await lerConfigGestaoSheets();
  const spreadsheetId = (spreadsheetIdInformado ?? planilhaEfetiva(config)).trim();
  if (!spreadsheetId) {
    return { ok: false as const, erro: "Informe o ID da planilha." };
  }
  try {
    const auth = await authGoogle(["https://www.googleapis.com/auth/spreadsheets"]);
    if (!auth) return { ok: false as const, erro: "Não foi possível ler as credenciais do Google." };
    const sheets = google.sheets({ version: "v4", auth });
    await sheets.spreadsheets.get({ spreadsheetId });
    await salvarConfigGestaoSheets({ lastError: "", spreadsheetId });
    return { ok: true as const };
  } catch {
    return { ok: false as const, erro: "Não foi possível acessar a planilha. Confira o ID e o compartilhamento com a conta de serviço." };
  }
}

export async function sincronizarNovoPedido(registro: RegistroValidacao) {
  try {
    const config = await lerConfigGestaoSheets();
    if (!config.syncEnabled || !credenciaisGoogleConfiguradas()) return;
    const cliente = await clienteSheets();
    if (!cliente) return;
    await cliente.sheets.spreadsheets.values.append({
      spreadsheetId: cliente.spreadsheetId,
      range: `${ABA_PEDIDOS}!A:I`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [linhaDoPedido(registro)] },
    });
    await salvarConfigGestaoSheets({ lastError: "", lastSyncAt: new Date().toISOString() });
  } catch {
    await salvarConfigGestaoSheets({
      lastError: "Não foi possível enviar o pedido para o Google Sheets.",
      lastSyncAt: new Date().toISOString(),
    });
  }
}

export async function sincronizarStatusPedido(
  servicoId: string,
  tipo: TipoServicoValidacao,
  status: StatusValidacao,
  registro: RegistroValidacao,
) {
  try {
    const config = await lerConfigGestaoSheets();
    if (!config.syncEnabled || !credenciaisGoogleConfiguradas()) return;
    const cliente = await clienteSheets();
    if (!cliente) return;
    const leitura = await cliente.sheets.spreadsheets.values.get({
      spreadsheetId: cliente.spreadsheetId,
      range: `${ABA_PEDIDOS}!A:I`,
    });
    const linhas = leitura.data.values ?? [];
    let indice = -1;
    for (let i = linhas.length - 1; i >= 0; i -= 1) {
      const linha = linhas[i];
      if (linha?.[7] === servicoId && linha?.[1] === tipo) {
        indice = i;
        break;
      }
    }
    if (indice < 0) {
      await sincronizarNovoPedido({ ...registro, status });
      return;
    }
    const numeroLinha = indice + 1;
    await cliente.sheets.spreadsheets.values.update({
      spreadsheetId: cliente.spreadsheetId,
      range: `${ABA_PEDIDOS}!G${numeroLinha}`,
      valueInputOption: "RAW",
      requestBody: { values: [[statusPlanilha(status)]] },
    });
    await salvarConfigGestaoSheets({ lastError: "", lastSyncAt: new Date().toISOString() });
  } catch {
    await salvarConfigGestaoSheets({
      lastError: "Não foi possível atualizar o status na planilha.",
      lastSyncAt: new Date().toISOString(),
    });
  }
}

export async function sincronizarTrabalhadorPlanilha(agendamento: Agendamento) {
  try {
    const config = await lerConfigGestaoSheets();
    if (!config.syncEnabled || !credenciaisGoogleConfiguradas()) return;
    const cliente = await clienteSheets();
    if (!cliente) return;
    await cliente.sheets.spreadsheets.values.append({
      spreadsheetId: cliente.spreadsheetId,
      range: `${ABA_TRABALHADORES}!A:H`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [
          [
            agendamento.createdAt,
            agendamento.nome,
            agendamento.telefone,
            agendamento.localTrabalho,
            agendamento.cargo,
            agendamento.cpf ?? "",
            ROTULO_TIPO_AGENDAMENTO[agendamento.tipo],
            agendamento.id,
          ],
        ],
      },
    });
    await salvarConfigGestaoSheets({ lastError: "", lastSyncAt: new Date().toISOString() });
  } catch {
    await salvarConfigGestaoSheets({
      lastError: "Não foi possível registrar o trabalhador na planilha.",
      lastSyncAt: new Date().toISOString(),
    });
  }
}

export async function sincronizarAgendamentoPlanilha(agendamento: Agendamento) {
  try {
    const config = await lerConfigGestaoSheets();
    if (!config.syncEnabled || !credenciaisGoogleConfiguradas()) return;
    const cliente = await clienteSheets();
    if (!cliente) return;
    await cliente.sheets.spreadsheets.values.append({
      spreadsheetId: cliente.spreadsheetId,
      range: `${ABA_AGENDAMENTOS}!A:L`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [
          [
            agendamento.createdAt,
            agendamento.inicio,
            agendamento.fim,
            agendamento.tipo,
            agendamento.nome,
            agendamento.telefone,
            agendamento.localTrabalho,
            agendamento.cargo,
            agendamento.assunto ?? "",
            agendamento.partnerName ?? "",
            agendamento.servicoId ?? "",
            agendamento.id,
          ],
        ],
      },
    });
    await salvarConfigGestaoSheets({ lastError: "", lastSyncAt: new Date().toISOString() });
  } catch {
    await salvarConfigGestaoSheets({
      lastError: "Não foi possível registrar o agendamento na planilha.",
      lastSyncAt: new Date().toISOString(),
    });
  }
}
