import { getDatabase } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    const database = await getDatabase();
    // Query an application table so an empty/unmigrated file is not "ready".
    await database.class.count();
    return Response.json({ status: "ok" }, { headers });
  } catch {
    console.error("Database readiness check failed.");
    return Response.json({ status: "unavailable" }, { status: 503, headers });
  }
}
