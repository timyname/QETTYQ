import { handleMemoryRoute } from "../../../../server/memory/http";
export function POST(request: Request) { return handleMemoryRoute(request, "visit"); }
