import * as fs from 'fs';
import * as path from 'path';

let _templatesDir: string | undefined;

/** Resolve templates directory relative to this file at runtime. */
function getTemplatesDir(): string {
  if (_templatesDir) return _templatesDir;
  // Walk up from dist/luau/ or src/luau/ to package root, then into src/luau/templates
  const candidates = [
    path.resolve(__dirname, '..', 'luau', 'templates'),      // from dist/luau/
    path.resolve(__dirname, 'templates'),                      // from src/luau/
    path.resolve(__dirname, '..', '..', 'src', 'luau', 'templates'), // from dist/
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      _templatesDir = dir;
      return dir;
    }
  }
  throw new Error(`Templates directory not found. Searched: ${candidates.join(', ')}`);
}

/** Override the templates directory (useful for testing). */
export function setTemplatesDir(dir: string): void {
  _templatesDir = dir;
}

const PLACEHOLDER_RE = /\{\{(\w+)\}\}/g;

/** Allowed characters for sanitized string values embedded in Luau. */
const SAFE_STRING_RE = /^[\w\s,.'\-]+$/;

export interface RenderParams {
  [key: string]: string | number | boolean;
}

/**
 * Sanitize a string value for safe embedding in Luau source.
 * Strips to safe characters, length-caps, and escapes for Luau string literal.
 */
export function sanitizeString(value: string, maxLength = 200): string {
  const trimmed = value.slice(0, maxLength);
  const cleaned = trimmed.replace(/[^\w\s,.'\-]/g, '');
  return cleaned.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Format a value for Luau source embedding.
 * Numbers become their string representation.
 * Booleans become "true"/"false".
 * Strings are sanitized and double-quoted.
 */
export function formatValue(value: string | number | boolean): string {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`Non-finite number not allowed in template: ${value}`);
    }
    return value.toString();
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return `"${sanitizeString(value)}"`;
}

/**
 * Read a .luau template file from the templates directory.
 */
export function readTemplate(templateName: string): string {
  const templatePath = path.join(getTemplatesDir(), templateName);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templateName}`);
  }
  return fs.readFileSync(templatePath, 'utf-8');
}

/**
 * Render a Luau template by substituting {{placeholder}} values.
 *
 * - Numbers are validated as finite and emitted as-is.
 * - Booleans become Luau true/false.
 * - Strings are sanitized (safe chars only, escaped, length-capped).
 * - Throws if any placeholder remains unresolved after substitution.
 */
export function renderTemplate(templateName: string, params: RenderParams): string {
  const template = readTemplate(templateName);
  return renderTemplateString(template, params);
}

/**
 * Render a template string directly (for testing without file I/O).
 */
export function renderTemplateString(template: string, params: RenderParams): string {
  const result = template.replace(PLACEHOLDER_RE, (_match, key: string) => {
    if (!(key in params)) {
      throw new Error(`Missing template parameter: {{${key}}}`);
    }
    return formatValue(params[key]);
  });

  const unresolvedMatch = result.match(PLACEHOLDER_RE);
  if (unresolvedMatch) {
    throw new Error(`Unresolved template placeholders: ${unresolvedMatch.join(', ')}`);
  }

  return result;
}
