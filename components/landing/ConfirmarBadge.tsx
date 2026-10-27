export default function ConfirmarBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border border-[#F2A20C]/40 bg-[#F2A20C]/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0E3A43] ${className}`}
      title="Valor ou dado a confirmar com a diretoria do sindicato"
    >
      Confirmar
    </span>
  );
}
