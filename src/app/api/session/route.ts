import {
  SESSION_COOKIE,
  SESSION_HEADER,
  apiError,
  blockCrossSiteMutation,
  jsonResponse,
  responseMeta,
  sessionTokenFromRequest,
  requireSession,
} from "../../../server/session/http";
import {
  SESSION_TTL_SECONDS,
  SessionStoreError,
  createSession,
  getSession,
} from "../../../server/session/store";
import { publicPlan } from "../../../server/pilot/plans";

export async function GET(request: Request) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;
  return jsonResponse({
    ...responseMeta(),
    session: { createdAt: auth.session.createdAt, expiresAt: auth.session.expiresAt },
    context: auth.session.context,
    profile: auth.session.profile,
    reactions: auth.session.reactions.filter((reaction) => reaction.undoneAt === null),
    plans: auth.session.plans.map(publicPlan),
  });
}

export async function POST(request: Request) {
  const crossSite = blockCrossSiteMutation(request);
  if (crossSite) return crossSite;

  const providedToken = sessionTokenFromRequest(request);
  if (!providedToken.ok && providedToken.code === "SESSION_CONFLICT") {
    return apiError("SESSION_CONFLICT", 400);
  }

  const existing = providedToken.ok ? getSession(providedToken.token) : null;
  let session = existing;
  try {
    session ??= createSession();
  } catch (error) {
    if (error instanceof SessionStoreError && error.code === "SESSION_CAPACITY_REACHED") {
      return apiError("SESSION_CAPACITY_REACHED", 503);
    }
    throw error;
  }

  const secure = new URL(request.url).protocol === "https:";
  const cookie = [
    `${SESSION_COOKIE}=${session.id}`,
    "Path=/",
    `Max-Age=${SESSION_TTL_SECONDS}`,
    "HttpOnly",
    "SameSite=Strict",
    "Priority=High",
    ...(secure ? ["Secure"] : []),
  ].join("; ");

  return jsonResponse(
    {
      ...responseMeta(),
      session: {
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        reused: Boolean(existing),
      },
    },
    existing ? 200 : 201,
    { "set-cookie": cookie, [SESSION_HEADER]: session.id },
  );
}
