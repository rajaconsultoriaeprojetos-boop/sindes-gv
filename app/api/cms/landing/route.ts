import { connection } from "next/server";
import { lerLandingCms } from "@/lib/cms/landing";
import { jsonSemCache } from "@/lib/http";

export async function GET() {
  await connection();
  return jsonSemCache(await lerLandingCms());
}
