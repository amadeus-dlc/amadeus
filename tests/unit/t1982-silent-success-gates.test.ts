// covers: #1982 -- the three "silent success" detectors the runner applies to
// every test file: a file that executed testcases but evaluated zero
// assertions, a file that self-SKIPs a testcase without a live ledger entry,
// and a file that leaves an orphan child process behind (#1811). This pins the
// PURE core in tests/lib/silent-success.ts -- mode resolution, baseline
// parsing/expiry, JUnit reading, marker detection, the /proc and `ps` text
// parsers, the grace-window poll, and the reaper -- through injected seams, so
// every arm (including the ones that need a real leaked process or a CI
// environment) is reachable deterministically. The end-to-end proofs against
// the real runner live in
// tests/integration/t1982-silent-success-runner.integration.serial.test.ts.

import { describe, expect, test } from "bun:test";
import {
  anyGateActive,
  daysBetween,
  detectLeakedProcesses,
  EMPTY_BASELINE,
  environBufferHasMarker,
  extractSkippedTestNames,
  findAssertionFreeMarker,
  isLeakBaselined,
  judgeSkip,
  judgeZeroAssertion,
  leakMarker,
  loadBaseline,
  type MarkedProcess,
  parseBaseline,
  parseJUnitGateSummary,
  parsePsProcessLines,
  type ProcessScanIo,
  reapProcesses,
  recordSkips,
  renderLeakLines,
  renderSkipCensus,
  renderSkipViolation,
  renderZeroAssertionViolation,
  resolveGateModes,
  scanForMarkedProcesses,
  type SilentSuccessBaseline,
  type SkipObservation,
  todayUtc,
  unescapeXml,
} from "../lib/silent-success.ts";

// A NUL built at runtime: /proc/<pid>/environ and /proc/<pid>/cmdline are
// NUL-separated, and a literal control byte in a source file is exactly what
// tests/control-byte-gate.ts exists to reject.
const NUL = String.fromCharCode(0);

// The real bun 1.3.13 shape, verified against `bun test --reporter=junit`:
// the root carries `assertions`, and a skipped case carries a nested <skipped />.
const JUNIT_MIXED = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="bun test" tests="3" assertions="1" failures="0" skipped="1" time="0.004883">
  <testsuite name="p1.test.ts" file="p1.test.ts" tests="3" assertions="1" failures="0" skipped="1" time="0">
    <testsuite name="d" file="p1.test.ts" line="2" tests="3" assertions="1" failures="0" skipped="1" time="0">
      <testcase name="no assertions" classname="d" time="0.000017" file="p1.test.ts" line="3" assertions="0" />
      <testcase name="skipped &amp; waiting" classname="d" time="0" file="p1.test.ts" line="4" assertions="0">
        <skipped />
      </testcase>
      <testcase name="real" classname="d" time="0" file="p1.test.ts" line="5" assertions="1" />
    </testsuite>
  </testsuite>
</testsuites>`;

const JUNIT_ZERO_ASSERTION = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="bun test" tests="2" assertions="0" failures="0" skipped="0" time="0.001">
  <testsuite name="z.test.ts" file="z.test.ts" tests="2" assertions="0" failures="0" skipped="0" time="0">
    <testcase name="a" classname="z" time="0" assertions="0" />
    <testcase name="b" classname="z" time="0" assertions="0" />
  </testsuite>
</testsuites>`;

function baselineWith(overrides: Partial<SilentSuccessBaseline>): SilentSuccessBaseline {
  return { ...EMPTY_BASELINE, ...overrides };
}

describe("t1982 gate mode resolution", () => {
  test("off disables all three gates and anyGateActive reports it", () => {
    const { modes, warning } = resolveGateModes({ AMADEUS_SILENT_SUCCESS_GATE: "off" }, "linux");
    expect(modes).toEqual({ zeroAssertion: "off", skip: "off", leak: "off" });
    expect(warning).toBeNull();
    expect(anyGateActive(modes)).toBe(false);
  });

  test("off beats the AMADEUS_SILENT_SUCCESS_LEAK=fail override", () => {
    const { modes } = resolveGateModes(
      { AMADEUS_SILENT_SUCCESS_GATE: "off", AMADEUS_SILENT_SUCCESS_LEAK: "fail" },
      "darwin",
    );
    expect(modes.leak).toBe("off");
  });

  test("strict makes every gate fail-closed on any platform", () => {
    const { modes } = resolveGateModes({ AMADEUS_SILENT_SUCCESS_GATE: "strict" }, "darwin");
    expect(modes).toEqual({ zeroAssertion: "strict", skip: "strict", leak: "strict" });
  });

  test("report never flips a file, and anyGateActive still reports work to do", () => {
    const { modes } = resolveGateModes({ AMADEUS_SILENT_SUCCESS_GATE: "report" }, "linux");
    expect(modes).toEqual({ zeroAssertion: "report", skip: "report", leak: "report" });
    expect(anyGateActive(modes)).toBe(true);
  });

  test("report + LEAK=fail arms only the leak gate", () => {
    const { modes } = resolveGateModes(
      { AMADEUS_SILENT_SUCCESS_GATE: "report", AMADEUS_SILENT_SUCCESS_LEAK: "fail" },
      "darwin",
    );
    expect(modes).toEqual({ zeroAssertion: "report", skip: "report", leak: "strict" });
  });

  test("unset outside CI: zero-assertion strict, skip and leak report", () => {
    const { modes, warning } = resolveGateModes({}, "darwin");
    expect(modes).toEqual({ zeroAssertion: "strict", skip: "report", leak: "report" });
    expect(warning).toBeNull();
  });

  test("unset on Linux CI: all three strict", () => {
    const { modes } = resolveGateModes({ GITHUB_ACTIONS: "true" }, "linux");
    expect(modes).toEqual({ zeroAssertion: "strict", skip: "strict", leak: "strict" });
  });

  test("unset on macOS CI: the leak gate stays report-only (best-effort scan)", () => {
    const { modes } = resolveGateModes({ GITHUB_ACTIONS: "true" }, "darwin");
    expect(modes.skip).toBe("strict");
    expect(modes.leak).toBe("report");
  });

  test("LEAK=fail arms the leak gate off-CI and off-Linux", () => {
    const { modes } = resolveGateModes({ AMADEUS_SILENT_SUCCESS_LEAK: "fail" }, "darwin");
    expect(modes.leak).toBe("strict");
  });

  test("an unrecognized value warns and falls back to the safe defaults, not to off", () => {
    const { modes, warning } = resolveGateModes({ AMADEUS_SILENT_SUCCESS_GATE: "of" }, "darwin");
    expect(modes.zeroAssertion).toBe("strict");
    expect(warning).toContain("not one of off|report|strict");
  });
});

describe("t1982 baseline parsing (fail-closed)", () => {
  test("parses a full document", () => {
    const loaded = parseBaseline(
      JSON.stringify({
        schemaVersion: 1,
        zeroAssertion: [{ file: "tests/unit/a.test.ts", reason: "r", issue: "#1982" }],
        skips: [
          {
            file: "tests/unit/b.test.ts",
            test: "*",
            reason: "r",
            issue: "#1982",
            firstObserved: "2026-08-20",
            expires: "2026-11-18",
          },
        ],
        leaks: [{ file: "tests/e2e/c.test.ts", reason: "r", issue: "#1982" }],
      }),
    );
    expect(loaded.kind).toBe("loaded");
    if (loaded.kind !== "loaded") return;
    expect(loaded.doc.zeroAssertion).toHaveLength(1);
    expect(loaded.doc.skips[0]?.expires).toBe("2026-11-18");
    expect(loaded.doc.leaks[0]?.file).toBe("tests/e2e/c.test.ts");
  });

  test("absent sections default to empty", () => {
    const loaded = parseBaseline(JSON.stringify({ schemaVersion: 1 }));
    expect(loaded).toEqual({ kind: "loaded", doc: EMPTY_BASELINE });
  });

  test("unparseable JSON fails closed", () => {
    const loaded = parseBaseline("{ not json");
    expect(loaded.kind).toBe("failed");
    if (loaded.kind !== "failed") return;
    expect(loaded.detail).toContain("not valid JSON");
  });

  test("a wrong schemaVersion fails closed rather than guessing", () => {
    const loaded = parseBaseline(JSON.stringify({ schemaVersion: 2, skips: [] }));
    expect(loaded.kind).toBe("failed");
    if (loaded.kind !== "failed") return;
    expect(loaded.detail).toContain("schemaVersion must be 1");
  });

  test("a non-object document fails closed", () => {
    expect(parseBaseline("[]").kind).toBe("failed");
  });

  test("a section that is not an array fails closed", () => {
    const loaded = parseBaseline(JSON.stringify({ schemaVersion: 1, skips: {} }));
    expect(loaded.kind).toBe("failed");
    if (loaded.kind !== "failed") return;
    expect(loaded.detail).toContain("skips must be an array");
  });

  test("a skip entry missing a required field fails closed", () => {
    const loaded = parseBaseline(
      JSON.stringify({
        schemaVersion: 1,
        skips: [{ file: "tests/unit/b.test.ts", test: "*", reason: "r", issue: "#1982" }],
      }),
    );
    expect(loaded.kind).toBe("failed");
    if (loaded.kind !== "failed") return;
    expect(loaded.detail).toContain("firstObserved");
  });

  test("a non-ISO date fails closed", () => {
    const loaded = parseBaseline(
      JSON.stringify({
        schemaVersion: 1,
        skips: [
          {
            file: "f",
            test: "*",
            reason: "r",
            issue: "#1982",
            firstObserved: "20/08/2026",
            expires: "2026-11-18",
          },
        ],
      }),
    );
    expect(loaded.kind).toBe("failed");
    if (loaded.kind !== "failed") return;
    expect(loaded.detail).toContain("YYYY-MM-DD");
  });

  test("an empty-string reason is not a reason", () => {
    const loaded = parseBaseline(
      JSON.stringify({ schemaVersion: 1, zeroAssertion: [{ file: "f", reason: "  ", issue: "#1" }] }),
    );
    expect(loaded.kind).toBe("failed");
  });

  // A path that cannot exist: loadBaseline's absent-file arm must read as "no
  // exemptions", never as a load failure. The on-disk arms (a real missing file
  // and a real malformed one) are proven against the runner end to end in
  // tests/integration/t1982-silent-success-runner.integration.serial.test.ts -- this
  // file stays filesystem-free so it keeps the unit tier's `small` size budget.
  test("an absent baseline file is an empty baseline, not a load failure", () => {
    expect(loadBaseline("/nonexistent/t1982/silent-success-baseline.json")).toEqual({
      kind: "loaded",
      doc: EMPTY_BASELINE,
    });
  });
});

describe("t1982 JUnit reading", () => {
  test("reads tests/assertions/skipped off the bun root element", () => {
    const summary = parseJUnitGateSummary(JUNIT_MIXED);
    expect(summary.tests).toBe(3);
    expect(summary.assertions).toBe(1);
    expect(summary.skipped).toBe(1);
  });

  test("names the skipped testcases and unescapes XML entities", () => {
    expect(extractSkippedTestNames(JUNIT_MIXED)).toEqual(["skipped & waiting"]);
    expect(unescapeXml("a &lt;b&gt; &quot;c&quot; &apos;d&apos; &amp;e")).toBe(`a <b> "c" 'd' &e`);
  });

  test("a self-closing testcase is never read as skipped", () => {
    expect(extractSkippedTestNames(JUNIT_ZERO_ASSERTION)).toEqual([]);
  });

  test("empty XML (the empty-suite / import-crash case) yields the empty summary", () => {
    expect(parseJUnitGateSummary("")).toEqual({
      tests: 0,
      assertions: null,
      skipped: 0,
      skippedTests: [],
    });
  });

  test("a document without a root <testsuites> reports assertions as unknown", () => {
    const summary = parseJUnitGateSummary(
      '<testsuite name="x"><testcase name="a" /><testcase name="b"><skipped /></testcase></testsuite>',
    );
    expect(summary.tests).toBe(2);
    expect(summary.assertions).toBeNull();
    expect(summary.skippedTests).toEqual(["b"]);
  });
});

describe("t1982 gate 1: zero assertion", () => {
  const passingZero = {
    file: "tests/unit/z.test.ts",
    status: "PASS" as const,
    summary: parseJUnitGateSummary(JUNIT_ZERO_ASSERTION),
    source: "test('a', () => {});\n",
    baseline: EMPTY_BASELINE,
  };

  test("a PASS with executed testcases and zero assertions is a violation", () => {
    const verdict = judgeZeroAssertion(passingZero);
    expect(verdict).toEqual({ kind: "violation", executed: 2 });
  });

  test("a file with assertions is fine", () => {
    expect(judgeZeroAssertion({ ...passingZero, summary: parseJUnitGateSummary(JUNIT_MIXED) })).toEqual({
      kind: "ok",
    });
  });

  test("an already-FAILing file is not double-reported", () => {
    expect(judgeZeroAssertion({ ...passingZero, status: "FAIL" })).toEqual({ kind: "ok" });
  });

  test("the empty suite (no XML at all) is deliberately not a violation", () => {
    expect(judgeZeroAssertion({ ...passingZero, summary: parseJUnitGateSummary("") })).toEqual({
      kind: "ok",
    });
  });

  test("an all-skipped file belongs to the skip gate, not this one", () => {
    const summary = parseJUnitGateSummary(
      '<testsuites tests="1" assertions="0" failures="0" skipped="1" time="0"><testcase name="a"><skipped /></testcase></testsuites>',
    );
    expect(judgeZeroAssertion({ ...passingZero, summary })).toEqual({ kind: "ok" });
  });

  test("an absent assertions attribute is treated as unknown, never as zero", () => {
    const summary = parseJUnitGateSummary(
      '<testsuites tests="1" failures="0" skipped="0" time="0"><testcase name="a" /></testsuites>',
    );
    expect(judgeZeroAssertion({ ...passingZero, summary })).toEqual({ kind: "ok" });
  });

  test("the // assertion-free marker exempts, and carries its reason", () => {
    const verdict = judgeZeroAssertion({
      ...passingZero,
      source: "// assertion-free: import-shape guard, a throw is the failure\ntest('a', () => {});\n",
    });
    expect(verdict).toEqual({
      kind: "exempt",
      via: "marker",
      reason: "import-shape guard, a throw is the failure",
    });
  });

  test("a reasonless marker does not exempt", () => {
    expect(judgeZeroAssertion({ ...passingZero, source: "// assertion-free:\n" })).toEqual({
      kind: "violation",
      executed: 2,
    });
    expect(findAssertionFreeMarker("// assertion-free:   ")).toBeNull();
  });

  test("a baseline entry exempts and reports its reason plus issue", () => {
    const verdict = judgeZeroAssertion({
      ...passingZero,
      baseline: baselineWith({
        zeroAssertion: [{ file: "tests/unit/z.test.ts", reason: "pre-existing debt", issue: "#1982" }],
      }),
    });
    expect(verdict).toEqual({ kind: "exempt", via: "baseline", reason: "pre-existing debt (#1982)" });
  });

  test("a baseline entry for a DIFFERENT file does not exempt", () => {
    expect(
      judgeZeroAssertion({
        ...passingZero,
        baseline: baselineWith({
          zeroAssertion: [{ file: "tests/unit/other.test.ts", reason: "r", issue: "#1982" }],
        }),
      }).kind,
    ).toBe("violation");
  });

  test("an unreadable source falls back to the baseline alone", () => {
    expect(judgeZeroAssertion({ ...passingZero, source: null }).kind).toBe("violation");
  });
});

describe("t1982 gate 2: chronic self-SKIP ledger", () => {
  const ledger = baselineWith({
    skips: [
      {
        file: "tests/unit/b.test.ts",
        test: "*",
        reason: "tmux substrate absent",
        issue: "#1982",
        firstObserved: "2026-05-22",
        expires: "2026-11-18",
      },
      {
        file: "tests/unit/c.test.ts",
        test: "named case",
        reason: "stale",
        issue: "#1982",
        firstObserved: "2026-01-01",
        expires: "2026-03-01",
      },
    ],
  });

  test("an unregistered skip is a violation", () => {
    expect(judgeSkip("tests/unit/a.test.ts", "x", ledger, "2026-08-20")).toEqual({
      kind: "unregistered",
    });
  });

  test('"*" covers every case in the file, including dynamically named ones', () => {
    const verdict = judgeSkip("tests/unit/b.test.ts", "anything at all", ledger, "2026-08-20");
    expect(verdict.kind).toBe("registered");
    if (verdict.kind === "unregistered") return;
    expect(verdict.ageDays).toBe(90);
  });

  test("a named entry does not cover a different case in the same file", () => {
    expect(judgeSkip("tests/unit/c.test.ts", "other case", ledger, "2026-08-20").kind).toBe(
      "unregistered",
    );
  });

  test("an expired entry is a violation, not an exemption", () => {
    const verdict = judgeSkip("tests/unit/c.test.ts", "named case", ledger, "2026-08-20");
    expect(verdict.kind).toBe("expired");
  });

  test("the expiry boundary is inclusive on its own day and fails the day after", () => {
    expect(judgeSkip("tests/unit/b.test.ts", "x", ledger, "2026-11-18").kind).toBe("registered");
    expect(judgeSkip("tests/unit/b.test.ts", "x", ledger, "2026-11-19").kind).toBe("expired");
  });

  test("a named entry wins over the file's wildcard, whatever the document order", () => {
    const mixed = baselineWith({
      skips: [
        {
          file: "tests/unit/d.test.ts",
          test: "*",
          reason: "broad and stale",
          issue: "#1982",
          firstObserved: "2020-01-01",
          expires: "2020-02-01",
        },
        {
          file: "tests/unit/d.test.ts",
          test: "the specific case",
          reason: "narrow and live",
          issue: "#1982",
          firstObserved: "2026-08-01",
          expires: "2099-01-01",
        },
      ],
    });
    const named = judgeSkip("tests/unit/d.test.ts", "the specific case", mixed, "2026-08-20");
    expect(named.kind).toBe("registered");
    // Any other case in the same file still falls back to the (expired) wildcard.
    expect(judgeSkip("tests/unit/d.test.ts", "some other case", mixed, "2026-08-20").kind).toBe(
      "expired",
    );
  });

  test("daysBetween counts whole UTC days and rejects garbage", () => {
    expect(daysBetween("2026-08-20", "2026-11-18")).toBe(90);
    expect(daysBetween("2026-08-20", "2026-08-20")).toBe(0);
    expect(daysBetween("nope", "2026-08-20")).toBeNull();
  });

  test("todayUtc renders the UTC calendar day", () => {
    expect(todayUtc(new Date("2026-08-20T23:59:59Z"))).toBe("2026-08-20");
  });

  test("the census counts occurrences per (file, testcase)", () => {
    const census = new Map<string, SkipObservation>();
    recordSkips(census, "tests/unit/a.test.ts", ["one", "two"]);
    recordSkips(census, "tests/unit/a.test.ts", ["one"]);
    recordSkips(census, "tests/unit/b.test.ts", ["one"]);
    expect([...census.values()].sort((x, y) => x.file.localeCompare(y.file) || x.test.localeCompare(y.test))).toEqual([
      { file: "tests/unit/a.test.ts", test: "one", count: 2 },
      { file: "tests/unit/a.test.ts", test: "two", count: 1 },
      { file: "tests/unit/b.test.ts", test: "one", count: 1 },
    ]);
  });

  test("the census prints age and expiry for a registered skip and flags the rest", () => {
    const lines = renderSkipCensus(
      [
        { file: "tests/unit/b.test.ts", test: "held case", count: 3 },
        { file: "tests/unit/c.test.ts", test: "named case", count: 1 },
        { file: "tests/unit/a.test.ts", test: "loose", count: 1 },
      ],
      ledger,
      "2026-08-20",
    );
    expect(lines[0]).toBe("self-skipped tests: 3 distinct case(s) this run");
    expect(lines.join("\n")).toContain(
      "tests/unit/b.test.ts :: held case (x3) — registered age=90d expires=2026-11-18",
    );
    expect(lines.join("\n")).toContain("tests/unit/c.test.ts :: named case (x1) — EXPIRED");
    expect(lines.join("\n")).toContain("tests/unit/a.test.ts :: loose (x1) — UNREGISTERED");
  });

  test("a run with no skips still prints a census line (the counter is always visible)", () => {
    expect(renderSkipCensus([], EMPTY_BASELINE, "2026-08-20")).toEqual([
      "self-skipped tests: none observed this run",
    ]);
  });
});

describe("t1982 gate 3: process leak", () => {
  const MARKER = leakMarker("t33.test.ts");

  test("the marker is the exact env entry the runner injects", () => {
    expect(MARKER).toBe("AMADEUS_TEST_NAME=t33.test.ts");
  });

  test("a /proc environ match is exact, not a substring", () => {
    expect(environBufferHasMarker(`PATH=/usr/bin${NUL}${MARKER}${NUL}HOME=/root`, MARKER)).toBe(true);
    expect(environBufferHasMarker(`AMADEUS_TEST_NAME=t33.test.ts.bak${NUL}`, MARKER)).toBe(false);
    expect(environBufferHasMarker(`X=prefix-${MARKER}${NUL}`, MARKER)).toBe(false);
  });

  test("ps output parsing keeps pid + command and requires a whole-token match", () => {
    const output = [
      `  4201 sleep 300 HOME=/Users/x ${MARKER} SHELL=/bin/zsh`,
      `  4202 sleep 300 AMADEUS_TEST_NAME=t33.test.tsx SHELL=/bin/zsh`,
      "  4203 some other process",
      "garbage line without a pid",
    ].join("\n");
    const found = parsePsProcessLines(output, MARKER, new Set());
    expect(found).toHaveLength(1);
    expect(found[0]?.pid).toBe(4201);
    expect(found[0]?.command).toContain("sleep 300");
  });

  test("ps parsing never reports an excluded pid (the runner's own)", () => {
    const output = `  4201 sleep 300 ${MARKER}`;
    expect(parsePsProcessLines(output, MARKER, new Set([4201]))).toEqual([]);
  });

  test("a marker at end-of-line still matches", () => {
    expect(parsePsProcessLines(`  99 sleep 300 ${MARKER}`, MARKER, new Set())).toHaveLength(1);
  });

  test("the Linux scan reads /proc, skips races and its own pid, and renders cmdline", () => {
    const io: ProcessScanIo = {
      platform: "linux",
      selfPid: 100,
      listProc: () => ["1", "100", "200", "300", "cpuinfo"],
      readEnviron: (pid) => {
        if (pid === 200) return `PATH=/usr/bin${NUL}${MARKER}${NUL}`;
        if (pid === 300) return null; // raced away / not ours
        return `PATH=/usr/bin${NUL}`;
      },
      readCmdline: (pid) => (pid === 200 ? `sleep${NUL}300${NUL}` : null),
      runPs: () => null,
    };
    expect(scanForMarkedProcesses(MARKER, io)).toEqual([{ pid: 200, command: "sleep 300" }]);
  });

  test("the Linux scan never inspects its own pid even when the marker is in its env", () => {
    const io: ProcessScanIo = {
      platform: "linux",
      selfPid: 100,
      listProc: () => ["100"],
      readEnviron: () => `${MARKER}${NUL}`,
      readCmdline: () => null,
      runPs: () => null,
    };
    expect(scanForMarkedProcesses(MARKER, io)).toEqual([]);
  });

  test("the darwin scan goes through ps, and a failed ps reports nothing", () => {
    const base = {
      platform: "darwin",
      selfPid: 100,
      listProc: () => [],
      readEnviron: () => null,
      readCmdline: () => null,
    };
    expect(scanForMarkedProcesses(MARKER, { ...base, runPs: () => `  7 sleep 9 ${MARKER}` })).toEqual([
      { pid: 7, command: `sleep 9 ${MARKER}` },
    ]);
    expect(scanForMarkedProcesses(MARKER, { ...base, runPs: () => null })).toEqual([]);
  });

  test("win32 reports nothing rather than guessing", () => {
    const io: ProcessScanIo = {
      platform: "win32",
      selfPid: 1,
      listProc: () => {
        throw new Error("must not be called");
      },
      readEnviron: () => null,
      readCmdline: () => null,
      runPs: () => {
        throw new Error("must not be called");
      },
    };
    expect(scanForMarkedProcesses(MARKER, io)).toEqual([]);
  });

  test("a clean file pays exactly one scan and no waiting", async () => {
    let scans = 0;
    let slept = 0;
    const leaked = await detectLeakedProcesses({
      scan: () => {
        scans += 1;
        return [];
      },
      sleep: async (ms) => {
        slept += ms;
      },
      now: () => 0,
      graceMs: 2000,
      pollMs: 100,
    });
    expect(leaked).toEqual([]);
    expect(scans).toBe(1);
    expect(slept).toBe(0);
  });

  test("a process that clears inside the grace window is not a leak", async () => {
    const proc: MarkedProcess[] = [{ pid: 4201, command: "sleep 300" }];
    let clock = 0;
    let scans = 0;
    const leaked = await detectLeakedProcesses({
      scan: () => {
        scans += 1;
        return scans < 3 ? proc : [];
      },
      sleep: async (ms) => {
        clock += ms;
      },
      now: () => clock,
      graceMs: 2000,
      pollMs: 100,
    });
    expect(leaked).toEqual([]);
    expect(scans).toBe(3);
  });

  test("a process still marked after the grace window is a leak", async () => {
    const proc: MarkedProcess[] = [{ pid: 4201, command: "sleep 300" }];
    let clock = 0;
    const leaked = await detectLeakedProcesses({
      scan: () => proc,
      sleep: async (ms) => {
        clock += ms;
      },
      now: () => clock,
      graceMs: 300,
      pollMs: 100,
    });
    expect(leaked).toEqual(proc);
  });

  test("the reaper kills every leak, never itself, and survives a kill that throws", () => {
    const killed: number[] = [];
    const reaped = reapProcesses(
      [
        { pid: 4201, command: "a" },
        { pid: 99, command: "self" },
        { pid: 4202, command: "already gone" },
        { pid: 0, command: "bogus" },
      ],
      99,
      (pid) => {
        if (pid === 4202) throw new Error("ESRCH");
        killed.push(pid);
      },
    );
    expect(killed).toEqual([4201]);
    expect(reaped).toBe(1);
  });

  test("a leaks baseline entry is matched by exact repo-relative path", () => {
    const baseline = baselineWith({
      leaks: [{ file: "tests/e2e/z.test.ts", reason: "known", issue: "#1982" }],
    });
    expect(isLeakBaselined("tests/e2e/z.test.ts", baseline)?.reason).toBe("known");
    expect(isLeakBaselined("tests/e2e/other.test.ts", baseline)).toBeUndefined();
  });
});

describe("t1982 ps token boundaries", () => {
  const MARKER = "AMADEUS_TEST_NAME=t33.test.ts";

  test("a marker embedded in another variable's VALUE is not a hit (left boundary)", () => {
    const out = `  77 /bin/sleep 120 X=prefix-${MARKER}`;
    expect(parsePsProcessLines(out, MARKER, new Set())).toEqual([]);
  });

  test("a boundary-failing first occurrence cannot shadow a genuine later one", () => {
    const out = `  78 /bin/sleep 120 OLD=${MARKER}.bak ${MARKER} PATH=/usr/bin`;
    const found = parsePsProcessLines(out, MARKER, new Set());
    expect(found.map((p) => p.pid)).toEqual([78]);
  });
});

describe("t1982 baseline row validation", () => {
  test("a non-object row in a section fails closed", () => {
    const loaded = parseBaseline(JSON.stringify({ schemaVersion: 1, zeroAssertion: [42] }));
    expect(loaded.kind).toBe("failed");
    if (loaded.kind === "failed") expect(loaded.detail).toBe("zeroAssertion[0] must be an object");
  });

  test("zeroAssertion and leaks share one validator, so both name their own section", () => {
    const missing = parseBaseline(JSON.stringify({ schemaVersion: 1, leaks: [{ file: "f" }] }));
    expect(missing.kind).toBe("failed");
    if (missing.kind === "failed") {
      expect(missing.detail).toBe('leaks[0] needs non-empty "file", "reason", and "issue"');
    }
  });
});

describe("t1982 gate output rendering", () => {
  test("the zero-assertion finding names the file, the count, and every remedy", () => {
    const lines = renderZeroAssertionViolation("tests/unit/x.test.ts", 3);
    expect(lines[0]).toBe(
      "GATE zero-assertion: tests/unit/x.test.ts ran 3 testcase(s) and evaluated 0 assertions",
    );
    const body = lines.join("\n");
    expect(body).toContain("// assertion-free: <reason>");
    expect(body).toContain('"zeroAssertion"');
  });

  test("the skip finding lists the offenders and the ledger remedy", () => {
    const lines = renderSkipViolation("tests/unit/y.test.ts", ['"case a" -- UNREGISTERED']);
    expect(lines[0]).toBe(
      "GATE skip: tests/unit/y.test.ts self-skipped 1 testcase(s) with no valid ledger entry",
    );
    expect(lines[1]).toBe('  "case a" -- UNREGISTERED');
    expect(lines.join("\n")).toContain('"skips"');
  });

  test("the leak finding names each pid, the reap count, and (only when failing) the fix", () => {
    const procs = [{ pid: 41, command: "sleep 120" }];
    const failing = renderLeakLines("tests/unit/z.test.ts", procs, 1, true);
    expect(failing[0]).toContain("left 1 process(es) running");
    expect(failing).toContain("  pid 41: sleep 120");
    expect(failing).toContain("  reaped 1 of 1 (SIGKILL)");
    expect(failing.join("\n")).toContain("must not outlive itself");

    const reportOnly = renderLeakLines("tests/unit/z.test.ts", procs, 1, false);
    expect(reportOnly.join("\n")).not.toContain("must not outlive itself");
  });
});
