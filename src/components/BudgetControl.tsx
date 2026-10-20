'use client';

import { Localize, useI18n, formatNumber } from '../client/i18n';

import { useId, useState } from 'react';
import { Check, Infinity as InfinityIcon, Wallet } from 'lucide-react';
import s from './BudgetControl.module.css';

export type BudgetControlProps = {
  /** Whole KZT per person. null means no chosen spending ceiling, never zero. */
  value: number | null;
  onChange: (value: number | null) => void;
  strict: boolean;
  onStrictChange: (strict: boolean) => void;
};

const MAX_BUDGET = 1_000_000;
const PRESETS = [0, 3_000, 5_000, 10_000] as const;

export function BudgetControl({ value, onChange, strict, onStrictChange }: BudgetControlProps) {
  const { language } = useI18n();
  const id = useId();
  const amountId = `budget-${id}`;
  const descriptionId = `${amountId}-description`;
  const errorId = `${amountId}-error`;
  const [error, setError] = useState('');
  const validValue = value !== null && Number.isFinite(value) && Number.isInteger(value) && value >= 0 && value <= MAX_BUDGET;

  function select(next: number | null) {
    setError('');
    onChange(next);
    // Free-only must never silently include unknown prices. Away from a free
    // budget, release that automatic constraint; other explicit choices survive.
    if (next === 0) onStrictChange(true);
    else if (value === 0 || next === null) onStrictChange(false);
  }

  function edit(raw: string) {
    if (raw.trim() === '') { select(null); return; }
    const next = Number(raw);
    if (!Number.isFinite(next) || !Number.isInteger(next) || next < 0 || next > MAX_BUDGET) {
      setError('Введите целую сумму от 0 до 1 000 000 ₸.');
      return;
    }
    select(next);
  }

  return <Localize><fieldset className={s.root}>
    <legend className={s.legend}>Бюджет</legend>
    <label className={s.amountLabel} htmlFor={amountId}>
      <span><Wallet size={19} aria-hidden="true" /> Бюджет на человека</span>
      <span className={s.currency}>KZT</span>
    </label>
    <div className={s.amountField}>
      <input
        id={amountId}
        className={s.amountInput}
        aria-label="Бюджет на человека, ₸"
        aria-describedby={`${descriptionId}${error ? ` ${errorId}` : ''}`}
        aria-invalid={error ? true : undefined}
        type="number"
        inputMode="numeric"
        min={0}
        max={MAX_BUDGET}
        step={1}
        value={validValue ? value : ''}
        placeholder="Без ограничений"
        onChange={event => edit(event.target.value)}
      />
      <span className={s.unit} aria-hidden="true">₸ / человек</span>
    </div>
    <div className={s.presets} role="group" aria-label="Быстрый выбор бюджета на человека">
      {PRESETS.map(amount => <button
        key={amount}
        className={s.preset}
        type="button"
        aria-pressed={validValue && value === amount}
        aria-label={amount === 0 ? 'Только бесплатные варианты, 0 ₸' : `Бюджет ${formatNumber(amount, language)} ₸ на человека`}
        onClick={() => select(amount)}
      >{amount === 0 ? '0 ₸' : formatNumber(amount, language)}</button>)}
      <button
        className={`${s.preset} ${s.unlimited}`}
        type="button"
        aria-pressed={value === null}
        onClick={() => select(null)}
      ><InfinityIcon size={20} aria-hidden="true" /><span>Без ограничений<small>Сумму можно выбрать позже</small></span>{value === null && <Check size={18} aria-hidden="true" />}</button>
    </div>
    <p id={descriptionId} className={s.description}>
      {value === 0 ? strict ? 'Покажем только подтверждённо бесплатные варианты.' : 'Бюджет 0 ₸. Варианты с неизвестной ценой требуют уточнения.' : value === null ? 'Не задаём предел расходов. Неизвестная цена не означает бесплатный вход.' : 'Выбери готовую сумму или введи свою. Стоимость дороги и билетов может потребовать уточнения.'}
    </p>
    {error && <p id={errorId} className={s.error} role="alert">{error}</p>}
    <label className={s.strict}>
      <input type="checkbox" checked={strict} onChange={event => onStrictChange(event.target.checked)} />
      <span>Не предлагать варианты с неизвестной ценой</span>
    </label>
  </fieldset></Localize>;
}
