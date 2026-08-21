// amadeus-advisory-declaration.ts — the declaration-driven advisory supply
// (ADR-6 revision, ruled 2026-08-04). A plugin manifest may declare advisories
// it evaluates itself, so a second hard-coded advisory does not have to be
// carved into the engine for every plugin that needs a checkpoint hold.
//
// The host only supplies the declaration and invokes its evaluator. A run-now
// choice may open the plugin-declared handoff stage; execution and release
// policy remain owned by the plugin.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { PLUGIN_SOURCE_DIR_NAME } from "./amadeus-plugin.ts";
import { resolvePluginSelection } from "./amadeus-plugin-selection.ts";
import {
  composedPluginNames,
  defaultPluginRuntimeFs,
  projectRootForHost,
  type Advisory,
  type PluginRuntimeFs,
} from "./amadeus-plugin-runtime.ts";

export type AdvisoryDeclaration = {
  readonly code: string;
  readonly checkpoints: readonly string[];
  readonly evaluatorArgv: readonly string[];
  /**
   * The stage a run-now choice opens, or null when the declaration names none.
   * Generalization point 3 of ADR-6 (revised), ruled by D2 of #2766: the engine
   * reads the destination out of the manifest instead of hard-coding it. It is
   * an entry point only — the hold still releases solely on the plugin's own
   * evaluator returning no-hold (BR-U2-05).
   */
  readonly handoffStage: string | null;
};

export type AdvisoryDeclarationParse = {
  readonly declarations: readonly AdvisoryDeclaration[];
  readonly invalid: readonly string[];
};

// A declared code is a slug so it can key a latch file and an audit field
// without escaping either (the same shape the activation codes already have).
const DECLARED_CODE_RE = /^[a-z][a-z0-9-]*$/;
// A handoff destination is a stage slug, the same shape the stage graph keys on,
// so a declaration cannot smuggle a path or an argument into the directive.
const STAGE_SLUG_RE = /^[a-z][a-z0-9-]*$/;

export function isDeclaredAdvisoryCode(code: string): boolean {
  return DECLARED_CODE_RE.test(code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): readonly string[] | null {
  return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string" && item !== "")
    ? (value as readonly string[])
    : null;
}

// Each optional block of a declaration parses on its own: absent is a valid
// "no such side", present-but-broken is an `invalid` entry, and the two must
// never collapse into each other (BR-U2-18).
type ParsedField<T> = { readonly ok: true; readonly value: T } | { readonly ok: false };

function parseHandoff(
  entry: Record<string, unknown>,
  index: number,
  invalid: string[],
): ParsedField<string | null> {
  const handoff = entry.handoff ?? null;
  if (handoff === null) return { ok: true, value: null };
  const named = isRecord(handoff) && typeof handoff.stage === "string" ? handoff.stage : "";
  if (!STAGE_SLUG_RE.test(named)) {
    invalid.push(`advisories[${index}].handoff.stage must be a stage slug`);
    return { ok: false };
  }
  return { ok: true, value: named };
}

function parseOne(entry: unknown, index: number, invalid: string[]): AdvisoryDeclaration | null {
  if (!isRecord(entry)) {
    invalid.push(`advisories[${index}] must be an object`);
    return null;
  }
  const code = entry.code;
  if (typeof code !== "string" || !isDeclaredAdvisoryCode(code)) {
    invalid.push(`advisories[${index}].code must be a slug`);
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
  const handoff = parseHandoff(entry, index, invalid);
  if (!handoff.ok) return null;
  return {
    code,
    checkpoints,
    evaluatorArgv,
    handoffStage: handoff.value,
  };
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

type EvaluatorHold = { readonly summary: string; readonly message?: string };

function evaluatorHold(run: EvaluatorRun): EvaluatorHold | null {
  let document: unknown;
  try {
    document = JSON.parse(run.stdout.trim().split("\n").at(-1) ?? "") as unknown;
  } catch {
    return { summary: `evaluator produced no readable verdict (exit ${run.status})` };
  }
  if (!isRecord(document)) return { summary: `evaluator produced no readable verdict (exit ${run.status})` };
  const verdict = document.verdict;
  if (isRecord(verdict) && verdict.kind === "no-hold") return null;
  if (isRecord(verdict) && verdict.kind === "hold") {
    const reasons = Array.isArray(verdict.reasons)
      ? verdict.reasons.map((reason) => (isRecord(reason) ? String(reason.kind) : "unknown")).join(", ")
      : "unspecified";
    return {
      summary: `hold (${reasons})`,
      ...(typeof verdict.message === "string" && verdict.message.length > 0 ? { message: verdict.message } : {}),
    };
  }
  if (isRecord(document.failure)) return { summary: `evaluation failed (${String(document.failure.kind)})` };
  return { summary: `evaluator produced no readable verdict (exit ${run.status})` };
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
  const hold = evaluatorHold(run);
  if (hold === null) return null;
  return {
    plugin,
    code: declaration.code,
    message: hold.message ?? `advisory: ${plugin} ${declaration.code} — ${hold.summary}`,
    stage,
    target: `${plugin}:${declaration.code}`,
    specIdentity: createHash("sha256").update(hold.summary).digest("hex"),
  };
}

/** The advisory a broken declaration raises in place of the ones it failed to declare. */
export function invalidDeclarationAdvisory(plugin: string, stage: string, invalid: readonly string[]): Advisory {
  const detail = invalid.join("; ");
  return {
    plugin,
    code: "invalid-declaration",
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
 * The authoring-face manifest path: `<projectRoot>/plugins/<name>/plugin.json`.
 * Kept exported for compatibility; manifest lookup goes through
 * `resolvePluginManifest`, which tries this face first and the staging face
 * second.
 */
export function pluginManifestPath(projectRoot: string, plugin: string): string {
  return join(projectRoot, "plugins", plugin, "plugin.json");
}

// A located manifest and the root every relative argv element in it resolves
// against: the manifest's own directory, never the evaluator's cwd.
export type PluginManifestResolution = {
  readonly manifestPath: string;
  readonly pluginRoot: string;
};

// The diagnostic channel for a composed plugin whose manifest is on neither
// face (FR-4): one stderr warning per plugin per call, fail-open preserved —
// no advisories are supplied and the workflow is never stopped. Injectable so
// a test can spy on it.
export type DeclarationWarn = (message: string) => void;

export const defaultDeclarationWarn: DeclarationWarn = (message) => {
  process.stderr.write(`${message}\n`);
};

// The single warning text both the supply path and the declaration-lookup path
// emit, so the two never drift apart in what they report.
export function missingPluginManifestWarning(
  projectRoot: string,
  stagingRoot: string | undefined,
  plugin: string,
): string {
  const faces = [pluginManifestPath(projectRoot, plugin)];
  if (stagingRoot !== undefined) faces.push(join(stagingRoot, plugin, "plugin.json"));
  return `amadeus: composed plugin "${plugin}" has no manifest on any known face (looked: ${faces.join(", ")}); its declared advisories are inactive`;
}

/**
 * Locate a composed plugin's manifest across the two faces a workspace can
 * carry it on: the authoring face `<projectRoot>/plugins/<name>/plugin.json`
 * (the layout this repository composes from, and the one the install verb
 * persists) first, then the staging face `<stagingRoot>/<name>/plugin.json`
 * (`<hostRoot>/.amadeus-plugin-src/<name>/`, the consumer layout, where the
 * bundle's manifest is staged but never delivered into the host). The first
 * face that exists wins. Returns null when neither holds a manifest.
 */
export function resolvePluginManifest(
  projectRoot: string,
  stagingRoot: string | undefined,
  plugin: string,
  fs: DeclarationFs = defaultDeclarationFs,
): PluginManifestResolution | null {
  const candidates = [pluginManifestPath(projectRoot, plugin)];
  if (stagingRoot !== undefined) candidates.push(join(stagingRoot, plugin, "plugin.json"));
  for (const manifestPath of candidates) {
    if (fs.existsSync(manifestPath)) return { manifestPath, pluginRoot: dirname(manifestPath) };
  }
  return null;
}

/**
 * Resolve a declared evaluator argv against the located plugin root (FR-2). A
 * relative path-like element — not absolute, not a `-` flag, and containing a
 * path separator — is relative to the plugin root, so it is joined there
 * before the evaluator runs. Flags and their values carry no "/" and pass
 * through untouched, as do bare command names like `bun`.
 */
export function resolveEvaluatorArgv(argv: readonly string[], pluginRoot: string): string[] {
  return argv.map((element) =>
    !isAbsolute(element) && !element.startsWith("-") && element.includes("/")
      ? join(pluginRoot, element)
      : element
  );
}

/**
 * The declared advisories firing at `stage`, for one composed plugin. Reads the
 * manifest from whichever face holds it (authoring first, then staging), runs
 * each matching evaluator with its argv resolved against the located plugin
 * root, and maps the verdicts. A plugin with no manifest on either face
 * contributes nothing but warns once (fail-open, FR-4); a plugin whose
 * declaration is broken contributes the hold-side advisory instead.
 */
export function declaredAdvisoriesForPlugin(
  projectRoot: string,
  plugin: string,
  stage: string,
  runEvaluator: RunEvaluator,
  fs: DeclarationFs = defaultDeclarationFs,
  stagingRoot?: string,
  warn: DeclarationWarn = defaultDeclarationWarn,
  tokens: Readonly<Record<string, string>> = {},
): Advisory[] {
  const resolved = resolvePluginManifest(projectRoot, stagingRoot, plugin, fs);
  if (resolved === null) {
    // FR-4: fail-open but never silent — the absence of a manifest means the
    // plugin's declared advisories are inactive, and that must be audible.
    warn(missingPluginManifestWarning(projectRoot, stagingRoot, plugin));
    return [];
  }
  let text: string;
  try {
    text = fs.readFileSync(resolved.manifestPath);
  } catch {
    return [invalidDeclarationAdvisory(plugin, stage, ["plugin manifest is unreadable"])];
  }
  const parsed = parseAdvisoryDeclarations(text);
  const raised: Advisory[] = [];
  if (parsed.invalid.length > 0) raised.push(invalidDeclarationAdvisory(plugin, stage, parsed.invalid));
  for (const declaration of parsed.declarations) {
    if (!declaration.checkpoints.includes(stage)) continue;
    const argv = resolveArgvTokens(declaration.evaluatorArgv, tokens);
    if (argv === null) {
      raised.push(invalidDeclarationAdvisory(plugin, stage, [
        `advisories[${declaration.code}].evaluator.argv names an unknown token`,
      ]));
      continue;
    }
    const advisory = advisoryFromEvaluatorRun(
      plugin,
      declaration,
      stage,
      runEvaluator(resolveEvaluatorArgv(argv, resolved.pluginRoot)),
    );
    if (advisory !== null) raised.push(advisory);
  }
  return raised;
}

/**
 * Launch an evaluator as an argv vector with no shell in between, so nothing a
 * manifest holds can be word-split or expanded (BR-U2-19). `env` is passed
 * explicitly because Bun does not fold a mutated process.env into a child.
 *
 * Evaluators are launched only through this generic declaration boundary.
 */
// The evaluator runs synchronously on the checkpoint path (next/report), so a
// hung plugin must not block the CLI forever, and a runaway stdout must not
// grow unbounded. A timeout or truncation surfaces as an unreadable verdict,
// which holds (fail-closed).
const EVALUATOR_TIMEOUT_MS = 60_000;
const EVALUATOR_MAX_BUFFER_BYTES = 8 * 1024 * 1024;

type EvaluatorPathFs = {
  existsSync: (path: string) => boolean;
  realpathSync: (path: string) => string;
};

const defaultEvaluatorPathFs: EvaluatorPathFs = { existsSync, realpathSync };

export function spawnEvaluator(
  projectRoot: string,
  pathFs: EvaluatorPathFs = defaultEvaluatorPathFs,
): RunEvaluator {
  return (argv) => {
    const args = [...argv.slice(1)];
    // resolveEvaluatorArgv already resolves path-like manifest arguments. The
    // first child argument is the evaluator script for runtimes such as Bun;
    // canonicalize that script only, while leaving the resolved command name
    // and evaluator-owned arguments untouched.
    if (args[0] !== undefined && isAbsolute(args[0]) && pathFs.existsSync(args[0])) {
      try {
        args[0] = pathFs.realpathSync(args[0]);
      } catch {
        return { status: 1, stdout: "" };
      }
    }
    const result = spawnSync(argv[0] as string, args, {
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
 * The activation gate on advisory supply (#3414). `composedPluginNames` reads
 * the machine-local composition record — a snapshot of the LAST compose, not a
 * statement about what this project selects today. A plugin dropped from the
 * selection (retired, renamed, deactivated) therefore keeps supplying
 * advisories out of that snapshot until the next compose rewrites it.
 *
 * The gate re-applies compose's OWN selection predicate (amadeus-plugin.ts:
 * `!selection.explicit || selection.plugins.includes(name)`) so the two can
 * never disagree about what is active: an explicit `plugin` key filters by
 * name, an absent one selects everything. An unreadable or malformed selection
 * falls open to the snapshot — never a silent silencing of every advisory.
 */
export function activationSelectionFilter(hostRoot: string): (plugin: string) => boolean {
  const selection = resolvePluginSelection(hostRoot);
  if (selection.kind !== "resolved" || !selection.explicit) return () => true;
  const selected = new Set(selection.plugins);
  return (plugin) => selected.has(plugin);
}

/** Every advisory declared by a plugin composed into this host at `stage`. */
export function advisoriesForHost(
  hostRoot: string,
  stage: string,
  fs: PluginRuntimeFs = defaultPluginRuntimeFs,
  runEvaluator: RunEvaluator = spawnEvaluator(projectRootForHost(hostRoot)),
  warn: DeclarationWarn = defaultDeclarationWarn,
): Advisory[] {
  const projectRoot = projectRootForHost(hostRoot);
  // The staging face lives under the HOST root (the consumer layout); the
  // authoring face lives under the project root (the dogfood/install layout).
  const stagingRoot = join(hostRoot, PLUGIN_SOURCE_DIR_NAME);
  const declarationFs: DeclarationFs = {
    existsSync: (path) => fs.existsSync(path),
    readFileSync: (path) => fs.readFileSync(path).toString("utf-8"),
  };
  return composedPluginNames(hostRoot, fs).filter(activationSelectionFilter(hostRoot)).flatMap((plugin) =>
    declaredAdvisoriesForPlugin(
      projectRoot,
      plugin,
      stage,
      runEvaluator,
      declarationFs,
      stagingRoot,
      warn,
      { "host-root": hostRoot, stage },
    )
  );
}

/** The declaration one (plugin, code) carries, plus the located plugin root, or null when the manifest has none. */
function declarationFor(
  projectRoot: string,
  plugin: string,
  code: string,
  fs: DeclarationFs,
  stagingRoot?: string,
  warn: DeclarationWarn = defaultDeclarationWarn,
): { declaration: AdvisoryDeclaration; pluginRoot: string } | null {
  const resolved = resolvePluginManifest(projectRoot, stagingRoot, plugin, fs);
  if (resolved === null) {
    warn(missingPluginManifestWarning(projectRoot, stagingRoot, plugin));
    return null;
  }
  try {
    const parsed = parseAdvisoryDeclarations(fs.readFileSync(resolved.manifestPath));
    const declaration = parsed.declarations.find((entry) => entry.code === code) ?? null;
    return declaration === null ? null : { declaration, pluginRoot: resolved.pluginRoot };
  } catch {
    return null;
  }
}

/** The stage a declared advisory hands a run-now choice to, or null when it names none. */
export function declaredHandoffStage(
  projectRoot: string,
  plugin: string,
  code: string,
  fs: DeclarationFs = defaultDeclarationFs,
  stagingRoot?: string,
  warn: DeclarationWarn = defaultDeclarationWarn,
): string | null {
  return declarationFor(projectRoot, plugin, code, fs, stagingRoot, warn)?.declaration.handoffStage ?? null;
}
