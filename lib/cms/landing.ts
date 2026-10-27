import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  landingCmsPadrao,
  mesclarLandingCms,
  type ImpactStatCms,
  type LandingCms,
} from "./landing-model";

export type { ImpactStatCms, LandingCms };
export { landingCmsPadrao, mesclarLandingCms };

function arquivo() {
  return path.join(process.cwd(), "data", "cms", "landing.json");
}

export async function lerLandingCms(): Promise<LandingCms> {
  try {
    const texto = await readFile(arquivo(), "utf8");
    return mesclarLandingCms(JSON.parse(texto) as Partial<LandingCms>);
  } catch (erro) {
    if ((erro as NodeJS.ErrnoException).code === "ENOENT") return landingCmsPadrao();
    throw erro;
  }
}

export async function salvarLandingCms(conteudo: LandingCms) {
  const destino = arquivo();
  await mkdir(path.dirname(destino), { recursive: true });
  const payload: LandingCms = {
    ...conteudo,
    atualizadoEm: new Date().toISOString(),
  };
  const tmp = `${destino}.tmp`;
  await writeFile(tmp, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await rename(tmp, destino);
  return payload;
}
