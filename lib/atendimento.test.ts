import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { cpfValido, ocultarCpf } from "./cpf.ts";
import { atualizarAtendimento, criarAtendimento, listarAtendimentos, usarArquivoDeAtendimentos } from "./atendimento.ts";

let pasta = "";

before(async () => {
  pasta = await mkdtemp(path.join(tmpdir(), "sindes-atend-"));
  usarArquivoDeAtendimentos(path.join(pasta, "atendimentos.json"));
});

after(async () => {
  if (pasta) await rm(pasta, { recursive: true, force: true });
});

const validacaoId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("atendimento local", () => {
  it("aceita o CPF de teste e esconde os dígitos", () => {
    assert.equal(cpfValido("529.982.247-25"), true);
    assert.equal(cpfValido("111.111.111-11"), false);
    assert.equal(ocultarCpf("52998224725"), "***.***.***-25");
  });

  it("grava o pedido e devolve a lista do mais novo para o mais antigo", async () => {
    const primeiro = await criarAtendimento({
      id: "33333333-3333-4333-8333-333333333333",
      name: "Trabalhador A",
      cpf: "52998224725",
      subject: "Conferir aviso prévio",
      telefone: "31999998888",
      cargo: "Técnico",
      localTrabalho: "Hospital A",
      validacaoId,
    });
    assert.equal(primeiro.ok, true);
    if (!primeiro.ok) return;
    assert.equal(primeiro.registro.status, "aguardando_validacao");

    await new Promise((resolver) => setTimeout(resolver, 5));
    const segundo = await criarAtendimento({
      id: "44444444-4444-4444-8444-444444444444",
      name: "Trabalhador B",
      cpf: "390.533.447-05",
      subject: "Férias vencidas",
      telefone: "31988887777",
      cargo: "Enfermeiro",
      localTrabalho: "Hospital B",
      validacaoId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });
    assert.equal(segundo.ok, true);
    if (!segundo.ok) return;

    const lista = await listarAtendimentos();
    assert.deepEqual(
      lista.map((item) => item.name),
      ["Trabalhador B", "Trabalhador A"],
    );
  });

  it("guarda nota e mensagem e muda o status depois da validação", async () => {
    const criado = await criarAtendimento({
      id: "55555555-5555-4555-8555-555555555555",
      name: "Trabalhador A",
      cpf: "52998224725",
      subject: "Conferir aviso prévio",
      telefone: "31999998888",
      cargo: "Técnico",
      localTrabalho: "Hospital A",
      validacaoId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    });
    assert.equal(criado.ok, true);
    if (!criado.ok) return;

    const { aplicarDecisaoValidacaoJuridico } = await import("./atendimento.ts");
    await aplicarDecisaoValidacaoJuridico("cccccccc-cccc-4ccc-8ccc-cccccccccccc", true);

    const chamado = await atualizarAtendimento(criado.registro.id, { status: "em_atendimento" });
    assert.equal(chamado.ok, true);
  });
});
