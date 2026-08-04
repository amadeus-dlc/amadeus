// covers: hook:amadeus-stop
//
// Behavioural contract for the Stop hook `amadeus-stop.ts` — the framework's
// FIRST flow-altering hook. Migrated from tests/integration/t121-stop-hook-enforce.sh
// (originally TAP plan 13; now 16 named tests — the original 13 .sh assertions
// plus the three (e) human-wait carve-out cases added with that feature).
// Mechanism: cli. The hook's entire contract lives on the
// PROCESS boundary — it reads Claude Code JSON off stdin, resolves the project
// via CLAUDE_PROJECT_DIR, spawns a sub-engine (`amadeus-orchestrate.ts next`)
// via Bun.spawnSync, and answers by writing {"decision":"block",...} to stdout
// (or nothing) and exiting 0. There is no exported function to call in-process;
// the seam is the spawn, stdin, env, stdout, exit code, and the on-disk guard
// file. So like the .sh we spawn the REAL hook with a MOCK engine placed at
// <proj>/.claude/tools/amadeus-orchestrate.ts whose emitted directive `kind` is
// driven by MOCK_KIND. This isolates the hook's block/done/guard logic from
// engine correctness (the engine has its own corpus in t114/t118).
//
// Source under test (dist/claude/.claude/hooks/amadeus-stop.ts):
//   :97  allowStop()       — emit nothing, exit 0 (the precedent non-blocking pattern)
//   :104 blockStop(reason) — console.log({decision:"block",reason}); exit 0
//   decideBlock(state, stopHookActive, sessionId) — reserves one delivery from
//          the audit-backed stage-instance budget. The cap-th delivery is
//          permitted; cap+1 releases durably. Audit noise and hook restarts do
//          not reset the budget.
//   :259 runEngineNextKind() — spawns the engine; null (spawn fail / non-zero /
//          unparseable) fails OPEN (allow)
//   :298 continuationReason(kind, stage) — names "pending step", the kind, the
//          forwarding-loop steps; phrased as continuation, never override-shaped
//   :314 isTTY → allowStop; :321 no amadeus-state.md → allowStop; :356 done →
//          allowStop; garbage stdin → stopHookActive=false (no crash)
//   blockCap() :122 (CLAUDE_CODE_STOP_HOOK_BLOCK_CAP overrides); the default is
//          now RUN-MODE aware (defaultBlockCap :131): 8 for autonomous
//          Construction (AUTONOMOUS_BLOCK_CAP), 2 otherwise (INTERACTIVE_BLOCK_CAP)
//   isConversationalStop() :599 / transcriptIsConversational() :490 /
//          isEngineToolCall() (amadeus-lib.ts, #758): the tier-3 conversational carve-out reads
//          the harness transcript (Claude / Codex) and ALLOWS when the most
//          recent human prompt was answered with NO workflow-engine call
//
// Old TAP -> new test parity (13 .sh assertions -> 13 named tests, several
// STRONGER — exact-shape JSON parse, no override-verbs scan, cap-th delivery,
// cap+1 release, and stage-pivot reset):
//   .sh (a) assert RC=0 on pending           -> "(a) exits 0 on a pending directive"
//   .sh (a) decision:block in stdout         -> "(a) pending run-stage directive emits decision:block"
//   .sh (a) reason names pending work + kind  -> "(a) reason names the pending run-stage work as on-task continuation"
//   .sh (a) reason re-feeds loop, no override -> "(a) reason is a sanctioned continuation (re-feeds the loop, no override verbs)"
//   .sh (b) assert RC=0 on done               -> "(b) done directive exits 0"
//   .sh (b) done => empty stdout              -> "(b) done directive emits nothing (stop allowed)"
//   .sh (c1) RC=0 at ceiling                  -> "(c1) recursion guard at ceiling exits 0"
//   .sh (c1) legacy counter at cap             -> "(c1) legacy no-progress state cannot bypass the durable budget"
//   .sh (c2) cap-th/cap+1 boundary             -> "(c2) durable budget permits cap-th and releases cap+1"
//   .sh (c3) stage pivot creates new subject   -> "(c3) progress (stage pivot) starts a fresh durable stage budget"
//   .sh (d) RC=0 with no state file           -> "(d) no amadeus-state.md exits 0"
//   .sh (d) no-op outside AIDLC => empty       -> "(d) no active workflow emits nothing (non-AIDLC session never blocked)"
//   .sh robustness (3 fail-open sub-cases)    -> "garbage stdin + unparseable engine output fail OPEN"
//
// NEW (no .sh predecessor) — the tier-1 human-wait carve-out. The hook reads
// the current stage's checkbox state (exported parseCheckboxes, amadeus-lib.ts
// :587) and ALLOWS the stop when it is positively [?]/[R], so an interactive
// gate / Request-Changes pause no longer spams the forwarding-loop nudge:
//   (e) [?] awaiting-approval -> ALLOW (run-stage pending, but human-wait)
//   (e) [R] revising          -> ALLOW (Request-Changes loop, human-wait)
//   (e) [-] in-progress       -> BLOCK (positive-only; not widened into [-])
//
// NEW (the tier-3 conversational carve-out + the run-mode-aware default cap,
// issue #365 broader reading). The hook reads the harness transcript
// (Claude / Codex) and ALLOWS when the human's last prompt was answered with NO
// workflow-engine call; the default block cap is 2 interactive / 8 autonomous:
//   (f) Claude chat transcript (TEXT-only answer)        -> ALLOW (conversational)
//   (f) Claude transcript + amadeus-orchestrate Bash call  -> BLOCK (engine engaged)
//   (f) Codex rollout chat transcript                    -> ALLOW (codex reader)
//   (f) Codex rollout + function_call amadeus-orchestrate  -> BLOCK
//   (f) chat transcript under autonomous Construction    -> BLOCK (carve-out off)
//   (f) autonomous cap is 8 (count 2 + stop_hook_active) -> BLOCK (not interactive 2)
//   (f) transcript_path -> nonexistent file              -> BLOCK (fail-closed, count 1)
//   (g) interactive default cap 2: blocks 1-2, RELEASES cap+1
//   (g) autonomous default cap 8: blocks 1-8, RELEASES cap+1
//
// §6-E note: this is a non-golden twin (a flow-altering hook whose block event
// must ACTUALLY FIRE). Cases (a)/(c2) drive the BLOCK path to real
// {"decision":"block"} stdout; the guard/release/fail-open cases prove the hook
// lets go — a happy-path-only twin would not be equal-or-stronger.

import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_RECORD_DIR,
  DEFAULT_SPACE,
  intentsDirOf,
  seededAuditDir,
  seededRecordDir,
  seededStateFile,
} from "../harness/fixtures.ts";
import { projectSnapshot } from "../helpers/upstream-v2-fixture.ts";
import { MACHINE_INJECTED_TURN_MARKERS } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { emitAuditEventGuarded } from "../../dist/claude/.claude/otel/audit-emit.ts";
import {
  isConversationalStop,
  isHumanWaitStop,
  isPendingQuestionStop,
  runEngineNextKind,
  transcriptIsConversational,
} from "../../packages/framework/core/hooks/amadeus-stop.ts";

// Live-observed machine-injected turns, derived from the shared catalog so a
// marker rename cannot leave stale copies here (#755). The tier-3 carve-out
// must NOT count any catalog form as the human talking.
const MACHINE_INJECTED_TURNS: ReadonlyArray<readonly [string, string]> = [
  ["task-notification", `${MACHINE_INJECTED_TURN_MARKERS[0]}\ntask-id: abc123\n...`],
  [
    "teammate-message tag",
    `${MACHINE_INJECTED_TURN_MARKERS[1]} from="researcher">start on task #1</teammate-message>`,
  ],
  [
    "teammate-message preamble",
    `${MACHINE_INJECTED_TURN_MARKERS[2]}\n${MACHINE_INJECTED_TURN_MARKERS[1]} from="researcher">start on task #1</teammate-message>`,
  ],
  [
    "system-notification preamble",
    `${MACHINE_INJECTED_TURN_MARKERS[3]}\nAn event fired.\n${MACHINE_INJECTED_TURN_MARKERS[0]}event: build-done</task-notification>`,
  ],
];
const TEAMMATE_INJECTED_TURN = MACHINE_INJECTED_TURNS[2][1];

const BUN = process.execPath; // the bun running this test (mirrors t104)
const REPO_ROOT = join(import.meta.dir, "..", "..");
const HOOK_TS = join(
  REPO_ROOT,
  "dist",
  "claude",
  ".claude",
  "hooks",
  "amadeus-stop.ts",
);
const RUNTIME_COMPILE_HOOK_TS = join(
  REPO_ROOT,
  "dist",
  "claude",
  ".claude",
  "hooks",
  "amadeus-runtime-compile.ts",
);

// P9 per-intent layout: the stop hook reads state (stateFilePath), the audit
// (auditFilePath — its own resolved shard, for the progress-signature length),
// the guard counter (stopHookDir → <record>/.amadeus-stop-hook/block-count.json),
// and the current stage's memory/questions dir (<record>/<phase>/<slug>/). All
// re-root under the active intent's record. We PIN the clone-id so the hook
// (subprocess) and progressSig (in-process) resolve the SAME audit shard.
const PINNED_CLONE_ID = "testcloneid121";
function pinnedShardName(): string {
  const host =
    hostname()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "host";
  return `${host}-${PINNED_CLONE_ID}.jsonl`;
}
function pinnedShardPath(proj: string): string {
  return join(seededAuditDir(proj), pinnedShardName());
}
/** Seed the per-intent workspace shell + pin the clone-id (mirrors fixtures.ts
 *  seedWorkspaceShell). */
function seedShell(proj: string): void {
  const intentsDir = intentsDirOf(proj, DEFAULT_SPACE);
  mkdirSync(join(proj, "amadeus", "spaces", DEFAULT_SPACE, "memory"), { recursive: true });
  mkdirSync(seededRecordDir(proj), { recursive: true });
  writeFileSync(join(proj, "amadeus", "active-space"), `${DEFAULT_SPACE}\n`, "utf-8");
  writeFileSync(join(intentsDir, "active-intent"), `${DEFAULT_RECORD_DIR}\n`, "utf-8");
  writeFileSync(
    join(intentsDir, "intents.json"),
    `${JSON.stringify(
      [{ uuid: "00000000-0000-7000-8000-000000000001", slug: DEFAULT_RECORD_DIR.replace(/-[0-9a-f]+$/, ""), status: "in-flight" }],
      null,
      2,
    )}\n`,
    "utf-8",
  );
  writeFileSync(join(proj, "amadeus", ".amadeus-clone-id"), `${PINNED_CLONE_ID}\n`, "utf-8");
}

// Legacy stop-hook guard path used only to prove old transient state is ignored.
function guardFilePath(proj: string): string {
  return join(seededRecordDir(proj), ".amadeus-stop-hook", "block-count.json");
}

const tempDirs: string[] = [];

afterAll(() => {
  for (const d of tempDirs) rmSync(d, { recursive: true, force: true });
});

// The MOCK engine, byte-for-byte the .sh's heredoc: emit one directive of
// kind=$MOCK_KIND. `done` carries the terminal shape; `__nonzero__` simulates
// an engine that fails to answer (non-zero exit, no directive). The hook
// spawns this via join(projectDir, ".claude/tools/amadeus-orchestrate.ts").
const MOCK_ENGINE = `// t121 mock engine: emit one directive of kind=$MOCK_KIND.
const kind = process.env.MOCK_KIND ?? "run-stage";
if (kind === "done") {
  console.log(JSON.stringify({ kind: "done", reason: "Workflow complete." }));
} else if (kind === "parked") {
  console.log(JSON.stringify({ kind: "parked", reason: "Workflow parked at \\"requirements-analysis\\".", stage: "requirements-analysis" }));
} else if (kind === "__nonzero__") {
  process.stderr.write("mock engine failure\\n");
  process.exit(1);
} else {
  console.log(JSON.stringify({ kind, stage: "requirements-analysis" }));
}
process.exit(0);
`;

/** A self-contained project with a MOCK engine + the per-intent shell (so the
 *  stop hook's state/audit/guard/memory paths resolve under the record). Mirrors
 *  make_project (.sh). */
function makeProject(): string {
  const proj = mkdtempSync(join(tmpdir(), "amadeus-t121-"));
  tempDirs.push(proj);
  mkdirSync(join(proj, ".claude", "tools"), { recursive: true });
  writeFileSync(
    join(proj, ".claude", "tools", "amadeus-orchestrate.ts"),
    MOCK_ENGINE,
    "utf-8",
  );
  seedShell(proj);
  return proj;
}

/** One JSONL audit record — the shard format the stop hook line-counts for its
 *  progress signature. */
function auditRow(seq: number): string {
  return JSON.stringify({
    schemaVersion: 1,
    seq,
    cloneId: PINNED_CLONE_ID,
    intentId: DEFAULT_RECORD_DIR,
    timestamp: `2026-01-01T00:00:0${seq}.000Z`,
    heading: "Stage Started",
    event: "STAGE_STARTED",
    fields: { "Stage slug": "requirements-analysis" },
  });
}

/** Write the audit fixture into the pinned per-clone shard (the stop hook reads
 *  auditFilePath(projectDir) — that exact shard — for the progress signature). */
function seedAuditShard(proj: string, body = `${auditRow(1)}\n`): void {
  mkdirSync(seededAuditDir(proj), { recursive: true });
  writeFileSync(pinnedShardPath(proj), body, "utf-8");
}

/** Seed an active mid-stage workflow so the hook reaches the engine call. */
function seedActive(proj: string, slug = "requirements-analysis"): void {
  writeFileSync(
    seededStateFile(proj),
    `- **Workflow**: feature\n- **Scope**: feature\n- **Current Stage**: ${slug}\n`,
    "utf-8",
  );
  seedAuditShard(proj);
}

/**
 * Seed an active workflow whose Current Stage ALSO carries a checkbox row in a
 * given state — the shape the tier-1 human-wait carve-out reads. `marker` is the
 * raw checkbox glyph ("?" awaiting-approval, "R" revising, "-" in-progress); the
 * row matches parseCheckboxes' `^- \[([ xSR?-])\] (\S+)\s*—\s*(.*)$` grammar
 * (amadeus-lib.ts:589 — note the em-dash). seedActive's stateless shape (no rows)
 * remains the default the 13 legacy assertions use, which is exactly why they
 * stay green: parseCheckboxes returns [] and the carve-out cannot trigger.
 */
function seedActiveWithCheckbox(
  proj: string,
  marker: string,
  slug = "requirements-analysis",
): void {
  writeFileSync(
    seededStateFile(proj),
    `- **Workflow**: feature\n- **Scope**: feature\n- **Current Stage**: ${slug}\n` +
      `\n## Stage Progress\n- [${marker}] ${slug} — EXECUTE\n`,
    "utf-8",
  );
  seedAuditShard(proj);
}

/**
 * Seed an active workflow at [-] in-progress for the tier-2 pending-question
 * carve-out. Writes Lifecycle Phase (so the hook can derive the stage dir
 * `amadeus-docs/<phase-lowercase>/<slug>/`, mirroring memoryPathFor in
 * amadeus-orchestrate.ts:353) and a `[-]` checkbox row. Options:
 *   - `questions`: if given, writes `<slug>-questions.md` in the stage dir with
 *     this body (a blank `[Answer]:` tag = a pending question; an answered one
 *     = resolved). Omit to seed NO questions file.
 *   - `autonomy`: if given, writes `- **Construction Autonomy Mode**: <value>`
 *     into state — `"autonomous"` must suppress the carve-out (loop stays alive).
 * `phase` defaults to inception (requirements-analysis' real phase).
 */
function seedInProgressWithQuestions(
  proj: string,
  opts: { slug?: string; phase?: string; questions?: string; autonomy?: string; intentMode?: string } = {},
): void {
  const slug = opts.slug ?? "requirements-analysis";
  const phase = opts.phase ?? "inception";
  const autonomyLine = opts.autonomy
    ? `- **Construction Autonomy Mode**: ${opts.autonomy}\n`
    : "";
  const intentMode = opts.intentMode ?? (opts.autonomy === "autonomous" ? "full" : undefined);
  const intentModeLine = intentMode ? `- **Intent Autonomy Mode**: ${intentMode}\n` : "";
  writeFileSync(
    seededStateFile(proj),
    `- **Workflow**: feature\n- **Scope**: feature\n- **Lifecycle Phase**: ${phase.toUpperCase()}\n` +
      `- **Current Stage**: ${slug}\n${intentModeLine}${autonomyLine}` +
      `\n## Stage Progress\n- [-] ${slug} — EXECUTE\n`,
    "utf-8",
  );
  seedAuditShard(proj);
  if (opts.questions !== undefined) {
    // The stage's questions/memory dir re-roots under the record (<record>/<phase>/<slug>/).
    const stageDir = join(seededRecordDir(proj), phase.toLowerCase(), slug);
    mkdirSync(stageDir, { recursive: true });
    writeFileSync(join(stageDir, `${slug}-questions.md`), opts.questions, "utf-8");
  }
}

/**
 * Write a harness transcript file under the project for the tier-3
 * conversational carve-out, and return its absolute path. The hook reads it off
 * the Stop payload's `transcript_path` and classifies the ending turn
 * (transcriptIsConversational, amadeus-stop.ts:490). Two formats:
 *   - "claude": message-shaped JSONL. A genuine human prompt is
 *     `{type:"user",message:{role:"user",content:"..."}}` (string or a [{type:"text"}]
 *     array; a [{type:"tool_result"}] array is NOT a human prompt). An assistant
 *     turn is `{type:"assistant",message:{role:"assistant",content:[...]}}`; an
 *     engine call is a `tool_use` Bash running amadeus-orchestrate/amadeus-state.
 *   - "codex": rollout JSONL, `{type:"response_item",payload:{...}}`. A human
 *     prompt is `payload:{type:"message",role:"user",content:[{type:"input_text"}]}`;
 *     an engine call is `payload:{type:"function_call",name:"Bash",arguments:"<json>"}`.
 * The file basename matters for codex: the hook picks the codex reader ONLY when
 * the path ends in `rollout-*.jsonl` (amadeus-stop.ts:721), so the codex variant is
 * written as `rollout-<stamp>.jsonl` and the claude variant as `transcript.jsonl`.
 *
 * `engineCall`: when false the assistant answers the human with TEXT only (a
 * conversational turn -> ALLOW); when true the assistant runs an
 * amadeus-orchestrate Bash call after the human prompt (engine engaged -> BLOCK).
 */
function seedTranscript(
  proj: string,
  opts: { format: "claude" | "codex"; engineCall: boolean },
): string {
  let body: string;
  let name: string;
  if (opts.format === "claude") {
    name = "transcript.jsonl";
    const human = JSON.stringify({
      type: "user",
      message: { role: "user", content: "What does this stage actually do?" },
    });
    const assistant = opts.engineCall
      ? JSON.stringify({
          type: "assistant",
          message: {
            role: "assistant",
            content: [
              {
                type: "tool_use",
                name: "Bash",
                input: { command: "bun .claude/tools/amadeus-orchestrate.ts next" },
              },
            ],
          },
        })
      : JSON.stringify({
          type: "assistant",
          message: {
            role: "assistant",
            content: [{ type: "text", text: "It analyses the requirements." }],
          },
        });
    body = `${human}\n${assistant}\n`;
  } else {
    // Codex rollout: the basename MUST end in rollout-*.jsonl for the hook to
    // select the codex reader.
    name = "rollout-2026-06-26T00-00-00.jsonl";
    const human = JSON.stringify({
      type: "response_item",
      payload: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "Explain what this stage does." }],
      },
    });
    const assistant = opts.engineCall
      ? JSON.stringify({
          type: "response_item",
          payload: {
            type: "function_call",
            name: "Bash",
            arguments: JSON.stringify({
              command: "bun .codex/tools/amadeus-orchestrate.ts next",
            }),
          },
        })
      : JSON.stringify({
          type: "response_item",
          payload: {
            type: "message",
            role: "assistant",
            content: [{ type: "output_text", text: "It analyses the requirements." }],
          },
        });
    body = `${human}\n${assistant}\n`;
  }
  const path = join(proj, name);
  writeFileSync(path, body, "utf-8");
  return path;
}

/**
 * A flexible transcript builder for the (h) classifier-refinement cases. Where
 * seedTranscript above writes a fixed 2-entry shape, this one takes an ORDERED
 * list of high-level entries and emits the matching JSONL line per harness, so a
 * single test can model multi-turn transcripts (a human prompt, the hook's own
 * isMeta re-prompt, an engine call with a specific command, plain text, ...).
 *
 * Entry kinds (the hook's transcriptIsConversational classifies them via
 * isEngineToolCall, hosted in amadeus-lib.ts since #758):
 *   - {kind:"human", text}        a genuine human prompt (the anchor the hook
 *                                 answers; string content).
 *   - {kind:"text"}               an assistant TEXT-only turn (no engine call).
 *   - {kind:"bash", command}      an assistant turn that runs a Bash tool with
 *                                 `command`; the hook routes the command string
 *                                 through isEngineToolCall (read-only `--status`
 *                                 / `amadeus-utility` are NOT engagement; a bare
 *                                 `next` / `report` / `amadeus-state approve` ARE).
 *   - {kind:"meta", text}         a `type:"user"` entry with `isMeta:true`
 *                                 (Claude only): the Stop hook's own injected
 *                                 continuation, which the classifier must SKIP
 *                                 so it does not reset the human-prompt anchor.
 *   - {kind:"userText", text}     a `type:"user"` entry WITHOUT isMeta (Claude)
 *                                 / a plain user message (Codex). Used to model
 *                                 the hook-feedback turn excluded purely by its
 *                                 "Stop hook feedback:" content prefix.
 *
 * Mirrors seedTranscript's file-naming contract: the codex variant is written as
 * `rollout-*.jsonl` (so the hook picks the codex reader, amadeus-stop.ts:792); the
 * claude variant as `transcript.jsonl`.
 */
type TranscriptEntry =
  | { kind: "human"; text: string }
  | { kind: "text" }
  | { kind: "bash"; command: string }
  | { kind: "meta"; text: string }
  | { kind: "userText"; text: string };

function seedTranscriptEntries(
  proj: string,
  format: "claude" | "codex",
  entries: TranscriptEntry[],
): string {
  const lines: string[] = [];
  for (const e of entries) {
    if (format === "claude") {
      switch (e.kind) {
        case "human":
          lines.push(
            JSON.stringify({ type: "user", message: { role: "user", content: e.text } }),
          );
          break;
        case "userText":
          // A type:"user" entry with NO isMeta, excluded only if its content
          // starts with "Stop hook feedback:" (the content guard).
          lines.push(
            JSON.stringify({ type: "user", message: { role: "user", content: e.text } }),
          );
          break;
        case "meta":
          // The Stop hook's own re-prompt: isMeta:true AND the content prefix.
          lines.push(
            JSON.stringify({
              type: "user",
              isMeta: true,
              message: { role: "user", content: e.text },
            }),
          );
          break;
        case "text":
          lines.push(
            JSON.stringify({
              type: "assistant",
              message: {
                role: "assistant",
                content: [{ type: "text", text: "Sure, here is the answer."}],
              },
            }),
          );
          break;
        case "bash":
          lines.push(
            JSON.stringify({
              type: "assistant",
              message: {
                role: "assistant",
                content: [{ type: "tool_use", name: "Bash", input: { command: e.command } }],
              },
            }),
          );
          break;
      }
    } else {
      switch (e.kind) {
        case "human":
        case "userText":
          lines.push(
            JSON.stringify({
              type: "response_item",
              payload: {
                type: "message",
                role: "user",
                content: [{ type: "input_text", text: e.text }],
              },
            }),
          );
          break;
        case "meta":
          // Codex has no isMeta flag; the hook excludes the hook-feedback turn by
          // its content prefix only, so a "meta" entry on codex is a plain user
          // message whose text carries the "Stop hook feedback:" prefix.
          lines.push(
            JSON.stringify({
              type: "response_item",
              payload: {
                type: "message",
                role: "user",
                content: [{ type: "input_text", text: e.text }],
              },
            }),
          );
          break;
        case "text":
          lines.push(
            JSON.stringify({
              type: "response_item",
              payload: {
                type: "message",
                role: "assistant",
                content: [{ type: "output_text", text: "Sure, here is the answer."}],
              },
            }),
          );
          break;
        case "bash":
          lines.push(
            JSON.stringify({
              type: "response_item",
              payload: {
                type: "function_call",
                name: "Bash",
                arguments: JSON.stringify({ command: e.command }),
              },
            }),
          );
          break;
      }
    }
  }
  const name = format === "codex" ? "rollout-2026-06-26T00-00-00.jsonl" : "transcript.jsonl";
  const path = join(proj, name);
  writeFileSync(path, `${lines.join("\n")}\n`, "utf-8");
  return path;
}

interface HookResult {
  rc: number;
  out: string; // stdout only (the .sh discarded stderr with 2>/dev/null)
}

/**
 * Run the real hook. Mirrors run_hook (.sh): pipe `payload` on stdin with
 * CLAUDE_PROJECT_DIR / MOCK_KIND / CLAUDE_CODE_STOP_HOOK_BLOCK_CAP set, capture
 * stdout, return exit code. `cap` empty-string => env var unset (default cap).
 */
function runHook(
  proj: string,
  payload: string,
  kind = "run-stage",
  cap = "",
): HookResult {
  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    CLAUDE_PROJECT_DIR: proj,
    MOCK_KIND: kind,
  };
  // The .sh always exported CLAUDE_CODE_STOP_HOOK_BLOCK_CAP (possibly empty).
  // An empty value is falsy in blockCap() (:69 `if (!raw)`), so it behaves
  // exactly like unset — the default cap of 8. Pass it through for parity.
  env.CLAUDE_CODE_STOP_HOOK_BLOCK_CAP = cap;
  // The hook reads stdin + env only; it ignores argv (mirrors the .sh's bare
  // `bun "$HOOK_TS"`).
  const res = spawnSync(BUN, [HOOK_TS], {
    input: payload,
    encoding: "utf-8",
    env,
    timeout: 20_000,
  });
  return { rc: res.status ?? -1, out: (res.stdout ?? "").trim() };
}

function runRuntimeCompileHook(
  proj: string,
  command: string,
  sessionId?: string,
): HookResult {
  const res = spawnSync(BUN, [RUNTIME_COMPILE_HOOK_TS], {
    input: JSON.stringify({
      hook_event_name: "PostToolUse",
      ...(sessionId ? { session_id: sessionId } : {}),
      tool_name: "Bash",
      tool_input: { command },
    }),
    encoding: "utf-8",
    env: { ...process.env, CLAUDE_PROJECT_DIR: proj },
    timeout: 20_000,
  });
  return { rc: res.status ?? -1, out: (res.stdout ?? "").trim() };
}

/**
 * The retired hook progress signature, retained only to seed a realistic
 * legacy counter and prove that canonical budgeting ignores it.
 */
function progressSig(proj: string): string {
  const s = readFileSync(seededStateFile(proj), "utf-8");
  const m = s.match(/Current Stage\*{0,2}:?\s*`?([^\n`]*)`?/);
  const stage = (m?.[1] ?? "").trim();
  let al = 0;
  try {
    // The hook reads its own resolved shard (auditFilePath); with the pinned
    // clone-id that is exactly the pinned shard, so read the same one.
    al = readFileSync(pinnedShardPath(proj), "utf-8").split("\n").length;
  } catch {
    /* audit absent => 0 */
  }
  return `${stage}::${al}`;
}

describe("t121 amadeus-stop hook — forwarding-loop enforcement (migrated from t121-stop-hook-enforce.sh, plan 13 + 3 human-wait carve-out cases)", () => {
  test("classifies Claude transcripts in-process across synthetic turns and engine engagement", () => {
    const proj = makeProject();
    const transcript = join(proj, "direct-claude-transcript.jsonl");
    const rows = [
      "",
      "partial-json",
      JSON.stringify(null),
      JSON.stringify({ type: "user" }),
      JSON.stringify({
        type: "user",
        isMeta: true,
        message: { role: "user", content: "Stop hook feedback: pending work" },
      }),
      JSON.stringify({
        type: "user",
        message: { role: "user", content: [{ type: "tool_result", content: "done" }] },
      }),
      JSON.stringify({
        type: "user",
        message: {
          role: "user",
          content: [{ type: "text", text: "The AIDLC workflow has a pending step; resume the forwarding loop." }],
        },
      }),
      JSON.stringify({
        type: "user",
        message: { role: "user", content: TEAMMATE_INJECTED_TURN },
      }),
      JSON.stringify({
        type: "user",
        message: { role: "user", content: [{ type: "text", text: "continue the workflow" }] },
      }),
      JSON.stringify({
        type: "assistant",
        message: {
          role: "assistant",
          content: [
            { type: "text", text: "working" },
            {
              type: "tool_use",
              name: "Bash",
              input: { command: "bun .claude/tools/amadeus-orchestrate.ts next" },
            },
          ],
        },
      }),
    ];
    writeFileSync(transcript, `${rows.join("\n")}\n`, "utf-8");
    expect(transcriptIsConversational(transcript, "claude")).toBe(false);

    const conversational = seedTranscript(proj, { format: "claude", engineCall: false });
    expect(transcriptIsConversational(conversational, "claude")).toBe(true);
    expect(transcriptIsConversational(join(proj, "missing.jsonl"), "claude")).toBe(false);
  });

  test("classifies Codex rollouts in-process across argument encodings", () => {
    const proj = makeProject();
    const transcript = join(proj, "rollout-direct-codex.jsonl");
    const rows = [
      JSON.stringify({ type: "other", payload: {} }),
      JSON.stringify({ type: "response_item" }),
      JSON.stringify({
        type: "response_item",
        payload: { type: "message", role: "user", content: "continue the workflow" },
      }),
      JSON.stringify({
        type: "response_item",
        payload: { type: "function_call", name: "Bash", arguments: "not-json" },
      }),
      JSON.stringify({
        type: "response_item",
        payload: { type: "function_call", name: "Bash", arguments: JSON.stringify("plain") },
      }),
      JSON.stringify({
        type: "response_item",
        payload: { type: "local_shell_call", action: { argv: ["bun", "noop"] } },
      }),
      JSON.stringify({
        type: "response_item",
        payload: {
          type: "function_call",
          name: "Bash",
          arguments: JSON.stringify({ command: "bun .codex/tools/amadeus-orchestrate.ts next" }),
        },
      }),
    ];
    writeFileSync(transcript, `${rows.join("\n")}\n`, "utf-8");
    expect(transcriptIsConversational(transcript, "codex")).toBe(false);

    const conversational = seedTranscript(proj, { format: "codex", engineCall: false });
    expect(transcriptIsConversational(conversational, "codex")).toBe(true);
  });

  test("classifies human-wait and pending-question stops in-process", () => {
    expect(isHumanWaitStop("- **Current Stage**: requirements-analysis\n- [?] requirements-analysis — EXECUTE\n"))
      .toBe(true);
    expect(isHumanWaitStop("- **Current Stage**: requirements-analysis\n- [R] requirements-analysis — EXECUTE\n"))
      .toBe(true);
    expect(isHumanWaitStop("- **Current Stage**: requirements-analysis\n- [-] requirements-analysis — EXECUTE\n"))
      .toBe(false);
    expect(isHumanWaitStop("- [?] requirements-analysis — EXECUTE\n")).toBe(false);

    const proj = makeProject();
    seedInProgressWithQuestions(proj, {
      phase: "inception",
      questions: "## Questions\n\n[Answer]: ___\n",
    });
    const pending = readFileSync(seededStateFile(proj), "utf-8");
    expect(isPendingQuestionStop(pending, proj)).toBe(true);
    expect(isPendingQuestionStop(pending.replace("[-]", "[?]"), proj)).toBe(false);
    seedInProgressWithQuestions(proj, {
      phase: "inception",
      questions: "## Questions\n\n[Answer]: ___\n",
      intentMode: "full",
    });
    expect(isPendingQuestionStop(readFileSync(seededStateFile(proj), "utf-8"), proj)).toBe(false);
    expect(isPendingQuestionStop("- **Current Stage**: missing\n", proj)).toBe(false);
  });

  test("reads the engine directive and conversational stop decision in-process", () => {
    const proj = makeProject();
    const enginePath = join(proj, ".claude", "tools", "amadeus-orchestrate.ts");
    writeFileSync(enginePath, 'console.log(JSON.stringify({ kind: "run-stage" }));\n', "utf-8");
    expect(runEngineNextKind(proj)).toBe("run-stage");
    writeFileSync(enginePath, 'console.log(JSON.stringify({ kind: "done" }));\n', "utf-8");
    expect(runEngineNextKind(proj)).toBe("done");
    writeFileSync(enginePath, "process.exit(1);\n", "utf-8");
    expect(runEngineNextKind(proj)).toBeNull();
    writeFileSync(enginePath, "", "utf-8");
    expect(runEngineNextKind(proj)).toBeNull();
    writeFileSync(enginePath, 'console.log("not-json");\n', "utf-8");
    expect(runEngineNextKind(proj)).toBeNull();
    expect(runEngineNextKind(join(proj, "missing"))).toBeNull();

    const transcript = seedTranscript(proj, { format: "claude", engineCall: false });
    const semiState = "- **Intent Autonomy Mode**: semi\n";
    expect(isConversationalStop(semiState, transcript, "claude")).toBe(true);
    expect(isConversationalStop("- **Intent Autonomy Mode**: full\n", transcript, "claude")).toBe(false);
    expect(isConversationalStop(semiState, null, "claude")).toBe(false);
  });
  // =========================================================================
  // (a) Pending directive -> BLOCK + re-fed via reason. The block event MUST
  //     actually fire (§6-E non-golden).
  // =========================================================================
  test("(a) exits 0 on a pending directive (block is via stdout, not exit code)", () => {
    const proj = makeProject();
    seedActive(proj, "requirements-analysis");
    const r = runHook(proj, '{"stop_hook_active":false}', "run-stage");
    expect(r.rc).toBe(0);
  }, 30000);

  test("(a) pending run-stage directive emits {\"decision\":\"block\"} on stdout", () => {
    const proj = makeProject();
    seedActive(proj, "requirements-analysis");
    const r = runHook(proj, '{"stop_hook_active":false}', "run-stage");
    // STRONGER than the .sh's substring grep: parse the JSON and assert the
    // exact decision field shape blockStop() writes (amadeus-stop.ts:105).
    const parsed = JSON.parse(r.out) as { decision?: string; reason?: string };
    expect(parsed.decision).toBe("block");
    expect(typeof parsed.reason).toBe("string");
  }, 30000);

  test("(a) reason names the pending run-stage work as on-task continuation", () => {
    const proj = makeProject();
    seedActive(proj, "requirements-analysis");
    const r = runHook(proj, '{"stop_hook_active":false}', "run-stage");
    const reason = (JSON.parse(r.out) as { reason: string }).reason;
    // .sh: grep '"reason"' && 'pending step' && 'run-stage'. Here all three
    // assert against the parsed reason string (continuationReason :298-307).
    expect(reason).toContain("pending step");
    expect(reason).toContain("run-stage");
    // The directive's stage context is carried into the continuation too.
    expect(reason).toContain("requirements-analysis");
  }, 30000);

  test("(a) reason is a sanctioned continuation (re-feeds the loop, no override verbs)", () => {
    const proj = makeProject();
    seedActive(proj, "requirements-analysis");
    const r = runHook(proj, '{"stop_hook_active":false}', "run-stage");
    const reason = (JSON.parse(r.out) as { reason: string }).reason;
    // Security property (amadeus-stop.ts:22-27): re-feeds the loop (names the
    // engine), NEVER an override-shaped instruction.
    expect(reason).toContain("amadeus-orchestrate");
    expect(/ignore|override|disregard|bypass/i.test(reason)).toBe(false);
  }, 30000);

  // =========================================================================
  // (b) `done` directive -> stop ALLOWED (no block, exit 0).
  // =========================================================================
  test("(b) done directive exits 0", () => {
    const proj = makeProject();
    seedActive(proj, "requirements-analysis");
    const r = runHook(proj, '{"stop_hook_active":false}', "done");
    expect(r.rc).toBe(0);
  }, 30000);

  test("(b) done directive emits nothing (stop allowed, no block)", () => {
    const proj = makeProject();
    seedActive(proj, "requirements-analysis");
    const r = runHook(proj, '{"stop_hook_active":false}', "done");
    expect(r.out).toBe("");
  }, 30000);

  test.each(["ask", "select-intent"])(
    "(b1) %s directive waits for the human without a forwarding-loop block",
    (kind) => {
      const proj = makeProject();
      seedActive(proj, "requirements-analysis");
      const r = runHook(proj, '{"stop_hook_active":false}', kind);
      expect(r.rc).toBe(0);
      expect(r.out).toBe("");
    },
    30000,
  );

  // =========================================================================
  // (b2) `parked` directive -> stop ALLOWED (no block), like `done` (#367).
  // The intentional multi-session exit: the hook must let the turn end rather
  // than re-feed the forwarding-loop nudge, so the agent never rubber-stamps.
  // =========================================================================
  test("(b2) parked directive exits 0 and emits nothing (stop allowed)", () => {
    const proj = makeProject();
    seedActive(proj, "requirements-analysis");
    const r = runHook(proj, '{"stop_hook_active":false}', "parked");
    expect(r.rc).toBe(0);
    expect(r.out).toBe("");
  }, 30000);

  test("(b2) parked does not consume the durable continuation budget", () => {
    const proj = makeProject();
    seedActive(proj, "requirements-analysis");
    expect(runHook(proj, '{"stop_hook_active":false}', "parked").out).toBe("");
    const first = runHook(proj, '{"stop_hook_active":false}', "run-stage");
    const second = runHook(proj, '{"stop_hook_active":false}', "run-stage");
    const exhausted = runHook(proj, '{"stop_hook_active":false}', "run-stage");
    expect(first.out).toContain('"decision":"block"');
    expect(second.out).toContain('"decision":"block"');
    expect(exhausted.out).toBe("");
  }, 30000);

  test("(b2) parked under Intent autonomy full ALLOWS a safe abnormal stop", () => {
    const proj = makeProject();
    seedInProgressWithQuestions(proj, { autonomy: "autonomous" });
    const r = runHook(proj, '{"stop_hook_active":false}', "parked");
    expect(r.rc).toBe(0);
    expect(r.out).toBe("");
  }, 30000);

  // =========================================================================
  // (c) RECURSION GUARD — asserted hardest. The session must ALWAYS release.
  // =========================================================================
  // (c1) A legacy transient counter cannot bypass the canonical budget.
  test("(c1) legacy no-progress state cannot bypass the durable budget", () => {
    const proj = makeProject();
    seedActive(proj, "requirements-analysis");
    mkdirSync(join(seededRecordDir(proj), ".amadeus-stop-hook"), {
      recursive: true,
    });
    const sig = progressSig(proj);
    writeFileSync(
      guardFilePath(proj),
      JSON.stringify({ signature: sig, count: 8 }),
      "utf-8",
    );
    const r = runHook(proj, '{"stop_hook_active":true}', "run-stage");
    expect(r.rc).toBe(0);
    expect(r.out).toContain('"decision":"block"');
  }, 30000);

  // (c2) The cap-th delivery is authorized; cap+1 is rejected and remains terminal.
  test("(c2) durable budget (cap 3): block,block,block,RELEASE — cap-th is allowed", () => {
    const proj = makeProject();
    seedActive(proj, "requirements-analysis");
    const b1 = runHook(proj, '{"stop_hook_active":false}', "run-stage", "3");
    const b2 = runHook(proj, '{"stop_hook_active":false}', "run-stage", "3");
    const b3 = runHook(proj, '{"stop_hook_active":false}', "run-stage", "3");
    const b4 = runHook(proj, '{"stop_hook_active":false}', "run-stage", "3");
    expect(b1.out).toContain("block");
    expect(b2.out).toContain("block");
    expect(b3.out).toContain("block");
    expect(b4.out).toBe("");
    // The cap-th delivery is still a real, parseable block decision.
    expect((JSON.parse(b1.out) as { decision: string }).decision).toBe("block");
    expect((JSON.parse(b3.out) as { decision: string }).decision).toBe("block");
  }, 30000);

  test("(c2b) audit noise cannot reset a stage budget: three deliveries then cap+1 RELEASE", () => {
    const proj = makeProject();
    seedActive(proj, "requirements-analysis");
    const outputs: string[] = [];
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      outputs.push(runHook(proj, '{"stop_hook_active":true}', "run-stage", "3").out);
      emitAuditEventGuarded(
        "AUTONOMY_MODE_SET",
        { Mode: attempt % 2 === 0 ? "autonomous" : "gated" },
        proj,
      );
    }
    expect(outputs.slice(0, 3).every((output) => output.includes('"decision":"block"'))).toBe(
      true,
    );
    expect(outputs[3]).toBe("");
  }, 30000);

  // (c3) A stage pivot creates a new semantic subject with its own budget.
  test("(c3) progress (stage pivot) starts a fresh durable stage budget", () => {
    const proj = makeProject();
    seedActive(proj, "stage-a");
    expect(runHook(proj, '{"stop_hook_active":true}', "run-stage", "2").out).toContain(
      '"decision":"block"',
    );
    expect(runHook(proj, '{"stop_hook_active":true}', "run-stage", "2").out).toContain(
      '"decision":"block"',
    );
    expect(runHook(proj, '{"stop_hook_active":true}', "run-stage", "2").out).toBe("");
    writeFileSync(
      seededStateFile(proj),
      "- **Workflow**: feature\n- **Scope**: feature\n- **Current Stage**: stage-b\n",
      "utf-8",
    );
    expect(runHook(proj, '{"stop_hook_active":true}', "run-stage", "2").out).toContain(
      '"decision":"block"',
    );
  }, 30000);

  // =========================================================================
  // (d) No-op outside AIDLC — no state file -> exit 0, no block.
  // =========================================================================
  test("(d) no amadeus-state.md exits 0", () => {
    const proj = makeProject(); // NO seedActive => no amadeus-state.md
    const r = runHook(proj, '{"stop_hook_active":false}', "run-stage");
    expect(r.rc).toBe(0);
  }, 30000);

  test("(d) no active workflow emits nothing (non-AIDLC session is never blocked)", () => {
    const proj = makeProject();
    const r = runHook(proj, '{"stop_hook_active":false}', "run-stage");
    expect(r.out).toBe("");
  }, 30000);

  // =========================================================================
  // (e) HUMAN-WAIT CARVE-OUT — when the current stage is positively in a
  // human-wait checkbox state ([?] awaiting-approval / [R] revising) the
  // conductor is correctly parked on the human, so the hook ALLOWS the stop
  // even though the engine still returns a pending run-stage. Tier 1 only:
  // [-] in-progress and stateless cases are NOT carved out (positive-only),
  // so a genuine mid-stage quit is still nudged by the cap-bounded block.
  // =========================================================================
  test("(e) current stage awaiting-approval [?] allows the stop (human-wait carve-out)", () => {
    const proj = makeProject();
    // Engine still says run-stage (pending) — the carve-out is what releases,
    // not the engine. The [?] row for the current slug is the positive signal.
    seedActiveWithCheckbox(proj, "?", "requirements-analysis");
    const r = runHook(proj, '{"stop_hook_active":false}', "run-stage");
    expect(r.rc).toBe(0);
    expect(r.out).toBe(""); // allowed: empty stdout, no decision:block
  }, 30000);

  test("(e) current stage revising [R] allows the stop (human-wait carve-out)", () => {
    const proj = makeProject();
    seedActiveWithCheckbox(proj, "R", "requirements-analysis");
    const r = runHook(proj, '{"stop_hook_active":false}', "run-stage");
    expect(r.rc).toBe(0);
    expect(r.out).toBe("");
  }, 30000);

  test("(e) carve-out is positive-only — [-] in-progress still BLOCKS (cap is the only release)", () => {
    const proj = makeProject();
    // [-] in-progress is ALSO the normal 'stage work still owed' state — a
    // blanket carve-out here would gut the hook. It must still block (today's
    // behaviour); only the no-progress cap releases it. This pins that tier-1
    // did NOT widen into in-progress.
    seedActiveWithCheckbox(proj, "-", "requirements-analysis");
    const r = runHook(proj, '{"stop_hook_active":false}', "run-stage");
    expect(r.rc).toBe(0);
    const parsed = JSON.parse(r.out) as { decision?: string };
    expect(parsed.decision).toBe("block");
  }, 30000);

  // =========================================================================
  // (f) TIER-2 PENDING-QUESTION CARVE-OUT — a mid-stage [-] stage with a
  // questions file that has an UNANSWERED [Answer]: tag means the conductor is
  // parked on the human (a clarifying question), so allow the stop. Strictly
  // gated: (1) a blank/underscore [Answer]: must exist, (2) the workflow must
  // NOT be in autonomous Construction (where the loop must keep running). Any
  // miss → fall through to the cap-bounded block. This closes the [-] gap the
  // tier-1 comment flagged as a follow-up, without touching autonomous runs.
  // =========================================================================
  test("(f) [-] with a blank [Answer]: question allows the stop (pending-question carve-out)", () => {
    const proj = makeProject();
    seedInProgressWithQuestions(proj, {
      questions: "# Questions\n\n## Q1\nWhich URL scheme?\n[Answer]:\n",
    });
    const r = runHook(proj, '{"stop_hook_active":false}', "run-stage");
    expect(r.rc).toBe(0);
    expect(r.out).toBe(""); // allowed — a question is genuinely pending
  }, 30000);

  test("(f) [-] with an underscore-only [Answer]: also allows (treated as blank)", () => {
    const proj = makeProject();
    seedInProgressWithQuestions(proj, {
      questions: "# Questions\n\n## Q1\nWhich URL scheme?\n[Answer]: ____\n",
    });
    const r = runHook(proj, '{"stop_hook_active":false}', "run-stage");
    expect(r.rc).toBe(0);
    expect(r.out).toBe("");
  }, 30000);

  test("(f) [-] with an ANSWERED question still BLOCKS (no pending question)", () => {
    const proj = makeProject();
    seedInProgressWithQuestions(proj, {
      questions: "# Questions\n\n## Q1\nWhich URL scheme?\n[Answer]: A\n",
    });
    const r = runHook(proj, '{"stop_hook_active":false}', "run-stage");
    expect(r.rc).toBe(0);
    expect((JSON.parse(r.out) as { decision?: string }).decision).toBe("block");
  }, 30000);

  test("(f) [-] with NO questions file still BLOCKS (a genuine mid-stage quit)", () => {
    const proj = makeProject();
    seedInProgressWithQuestions(proj, {}); // no questions file written
    const r = runHook(proj, '{"stop_hook_active":false}', "run-stage");
    expect(r.rc).toBe(0);
    expect((JSON.parse(r.out) as { decision?: string }).decision).toBe("block");
  }, 30000);

  test("(f) AUTONOMY GUARD — full + blank question still BLOCKS", () => {
    const proj = makeProject();
    // The exact regression the autonomy gate prevents: in an autonomous
    // Construction run the loop must keep moving even with a stray open
    // question. A blank [Answer]: must NOT release the stop here.
    seedInProgressWithQuestions(proj, {
      slug: "code-generation",
      phase: "construction",
      autonomy: "autonomous",
      questions: "# Questions\n\n## Q1\nEdge case?\n[Answer]:\n",
    });
    const r = runHook(proj, '{"stop_hook_active":false}', "run-stage");
    expect(r.rc).toBe(0);
    expect((JSON.parse(r.out) as { decision?: string }).decision).toBe("block");
  }, 30000);

  test("(f) semi + blank question ALLOWS because questions remain human-owned", () => {
    const proj = makeProject();
    seedInProgressWithQuestions(proj, {
      slug: "code-generation",
      phase: "construction",
      autonomy: "autonomous",
      intentMode: "semi",
      questions: "# Questions\n\n## Q1\nEdge case?\n[Answer]:\n",
    });
    const r = runHook(proj, '{"stop_hook_active":false}', "run-stage");
    expect(r.rc).toBe(0);
    expect(r.out).toBe("");
  }, 30000);

  test("(f) gated Construction — [-] + blank question DOES allow (autonomy not granted)", () => {
    const proj = makeProject();
    // The complement: same Construction stage, but autonomy is 'gated' (or
    // unset) → the human is in the loop, so a pending question releases.
    seedInProgressWithQuestions(proj, {
      slug: "code-generation",
      phase: "construction",
      autonomy: "gated",
      questions: "# Questions\n\n## Q1\nEdge case?\n[Answer]:\n",
    });
    const r = runHook(proj, '{"stop_hook_active":false}', "run-stage");
    expect(r.rc).toBe(0);
    expect(r.out).toBe("");
  }, 30000);

  // =========================================================================
  // (f) TIER-3 CONVERSATIONAL CARVE-OUT (issue #365 broader reading): when the
  // ending turn answered the human's most recent prompt with NO workflow-engine
  // engagement (no amadeus-orchestrate / amadeus-state call since that prompt) the
  // human was just chatting mid-workflow, so the hook ALLOWS the stop even
  // though the engine still returns a pending run-stage. The signal is the
  // harness transcript (Claude / Codex deliver `transcript_path` on the Stop
  // payload). Strictly gated and fail-CLOSED (isConversationalStop,
  // amadeus-stop.ts:599): an engine call in the responding turn, autonomous
  // Construction, an unreadable / missing transcript, or no human prompt found
  // all fall through to the cap-bounded block. It only ever ALLOWS.
  // =========================================================================
  test("(f) Claude chat transcript (human prompt answered with TEXT only) allows the stop (conversational carve-out)", () => {
    const proj = makeProject();
    // Active, non-autonomous, pending run-stage: the engine still says block;
    // the conversational transcript is what releases.
    seedActive(proj, "requirements-analysis");
    const tp = seedTranscript(proj, { format: "claude", engineCall: false });
    const r = runHook(
      proj,
      JSON.stringify({ stop_hook_active: false, transcript_path: tp }),
      "run-stage",
    );
    expect(r.rc).toBe(0);
    expect(r.out).toBe(""); // allowed (the turn was conversational)
  }, 30000);

  test("(f) Claude transcript with an amadeus-orchestrate Bash call after the prompt still BLOCKS (engine was engaged)", () => {
    const proj = makeProject();
    seedActive(proj, "requirements-analysis");
    // Same human prompt, but the responding turn ran the engine -> a mid-loop
    // bail that must still be nudged.
    const tp = seedTranscript(proj, { format: "claude", engineCall: true });
    const r = runHook(
      proj,
      JSON.stringify({ stop_hook_active: false, transcript_path: tp }),
      "run-stage",
    );
    expect(r.rc).toBe(0);
    expect((JSON.parse(r.out) as { decision?: string }).decision).toBe("block");
  }, 30000);

  test("(f) Codex rollout chat transcript allows the stop (conversational carve-out, codex reader)", () => {
    const proj = makeProject();
    seedActive(proj, "requirements-analysis");
    // The codex reader is selected only when the path ends in rollout-*.jsonl
    // (amadeus-stop.ts:721); seedTranscript names the codex variant accordingly.
    const tp = seedTranscript(proj, { format: "codex", engineCall: false });
    const r = runHook(
      proj,
      JSON.stringify({ stop_hook_active: false, transcript_path: tp }),
      "run-stage",
    );
    expect(r.rc).toBe(0);
    expect(r.out).toBe("");
  }, 30000);

  test("(f) Codex rollout with a function_call amadeus-orchestrate after the prompt still BLOCKS", () => {
    const proj = makeProject();
    seedActive(proj, "requirements-analysis");
    const tp = seedTranscript(proj, { format: "codex", engineCall: true });
    const r = runHook(
      proj,
      JSON.stringify({ stop_hook_active: false, transcript_path: tp }),
      "run-stage",
    );
    expect(r.rc).toBe(0);
    expect((JSON.parse(r.out) as { decision?: string }).decision).toBe("block");
  }, 30000);

  test("(f) AUTONOMY GUARD - a chat transcript under Construction Autonomy Mode=autonomous still BLOCKS (carve-out disabled)", () => {
    const proj = makeProject();
    // Autonomous Construction: there is no human chatting to release, so the
    // conversational carve-out is suppressed and the loop stays alive.
    seedInProgressWithQuestions(proj, { autonomy: "autonomous" });
    const tp = seedTranscript(proj, { format: "claude", engineCall: false });
    const r = runHook(
      proj,
      JSON.stringify({ stop_hook_active: false, transcript_path: tp }),
      "run-stage",
    );
    expect(r.rc).toBe(0);
    expect((JSON.parse(r.out) as { decision?: string }).decision).toBe("block");
  }, 30000);

  test("(f) AUTONOMY cap is 8 - autonomous workflow does NOT release at the interactive cap (2)", () => {
    const proj = makeProject();
    seedInProgressWithQuestions(proj, { autonomy: "autonomous" });
    const outputs = Array.from({ length: 3 }, () =>
      runHook(proj, '{"stop_hook_active":true}', "run-stage").out,
    );
    expect(
      outputs.every(
        (output) => (JSON.parse(output) as { decision?: string }).decision === "block",
      ),
    ).toBe(true);
  }, 30000);

  test("(f) FAIL-CLOSED - a transcript_path pointing at a nonexistent file falls through to the cap-bounded block", () => {
    const proj = makeProject();
    seedActive(proj, "requirements-analysis");
    // No transcript written; point the payload at a path that does not exist.
    // transcriptIsConversational fails closed on the unreadable file -> fall
    // through to decideBlock, which on a fresh first block at count 1 BLOCKS.
    const r = runHook(
      proj,
      JSON.stringify({
        stop_hook_active: false,
        transcript_path: join(proj, "does-not-exist.jsonl"),
      }),
      "run-stage",
    );
    expect(r.rc).toBe(0);
    expect((JSON.parse(r.out) as { decision?: string }).decision).toBe("block");
  }, 30000);

  // =========================================================================
  // (g) RUN-MODE-AWARE DEFAULT BLOCK CAP: with no CLAUDE_CODE_STOP_HOOK_BLOCK_CAP
  // override the default cap is now run-mode aware: 2 for an INTERACTIVE run,
  // 8 for `Construction Autonomy Mode: autonomous` (AUTONOMOUS_BLOCK_CAP=8,
  // INTERACTIVE_BLOCK_CAP=2, amadeus-stop.ts:136-137). A human who pauses or chats
  // permits two deliveries; an unattended autonomous run keeps the long
  // ceiling. No env var and no transcript are involved.
  // =========================================================================
  test("(g) INTERACTIVE default cap (2): two blocks then cap+1 RELEASE", () => {
    const proj = makeProject();
    // Non-autonomous active workflow, no transcript, NO explicit cap env so the
    // interactive default (2) governs. stop_hook_active:false so the streak is
    // driven purely by one unchanged stage instance (no report between invocations).
    seedActive(proj, "requirements-analysis");
    const b1 = runHook(proj, '{"stop_hook_active":false}', "run-stage");
    const b2 = runHook(proj, '{"stop_hook_active":false}', "run-stage");
    const b3 = runHook(proj, '{"stop_hook_active":false}', "run-stage");
    expect((JSON.parse(b1.out) as { decision?: string }).decision).toBe("block");
    expect((JSON.parse(b2.out) as { decision?: string }).decision).toBe("block");
    expect(b3.out).toBe("");
  }, 30000);

  test("(g) AUTONOMOUS default cap (8): eight blocks then cap+1 RELEASE", () => {
    const proj = makeProject();
    // Identical no-progress sequence as the interactive case, but flagged
    // autonomous (the autonomy seed). The default cap is 8, so deliveries 1-8
    // block and cap+1 releases, proving the autonomous default is not throttled
    // to 2. No transcript / no env override.
    seedInProgressWithQuestions(proj, { autonomy: "autonomous" });
    const outs: string[] = [];
    for (let i = 1; i <= 9; i++) {
      outs.push(runHook(proj, '{"stop_hook_active":false}', "run-stage").out);
    }
    for (let i = 0; i < 8; i++) {
      expect((JSON.parse(outs[i]) as { decision?: string }).decision).toBe("block");
    }
    expect(outs[8]).toBe("");
  }, 30000);

  // =========================================================================
  // Robustness — garbage stdin must never crash and never trap (fail open).
  // Empty / malformed / truncated JSON and an engine that fails to answer all
  // ALLOW (exit 0, no block), even mid-stage.
  // =========================================================================
  test("garbage stdin + unparseable engine output fail OPEN (exit 0, no block) — never crash, never trap", () => {
    const proj = makeProject();
    seedActive(proj, "requirements-analysis");

    // malformed JSON with a done engine -> allow (no crash).
    const m = runHook(proj, "this is not json", "done");
    expect(m.rc).toBe(0);
    expect(m.out).toBe("");

    // truncated JSON with a done engine -> allow.
    const t = runHook(proj, '{"stop_hook_active":', "done");
    expect(t.rc).toBe(0);
    expect(t.out).toBe("");

    // engine returns non-zero / no directive -> fail open (allow), even
    // mid-stage. runEngineNextKind() returns null on non-zero exit (:274).
    const n = runHook(proj, '{"stop_hook_active":false}', "__nonzero__");
    expect(n.rc).toBe(0);
    expect(n.out).toBe("");
  }, 30000);

  // =========================================================================
  // (h) CLASSIFIER REFINEMENTS (commit 92b94a2): two hardenings of the tier-3
  // conversational carve-out, pinned deterministically against the real hook:
  //
  //   1. READ-ONLY ENGINE QUERIES are NOT workflow engagement. isEngineToolCall
  //      (amadeus-stop.ts:474) returns FALSE for `--status` / `--doctor` / `--help`
  //      / `--version` / `amadeus-orchestrate next --status` and ANY amadeus-utility
  //      call, even though they name amadeus-orchestrate/amadeus-state. It returns
  //      TRUE only for loop-advancing / state-mutating calls: bare
  //      `amadeus-orchestrate next`, `amadeus-orchestrate report`, and `amadeus-state`
  //      with approve/advance/finalize/complete-workflow/gate-start/checkbox/
  //      park/unpark/set. So a chat turn whose conductor ANSWERED with a
  //      read-only query stays conversational (ALLOW); a turn that ran a
  //      loop-advancing / mutating call then bailed BLOCKS.
  //   2. The hook's OWN injected continuation is NOT a human prompt. Claude
  //      records it as a `type:"user"` entry with `isMeta:true` whose content
  //      starts "Stop hook feedback:" (amadeus-stop.ts:546,564). The classifier
  //      SKIPS it (by isMeta AND by the content prefix) so the human-prompt
  //      anchor stays the human's, not the hook's. Codex has no isMeta, so the
  //      content guard alone excludes it there (amadeus-stop.ts:605).
  //
  // Each case uses a FRESH makeProject(), so its audit-backed stage budget starts
  // at 0 and a BLOCK is a real first delivery at the interactive cap of 2.
  // =========================================================================

  // --- (h.1) read-only engine queries are conversational (ALLOW) ---
  test("(h) chat + read-only `amadeus-orchestrate next --status` after the human prompt allows the stop", () => {
    const proj = makeProject();
    seedActive(proj, "requirements-analysis");
    // A chatting human asks "what stage am I on?"; the conductor answers with a
    // read-only `next --status`. isEngineToolCall returns false on --status, so
    // the turn is still conversational.
    const tp = seedTranscriptEntries(proj, "claude", [
      { kind: "human", text: "what stage am I on?" },
      { kind: "bash", command: "bun .claude/tools/amadeus-orchestrate.ts next --status" },
      { kind: "text" },
    ]);
    const r = runHook(
      proj,
      JSON.stringify({ stop_hook_active: false, transcript_path: tp }),
      "run-stage",
    );
    expect(r.rc).toBe(0);
    expect(r.out).toBe(""); // allowed: read-only query is not engagement
  }, 30000);

  test("(h) chat + `amadeus-utility status` after the human prompt allows the stop", () => {
    const proj = makeProject();
    seedActive(proj, "requirements-analysis");
    // amadeus-utility names neither amadeus-orchestrate nor amadeus-state, so
    // isEngineToolCall returns false at its first gate (:483): not engagement.
    const tp = seedTranscriptEntries(proj, "claude", [
      { kind: "human", text: "show me the workflow status" },
      { kind: "bash", command: "bun .claude/tools/amadeus-utility.ts status" },
    ]);
    const r = runHook(
      proj,
      JSON.stringify({ stop_hook_active: false, transcript_path: tp }),
      "run-stage",
    );
    expect(r.rc).toBe(0);
    expect(r.out).toBe("");
  }, 30000);

  test("(h) chat + `amadeus-orchestrate --doctor` / `--help` / `--version` each allow the stop", () => {
    for (const flag of ["--doctor", "--help", "--version"]) {
      const proj = makeProject(); // fresh per flag: counter starts at 0
      seedActive(proj, "requirements-analysis");
      const tp = seedTranscriptEntries(proj, "claude", [
        { kind: "human", text: "is the workflow healthy?" },
        { kind: "bash", command: `bun .claude/tools/amadeus-orchestrate.ts ${flag}` },
      ]);
      const r = runHook(
        proj,
        JSON.stringify({ stop_hook_active: false, transcript_path: tp }),
        "run-stage",
      );
      expect(r.rc).toBe(0);
      expect(r.out).toBe(""); // each read-only flag stays conversational
    }
  }, 30000);

  // --- (h.1) loop-advancing / mutating calls are engagement (BLOCK) ---
  test("(h) engaged: bare `amadeus-orchestrate next` after the human prompt BLOCKS", () => {
    const proj = makeProject();
    seedActive(proj, "requirements-analysis");
    // A bare `next` (no read-only flag) fetches the next directive to act on;
    // that IS engagement, so a conductor that ran it then bailed must be nudged.
    const tp = seedTranscriptEntries(proj, "claude", [
      { kind: "human", text: "continue" },
      { kind: "bash", command: "bun .claude/tools/amadeus-orchestrate.ts next" },
    ]);
    const r = runHook(
      proj,
      JSON.stringify({ stop_hook_active: false, transcript_path: tp }),
      "run-stage",
    );
    expect(r.rc).toBe(0);
    expect((JSON.parse(r.out) as { decision?: string }).decision).toBe("block");
  }, 30000);

  test("(h) engaged: `amadeus-orchestrate report --stage x --result approved` BLOCKS", () => {
    const proj = makeProject();
    seedActive(proj, "requirements-analysis");
    const tp = seedTranscriptEntries(proj, "claude", [
      { kind: "human", text: "looks good, proceed" },
      {
        kind: "bash",
        command:
          "bun .claude/tools/amadeus-orchestrate.ts report --stage requirements-analysis --result approved",
      },
    ]);
    const r = runHook(
      proj,
      JSON.stringify({ stop_hook_active: false, transcript_path: tp }),
      "run-stage",
    );
    expect(r.rc).toBe(0);
    expect((JSON.parse(r.out) as { decision?: string }).decision).toBe("block");
  }, 30000);

  test("(h) engaged: `amadeus-state approve foo` BLOCKS", () => {
    const proj = makeProject();
    seedActive(proj, "requirements-analysis");
    const tp = seedTranscriptEntries(proj, "claude", [
      { kind: "human", text: "approve it" },
      { kind: "bash", command: "bun .claude/tools/amadeus-state.ts approve foo" },
    ]);
    const r = runHook(
      proj,
      JSON.stringify({ stop_hook_active: false, transcript_path: tp }),
      "run-stage",
    );
    expect(r.rc).toBe(0);
    expect((JSON.parse(r.out) as { decision?: string }).decision).toBe("block");
  }, 30000);

  // --- (h.2) the hook's own re-prompt is excluded from "genuine human prompt" ---
  test("(h) isMeta exclusion: an isMeta 'Stop hook feedback:' re-prompt does NOT reset the human anchor; engine call after the REAL prompt still BLOCKS", () => {
    const proj = makeProject();
    seedActive(proj, "requirements-analysis");
    // The REAL human prompt is "continue"; the conductor engaged the engine
    // (bare next), produced text, then the hook injected its OWN re-prompt as a
    // type:"user" isMeta entry, then the conductor ran the engine again. The
    // classifier MUST skip the isMeta entry rather than treat it as the latest
    // human prompt: the genuine anchor stays at "continue", and an engine call
    // (bare next) appears after it, so the turn is NOT conversational -> BLOCK.
    // Were the isMeta entry counted as the human prompt, the anchor would move
    // past the first next and the engaged run could be misread as chat.
    const tp = seedTranscriptEntries(proj, "claude", [
      { kind: "human", text: "continue" },
      { kind: "bash", command: "bun .claude/tools/amadeus-orchestrate.ts next" },
      { kind: "text" },
      { kind: "meta", text: "Stop hook feedback: The AIDLC workflow has a pending step." },
      { kind: "bash", command: "bun .claude/tools/amadeus-orchestrate.ts next" },
    ]);
    const r = runHook(
      proj,
      JSON.stringify({ stop_hook_active: false, transcript_path: tp }),
      "run-stage",
    );
    expect(r.rc).toBe(0);
    expect((JSON.parse(r.out) as { decision?: string }).decision).toBe("block");
  }, 30000);

  test("(h) content exclusion (no isMeta): a 'Stop hook feedback:' user entry is excluded by content, so the last GENUINE prompt was a chat answer -> ALLOW", () => {
    const proj = makeProject();
    seedActive(proj, "requirements-analysis");
    // No isMeta flag this time. The genuine human prompt is "explain X", answered
    // with TEXT only (no engine call). A later type:"user" entry whose content
    // starts "Stop hook feedback:" is excluded BY CONTENT, so it must not become
    // the new anchor; the last genuine prompt stays "explain X" -> conversational.
    const tp = seedTranscriptEntries(proj, "claude", [
      { kind: "human", text: "explain what this stage does" },
      { kind: "text" },
      { kind: "userText", text: "Stop hook feedback: The AIDLC workflow has a pending step." },
      { kind: "text" },
    ]);
    const r = runHook(
      proj,
      JSON.stringify({ stop_hook_active: false, transcript_path: tp }),
      "run-stage",
    );
    expect(r.rc).toBe(0);
    expect(r.out).toBe(""); // allowed: feedback entry excluded by content prefix
  }, 30000);

  // --- (h) Codex-format equivalents (read-only ALLOW + bare-next BLOCK) ---
  test("(h) Codex: chat + read-only `amadeus-orchestrate next --status` allows the stop", () => {
    const proj = makeProject();
    seedActive(proj, "requirements-analysis");
    // The codex reader routes the function_call arguments through isEngineToolCall
    // too (amadeus-stop.ts:639), so the read-only exemption holds across formats.
    const tp = seedTranscriptEntries(proj, "codex", [
      { kind: "human", text: "what stage am I on?" },
      { kind: "bash", command: "bun .codex/tools/amadeus-orchestrate.ts next --status" },
    ]);
    const r = runHook(
      proj,
      JSON.stringify({ stop_hook_active: false, transcript_path: tp }),
      "run-stage",
    );
    expect(r.rc).toBe(0);
    expect(r.out).toBe("");
  }, 30000);

  test("(h) Codex: engaged bare `amadeus-orchestrate next` BLOCKS", () => {
    const proj = makeProject();
    seedActive(proj, "requirements-analysis");
    const tp = seedTranscriptEntries(proj, "codex", [
      { kind: "human", text: "continue" },
      { kind: "bash", command: "bun .codex/tools/amadeus-orchestrate.ts next" },
    ]);
    const r = runHook(
      proj,
      JSON.stringify({ stop_hook_active: false, transcript_path: tp }),
      "run-stage",
    );
    expect(r.rc).toBe(0);
    expect((JSON.parse(r.out) as { decision?: string }).decision).toBe("block");
  }, 30000);

  // =========================================================================
  // (i) CLASSIFIER-LEAK REGRESSIONS (commit e9b6e48). Three precision fixes to
  // isEngineToolCall (amadeus-stop.ts:474) / isEngineEngagementSegment (:507) /
  // isInjectedHookFeedback (:542), all closing 'wrong-allow' leaks an adversarial
  // review of the tier-3 conversational carve-out found. They could let an
  // engine-engaged turn be misread as chat (ALLOW) when it should BLOCK:
  //
  //   1. PRECEDENCE - a command is split on shell separators (&& || ; | newline)
  //      and each segment judged on its own (amadeus-stop.ts:489). A read-only flag
  //      (--status/--doctor/--help/--version) now exempts ONLY the segment it
  //      appears in, so a chained `... --status && amadeus-orchestrate report ...`,
  //      or a `report --reason '...--status...'` whose --status is inside an
  //      argument, is ENGAGEMENT (BLOCK), not exempt.
  //   2. MISSED COMMANDS - amadeus-jump / amadeus-bolt / amadeus-swarm (conductor-run,
  //      state-mutating) and amadeus-state skip/reject/revise/resume now count as
  //      engagement (:525,:531); an unrecognised amadeus-* verb fails TOWARD
  //      engagement (BLOCK). A read-only `amadeus-bolt --help` stays chat (ALLOW).
  //   3. CODEX RAW CONTINUATION - the hook's own injected nudge is excluded from
  //      human-prompt detection not just by the Claude "Stop hook feedback:"
  //      wrapper but also by the RAW continuationReason body ("The AIDLC workflow
  //      has a pending step" + "forwarding loop"; amadeus-stop.ts:546-548), in BOTH
  //      readers. So an engine-engaged turn whose last user entry is that raw
  //      nudge (no wrapper) still BLOCKS - the nudge must not reset the human
  //      anchor.
  //
  // Each BLOCK-expecting case uses a FRESH makeProject() (the interactive cap is
  // 2; reusing a project across three deliveries would exhaust its stage budget
  // and mask a real BLOCK - see the (a)/(h) pattern).
  // =========================================================================

  // --- (i.1) PRECEDENCE: per-segment judgement of chained / argument-embedded flags ---
  test("(i) chained `amadeus-utility --status && amadeus-orchestrate report` after the human prompt BLOCKS (per-segment precedence)", () => {
    const proj = makeProject();
    seedActive(proj, "requirements-analysis");
    // The read-only --status is in the FIRST segment (amadeus-utility, not even an
    // engine verb); the SECOND segment runs a mutating `report`. Pre-fix the
    // line-level --status wrongly exempted the whole chain; now each segment is
    // judged on its own, so the report segment is engagement -> BLOCK.
    const tp = seedTranscriptEntries(proj, "claude", [
      { kind: "human", text: "looks fine" },
      {
        kind: "bash",
        command:
          "bun .claude/tools/amadeus-utility.ts --status && bun .claude/tools/amadeus-orchestrate.ts report --stage requirements-analysis --result approved",
      },
    ]);
    const r = runHook(
      proj,
      JSON.stringify({ stop_hook_active: false, transcript_path: tp }),
      "run-stage",
    );
    expect(r.rc).toBe(0);
    expect((JSON.parse(r.out) as { decision?: string }).decision).toBe("block");
  }, 30000);

  test("(i) `amadeus-orchestrate report --reason \"checked --status earlier\"` BLOCKS (flag inside an argument is not an exemption)", () => {
    const proj = makeProject();
    seedActive(proj, "requirements-analysis");
    // The --status token only appears INSIDE the --reason argument of a single
    // `report` segment. Pre-fix the line-level scan saw --status and exempted the
    // turn; now the lone segment carries `report` (advancing) -> engagement -> BLOCK.
    const tp = seedTranscriptEntries(proj, "claude", [
      { kind: "human", text: "proceed" },
      {
        kind: "bash",
        command:
          'bun .claude/tools/amadeus-orchestrate.ts report --stage requirements-analysis --result approved --reason "checked --status earlier"',
      },
    ]);
    const r = runHook(
      proj,
      JSON.stringify({ stop_hook_active: false, transcript_path: tp }),
      "run-stage",
    );
    expect(r.rc).toBe(0);
    expect((JSON.parse(r.out) as { decision?: string }).decision).toBe("block");
  }, 30000);

  // --- (i.2) MISSED COMMANDS: jump / state-skip count as engagement; bolt --help does not ---
  test("(i) engaged: `amadeus-jump.ts execute application-design` after the human prompt BLOCKS", () => {
    const proj = makeProject();
    seedActive(proj, "requirements-analysis");
    // amadeus-jump moves the pointer (state-mutating); pre-fix it was not in the
    // engagement set, so a jump-then-bail was misread as chat. Now it BLOCKS.
    const tp = seedTranscriptEntries(proj, "claude", [
      { kind: "human", text: "jump ahead" },
      { kind: "bash", command: "bun .claude/tools/amadeus-jump.ts execute application-design" },
    ]);
    const r = runHook(
      proj,
      JSON.stringify({ stop_hook_active: false, transcript_path: tp }),
      "run-stage",
    );
    expect(r.rc).toBe(0);
    expect((JSON.parse(r.out) as { decision?: string }).decision).toBe("block");
  }, 30000);

  test("(i) engaged: `amadeus-state.ts skip foo` after the human prompt BLOCKS", () => {
    const proj = makeProject();
    seedActive(proj, "requirements-analysis");
    // skip is a state-mutating amadeus-state verb newly recognised as engagement
    // (amadeus-stop.ts:525); a skip-then-bail must be nudged.
    const tp = seedTranscriptEntries(proj, "claude", [
      { kind: "human", text: "skip this one" },
      { kind: "bash", command: "bun .claude/tools/amadeus-state.ts skip foo" },
    ]);
    const r = runHook(
      proj,
      JSON.stringify({ stop_hook_active: false, transcript_path: tp }),
      "run-stage",
    );
    expect(r.rc).toBe(0);
    expect((JSON.parse(r.out) as { decision?: string }).decision).toBe("block");
  }, 30000);

  test("(i) read-only `amadeus-bolt.ts --help` after a chat prompt allows the stop (read-only verb is not engagement)", () => {
    const proj = makeProject();
    seedActive(proj, "requirements-analysis");
    // The complement to the engagement cases: amadeus-bolt is in the engagement
    // set, but a read-only --help on it is NOT engagement (amadeus-stop.ts:530), so
    // a chatting human who asked about bolt and got --help stays conversational.
    const tp = seedTranscriptEntries(proj, "claude", [
      { kind: "human", text: "how does bolt work?" },
      { kind: "bash", command: "bun .claude/tools/amadeus-bolt.ts --help" },
    ]);
    const r = runHook(
      proj,
      JSON.stringify({ stop_hook_active: false, transcript_path: tp }),
      "run-stage",
    );
    expect(r.rc).toBe(0);
    expect(r.out).toBe(""); // allowed: read-only --help is not engagement
  }, 30000);

  // --- (i.3) CODEX RAW CONTINUATION: the raw nudge body must not reset the human anchor ---
  // The hook's continuationReason body (amadeus-stop.ts:781-792) is excluded from
  // human-prompt detection by isInjectedHookFeedback's RAW-body branch
  // (:546-548): starts "The AIDLC workflow has a pending step" AND contains
  // "forwarding loop". So a turn that engaged the engine (bare `next` after the
  // real "continue") whose LAST user entry is that raw nudge (no "Stop hook
  // feedback:" wrapper) must STILL BLOCK: were the raw nudge counted as the
  // latest human prompt, the anchor would move past the engine call and the
  // engaged run would be misread as chat (wrong ALLOW).
  const RAW_NUDGE =
    "The AIDLC workflow has a pending step (a run-stage directive). " +
    "You haven't finished the forwarding loop yet. Run `bun .claude/tools/amadeus-orchestrate.ts next`, " +
    "act on the directive it emits, then report.";

  test("(i) Claude: a RAW continuation body (no 'Stop hook feedback:' wrapper) does NOT reset the human anchor; the engaged turn still BLOCKS", () => {
    const proj = makeProject();
    seedActive(proj, "requirements-analysis");
    // Genuine human prompt "continue"; conductor ran the engine (bare next) then
    // bailed; the hook re-injected its RAW nudge as a user entry (no wrapper).
    // The classifier must exclude the raw nudge by body, keeping the anchor at
    // "continue" with the engine call after it -> NOT conversational -> BLOCK.
    const tp = seedTranscriptEntries(proj, "claude", [
      { kind: "human", text: "continue" },
      { kind: "bash", command: "bun .claude/tools/amadeus-orchestrate.ts next" },
      { kind: "userText", text: RAW_NUDGE },
    ]);
    const r = runHook(
      proj,
      JSON.stringify({ stop_hook_active: false, transcript_path: tp }),
      "run-stage",
    );
    expect(r.rc).toBe(0);
    expect((JSON.parse(r.out) as { decision?: string }).decision).toBe("block");
  }, 30000);

  test("(i) Codex: a RAW continuation body (no wrapper) does NOT reset the human anchor; the engaged turn still BLOCKS", () => {
    const proj = makeProject();
    seedActive(proj, "requirements-analysis");
    // The codex reader applies the same isInjectedHookFeedback raw-body guard
    // (amadeus-stop.ts:652), so the raw nudge is excluded there too.
    const tp = seedTranscriptEntries(proj, "codex", [
      { kind: "human", text: "continue" },
      { kind: "bash", command: "bun .codex/tools/amadeus-orchestrate.ts next" },
      { kind: "userText", text: RAW_NUDGE },
    ]);
    const r = runHook(
      proj,
      JSON.stringify({ stop_hook_active: false, transcript_path: tp }),
      "run-stage",
    );
    expect(r.rc).toBe(0);
    expect((JSON.parse(r.out) as { decision?: string }).decision).toBe("block");
  }, 30000);

  test.each([
    "bun .claude/tools/amadeus-utility.ts migrate --apply",
    "bun .claude/tools/amadeus-migrate.ts --from 'aidlc source' --apply",
  ])(
    "(j) a completed migration command is a one-shot terminal Stop carve-out: %s",
    (command) => {
      const proj = makeProject();
      seedActive(proj, "requirements-analysis");
      const sessionId = `migration-${command.includes("utility") ? "utility" : "core"}`;
      const before = projectSnapshot(proj);

      const postTool = runRuntimeCompileHook(proj, command, sessionId);
      expect(postTool.rc).toBe(0);
      const terminalStop = runHook(
        proj,
        JSON.stringify({ stop_hook_active: false, session_id: sessionId }),
        "run-stage",
      );
      expect(terminalStop.rc).toBe(0);
      expect(terminalStop.out).toBe("");
      expect(projectSnapshot(proj)).toBe(before);
      expect(existsSync(join(seededRecordDir(proj), "runtime-graph.json"))).toBe(false);
      expect(
        existsSync(join(seededRecordDir(proj), ".amadeus-hooks-health", "runtime-compile.last")),
      ).toBe(false);
      expect(
        existsSync(join(seededRecordDir(proj), ".amadeus-hooks-health", "stop.last")),
      ).toBe(false);

      const nextStop = runHook(
        proj,
        JSON.stringify({ stop_hook_active: false, session_id: sessionId }),
        "run-stage",
      );
      expect(nextStop.rc).toBe(0);
      expect((JSON.parse(nextStop.out) as { decision?: string }).decision).toBe(
        "block",
      );
    },
    30000,
  );

  test.each(["absent destination", "installer seed"])(
    "(j) migration PostToolUse → Stop preserves a pristine %s project snapshot",
    (target) => {
      const proj = mkdtempSync(join(tmpdir(), "t121-migration-pristine-"));
      try {
        if (target === "installer seed") {
          mkdirSync(join(proj, "amadeus", ".installer"), { recursive: true });
          writeFileSync(
            join(proj, "amadeus", ".installer", "amadeus-setup-manifest.json"),
            '{"schemaVersion":1}\n',
            "utf-8",
          );
          mkdirSync(join(proj, "amadeus", "spaces", "default", "memory"), {
            recursive: true,
          });
          writeFileSync(
            join(proj, "amadeus", "spaces", "default", "memory", "org.md"),
            "# Installer seed\n",
            "utf-8",
          );
        }
        const before = projectSnapshot(proj);
        const sessionId = `migration-pristine-${target.replaceAll(" ", "-")}`;
        expect(
          runRuntimeCompileHook(
            proj,
            "bun .claude/tools/amadeus-utility.ts migrate --apply",
            sessionId,
          ).rc,
        ).toBe(0);
        const stop = runHook(
          proj,
          JSON.stringify({ stop_hook_active: false, session_id: sessionId }),
          "run-stage",
        );
        expect(stop.rc).toBe(0);
        expect(stop.out).toBe("");
        expect(projectSnapshot(proj)).toBe(before);
      } finally {
        rmSync(proj, { recursive: true, force: true });
      }
    },
    30000,
  );

  test("(j) migration latch cannot be consumed by another session and missing ids fail closed", () => {
    const proj = makeProject();
    seedActive(proj, "requirements-analysis");

    expect(
      runRuntimeCompileHook(
        proj,
        "bun .claude/tools/amadeus-utility.ts migrate --apply",
        "session-a",
      ).rc,
    ).toBe(0);
    const otherSession = runHook(
      proj,
      JSON.stringify({ stop_hook_active: false, session_id: "session-b" }),
      "run-stage",
      "8",
    );
    expect((JSON.parse(otherSession.out) as { decision?: string }).decision).toBe(
      "block",
    );
    const ownerSession = runHook(
      proj,
      JSON.stringify({ stop_hook_active: false, session_id: "session-a" }),
      "run-stage",
    );
    expect(ownerSession.out).toBe("");

    expect(
      runRuntimeCompileHook(
        proj,
        "bun .claude/tools/amadeus-utility.ts migrate --apply",
      ).rc,
    ).toBe(0);
    const missingSession = runHook(
      proj,
      JSON.stringify({ stop_hook_active: false }),
      "run-stage",
      "8",
    );
    expect((JSON.parse(missingSession.out) as { decision?: string }).decision).toBe(
      "block",
    );
  }, 30000);

  // =========================================================================
  // (k) MACHINE-INJECTED TURN EXCLUSION (#755). The tier-3 conversational
  // carve-out reads the ending turn's user prompt as the human anchor. But
  // agmsg task-notifications and teammate-message inbox deliveries arrive as
  // user-role transcript entries too, so without excluding them a machine turn
  // would masquerade as "the human chatting" and wrongly ALLOW the stop. The
  // classifier now skips any entry matching the shared MACHINE_INJECTED_TURN_
  // MARKERS catalog in BOTH readers, mirroring the isInjectedHookFeedback guard.
  // Each BLOCK case uses a FRESH makeProject() (interactive cap 2).
  // =========================================================================

  test("(j) a teammate-message injected turn does NOT reset the human anchor; the engaged turn still BLOCKS (Claude)", () => {
    const proj = makeProject();
    seedActive(proj, "requirements-analysis");
    // Real human prompt "continue"; conductor engaged the engine (bare next) then
    // a machine-injected teammate-message turn landed as the last user entry.
    // Pre-fix that machine turn would become the anchor with no engine call after
    // -> ALLOW (wrong). Excluded, the anchor stays "continue" with a next after
    // it -> NOT conversational -> BLOCK.
    const tp = seedTranscriptEntries(proj, "claude", [
      { kind: "human", text: "continue" },
      { kind: "bash", command: "bun .claude/tools/amadeus-orchestrate.ts next" },
      { kind: "userText", text: TEAMMATE_INJECTED_TURN },
    ]);
    const r = runHook(
      proj,
      JSON.stringify({ stop_hook_active: false, transcript_path: tp }),
      "run-stage",
    );
    expect(r.rc).toBe(0);
    expect((JSON.parse(r.out) as { decision?: string }).decision).toBe("block");
  }, 30000);

  for (const [formName, injectedTurn] of MACHINE_INJECTED_TURNS) {
    for (const format of ["claude", "codex"] as const) {
      test(`(j) ${format}: ${formName} as the only user turn is NOT conversational -> BLOCK`, () => {
        const proj = makeProject();
        seedActive(proj, "requirements-analysis");
        // No genuine human prompt at all. Excluding the machine turn leaves no
        // anchor, so the cap-bounded BLOCK stands in both transcript readers.
        const tp = seedTranscriptEntries(proj, format, [
          { kind: "userText", text: injectedTurn },
          { kind: "text" },
        ]);
        const r = runHook(
          proj,
          JSON.stringify({ stop_hook_active: false, transcript_path: tp }),
          "run-stage",
        );
        expect(r.rc).toBe(0);
        expect((JSON.parse(r.out) as { decision?: string }).decision).toBe("block");
      }, 30000);
    }
  }
});
