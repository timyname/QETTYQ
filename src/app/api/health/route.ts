import { jsonResponse } from "../../../server/session/http";

export async function GET() {
  return jsonResponse({
    status: "ok", requestId: crypto.randomUUID(), generatedAt: new Date().toISOString(),
    cityId: "astana", dataMode: "snapshot", sessionStorage: "in_memory_ephemeral",
    externalProvidersChecked: false,
  });
}
