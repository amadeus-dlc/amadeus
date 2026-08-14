// git-drift sensor entry — origin moved while you were working, and it moved in
// files you are holding.
//
// The whole verdict lives in git-drift-detect.ts behind ports; this file is the
// argv shim plus the three production ports (git, clock, throttle record). It
// reads no configuration of its own: `--settings-json` is the dispatcher's
// hand-off, and its absence or malformation is a contract breach that fails
// loudly rather than running on a default nobody asked for.
//
// Dispatcher contract: every verdict — including every skip — exits 0. The
// sensor is advisory: it reports what it saw and never gates a stage. The only
// non-zero exits are argv contract breaches, which are authoring errors.
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  type ClockPort,
  detectDrift,
  FETCH_TIMEOUT_MS,
  type GitDriftSettings,
  type GitPort,
  renderDriftResult,
  type SensorResult,
  type ThrottleStore,
} from "./git-drift-detect.ts";

// Machine-local and workspace-scoped: the last fetch is a fact about this
// checkout's git state, not about whichever intent happens to be active, so
// switching intents must not silently reopen the fetch window.
export const THROTTLE_REL_PATH = join("amadeus", ".amadeus-sessions", "git-drift-fetch.json");

/** argv, never a shell: a branch name is remote-controlled text. */
export function nodeGitPort(): GitPort {
  return {
    run(args, cwd, timeoutMs) {
      const res = spawnSync("git", [...args], {
        cwd,
        encoding: "utf-8",
        ...(timeoutMs === undefined ? {} : { timeout: timeoutMs }),
      });
      return {
        ok: res.status === 0,
        stdout: res.stdout ?? "",
        stderr: res.stderr ?? (res.error === undefined ? "" : String(res.error.message)),
      };
    },
  };
}

export const systemClock: ClockPort = { nowMs: () => Date.now() };

/** A record that is absent, unreadable or malformed reads as "never fetched" —
 *  the throttle is an optimisation, and a broken one must not stop the sensor
 *  from looking. Failing to write is equally non-fatal: the next fire refetches. */
export function fileThrottleStore(repoRoot: string): ThrottleStore {
  const path = join(repoRoot, THROTTLE_REL_PATH);
  return {
    read() {
      try {
        const parsed: unknown = JSON.parse(readFileSync(path, "utf-8"));
        const value = (parsed as { lastFetchEpochMs?: unknown }).lastFetchEpochMs;
        return typeof value === "number" && Number.isFinite(value) ? value : null;
      } catch {
        return null;
      }
    },
    write(epochMs) {
      try {
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, `${JSON.stringify({ lastFetchEpochMs: epochMs })}\n`);
      } catch {
        // Machine-local cache only; an unwritable path costs a refetch, nothing more.
      }
    },
  };
}

export function fail(message: string): never {
  process.stderr.write(`amadeus-sensor-git-drift: ${message}\n`);
  process.exit(1);
}

interface Flags {
  stage?: string;
  outputPath?: string;
  settingsJson?: string;
}

function parseFlags(argv: readonly string[]): Flags {
  const out: Flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const name = argv[i];
    if (name !== "--stage" && name !== "--output-path" && name !== "--settings-json") continue;
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) fail(`${name} requires a value`);
    i += 1;
    if (name === "--stage") out.stage = value;
    else if (name === "--output-path") out.outputPath = value;
    else out.settingsJson = value;
  }
  return out;
}

/** Parse the hand-off into the settings type at the boundary. The dispatcher
 *  has already folded the declaration with the operator's overrides, so a value
 *  that does not arrive as declared means the contract broke upstream. */
export function parseSettings(raw: string): GitDriftSettings {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fail("--settings-json is not valid JSON");
  }
  const value = (parsed as { "fetch-throttle-seconds"?: unknown })?.["fetch-throttle-seconds"];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return fail('--settings-json lacks a non-negative numeric "fetch-throttle-seconds"');
  }
  return { "fetch-throttle-seconds": value };
}

/** In-process seam: the verdict for a checkout, with the production ports. */
export function evaluateGitDrift(repoRoot: string, settings: GitDriftSettings): SensorResult {
  return renderDriftResult(
    detectDrift({
      repoRoot,
      settings,
      git: nodeGitPort(),
      clock: systemClock,
      throttle: fileThrottleStore(repoRoot),
    }),
  );
}

export function main(argv: readonly string[] = process.argv.slice(2)): void {
  const flags = parseFlags(argv);
  if (flags.stage === undefined) fail("--stage is required");
  if (flags.outputPath === undefined) fail("--output-path is required");
  if (flags.settingsJson === undefined) fail("--settings-json is required");
  const result = evaluateGitDrift(process.cwd(), parseSettings(flags.settingsJson));
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exit(0);
}

// Guarded so the exported seams can be driven in-process without running main.
if (import.meta.main) main();

export { FETCH_TIMEOUT_MS };
