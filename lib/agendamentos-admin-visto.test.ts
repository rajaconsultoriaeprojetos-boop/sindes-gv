import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import {
  agendamentoNovoParaAdmin,
  marcarAgendamentosVistosPeloAdmin,
  usarArquivoAgendamentosAdminVisto,
} from "./agendamentos-admin-visto.ts";

describe("agendamentos-admin-visto", () => {
  let dir: string;

  before(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "sindes-visto-"));
    usarArquivoAgendamentosAdminVisto(path.join(dir, "visto.json"));
  });

  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("trata como novo quando ainda não houve visualização", () => {
    assert.equal(agendamentoNovoParaAdmin("2026-11-10T12:00:00.000Z", ""), true);
  });

  it("deixa de ser novo após marcar visto", async () => {
    await marcarAgendamentosVistosPeloAdmin();
    const vistoEm = new Date().toISOString();
    assert.equal(agendamentoNovoParaAdmin("2026-11-10T11:00:00.000Z", vistoEm), false);
    assert.equal(agendamentoNovoParaAdmin("2099-01-01T12:00:00.000Z", vistoEm), true);
  });
});
