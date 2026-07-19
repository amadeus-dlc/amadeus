// amadeus-election.ts — U5 election-cli: directive-driven next/report loop for
// the election TS foundation (intent 260718-election-ts-foundation, Bolt 1
// walking-skeleton). FR-0: the protocol source of truth is this state machine;
// the caller (AI or the machine executor) only forwards typed directives.
//
// Seven states: draft -> open -> collecting -> tallied -> rendered -> recorded
// (+ hold at any point, reason-typed). `next` is read-only and always exits 0
// when it can emit a directive (a hold directive is still a successful
// emission); only `report` commits transitions. stdout carries exactly one
// directive/result JSON line; stderr carries advisories and errors
// (stdout-directive-stderr-advisory). Exit codes: 0 ok, 1 fault, 2 usage.
//
// Bolt 4 (cli-complete) wires the full loop: blind distribution views at
// open (U1 shuffleView), transport-backed notify (U4 port — agmsg spawn or
// subagent directives), the U3 record surface for render/verify (real
// parseGoaLine round-trip), and reason-typed hold resolution with the
// per-reason resume table. The machine executor e2e (ADR-6 CI layer) drives
// this CLI with zero election knowledge.

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  Ballot,
  Election,
  type ElectionState,
  type HoldReason,
  shuffleView,
  type TallyResult,
  tally,
} from "./amadeus-election-model";
import {
  GoaFreq,
  GoaLineCode,
  renderPersistDraft,
  verifyReservations,
  verifySelf,
} from "./amadeus-election-record";
import {
  createAgmsgTransport,
  createSubagentTransport,
  distribute,
} from "./amadeus-election-transport";
import { parseGoaLine } from "../packages/framework/core/tools/amadeus-norm-metrics";
import { electionsRoot, Store, type StoreError, writeStoreFile } from "./amadeus-election-store";

const USAGE =
  "Usage: bun scripts/amadeus-election.ts <open|notify|vote|status|tally|render|verify|next|report> --election <id> [--file <path>] [--result <r>] [--resolution <r>] [--transport agmsg|subagent] [--team <t>] [--from <name>] [--send-script <path>] [--project <dir>]";

// Every actionable directive names the verb to execute and the report result
// that commits the transition (FR-0: the caller forwards, never maps). verb
// and report are null exactly when the next move is external input (ballots
// arriving), terminal (done), or human judgement (hold).
type Directive =
  | { kind: "distribute"; electionId: string; voters: string[]; verb: "notify"; report: "distributed" }
  | { kind: "collect-wait"; electionId: string; pending: string[]; verb: null; report: null }
  | { kind: "tally-ready"; electionId: string; verb: "tally"; report: "tallied" }
  | { kind: "render"; electionId: string; verb: "render"; report: "rendered" }
  | { kind: "verify"; electionId: string; verb: "verify"; report: "verified" }
  | { kind: "done"; electionId: string; verb: null; report: null }
  | { kind: "hold"; electionId: string; reason: string; verb: null; report: null };

type ReportResult = "distributed" | "tallied" | "rendered" | "verified" | "hold-resolved";

// Per-reason resume table (FD hold-resolved rows): which resolutions a hold
// reason accepts and where the state machine resumes.
const HOLD_RESOLUTIONS: Record<HoldReason, Record<string, ElectionState>> = {
  tie: { adopted: "tallied", rejected: "tallied" },
  block: { adopted: "tallied", rejected: "tallied", reopen: "collecting" },
  "quorum-short": { "resume-collecting": "collecting", "close-rejected": "tallied" },
  "discussion-needed": { discussed: "collecting" },
};

function out(value: unknown): void {
  console.log(JSON.stringify(value));
}

function fail(message: string): 1 {
  console.error(JSON.stringify({ error: message }));
  return 1;
}

function storeFail(op: string, e: StoreError): 1 {
  return fail(`${op}: ${e}`);
}

function readTally(root: string, electionId: string): { result: TallyResult; ballots: unknown[] } | null {
  const path = join(root, electionId, "tally.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

// --- next (read-only) ------------------------------------------------------

export function handleNext(root: string, electionId: string): number {
  const loaded = Store.load(root, electionId);
  if (!loaded.ok) return storeFail("load", loaded.error);
  const { election, state } = loaded.value;
  const directive = directiveFor(root, electionId, election.voters, state);
  if (directive === null) return fail(`no directive for state: ${state}`);
  out(directive);
  return 0;
}

function directiveFor(
  root: string,
  electionId: string,
  voters: string[],
  state: ElectionState,
): Directive | null {
  if (state === "open") {
    return { kind: "distribute", electionId, voters, verb: "notify", report: "distributed" };
  }
  if (state === "collecting") {
    const status = Store.status(root, electionId);
    if (!status.ok) return null;
    if (status.value.pending.length > 0) {
      return { kind: "collect-wait", electionId, pending: status.value.pending, verb: null, report: null };
    }
    return { kind: "tally-ready", electionId, verb: "tally", report: "tallied" };
  }
  if (state === "tallied") return { kind: "render", electionId, verb: "render", report: "rendered" };
  if (state === "rendered") return { kind: "verify", electionId, verb: "verify", report: "verified" };
  if (state === "recorded") return { kind: "done", electionId, verb: null, report: null };
  if (state === "hold") {
    const t = readTally(root, electionId);
    // TODO(Bolt 3): parse tally.json into a typed TallyResult and carry reason
    // as HoldReason — the raw readTally cast retires with the U3 record work
    // (reviewer m3).
    const reason = t !== null && t.result.kind === "hold" ? t.result.reason : "unknown";
    return { kind: "hold", electionId, reason, verb: null, report: null };
  }
  return null; // draft: open verb has not finished publishing
}

// --- report (transition commit) --------------------------------------------

const TRANSITIONS: Record<Exclude<ReportResult, "hold-resolved">, { from: ElectionState; to: ElectionState }> = {
  distributed: { from: "open", to: "collecting" },
  tallied: { from: "collecting", to: "tallied" },
  rendered: { from: "tallied", to: "rendered" },
  verified: { from: "rendered", to: "recorded" },
};

export function handleReport(
  root: string,
  electionId: string,
  result: string,
  resolution: string | null = null,
): number {
  if (result === "hold-resolved") return handleHoldResolved(root, electionId, resolution);
  const transition = TRANSITIONS[result as Exclude<ReportResult, "hold-resolved">];
  if (transition === undefined) return fail(`invalid-transition: unknown result "${result}"`);
  const loaded = Store.load(root, electionId);
  if (!loaded.ok) return storeFail("load", loaded.error);
  if (loaded.value.state !== transition.from) {
    return fail(`invalid-transition: ${result} requires state ${transition.from}, got ${loaded.value.state}`);
  }
  // A tallied report lands on "hold" when the fixed tally result is a hold —
  // the hold state is reached only through a real tally outcome.
  let to = transition.to;
  if (result === "tallied") {
    const t = readTally(root, electionId);
    if (t === null) return fail("invalid-transition: tallied reported but tally.json missing");
    if (t.result.kind === "hold") to = "hold";
  }
  const set = Store.setState(root, electionId, to);
  if (!set.ok) return storeFail("setState", set.error);
  out({ committed: result, state: to });
  return 0;
}

// hold-resolved commits the human judgement: the reason (from the fixed tally)
// selects which resolutions are valid and where the machine resumes.
function handleHoldResolved(root: string, electionId: string, resolution: string | null): number {
  if (resolution === null) return fail("invalid-transition: hold-resolved requires --resolution");
  const loaded = Store.load(root, electionId);
  if (!loaded.ok) return storeFail("load", loaded.error);
  if (loaded.value.state !== "hold") {
    return fail(`invalid-transition: hold-resolved requires state hold, got ${loaded.value.state}`);
  }
  const t = readTally(root, electionId);
  if (t === null || t.result.kind !== "hold") {
    return fail("invalid-transition: hold state without a hold tally result");
  }
  const table = HOLD_RESOLUTIONS[t.result.reason];
  const resumedTo = table[resolution];
  if (resumedTo === undefined) {
    return fail(
      `invalid-transition: resolution "${resolution}" is not valid for hold reason "${t.result.reason}" (valid: ${Object.keys(table).join("/")})`,
    );
  }
  const set = Store.setState(root, electionId, resumedTo);
  if (!set.ok) return storeFail("setState", set.error);
  out({ committed: "hold-resolved", resolution, resumedTo });
  return 0;
}

// --- verbs -----------------------------------------------------------------

export function handleOpen(root: string, filePath: string): number {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return fail("open: definition file unreadable or not JSON");
  }
  const parsed = Election.parse(raw);
  if (!parsed.ok) return fail(`open: ${parsed.error}`);
  // The election id doubles as the GoA-line code (Q3=A) — refuse ids the record
  // layer could not render (fail-closed at the entrance, not at render time).
  const code = GoaLineCode.parse(parsed.value.electionId);
  if (!code.ok) return fail(`open: electionId is not a valid GoA-line code (^E-[A-Z0-9]+$)`);
  const created = Store.create(root, parsed.value);
  if (!created.ok) return storeFail("create", created.error);
  // Blind per-voter views (FR-1b/1c): deterministic shuffle, written up front
  // so notify only ever references them by path.
  const dir = join(root, parsed.value.electionId, "views");
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    return fail("open: views directory could not be created");
  }
  for (const voter of parsed.value.voters) {
    const view = shuffleView(parsed.value, voter);
    const w = writeStoreFile(join(dir, `${voter}.json`), JSON.stringify(view, null, 2));
    if (!w.ok) return storeFail("views", w.error);
  }
  const set = Store.setState(root, parsed.value.electionId, "open");
  if (!set.ok) return storeFail("setState", set.error);
  out({ opened: parsed.value.electionId, views: parsed.value.voters.length });
  return 0;
}

// Transport selection for notify: returns the port or a failure message.
function buildTransport(
  kind: string,
  voters: Set<string>,
  agmsg: { team: string | null; from: string | null; sendScript: string | null },
): ReturnType<typeof createSubagentTransport> | string {
  if (kind === "subagent") return createSubagentTransport({ voters });
  if (kind !== "agmsg") return `notify: unknown transport "${kind}"`;
  if (agmsg.team === null || agmsg.from === null) {
    return "notify: --team and --from are required for --transport agmsg";
  }
  return createAgmsgTransport({
    sendScriptPath:
      agmsg.sendScript ?? join(homedir(), ".agents", "skills", "agmsg", "scripts", "send.sh"),
    team: agmsg.team,
    from: agmsg.from,
    voters,
  });
}

// notify drives the U4 transport port per voter. subagent (default) emits
// DeliveryDirectives — no spawn, no record (Q1=B); agmsg spawns send.sh and
// books a timeline entry per ACTUAL delivered outcome only (FR-2b).
export function handleNotify(
  root: string,
  electionId: string,
  transportKind: string,
  agmsg: { team: string | null; from: string | null; sendScript: string | null },
): number {
  const loaded = Store.load(root, electionId);
  if (!loaded.ok) return storeFail("load", loaded.error);
  const voters = loaded.value.election.voters;
  const transport = buildTransport(transportKind, new Set(voters), agmsg);
  if (typeof transport === "string") return fail(transport);
  const deliveries = distribute(transport, electionId, voters, (voter) =>
    join(root, electionId, "views", `${voter}.json`),
  );
  for (const d of deliveries) {
    if (d.result.ok && d.result.value.kind === "delivered") {
      const booked = Store.appendTimeline(root, electionId, {
        kind: "distributed",
        at: d.result.value.record.at,
        detail: `delivered via agmsg: ${d.voter}`,
        voter: d.voter,
      });
      if (!booked.ok) return storeFail("appendTimeline", booked.error);
    }
  }
  const failed = deliveries.filter((d) => !d.result.ok);
  out({
    deliveries: deliveries.map((d) =>
      d.result.ok ? d.result.value : { kind: "failed", voter: d.voter, error: d.result.error },
    ),
  });
  return failed.length > 0 ? 1 : 0;
}

export function handleVote(root: string, electionId: string, filePath: string): number {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return fail("vote: ballot file unreadable or not JSON");
  }
  const loaded = Store.load(root, electionId);
  if (!loaded.ok) return storeFail("load", loaded.error);
  const parsed = Ballot.parse(raw, loaded.value.election);
  if (!parsed.ok) return fail(`vote: ${parsed.error}`);
  const appended = Store.appendBallot(root, electionId, parsed.value);
  if (!appended.ok) return storeFail("appendBallot", appended.error);
  out({ accepted: parsed.value.voter });
  return 0;
}

export function handleStatus(root: string, electionId: string): number {
  const status = Store.status(root, electionId);
  if (!status.ok) return storeFail("status", status.error);
  out(status.value);
  return 0;
}

export function handleTally(root: string, electionId: string): number {
  const loaded = Store.load(root, electionId);
  if (!loaded.ok) return storeFail("load", loaded.error);
  const ledger = Store.ledger(root, electionId);
  if (!ledger.ok) return storeFail("ledger", ledger.error);
  const result = tally(loaded.value.election, ledger.value.ballots);
  const materialized = Store.materialize(root, electionId, result, new Date().toISOString());
  if (!materialized.ok) return storeFail("materialize", materialized.error);
  out({ result });
  return 0;
}

// render produces the full U3 record: header, ruling, transcribed
// reservations, vote timeline, and the byte-compatible GoA line
// (renderPersistDraft — deterministic, BR-R5).
export function handleRender(root: string, electionId: string): number {
  const loaded = Store.load(root, electionId);
  if (!loaded.ok) return storeFail("load", loaded.error);
  const t = readTally(root, electionId);
  if (t === null) return fail("render: tally.json missing or unreadable");
  const code = GoaLineCode.parse(electionId);
  if (!code.ok) return fail("render: electionId is not a valid GoA-line code");
  const timeline = readTimeline(root, electionId);
  if (timeline === null) return fail("render: timeline.json missing or unreadable");
  const ballots = t.ballots as Parameters<typeof tally>[1];
  const body = renderPersistDraft(code.value, loaded.value.election, t.result, ballots, timeline);
  const lines = [
    `# Election Record — ${electionId}`,
    "",
    `- question: ${loaded.value.election.question}`,
    "",
    body,
    "",
  ];
  // No timeline entry here: the ledger's four event kinds (distributed/ballot/
  // tallied/late) do not include rendering (functional-design invariant).
  const w = writeStoreFile(join(root, electionId, "record.md"), lines.join("\n"));
  if (!w.ok) return storeFail("render", w.error);
  out({ rendered: join(root, electionId, "record.md") });
  return 0;
}

// GoA-line half of verify: locate the line, round-trip it through the REAL
// parseGoaLine, and compare against the recomputed frequency. Returns the
// failure message or null.
function checkGoaLine(document: string, freq: GoaFreq): string | null {
  const goaLine = document.split("\n").find((l) => l.startsWith("GoA["));
  if (goaLine === undefined) return "verify: record.md has no GoA line";
  const parsedLine = parseGoaLine(goaLine);
  if (!parsedLine.ok) return `verify: GoA line does not parse: ${parsedLine.error}`;
  if (JSON.stringify(parsedLine.votes) !== JSON.stringify([...freq])) {
    return "verify: GoA line does not match the recomputed frequency";
  }
  return null;
}

function readTimeline(root: string, electionId: string) {
  const path = join(root, electionId, "timeline.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

// verify is the full render<->verify symmetry check: tally recompute, GoA line
// round-trip through the REAL parseGoaLine, reservation transcription count,
// and the verifySelf 3-class sweep (FR-6a/6b).
export function handleVerify(root: string, electionId: string): number {
  const loaded = Store.load(root, electionId);
  if (!loaded.ok) return storeFail("load", loaded.error);
  const t = readTally(root, electionId);
  if (t === null) return fail("verify: tally.json missing or unreadable");
  const ballots = t.ballots as Parameters<typeof tally>[1];
  const recomputed = tally(loaded.value.election, ballots);
  if (JSON.stringify(recomputed) !== JSON.stringify(t.result)) {
    return fail("verify: recomputed tally does not match stored result");
  }
  const recordPath = join(root, electionId, "record.md");
  if (!existsSync(recordPath)) return fail("verify: record.md missing");
  const document = readFileSync(recordPath, "utf8");
  const freq = GoaFreq.fromVotes(ballots.map((b) => b.goa));
  const goaCheck = checkGoaLine(document, freq);
  if (goaCheck !== null) return fail(goaCheck);
  const reservations = verifyReservations(ballots, document);
  if (!reservations.ok) {
    return fail(`verify: reservation transcription mismatch (${JSON.stringify(reservations.error)})`);
  }
  const timeline = readTimeline(root, electionId);
  if (timeline === null) return fail("verify: timeline.json missing or unreadable");
  const self = verifySelf(ballots.length, ballots, freq, timeline);
  if (!self.ok) return fail(`verify: self-check findings ${JSON.stringify(self.error)}`);
  out({ verified: electionId });
  return 0;
}

// --- entry -----------------------------------------------------------------

type ParsedArgs = {
  verb: string;
  electionId: string | null;
  file: string | null;
  result: string | null;
  project: string | null;
  resolution: string | null;
  transport: string | null;
  team: string | null;
  from: string | null;
  sendScript: string | null;
};

const FLAG_FIELDS: Record<
  string,
  "electionId" | "file" | "result" | "project" | "resolution" | "transport" | "team" | "from" | "sendScript"
> = {
  "--election": "electionId",
  "--file": "file",
  "--result": "result",
  "--project": "project",
  "--resolution": "resolution",
  "--transport": "transport",
  "--team": "team",
  "--from": "from",
  "--send-script": "sendScript",
};

function readFlags(rest: string[]): Partial<ParsedArgs> | null {
  const flags: Partial<ParsedArgs> = {};
  for (let i = 0; i < rest.length; i += 2) {
    const field = FLAG_FIELDS[rest[i] ?? ""];
    const value = rest[i + 1];
    if (field === undefined || value === undefined) return null;
    flags[field] = value;
  }
  return flags;
}

export function parseArgs(argv: string[]): ParsedArgs | { usage: string } {
  const [verb, ...rest] = argv;
  if (verb === undefined) return { usage: USAGE };
  const flags = readFlags(rest);
  if (flags === null) return { usage: USAGE };
  return {
    verb,
    electionId: null,
    file: null,
    result: null,
    project: null,
    resolution: null,
    transport: null,
    team: null,
    from: null,
    sendScript: null,
    ...flags,
  };
}

// Verb dispatch table: every entry is total over ParsedArgs and returns
// usage(2) itself when a required flag is missing.
const VERBS: Record<string, (root: string, args: ParsedArgs) => number> = {
  open: (root, a) => (a.file === null ? usageFail() : handleOpen(root, a.file)),
  next: (root, a) => (a.electionId === null ? usageFail() : handleNext(root, a.electionId)),
  report: (root, a) =>
    a.electionId === null || a.result === null
      ? usageFail()
      : handleReport(root, a.electionId, a.result, a.resolution),
  notify: (root, a) =>
    a.electionId === null
      ? usageFail()
      : handleNotify(root, a.electionId, a.transport ?? "subagent", {
          team: a.team,
          from: a.from,
          sendScript: a.sendScript,
        }),
  vote: (root, a) =>
    a.electionId === null || a.file === null
      ? usageFail()
      : handleVote(root, a.electionId, a.file),
  status: (root, a) => (a.electionId === null ? usageFail() : handleStatus(root, a.electionId)),
  tally: (root, a) => (a.electionId === null ? usageFail() : handleTally(root, a.electionId)),
  render: (root, a) => (a.electionId === null ? usageFail() : handleRender(root, a.electionId)),
  verify: (root, a) => (a.electionId === null ? usageFail() : handleVerify(root, a.electionId)),
};

export function main(argv: string[], projectDir: string = join(import.meta.dir, "..")): number {
  const args = parseArgs(argv);
  if ("usage" in args) {
    console.error(args.usage);
    return 2;
  }
  // --project is the repo-external override (scratch-script-discipline): tests
  // and experiments point the store at a scratch tree instead of the real one.
  const root = electionsRoot(args.project ?? projectDir);
  const handler = VERBS[args.verb];
  if (handler === undefined) return usageFail();
  return handler(root, args);
}

function usageFail(): 2 {
  console.error(USAGE);
  return 2;
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
