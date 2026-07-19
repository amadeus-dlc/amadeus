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
// Bolt 1 verbs are minimal-but-complete for a zero-confirm election:
// open/notify/vote/status/tally/render/verify all exist and the loop reaches
// `recorded`. Hold resolution, shuffle views, transport wiring, and the full
// GoA record line land in Bolts 2-4 per the bolt plan.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  Ballot,
  Election,
  type ElectionState,
  type TallyResult,
  tally,
} from "./amadeus-election-model";
import { electionsRoot, Store, type StoreError, writeStoreFile } from "./amadeus-election-store";

const USAGE =
  "Usage: bun scripts/amadeus-election.ts <open|notify|vote|status|tally|render|verify|next|report> --election <id> [--file <path>] [--result <r>] [--project <dir>]";

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

type ReportResult = "distributed" | "tallied" | "rendered" | "verified";

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

const TRANSITIONS: Record<ReportResult, { from: ElectionState; to: ElectionState }> = {
  distributed: { from: "open", to: "collecting" },
  tallied: { from: "collecting", to: "tallied" },
  rendered: { from: "tallied", to: "rendered" },
  verified: { from: "rendered", to: "recorded" },
};

export function handleReport(root: string, electionId: string, result: string): number {
  const transition = TRANSITIONS[result as ReportResult];
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
  const created = Store.create(root, parsed.value);
  if (!created.ok) return storeFail("create", created.error);
  const set = Store.setState(root, parsed.value.electionId, "open");
  if (!set.ok) return storeFail("setState", set.error);
  out({ opened: parsed.value.electionId });
  return 0;
}

// Bolt 1: notify emits per-voter delivery directives only (transport wiring is
// Bolt 3 / U4). The timeline entry records this directive generation — the one
// operation that actually executed here.
export function handleNotify(root: string, electionId: string): number {
  const loaded = Store.load(root, electionId);
  if (!loaded.ok) return storeFail("load", loaded.error);
  const directives = loaded.value.election.voters.map((voter) => ({
    voter,
    electionId,
    viewPath: join(root, electionId, "views", `${voter}.json`),
  }));
  const booked = Store.appendTimeline(root, electionId, {
    kind: "distributed",
    at: new Date().toISOString(),
    detail: `delivery directives generated: ${directives.length}`,
  });
  if (!booked.ok) return storeFail("appendTimeline", booked.error);
  out({ deliveryDirectives: directives });
  return 0;
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

// Bolt 1 record is a minimal markdown summary; the byte-compatible GoA line
// and the full record document are U3 (Bolt 3).
export function handleRender(root: string, electionId: string): number {
  const loaded = Store.load(root, electionId);
  if (!loaded.ok) return storeFail("load", loaded.error);
  const t = readTally(root, electionId);
  if (t === null) return fail("render: tally.json missing or unreadable");
  const summary =
    t.result.kind === "established"
      ? `established: ${t.result.outcome}`
      : `hold: ${t.result.reason}`;
  const lines = [
    `# Election Record — ${electionId}`,
    "",
    `- question: ${loaded.value.election.question}`,
    `- result: ${summary}`,
    `- counts: favor=${t.result.counts.favor} against=${t.result.counts.against} abstain=${t.result.counts.abstain} discuss=${t.result.counts.discuss}`,
    `- ballots: ${t.ballots.length}`,
    "",
  ];
  // No timeline entry here: the ledger's four event kinds (distributed/ballot/
  // tallied/late) do not include rendering (functional-design invariant).
  const w = writeStoreFile(join(root, electionId, "record.md"), lines.join("\n"));
  if (!w.ok) return storeFail("render", w.error);
  out({ rendered: join(root, electionId, "record.md") });
  return 0;
}

// verify recomputes the tally from the fixed ballot set and compares with the
// stored result (render<->verify symmetry, minimal Bolt 1 form).
export function handleVerify(root: string, electionId: string): number {
  const loaded = Store.load(root, electionId);
  if (!loaded.ok) return storeFail("load", loaded.error);
  const t = readTally(root, electionId);
  if (t === null) return fail("verify: tally.json missing or unreadable");
  const recomputed = tally(loaded.value.election, t.ballots as Parameters<typeof tally>[1]);
  if (JSON.stringify(recomputed) !== JSON.stringify(t.result)) {
    return fail("verify: recomputed tally does not match stored result");
  }
  if (!existsSync(join(root, electionId, "record.md"))) {
    return fail("verify: record.md missing");
  }
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
};

const FLAG_FIELDS: Record<string, "electionId" | "file" | "result" | "project"> = {
  "--election": "electionId",
  "--file": "file",
  "--result": "result",
  "--project": "project",
};

export function parseArgs(argv: string[]): ParsedArgs | { usage: string } {
  const [verb, ...rest] = argv;
  if (verb === undefined) return { usage: USAGE };
  const parsed: ParsedArgs = { verb, electionId: null, file: null, result: null, project: null };
  for (let i = 0; i < rest.length; i += 2) {
    const field = FLAG_FIELDS[rest[i] ?? ""];
    const value = rest[i + 1];
    if (field === undefined || value === undefined) return { usage: USAGE };
    parsed[field] = value;
  }
  return parsed;
}

// Verb dispatch table: every entry is total over ParsedArgs and returns
// usage(2) itself when a required flag is missing.
const VERBS: Record<string, (root: string, args: ParsedArgs) => number> = {
  open: (root, a) => (a.file === null ? usageFail() : handleOpen(root, a.file)),
  next: (root, a) => (a.electionId === null ? usageFail() : handleNext(root, a.electionId)),
  report: (root, a) =>
    a.electionId === null || a.result === null
      ? usageFail()
      : handleReport(root, a.electionId, a.result),
  notify: (root, a) => (a.electionId === null ? usageFail() : handleNotify(root, a.electionId)),
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
