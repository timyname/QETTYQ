import { describe, expect, it } from 'vitest';
import { redactMemoryLocation } from '../../src/server/datastore/client-memory';
describe('currency/duration commas are not location evidence; real location guards remain', () => {
  it.each(['Музей, бюджет 5000 тенге, 90 минут', 'Мұражай көрсет. 5000 теңге, 90 минут',
    'Coffee, 5000 KZT, 90 minutes', 'Музей. 5000 ₸, 2 hours'])('retains preference text %s', text => {
    expect(redactMemoryLocation(text)).toBe(text);
  });
  it.each(['ул. Тенге, 90 минут пешком; бюджет 5000 тенге, 90 минут',
    'Музей, 5000 тенге, 90 минут; Абая, 10', 'Абая, 10; музей 5000 теңге, 90 минут',
    'Живу рядом, 5000 тенге, 90 минут', 'Тенге, 90', '5000 тенге, 90.123456 минут'])('still suppresses real or ambiguous address %s', text => {
    expect(redactMemoryLocation(text)).toBe('[Сообщение с адресом или геопозицией не сохранено]');
  });
  it('still suppresses decimal coordinates and URL payloads beside an ordinary budget', () => {
    const value = redactMemoryLocation('5000 теңге, 90 минут. 51.123456 71.123456 https://example.invalid/private');
    expect(value).not.toContain('51.123456'); expect(value).not.toContain('71.123456'); expect(value).not.toContain('https://');
    expect(value).toContain('5000 теңге, 90 минут');
  });
});
