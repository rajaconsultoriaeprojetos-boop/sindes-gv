import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import {
  alterarVoucher,
  aplicarDecisaoValidacaoVoucher,
  criarPedido,
  emitirVoucher,
  listarParceirosPublicos,
  painelAdmin,
  salvarParceiro,
  situacaoDoVoucher,
  usarDiretorioDeConvenios,
  validarLogo,
} from "./convenios.ts";
import { criarValidacaoTrabalhador, revisarValidacao, usarDiretorioValidacao } from "./validacao-trabalhador.ts";

let pasta = "";

function pngMinimo() {
  return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
}

before(async () => {
  pasta = await mkdtemp(path.join(tmpdir(), "sindes-conv-"));
  usarDiretorioDeConvenios(pasta);
  usarDiretorioValidacao(pasta);
});

after(async () => {
  if (pasta) await rm(pasta, { recursive: true, force: true });
});

describe("convênios", () => {
  it("começa sem convênios publicados", async () => {
    const parceiros = await listarParceirosPublicos();
    assert.deepEqual(parceiros, []);
  });

  it("registra o pedido e não emite voucher sem aprovação", async () => {
    const salvo = await salvarParceiro({
      name: "Convenio de teste",
      category: "farmacia",
      discountPercent: 10,
      benefit: "Linha curta de beneficio.",
    });
    assert.equal(salvo.ok, true);
    if (!salvo.ok) return;

    const pedidoId = "66666666-6666-4666-8666-666666666666";
    const validacao = await criarValidacaoTrabalhador({
      tipo: "voucher",
      servicoId: pedidoId,
      nomeCompleto: "Trabalhador A",
      telefone: "31999998888",
      localTrabalho: "Hospital A",
      cargo: "Cargo",
      contracheque: { bytes: pngMinimo(), name: "c.png", type: "image/png", size: pngMinimo().length },
      documento: { bytes: pngMinimo(), name: "d.png", type: "image/png", size: pngMinimo().length },
    });
    assert.equal(validacao.ok, true);
    if (!validacao.ok) return;

    const pedido = await criarPedido({
      id: pedidoId,
      partnerId: salvo.parceiro.id,
      name: "Trabalhador A",
      telefone: "31999998888",
      localTrabalho: "Hospital A",
      cargo: "Cargo",
      validacaoId: validacao.registro.id,
    });
    assert.equal(pedido.ok, true);
    const bloqueado = await emitirVoucher({ requestId: pedidoId });
    assert.equal(bloqueado.ok, false);
  });

  it("emite voucher depois da validação", async () => {
    const painel = await painelAdmin();
    const pedido = painel.pedidos[0];
    await revisarValidacao(pedido.validacaoId, "aprovar");
    await aplicarDecisaoValidacaoVoucher(pedido.validacaoId, true);
    const emitido = await emitirVoucher({ requestId: pedido.id }, { issuedByEmail: "admin@teste.local" });
    assert.equal(emitido.ok, true);
    if (!emitido.ok) return;
    assert.equal(emitido.voucher.issuedByEmail, "admin@teste.local");
    if (!emitido.ok) return;
    const usado = await alterarVoucher(emitido.voucher.code, { status: "utilizado" });
    assert.equal(usado.ok, true);
    assert.equal(
      situacaoDoVoucher(
        { status: "valido", validUntil: new Date(Date.now() - 1000).toISOString() },
        new Date(),
      ),
      "expirado",
    );
  });

  it("só aceita PNG ou JPG de até 1 MB", () => {
    assert.equal(validarLogo(Buffer.from("texto")), null);
    assert.equal(validarLogo(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d])), "png");
  });
});
