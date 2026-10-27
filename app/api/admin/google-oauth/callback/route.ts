import { connection } from "next/server";
import { concluirOAuthCalendarCallback } from "@/lib/google-oauth-flow";

export async function GET(request: Request) {
  await connection();
  return concluirOAuthCalendarCallback(request);
}
