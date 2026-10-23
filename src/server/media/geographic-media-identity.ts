export type ReviewedGeographicMediaProof = {
  fileLat: number; fileLon: number; osmBoundary: number[][]; matchedVenueLabel: string;
  fileDescription: string; filePageUrl: string; reviewedAt: string;
};

/** Curated identity review + actual OSM polygon inclusion. Nearby is not inside.
 * This never searches/geocodes names, invents GPS or approves image rights.
 */
export function validGeographicMediaProof(proof: ReviewedGeographicMediaProof | undefined, fileUrl: string, now: number): boolean {
  if (!proof || proof.filePageUrl !== fileUrl || !Number.isFinite(now)
    || !Number.isFinite(Date.parse(proof.reviewedAt)) || Date.parse(proof.reviewedAt) > now
    || ![proof.fileLat, proof.fileLon].every(Number.isFinite) || proof.fileLat < 51 || proof.fileLat > 51.3 || proof.fileLon < 71.2 || proof.fileLon > 71.7
    || typeof proof.matchedVenueLabel !== 'string' || proof.matchedVenueLabel.length < 4 || proof.matchedVenueLabel.length > 250
    || typeof proof.fileDescription !== 'string' || proof.fileDescription.length < 10 || proof.fileDescription.length > 1000
    || !Array.isArray(proof.osmBoundary) || proof.osmBoundary.length < 4 || proof.osmBoundary.length > 500) return false;
  const ring = proof.osmBoundary;
  if (!ring.every(p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite)
    && p[0] >= 71.2 && p[0] <= 71.7 && p[1] >= 51 && p[1] <= 51.3)
    || ring[0][0] !== ring.at(-1)![0] || ring[0][1] !== ring.at(-1)![1]) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x, y] = ring[i], [px, py] = ring[j];
    if ((y > proof.fileLat) !== (py > proof.fileLat)
      && proof.fileLon < (px - x) * (proof.fileLat - y) / (py - y) + x) inside = !inside;
  }
  return inside;
}
