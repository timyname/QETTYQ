import sources from '../../../data/source-registry.json';
import eventSources from '../../../data/event-source-candidates.json';
import type { SourcePolicyResolver } from './source-permission';

/** Existing reviewed grants for the bundled, noncommercial pilot only. A hosted
 * resolver replaces this completely, including when its result is a denial. */
export const applicationSourcePolicy: SourcePolicyResolver = sourceId => {
  const source = sources.find(row => row.id === sourceId);
  if (source) return source.status === 'approved_for_scope' ? {
    persist: source.allowed_uses.persist, display: source.allowed_uses.display,
    sendToLlm: source.allowed_uses.send_to_llm, embed: source.allowed_uses.embed,
  } : null;
  const eventSource = eventSources.sources.find(row => row.runtimeSourceId === sourceId);
  if (sourceId === 'sxodim-astana-noncommercial' && eventSource?.status === 'approved_for_scope' && eventSource.fetchApproved) {
    // Matches the existing VPS grant: short normalized event facts, not photos,
    // descriptions, embeddings, commercial reuse or a new source approval.
    return { persist: true, display: true, sendToLlm: true, embed: false };
  }
  return null;
};
