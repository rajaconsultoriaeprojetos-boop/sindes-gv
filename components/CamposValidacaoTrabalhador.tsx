"use client";

import UploadDocumentoCard from "@/components/UploadDocumentoCard";
import { rotuloClasse } from "@/components/landing/plantao-theme";
import { TEXTO_CONSENTIMENTO_VALIDACAO } from "@/lib/arquivo-cliente";
import { formatarTelefoneDigitando } from "@/lib/telefone";

type Props = {
  nome: string;
  setNome: (valor: string) => void;
  telefone: string;
  setTelefone: (valor: string) => void;
  localTrabalho: string;
  setLocalTrabalho: (valor: string) => void;
  cargo: string;
  setCargo: (valor: string) => void;
  consentimento: boolean;
  setConsentimento: (valor: boolean) => void;
  contracheque: File | null;
  setContracheque: (valor: File | null) => void;
  documento: File | null;
  setDocumento: (valor: File | null) => void;
  idPrefixo: string;
  mostrarDocumentos?: boolean;
  errosDocumentos?: { contracheque?: string; documento?: string };
};

const campo =
  "mt-1 min-h-12 w-full rounded-xl border border-[rgba(14,58,67,0.18)] bg-white/90 px-3.5 text-base text-[#0E3A43] shadow-sm focus-visible:border-[#1F8A70] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F8A70]/25";

export default function CamposValidacaoTrabalhador({
  nome,
  setNome,
  telefone,
  setTelefone,
  localTrabalho,
  setLocalTrabalho,
  cargo,
  setCargo,
  consentimento,
  setConsentimento,
  contracheque,
  setContracheque,
  documento,
  setDocumento,
  idPrefixo,
  mostrarDocumentos = true,
  errosDocumentos,
}: Props) {
  return (
    <>
      <div>
        <label htmlFor={`${idPrefixo}-nome`} className={rotuloClasse}>
          Nome completo
        </label>
        <input
          id={`${idPrefixo}-nome`}
          className={campo}
          autoComplete="name"
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor={`${idPrefixo}-telefone`} className={rotuloClasse}>
          Telefone
        </label>
        <input
          id={`${idPrefixo}-telefone`}
          className={campo}
          inputMode="tel"
          autoComplete="tel"
          placeholder="(00) 00000-0000"
          value={telefone}
          onChange={(event) => setTelefone(formatarTelefoneDigitando(event.target.value))}
          required
        />
      </div>
      <div>
        <label htmlFor={`${idPrefixo}-local`} className={rotuloClasse}>
          Local de trabalho
        </label>
        <input
          id={`${idPrefixo}-local`}
          className={campo}
          autoComplete="organization"
          value={localTrabalho}
          onChange={(event) => setLocalTrabalho(event.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor={`${idPrefixo}-cargo`} className={rotuloClasse}>
          Cargo
        </label>
        <input
          id={`${idPrefixo}-cargo`}
          className={campo}
          autoComplete="organization-title"
          value={cargo}
          onChange={(event) => setCargo(event.target.value)}
          required
        />
      </div>
      {mostrarDocumentos ? (
        <>
          <UploadDocumentoCard
            id={`${idPrefixo}-contracheque`}
            titulo="Contracheque"
            descricao="Último contracheque ou holerite para comprovar vínculo com a saúde em GV."
            arquivo={contracheque}
            onArquivo={setContracheque}
            required
            mensagemErro={errosDocumentos?.contracheque}
          />
          <UploadDocumentoCard
            id={`${idPrefixo}-documento`}
            titulo="Documento de identificação"
            descricao="Documento oficial com foto (RG, CNH ou equivalente)."
            arquivo={documento}
            onArquivo={setDocumento}
            required
            mensagemErro={errosDocumentos?.documento}
          />
        </>
      ) : null}
      <label className="flex items-start gap-3 text-base leading-7">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 shrink-0"
          checked={consentimento}
          onChange={(event) => setConsentimento(event.target.checked)}
        />
        {TEXTO_CONSENTIMENTO_VALIDACAO}
      </label>
    </>
  );
}
