import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Journey, Step } from "./journeys";

/**
 * Reads the split-file output a trizo-horus scan produces (index.json +
 * journeys/<id>.json) -- server-side only (node:fs), never imported by a
 * "use client" component. See trizo-horus's src/output/writer.ts for the
 * shape this mirrors.
 */

type ScanMeta = {
  generatedAt: string;
  scannerVersion: string;
  provider: string;
  reposScanned: string[];
};

type JourneySummary = { id: string; file: string };

type ScanIndex = {
  meta: ScanMeta;
  journeys: JourneySummary[];
};

// trizo-horus emits `null` for absent optional fields where this app's Step
// type uses `undefined` -- widen just those fields for the raw wire shape.
type WireStep = Omit<Step, "tech" | "endpoint" | "datastore" | "tables" | "vendor" | "notes"> & {
  tech?: string | null;
  endpoint?: string | null;
  datastore?: string | null;
  tables?: string[] | null;
  vendor?: string | null;
  notes?: string | null;
};

type WireJourney = Omit<Journey, "steps"> & { steps: WireStep[] };

export type ScanResult = {
  meta: ScanMeta;
  journeys: Journey[];
};

function nullToUndefined<T>(value: T | null | undefined): T | undefined {
  return value === null ? undefined : value;
}

function normalizeStep(step: WireStep): Step {
  return {
    ...step,
    tech: nullToUndefined(step.tech),
    endpoint: nullToUndefined(step.endpoint),
    datastore: nullToUndefined(step.datastore),
    tables: nullToUndefined(step.tables),
    vendor: nullToUndefined(step.vendor),
    notes: nullToUndefined(step.notes),
  };
}

function resolveScanDir(): string {
  return process.env.TRIZO_HORUS_OUTPUT_DIR
    ? path.resolve(process.env.TRIZO_HORUS_OUTPUT_DIR)
    : path.resolve(process.cwd(), "scan-output");
}

/**
 * Loads journeys from TRIZO_HORUS_OUTPUT_DIR (or ./scan-output by default).
 * Returns null if no scan output is present there, so the caller can fall
 * back to the bundled sample data instead of crashing the page.
 */
export async function loadScanJourneys(): Promise<ScanResult | null> {
  const dir = resolveScanDir();
  const indexPath = path.join(dir, "index.json");

  if (!existsSync(indexPath)) return null;

  try {
    const index = JSON.parse(await readFile(indexPath, "utf8")) as ScanIndex;
    const journeys = await Promise.all(
      index.journeys.map(async (summary) => {
        const raw = JSON.parse(await readFile(path.join(dir, summary.file), "utf8")) as WireJourney;
        return { ...raw, steps: raw.steps.map(normalizeStep) };
      }),
    );
    return { meta: index.meta, journeys };
  } catch (err) {
    console.error(`trizo-horus scan output found at ${dir} but failed to load:`, err);
    return null;
  }
}
