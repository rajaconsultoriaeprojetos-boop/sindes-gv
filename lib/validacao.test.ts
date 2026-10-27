import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { validarBytesDocumento } from "./documento-arquivo.ts";
import { aplicarDecisaoValidacaoJuridico, criarAtendimento, usarArquivoDeAtendimentos } from "./atendimento.ts";
import {
  aplicarDecisaoValidacaoVoucher,
  criarPedido,
  emitirVoucher,
  salvarParceiro,
  usarDiretorioDeConvenios,
} from "./convenios.ts";
import { telefoneValido } from "./telefone.ts";
import {
  criarValidacaoTrabalhador,
  revisarValidacao,
  usarDiretorioValidacao,
} from "./validacao-trabalhador.ts";

let pasta = "";

function pngMinimo() {
  return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
}

before(async () => {
  pasta = await mkdtemp(path.join(tmpdir(), "sindes-val-"));
  usarDiretorioValidacao(pasta);
  usarDiretorioDeConvenios(pasta);
  usarArquivoDeAtendimentos(path.join(pasta, "atendimentos.json"));
});

after(async () => {
  if (pasta) await rm(pasta, { recursive: true, force: true });
});

describe("documentos de trabalhador", () => {
  it("recusa tipo inválido e arquivo grande", () => {
    assert.equal(telefoneValido("(31) 99999-8888"), true);
    const texto = validarBytesDocumento(Buffer.from("oi"), { name: "x.txt", type: "text/plain", size: 2 });
    assert.equal(texto.ok, false);
    if (!texto.ok) assert.equal(texto.status, 400);
    const grande = validarBytesDocumento(Buffer.alloc(5 * 1024 * 1024 + 1, 0xff), {
      name: "a.jpg",
      type: "image/jpeg",
      size: 5 * 1024 * 1024 + 1,
    });
    assert.equal(grande.ok, false);
    if (!grande.ok) assert.equal(grande.status, 413);
  });
});

describe("aprovação antes do serviço", () => {
  it("bloqueia voucher sem validação aprovada", async () => {
    const parceiro = await salvarParceiro({
      name: "Convênio teste",
      category: "farmacia",
      discountPercent: 15,
      benefit: "Benefício de teste.",
    });
    assert.equal(parceiro.ok, true);
    if (!parceiro.ok) return;

    const pedidoId = "11111111-1111-4111-8111-111111111111";
    const validacao = await criarValidacaoTrabalhador({
      tipo: "voucher",
      servicoId: pedidoId,
      nomeCompleto: "Pedido de teste",
      telefone: "31999998888",
      localTrabalho: "Local teste",
      cargo: "Cargo teste",
      contracheque: { bytes: pngMinimo(), name: "c.png", type: "image/png", size: pngMinimo().length },
      documento: { bytes: pngMinimo(), name: "d.png", type: "image/png", size: pngMinimo().length },
    });
    assert.equal(validacao.ok, true);
    if (!validacao.ok) return;

    await criarPedido({
      id: pedidoId,
      partnerId: parceiro.parceiro.id,
      name: "Pedido de teste",
      telefone: "31999998888",
      localTrabalho: "Local teste",
      cargo: "Cargo teste",
      validacaoId: validacao.registro.id,
    });

    const bloqueado = await emitirVoucher({ requestId: pedidoId });
    assert.equal(bloqueado.ok, false);
    if (!bloqueado.ok) assert.equal(bloqueado.status, 403);

    await revisarValidacao(validacao.registro.id, "aprovar");
    await aplicarDecisaoValidacaoVoucher(validacao.registro.id, true);
    const emitido = await emitirVoucher({ requestId: pedidoId });
    assert.equal(emitido.ok, true);
  });

  it("libera atendimento jurídico só depois de aprovar", async () => {
    const atendimentoId = "22222222-2222-4222-8222-222222222222";
    const validacao = await criarValidacaoTrabalhador({
      tipo: "juridico",
      servicoId: atendimentoId,
      nomeCompleto: "Trabalhador teste",
      telefone: "31988887777",
      localTrabalho: "Local",
      cargo: "Cargo",
      contracheque: { bytes: pngMinimo(), name: "c.png", type: "image/png", size: pngMinimo().length },
      documento: { bytes: pngMinimo(), name: "d.png", type: "image/png", size: pngMinimo().length },
    });
    assert.equal(validacao.ok, true);
    if (!validacao.ok) return;

    const criado = await criarAtendimento({
      id: atendimentoId,
      name: "Trabalhador teste",
      cpf: "52998224725",
      subject: "Assunto teste",
      telefone: "31988887777",
      cargo: "Cargo",
      localTrabalho: "Local",
      validacaoId: validacao.registro.id,
    });
    assert.equal(criado.ok, true);
    if (!criado.ok) return;
    assert.equal(criado.registro.validacaoStatus, "pendente");

    await revisarValidacao(validacao.registro.id, "aprovar");
    const liberado = await aplicarDecisaoValidacaoJuridico(validacao.registro.id, true);
    assert.equal(liberado.ok, true);
    if (!liberado.ok) return;
    assert.equal(liberado.registro.validacaoStatus, "aprovado");
  });
});
