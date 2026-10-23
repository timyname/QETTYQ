/** Only clocks returned by authenticated server memory may be replayed.
 * Exact full transcript equality prevents accidental timestamp assignment after
 * deduplication, reordering or truncation. Text itself remains untrusted. */
export function persistedReplayClocks(history: readonly {role: string; text: string}[], saved: {
  history: readonly {role: string; text: string}[];
  historyCreatedAtMs?: readonly number[];
} | null | undefined, now: number): readonly number[] | undefined {
  const clocks = saved?.historyCreatedAtMs;
  if (!saved || !clocks || !history.length || clocks.length !== history.length || saved.history.length !== history.length) return undefined;
  if (clocks.some(time => !Number.isSafeInteger(time) || time < 0 || time > now)) return undefined;
  return history.every((message,index) => message.role === saved.history[index].role && message.text === saved.history[index].text) ? clocks : undefined;
}
