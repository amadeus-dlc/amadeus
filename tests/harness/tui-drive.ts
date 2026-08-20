// tui-drive.ts — drive an interactive TUI (e.g. `claude`) and SEE what a real
// user sees in the terminal — statusline, prompts, slash-command output —
// without headless (`--print`) mode.
//
// Test harness / dev-only tooling. Lives in tests/harness/ beside its SDK
// sibling sdk-drive.ts (logic vs render), assert.ts, and fixtures.ts — NOT in
// the shipped dist/claude/.claude/tools/ distributable. (Relocated from
// the repo-root tools/amadeus-tui-drive.ts spike; the amadeus- prefix is dropped to
// match sdk-drive.ts.)
//
// This is the deterministic half of the harness ("three concerns, three
// mechanisms": the send/capture/assert loop is a tool; the thing it drives
// is the LLM-under-test). It does no reasoning — it scripts keystrokes and
// pattern-matches the rendered pane.
//
// ---------------------------------------------------------------------------
// One backend, one subcommand surface (D-TUI-2).
//
//   tmux → A detached session lives in the tmux server, so each subcommand
//          invocation (start/send/capture/wait/kill) is a fresh process that
//          re-attaches to the server-side session by name. Proven; byte-for-byte
//          the behaviour of the original tools/amadeus-tui-drive.ts spike.
//
// Subcommands:
//   start  --session <name> --cwd <dir> [--width N] [--height N] -- <cmd...>
//          Launch <cmd> in a fresh session of a fixed size.
//   send   --session <name> --keys "<text>" [--literal] [--no-enter]
//          Type keys into the session (Enter appended unless --no-enter).
//          --literal sends the string verbatim for free text / slash commands;
//          omit it for named keys (Enter, Down, C-c).
//   wait   --session <name> --pattern <regex> [--timeout-ms N] [--stable-ms N]
//          Poll the captured grid until <regex> appears. With --stable-ms > 0 the
//          screen must also be unchanged for that long (use for static menus
//          / prompts). With --stable-ms 0 it matches the instant the pattern
//          appears (use when the screen is actively streaming — the statusline
//          token counter / spinner means it never goes byte-stable).
//          Exits 0 on match, 1 on timeout.
//   capture --session <name> [--ansi]
//          Print the current pane (plain text; --ansi keeps colour escapes).
//   kill   --session <name>
//          Kill the session (idempotent).
//   answer-gate --session <name> --project-dir <dir>
//          [--per-gate-timeout-ms N] [--overall-timeout-ms N]
//          [--until-file <relpath>] [--until-state-field <name=regex>]
//          [--reject-first-gate]
//          Answer an AI-DLC AskUserQuestion gate sequence by taking the
//          Recommended default on each tab/menu (Enter per tab; Enter again on
//          the Submit screen), terminating on an ON-DISK signal — never on the
//          screen (§3, D-TUI-3).
//            --reject-first-gate           On the FIRST approval gate (a single-
//                                          select menu containing "Request
//                                          Changes"), select that option instead of
//                                          "Approve" (Down → Enter), then supply the
//                                          free-text revision feedback the
//                                          orchestrator asks for next, then revert to
//                                          approve-only — drives one reject→revise→
//                                          approve cycle (t128 revision-loop). The
//                                          "Request changes" label distinguishes the
//                                          gate from the clarifying-question menus
//                                          that precede it.
//          The TERMINATOR is pluggable so the SAME keystroke loop drives ANY gated
//          journey, not just the workshop:
//            --until-file <relpath>        STOP when this file (relative to
//                                          --project-dir; a `*` globs one segment)
//                                          exists & is non-empty — e.g. a stage's
//                                          intent-statement or filled questions file.
//            --until-state-field <n=re>    STOP when amadeus-state.md's `- **<n>**:`
//                                          line value matches /re/ — e.g.
//                                          `Status=Completed`.
//            (neither)                     STOP on the practices-affirmation
//                                          timestamp (the workshop default;
//                                          existing callers unchanged).
//          It only drives capture + send. The
//          screen DETECTS a waiting menu; the disk signal TERMINATES the loop (the
//          transcript is not a leading event bus — §1.1). The per-gate/overall
//          timeouts are HANG BACKSTOPS: on expiry it ERRORs loud (exit 1), never
//          "concludes done".
//
// Exit codes: 0 success, 1 wait-timeout / assertion miss, 2 usage/spawn error.

import { scaleTestTime } from "../lib/test-time-factor.ts";
import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { stateFilePathFor } from "./sdk-drive.ts";

const POLL_INTERVAL_BASE_MS = 150;
const DEFAULT_TIMEOUT_BASE_MS = 30_000;
const DEFAULT_STABLE_MS = 600;
const DEFAULT_TUI_SETTING_SOURCES = "project";
const DEFAULT_ANSWER_GATE_TRACE_POLL_BASE_MS = 10_000;

type Args = {
  positionals: string[];
  flags: Record<string, string>;
  bools: Record<string, boolean>;
  rest: string[]; // everything after a literal `--`
};

export function resolveTuiWaitTiming(
  timeoutBaseMs: number,
  pollBaseMs: number,
  stableBaseMs: number,
): { timeoutMs: number; pollMs: number; stableMs: number } {
  return {
    timeoutMs: scaleTestTime(timeoutBaseMs),
    pollMs: scaleTestTime(pollBaseMs),
    stableMs: stableBaseMs <= 0 ? stableBaseMs : scaleTestTime(stableBaseMs),
  };
}

function parseArgs(argv: string[]): Args {
  const flags: Record<string, string> = {};
  const bools: Record<string, boolean> = {};
  const positionals: string[] = [];
  let rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (tok === "--") {
      rest = argv.slice(i + 1);
      break;
    }
    if (tok.startsWith("--")) {
      const key = tok.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        bools[key] = true;
      } else {
        flags[key] = next;
        i++;
      }
    } else {
      positionals.push(tok);
    }
  }
  return { positionals, flags, bools, rest };
}

function fail(msg: string, code = 2): never {
  process.stderr.write(`tui-drive: ${msg}\n`);
  process.exit(code);
}

function safeTraceName(s: string): string {
  return s.replace(/[^A-Za-z0-9._-]/g, "_");
}

function tuiTracePath(session: string): string | undefined {
  if (process.env.AMADEUS_TUI_TRACE_FILE) return process.env.AMADEUS_TUI_TRACE_FILE;
  if (process.env.AMADEUS_TEST_DEBUG === "true" && process.env.AMADEUS_TEST_LOG_DIR) {
    return join(process.env.AMADEUS_TEST_LOG_DIR, `tui-drive-${safeTraceName(session)}.ndjson`);
  }
  return undefined;
}

function writeTuiTrace(
  session: string,
  event: string,
  data: Record<string, unknown>,
): void {
  const tracePath = tuiTracePath(session);
  if (!tracePath) return;
  mkdirSync(dirname(tracePath), { recursive: true });
  appendFileSync(
    tracePath,
    `${JSON.stringify({ ts: new Date().toISOString(), session, event, ...data })}\n`,
  );
}

function requireFlag(a: Args, name: string): string {
  const v = a.flags[name];
  if (!v) fail(`missing required --${name}`);
  return v;
}

function commandBasename(file: string): string {
  return (file.replaceAll("\\", "/").split("/").pop() ?? file).toLowerCase();
}

// Every basename the Claude CLI launches under. npm-on-Windows installs
// `claude.cmd` (and a `claude.ps1` shim) alongside the bare `claude`; missing
// them here would fail OPEN — the command returns unchanged and user-level
// settings leak into a supposedly isolated live TUI run.
const CLAUDE_BASENAMES = new Set(["claude", "claude.exe", "claude.cmd", "claude.ps1"]);

function hasSettingSourcesArg(command: string[]): boolean {
  return command.some((arg) => arg === "--setting-sources" || arg.startsWith("--setting-sources="));
}

function tuiSettingSources(env: NodeJS.ProcessEnv = process.env): string | null {
  const configured = env.AMADEUS_TUI_SETTING_SOURCES;
  const value = configured === undefined
    ? DEFAULT_TUI_SETTING_SOURCES
    : configured.trim();
  if (value === "" || value === "default") return null;
  return value;
}

/**
 * Keep live TUI runs isolated from developer/user-level Claude settings and
 * hooks by default, mirroring sdk-drive's `settingSources: ["project"]`.
 * Explicit command flags win, and AMADEUS_TUI_SETTING_SOURCES=default opts a
 * focused calibration run back into Claude CLI defaults.
 */
export function normalizeTuiCommand(
  command: string[],
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  if (command.length === 0) return command;
  const exe = commandBasename(command[0]);
  if (!CLAUDE_BASENAMES.has(exe)) return command;
  if (hasSettingSourcesArg(command)) return command;

  const settingSources = tuiSettingSources(env);
  if (!settingSources) return command;

  return [command[0], "--setting-sources", settingSources, ...command.slice(1)];
}

function answerGateTracePollMs(): number {
  const raw = Number(process.env.AMADEUS_TUI_TRACE_POLL_MS ?? DEFAULT_ANSWER_GATE_TRACE_POLL_BASE_MS);
  if (!Number.isFinite(raw) || raw <= 0) return scaleTestTime(DEFAULT_ANSWER_GATE_TRACE_POLL_BASE_MS);
  return scaleTestTime(Math.max(1_000, raw));
}

// A small promise-based sleep for polling and input-settle delays.
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Backend contract. The CLI uses tmux; tests inject the same four-operation
// boundary in-process so command routing is not hidden behind a subprocess.
// ---------------------------------------------------------------------------

export interface Backend {
  start(session: string, cwd: string, width: number, height: number, cmd: string[]): void;
  send(session: string, keys: string, literal: boolean, noEnter: boolean): void;
  capture(session: string, ansi: boolean): string;
  kill(session: string): void;
}

type TmuxResult = { code: number; stdout: string; stderr: string };
export type TmuxRunner = (args: string[]) => TmuxResult;

// ---------------------------------------------------------------------------
// tmux backend (darwin / linux).
// ---------------------------------------------------------------------------

// PRIVATE tmux server socket — the harness runs on its OWN tmux server, never
// the default one the developer's interactive shell is attached to. Without this
// (`spawnSync("tmux", args)` with no `-L`), every harness new-session/kill-session
// lands on the DEFAULT server alongside the user's live session — so server-level
// resource pressure, or a kill targeting a stale name, can take down the session
// the developer is working in (observed: crashes that needed a restart). A fixed
// private label isolates all harness sessions onto a dedicated server; the serial
// tui tests share that one private server among themselves (they already run
// serially), and it can never touch the default server. Override with
// AMADEUS_TUI_TMUX_SOCKET if a test needs its own server. The socket name is stable
// across the per-subcommand driver invocations (start/send/capture/kill are
// separate processes that must reach the SAME server), so it is NOT per-PID.
const TMUX_SOCKET = process.env.AMADEUS_TUI_TMUX_SOCKET || "amadeus-tui";

// The environment a tmux CLIENT invocation runs with. AMADEUS_TEST_NAME is
// stripped: the first client invocation daemonizes the private tmux SERVER,
// which the serial tui tests then share across files by design. The runner's
// per-file leak marker (#1982) must not survive into that shared substrate, or
// the leak gate would flag — and reap — the server as a leak of whichever file
// happened to start it.
export function tmuxClientEnv(base: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const env = { ...base };
  delete env.AMADEUS_TEST_NAME;
  return env;
}

function tmux(args: string[]): { code: number; stdout: string; stderr: string } {
  // `-L <socket>` MUST precede the tmux command; it selects the private server.
  const r = spawnSync("tmux", ["-L", TMUX_SOCKET, ...args], { encoding: "utf-8", env: tmuxClientEnv() });
  return { code: r.status ?? 1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

export function createTmuxBackend(runTmux: TmuxRunner = tmux): Backend {
  return {
    start(session, cwd, width, height, cmd) {
      if (cmd.length === 0) fail("no command after `--` to run in the session");

      // Kill any stale session of the same name first (idempotent start).
      runTmux(["kill-session", "-t", session]);

      // Build a single shell command so cwd + the target command run in one PTY.
      // We cd then exec so the child replaces the shell (clean kill semantics).
      const inner = cmd.map((s) => `'${s.replaceAll("'", "'\\''")}'`).join(" ");
      const shellCmd = `cd '${cwd.replaceAll("'", "'\\''")}' && exec ${inner}`;

      const r = runTmux([
        "new-session",
        "-d",
        "-s",
        session,
        "-x",
        String(width),
        "-y",
        String(height),
        "bash",
        "-lc",
        shellCmd,
      ]);
      if (r.code !== 0) fail(`new-session failed: ${r.stderr.trim()}`);
      process.stdout.write(`started session '${session}' (${width}x${height})\n`);
    },

    send(session, keys, literal, noEnter) {
      // --literal (-l) sends the string verbatim, so free text containing spaces
      // or words that collide with tmux key names ("Enter", "Space", "C-c") is
      // typed as-is rather than interpreted. Use it for prompts / slash commands;
      // omit it for named keys (Enter, Down, C-c).
      const sendArgs = ["send-keys", "-t", session];
      if (literal) sendArgs.push("-l");
      sendArgs.push(keys);
      const r = runTmux(sendArgs);
      if (r.code !== 0) fail(`send-keys failed: ${r.stderr.trim()}`, 1);
      if (!noEnter) {
        runTmux(["send-keys", "-t", session, "Enter"]);
      }
    },

    capture(session, ansi) {
      // -p print to stdout, -J join wrapped lines, -e keep escapes (ansi mode).
      const args = ["capture-pane", "-t", session, "-p", "-J"];
      if (ansi) args.push("-e");
      const r = runTmux(args);
      if (r.code !== 0) fail(`capture-pane failed: ${r.stderr.trim()}`, 1);
      return r.stdout;
    },

    kill(session) {
      runTmux(["kill-session", "-t", session]); // idempotent; ignore errors
    },
  };
}

// ---------------------------------------------------------------------------
// Subcommands. `wait`'s polling loop lives here so its --stable-ms semantics
// remain independent from tmux command execution (§2.3).
// ---------------------------------------------------------------------------

function cmdStart(backend: Backend, a: Args): void {
  const session = requireFlag(a, "session");
  const cwd = requireFlag(a, "cwd");
  const width = Number(a.flags.width ?? "120");
  const height = Number(a.flags.height ?? "40");
  const command = normalizeTuiCommand(a.rest);
  writeTuiTrace(session, "start", {
    cwd,
    width,
    height,
    command,
    requestedCommand: command.join("\0") === a.rest.join("\0") ? undefined : a.rest,
  });
  backend.start(session, cwd, width, height, command);
}

function cmdSend(backend: Backend, a: Args): void {
  const session = requireFlag(a, "session");
  const keys = requireFlag(a, "keys");
  writeTuiTrace(session, "send", {
    keys,
    literal: a.bools.literal === true,
    noEnter: a.bools["no-enter"] === true,
  });
  backend.send(session, keys, a.bools.literal === true, a.bools["no-enter"] === true);
}

async function cmdWait(backend: Backend, a: Args): Promise<void> {
  const session = requireFlag(a, "session");
  const pattern = requireFlag(a, "pattern");
  const timing = resolveTuiWaitTiming(
    Number(a.flags["timeout-ms"] ?? DEFAULT_TIMEOUT_BASE_MS),
    POLL_INTERVAL_BASE_MS,
    Number(a.flags["stable-ms"] ?? DEFAULT_STABLE_MS),
  );
  const { timeoutMs, pollMs, stableMs } = timing;
  const re = new RegExp(pattern);
  writeTuiTrace(session, "wait_start", { pattern, timeoutMs, stableMs });

  const deadline = Date.now() + timeoutMs;
  let prev = "";
  let stableSince = 0;

  while (Date.now() < deadline) {
    const screen = backend.capture(session, false);
    const now = Date.now();
    if (screen === prev) {
      if (stableSince === 0) stableSince = now;
    } else {
      stableSince = 0;
      prev = screen;
    }
    // stableMs <= 0 means "match the instant the pattern appears" — no
    // stability requirement. This is essential when asserting against a
    // screen that is actively streaming (the statusline has a live token
    // counter / spinner, so the whole screen never goes byte-stable).
    // stableMs > 0 waits for the screen to settle — use it for menus /
    // prompts that are static while awaiting input.
    const stable =
      stableMs <= 0 || (stableSince !== 0 && now - stableSince >= stableMs);
    if (re.test(screen) && stable) {
      writeTuiTrace(session, "wait_match", {
        pattern,
        stableMs,
        screen,
      });
      process.stdout.write(`matched /${pattern}/ (stable ${stableMs}ms)\n`);
      return;
    }
    await sleep(pollMs);
  }
  writeTuiTrace(session, "wait_timeout", {
    pattern,
    timeoutMs,
    stableMs,
    screen: prev,
  });
  process.stderr.write(
    `tui-drive: timed out after ${timeoutMs}ms waiting for /${pattern}/\n` +
      `---- last pane ----\n${prev}\n-------------------\n`,
  );
  process.exit(1);
}

function cmdCapture(backend: Backend, a: Args): void {
  const session = requireFlag(a, "session");
  const ansi = a.bools.ansi === true;
  const screen = backend.capture(session, ansi);
  writeTuiTrace(session, "capture", { ansi, screen });
  process.stdout.write(screen);
}

function cmdKill(backend: Backend, a: Args): void {
  const session = requireFlag(a, "session");
  writeTuiTrace(session, "kill", {});
  backend.kill(session);
  process.stdout.write(`killed session '${session}'\n`);
}

// ---------------------------------------------------------------------------
// answer-gate — the shared AskUserQuestion answer loop (§3, D-TUI-3).
//
// The loop uses only capture + send. It is the value of the whole exercise —
// the per-tab Enter loop proven in tmp/auq-loop.sh, made reusable.
//
// Detection is SCREEN-based (the `Enter to select` / `Submit answers` footer on
// the captured grid); termination is the ON-DISK affirmation timestamp. The
// transcript JSONL is NOT a leading event bus (the AUQ tool_use is written on
// RESOLUTION, not presentation — §1.1), so an event-driven detect-loop would
// deadlock. Disk is the terminator; the screen only tells us WHEN to press Enter.
// ---------------------------------------------------------------------------

// Read the active intent record's amadeus-state.md and report whether practices affirmation has
// committed. The DIGIT-ANCHORED same-line regex is load-bearing: a greedy
// `\s*(\S.*)` bleeds past an EMPTY field into the next heading
// (`## Scope Configuration`), a false-positive that bailed a run at 57s during
// the spike. Anchoring on `\d` requires a real value (an ISO timestamp starts
// with a year digit), so an unfilled `- **Practices Affirmed Timestamp**:` line
// reads as not-yet-affirmed.
const AFFIRMED_RE = /Affirmed Timestamp\*\*:[ \t]*(\d[^\r\n]*)/;

function affirmedOnDisk(projectDir: string): boolean {
  const statePath = stateFilePathFor(projectDir);
  if (!existsSync(statePath)) return false;
  let md: string;
  try {
    md = readFileSync(statePath, "utf8");
  } catch {
    return false;
  }
  const m = AFFIRMED_RE.exec(md);
  return m !== null && m[1].trim().length > 0;
}

// A terminator answers the only question the answer-gate loop needs: "has the
// journey reached the on-disk signal that means STOP answering?" The workshop
// journey's signal is the practices-affirmation timestamp (default). Other
// journeys land a different artifact — a stage's questions/answer file, an
// intent-statement, a memory.md, a state field reaching a value. So the
// terminator is PLUGGABLE: a test names its journey's real on-disk completion
// signal, and the SAME keystroke loop (Enter = Recommended per menu) drives ANY
// gated journey to it. This is the generalisation of the workshop-only affirmed
// terminator — the keystroke STRATEGY was always journey-agnostic; only the
// TERMINATOR was hardcoded.
//
// Flags (all relative to --project-dir; the affirmation default holds when none
// is given, so existing callers are unchanged):
//   --until-file <relpath>          terminate when this file exists & is non-empty
//                                   (a glob segment `*` matches within one dir level)
//   --until-state-field <name=re>   terminate when amadeus-state.md's
//                                   `- **<name>**:` line matches the regex <re>
//   (none)                          terminate on the practices-affirmation timestamp
type Terminator = { describe: string; done: () => boolean };

// Does a relative path (optionally containing a single `*` glob in its last
// segment, or any segment) resolve to an existing, non-empty file under root?
function fileSignalMet(root: string, rel: string): boolean {
  // Walk the path segment by segment, expanding a `*` segment to its dir entries.
  let dirs = [root];
  const segs = rel.split("/").filter((s) => s.length > 0);
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    const isLast = i === segs.length - 1;
    const next: string[] = [];
    for (const d of dirs) {
      if (seg.includes("*")) {
        // glob this segment against the dir's entries
        let entries: string[] = [];
        try {
          entries = existsSync(d) ? readdirSync(d) : [];
        } catch {
          entries = [];
        }
        const re = new RegExp(
          `^${seg.replaceAll(".", "\\.").replaceAll("*", ".*")}$`,
        );
        for (const e of entries) {
          if (re.test(e)) next.push(join(d, e));
        }
      } else {
        next.push(join(d, seg));
      }
    }
    dirs = next;
    if (dirs.length === 0) return false;
    if (!isLast) {
      // keep only existing directories to descend into
      dirs = dirs.filter((p) => {
        try {
          return existsSync(p) && statSync(p).isDirectory();
        } catch {
          return false;
        }
      });
    }
  }
  // Any matched terminal path that is an existing, non-empty file = signal met.
  for (const p of dirs) {
    try {
      if (existsSync(p) && statSync(p).isFile() && statSync(p).size > 0) return true;
    } catch {
      // ignore
    }
  }
  return false;
}

function stateFieldSignalMet(projectDir: string, name: string, re: RegExp): boolean {
  const statePath = stateFilePathFor(projectDir);
  if (!existsSync(statePath)) return false;
  let md: string;
  try {
    md = readFileSync(statePath, "utf8");
  } catch {
    return false;
  }
  // Match the `- **<name>**: <value>` line, then test <value> against re.
  const fieldRe = new RegExp(
    `\\*\\*${name.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\*\\*:[ \\t]*([^\\r\\n]*)`,
  );
  const m = fieldRe.exec(md);
  if (m === null) return false;
  return re.test(m[1].trim());
}

function makeTerminator(projectDir: string, a: Args): Terminator {
  const untilFile = a.flags["until-file"];
  const untilField = a.flags["until-state-field"];
  if (untilFile) {
    return {
      describe: `file '${untilFile}' exists & non-empty`,
      done: () => fileSignalMet(projectDir, untilFile),
    };
  }
  if (untilField) {
    const eq = untilField.indexOf("=");
    if (eq <= 0) {
      fail(`--until-state-field expects <name>=<regex>, got '${untilField}'`, 2);
    }
    const name = untilField.slice(0, eq);
    const reStr = untilField.slice(eq + 1);
    const re = new RegExp(reStr);
    return {
      describe: `state field '${name}' matches /${reStr}/`,
      done: () => stateFieldSignalMet(projectDir, name, re),
    };
  }
  return {
    describe: "practices-affirmation timestamp committed",
    done: () => affirmedOnDisk(projectDir),
  };
}

// The AUQ highlighted-option caret can render as `❯` (U+276F) or ASCII `>`.
//
// We match the caret ONLY when it precedes a numbered option (`❯ 1.` / `> 1.`), which
// is what AUQ paints on its highlighted row. This is the load-bearing reason a bare
// `>` is SAFE here: the claude input prompt line is also `>` (`> /amadeus feature`,
// `> `), but it is NEVER followed by `<digit>.`, so it cannot satisfy this pattern.
// Anchored per-line so the prompt elsewhere on screen can't bleed in.
const AUQ_CARET_OPTION = /^\s*(?:❯|>)\s+\d+\.\s/m;
function gridHasCaret(grid: string): boolean {
  return AUQ_CARET_OPTION.test(grid);
}

// Is a waiting AskUserQuestion menu painted on the grid right now? A menu shows
// the highlighted-default caret (`❯` or `>`; see gridHasCaret) on a numbered
// option AND a footer. CRITICAL: the Submit screen
// DROPS the `Enter to select` footer and shows `Submit answers` instead — a
// footer-only waiter sails past Submit and hangs forever (cost a full macOS run
// during the spike). So we accept EITHER footer.
export function gridHasMenu(grid: string): boolean {
  return gridHasCaret(grid) && (grid.includes("Enter to select") || grid.includes("Submit answers"));
}

// Is the gate currently on the multi-tab AUQ's final SUBMIT screen? That screen
// drops the per-question UI for a confirm widget (`confirmLabel:"Submit answers"`,
// verified in the claude bundle) — `❯ 1. Submit answers / 2. Cancel` under "Ready
// to submit your answers?". Enter on it commits the WHOLE form (verified live). The
// option label "Submit answers" is unique to this screen (the tab STRIP only ever
// shows the short "Submit" label), so it is the reliable signal.
function gridIsSubmitScreen(grid: string): boolean {
  return grid.includes("Submit answers");
}

// Is the painted question a MULTI-SELECT ("select all that apply")? The AUQ key
// model, confirmed from the claude bundle AND by live single-keystroke probing of
// the real widget (2026-06-06):
//   - single-select option: Enter SELECTS the highlighted option and auto-advances
//     (`chord:"enter" action:"select"`).
//   - multi-select option:  Space TOGGLES the highlighted option (`chord:"space"
//     action:"toggle"`). Enter ALSO toggles it — so a Space-then-Enter pair nets to
//     zero and the gate never advances (the t73 1409-answer / 14.5min hang: the loop
//     toggled `[ ]`↔`[✔]` forever). A multi-tab form is advanced with the ARROW keys
//     (`"Tab/Arrow keys to navigate"`, rendered only when there is >1 tab); the
//     toggled selection PERSISTS across the navigation (verified live).
// We detect a multi-select question by the checkbox markers it paints on its OPTION
// lines only — `❯ 1. [ ] Option` / `  2. [✔] Option` (some terminal paths paint
// the selected marker as `x`). We deliberately do NOT key off the prose "select all that
// apply" (it echoes on the Submit review screen) nor the tab-strip `☐`/`☒` glyphs
// (present on EVERY tab, single-select ones included) — both misfire.
function gridIsMultiSelect(grid: string): boolean {
  return /\d+\.\s*\[[ xX✔]\]/.test(grid); // a numbered option line carrying a checkbox
}

// Is this a MULTI-TAB AUQ form (more than one question batched into one gate)? Such
// a form paints a tab strip with the `←` / `→` navigation affordances at its ends
// (e.g. `←  ☒ Success / scope  ☐ Trigger  ☐ Constraints  ✔ Submit  →`) and ends in a
// Submit tab. A lone single-question gate paints no such strip. This decides how a
// multi-select tab is left: a multi-tab form advances with the ARROW key (the toggle
// persists across tabs — verified live); a single-question multi-select has no other
// tab to move to, so it commits with Enter once toggled.
function gridIsMultiTabForm(grid: string): boolean {
  return grid.includes("←") && grid.includes("→");
}

// Parse the numbered options off a painted single-select menu, in screen order.
// Returns `[{ num, label }]` for every `❯ 1. Label` / `  2. Label` line (the
// caret-or-blank prefix, a number, a dot, then the label). The option's
// continuation/description lines (indented prose under it) are ignored — we key
// off the numbered headers only. Used to choose an option by its label content
// rather than a hard-coded ordinal, so the driver reacts to what the engine
// actually rendered.
function parseMenuOptions(grid: string): { num: number; label: string }[] {
  const out: { num: number; label: string }[] = [];
  for (const line of grid.split("\n")) {
    const m = /^\s*(?:❯|>)?\s*(\d+)\.\s+(.*\S)\s*$/.exec(line);
    if (m) out.push({ num: Number(m[1]), label: m[2].trim() });
  }
  return out;
}

function pickMenuOption(grid: string, label: RegExp): number | null {
  for (const opt of parseMenuOptions(grid)) {
    if (label.test(opt.label)) return opt.num;
  }
  return null;
}

async function chooseNumberedMenuOption(
  backend: Backend,
  session: string,
  optionNum: number,
): Promise<void> {
  for (let i = 1; i < optionNum; i++) {
    backend.send(session, "Down", false, true);
    await sleep(scaleTestTime(120));
  }
  backend.send(session, "Enter", false, true);
}

const REVISION_FEEDBACK =
  "Update architecture.md to add a Persistence Design (Target State) section with hydrate-on-mount and write-on-change localStorage flow, plus corrupt JSON and quota-error handling.";

function gridLooksLikeRevisionTypeMenu(grid: string): boolean {
  if (!gridHasMenu(grid)) return false;
  return /what would you like changed|request(?:ed)? changes|reverse-engineering artifacts/i.test(grid);
}

export function pickRevisionTypeSomethingOption(grid: string): number | null {
  if (!gridLooksLikeRevisionTypeMenu(grid)) return null;
  return pickMenuOption(grid, /^type something\.?$/i);
}

function gridLooksLikeRevisionFreeTextPrompt(grid: string): boolean {
  return /which artifact needs fixing|what(?:'|’)s wrong with it|tell me the file/i.test(grid);
}

// After "Request changes" on an approval gate, the v0.6.0 engine no longer asks
// for revision feedback as FREE TEXT. It paints a RECOVERY MENU (verified live
// 2026-06-09) — e.g. `1. Actually approve & continue` (which UN-rejects), then
// real revise directives (`2. Narrow root cause…`, `3. Drop … steer`, `4. Add
// more detail`), plus generic `Type something` / `Chat about this` trailers.
// Picking the right option is what makes `reject --feedback` fire (Revision
// Count++); option 1 silently records approval and the reject never takes.
//
// A Request Changes choice can also live inside a multi-tab form with later tabs
// (for example the stage learnings tab) and a final Submit screen. Those
// intermediate tabs are still the original form, not the revision recovery menu,
// so they must return null and let answer-gate submit the form first.
// This returns the option number of the FIRST genuine revision directive — the
// lowest-numbered option that is NOT the approve/cancel/type/chat escape
// hatches — or null when no such menu is painted (the engine asked free text).
export function pickRevisionOption(grid: string): number | null {
  if (!gridHasMenu(grid)) return null;
  if (gridIsSubmitScreen(grid) || gridIsMultiSelect(grid) || gridIsMultiTabForm(grid)) {
    return null;
  }
  const options = parseMenuOptions(grid);
  const RECOVERY_ESCAPE =
    /(actually approve|approve & continue|approve and continue|didn't mean to reject|nevermind|never mind)/i;
  if (!options.some((opt) => RECOVERY_ESCAPE.test(opt.label))) return null;
  const NON_REVISE =
    /(actually approve|approve & continue|approve and continue|didn't mean to reject|cancel|type something|chat about|nevermind|never mind|^none(?:\s*\(recommended\))?$)/i;
  for (const opt of options) {
    if (!NON_REVISE.test(opt.label)) return opt.num;
  }
  return null;
}

async function handleRevisionRecovery(
  backend: Backend,
  session: string,
  answered: number,
): Promise<boolean> {
  const recoveryDeadline = Date.now() + scaleTestTime(60_000);
  while (Date.now() < recoveryDeadline) {
    await sleep(scaleTestTime(POLL_INTERVAL_BASE_MS));
    const after = backend.capture(session, false);
    const typeSomethingNum = pickRevisionTypeSomethingOption(after);
    if (typeSomethingNum !== null) {
      await chooseNumberedMenuOption(backend, session, typeSomethingNum);
      writeTuiTrace(session, "answer_gate_action", {
        answered,
        action: "reject_choose_type_something",
        optionNum: typeSomethingNum,
        screen: after,
      });

      const promptDeadline = Date.now() + scaleTestTime(10_000);
      while (Date.now() < promptDeadline) {
        await sleep(scaleTestTime(POLL_INTERVAL_BASE_MS));
        const prompt = backend.capture(session, false);
        if (!gridHasMenu(prompt)) {
          backend.send(session, REVISION_FEEDBACK, true, true);
          await sleep(scaleTestTime(300));
          backend.send(session, "Enter", false, true);
          writeTuiTrace(session, "answer_gate_action", {
            answered,
            action: "reject_free_text_feedback",
            screen: prompt,
          });
          process.stdout.write("answer-gate: supplied free-text revision feedback\n");
          return true;
        }
      }
    }
    const reviseNum = pickRevisionOption(after);
    if (reviseNum !== null) {
      // Shape A: navigate the caret from option 1 down to the revise option,
      // then select it. (The caret starts on option 1 when the menu paints.)
      await chooseNumberedMenuOption(backend, session, reviseNum);
      writeTuiTrace(session, "answer_gate_action", {
        answered,
        action: "reject_pick_revision_option",
        optionNum: reviseNum,
        screen: after,
      });
      process.stdout.write(
        `answer-gate: chose revision option ${reviseNum} on the recovery menu\n`,
      );
      return true;
    }
    // No recovery menu painted yet. If the turn has gone quiet without a menu
    // for long enough, treat it as the free-text shape and supply feedback.
    if (
      gridLooksLikeRevisionFreeTextPrompt(after) ||
      (!gridHasMenu(after) && Date.now() > recoveryDeadline - scaleTestTime(50_000))
    ) {
      backend.send(session, REVISION_FEEDBACK, true, true);
      await sleep(scaleTestTime(300));
      backend.send(session, "Enter", false, true);
      writeTuiTrace(session, "answer_gate_action", {
        answered,
        action: "reject_free_text_feedback",
        screen: after,
      });
      process.stdout.write("answer-gate: supplied free-text revision feedback\n");
      return true;
    }
  }
  process.stdout.write(
    "answer-gate: WARNING — no recovery menu or free-text prompt resolved after reject; continuing\n",
  );
  return false;
}

async function cmdAnswerGate(backend: Backend, a: Args): Promise<void> {
  const session = requireFlag(a, "session");
  const projectDir = requireFlag(a, "project-dir");
  // The journey's pass condition is the ON-DISK terminator (--until-*); these
  // timeouts are pure HANG-BACKSTOPS, never budgets — a healthy run returns the
  // instant the disk signal lands, long before any timer.
  //
  // Per-gate timeout = how long to wait for the NEXT menu before declaring a wedge.
  // It deliberately DEFAULTS TO THE OVERALL DEADLINE (one backstop, not a per-stage
  // budget): a tight per-stage value is whack-a-mole — a subagent stage (reverse-
  // engineering) legitimately runs minutes with no menu, and runs SLOWER on a slower
  // box, so any fixed per-stage number eventually false-fires on a working run (it
  // killed t50's RE stage at 360s on a slower host, mid-work. Folding
  // it into the overall deadline means the only thing that can trip it is a genuine
  // wedge (nothing ever reaches the disk terminator), and bun's own test timeout is
  // the hard ceiling above it. An explicit --per-gate-timeout-ms still overrides for
  // the rare case that wants faster wedge-detection.
  const overallBaseMs = Number(a.flags["overall-timeout-ms"] ?? "600000");
  const perGateBaseMs = Number(a.flags["per-gate-timeout-ms"] ?? String(overallBaseMs));
  const overallMs = scaleTestTime(overallBaseMs);
  const perGateMs = scaleTestTime(perGateBaseMs);
  // The on-disk signal that means STOP answering — workshop affirmation by
  // default, or a journey-specific file/state-field via --until-* (see
  // makeTerminator). The keystroke strategy is the same for every journey;
  // only this terminator differs.
  const term = makeTerminator(projectDir, a);

  // --reject-first-gate: on the FIRST approval gate (a single-select menu whose
  // options include "Request changes"), select that option (Down → Enter) instead
  // of the Recommended "Approve" default, then revert to approve-only for the rest
  // of the run. This is the ONLY way to drive a reject→revise→approve cycle: the
  // gate must be distinguished from the clarifying-QUESTION menus that precede it
  // (which carry A–E option text, never "Request changes"), so a blind pre-loop
  // keystroke can't target it (it lands on a question — the t128 finding,
  // 2026-06-07). Keyed on the option label "Request changes"
  // (stage-protocol.md:42), the option unique to an approval gate. Once consumed,
  // the loop is approve-only, so the rejected stage re-presents its gate and gets
  // approved on the next pass — the full cycle, driven like a human.
  // Bare valueless flag → parseArgs stores it in `bools`, not `flags` (see how
  // --literal / --no-enter / --ansi are read). Reading a.flags here was the bug
  // that left this always-false (the t128 third-red finding, 2026-06-07).
  let rejectFirstGate = a.bools["reject-first-gate"] === true;
  let revisionFeedbackPending = false;

  const overallDeadline = Date.now() + overallMs;
  const tracePollMs = answerGateTracePollMs();
  let answered = 0;
  let lastPollTraceAt = 0;
  writeTuiTrace(session, "answer_gate_start", {
    projectDir,
    overallMs,
    perGateMs,
    terminator: term.describe,
    rejectFirstGate,
  });

  const maybeTracePoll = (grid: string, gateDeadline: number): void => {
    const now = Date.now();
    if (now - lastPollTraceAt < tracePollMs) return;
    lastPollTraceAt = now;
    writeTuiTrace(session, "answer_gate_poll", {
      answered,
      terminator: term.describe,
      hasMenu: gridHasMenu(grid),
      remainingOverallMs: Math.max(0, overallDeadline - now),
      remainingGateMs: Math.max(0, gateDeadline - now),
      screen: grid,
    });
  };

  for (;;) {
    // Disk is the terminator — check it FIRST so we exit the instant the
    // journey's completion signal lands, even if a stale menu lingers on screen.
    if (term.done()) {
      writeTuiTrace(session, "answer_gate_done", {
        answered,
        terminator: term.describe,
      });
      process.stdout.write(
        `answer-gate: terminator met (${term.describe}) after ${answered} answer(s)\n`,
      );
      return;
    }
    if (Date.now() >= overallDeadline) {
      writeTuiTrace(session, "answer_gate_overall_timeout", {
        answered,
        terminator: term.describe,
        overallMs,
        screen: backend.capture(session, false),
      });
      fail(
        `answer-gate: overall timeout (${overallMs}ms) — terminator (${term.describe}) ` +
          `never met after ${answered} answer(s). HANG BACKSTOP, not a pass.`,
        1,
      );
    }

    // Wait for the next menu to paint. Poll the grid; re-check disk each tick
    // (the affirmation can land mid-wait, between the last Enter and the next
    // menu). The screen never goes byte-stable while a turn streams, so we match
    // on appearance (no stability requirement) — the static menu IS the settled
    // state once it is up.
    const gateDeadline = Math.min(Date.now() + perGateMs, overallDeadline);
    let sawMenu = false;
    while (Date.now() < gateDeadline) {
      if (term.done()) {
        writeTuiTrace(session, "answer_gate_done", {
          answered,
          terminator: term.describe,
        });
        process.stdout.write(
          `answer-gate: terminator met (${term.describe}) after ${answered} answer(s)\n`,
        );
        return;
      }
      const grid = backend.capture(session, false);
      maybeTracePoll(grid, gateDeadline);
      if (gridHasMenu(grid)) {
        sawMenu = true;
        break;
      }
      await sleep(scaleTestTime(POLL_INTERVAL_BASE_MS));
    }

    if (!sawMenu) {
      const screen = backend.capture(session, false);
      writeTuiTrace(session, "answer_gate_menu_timeout", {
        answered,
        perGateMs,
        terminator: term.describe,
        screen,
      });
      fail(
        `answer-gate: per-gate timeout (${perGateMs}ms) — no menu appeared and ` +
          `terminator (${term.describe}) not yet met (answered ${answered} so far). ` +
          `HANG BACKSTOP, not a pass.\n---- last pane ----\n${screen}\n-------------------`,
        1,
      );
    }

    // A menu is up. Answer it by the SHAPE of the gate (see gridIsMultiSelect for
    // the AUQ key model — verified against the claude bundle AND live probing):
    //
    // SUBMIT SCREEN (`❯ 1. Submit answers / 2. Cancel`): the multi-tab form's final
    // confirm. Enter commits the WHOLE form and the journey resumes. Check this
    // FIRST — its option line carries no checkbox, so it must not fall through to
    // either branch below.
    //
    // MULTI-SELECT question (`❯ N. [ ] Option`): Space TOGGLES the highlighted
    // (Recommended) option ON. Enter must NOT be used to advance — Enter also
    // toggles, so Space+Enter nets to zero and spins forever (the t73 1409-answer
    // hang). We toggle exactly the one highlighted option (a deterministic, minimal
    // valid selection), then leave the tab by the shape of the gate:
    //   - multi-tab form (has the `←`/`→` strip): Right advances to the next tab; the
    //     toggle persists across the move (verified live), and the final Submit tab
    //     is handled by the gridIsSubmitScreen branch on the next iteration.
    //   - lone single-question multi-select (no tab strip): there is nowhere to
    //     navigate, so Enter commits it now that one option is toggled on.
    //
    // SINGLE-SELECT question (no checkbox): Enter SELECTS the highlighted/Recommended
    // option and auto-advances to the next tab (or approves a lone-question gate).
    const grid = backend.capture(session, false);
    if (gridIsSubmitScreen(grid)) {
      writeTuiTrace(session, "answer_gate_action", {
        answered,
        action: "submit",
        screen: grid,
      });
      backend.send(session, "Enter", false, true); // commit the whole form
      if (revisionFeedbackPending) {
        revisionFeedbackPending = false;
        await handleRevisionRecovery(backend, session, answered);
      }
    } else if (gridIsMultiSelect(grid)) {
      writeTuiTrace(session, "answer_gate_action", {
        answered,
        action: gridIsMultiTabForm(grid) ? "multi_select_next_tab" : "multi_select_commit",
        screen: grid,
      });
      backend.send(session, "Space", false, true); // toggle the Recommended option ON
      await sleep(scaleTestTime(150));
      if (gridIsMultiTabForm(grid)) {
        backend.send(session, "Right", false, true); // advance to the next tab / Submit
      } else {
        backend.send(session, "Enter", false, true); // lone multi-select: commit it
      }
    } else if (rejectFirstGate && /\bRequest changes\b/i.test(grid)) {
      const requestChangesNeedsSubmit = gridIsMultiTabForm(grid);
      writeTuiTrace(session, "answer_gate_action", {
        answered,
        action: "reject_first_gate",
        requestChangesNeedsSubmit,
        screen: grid,
      });
      // The FIRST approval gate, once: select "Request changes" (option 2) rather
      // than the highlighted "Approve" (option 1). Down moves the caret to option
      // 2; Enter selects it → handleReject (GATE_REJECTED + STAGE_REVISING +
      // Revision Count++). Consume the one-shot so every later gate is approved.
      backend.send(session, "Down", false, true);
      await sleep(scaleTestTime(150));
      backend.send(session, "Enter", false, true);
      rejectFirstGate = false;
      process.stdout.write("answer-gate: rejected first approval gate (Request changes)\n");
      // What the engine does NEXT changed in v0.6.0, so we READ the screen and
      // respond to whatever actually painted instead of blind-typing a fixed
      // string (the old code typed free-text feedback unconditionally; against
      // the new recovery MENU that text landed in the filter slot, the reject
      // never committed, and Revision Count stayed 0 — the t139 finding,
      // 2026-06-09). A multi-tab form must be submitted first: after selecting
      // Request Changes the user still needs to answer later tabs such as
      // Learnings and press Submit before the real revision prompt appears.
      if (requestChangesNeedsSubmit) {
        revisionFeedbackPending = true;
        process.stdout.write(
          "answer-gate: waiting for the multi-tab form submit before revision feedback\n",
        );
      } else {
        await handleRevisionRecovery(backend, session, answered);
      }
    } else {
      writeTuiTrace(session, "answer_gate_action", {
        answered,
        action: "single_select_default",
        screen: grid,
      });
      backend.send(session, "Enter", false, true); // select Recommended + advance
    }
    answered++;

    // Brief settle so the next capture does not re-detect the SAME menu before
    // the TUI has consumed the keystroke and begun the next turn. The post-answer
    // screen either advances to the next tab or starts streaming the next turn;
    // either way it stops matching the just-answered menu shortly.
    await sleep(scaleTestTime(500));
  }
}

export async function main(
  argv: string[] = process.argv.slice(2),
  backend: Backend = createTmuxBackend(),
): Promise<void> {
  const a = parseArgs(argv);
  const sub = a.positionals[0];

  switch (sub) {
    case "start":
      return cmdStart(backend, a);
    case "send":
      return cmdSend(backend, a);
    case "wait":
      return cmdWait(backend, a);
    case "capture":
      return cmdCapture(backend, a);
    case "kill":
      return cmdKill(backend, a);
    case "answer-gate":
      return cmdAnswerGate(backend, a);
    default:
      fail(
        `unknown subcommand '${sub ?? ""}'. ` +
          `Use: start | send | wait | capture | kill | answer-gate`,
      );
  }
}

// Imports are side-effect free; only the Bun entrypoint runs the CLI dispatcher.
if (import.meta.main) {
  await main();
}
