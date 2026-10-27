import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos de Privacidade — SINDES",
  description:
    "Como o portal do SINDES trata dados pessoais, documentos de trabalhadores, Google Sheets e leitura de TRCT na calculadora.",
};

export default function Privacidade() {
  return (
    <div className="min-h-full bg-[#F8FAFC] text-[#1D0D2C]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
            <img src="/sindes-logo.png" alt="" width={36} height={36} className="h-9 w-9 rounded-lg object-contain" />
            SINDES
          </Link>
          <Link
            href="/"
            className="rounded-md text-sm font-medium text-[#5D25AA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5D25AA] focus-visible:ring-offset-2"
          >
            Voltar ao início
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5D25AA]">
          Lei nº 13.709/2018
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Termos de Privacidade
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          Esta página descreve como o portal do SINDES trata dados pessoais de quem trabalha na saúde em Governador Valadares.
        </p>

        <h2 className="mt-10 text-xl font-semibold">Validação antes do jurídico e do voucher</h2>
        <p className="mt-3 text-base leading-7 text-slate-600">
          Para agendar atendimento jurídico ou pedir desconto em convênio parceiro, a pessoa informa nome completo, telefone, local de trabalho, cargo, contracheque e documento oficial com foto. A equipe do sindicato usa esses dados somente para confirmar que a pessoa trabalha na categoria antes de liberar a consulta ou emitir o voucher. Os arquivos ficam em armazenamento local deste servidor, com acesso restrito à assessoria (jurídico) ou à administração (voucher). Eles não são enviados a serviço de inteligência artificial.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Google Sheets na gestão</h2>
        <p className="mt-3 text-base leading-7 text-slate-600">
          Se a administração ativar a sincronização e o servidor tiver credenciais do Google configuradas, cada pedido novo envia à planilha indicada uma linha com data, tipo de pedido, nome, telefone, local de trabalho, cargo, status e identificador do pedido. Os arquivos de contracheque e documento não entram na planilha. Sem configuração, os pedidos continuam só neste servidor.
        </p>

        <h2 className="mt-8 text-xl font-semibold">O que o portal grava</h2>
        <p className="mt-3 text-base leading-7 text-slate-600">
          No atendimento jurídico, nome, CPF mascarado na interface, telefone, local de trabalho, cargo e assunto ficam neste servidor para aquele registro, até a equipe do sindicato definir a retenção. Notas e mensagens dessa consulta ficam no mesmo registro. A videochamada jurídica usa Google Meet (link gerado na agenda, quando configurado). O CPF não entra no link. O Meet só fica disponível depois que a assessoria aprova a validação.
        </p>
        <p className="mt-3 text-base leading-7 text-slate-600">
          No pedido de desconto em convênio, nome, telefone, local de trabalho e cargo seguem a mesma lógica. O cartão de voucher só é emitido pela administração depois da validação aprovada.
        </p>

        <h2 className="mt-8 text-xl font-semibold">O que fica no navegador</h2>
        <p className="mt-3 text-base leading-7 text-slate-600">
          O relato de denúncia na landing permanece nesta aba. Fechar a página apaga o que você digitou nesse formulário. A calculadora de homologação só existe na área interna da assessoria, após login. O consentimento do formulário de validação fica só na memória desta aba, não no armazenamento local do navegador.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Quando um TRCT sai do aparelho</h2>
        <p className="mt-3 text-base leading-7 text-slate-600">
          Se a assessoria enviar um TRCT na calculadora interna, o arquivo segue ao provedor de inteligência artificial somente quando uma chave desse provedor está configurada no servidor. Contracheque e documento com foto dos pedidos de jurídico e voucher não entram nessa leitura.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Seus direitos</h2>
        <p className="mt-3 text-base leading-7 text-slate-600">
          A LGPD garante acesso, correção e exclusão de dados pessoais. Os registros do portal, os documentos arquivados e as linhas enviadas ao Google Sheets (quando ativas) permanecem sob responsabilidade da equipe do sindicato até ela definir a retenção.
        </p>

        <p className="mt-10">
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-lg bg-[#5D25AA] px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5D25AA] focus-visible:ring-offset-2"
          >
            Voltar à página inicial
          </Link>
        </p>
      </main>
    </div>
  );
}
