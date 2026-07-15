// PostToolUse hook: Sync amadeus-state.md on stage task activation
// Triggered on TaskUpdate — extracts slug from activeForm "[slug]" suffix
// Receives JSON on stdin from Claude Code
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  type ClaudeCodeHookInput,
  hooksHealthDir,
  isClaudeCodeHookInput,
  isoTimestamp,
  recordHookDrop,
  resolveProjectDirFromHook,
  stateFilePath,
  harnessDir,
} from "../tools/amadeus-lib.ts";

// Upper bound on the `amadeus-utility.ts set-status` consultation. set-status is
// the same class of lightweight read-modify engine tool as stop.ts's `next`
// consultation, so a hung invocation would trap the whole TaskUpdate turn by a
// path no block-count guard can see. We reuse stop.ts's ENGINE_TIMEOUT_MS bound
// (10s — generous headroom for a call that normally answers in well under a
// second) rather than mint a new magic number.
const SET_STATUS_TIMEOUT_MS = 10_000;

const projectDir = resolveProjectDirFromHook(import.meta.url);

// Read JSON from stdin. Exit cleanly if stdin is a TTY — no Claude Code JSON
// coming in this scenario (test / direct-run / debug-mode inherited stdin).
if (process.stdin.isTTY) process.exit(0);

const input = await Bun.stdin.text();
let parsed: ClaudeCodeHookInput;
try {
  const raw: unknown = JSON.parse(input);
  if (!isClaudeCodeHookInput(raw)) process.exit(0);
  parsed = raw;
} catch {
  process.exit(0);
}

const status = parsed.tool_input?.status ?? "";

// Only fire when a task transitions to in_progress
if (status !== "in_progress") process.exit(0);

const activeForm: string = parsed.tool_input?.activeForm ?? "";
if (!activeForm) process.exit(0);

// Extract slug from "[slug]" suffix in activeForm
const slugMatch = activeForm.match(/\[([a-z][a-z0-9-]*)\]$/);
if (!slugMatch) process.exit(0);
const slug = slugMatch[1];

// State file must exist (won't exist before handleInit runs)
const stateFile = stateFilePath(projectDir);
if (!existsSync(stateFile)) process.exit(0);

// Health heartbeat
const healthDir = hooksHealthDir(projectDir);
mkdirSync(healthDir, { recursive: true });
writeFileSync(join(healthDir, "sync-statusline.last"), isoTimestamp(), "utf-8");

// Update state file via set-status (call the utility tool directly). The spawn
// MUST be time-bounded (see SET_STATUS_TIMEOUT_MS). On timeout / spawn failure /
// non-zero exit, record the drop for `--doctor` to surface; never block the
// parent TaskUpdate (mirrors amadeus-runtime-compile.ts:122-136).
const toolPath = join(projectDir, harnessDir(), "tools", "amadeus-utility.ts");
try {
  const proc = Bun.spawnSync({
    cmd: ["bun", toolPath, "set-status", "--stage", slug, "--project-dir", projectDir],
    stdout: "ignore",
    stderr: "pipe",
    timeout: SET_STATUS_TIMEOUT_MS,
  });
  if (proc.exitCode !== 0) {
    // exitCode is null on timeout / signal; a number otherwise.
    const detail = proc.exitCode === null ? "timeout or signal" : `exit ${proc.exitCode}`;
    const stderr = proc.stderr?.toString().trim() ?? "";
    recordHookDrop(projectDir, "sync-statusline", `set-status ${detail}: ${stderr}`.trim());
  }
} catch (e) {
  recordHookDrop(projectDir, "sync-statusline", e instanceof Error ? e.message : String(e));
}
