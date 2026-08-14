// git-drift detection core — the whole decision, expressed over injected ports
// so it can be driven without a repository and without a clock.
//
// The plugin never imports core (ADR-6): git, the clock and the throttle record
// are ports this module declares itself, and settings arrive over argv from the
// dispatcher rather than from a configuration read of its own.

export type DriftReport =
  | { readonly kind: "synced" }
  | { readonly kind: "info"; readonly behind: number }
  | {
      readonly kind: "warning";
      readonly behind: number;
      readonly intersecting: readonly string[];
      readonly ledgerIntersecting: readonly string[];
    }
  | {
      readonly kind: "skipped";
      readonly reason: "fetch-failed" | "not-a-git-repo" | "no-origin";
      readonly detail?: string;
    };

export interface GitResult {
  readonly ok: boolean;
  readonly stdout: string;
  readonly stderr: string;
}

export interface GitPort {
  /** `timeoutMs` is applied to the fetch alone; local queries are unbounded. */
  run(args: readonly string[], cwd: string, timeoutMs?: number): GitResult;
}

export interface ClockPort {
  nowMs(): number;
}

export interface ThrottleStore {
  read(): number | null;
  write(epochMs: number): void;
}

export interface GitDriftSettings {
  readonly "fetch-throttle-seconds": number;
}

export interface DetectInput {
  readonly repoRoot: string;
  readonly settings: GitDriftSettings;
  readonly git: GitPort;
  readonly clock: ClockPort;
  readonly throttle: ThrottleStore;
}

/** The report plus the branch it was measured against. The branch is carried
 *  beside the union rather than inside it so DriftReport stays the shape the
 *  design pins, while the renderer can still name `origin/<default>`. */
export interface DriftDetection {
  readonly report: DriftReport;
  readonly defaultBranch: string | null;
}

function skipped(
  reason: "fetch-failed" | "not-a-git-repo" | "no-origin",
  detail?: string,
): DriftDetection {
  return {
    report: { kind: "skipped", reason, ...(detail === undefined ? {} : { detail }) },
    defaultBranch: null,
  };
}

// The fetch budget. Sized above the observed cost of a real `git fetch` against
// a warm remote (2.00-2.16s measured over three runs of this repository) and
// well under the sensor manifest's own timeout, so a slow network shows up as a
// fail-open skip rather than as a killed sensor.
export const FETCH_TIMEOUT_MS = 10_000;

/** origin/HEAD when the remote publishes one, then the conventional names. A
 *  remote-tracking ref that does not exist locally is not a default branch. */
function resolveDefaultBranch(git: GitPort, repoRoot: string): string | null {
  const head = git.run(["symbolic-ref", "--quiet", "refs/remotes/origin/HEAD"], repoRoot);
  if (head.ok) {
    const name = head.stdout.trim().replace(/^refs\/remotes\/origin\//, "");
    if (name !== "") return name;
  }
  for (const candidate of ["main", "master"]) {
    if (git.run(["rev-parse", "--verify", "--quiet", `refs/remotes/origin/${candidate}`], repoRoot).ok) {
      return candidate;
    }
  }
  return null;
}

/** Refresh the remote-tracking refs unless the last refresh is still inside the
 *  window. Throttling suppresses the fetch alone — the verdict below runs on
 *  every fire, against whatever refs are on disk. */
function refreshOrigin(input: DetectInput, branch: string): { ok: true } | { ok: false; detail: string } {
  const windowMs = input.settings["fetch-throttle-seconds"] * 1000;
  const last = input.throttle.read();
  const now = input.clock.nowMs();
  if (last !== null && now - last < windowMs) return { ok: true };
  const fetched = input.git.run(["fetch", "origin", branch], input.repoRoot, FETCH_TIMEOUT_MS);
  if (!fetched.ok) return { ok: false, detail: fetched.stderr.trim() };
  input.throttle.write(now);
  return { ok: true };
}

export function detectDrift(input: DetectInput): DriftDetection {
  const { git, repoRoot } = input;
  if (!git.run(["rev-parse", "--git-dir"], repoRoot).ok) return skipped("not-a-git-repo");

  const remotes = git.run(["remote"], repoRoot);
  if (!remotes.ok || !remotes.stdout.split("\n").map((l) => l.trim()).includes("origin")) {
    return skipped("no-origin");
  }
  const branch = resolveDefaultBranch(git, repoRoot);
  if (branch === null) return skipped("no-origin");

  const refreshed = refreshOrigin(input, branch);
  if (!refreshed.ok) return skipped("fetch-failed", refreshed.detail);

  const counted = git.run(["rev-list", "--count", `HEAD..origin/${branch}`], repoRoot);
  const behind = counted.ok ? Number.parseInt(counted.stdout.trim(), 10) : Number.NaN;
  if (!Number.isFinite(behind) || behind <= 0) return { report: { kind: "synced" }, defaultBranch: branch };

  const originChanged = lines(git.run(["diff", "--name-only", `HEAD...origin/${branch}`], repoRoot).stdout);
  const work = workingSetPaths(git, repoRoot, branch);
  const intersecting = [...originChanged].filter((path) => work.has(path)).sort();
  if (intersecting.length === 0) return { report: { kind: "info", behind }, defaultBranch: branch };

  return {
    report: {
      kind: "warning",
      behind,
      intersecting,
      ledgerIntersecting: intersecting.filter(isLedgerPath),
    },
    defaultBranch: branch,
  };
}

function lines(stdout: string): Set<string> {
  return new Set(stdout.split("\n").map((line) => line.trim()).filter((line) => line !== ""));
}

/** Everything this checkout has touched that origin could collide with: the
 *  uncommitted working tree plus what this branch committed since the merge
 *  base. */
function workingSetPaths(git: GitPort, repoRoot: string, branch: string): Set<string> {
  const paths = new Set<string>();
  for (const line of git.run(["status", "--porcelain"], repoRoot).stdout.split("\n")) {
    const path = porcelainPath(line);
    if (path !== null) paths.add(path);
  }
  const base = git.run(["merge-base", "HEAD", `origin/${branch}`], repoRoot);
  if (base.ok && base.stdout.trim() !== "") {
    for (const path of lines(git.run(["diff", "--name-only", `${base.stdout.trim()}..HEAD`], repoRoot).stdout)) {
      paths.add(path);
    }
  }
  return paths;
}

/** `XY <path>` or `XY <old> -> <new>`; a path containing a control or quoting
 *  character arrives C-quoted. Only the destination is a path this checkout
 *  currently holds. */
function porcelainPath(line: string): string | null {
  if (line.length <= 3) return null;
  const rest = line.slice(3);
  const arrow = rest.lastIndexOf(" -> ");
  return unquote(arrow === -1 ? rest : rest.slice(arrow + 4));
}

function unquote(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (!trimmed.startsWith('"') || !trimmed.endsWith('"')) return trimmed;
  return trimmed.slice(1, -1).replace(/\\(.)/g, "$1");
}

// The append-only ledgers: an audit shard, a state file, a no-silent-drop
// event. A collision here is not an ordinary merge conflict — it is two
// histories claiming the same append — so it is surfaced ahead of the rest.
const LEDGER_PATTERNS: readonly RegExp[] = [
  /^amadeus\/spaces\/[^/]+\/intents\/[^/]+\/audit\//,
  /(^|\/)amadeus-state\.md$/,
  /^tests\/no-silent-drop\/events\//,
];

function isLedgerPath(path: string): boolean {
  return LEDGER_PATTERNS.some((pattern) => pattern.test(path));
}

// --- Rendering: DriftReport -> the dispatcher's stdout contract ---

export interface SensorFinding {
  readonly field: string;
  readonly reason: string;
}

export interface SensorResult {
  readonly pass: boolean;
  readonly findings_count: number;
  readonly reason: string;
  readonly findings: readonly SensorFinding[];
}

function pass(reason: string): SensorResult {
  return { pass: true, findings_count: 0, reason, findings: [] };
}

function finding(reason: string, field: string, message: string): SensorResult {
  return { pass: false, findings_count: 1, reason, findings: [{ field, reason: message }] };
}

// Ledger collisions first, then the rest — a contested append is the costlier
// surprise, so it is what the reader sees before the list runs on.
function orderedForPresentation(report: { intersecting: readonly string[]; ledgerIntersecting: readonly string[] }): string[] {
  const ledger = new Set(report.ledgerIntersecting);
  return [...report.ledgerIntersecting, ...report.intersecting.filter((path) => !ledger.has(path))];
}

/** The verdict the dispatcher reads. `pass: false` is reserved for the two
 *  outcomes an operator must see — work that collides with origin, and an
 *  origin that could not be read at all. Severity is advisory throughout, so a
 *  finding informs the stage; it never gates it. */
export function renderDriftResult(detection: DriftDetection): SensorResult {
  const { report } = detection;
  if (report.kind === "synced") return pass("synced");
  if (report.kind === "info") {
    return pass("info");
  }
  if (report.kind === "skipped") {
    if (report.reason !== "fetch-failed") return pass(`skipped:${report.reason}`);
    return finding(
      "skipped:fetch-failed",
      "origin",
      `origin の取得に失敗したため乖離を確認できませんでした: ${report.detail ?? "(詳細なし)"}`,
    );
  }
  return finding(
    "warning",
    "drift",
    `origin/${detection.defaultBranch} が ${report.behind} コミット先行しています。` +
      `あなたの作業と交差するファイル: ${orderedForPresentation(report).join(", ")}。` +
      "取り込み(mirror/rebase)または先着地の判断を検討してください",
  );
}
