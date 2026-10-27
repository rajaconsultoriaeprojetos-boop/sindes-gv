# SINDES

Site institucional do **Sindicato dos Trabalhadores da Saúde de Governador Valadares**.

A página é uma aplicação Next.js (App Router) com TypeScript e Tailwind CSS. A landing está em `components/SindesLanding.tsx`. A página de atendimento jurídico (chat, notas e link do Google Meet) está em `components/AtendimentoJuridico.tsx`, na rota `/atendimento`. A calculadora de homologação está em `components/CalculadoraHomologacao.tsx`, na rota `/calculadora`, com as contas em `lib/rescisao.ts` e a auditoria do TRCT em `lib/auditoria.ts`.

## Requisitos

- Node.js 20 ou superior
- npm

## Rodar localmente

```bash
npm install
npm run dev
```

Abra [http://127.0.0.1:43123](http://127.0.0.1:43123).

O comando `dev` sobe o Next.js em `0.0.0.0:43123`.

## O que esta página faz

- Apresenta o sindicato, os serviços e o contato institucional.
- O portal em `/portal` guia o trabalhador em quatro tipos de agendamento (jurídico, presencial, voucher, homologação): dados, horário e confirmação. Jurídico e voucher seguem validação com documentos; horários ficam em `data/agendamentos.json` e, com Google configurado, viram evento no Calendar e linhas na planilha. A assessoria vê atendimentos e agendamentos em `/assessoria` (`ASSESSORIA_CODIGO`).
- `/convenios` começa vazio. O pedido de desconto não emite voucher. A administração em `/admin` publica o convênio e emite o cartão depois de entrar com `ADMIN_CODIGO`. Sem essa variável, a área responde 401. O código da assessoria não abre a administração, e o contrário também vale. Os códigos ficam só no ambiente, nunca no repositório.
- A calculadora de homologação fica em `/calculadora`, somente após login da assessoria (`ASSESSORIA_CODIGO`, cookie `sindes_assessoria`). Quem não está autenticado é redirecionado para `/assessoria`. A conta inclui saldo, insalubridade sobre o mínimo de 2024, horas extras, adicional noturno, aviso prévio, 13º, férias proporcionais e INSS. Não inclui FGTS, multa nem IRRF, e não substitui a homologação.
- Na calculadora interna, um PDF, PNG ou JPG de até 5 MB pode ser enviado a `POST /api/analisar-trct` (mesma sessão assessoria). O arquivo vai à OpenAI ou à Anthropic somente para essa leitura e não fica armazenado. Sem chaves de IA configuradas, a rota responde 503. A calculadora não pede CPF. Veja `.env.example`.
- `/atendimento` sem número explica que a consulta começa no portal. `/atendimento/[id]` reúne chat e notas desse registro e oferece o link do Google Meet quando o agendamento está confirmado na agenda.

```bash
npm test
```

O teste confere pedido de demissão sem aviso, o teto de 90 dias, insalubridade de 40%, o divisor 180 na escala 12x36 e o desconto de faltas.

## Build local

```bash
npm run build
npm start
```

`npm start` também escuta em `0.0.0.0:43123`.
