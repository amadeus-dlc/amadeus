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
