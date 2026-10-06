import { getDb } from "@/lib/db";

// Liveness/readiness probe for the container healthcheck and the post-deploy
// check in the Jenkinsfile. Touches the database so a broken volume (wrong
// owner, full disk) shows up as unhealthy instead of as 500s on real pages.
export const dynamic = "force-dynamic";

export function GET() {
  try {
    getDb().prepare("SELECT 1").get();
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "error" }, { status: 503 });
  }
}
