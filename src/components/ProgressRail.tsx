'use client';

import { Localize, useI18n, translateText } from '../client/i18n';

import s from './PilotApp.module.css';

/** Segments are real controls for carousels; setup progress is non-interactive. */
export function ProgressRail({ count, active, label, onSelect }: { count: number; active: number; label: string; onSelect?: (index: number) => void }) {
  const { language } = useI18n();
  const translatedLabel = translateText(label, language);
  if (count < 1) return null;
  return <Localize><div className={s.progressRail} role="group" aria-label={label}>
    {Array.from({ length: count }, (_, index) => onSelect
      ? <button key={index} aria-label={`${translatedLabel}: ${index + 1} из ${count}`} aria-current={index === active ? 'step' : undefined} onClick={() => onSelect(index)}><span data-state={index === active ? 'active' : 'idle'} /></button>
      : <span key={index} data-state={index === active ? 'active' : index < active ? 'complete' : 'idle'} />)}
    {!onSelect && <span className={s.srOnly} role="status">{active + 1} из {count}</span>}
  </div></Localize>;
}
