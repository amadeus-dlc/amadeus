import { createHash } from "node:crypto";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  activeIntent,
  getField,
  parseStateStageSuffixes,
  readIntentRegistry,
  recordDirMatches,
  stateFilePath,
} from "./amadeus-lib.ts";

export const DELIVERY_BOLT_PLAN_SOURCE =
  "inception/delivery-planning/bolt-plan.md" as const;

export interface DeliveryBolt {
  readonly bolt: string;
  readonly units: readonly string[];
}

export interface ApprovedPlanDeliveryBoltProjection {
  readonly authority: "approved-plan";
  readonly source: typeof DELIVERY_BOLT_PLAN_SOURCE;
  readonly sourceDigest: `sha256:${string}`;
  readonly bolts: readonly DeliveryBolt[];
}

export interface EngineSingletonDeliveryBoltProjection {
  readonly authority: "engine-singleton";
  readonly source: "amadeus-state.md";
  readonly sourceDigest: `sha256:${string}`;
  readonly intent: {
    readonly uuid: string;
    readonly slug: string;
    readonly dirName: string;
  };
  readonly scope: "self-document" | "self-fix" | "self-refactor";
  readonly deliveryPlanning: "SKIP";
  readonly unit: string;
  readonly bolts: readonly [DeliveryBolt];
}

export type DeliveryBoltProjection =
  | ApprovedPlanDeliveryBoltProjection
  | EngineSingletonDeliveryBoltProjection;

export type EngineSingletonProjectionResult =
  | { readonly kind: "projection"; readonly projection: EngineSingletonDeliveryBoltProjection }
  | { readonly kind: "absent" };

export type DeliveryBoltPlanResult =
  | { readonly ok: true; readonly bolts: readonly DeliveryBolt[] }
  | { readonly ok: false; readonly message: string };

const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/;
const ENGINE_SINGLETON_SCOPES = new Set(["self-document", "self-fix", "self-refactor"] as const);

function digest(value: string): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

/** The same directory ledger used by the engine's no-DAG per-Unit resolver. */
export function degradeUnitDirectories(
  recordRoot: string,
  stageSlugs: ReadonlySet<string>,
): readonly string[] {
  const root = join(recordRoot, "construction");
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !stageSlugs.has(entry.name))
    .map((entry) => entry.name)
    .sort();
}

/**
 * Resolve the first-class singleton authority used by incremental self scopes.
 * Construction directories are a ledger only; every state and Intent identity
 * fact is bound into the projection digest so later changes make it stale.
 */
export function projectEngineSingletonDeliveryBolt(
  projectDir: string,
  stateContent: string | null,
  stageSlugs: ReadonlySet<string>,
  intent?: string,
  space?: string,
): EngineSingletonProjectionResult {
  if (stateContent === null) return { kind: "absent" };
  const scope = getField(stateContent, "Scope");
  if (scope === null || !ENGINE_SINGLETON_SCOPES.has(scope as never)) return { kind: "absent" };
  const suffixes = parseStateStageSuffixes(stateContent);
  if (
    suffixes.get("delivery-planning") !== "SKIP" ||
    suffixes.get("units-generation") !== "SKIP"
  ) {
    return { kind: "absent" };
  }

  const dirName = activeIntent(projectDir, space, intent);
  if (dirName === null) return { kind: "absent" };
  const matches = readIntentRegistry(projectDir, space).filter((entry) =>
    recordDirMatches(entry, dirName)
  );
  if (matches.length !== 1) return { kind: "absent" };
  const identity = matches[0];
  if (
    identity === undefined ||
    identity.dirName !== dirName ||
    identity.scope !== scope ||
    !SAFE_SEGMENT.test(identity.slug)
  ) {
    return { kind: "absent" };
  }

  const recordRoot = dirname(stateFilePath(projectDir, intent, space));
  if (existsSync(join(recordRoot, DELIVERY_BOLT_PLAN_SOURCE))) return { kind: "absent" };
  const units = degradeUnitDirectories(recordRoot, stageSlugs);
  if (units.length !== 1 || !SAFE_SEGMENT.test(units[0] ?? "")) return { kind: "absent" };
  const unit = units[0] as string;
  const authority = {
    stateDigest: digest(stateContent),
    intent: { uuid: identity.uuid, slug: identity.slug, dirName },
    scope,
    unitsGeneration: "SKIP",
    deliveryPlanning: "SKIP",
    unit,
  };
  return {
    kind: "projection",
    projection: {
      authority: "engine-singleton",
      source: "amadeus-state.md",
      sourceDigest: digest(JSON.stringify(authority)),
      intent: authority.intent,
      scope: scope as EngineSingletonDeliveryBoltProjection["scope"],
      deliveryPlanning: "SKIP",
      unit,
      bolts: [{ bolt: identity.slug, units: [unit] }],
    },
  };
}

function parseDeliveryBoltSection(section: string):
  | { readonly ok: true; readonly bolt: DeliveryBolt }
  | { readonly ok: false; readonly message: string } {
  const bolt = section.match(/^## Bolt\s+([^:\r\n]+)(?::[^\r\n]*)?$/m)?.[1]?.trim() ?? "";
  if (!SAFE_SEGMENT.test(bolt)) {
    return { ok: false, message: "every Delivery Bolt must have a non-empty slug" };
  }
  const unitsLine = section.match(/^- \*\*Units?:\*\*([^\r\n]*)$/m)?.[1] ?? "";
  const units = [...unitsLine.matchAll(/`([^`]+)`/g)].map((match) => match[1] ?? "").sort();
  if (units.length === 0 || units.some((unit) => !SAFE_SEGMENT.test(unit))) {
    return { ok: false, message: `Delivery Bolt ${bolt} must contain at least one valid Unit slug` };
  }
  if (units.some((unit, index) => index > 0 && units[index - 1] === unit)) {
    return { ok: false, message: `Delivery Bolt ${bolt} contains duplicate Units` };
  }
  return { ok: true, bolt: { bolt, units } };
}

/** Parse the approved Delivery Planning artifact into a deterministic projection. */
export function parseDeliveryBoltPlan(body: string): DeliveryBoltPlanResult {
  const sections = body.split(/(?=^## Bolt\s+)/m).filter((section) => /^## Bolt\s+/m.test(section));
  const bolts: DeliveryBolt[] = [];
  const seenBolts = new Set<string>();
  const seenUnits = new Set<string>();

  for (const section of sections) {
    const parsed = parseDeliveryBoltSection(section);
    if (!parsed.ok) return parsed;
    if (seenBolts.has(parsed.bolt.bolt)) {
      return { ok: false, message: `duplicate Delivery Bolt identity: ${parsed.bolt.bolt}` };
    }
    seenBolts.add(parsed.bolt.bolt);
    const repeated = parsed.bolt.units.find((unit) => seenUnits.has(unit));
    if (repeated !== undefined) {
      return { ok: false, message: `Unit ${repeated} belongs to more than one Delivery Bolt` };
    }
    for (const unit of parsed.bolt.units) seenUnits.add(unit);
    bolts.push(parsed.bolt);
  }

  if (bolts.length === 0) {
    return { ok: false, message: "the Delivery Plan contains no Delivery Bolt headings" };
  }
  bolts.sort((left, right) => left.bolt.localeCompare(right.bolt));
  return { ok: true, bolts };
}

export function projectDeliveryBoltPlan(body: string):
  | { readonly ok: true; readonly projection: DeliveryBoltProjection }
  | { readonly ok: false; readonly message: string } {
  const parsed = parseDeliveryBoltPlan(body);
  if (!parsed.ok) return parsed;
  const digest = createHash("sha256").update(body).digest("hex");
  return {
    ok: true,
    projection: {
      authority: "approved-plan",
      source: DELIVERY_BOLT_PLAN_SOURCE,
      sourceDigest: `sha256:${digest}`,
      bolts: parsed.bolts,
    },
  };
}
