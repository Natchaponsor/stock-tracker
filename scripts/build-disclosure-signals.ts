/**
 * Builds data/disclosure-signals.json — the decision agent's input — from the
 * validated disclosure log in data/disclosures.json.
 *
 *   npm run disclosures:signals
 *   npm run disclosures:signals -- --book ~/Downloads/stock-tracker-export.json
 *   npm run disclosures:signals -- --today 2026-10-11 --window-days 180
 *
 * Runs under Node's built-in type stripping; no build step.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { parseDisclosureDataset } from "../lib/disclosures.ts";
import { bookFromExport, buildSignalFile } from "../lib/disclosureSignals.ts";

const root = resolve(import.meta.dirname, "..");

const { values } = parseArgs({
  options: {
    book: { type: "string" },
    today: { type: "string" },
    "window-days": { type: "string" },
    out: { type: "string", default: "data/disclosure-signals.json" },
  },
});

// The reader's calendar day, not UTC's — east of Greenwich the evening is already tomorrow in UTC.
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const today = values.today ?? localToday();
if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error(`--today must be YYYY-MM-DD (got "${today}")`);

const windowDays = values["window-days"] === undefined ? undefined : Number(values["window-days"]);
if (windowDays !== undefined && (!Number.isInteger(windowDays) || windowDays <= 0)) {
  throw new Error(`--window-days must be a positive integer (got "${values["window-days"]}")`);
}

const dataset = parseDisclosureDataset(JSON.parse(readFileSync(resolve(root, "data/disclosures.json"), "utf8")));
const book = values.book ? bookFromExport(JSON.parse(readFileSync(resolve(values.book), "utf8"))) : [];

const file = buildSignalFile(dataset, { today, windowDays, book });
const outPath = resolve(root, values.out);
writeFileSync(outPath, `${JSON.stringify(file, null, 2)}\n`);

const onSheet = file.packets.filter((p) => p.onUserSheet !== null).length;
console.log(
  `Wrote ${file.packets.length} packets (${onSheet} on the user's sheet) for ${file.window.from} → ${file.window.to} to ${values.out}`
);
