// test-size.ts — derived test-size classification (#684 / #696 Phase A).
//
// The test pyramid's rungs are TEST SIZE (a test's dynamic runtime behaviour:
// does it spawn a process, touch the filesystem, open a socket), NOT test scope
// (unit/integration/e2e) and NOT the runner tier / directory it lives in. Size
// and scope are independent axes (t_wada gihyo #3/#5; Google SWE ch.14). This
// module is the single source of truth for a file's DERIVED size.
//
// Measurement: Phase A uses a STATIC signal proxy — it detects direct references
// to spawn / filesystem / network / timer APIs in the file's own source. This is
// deterministic and runs in CI with no privileges (macOS DTrace is SIP-blocked
// and Bun test preload does not fire for this — see #684 comment 4924008283).
// Phase D (#699) layers true dynamic observation on top; the classifier's output
// shape stays stable so the drift guard and runner report keep working.
//
// Annotation: a file MAY declare its intended size with a `// size: <value>`
// header (same idea as the `// covers:` header). The drift guard (t-test-size-
// drift.test.ts) fails CI when the declared size is SMALLER than the measured
// size — a `small`-annotated file that grows a spawn/fs call is caught. The
// annotation is a promise; the classifier is the check. Absent annotation → the
// measured size is authoritative, no failure.

export type TestSize = "small" | "medium" | "large";

export const SIZE_VALUES: readonly TestSize[] = ["small", "medium", "large"] as const;

// Ordinal for comparisons: small < medium < large.
export const SIZE_ORDER: Record<TestSize, number> = { small: 0, medium: 1, large: 2 };

// Signal → the SMALLEST size a file exhibiting it can be. Network forces large
// (unrestricted / remote per Google's Large definition); process spawn, a real
// filesystem touch, or a timer/wait forces at least medium (single machine, not
// a pure in-memory single-thread small test). Mirrors codex-3's measured rule
// (comment 4924008283) minus the wall-clock axis, which is dynamic (Phase D).
const SIGNAL_PATTERNS: { readonly name: string; readonly size: TestSize; readonly re: RegExp }[] = [
  { name: "network", size: "large", re: /\bnode:(?:net|http|https|http2|dgram|tls)\b|from ["']node:(?:net|http|https|http2|dgram|tls)["']|\bWebSocket\b|\bfetch\s*\(|\.listen\s*\(/ },
  { name: "spawn", size: "medium", re: /\bchild_process\b|node:child_process|\bspawnSync\b|\bspawn\s*\(|\bexecSync\b|\bexecFileSync\b|\bexecFile\s*\(|Bun\.spawn|node-pty/ },
  { name: "filesystem", size: "medium", re: /\bnode:fs\b|from ["']fs["']|\breadFileSync\b|\bwriteFileSync\b|\bmkdirSync\b|\bmkdtempSync\b|\brmSync\b|\bexistsSync\b|\breaddirSync\b|\bstatSync\b|\bappendFileSync\b|\bcpSync\b|\brenameSync\b|\bunlinkSync\b|\bopenSync\b|\breadSync\b/ },
  { name: "timer", size: "medium", re: /\bsetTimeout\s*\(|\bsetInterval\s*\(|Bun\.sleep|\bawait\s+sleep\s*\(/ },
];

export interface SizeClassification {
  readonly size: TestSize;
  readonly signals: readonly string[];
}

// Derive a file's size from its source text. Returns the size and the signals
// that drove it (for the runner report / drift-guard messages).
export function classifyTestSize(source: string): SizeClassification {
  // Strip line + block comments so a mention of an API in prose (e.g. a comment
  // that says "this used to call spawnSync") does not inflate the size.
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const signals: string[] = [];
  let size: TestSize = "small";
  for (const { name, size: sigSize, re } of SIGNAL_PATTERNS) {
    if (re.test(code)) {
      signals.push(name);
      if (SIZE_ORDER[sigSize] > SIZE_ORDER[size]) size = sigSize;
    }
  }
  return { size, signals };
}

export interface SizeAnnotation {
  // The declared size, or null when the file carries no `// size:` header.
  readonly declared: TestSize | null;
  // Present only when a `// size:` header exists but its value is not a valid
  // TestSize — the drift guard rejects these.
  readonly invalidValue?: string;
}

// ─── Phase D (#699): continuous dynamic size measurement ─────────────────────
//
// Phase A above derives size from a STATIC signal scan. Phase D adds the DYNAMIC
// axis: a test's measured WALL-CLOCK duration. The runner records each file's
// real run time; this module maps that duration to a size FLOOR and compares the
// floor to the file's effective declared size to surface WALL-CLOCK DRIFT — a
// file that runs slow enough to have outgrown its declared/static size. Drift is
// ADVISORY (reported by the runner and uploaded as a CI artifact, never gates);
// the static drift guard (t-test-size-drift) stays the only CI-failing size
// check. All functions here are PURE — the runner owns source reads / duration
// capture and feeds them in.

// Wall-clock band thresholds — the single canonical definition consumed by
// sizeFloorFromDuration. Derived from codex-3's measured rule (#684 comment
// 4924008283): a small test finishes well under a second, a large test runs on
// the order of tens of seconds. Bands are lower-inclusive / upper-exclusive
// (see sizeFloorFromDuration).
export const WALL_CLOCK_BANDS = { smallMaxSeconds: 1, largeMinSeconds: 30 } as const;

// Map a measured wall-clock duration to the SMALLEST size that duration is
// consistent with. Bands: [0, 1) small, [1, 30) medium, [30, ∞) large — lower
// bound inclusive, upper bound exclusive (1.0s exactly is medium, 30.0s exactly
// is large).
export function sizeFloorFromDuration(durationSeconds: number): TestSize {
  if (durationSeconds >= WALL_CLOCK_BANDS.largeMinSeconds) return "large";
  if (durationSeconds >= WALL_CLOCK_BANDS.smallMaxSeconds) return "medium";
  return "small";
}

// Wall-clock drift as a discriminated union. The "wall-clock" variant carries
// the declared and measured sizes; "none" carries nothing (there is nothing to
// report). Constructing it only through detectWallClockDrift makes an invalid
// drift record — a "wall-clock" variant whose measured size does NOT exceed the
// declared — unrepresentable.
export type WallClockDrift =
  | { readonly kind: "none" }
  | { readonly kind: "wall-clock"; readonly declared: TestSize; readonly measured: TestSize };

// Smart constructor: builds the "wall-clock" variant only when the dynamic floor
// is STRICTLY LARGER than the effective declared size. A floor at or below the
// declared size yields "none".
export function detectWallClockDrift(
  effectiveDeclared: TestSize,
  dynamicFloor: TestSize,
): WallClockDrift {
  if (SIZE_ORDER[dynamicFloor] > SIZE_ORDER[effectiveDeclared]) {
    return { kind: "wall-clock", declared: effectiveDeclared, measured: dynamicFloor };
  }
  return { kind: "none" };
}

export interface MeasuredTestRecord {
  readonly file: string;
  readonly scope: string;
  // The file's `// size:` declaration, or null when it carries no valid header.
  readonly declaredSize: TestSize | null;
  // The static-signal size (Phase A classifier) and the signals that drove it.
  readonly staticSize: TestSize;
  readonly staticSignals: readonly string[];
  readonly durationSeconds: number;
  readonly dynamicFloor: TestSize;
  readonly drift: WallClockDrift;
}

// Build one measured record from a file's source + its measured duration. Pure:
// the caller supplies the already-read source and the observed duration. The
// effective declared size is the `// size:` annotation when valid, else the
// static size — an INVALID annotation is the static drift guard's concern, so it
// degrades here to the static size rather than participating in wall-clock drift.
export function buildMeasuredRecord(input: {
  file: string;
  scope: string;
  source: string;
  durationSeconds: number;
}): MeasuredTestRecord {
  const classification = classifyTestSize(input.source);
  const annotation = parseSizeAnnotation(input.source);
  const effectiveDeclared: TestSize = annotation.declared ?? classification.size;
  const dynamicFloor = sizeFloorFromDuration(input.durationSeconds);
  return {
    file: input.file,
    scope: input.scope,
    declaredSize: annotation.declared,
    staticSize: classification.size,
    staticSignals: classification.signals,
    durationSeconds: input.durationSeconds,
    dynamicFloor,
    drift: detectWallClockDrift(effectiveDeclared, dynamicFloor),
  };
}

export interface TestSizeReport {
  readonly schemaVersion: 1;
  readonly records: readonly MeasuredTestRecord[];
  readonly summary: { readonly totalFiles: number; readonly driftCount: number };
}

// Aggregate measured records into a report. First-class collection: the summary
// math (drift count = records whose drift is not "none", file total) lives HERE
// so the runner never open-codes it. Records are sorted by `file` in plain
// lexical order so the report is DETERMINISTIC regardless of the runner's
// iteration order (parallel tiers, tier ordering); the input array is not
// mutated. This is the single place ordering is decided.
export function buildTestSizeReport(records: readonly MeasuredTestRecord[]): TestSizeReport {
  const sorted = [...records].sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
  const driftCount = sorted.filter((r) => r.drift.kind !== "none").length;
  return {
    schemaVersion: 1,
    records: sorted,
    summary: { totalFiles: sorted.length, driftCount },
  };
}

export interface SizeObservation {
  readonly durationSeconds: number;
}

// An observation session spans the lifecycle of a file's run: begin() is called
// just BEFORE the runner spawns the test process, finish() AFTER it exits. The
// backend OWNS the measurement window between the two — for wall-clock this is a
// start-time map used as a fallback; a future strace/eBPF backend would open its
// tracer in begin() and attribute the syscalls collected in that window to the
// file in finish(). finish() returns null when it cannot produce a duration.
export interface SizeObservationSession {
  begin(file: string): void;
  finish(file: string, junitDurationSeconds: number | null): SizeObservation | null;
}

// A pluggable observation backend. openSession() yields a session that owns its
// own per-run measurement state, so the collection path is unit-testable
// in-process and the observation mechanism is swappable.
export interface SizeObservationBackend {
  readonly name: string;
  openSession(): SizeObservationSession;
}

// The wall-clock backend is the FIRST (and, in #699, only) consumer of the
// observation seam (election Q4 rider: no zero-consumer extension points). Its
// session records a per-file start time at begin(); at finish() it PREFERS the
// in-process JUnit duration (more precise — it excludes the runner's spawn /
// teardown overhead) and OWNS a fallback wall-clock measurement (Date.now()
// delta from begin) for when JUnit reports no usable time. A second backend
// (peak-RSS, CPU-time, syscall trace) plugs into the same begin/finish window.
export const wallClockBackend: SizeObservationBackend = {
  name: "wall-clock",
  openSession(): SizeObservationSession {
    const starts = new Map<string, number>();
    return {
      begin(file) {
        starts.set(file, Date.now());
      },
      finish(file, junitDurationSeconds) {
        const start = starts.get(file);
        starts.delete(file);
        if (junitDurationSeconds !== null && Number.isFinite(junitDurationSeconds)) {
          return { durationSeconds: junitDurationSeconds };
        }
        // Fallback: this session's own measurement window (opened at begin()).
        if (start === undefined) return null;
        return { durationSeconds: (Date.now() - start) / 1000 };
      },
    };
  },
};

// Failure-isolating wrappers around the session lifecycle. The runner MUST drive
// begin/finish through these so a throwing or misbehaving backend can never leak
// into the runner's exit path — every fault degrades to a note and (for finish)
// a null duration. Kept here (not in the runner) so the isolation is testable
// in-process with an injected throwing session.
export function beginObservation(
  session: SizeObservationSession,
  file: string,
  note: (msg: string) => void,
): void {
  try {
    session.begin(file);
  } catch (err) {
    note(`size observation begin failed for ${file}: ${err}`);
  }
}

export function finishObservation(
  session: SizeObservationSession,
  file: string,
  junitDurationSeconds: number | null,
  note: (msg: string) => void,
): number | null {
  try {
    const obs = session.finish(file, junitDurationSeconds);
    if (obs === null) {
      note(`size observation produced no duration for ${file}`);
      return null;
    }
    if (!Number.isFinite(obs.durationSeconds)) {
      note(`size observation produced a non-finite duration for ${file}`);
      return null;
    }
    return obs.durationSeconds;
  } catch (err) {
    note(`size observation finish failed for ${file}: ${err}`);
    return null;
  }
}

// Parse a `// size: <value>` header. Scans the leading comment region (first
// ~40 lines) so it mirrors where `// covers:` lives. First match wins.
export function parseSizeAnnotation(source: string): SizeAnnotation {
  const head = source.split(/\r?\n/).slice(0, 40);
  for (const raw of head) {
    const m = raw.match(/^\s*(?:\/\/|#)\s*size:\s*(\S+)/i);
    if (!m) continue;
    const value = m[1].toLowerCase();
    if ((SIZE_VALUES as readonly string[]).includes(value)) {
      return { declared: value as TestSize };
    }
    return { declared: null, invalidValue: m[1] };
  }
  return { declared: null };
}
