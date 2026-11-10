import nodemailer from "nodemailer";
import type { ResumoAgendamento } from "./agendamentos";
import { ROTULO_TIPO_AGENDAMENTO } from "./tipos-agendamento";

let avisoSmtpAusenteRegistrado = false;

function smtpConfigurado() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  return Boolean(host && user && pass);
}

function destinatariosAdmin(): string[] {
  const bruto =
    process.env.SINDES_ADMIN_NOTIFY_EMAIL?.trim() ||
    process.env.SUPERADMIN_EMAILS?.trim() ||
    "";
  if (!bruto) return [];
  return bruto
    .split(/[,;]/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
}

function formatarDataHora(iso: string) {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short" }).format(data);
}

function origemSite() {
  const site = process.env.OPENROUTER_SITE_URL?.trim();
  if (site && site.startsWith("http")) return site.replace(/\/$/, "");
  return "https://www.sindesgv.com.br";
}

export async function enviarEmailNovoAgendamentoAdmin(agendamento: ResumoAgendamento) {
  const destinatarios = destinatariosAdmin();
  if (!destinatarios.length) {
    if (!avisoSmtpAusenteRegistrado) {
      console.warn(
        "[sindes] SINDES_ADMIN_NOTIFY_EMAIL (ou SUPERADMIN_EMAILS) não configurado — e-mail de agendamento não enviado.",
      );
      avisoSmtpAusenteRegistrado = true;
    }
    return;
  }

  if (!smtpConfigurado()) {
    if (!avisoSmtpAusenteRegistrado) {
      console.warn(
        "[sindes] SMTP_HOST/SMTP_USER/SMTP_PASS não configurados — e-mail de agendamento não enviado (agendamento salvo normalmente).",
      );
      avisoSmtpAusenteRegistrado = true;
    }
    return;
  }

  const host = process.env.SMTP_HOST!.trim();
  const user = process.env.SMTP_USER!.trim();
  const pass = process.env.SMTP_PASS!.trim();
  const from = process.env.SMTP_FROM?.trim() || user;
  const adminUrl = `${origemSite()}/admin`;
  const servico = ROTULO_TIPO_AGENDAMENTO[agendamento.tipo];
  const quando = formatarDataHora(agendamento.inicio);

  const assunto = `[SINDES] Novo agendamento — ${agendamento.nome}`;
  const texto = [
    "Um novo agendamento foi feito pelo portal do sindicato.",
    "",
    `Nome: ${agendamento.nome}`,
    `Telefone: ${agendamento.telefone}`,
    `Data e hora: ${quando}`,
    `Serviço: ${servico}`,
    agendamento.assunto ? `Assunto: ${agendamento.assunto}` : "",
    agendamento.partnerName ? `Convênio: ${agendamento.partnerName}` : "",
    `Local de trabalho: ${agendamento.localTrabalho}`,
    `Cargo: ${agendamento.cargo}`,
    "",
    `Ver no painel admin: ${adminUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <p>Um novo agendamento foi feito pelo portal do sindicato.</p>
    <ul>
      <li><strong>Nome:</strong> ${escapeHtml(agendamento.nome)}</li>
      <li><strong>Telefone:</strong> ${escapeHtml(agendamento.telefone)}</li>
      <li><strong>Data e hora:</strong> ${escapeHtml(quando)}</li>
      <li><strong>Serviço:</strong> ${escapeHtml(servico)}</li>
      ${agendamento.assunto ? `<li><strong>Assunto:</strong> ${escapeHtml(agendamento.assunto)}</li>` : ""}
      ${agendamento.partnerName ? `<li><strong>Convênio:</strong> ${escapeHtml(agendamento.partnerName)}</li>` : ""}
      <li><strong>Local de trabalho:</strong> ${escapeHtml(agendamento.localTrabalho)}</li>
      <li><strong>Cargo:</strong> ${escapeHtml(agendamento.cargo)}</li>
    </ul>
    <p><a href="${adminUrl}">Abrir painel admin</a></p>
  `;

  try {
    const transport = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT?.trim()) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass },
    });
    await transport.sendMail({
      from,
      to: destinatarios.join(", "),
      subject: assunto,
      text: texto,
      html,
    });
  } catch (erro) {
    console.error("[sindes] Falha ao enviar e-mail de novo agendamento:", erro);
  }
}

function escapeHtml(valor: string) {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Só para testes — reinicia o aviso único de SMTP ausente. */
export function reiniciarAvisoEmailAdminParaTestes() {
  avisoSmtpAusenteRegistrado = false;
}
