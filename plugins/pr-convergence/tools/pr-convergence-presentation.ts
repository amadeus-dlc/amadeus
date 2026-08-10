import { readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

export interface IntentReference {
  readonly name: string;
  readonly recordPath: string;
  readonly uuid: string;
}

export interface PullRequestWorkReference {
  readonly intent: IntentReference;
  readonly bolt: string;
  readonly unit: string;
}

export const AMADEUS_WORK_HEADING = "## Amadeus Work";
export const AMADEUS_WORK_FIELD_LABELS = ["Intent", "Bolt", "Unit", "Record", "UUID"] as const;
export type AmadeusWorkFieldName = (typeof AMADEUS_WORK_FIELD_LABELS)[number];
export const PR_TITLE_PREFIX_PATTERN: RegExp = /^\[([^/\]\r\n]+)\/([^/\]\r\n]+)\/([^/\]\r\n]+)\] /;

export type IntentReferenceResult =
  | { readonly ok: true; readonly value: IntentReference }
  | { readonly ok: false; readonly message: string };

interface RegistryRow {
  readonly uuid: string;
  readonly slug: string;
  readonly dirName?: string;
}

const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/;
const SAFE_UUID = /^[A-Za-z0-9-]+$/;

function registryRow(value: unknown): RegistryRow | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.uuid !== "string" || !SAFE_UUID.test(row.uuid)) return null;
  if (typeof row.slug !== "string" || !SAFE_SEGMENT.test(row.slug)) return null;
  if (row.dirName !== undefined && (typeof row.dirName !== "string" || !SAFE_SEGMENT.test(row.dirName))) {
    return null;
  }
  return {
    uuid: row.uuid,
    slug: row.slug,
    ...(typeof row.dirName === "string" ? { dirName: row.dirName } : {}),
  };
}

function rowMatchesRecord(row: RegistryRow, recordDir: string): boolean {
  if (row.dirName !== undefined) return row.dirName === recordDir;
  if (!recordDir.startsWith(`${row.slug}-`)) return false;
  const suffix = recordDir.slice(row.slug.length + 1);
  return /^[0-9a-f]+$/.test(suffix) && row.uuid.replaceAll("-", "").endsWith(suffix);
}

export function resolveIntentReference(recordRoot: string): IntentReferenceResult {
  const record = resolve(recordRoot);
  const recordDir = basename(record);
  const intentsDir = dirname(record);
  const spaceDir = dirname(intentsDir);
  const spacesDir = dirname(spaceDir);
  const amadeusDir = dirname(spacesDir);
  const space = basename(spaceDir);
  if (
    basename(intentsDir) !== "intents" ||
    basename(spacesDir) !== "spaces" ||
    basename(amadeusDir) !== "amadeus" ||
    !SAFE_SEGMENT.test(space) ||
    !SAFE_SEGMENT.test(recordDir)
  ) {
    return { ok: false, message: "--record must name amadeus/spaces/<space>/intents/<intent>" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(join(intentsDir, "intents.json"), "utf-8"));
  } catch {
    return { ok: false, message: "cannot read the Intent registry beside --record" };
  }
  if (!Array.isArray(parsed)) return { ok: false, message: "the Intent registry must be an array" };
  const rows = parsed.map(registryRow);
  if (rows.some((row) => row === null)) {
    return { ok: false, message: "the Intent registry contains an invalid identity" };
  }
  const matches = (rows as RegistryRow[]).filter((row) => rowMatchesRecord(row, recordDir));
  if (matches.length !== 1) {
    return { ok: false, message: `--record resolves to ${matches.length} Intent registry entries` };
  }
  const match = matches[0] as RegistryRow;
  return {
    ok: true,
    value: {
      name: match.slug,
      recordPath: `amadeus/spaces/${space}/intents/${recordDir}/`,
      uuid: match.uuid,
    },
  };
}

export function renderPullRequestTitle(title: string, work: PullRequestWorkReference): string {
  return `[${work.intent.name}/${work.bolt}/${work.unit}] ${title}`;
}

export function renderPullRequestBody(body: string, work: PullRequestWorkReference): string {
  const separator = body === "" ? "" : body.endsWith("\n") ? "\n" : "\n\n";
  const [intentLabel, boltLabel, unitLabel, recordLabel, uuidLabel] = AMADEUS_WORK_FIELD_LABELS;
  return [
    `${body}${separator}${AMADEUS_WORK_HEADING}`,
    "",
    `- ${intentLabel}: \`${work.intent.name}\``,
    `- ${boltLabel}: \`${work.bolt}\``,
    `- ${unitLabel}: \`${work.unit}\``,
    `- ${recordLabel}: \`${work.intent.recordPath}\``,
    `- ${uuidLabel}: \`${work.intent.uuid}\``,
    "",
  ].join("\n");
}
