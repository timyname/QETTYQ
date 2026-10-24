import base from '../../../data/astana-address-index.json';
import supplement from '../../../data/astana-address-place-supplement.json';
import type { AddressIndex } from './address-match';

/** Reviewed addr:place omissions from the exact same approved OSM extract.
 * A replacement source/cutoff automatically invalidates the old supplement.
 * Normal city/age/uniqueness validation still runs in createAddressMatcher. */
const sameSource = (['url', 'asOf', 'retrievedAt', 'license'] as const)
  .every(field => base.source[field] === supplement.source[field]);
export const publicAddressIndex: AddressIndex = {
  source: base.source,
  entries: [...base.entries, ...(sameSource ? supplement.entries : [])] as AddressIndex['entries'],
};
