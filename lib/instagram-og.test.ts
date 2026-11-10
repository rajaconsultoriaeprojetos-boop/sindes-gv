import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extrairImagemOgDoHtml, validarParamInstagramThumb } from "./instagram-og.ts";

describe("extrairImagemOgDoHtml", () => {
  it("lê og:image", () => {
    const html = `<html><head><meta property="og:image" content="https://cdn.example/ig.jpg" /></head></html>`;
    assert.equal(extrairImagemOgDoHtml(html), "https://cdn.example/ig.jpg");
  });

  it("lê twitter:image como fallback", () => {
    const html = `<meta name="twitter:image" content="https://cdn.example/tw.jpg" />`;
    assert.equal(extrairImagemOgDoHtml(html), "https://cdn.example/tw.jpg");
  });

  it("decodifica entidades HTML", () => {
    const html = `<meta property="og:image" content="https://cdn.example/a&amp;b.jpg" />`;
    assert.equal(extrairImagemOgDoHtml(html), "https://cdn.example/a&b.jpg");
  });
});

describe("validarParamInstagramThumb", () => {
  it("rejeita vazio", () => {
    const r = validarParamInstagramThumb("");
    assert.equal(r.ok, false);
  });

  it("aceita reel normalizado", () => {
    const r = validarParamInstagramThumb("https://www.instagram.com/reels/ABC123/");
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.match(r.permalink, /\/reel\/ABC123\//);
    }
  });

  it("rejeita URL que não é Instagram", () => {
    const r = validarParamInstagramThumb("https://example.com/video");
    assert.equal(r.ok, false);
  });
});
