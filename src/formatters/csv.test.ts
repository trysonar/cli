import { describe, expect, it } from 'vitest';
import { csvCell } from './csv.js';

describe('spreadsheet-safe CSV', () => {
  it.each(['=1+1', '+SUM(1)', '-1+2', '@SUM(1)', '  =1+1', '\t=1+1', '\r=1+1', '\n=1+1', '\u0000=1+1'])('neutralizes text %j', (value) => {
    expect(csvCell(value).replace(/^"/, '')).toBeTruthy();
    expect(csvCell(value).replace(/^"/, '').startsWith("'")).toBe(true);
  });
  it('keeps numbers numeric, text negative values safe, and ordinary Unicode intact', () => {
    expect(csvCell(-42)).toBe('-42');
    expect(csvCell('-42')).toBe("'-42");
    expect(csvCell('žltý 日本語')).toBe('žltý 日本語');
  });
  it('quotes CR, LF, commas and embedded quotes', () => {
    expect(csvCell('one\rtwo')).toBe('"one\rtwo"');
    expect(csvCell('one\ntwo')).toBe('"one\ntwo"');
    expect(csvCell('say "hi", now')).toBe('"say ""hi"", now"');
  });
});
