import { handleMemoryRoute } from "../../../../server/memory/http";
export function POST(request: Request) { return handleMemoryRoute(request, "grant"); }
export function DELETE(request: Request) { return handleMemoryRoute(request, "revoke"); }
