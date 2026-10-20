import { handleMemoryRoute } from "../../../../server/memory/http";
export function PATCH(request: Request) { return handleMemoryRoute(request, "profile"); }
