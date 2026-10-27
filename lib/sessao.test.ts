import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import {
  COOKIE_ADMIN,
  COOKIE_ASSESSORIA,
  codigoConfigurado,
  conferirCodigo,
  emitirSessao,
  reiniciarBloqueios,
  sessaoDoPedido,
  sessaoValida,
} from "./sessao.ts";

const adminAnterior = process.env.ADMIN_CODIGO;
const assessoriaAnterior = process.env.ASSESSORIA_CODIGO;

function pedido(url: string, headers?: Record<string, string>) {
  return new Request(url, { headers });
}

beforeEach(() => {
  reiniciarBloqueios();
  process.env.ADMIN_CODIGO = "admin-teste-longo";
  process.env.ASSESSORIA_CODIGO = "assessoria-teste-longo";
});

after(() => {
  reiniciarBloqueios();
  if (adminAnterior === undefined) delete process.env.ADMIN_CODIGO;
  else process.env.ADMIN_CODIGO = adminAnterior;
  if (assessoriaAnterior === undefined) delete process.env.ASSESSORIA_CODIGO;
  else process.env.ASSESSORIA_CODIGO = assessoriaAnterior;
});

describe("sessão", () => {
  it("recusa os códigos antigos e não cruza as áreas", () => {
    assert.equal(conferirCodigo("ip-a", "admin", "sindes-admin").ok, false);
    assert.equal(conferirCodigo("ip-b", "assessoria", "sindes-local").ok, false);
    assert.equal(conferirCodigo("ip-c", "admin", "assessoria-teste-longo").ok, false);
    assert.equal(conferirCodigo("ip-d", "assessoria", "admin-teste-longo").ok, false);
    assert.equal(conferirCodigo("ip-e", "admin", "admin-teste-longo").ok, true);
    assert.equal(conferirCodigo("ip-f", "assessoria", "assessoria-teste-longo").ok, true);
  });

  it("diz que o código não foi configurado e não autentica", () => {
    delete process.env.ADMIN_CODIGO;
    delete process.env.ASSESSORIA_CODIGO;
    assert.equal(codigoConfigurado("admin"), false);
    assert.equal(codigoConfigurado("assessoria"), false);
    const admin = conferirCodigo("ip-g", "admin", "admin-teste-longo");
    const assessoria = conferirCodigo("ip-g", "assessoria", "sindes-local");
    assert.equal(admin.ok, false);
    assert.equal(assessoria.ok, false);
    if (!admin.ok) assert.equal(admin.erro, "O código não foi configurado.");
    if (!assessoria.ok) assert.equal(assessoria.status, 401);
    assert.equal(emitirSessao("admin"), null);
  });

  it("bloqueia o IP por 15 minutos no quinto código errado", () => {
    for (let vez = 0; vez < 4; vez += 1) {
      const resultado = conferirCodigo("ip-h", "admin", "errado");
      assert.equal(resultado.ok, false);
      if (!resultado.ok) assert.equal(resultado.status, 401);
    }
    const quinto = conferirCodigo("ip-h", "assessoria", "errado");
    assert.equal(quinto.ok, false);
    if (!quinto.ok) {
      assert.equal(quinto.status, 429);
      assert.match(quinto.erro, /15 minutos/);
    }
    const durante = conferirCodigo("ip-h", "admin", "admin-teste-longo");
    assert.equal(durante.ok, false);
    if (!durante.ok) assert.equal(durante.status, 429);
    assert.equal(conferirCodigo("outro-ip", "admin", "admin-teste-longo").ok, true);
  });

  it("aceita só o cookie da própria área e ignora cabeçalho de código", () => {
    const tokenAdmin = emitirSessao("admin");
    const tokenAssessoria = emitirSessao("assessoria");
    assert.ok(tokenAdmin);
    assert.ok(tokenAssessoria);
    assert.equal(sessaoValida("assessoria", tokenAdmin ?? undefined), false);
    assert.equal(sessaoValida("admin", tokenAssessoria ?? undefined), false);

    const comCabecalho = pedido("http://127.0.0.1/api/admin/convenios", {
      "x-admin-codigo": "admin-teste-longo",
      "x-assessoria-codigo": "assessoria-teste-longo",
    });
    assert.equal(sessaoDoPedido(comCabecalho, "admin"), false);
    assert.equal(sessaoDoPedido(comCabecalho, "assessoria"), false);

    const cookieTrocado = pedido("http://127.0.0.1/api/atendimentos", {
      cookie: `${COOKIE_ASSESSORIA}=${tokenAdmin}`,
    });
    assert.equal(sessaoDoPedido(cookieTrocado, "assessoria"), false);
    assert.equal(sessaoDoPedido(cookieTrocado, "admin"), false);

    const cookieAdmin = pedido("http://127.0.0.1/api/admin/convenios", {
      cookie: `${COOKIE_ADMIN}=${tokenAdmin}`,
    });
    assert.equal(sessaoDoPedido(cookieAdmin, "admin"), true);
    assert.equal(sessaoDoPedido(cookieAdmin, "assessoria"), false);

    const cookieAssessoria = pedido("http://127.0.0.1/api/atendimentos", {
      cookie: `${COOKIE_ASSESSORIA}=${tokenAssessoria}`,
    });
    assert.equal(sessaoDoPedido(cookieAssessoria, "assessoria"), true);
    assert.equal(sessaoDoPedido(cookieAssessoria, "admin"), false);
  });
});
