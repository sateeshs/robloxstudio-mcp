import { renderTemplateString, sanitizeString, formatValue } from '../src/luau/render.js';

describe('sanitizeString', () => {
  test('passes safe strings through', () => {
    expect(sanitizeString('hello world')).toBe('hello world');
    expect(sanitizeString("it's fine")).toBe("it's fine");
  });

  test('strips dangerous characters', () => {
    expect(sanitizeString('hello]]world')).toBe('helloworld');
    // Newlines are whitespace and preserved by \s — but we should strip them
    expect(sanitizeString('a"b')).toBe('ab');
    expect(sanitizeString('end)--[[evil]]')).toBe('end--evil');
  });

  test('strips parentheses and semicolons used in injection', () => {
    const result = sanitizeString('test";os.execute("rm -rf /');
    // Parentheses, semicolons, and quotes are stripped
    expect(result).not.toContain('"');
    expect(result).not.toContain(';');
    expect(result).not.toContain('(');
    expect(result).not.toContain(')');
  });

  test('caps length at maxLength', () => {
    const long = 'a'.repeat(300);
    expect(sanitizeString(long, 200).length).toBe(200);
  });

  test('handles empty string', () => {
    expect(sanitizeString('')).toBe('');
  });
});

describe('formatValue', () => {
  test('formats numbers', () => {
    expect(formatValue(42)).toBe('42');
    expect(formatValue(3.14)).toBe('3.14');
    expect(formatValue(-10)).toBe('-10');
    expect(formatValue(0)).toBe('0');
  });

  test('rejects non-finite numbers', () => {
    expect(() => formatValue(Infinity)).toThrow('Non-finite');
    expect(() => formatValue(NaN)).toThrow('Non-finite');
    expect(() => formatValue(-Infinity)).toThrow('Non-finite');
  });

  test('formats booleans', () => {
    expect(formatValue(true)).toBe('true');
    expect(formatValue(false)).toBe('false');
  });

  test('formats and sanitizes strings', () => {
    expect(formatValue('hello')).toBe('"hello"');
    expect(formatValue('a]]b')).toBe('"ab"');
  });
});

describe('renderTemplateString', () => {
  test('substitutes simple placeholders', () => {
    const result = renderTemplateString(
      'local x = {{posX}}\nlocal name = {{name}}',
      { posX: 42, name: 'test' }
    );
    expect(result).toBe('local x = 42\nlocal name = "test"');
  });

  test('substitutes boolean placeholders', () => {
    const result = renderTemplateString('local flag = {{enabled}}', { enabled: true });
    expect(result).toBe('local flag = true');
  });

  test('throws on missing parameter', () => {
    expect(() => renderTemplateString('{{missing}}', {})).toThrow('Missing template parameter: {{missing}}');
  });

  test('throws on unresolved placeholder after partial substitution', () => {
    expect(() =>
      renderTemplateString('{{a}} and {{b}}', { a: 1 })
    ).toThrow('Missing template parameter: {{b}}');
  });

  test('handles template with no placeholders', () => {
    const result = renderTemplateString('plain luau code', {});
    expect(result).toBe('plain luau code');
  });

  test('prevents Luau injection via string values', () => {
    const result = renderTemplateString(
      'local s = {{userInput}}',
      { userInput: '"; os.execute("rm -rf /")--' }
    );
    // Parentheses, semicolons, and inner quotes are stripped — the string
    // is safely wrapped in outer quotes by formatValue
    expect(result).not.toContain('execute(');
    expect(result).not.toContain(']]');
    // Result is a valid Luau string literal
    expect(result).toMatch(/^local s = ".*"$/);
  });

  test('prevents injection via closing brackets', () => {
    const result = renderTemplateString(
      'local s = {{val}}',
      { val: 'test]]..os.execute("bad")..[[more' }
    );
    // Brackets stripped — no way to break out of the string literal
    expect(result).not.toContain(']]');
    expect(result).not.toContain('[[');
    expect(result).not.toContain('execute(');
  });

  test('handles multiple occurrences of same placeholder', () => {
    const result = renderTemplateString(
      '{{x}} + {{x}}',
      { x: 5 }
    );
    expect(result).toBe('5 + 5');
  });
});
