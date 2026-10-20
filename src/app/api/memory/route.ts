import { handleMemoryRoute } from "../../../server/memory/http";
export function GET(request: Request) { return handleMemoryRoute(request, "state"); }
export function DELETE(request: Request) { return handleMemoryRoute(request, "delete"); }
