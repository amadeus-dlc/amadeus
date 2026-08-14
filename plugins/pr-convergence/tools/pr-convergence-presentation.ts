import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

export interface IntentReference {
  readonly name: string;
  readonly recordPath: string;
  readonly uuid: string;
}

export interface PullRequestWorkReference {
  readonly intent: IntentReference;
  readonly bolt: string;
  readonly unit?: string;
  readonly units?: readonly string[];
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

export type CanonicalUnitSlugsResult =
  | { readonly ok: true; readonly value: readonly string[] }
  | { readonly ok: false; readonly message: string };

export type DeliveryBoltAuthorityFailure = "MISSING" | "INVALID" | "STALE" | "MISMATCH";

export type DeliveryBoltMembershipResult =
  | { readonly ok: true; readonly value: readonly string[] }
  | { readonly ok: false; readonly code: DeliveryBoltAuthorityFailure; readonly message: string };

type DeliveryBoltAuthorityRead =
  | { readonly ok: true; readonly graph: unknown }
  | { readonly ok: false; readonly result: DeliveryBoltMembershipResult };

function readDeliveryBoltAuthority(recordRoot: string): DeliveryBoltAuthorityRead {
  const graphPath = join(recordRoot, "runtime-graph.json");
  if (!existsSync(graphPath)) {
    return {
      ok: false,
      result: {
        ok: false,
        code: "MISSING",
        message: "delivery requires a runtime Delivery Bolt authority projection",
      },
    };
  }
  try {
    return {
      ok: true,
      graph: JSON.parse(readFileSync(graphPath, "utf-8")),
    };
  } catch {
    return {
      ok: false,
      result: { ok: false, code: "INVALID", message: "Delivery Bolt authority is unreadable" },
    };
  }
}

function sha256(value: string): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function stateAction(state: string, slug: string): "EXECUTE" | "SKIP" | null {
  const escaped = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const action = state.match(new RegExp(`^- \\[[ xSR?-]\\] ${escaped}\\s*—\\s*(EXECUTE|SKIP)\\b`, "m"))?.[1];
  return action === "EXECUTE" || action === "SKIP" ? action : null;
}

type EngineSingletonSourceRead =
  | { readonly ok: true; readonly state: string; readonly scope: string }
  | { readonly ok: false; readonly result: DeliveryBoltMembershipResult };

function readEngineSingletonSource(recordRoot: string): EngineSingletonSourceRead {
  const planPath = join(recordRoot, "inception", "delivery-planning", "bolt-plan.md");
  const statePath = join(recordRoot, "amadeus-state.md");
  if (existsSync(planPath) || !existsSync(statePath)) {
    return { ok: false, result: { ok: false, code: "STALE", message: "engine singleton authority no longer matches its source files" } };
  }
  const state = readFileSync(statePath, "utf-8");
  const scope = state.match(/^- \*\*Scope\*\*:\s*(\S+)\s*$/m)?.[1] ?? "";
  if (
    !["self-document", "self-fix", "self-refactor"].includes(scope) ||
    stateAction(state, "units-generation") !== "SKIP" ||
    stateAction(state, "delivery-planning") !== "SKIP"
  ) {
    return { ok: false, result: { ok: false, code: "STALE", message: "engine singleton authority is not eligible in the current state" } };
  }
  return { ok: true, state, scope };
}

function runtimeStageSlugs(graph: Record<string, unknown>): ReadonlySet<string> {
  if (!Array.isArray(graph.stages)) return new Set<string>();
  return new Set(graph.stages.flatMap((stage) => {
    if (typeof stage !== "object" || stage === null || Array.isArray(stage)) return [];
    const slug = (stage as Record<string, unknown>).stage_slug;
    return typeof slug === "string" ? [slug] : [];
  }));
}

function engineSingletonUnit(
  recordRoot: string,
  graph: Record<string, unknown>,
): { readonly ok: true; readonly unit: string } | { readonly ok: false; readonly result: DeliveryBoltMembershipResult } {
  const construction = join(recordRoot, "construction");
  const stages = runtimeStageSlugs(graph);
  const units = existsSync(construction)
    ? readdirSync(construction, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !stages.has(entry.name))
      .map((entry) => entry.name)
      .sort()
    : [];
  if (units.length !== 1 || !SAFE_SEGMENT.test(units[0] ?? "")) {
    return { ok: false, result: { ok: false, code: "MISMATCH", message: `engine singleton resolves ${units.length} construction Units` } };
  }
  return { ok: true, unit: units[0] as string };
}

function engineSingletonProjectionMismatch(
  fields: Record<string, unknown>,
  state: string,
  scope: string,
  identity: { readonly uuid: string; readonly slug: string; readonly dirName: string },
  unit: string,
): DeliveryBoltMembershipResult | null {
  const digest = sha256(JSON.stringify({
    stateDigest: sha256(state), intent: identity, scope,
    unitsGeneration: "SKIP", deliveryPlanning: "SKIP", unit,
  }));
  if (fields.source !== "amadeus-state.md" || fields.sourceDigest !== digest) {
    return { ok: false, code: "STALE", message: "engine singleton digest does not bind the current state and Unit" };
  }
  if (
    JSON.stringify(fields.intent) !== JSON.stringify(identity) || fields.scope !== scope ||
    fields.deliveryPlanning !== "SKIP" || fields.unit !== unit
  ) {
    return { ok: false, code: "MISMATCH", message: "engine singleton identity does not match the current Intent" };
  }
  return null;
}

function engineSingletonMembership(
  recordRoot: string,
  graph: Record<string, unknown>,
  fields: Record<string, unknown>,
  bolt: string,
): DeliveryBoltMembershipResult {
  const source = readEngineSingletonSource(recordRoot);
  if (!source.ok) return source.result;
  const intent = resolveIntentReference(recordRoot);
  if (!intent.ok) return { ok: false, code: "INVALID", message: intent.message };
  const resolvedUnit = engineSingletonUnit(recordRoot, graph);
  if (!resolvedUnit.ok) return resolvedUnit.result;
  const unit = resolvedUnit.unit;
  const identity = {
    uuid: intent.value.uuid,
    slug: intent.value.name,
    dirName: basename(resolve(recordRoot)),
  };
  const mismatch = engineSingletonProjectionMismatch(
    fields, source.state, source.scope, identity, unit,
  );
  if (mismatch !== null) return mismatch;
  if (bolt !== intent.value.name) {
    return { ok: false, code: "MISMATCH", message: "--bolt does not name the engine singleton Delivery Bolt" };
  }
  const expected = [{ bolt: intent.value.name, units: [unit] }];
  if (JSON.stringify(fields.bolts) !== JSON.stringify(expected)) {
    return { ok: false, code: "MISMATCH", message: "engine singleton membership does not match its resolved Unit" };
  }
  return { ok: true, value: [unit] };
}

function approvedPlanMembership(
  recordRoot: string,
  fields: Record<string, unknown>,
  bolt: string,
): DeliveryBoltMembershipResult {
  const planPath = join(recordRoot, "inception", "delivery-planning", "bolt-plan.md");
  if (!existsSync(planPath)) {
    return { ok: false, code: "STALE", message: "the approved Delivery Plan source is missing" };
  }
  const plan = readFileSync(planPath, "utf-8");
  const digest = sha256(plan);
  if (
    fields.source !== "inception/delivery-planning/bolt-plan.md" ||
    fields.sourceDigest !== digest || !Array.isArray(fields.bolts)
  ) {
    return { ok: false, code: "STALE", message: "Delivery Bolt projection is stale or does not bind the approved plan bytes" };
  }
  const projectedMatches: readonly string[][] = fields.bolts.flatMap((candidate) => {
    if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) return [];
    const row = candidate as Record<string, unknown>;
    if (typeof row.bolt !== "string" || !Array.isArray(row.units) || !row.units.every((unit) => typeof unit === "string")) return [];
    return row.bolt === bolt || `bolt-${row.bolt}` === bolt ? [row.units as string[]] : [];
  });
  if (projectedMatches.length !== 1) {
    return { ok: false, code: "MISMATCH", message: `--bolt resolves to ${projectedMatches.length} approved Delivery Bolt entries` };
  }
  const projected = canonicalUnitSlugs(projectedMatches[0] ?? []);
  if (!projected.ok) return { ...projected, code: "INVALID" };
  const planMatches = plan.split(/(?=^## Bolt\s+)/m).filter((section) => {
    const heading = section.match(/^## Bolt\s+([^:\r\n]+)(?::[^\r\n]*)?$/m)?.[1]?.trim();
    return heading === bolt || `bolt-${heading}` === bolt;
  });
  if (planMatches.length !== 1) {
    return { ok: false, code: "MISMATCH", message: `--bolt resolves to ${planMatches.length} current Delivery Plan entries` };
  }
  const unitsLine = planMatches[0]?.match(/^- \*\*Units?:\*\*([^\r\n]*)$/m)?.[1] ?? "";
  const planned = canonicalUnitSlugs([...unitsLine.matchAll(/`([^`]+)`/g)].map((match) => match[1] ?? ""));
  if (!planned.ok) return { ...planned, code: "INVALID" };
  return planned.value.join("\0") === projected.value.join("\0")
    ? projected
    : { ok: false, code: "MISMATCH", message: "Delivery Bolt projection does not match the approved plan membership" };
}

export function canonicalUnitSlugs(units: readonly string[]): CanonicalUnitSlugsResult {
  if (units.length === 0) return { ok: false, message: "the Delivery Bolt must contain at least one Unit" };
  if (units.some((unit) => !SAFE_SEGMENT.test(unit))) {
    return { ok: false, message: "every Unit must be a non-empty slug" };
  }
  const value = [...units].sort();
  if (value.some((unit, index) => index > 0 && value[index - 1] === unit)) {
    return { ok: false, message: "the Delivery Bolt contains duplicate Units" };
  }
  return { ok: true, value };
}

export function unitsOf(work: Pick<PullRequestWorkReference, "unit" | "units">): readonly string[] {
  const supplied = work.units ?? (work.unit === undefined ? [] : [work.unit]);
  const canonical = canonicalUnitSlugs(supplied);
  if (!canonical.ok) throw new Error(canonical.message);
  return canonical.value;
}

export function resolveDeliveryBoltMembership(
  recordRoot: string,
  bolt: string,
): DeliveryBoltMembershipResult {
  const authority = readDeliveryBoltAuthority(recordRoot);
  if (!authority.ok) return authority.result;
  const { graph } = authority;
  if (typeof graph !== "object" || graph === null || Array.isArray(graph)) {
    return { ok: false, code: "INVALID", message: "runtime-graph.json does not contain a valid Delivery Bolt projection" };
  }
  const projection = (graph as Record<string, unknown>).delivery_bolts;
  if (typeof projection !== "object" || projection === null || Array.isArray(projection)) {
    return { ok: false, code: "MISSING", message: "runtime-graph.json has no approved Delivery Bolt projection" };
  }
  const fields = projection as Record<string, unknown>;
  if (fields.authority === "engine-singleton") {
    return engineSingletonMembership(recordRoot, graph as Record<string, unknown>, fields, bolt);
  }
  if (fields.authority !== "approved-plan") {
    return { ok: false, code: "INVALID", message: "Delivery Bolt projection has no recognized authority discriminator" };
  }
  return approvedPlanMembership(recordRoot, fields, bolt);
}

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
  return `[${work.intent.name}/${work.bolt}/${unitsOf(work).join("+")}] ${title}`;
}

export function renderPullRequestBody(body: string, work: PullRequestWorkReference): string {
  const separator = body === "" ? "" : body.endsWith("\n") ? "\n" : "\n\n";
  const [intentLabel, boltLabel, unitLabel, recordLabel, uuidLabel] = AMADEUS_WORK_FIELD_LABELS;
  const units = unitsOf(work);
  return [
    `${body}${separator}${AMADEUS_WORK_HEADING}`,
    "",
    `- ${intentLabel}: \`${work.intent.name}\``,
    `- ${boltLabel}: \`${work.bolt}\``,
    `- ${unitLabel}: \`${units.join(",")}\``,
    `- ${recordLabel}: \`${work.intent.recordPath}\``,
    `- ${uuidLabel}: \`${work.intent.uuid}\``,
    "",
  ].join("\n");
}
