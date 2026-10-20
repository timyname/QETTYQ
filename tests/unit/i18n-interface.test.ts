import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import ts from 'typescript';
import { countLabel, formatDate, formatMoney, translateText, validLanguage } from '../../src/client/i18n';
import { UI_TRANSLATIONS } from '../../src/client/i18n-dictionary';
import { boundedChatPayload } from '../../src/components/chat-payload';

describe('RU / KK / EN interface', () => {
  it('accepts only the three supported device languages', () => {
    expect(['ru', 'kk', 'en'].every(validLanguage)).toBe(true);
    expect(validLanguage('en-US')).toBe(false); expect(validLanguage(null)).toBe(false);
  });
  it('has complete static-copy coverage for the active UI, including organiser and accessibility text', () => {
    const files = ['PilotApp.tsx', 'BudgetControl.tsx', 'RoutePlan.tsx', 'LiveEvents.tsx', 'GlassDock.tsx', 'ProgressRail.tsx', 'MapCanvas.tsx', 'CityMap.tsx', 'CitedMessage.tsx', 'MemorySettings.tsx', 'GooglePlacesResults.tsx', 'PolicyPages.tsx', 'screens/OrganizerFlow.tsx', 'map-marker-icons.ts', 'chat-payload.ts'];
    const missing = new Set<string>();
    for (const name of files) {
      const file = ts.createSourceFile(name, fs.readFileSync(`src/components/${name}`, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      function visit(node: ts.Node) {
        if ((ts.isStringLiteral(node) || ts.isJsxText(node) || ts.isNoSubstitutionTemplateLiteral(node)) && /[А-Яа-яЁё]/u.test(node.text)) {
          const text = node.text.trim().replace(/\s+/g, ' ');
          // This is an internal deterministic retrieval command, not interface copy.
          if (text && !['Подбери места по моим условиям', 'Давай Сходим · sxodim.com/astana'].includes(text) && !UI_TRANSLATIONS[text]) missing.add(`${name}: ${text}`);
        }
        ts.forEachChild(node, visit);
      }
      visit(file);
    }
    expect([...missing]).toEqual([]);
    for (const [ru, [kk, en]] of Object.entries(UI_TRANSLATIONS)) { expect(kk, ru).toBeTruthy(); expect(en, ru).toBeTruthy(); }
  });
  it('translates UI templates without changing captured source names or dollar sequences', () => {
    expect(translateText('Убрать $& из плана', 'en')).toBe('Remove $& from plan');
    expect(translateText('от 3,000 ₸ · условия уточняйте', 'en')).toBe('from 3,000 ₸ · check conditions');
    expect(translateText('Русский Академический театр драмы им М.Горького', 'en')).toBe('Русский Академический театр драмы им М.Горького');
  });
  it('formats Kazakh months explicitly when an ICU build would return M10', () => {
    const date = '2026-10-20T13:00:00Z';
    expect(formatDate(date, 'kk', { day: 'numeric', month: 'long' })).toBe('20 қазан');
    expect(formatDate(date, 'kk', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })).toBe('20 қаз., 18:00');
    expect(formatDate(date, 'en', { day: 'numeric', month: 'long' })).toBe('20 October');
  });
  it('distinguishes unknown money, zero, plural forms and explicit language in the entire POST', () => {
    expect(formatMoney(null, 'en')).toBe('Check the price'); expect(formatMoney(0, 'en')).toBe('0 ₸');
    expect(countLabel(1, 'ru', 'places')).toBe('1 место'); expect(countLabel(2, 'ru', 'places')).toBe('2 места'); expect(countLabel(5, 'ru', 'places')).toBe('5 мест');
    expect(countLabel(2, 'en', 'places')).toBe('2 places'); expect(countLabel(2, 'kk', 'places')).toBe('2 орын');
    const body = boundedChatPayload('Coffee', {}, [], false, 'en', false);
    expect(body).toMatchObject({ language: 'en', googleConsent: false, useAI: false });
  });
});
