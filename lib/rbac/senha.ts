import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

export async function hashSenha(senha: string) {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(senha, salt, 64)) as Buffer;
  return `scrypt:${salt.toString("base64url")}:${derived.toString("base64url")}`;
}

export async function conferirSenha(senha: string, armazenado: string) {
  const partes = armazenado.split(":");
  if (partes.length !== 3 || partes[0] !== "scrypt") return false;
  const salt = Buffer.from(partes[1], "base64url");
  const esperado = Buffer.from(partes[2], "base64url");
  const derived = (await scryptAsync(senha, salt, 64)) as Buffer;
  if (derived.length !== esperado.length) return false;
  return timingSafeEqual(derived, esperado);
}
