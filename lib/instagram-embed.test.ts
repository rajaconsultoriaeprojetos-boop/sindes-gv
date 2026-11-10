import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classificarUrlVideoDestaque,
  isPermalinkInstagram,
  normalizarPermalinkInstagram,
  urlVideoDestaqueValida,
} from "./instagram-embed.ts";

describe("normalizarPermalinkInstagram", () => {
  it("converte /reels/ para /reel/", () => {
    assert.equal(
      normalizarPermalinkInstagram("https://www.instagram.com/reels/DfgDl0QgZF5"),
      "https://www.instagram.com/reel/DfgDl0QgZF5/",
    );
  });
});

describe("classificarUrlVideoDestaque", () => {
  it("reconhece Instagram e mp4", () => {
    assert.equal(classificarUrlVideoDestaque("https://www.instagram.com/p/AbC123/"), "instagram");
    assert.equal(classificarUrlVideoDestaque("https://cdn.example/video.mp4"), "mp4");
    assert.equal(classificarUrlVideoDestaque("not-a-url"), null);
  });
});

describe("urlVideoDestaqueValida", () => {
  it("espelha classificação", () => {
    assert.equal(urlVideoDestaqueValida("https://www.instagram.com/reel/x/"), true);
    assert.equal(isPermalinkInstagram("https://instagram.com/reel/x/"), true);
    assert.equal(urlVideoDestaqueValida("http://bad.mp4"), false);
  });
});
