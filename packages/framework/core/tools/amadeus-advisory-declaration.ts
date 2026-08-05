// amadeus-advisory-declaration.ts — the declaration-driven advisory supply
// (ADR-6 revision, ruled 2026-08-04). A plugin manifest may declare advisories
// it evaluates itself, so a second hard-coded advisory does not have to be
// carved into the engine for every plugin that needs a checkpoint hold.
//
// The generalization is deliberately two points and no more: this module turns
// a declaration plus one evaluator run into an `Advisory` (supply), and hands
// the declared run-now argv to the choice route (execution). The checkpoint
// itself — where it fires, its directive contract, and the provenance-verified
// release rule — is untouched.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activationAdvisoriesForHost,
  composedPluginNames,
  defaultActivationFs,
  specRootForHost,
  type ActivationFs,
  type Advisory,
  type DeclaredAdvisoryCode,
} from "./amadeus-plugin-activation.ts";

export type AdvisoryDeclaration = {
  readonly code: DeclaredAdvisoryCode;
  readonly checkpoints: readonly string[];
  readonly evaluatorArgv: readonly string[];
  /** The run-now command, or null for an advisory with no executable side. */
  readonly formalCheckArgv: readonly string[] | null;
};

export type AdvisoryDeclarationParse = {
  readonly declarations: readonly AdvisoryDeclaration[];
  readonly invalid: readonly string[];
};

// A declared code is a slug so it can key a latch file and an audit field
// without escaping either (the same shape the activation codes already have).
const DECLARED_CODE_RE = /^[a-z][a-z0-9-]*$/;
const ACTIVATION_CODES: ReadonlySet<string> = new Set(["not-ready", "changed", "never-run"]);

export function isDeclaredAdvisoryCode(code: string): boolean {
  return !ACTIVATION_CODES.has(code) && DECLARED_CODE_RE.test(code);
}

// The one place a plain string becomes a DeclaredAdvisoryCode: after the
// parser's own validation. Everything downstream carries the brand.
function asDeclaredCode(code: string): DeclaredAdvisoryCode {
  return code as DeclaredAdvisoryCode;
}

export function isKnownAdvisoryCode(code: string): boolean {
  return ACTIVATION_CODES.has(code) || DECLARED_CODE_RE.test(code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): readonly string[] | null {
  return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string" && item !== "")
    ? (value as readonly string[])
    : null;
}

function parseOne(entry: unknown, index: number, invalid: string[]): AdvisoryDeclaration | null {
  if (!isRecord(entry)) {
    invalid.push(`advisories[${index}] must be an object`);
    return null;
  }
  const code = entry.code;
  if (typeof code !== "string" || !isDeclaredAdvisoryCode(code)) {
    invalid.push(`advisories[${index}].code must be a slug that is not an activation code`);
    return null;
  }
  const checkpoints = stringArray(entry.checkpoints);
  if (checkpoints === null) {
    invalid.push(`advisories[${index}].checkpoints must name at least one stage`);
    return null;
  }
  // argv arrays only: a declaration never carries a shell string, so nothing
  // the manifest holds can be word-split or expanded (BR-U2-19).
  const evaluatorArgv = isRecord(entry.evaluator) ? stringArray(entry.evaluator.argv) : null;
  if (evaluatorArgv === null) {
    invalid.push(`advisories[${index}].evaluator.argv must be a non-empty string array`);
    return null;
  }
  const formalCheck = entry.formalCheck ?? null;
  if (formalCheck !== null && !isRecord(formalCheck)) {
    invalid.push(`advisories[${index}].formalCheck must be an object or null`);
    return null;
  }
  const formalCheckArgv = formalCheck === null ? null : stringArray(formalCheck.argv);
  if (formalCheck !== null && formalCheckArgv === null) {
    invalid.push(`advisories[${index}].formalCheck.argv must be a non-empty string array`);
    return null;
  }
  return { code: asDeclaredCode(code), checkpoints, evaluatorArgv, formalCheckArgv };
}

/**
 * Parse the `advisories` block of a plugin manifest. A manifest that declares
 * none yields an empty parse with no complaint; a manifest whose declaration is
 * broken yields `invalid` entries, which the caller turns into a hold — a
 * malformed declaration is never read as "this plugin has nothing to say"
 * (BR-U2-18).
 */
export function parseAdvisoryDeclarations(manifestText: string): AdvisoryDeclarationParse {
  let document: unknown;
  try {
    document = JSON.parse(manifestText) as unknown;
  } catch {
    return { declarations: [], invalid: ["plugin manifest is not valid JSON"] };
  }
  if (!isRecord(document)) return { declarations: [], invalid: ["plugin manifest must be a JSON object"] };
  if (document.advisories === undefined) return { declarations: [], invalid: [] };
  if (!Array.isArray(document.advisories)) return { declarations: [], invalid: ["advisories must be a list"] };

  const declarations: AdvisoryDeclaration[] = [];
  const invalid: string[] = [];
  document.advisories.forEach((entry, index) => {
    const parsed = parseOne(entry, index, invalid);
    if (parsed !== null) declarations.push(parsed);
  });
  return { declarations, invalid };
}

/**
 * Substitute the engine's reserved tokens into a declared argv. An argument
 * naming a token the engine does not supply resolves to null rather than being
 * passed through literally, so a stale declaration fails loudly.
 */
export function resolveArgvTokens(
  argv: readonly string[],
  tokens: Readonly<Record<string, string>>,
): string[] | null {
  const resolved: string[] = [];
  for (const argument of argv) {
    const match = /^\{([a-z][a-z0-9-]*)\}$/.exec(argument);
    if (match === null) {
      resolved.push(argument);
      continue;
    }
    // Own-property lookup only: a token like {constructor} must read as
    // unknown, not resolve through the object prototype into a function.
    const name = match[1] as string;
    if (!Object.hasOwn(tokens, name)) return null;
    const value = tokens[name];
    if (value === undefined) return null;
    resolved.push(value);
  }
  return resolved;
}

export type EvaluatorRun = {
  readonly status: number;
  readonly stdout: string;
};

function verdictSummary(run: EvaluatorRun): string | null {
  let document: unknown;
  try {
    document = JSON.parse(run.stdout.trim().split("\n").at(-1) ?? "") as unknown;
  } catch {
    return `evaluator produced no readable verdict (exit ${run.status})`;
  }
  if (!isRecord(document)) return `evaluator produced no readable verdict (exit ${run.status})`;
  const verdict = document.verdict;
  if (isRecord(verdict) && verdict.kind === "no-hold") return null;
  if (isRecord(verdict) && verdict.kind === "hold") {
    const reasons = Array.isArray(verdict.reasons)
      ? verdict.reasons.map((reason) => (isRecord(reason) ? String(reason.kind) : "unknown")).join(", ")
      : "unspecified";
    return `hold (${reasons})`;
  }
  if (isRecord(document.failure)) return `evaluation failed (${String(document.failure.kind)})`;
  return `evaluator produced no readable verdict (exit ${run.status})`;
}

/**
 * Turn one evaluator run into the advisory it implies. The typed verdict on
 * stdout is the authority and the exit code only mirrors it, so anything that
 * is not an explicit `no-hold` raises (BR-U2-20). `specIdentity` digests the
 * summary, which is what makes a changed hold state a new advisory instance
 * rather than a repeat of the resolved one.
 */
export function advisoryFromEvaluatorRun(
  plugin: string,
  declaration: AdvisoryDeclaration,
  stage: string,
  run: EvaluatorRun,
): Advisory | null {
  const summary = verdictSummary(run);
  if (summary === null) return null;
  return {
    plugin,
    code: declaration.code,
    message: `advisory: ${plugin} ${declaration.code} — ${summary}`,
    stage,
    target: `${plugin}:${declaration.code}`,
    specIdentity: createHash("sha256").update(summary).digest("hex"),
  };
}

/** The advisory a broken declaration raises in place of the ones it failed to declare. */
export function invalidDeclarationAdvisory(plugin: string, stage: string, invalid: readonly string[]): Advisory {
  const detail = invalid.join("; ");
  return {
    plugin,
    code: "not-ready",
    message: `advisory: ${plugin} declares advisories that cannot be read (${detail})`,
    stage,
    target: `${plugin}:advisories`,
    specIdentity: createHash("sha256").update(detail).digest("hex"),
    reason: detail,
  };
}

// ---------------------------------------------------------------------------
// Handler layer: manifest lookup and evaluator execution
// ---------------------------------------------------------------------------

export type DeclarationFs = {
  readonly existsSync: (path: string) => boolean;
  readonly readFileSync: (path: string) => string;
};

export const defaultDeclarationFs: DeclarationFs = {
  existsSync,
  readFileSync: (path) => readFileSync(path, "utf-8"),
};

export type RunEvaluator = (argv: readonly string[]) => EvaluatorRun;

/**
 * Where a composed plugin's manifest is read from. The host carries the
 * plugin's tools and stages but not its manifest, so the declaration is read
 * from the plugin source tree next to the project root — the layout this
 * repository composes from.
 */
export function pluginManifestPath(projectRoot: string, plugin: string): string {
  return join(projectRoot, "plugins", plugin, "plugin.json");
}

/**
 * The declared advisories firing at `stage`, for one composed plugin. Reads the
 * manifest, runs each matching evaluator, and maps the verdicts. A plugin with
 * no manifest on disk contributes nothing (zero impact); a plugin whose
 * declaration is broken contributes the hold-side advisory instead.
 */
export function declaredAdvisoriesForPlugin(
  projectRoot: string,
  plugin: string,
  stage: string,
  runEvaluator: RunEvaluator,
  fs: DeclarationFs = defaultDeclarationFs,
): Advisory[] {
  const path = pluginManifestPath(projectRoot, plugin);
  if (!fs.existsSync(path)) return [];
  let text: string;
  try {
    text = fs.readFileSync(path);
  } catch {
    return [invalidDeclarationAdvisory(plugin, stage, ["plugin manifest is unreadable"])];
  }
  const parsed = parseAdvisoryDeclarations(text);
  const raised: Advisory[] = [];
  if (parsed.invalid.length > 0) raised.push(invalidDeclarationAdvisory(plugin, stage, parsed.invalid));
  for (const declaration of parsed.declarations) {
    if (!declaration.checkpoints.includes(stage)) continue;
    const advisory = advisoryFromEvaluatorRun(plugin, declaration, stage, runEvaluator(declaration.evaluatorArgv));
    if (advisory !== null) raised.push(advisory);
  }
  return raised;
}

/**
 * Launch an evaluator as an argv vector with no shell in between, so nothing a
 * manifest holds can be word-split or expanded (BR-U2-19). `env` is passed
 * explicitly because Bun does not fold a mutated process.env into a child.
 *
 * The spawn lives here rather than in amadeus-plugin-activation.ts: that module
 * starts no process by construction (BR-U6-2, the ADR-1 option-A boundary), and
 * a declared evaluator must not smuggle one in through it.
 */
// The evaluator runs synchronously on the checkpoint path (next/report), so a
// hung plugin must not block the CLI forever, and a runaway stdout must not
// grow unbounded. A timeout or truncation surfaces as an unreadable verdict,
// which holds (fail-closed).
const EVALUATOR_TIMEOUT_MS = 60_000;
const EVALUATOR_MAX_BUFFER_BYTES = 8 * 1024 * 1024;

export function spawnEvaluator(projectRoot: string): RunEvaluator {
  return (argv) => {
    const result = spawnSync(argv[0] as string, [...argv.slice(1)], {
      cwd: projectRoot,
      env: process.env,
      encoding: "utf-8",
      timeout: EVALUATOR_TIMEOUT_MS,
      maxBuffer: EVALUATOR_MAX_BUFFER_BYTES,
    });
    return { status: result.status ?? 1, stdout: result.stdout ?? "" };
  };
}

/**
 * Every advisory this host raises at `stage`: the engine's own spec-hash
 * judgment plus the ones composed plugins declare. Generalization point 1 of
 * ADR-6 (revised) — the declaration route is an addition to the hard-coded one,
 * never a replacement (BR-U2-21).
 */
export function advisoriesForHost(
  hostRoot: string,
  stage: string,
  fs: ActivationFs = defaultActivationFs,
  runEvaluator: RunEvaluator = spawnEvaluator(specRootForHost(hostRoot)),
): Advisory[] {
  const projectRoot = specRootForHost(hostRoot);
  const declarationFs: DeclarationFs = {
    existsSync: (path) => fs.existsSync(path),
    readFileSync: (path) => fs.readFileSync(path).toString("utf-8"),
  };
  return [
    ...activationAdvisoriesForHost(hostRoot, stage, fs),
    ...composedPluginNames(hostRoot, fs).flatMap((plugin) =>
      declaredAdvisoriesForPlugin(projectRoot, plugin, stage, runEvaluator, declarationFs)
    ),
  ];
}

/** The declared run-now argv for one (plugin, code), or null when there is none. */
export function declaredFormalCheckArgv(
  projectRoot: string,
  plugin: string,
  code: string,
  fs: DeclarationFs = defaultDeclarationFs,
): readonly string[] | null {
  const path = pluginManifestPath(projectRoot, plugin);
  if (!fs.existsSync(path)) return null;
  try {
    const parsed = parseAdvisoryDeclarations(fs.readFileSync(path));
    return parsed.declarations.find((declaration) => declaration.code === code)?.formalCheckArgv ?? null;
  } catch {
    return null;
  }
}
