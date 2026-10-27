#!/usr/bin/env node
/**
 * Importa client_secret JSON do Google Cloud → .env.local (OAuth Meet / Calendar).
 * Nunca imprime segredos no stdout.
 *
 * Uso (na VPS, cwd /var/www/sindes):
 *   node scripts/import-google-oauth-client.mjs [/caminho/client_secret_....json]
 *   node scripts/import-google-oauth-client.mjs   # usa secrets/google-oauth-client.json
 */
import { copyFile, mkdir, readFile, writeFile, chmod } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.join(__dirname, "..");
const envPath = path.join(raiz, ".env.local");
const secretsDir = path.join(raiz, "secrets");
const destinoPadrao = path.join(secretsDir, "google-oauth-client.json");

function escapeValorEnv(valor) {
  const v = String(valor);
  if (/[\s#"'\\]/.test(v)) return `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  return v;
}

async function atualizarEnvLocal(atualizacoes) {
  let texto = "";
  try {
    texto = await readFile(envPath, "utf8");
  } catch (erro) {
    if ((erro).code !== "ENOENT") throw erro;
  }
  const linhas = texto.length ? texto.split("\n") : [];
  const chaves = Object.keys(atualizacoes);
  const encontradas = new Set();

  const novas = linhas.map((linha) => {
    const bruta = linha;
    const t = linha.trim();
    if (!t || t.startsWith("#")) return bruta;
    const i = t.indexOf("=");
    if (i <= 0) return bruta;
    const chave = t.slice(0, i).trim();
    if (!chaves.includes(chave)) return bruta;
    encontradas.add(chave);
    return `${chave}=${escapeValorEnv(atualizacoes[chave])}`;
  });

  for (const chave of chaves) {
    if (encontradas.has(chave)) continue;
    if (novas.length && novas[novas.length - 1] !== "") novas.push("");
    novas.push(`${chave}=${escapeValorEnv(atualizacoes[chave])}`);
  }

  const saida = novas.join("\n");
  await writeFile(envPath, saida.endsWith("\n") ? saida : `${saida}\n`, { mode: 0o600 });
  try {
    await chmod(envPath, 0o600);
  } catch {
    /* noop */
  }
}

function extrairCredenciais(json) {
  const bloco = json.web ?? json.installed;
  if (!bloco || typeof bloco !== "object") {
    throw new Error("JSON inválido: esperado objeto 'web' ou 'installed' (download OAuth Google Cloud).");
  }
  const clientId = String(bloco.client_id ?? "").trim();
  const clientSecret = String(bloco.client_secret ?? "").trim();
  if (!clientId || !clientSecret) {
    throw new Error("JSON sem client_id ou client_secret.");
  }
  return { clientId, clientSecret };
}

async function resolverOrigem() {
  const arg = process.argv[2]?.trim();
  if (arg) {
    const abs = path.isAbsolute(arg) ? arg : path.join(process.cwd(), arg);
    return abs;
  }
  try {
    await readFile(destinoPadrao, "utf8");
    return destinoPadrao;
  } catch {
    console.error(
      "Uso: node scripts/import-google-oauth-client.mjs [caminho/client_secret_....json]\n" +
        `Ou coloque o arquivo em ${destinoPadrao}`,
    );
    process.exit(1);
  }
}

const origem = await resolverOrigem();
let caminhoLeitura = origem;
let copiouParaSecrets = false;

if (path.resolve(origem) !== path.resolve(destinoPadrao)) {
  await mkdir(secretsDir, { recursive: true, mode: 0o700 });
  await copyFile(origem, destinoPadrao);
  try {
    await chmod(destinoPadrao, 0o600);
  } catch {
    /* noop */
  }
  caminhoLeitura = destinoPadrao;
  copiouParaSecrets = true;
}

const bruto = await readFile(caminhoLeitura, "utf8");
const json = JSON.parse(bruto);
const { clientId, clientSecret } = extrairCredenciais(json);

await atualizarEnvLocal({
  GOOGLE_OAUTH_CLIENT_ID: clientId,
  GOOGLE_OAUTH_CLIENT_SECRET: clientSecret,
});

console.log("import-google-oauth-client: OK");
console.log("  .env.local atualizado: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET");
if (copiouParaSecrets) {
  console.log(`  JSON copiado para secrets/google-oauth-client.json (chmod 600)`);
} else {
  console.log("  Fonte: secrets/google-oauth-client.json");
}
console.log("");
console.log("Próximo passo: conecte OAuth uma vez (Admin → Google ou node scripts/google-oauth-setup.mjs).");
console.log("Depois de alterar .env.local: pm2 restart sindes");
