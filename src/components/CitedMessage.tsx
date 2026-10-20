import { Fragment, type ReactNode } from 'react';
import type { LocalChatMessage } from '@/client/local-memory';

export function CitedMessage({ message }: { message: LocalChatMessage }) {
  const citations = (message.citations ?? []).filter(c => /^https:\/\//.test(c.url));
  const ranged = citations.filter(c => c.startIndex !== undefined && c.endIndex !== undefined && c.startIndex >= 0 && c.endIndex! <= message.text.length).sort((a, b) => a.startIndex! - b.startIndex!);
  let offset = 0;
  const pieces: ReactNode[] = [];
  for (const [index, citation] of ranged.entries()) {
    if (citation.startIndex! < offset) continue;
    const plain = message.text.slice(offset, citation.startIndex);
    offset = citation.endIndex!;
    pieces.push(<Fragment key={`${citation.url}-${index}`}>{plain}<a href={citation.url} target="_blank" rel="noreferrer" title={citation.title} aria-label={`Источник: ${citation.title}`}>[{index + 1}]</a></Fragment>);
  }
  return <><p>{pieces}{message.text.slice(offset)}</p>{citations.length > 0 && <div aria-label="Источники ответа">{citations.filter((c, i) => citations.findIndex(other => other.url === c.url) === i).map(c => <a key={c.url} href={c.url} target="_blank" rel="noreferrer" style={{ display: 'block', fontSize: 10, paddingBlock: 6 }}>{c.title || new URL(c.url).hostname} ↗</a>)}</div>}</>;
}
