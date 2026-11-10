import type { TipoAgendamento } from "./tipos-agendamento";

/** Fuso usado na geração de slots e na agenda Google. */
export const FUSO_AGENDAMENTO = "America/Sao_Paulo";

export type BlocoHorario = {
  inicioH: number;
  inicioM?: number;
  fimH: number;
  fimM?: number;
};

export type DestinoAtendimento = "assessoria_juridica" | "secretaria_administracao";

export type ModalidadeAtendimento = "online_video" | "presencial_sede";

export type RegraHorarioTipo = {
  /** 0=domingo … 5=sexta … 6=sábado */
  diasSemana: number[];
  blocos: BlocoHorario[];
  resumoPt: string;
  destino: DestinoAtendimento;
  modalidade: ModalidadeAtendimento;
};

/**
 * Horários padrão do sindicato (Governador Valadares).
 * Ajuste aqui ou via variáveis de ambiente quando a diretoria definir a grade oficial.
 *
 * AGENDAMENTO_JURIDICO_DIAS — dias da semana (0–6), separados por vírgula (padrão: 5 = sexta).
 * AGENDAMENTO_JURIDICO_BLOCO — intervalo HH:MM-HH:MM (padrão: 13:00-17:00).
 */
function diasJuridicoEfetivos(): number[] {
  const bruto = (process.env.AGENDAMENTO_JURIDICO_DIAS ?? "5").trim();
  const dias = bruto
    .split(/[,;]/)
    .map((d) => Number(d.trim()))
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  return dias.length ? dias : [5];
}

function parseBlocoHorario(texto: string, fallback: BlocoHorario): BlocoHorario {
  const m = texto.trim().match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
  if (!m) return fallback;
  const [, hi, mi, hf, mf] = m;
  return {
    inicioH: Number(hi),
    inicioM: Number(mi),
    fimH: Number(hf),
    fimM: Number(mf),
  };
}

function blocoJuridicoEfetivo(): BlocoHorario[] {
  const env = (process.env.AGENDAMENTO_JURIDICO_BLOCO ?? "").trim();
  if (env) return [parseBlocoHorario(env, { inicioH: 13, inicioM: 0, fimH: 17, fimM: 0 })];
  return [{ inicioH: 13, inicioM: 0, fimH: 17, fimM: 0 }];
}

/** Secretaria / administração: manhã e tarde em dias úteis (ajuste futuro por env se necessário). */
const BLOCOS_SECRETARIA: BlocoHorario[] = [
  { inicioH: 8, inicioM: 0, fimH: 12, fimM: 0 },
  { inicioH: 13, inicioM: 0, fimH: 17, fimM: 0 },
];

const DIAS_UTEIS = [1, 2, 3, 4, 5];

export function regraHorarioTipo(tipo: TipoAgendamento): RegraHorarioTipo {
  if (tipo === "juridico") {
    const dias = diasJuridicoEfetivos();
    const blocos = blocoJuridicoEfetivo();
    const soSexta = dias.length === 1 && dias[0] === 5;
    return {
      diasSemana: dias,
      blocos,
      resumoPt: soSexta
        ? "Sextas-feiras, 13h–17h (assessoria jurídica, horário de GV)"
        : `Dias ${dias.join(", ")} — ver grade no sistema (assessoria jurídica)`,
      destino: "assessoria_juridica",
      modalidade: "online_video",
    };
  }
  const resumoSecretaria = "Segunda a sexta, 8h–12h e 13h–17h na sede (secretaria / administração)";
  return {
    diasSemana: DIAS_UTEIS,
    blocos: BLOCOS_SECRETARIA,
    resumoPt: resumoSecretaria,
    destino: "secretaria_administracao",
    modalidade: "presencial_sede",
  };
}

export function resumoHorariosTipo(tipo: TipoAgendamento): string {
  return regraHorarioTipo(tipo).resumoPt;
}

export function destinoAtendimento(tipo: TipoAgendamento): DestinoAtendimento {
  return regraHorarioTipo(tipo).destino;
}

export function modalidadeAtendimento(tipo: TipoAgendamento): ModalidadeAtendimento {
  return regraHorarioTipo(tipo).modalidade;
}

export function diaPermitidoParaTipo(dow: number, tipo: TipoAgendamento): boolean {
  if (dow === 0 || dow === 6) return false;
  return regraHorarioTipo(tipo).diasSemana.includes(dow);
}

export function blocosParaTipo(tipo: TipoAgendamento): BlocoHorario[] {
  return regraHorarioTipo(tipo).blocos;
}

export function minutosInicioBloco(b: BlocoHorario): number {
  return b.inicioH * 60 + (b.inicioM ?? 0);
}

export function minutosFimBloco(b: BlocoHorario): number {
  return b.fimH * 60 + (b.fimM ?? 0);
}
