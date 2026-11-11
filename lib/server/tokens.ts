import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Navy Stream token values for places that can't use `var(--token)`: the web
 * app manifest, the theme-color meta tag and the generated app icons all need
 * literal colours. Reading them from tokens.css keeps that file the only
 * source of truth. Server-only; runs at build time.
 */

export type TokenTheme = "light" | "dark";

/** Parses `--name: value;` pairs out of one `selector { … }` block. */
export function parseTokenBlock(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) return {};
  const end = css.indexOf("}", start);
  const block = css.slice(start, end);
  const tokens: Record<string, string> = {};
  for (const match of block.matchAll(/--([\w-]+):\s*([^;]+);/g)) tokens[match[1]] = match[2].trim();
  return tokens;
}

let cache: { light: Record<string, string>; dark: Record<string, string> } | null = null;

function load() {
  if (!cache) {
    const css = readFileSync(join(process.cwd(), "styles/navy-stream/tokens.css"), "utf8");
    const light = parseTokenBlock(css, ":root");
    cache = { light, dark: { ...light, ...parseTokenBlock(css, ':root[data-theme="dark"]') } };
  }
  return cache;
}

/** A token's literal value, e.g. token("ocean-500") → "#0a5bc4". Throws if it is missing. */
export function token(name: string, theme: TokenTheme = "light"): string {
  const value = load()[theme][name];
  if (!value) throw new Error(`Navy Stream token --${name} not found in tokens.css`);
  return value;
}
