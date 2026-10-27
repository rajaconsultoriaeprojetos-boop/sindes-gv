"use client";

import { FileCheck2, Upload } from "lucide-react";
import { useCallback, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { rotuloClasse } from "@/components/landing/plantao-theme";
import { LIMITE_BYTES } from "@/lib/trct";

type Props = {
  id: string;
  titulo: string;
  descricao?: string;
  accept?: string;
  required?: boolean;
  /** Erro de validação do formulário (ex.: tentativa de avançar sem arquivo). */
  mensagemErro?: string;
  arquivo: File | null;
  onArquivo: (arquivo: File | null) => void;
};

const zonaBase =
  "group relative flex min-h-[8.5rem] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition duration-200 backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F8A70] focus-visible:ring-offset-2";

function formatarTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadDocumentoCard({
  id,
  titulo,
  descricao,
  accept = "application/pdf,image/png,image/jpeg",
  required,
  mensagemErro,
  arquivo,
  onArquivo,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragAtivo, setDragAtivo] = useState(false);
  const [erro, setErro] = useState("");

  const hintId = `${id}-hint`;
  const erroId = `${id}-erro`;

  const validarEAtribuir = useCallback(
    (file: File | null) => {
      if (!file) {
        setErro("");
        onArquivo(null);
        return;
      }
      if (file.size > LIMITE_BYTES) {
        setErro("Arquivo acima de 5 MB. Escolha outro arquivo.");
        onArquivo(null);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
      setErro("");
      onArquivo(file);
    },
    [onArquivo],
  );

  const abrirSeletor = () => inputRef.current?.click();

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      abrirSeletor();
    }
  };

  const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    setDragAtivo(true);
  };

  const onDragLeave = () => setDragAtivo(false);

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragAtivo(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    validarEAtribuir(file);
  };

  const erroVisivel = erro || mensagemErro;
  const invalido = Boolean(mensagemErro && !arquivo);

  const zonaClasse = [
    zonaBase,
    invalido
      ? "border-red-500 bg-red-50/80 shadow-[0_0_0_1px_rgba(239,68,68,0.35)]"
      : dragAtivo
        ? "border-[#1F8A70] bg-[#1F8A70]/10 shadow-[0_0_0_1px_rgba(31,138,112,0.35)]"
        : arquivo
          ? "border-[#1F8A70]/45 bg-white/85 shadow-[0_8px_24px_rgba(14,58,67,0.08)]"
          : "border-[rgba(14,58,67,0.22)] bg-white/70 hover:border-[#F2A20C]/70 hover:bg-white/90",
  ].join(" ");

  return (
    <div className="space-y-1.5">
      <label id={`${id}-label`} htmlFor={id} className={rotuloClasse}>
        {titulo}
        {required ? <span className="text-[#F2A20C]"> (obrigatório)</span> : null}
      </label>
      {descricao ? <p className="text-sm leading-6 text-[#0E3A43]/70">{descricao}</p> : null}
      <div
        role="group"
        aria-labelledby={`${id}-label`}
        aria-invalid={invalido || undefined}
        aria-describedby={erroVisivel ? `${hintId} ${erroId}` : hintId}
        tabIndex={0}
        className={zonaClasse}
        onClick={abrirSeletor}
        onKeyDown={onKeyDown}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          id={id}
          name={id}
          type="file"
          accept={accept}
          required={required && !arquivo}
          className="sr-only"
          onChange={(event) => validarEAtribuir(event.target.files?.[0] ?? null)}
        />
        {arquivo ? (
          <>
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1F8A70]/15 text-[#1F8A70]" aria-hidden>
              <FileCheck2 className="h-6 w-6" strokeWidth={2} />
            </span>
            <p className="text-sm font-semibold text-[#0E3A43]">{arquivo.name}</p>
            <p className="text-xs text-[#0E3A43]/65">{formatarTamanho(arquivo.size)} · toque para trocar</p>
          </>
        ) : (
          <>
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F2A20C]/15 text-[#0E3A43]" aria-hidden>
              <Upload className="h-6 w-6" strokeWidth={2} />
            </span>
            <p className="text-sm font-semibold text-[#0E3A43]">Toque ou arraste o arquivo aqui</p>
            <p id={hintId} className="max-w-xs text-xs leading-5 text-[#0E3A43]/65">
              PDF, PNG ou JPG · até 5 MB
            </p>
          </>
        )}
      </div>
      {erroVisivel ? (
        <p id={erroId} className="text-sm font-medium text-red-700" role="alert">
          {erroVisivel}
        </p>
      ) : null}
    </div>
  );
}
