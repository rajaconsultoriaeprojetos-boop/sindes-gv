import { connection } from "next/server";
import { NextResponse } from "next/server";
import { lerLogo } from "@/lib/convenios";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(_request: Request, contexto: Contexto) {
  await connection();
  const { id } = await contexto.params;
  const logo = await lerLogo(id);
  if (!logo) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(logo.bytes), {
    headers: {
      "content-type": logo.tipo === "png" ? "image/png" : "image/jpeg",
      "cache-control": "private, max-age=3600",
    },
  });
}
