/** Conservative decimal-coordinate redaction, shared by every outbound query.
 * May also omit decimal amounts; deterministic constraints use original input.
 * This is not a universal free-text address/PII classifier.
 */
export function redactDecimalCoordinates(value: string, replacement = "[coordinates omitted]") {
  return value.replace(/[+-]?\d{1,3}[.,]\d+/gu, replacement);
}
