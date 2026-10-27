#!/usr/bin/env node
/**
 * One-time OAuth setup for Google Calendar + Meet on the VPS.
 * Loads .env.local from cwd. Opens a local callback server or prints the auth URL.
 *
 * Usage (on VPS, as root in /var/www/sindes):
 *   node scripts/google-oauth-setup.mjs
 *
 * Requires GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET (or GOOGLE_CLIENT_*).
 * Optional: GOOGLE_OAUTH_REDIRECT_URI (default http://127.0.0.1:8787/oauth2callback for this script).
 */
import { createServer } from "node:http";
import { mkdir, readFile, writeFile, chmod } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { google } from "googleapis";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.join(__dirname, "..");

async function carregarEnvLocal() {
  try {
    const texto = await readFile(path.join(raiz, ".env.local"), "utf8");
    for (const linha of texto.split("\n")) {
      const t = linha.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i <= 0) continue;
      const chave = t.slice(0, i).trim();
      let valor = t.slice(i + 1).trim();
      if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) {
        valor = valor.slice(1, -1);
      }
      if (!process.env[chave]) process.env[chave] = valor;
    }
  } catch {
    /* optional */
  }
}

function clientId() {
  return (process.env.GOOGLE_OAUTH_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? "").trim();
}

function clientSecret() {
  return (process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "").trim();
}

function tokenPath() {
  return (process.env.GOOGLE_OAUTH_TOKEN_PATH ?? path.join(raiz, "secrets", "google-oauth-token.json")).trim();
}

const redirectLocal = (process.env.GOOGLE_OAUTH_SETUP_REDIRECT ?? "http://127.0.0.1:8787/oauth2callback").trim();

await carregarEnvLocal();

if (!clientId() || !clientSecret()) {
  console.error(
    "Missing GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET in .env.local.\n" +
      "Create an OAuth client (Web application) in Google Cloud Console and add redirect URIs:\n" +
      `  - ${redirectLocal}\n` +
      "  - https://www.sindesgv.com.br/api/admin/google-oauth/callback",
  );
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(clientId(), clientSecret(), redirectLocal);
const state = `cli-${Date.now()}`;
const authUrl = oauth2.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/calendar"],
  state,
});

console.log("\n1) Open this URL while logged in as sindesgvoficial@gmail.com:\n");
console.log(authUrl);
console.log("\n2) Waiting for callback on", redirectLocal, "...\n");

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", redirectLocal);
    if (url.pathname !== "/oauth2callback") {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    if (url.searchParams.get("state") !== state) {
      res.writeHead(400);
      res.end("Invalid state");
      return;
    }
    const code = url.searchParams.get("code");
    if (!code) {
      res.writeHead(400);
      res.end("Missing code");
      return;
    }
    const { tokens } = await oauth2.getToken(code);
    if (!tokens.refresh_token) {
      res.writeHead(400);
      res.end("No refresh_token — revoke app access in Google Account and retry with prompt=consent.");
      return;
    }
    const destino = tokenPath();
    await mkdir(path.dirname(destino), { recursive: true, mode: 0o700 });
    const payload = {
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      expiry_date: tokens.expiry_date,
      scope: tokens.scope,
      token_type: tokens.token_type,
      updated_at: new Date().toISOString(),
    };
    await writeFile(destino, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 });
    try {
      await chmod(destino, 0o600);
    } catch {
      /* noop */
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end("<h1>OAuth OK</h1><p>Refresh token saved. You can close this tab and stop the script.</p>");
    console.log("Refresh token saved to", destino);
    server.close();
    process.exit(0);
  } catch (erro) {
    console.error(erro);
    res.writeHead(500);
    res.end("Error");
  }
});

server.listen(8787, "127.0.0.1", () => {
  console.log("Local listener on 127.0.0.1:8787 — use SSH port forward if needed:");
  console.log("  ssh -L 8787:127.0.0.1:8787 root@<vps>");
});
