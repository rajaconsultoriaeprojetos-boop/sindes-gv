import { connection } from "next/server";
import { NextResponse } from "next/server";
import { listarParceirosPublicos } from "@/lib/convenios";

export async function GET() {
  await connection();
  const parceiros = await listarParceirosPublicos();
  return NextResponse.json({ parceiros });
}
