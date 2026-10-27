import type { AchadoConsistencia } from "./consistencia-trct";
import { contagemPorSeveridade, ordenarAchados } from "./consistencia-trct";

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function htmlRelatorioAuditoria(titulo: string, achados: AchadoConsistencia[]): string {
  const ordenados = ordenarAchados(achados);
  const contagem = contagemPorSeveridade(achados);
  const data = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const linhas = ordenados
    .map(
      (item) =>
        `<tr><td>${escaparHtml(item.severidade)}</td><td>${escaparHtml(item.mensagem)}</td><td>${escaparHtml(item.detalhe ?? "")}</td></tr>`,
    )
    .join("");
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<title>${escaparHtml(titulo)}</title>
<style>
body{font-family:system-ui,sans-serif;color:#1D0D2C;padding:24px;max-width:800px;margin:0 auto}
h1{font-size:1.35rem}
.meta{color:#475569;font-size:0.9rem;margin-bottom:1.5rem}
table{width:100%;border-collapse:collapse;font-size:0.95rem}
th,td{border:1px solid #cbd5e1;padding:8px;text-align:left;vertical-align:top}
th{background:#f1f5f9}
.sev-alta{color:#991b1b;font-weight:600}
.sev-media{color:#92400e;font-weight:600}
.sev-baixa{color:#166534}
footer{margin-top:2rem;font-size:0.85rem;color:#64748b}
</style>
</head>
<body>
<h1>${escaparHtml(titulo)}</h1>
<p class="meta">SINDES · ${escaparHtml(data)} · Alta: ${contagem.alta} · Média: ${contagem.media} · Baixa: ${contagem.baixa}</p>
<table>
<thead><tr><th>Severidade</th><th>Achado</th><th>Detalhe</th></tr></thead>
<tbody>${linhas || "<tr><td colspan=\"3\">Nenhum achado registrado.</td></tr>"}</tbody>
</table>
<footer>Estimativa automatizada. Não substitui homologação nem parecer jurídico.</footer>
</body>
</html>`;
}

export function abrirRelatorioImpressao(titulo: string, achados: AchadoConsistencia[]): void {
  const html = htmlRelatorioAuditoria(titulo, achados);
  const janela = window.open("", "_blank", "noopener,noreferrer");
  if (!janela) return;
  janela.document.write(html);
  janela.document.close();
  janela.focus();
  janela.print();
}
