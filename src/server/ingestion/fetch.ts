import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request } from "node:https";
import { assertImportPolicy, publicHttpsUrl, type EventSourcePolicy } from "./events";

/** Conservative public-address policy: IPv6 is rejected until a vetted IP-range library is approved. */
export function isPublicIpv4(address: string): boolean {
  if (isIP(address) !== 4) return false;
  const [a, b] = address.split(".").map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && [0, 168].includes(b)) || (a === 198 && [18, 19, 51].includes(b)) || (a === 203 && b === 0));
}

/** One approved request, DNS-pinned to a checked public IPv4, no redirects, no cookies/auth. */
export async function fetchApprovedEventDocument(policy: EventSourcePolicy, url: string, lastSuccessAt: string | null, now = new Date().toISOString()): Promise<string> {
  assertImportPolicy(policy, url);
  if (!policy.allowFetch || !policy.robotsReviewedAt) throw new Error("FETCH_POLICY_NOT_APPROVED");
  const time = Date.parse(now), previous = lastSuccessAt === null ? null : Date.parse(lastSuccessAt);
  if (!Number.isFinite(time) || (previous !== null && !Number.isFinite(previous))) throw new Error("INVALID_FETCH_CLOCK");
  if (previous !== null && time - previous < policy.minimumRefreshMinutes * 60_000) throw new Error("REFRESH_NOT_DUE");
  const target = new URL(publicHttpsUrl(url)!);
  const addresses = await lookup(target.hostname, { all: true });
  if (!addresses.length || addresses.some((item) => item.family !== 4 || !isPublicIpv4(item.address))) throw new Error("UNSAFE_DNS_TARGET");
  const pinned = addresses[0].address;
  return new Promise((resolve, reject) => {
    const req = request(target, { method: "GET", timeout: 8_000, headers: { Accept: "application/ld+json, application/json, text/html", "User-Agent": "QETTYQ-Pilot/0.1 (+manual-approved-import)" }, lookup: (_hostname, options, callback) => options.all ? callback(null, [{ address: pinned, family: 4 }]) : callback(null, pinned, 4) }, (res) => {
      if (res.statusCode !== 200) { res.resume(); reject(new Error(res.statusCode === 429 ? "PROVIDER_RATE_LIMITED_NO_AUTOMATIC_RETRY" : `PROVIDER_HTTP_${res.statusCode ?? "UNKNOWN"}`)); return; }
      const mime = String(res.headers["content-type"] ?? "").split(";")[0].trim();
      if (!["application/ld+json", "application/json", "text/html"].includes(mime)) { res.destroy(); reject(new Error("UNSUPPORTED_DOCUMENT_TYPE")); return; }
      const chunks: Buffer[] = []; let size = 0;
      res.on("data", (chunk: Buffer) => { size += chunk.length; if (size > 512_000) { res.destroy(new Error("DOCUMENT_TOO_LARGE")); return; } chunks.push(chunk); });
      res.on("error", reject);
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
    req.on("timeout", () => req.destroy(new Error("PROVIDER_TIMEOUT")));
    const deadline = setTimeout(() => req.destroy(new Error("PROVIDER_TIMEOUT")), 8_000);
    req.on("close", () => clearTimeout(deadline));
    req.on("error", reject);
    req.end();
  });
}
