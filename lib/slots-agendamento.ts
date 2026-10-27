import type { TipoAgendamento } from "./tipos-agendamento";
import { duracaoMinutos } from "./tipos-agendamento";

const FUSO = "America/Sao_Paulo";

/** Seg–sex 13h–17h; jurídico apenas sexta (Governador Valadares). */
const TARDE = { inicioH: 13, fimH: 17 };

function partesDataLocal(iso: string) {
  const data = new Date(iso);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const partes = fmt.formatToParts(data);
  const pega = (tipo: Intl.DateTimeFormatPartTypes) =>
    Number(partes.find((p) => p.type === tipo)?.value ?? "0");
  return {
    ano: pega("year"),
    mes: pega("month"),
    dia: pega("day"),
    hora: pega("hour"),
    minuto: pega("minute"),
  };
}

function diaSemanaLocal(ano: number, mes: number, dia: number) {
  return new Date(Date.UTC(ano, mes - 1, dia, 12, 0, 0)).getUTCDay();
}

function isoLocal(ano: number, mes: number, dia: number, hora: number, minuto: number) {
  const duas = (n: number) => String(n).padStart(2, "0");
  const offset = "-03:00";
  return `${ano}-${duas(mes)}-${duas(dia)}T${duas(hora)}:${duas(minuto)}:00${offset}`;
}

function agoraLocal() {
  return partesDataLocal(new Date().toISOString());
}

export type SlotDisponivel = {
  inicio: string;
  fim: string;
  rotulo: string;
};

function intervalosSobrepoe(aInicio: string, aFim: string, bInicio: string, bFim: string) {
  const ai = new Date(aInicio).getTime();
  const af = new Date(aFim).getTime();
  const bi = new Date(bInicio).getTime();
  const bf = new Date(bFim).getTime();
  return ai < bf && bi < af;
}

function minutosDesdeMeiaNoite(hora: number, minuto: number) {
  return hora * 60 + minuto;
}

function diaPermitido(dow: number, tipo: TipoAgendamento) {
  if (dow === 0 || dow === 6) return false;
  if (tipo === "juridico") return dow === 5;
  return dow >= 1 && dow <= 5;
}

function gerarSlotsDia(
  ano: number,
  mes: number,
  dia: number,
  duracao: number,
  ocupados: { inicio: string; fim: string }[],
  tipo: TipoAgendamento,
) {
  const dow = diaSemanaLocal(ano, mes, dia);
  if (!diaPermitido(dow, tipo)) return [] as SlotDisponivel[];

  const blocos = [TARDE];
  const slots: SlotDisponivel[] = [];
  const agora = agoraLocal();

  for (const bloco of blocos) {
    const inicioBloco = bloco.inicioH * 60;
    const fimBloco = bloco.fimH * 60;
    for (let min = inicioBloco; min + duracao <= fimBloco; min += duracao) {
      const hora = Math.floor(min / 60);
      const minuto = min % 60;
      const inicio = isoLocal(ano, mes, dia, hora, minuto);
      const fimDate = new Date(new Date(inicio).getTime() + duracao * 60_000);
      const fimPartes = partesDataLocal(fimDate.toISOString());
      const fim = isoLocal(fimPartes.ano, fimPartes.mes, fimPartes.dia, fimPartes.hora, fimPartes.minuto);

      const passado =
        ano < agora.ano ||
        (ano === agora.ano && mes < agora.mes) ||
        (ano === agora.ano && mes === agora.mes && dia < agora.dia) ||
        (ano === agora.ano &&
          mes === agora.mes &&
          dia === agora.dia &&
          minutosDesdeMeiaNoite(hora, minuto) <= minutosDesdeMeiaNoite(agora.hora, agora.minuto));

      const ocupado = ocupados.some((o) => intervalosSobrepoe(inicio, fim, o.inicio, o.fim));
      if (!passado && !ocupado) {
        const rotulo = new Intl.DateTimeFormat("pt-BR", {
          timeZone: FUSO,
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(inicio));
        slots.push({ inicio, fim, rotulo });
      }
    }
  }
  return slots;
}

/** Gera slots de 30 min conforme o tipo, excluindo agendamentos locais. */
export function listarSlotsDisponiveis(
  tipo: TipoAgendamento,
  ocupados: { inicio: string; fim: string }[],
  dias = 21,
) {
  const duracao = duracaoMinutos(tipo);
  const hoje = agoraLocal();
  const resultado: SlotDisponivel[] = [];

  for (let offset = 0; offset < dias; offset += 1) {
    const base = new Date(Date.UTC(hoje.ano, hoje.mes - 1, hoje.dia + offset, 12, 0, 0));
    const ano = base.getUTCFullYear();
    const mes = base.getUTCMonth() + 1;
    const dia = base.getUTCDate();
    resultado.push(...gerarSlotsDia(ano, mes, dia, duracao, ocupados, tipo));
  }
  return resultado;
}

export function slotAindaDisponivel(
  inicio: string,
  fim: string,
  tipo: TipoAgendamento,
  ocupados: { inicio: string; fim: string }[],
) {
  const slots = listarSlotsDisponiveis(tipo, ocupados, 21);
  return slots.some((s) => s.inicio === inicio && s.fim === fim);
}
