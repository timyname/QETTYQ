/** Application-scoped grants only; this module never approves a source itself. */
export const SOURCE_PERMISSION_VERSION = 'source-permission-v1';
export type SourceUse = 'display' | 'sendToLlm' | 'embed';
export type RetrievalSourcePolicy = {
  persist?: boolean;
  display?: boolean;
  sendToLlm?: boolean;
  embed?: boolean;
  revoked?: boolean;
  /** Policy-review expiry, not event/cache freshness. Omitted means no expiry in this grant. */
  expiresAt?: number | null;
};
export type SourcePolicyResolver = (sourceId: string) => RetrievalSourcePolicy | null | undefined;
export type SourcePermissionReason = 'SOURCE_POLICY_MISSING' | 'SOURCE_POLICY_UNAVAILABLE' | 'SOURCE_POLICY_REVOKED'
  | 'SOURCE_POLICY_EXPIRED' | 'SOURCE_PERSIST_DENIED' | 'SOURCE_DISPLAY_DENIED' | 'SOURCE_LLM_DENIED' | 'SOURCE_EMBED_DENIED';

/** Missing/unknown grant or resolver failure denies use. User consent is not a grant. */
export function sourcePermission(sourceId: string, use: SourceUse, resolve: SourcePolicyResolver, now: number):
  { allowed: true } | { allowed: false; reason: SourcePermissionReason } {
  let policy: RetrievalSourcePolicy | null | undefined;
  try { policy = resolve(sourceId); }
  catch { return { allowed: false, reason: 'SOURCE_POLICY_UNAVAILABLE' }; }
  if (!sourceId || !policy) return { allowed: false, reason: 'SOURCE_POLICY_MISSING' };
  if (policy.revoked === true) return { allowed: false, reason: 'SOURCE_POLICY_REVOKED' };
  if (!Number.isFinite(now) || policy.expiresAt !== undefined && (policy.expiresAt === null || !Number.isFinite(policy.expiresAt) || policy.expiresAt <= now)) {
    return { allowed: false, reason: 'SOURCE_POLICY_EXPIRED' };
  }
  if (policy.persist !== true) return { allowed: false, reason: 'SOURCE_PERSIST_DENIED' };
  if (policy.display !== true) return { allowed: false, reason: 'SOURCE_DISPLAY_DENIED' };
  if (use === 'sendToLlm' && policy.sendToLlm !== true) return { allowed: false, reason: 'SOURCE_LLM_DENIED' };
  if (use === 'embed' && policy.embed !== true) return { allowed: false, reason: 'SOURCE_EMBED_DENIED' };
  return { allowed: true };
}
