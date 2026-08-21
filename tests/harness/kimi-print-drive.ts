// kimi-print-drive.ts — the Kimi Code print-mode driver (Bolt 6,
// kimi-live-journey, FR-9a / components.md C6).
//
// One reusable module that runs a single prompt through the Kimi Code CLI's
// headless surface (`kimi -p "<prompt>"`) against a tmp project built from the
// SHIPPED dist/kimi tree, and returns stdout/stderr/exit so journeys can
// assert on the engine's real outputs. This is the kimi analogue of the
// codex-exec driver (t-exec-codex-status.serial.test.ts): no tmux, no painted
// screen; the model's final message + the project's on-disk state are the
// observables. The driver is a synchronous spawn primitive (services.md) — it
// adds no inspection machinery of its own (BR-5).
//
// Print-mode facts (kimi CLI reference, `kimi -p`):
//   - non-interactive mode never asks for approval; regular tool calls run
//     under the `auto` permission policy, so no permission flags are passed
//     (`--prompt` conflicts with --yolo/--auto).
//   - assistant text goes to stdout; thinking/tool progress go to stderr.
//     The amadeus skill instructs the conductor to print the named utility's
//     stdout verbatim, so the engine's status/doctor output rides stdout.
//
// SPENDS Kimi credits: every runPrintSession call is a real model session.
// Per CC-1 the only callers are the two t-print-kimi-* journeys, gated by
// AMADEUS_KIMI_PRINT_LIVE=1 — deterministic tiers never spawn kimi.
//
// AUTH LOCATION (verified 2026-07-26 against the developer machine + the
// official env-vars doc): kimi's OAuth credentials live UNDER $KIMI_CODE_HOME
// (~/.kimi-code/credentials/kimi-code.json + oauth/). A tmp KIMI_CODE_HOME is
// therefore unauthenticated, and the shell env carries no API key the CLI
// would read (KIMI_API_KEY in the shell is NOT honored; only the KIMI_MODEL_*
// family is, and no such key is configured here). security-requirements.md
// forbids copying the real OAuth into tmp, so prepareKimiHome() supplies auth
// by SYMLINKING the `credentials` and `oauth` entries from the real home —
// the OAuth bytes never leave the user's home, while config.toml, sessions,
// logs, and hook wiring state stay tmp-local (BR-2 hermeticity).

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  bindKimiScratchHome,
  defaultKimiJourneyModel,
  defaultKimiSourceHome,
  writeKimiScratchConfig,
} from "./live-e2e/kimi.ts";
import { evaluateLiveGate } from "./live-e2e/policy.ts";
import { requireCapability } from "./live-e2e/registry.ts";

const HARNESS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HARNESS_DIR, "..", "..");

/** The shipped kimi harness tree the journeys install into a tmp project. */
export const KIMI_DIST = join(REPO_ROOT, "dist", "kimi");

const TIMEOUT_S = Number.parseInt(process.env.AMADEUS_TEST_TIMEOUT ?? "600", 10);
const DEFAULT_TIMEOUT_MS = (Number.isFinite(TIMEOUT_S) ? TIMEOUT_S : 600) * 1000;

function kimiBin(env: NodeJS.ProcessEnv = process.env): string {
  return env.AMADEUS_KIMI_BIN ?? "kimi";
}

function kimiBinaryPresent(env: NodeJS.ProcessEnv = process.env): boolean {
  const r = spawnSync(kimiBin(env), ["--version"], { encoding: "utf-8" });
  return r.status === 0;
}

const CAPABILITY = requireCapability("kimi-print");

/**
 * The live gate (BR-1), decided by the COMMON kernel policy since #1717 Phase
 * 2: `GITHUB_ACTIONS=true` is a hard deny that outranks the opt-in, and the
 * opt-in itself is the kernel's exact `=== "1"` comparison on the capability's
 * declared key. This driver keeps its own prerequisite probes (binary, shipped
 * tree) but no longer owns a second answer to "may this run at all" — the
 * canonical-code form of the same decision is `KimiPrintAdapter.preflight`.
 */
export function skipReason(env: NodeJS.ProcessEnv = process.env): string | null {
  const gate = evaluateLiveGate(env, CAPABILITY);
  if (gate.kind === "skip") return gate.diagnostic;
  if (!kimiBinaryPresent(env)) {
    return `kimi binary not found (AMADEUS_KIMI_BIN=${kimiBin(env)})`;
  }
  if (!existsSync(KIMI_DIST)) return `distributable missing: ${KIMI_DIST}`;
  return null;
}

/** The structured result of one `kimi -p` run. Journeys assert on `out`. */
export interface PrintResult {
  /** Exit code; -1 when the process never produced one (spawn error/kill). */
  rc: number;
  stdout: string;
  stderr: string;
  /** stdout + "\n" + stderr (the codex-exec idiom) — the assertion surface. */
  out: string;
  /** True when the explicit timeout killed the session. */
  timedOut: boolean;
  /** Spawn-level error message (ENOENT, ETIMEDOUT, ...), when one occurred. */
  error?: string;
}

export interface PrintSessionArgs {
  /** Project directory kimi runs in (the tmp install of dist/kimi). */
  cwd: string;
  /** The single prompt, e.g. "/skill:amadeus --status". */
  prompt: string;
  /** Extra env layered over process.env (KIMI_CODE_HOME=<tmp> for hermeticity). */
  env?: NodeJS.ProcessEnv;
  /** Wall-clock cap; on expiry the session is killed and timedOut is set. */
  timeoutMs?: number;
  /** Binary override; defaults to AMADEUS_KIMI_BIN ?? "kimi". */
  bin?: string;
}

/**
 * Run one `kimi -p "<prompt>"` session and collect stdout/stderr/exit.
 * SPENDS Kimi credits — call only from gated journeys. A non-zero exit or a
 * timeout is reported in the result, never retried and never swallowed: the
 * journey decides (business-logic-model.md §決定木 records both as failures).
 */
export function runPrintSession(args: PrintSessionArgs): Promise<PrintResult> {
  const r = spawnSync(args.bin ?? kimiBin(), ["-p", args.prompt], {
    cwd: args.cwd,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ...(args.env ?? {}) },
    timeout: args.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  });
  const err = r.error as (NodeJS.ErrnoException & { code?: string }) | undefined;
  const result: PrintResult = {
    rc: r.status ?? -1,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
    out: `${r.stdout ?? ""}\n${r.stderr ?? ""}`,
    timedOut: err?.code === "ETIMEDOUT",
  };
  if (err) result.error = err.message;
  return Promise.resolve(result);
}

/**
 * Supply authentication to a tmp KIMI_CODE_HOME WITHOUT copying credentials
 * (security-design.md): the `credentials` and `oauth` entries of the real home
 * are bound into the tmp home by reference. The binding itself now lives in the
 * live-E2E kernel (`live-e2e/kimi.ts`) so this driver and the KimiPrintAdapter
 * cannot drift into two different isolation stories; this wrapper keeps the
 * driver's own signature and best-effort semantics.
 */
export function prepareKimiHome(home: string, realHome?: string): void {
  bindKimiScratchHome(home, realHome ?? defaultKimiSourceHome());
}

/**
 * The managed model id the tmp config seeds; `AMADEUS_KIMI_MODEL` overrides.
 * Re-exported from the kernel module so both the driver and the adapter seed
 * the same model.
 */
export function defaultJourneyModel(env: NodeJS.ProcessEnv = process.env): string {
  return defaultKimiJourneyModel(env);
}

/**
 * Write the tmp home's config.toml: `default_model` plus the MANAGED (OAuth)
 * provider and one `[models."kimi-code/<id>"]` entry. kimi refuses to start a
 * session without these (verified 2026-07-26, kimi 0.28.1: first "No model
 * configured ... set default_model in config.toml", then `Model
 * "kimi-code/k3" is not configured in config.toml`), so a config-less tmp home
 * cannot run a journey at all — the unwired doctor state is therefore "config
 * exists, no managed block" (the doctor's `not found` row), never a missing
 * file. The tables carry NO credential material; the OAuth tokens reach the tmp
 * home only through prepareKimiHome's binding. Call BEFORE any managed-block
 * seeding: the merge module appends the block after this config, exactly as it
 * does into a real user config. The writer itself lives in the kernel module so
 * the adapter's scratch home and this driver's tmp home are byte-identical.
 */
export function writeKimiConfig(home: string, model?: string): void {
  writeKimiScratchConfig(home, model);
}
