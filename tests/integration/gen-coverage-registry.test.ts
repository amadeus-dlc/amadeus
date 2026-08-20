// covers: harness-instrument:coverage-registry-generator
//
// gen-coverage-registry.test.ts — calibrates the L-SURFACE coverage instrument
// (tests/gen-coverage-registry.ts). Mechanism: none (pure in-process + a
// deterministic spawn of the tool against a temp tree; zero LLM, zero tokens).
// Technique: known-answer + fault-injection + guard-rejection.
//
// WHAT THIS PINS. The generator is itself a measuring instrument: if it
// silently reports "0 units" or fails to fail on a new uncovered unit, every
// coverage claim downstream is worthless. These tests are the trust anchor:
//
//   1. ENUMERATION NON-EMPTY per class (anti-rot guard a) — a broken
//      enumerator returning [] would otherwise report "100% covered, 0 units".
//   2. The GUARANTEE-PRINCIPLE GATE rejects an under-mechanism claim — a `none`
//      test cannot legitimately cover a unit whose minMechanism is `cli`.
//   3. `--check` exits 1 (naming the gap) when a NEW uncovered unit is injected
//      into a temp copy of the source, and exits 0 when the temp tree is clean.
//   4. The RATCHET catches a simulated covered-count DECREASE.
//   5. The SUBCOMMAND CROSS-CHECK (anti-rot guard b) holds for real source:
//      the structured parser count equals the independent dispatch-site count.
//
// The injection tests use the AMADEUS_COVERAGE_* env-var seams to redirect the
// source root, claim discovery, and committed-baseline paths at fixtures or a
// temp tree — the real shipped source and committed registry are NEVER mutated.

import { scaleTestTime } from "../lib/test-time-factor.ts";
import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildRegistry,
  emptyClasses,
  enumerateAllUnits,
  MECHANISMS,
  MIN_MECHANISM,
  mechanismFromSegment,
  mechanismOfTestFile,
  mechanismRank,
  parseCoversHeader,
  parseObjectDispatchKeys,
  parseRatchetText,
  parseSwitchDispatchCases,
  ratchetFromRows,
  registryJson,
  runCheck,
  subcommandCrossCheck,
  UNIT_CLASSES,
} from "../gen-coverage-registry.ts";

// This test lives in tests/integration/; the generator tool + repo root are one level up.
const __FILE_DIR = dirname(fileURLToPath(import.meta.url));
const TESTS_DIR = join(__FILE_DIR, "..");
const REPO_ROOT = join(__FILE_DIR, "..", "..");
const TOOL = join(TESTS_DIR, "gen-coverage-registry.ts");
const CLAIMS_FIXTURE_DIR = join(TESTS_DIR, "fixtures", "coverage-registry");
const liveRegistry = buildRegistry();

// ---------------------------------------------------------------------------
// 1. ENUMERATION NON-EMPTY per class (anti-rot guard a).
// ---------------------------------------------------------------------------
describe("enumeration is non-empty for every unit class (anti-rot guard a)", () => {
  const { rows } = liveRegistry;

  test("emptyClasses() reports no empty class against real source", () => {
    expect(emptyClasses(rows)).toEqual([]);
  });

  test("each class enumerates a plausible MINIMUM count", () => {
    // Hard floors transcribed from fresh source reads (2026-05-31), independent
    // of the enumerator. A drop below any floor means an enumerator stopped
    // seeing source — exactly the silent-rot failure this guards.
    const counts = Object.fromEntries(
      UNIT_CLASSES.map((c) => [c, rows.filter((r) => r.unitClass === c).length]),
    ) as Record<string, number>;
    expect(counts.function).toBeGreaterThanOrEqual(80); // 89 today (71 lib + 18 graph)
    expect(counts.audit).toBeGreaterThanOrEqual(55); // 61 today
    expect(counts.scope).toBeGreaterThanOrEqual(9); // 9 scope keys today
    expect(counts.stage).toBeGreaterThanOrEqual(30); // 32 stage .md today
    expect(counts.hook).toBeGreaterThanOrEqual(7); // 9 hooks today
    expect(counts.subcommand).toBeGreaterThanOrEqual(60); // 74 today
    expect(counts["render-surface"]).toBe(7); // statusline render branches (incl. agent display)
  });

  test("every row carries a valid status and a minMechanism matching its class", () => {
    const valid = new Set([
      "covered",
      "UNCOVERED",
      "UNDER-MECHANISM",
      "DEFERRED-tui",
    ]);
    for (const r of rows) {
      expect(valid.has(r.status)).toBe(true);
      expect(r.minMechanism).toBe(MIN_MECHANISM[r.unitClass]);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. The GUARANTEE-PRINCIPLE GATE rejects an under-mechanism claim.
// ---------------------------------------------------------------------------
describe("guarantee-principle gate (mechanism >= minMechanism)", () => {
  test("the mechanism ladder is none < cli < sdk < tui", () => {
    expect(mechanismRank("none")).toBeLessThan(mechanismRank("cli"));
    expect(mechanismRank("cli")).toBeLessThan(mechanismRank("sdk"));
    expect(mechanismRank("sdk")).toBeLessThan(mechanismRank("tui"));
  });

  test("the calibration tier maps to sdk; unknown tokens are rejected loudly", () => {
    expect(mechanismFromSegment("calibration")).toBe("sdk");
    expect(mechanismFromSegment("none")).toBe("none");
    expect(() => mechanismFromSegment("bogus")).toThrow(/unknown mechanism/);
  });

  test("a real subcommand unit (minMechanism cli) is NOT covered by a none-tier claim", () => {
    // Pick the first subcommand unit. Its minMechanism is `cli`. No shipped
    // test today claims it at cli mechanism, so it must be UNCOVERED — proving
    // a hypothetical .none. claim would be gated out, never counted as covered.
    const { rows } = liveRegistry;
    const sub = rows.find((r) => r.unitClass === "subcommand");
    expect(sub).toBeDefined();
    expect(sub!.minMechanism).toBe("cli");
    // Status is UNCOVERED (no adequate claim), never `covered`.
    expect(sub!.status).not.toBe("covered");
  });

  test("synthetic: a none-mechanism claim against a cli unit yields UNDER-MECHANISM, not covered", () => {
    // Build a temp tests dir whose ONLY claim is a .none. file naming a real
    // subcommand. The unit's minMechanism is cli > none, so the gate must
    // demote the claim: status UNDER-MECHANISM (claims present but all too weak).
    const tmp = mkdtempSync(join(tmpdir(), "cov-undermech-"));
    try {
      // Discover a real subcommand id to name in the claim.
      const realSub = enumerateAllUnits().find(
        (u) => u.unitClass === "subcommand",
      )!;
      const [tool, sub] = realSub.unitId.split(" ");
      const tiers = join(tmp, "unit");
      mkdirSync(tiers, { recursive: true });
      writeFileSync(
        join(tiers, "tfake.none.test.ts"),
        `// covers: subcommand:${tool}:${sub}\nimport { test } from "bun:test";\ntest("x", () => {});\n`,
      );

      const res = spawnSync(
        process.execPath,
        [TOOL, "--print"],
        {
          encoding: "utf-8",
          env: {
            ...process.env,
            AMADEUS_COVERAGE_TESTS_DIR: tmp,
          },
        },
      );
      expect(res.status).toBe(0);
      const doc = JSON.parse(res.stdout);
      const row = doc.units.find(
        (u: { unitClass: string; unitId: string }) =>
          u.unitClass === "subcommand" && u.unitId === `${tool} ${sub}`,
      );
      expect(row).toBeDefined();
      // The claim WAS recorded (transparency) ...
      expect(row.coveredBy.length).toBeGreaterThanOrEqual(1);
      expect(row.coveredBy[0].mechanism).toBe("none");
      // ... but the gate demoted it: too weak for a cli-min unit.
      expect(row.status).toBe("UNDER-MECHANISM");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("synthetic: a cli-mechanism claim DOES cover the same cli unit", () => {
    const tmp = mkdtempSync(join(tmpdir(), "cov-clihit-"));
    try {
      const realSub = enumerateAllUnits().find(
        (u) => u.unitClass === "subcommand",
      )!;
      const [tool, sub] = realSub.unitId.split(" ");
      const tiers = join(tmp, "integration");
      mkdirSync(tiers, { recursive: true });
      // A .cli. file is mechanism cli == minMechanism cli -> adequate.
      writeFileSync(
        join(tiers, "tfake.cli.test.ts"),
        `// covers: subcommand:${tool}:${sub}\nimport { test } from "bun:test";\ntest("x", () => {});\n`,
      );
      const res = spawnSync(process.execPath, [TOOL, "--print"], {
        encoding: "utf-8",
        env: { ...process.env, AMADEUS_COVERAGE_TESTS_DIR: tmp },
      });
      expect(res.status).toBe(0);
      const doc = JSON.parse(res.stdout);
      const row = doc.units.find(
        (u: { unitClass: string; unitId: string }) =>
          u.unitClass === "subcommand" && u.unitId === `${tool} ${sub}`,
      );
      expect(row.status).toBe("covered");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// 3. --check exits 1 on an injected NEW uncovered unit; exits 0 when clean.
//    This is the PROVE-THE-RATCHET assignment requirement, done in-test
//    against a TEMP COPY of the source — the real source is untouched.
// ---------------------------------------------------------------------------
// Each test in here copies three shipped source subtrees and then spawns the
// generator against a small claim fixture. Keeping claim discovery bounded
// avoids repeatedly classifying the full committed test corpus.
const FRESHNESS_DIFF_TIMEOUT_MS = 120_000;

describe("--check freshness diff (the ratchet mechanism)", () => {
  // Build a self-contained temp tree with the shipped source subtrees we
  // enumerate and committed baselines generated FROM that tree. Claim discovery
  // uses the small committed fixture so AST classification stays cheap.
  function buildTempTree(): {
    root: string;
    srcRoot: string;
    registry: string;
    ratchet: string;
    auditPath: string;
    eventRegistryPath: string;
  } {
    const root = mkdtempSync(join(tmpdir(), "cov-check-"));
    const srcRoot = join(root, "srcroot");
    // Copy only the directories the enumerators read.
    cpSync(
      join(REPO_ROOT, "dist", "claude", ".claude", "tools"),
      join(srcRoot, "dist", "claude", ".claude", "tools"),
      { recursive: true },
    );
    cpSync(
      join(REPO_ROOT, "dist", "claude", ".claude", "hooks"),
      join(srcRoot, "dist", "claude", ".claude", "hooks"),
      { recursive: true },
    );
    cpSync(
      join(REPO_ROOT, "dist", "claude", ".claude", "otel"),
      join(srcRoot, "dist", "claude", ".claude", "otel"),
      { recursive: true },
    );
    cpSync(
      join(
        REPO_ROOT,
        "dist", "claude",
        ".claude",
        "amadeus-common",
        "stages",
      ),
      join(srcRoot, "dist", "claude", ".claude", "amadeus-common", "stages"),
      { recursive: true },
    );
    const registry = join(root, ".coverage-registry.json");
    const ratchet = join(root, ".coverage-ratchet.json");
    const auditPath = join(
      srcRoot,
      "dist", "claude",
      ".claude",
      "tools",
      "amadeus-audit.ts",
    );
    const eventRegistryPath = join(
      srcRoot,
      "dist", "claude",
      ".claude",
      "otel",
      "event-registry.ts",
    );
    return { root, srcRoot, registry, ratchet, auditPath, eventRegistryPath };
  }

  function genInto(t: ReturnType<typeof buildTempTree>) {
    // Generate baselines from the temp tree and the small claim fixture.
    return spawnSync(process.execPath, [TOOL], {
      encoding: "utf-8",
      env: {
        ...process.env,
        AMADEUS_COVERAGE_SRC_ROOT: t.srcRoot,
        AMADEUS_COVERAGE_TESTS_DIR: CLAIMS_FIXTURE_DIR,
        AMADEUS_COVERAGE_REGISTRY: t.registry,
        AMADEUS_COVERAGE_RATCHET: t.ratchet,
      },
    });
  }

  function checkAgainst(t: ReturnType<typeof buildTempTree>) {
    return spawnSync(process.execPath, [TOOL, "--check"], {
      encoding: "utf-8",
      env: {
        ...process.env,
        AMADEUS_COVERAGE_SRC_ROOT: t.srcRoot,
        AMADEUS_COVERAGE_TESTS_DIR: CLAIMS_FIXTURE_DIR,
        AMADEUS_COVERAGE_REGISTRY: t.registry,
        AMADEUS_COVERAGE_RATCHET: t.ratchet,
      },
    });
  }

  test("clean temp tree: --check exits 0", () => {
    const t = buildTempTree();
    try {
      const gen = genInto(t);
      expect(gen.status).toBe(0);
      const chk = checkAgainst(t);
      expect(chk.status).toBe(0);
      expect(chk.stdout).toContain("OK");
    } finally {
      rmSync(t.root, { recursive: true, force: true });
    }
  }, scaleTestTime(FRESHNESS_DIFF_TIMEOUT_MS));

  test("inject a NEW audit event into the temp source: --check exits 1 naming the gap", () => {
    const t = buildTempTree();
    try {
      // Baseline FIRST (clean), so the committed registry omits the new event.
      expect(genInto(t).status).toBe(0);

      // Now inject a fake new canonical event into the TEMP copy of the OTel
      // Event Registry — the generator's vocabulary source since #1845 (the
      // copied audit vocabulary is no longer read). Splice a minimal
      // canonical def in ahead of the "amadeus.workflow.completed" entry.
      const registrySrc = readFileSync(t.eventRegistryPath, "utf-8");
      const injected = registrySrc.replace(
        'name: "amadeus.workflow.completed",',
        'name: "amadeus.fake.injected",\n' +
          '    auditEvent: "FAKE_INJECTED_EVENT",\n' +
          '    durability: "canonical",\n' +
          '    category: "utility",\n' +
          "    requiredAttributes: [],\n" +
          "    optionalAttributes: [],\n" +
          "    schemaVersion: 1,\n" +
          "  },\n" +
          "  {\n" +
          '    name: "amadeus.workflow.completed",',
      );
      expect(injected).not.toBe(registrySrc); // the anchor really matched
      writeFileSync(t.eventRegistryPath, injected);

      // The enumerated universe now has one more audit unit (uncovered) that
      // the committed registry does not — freshness diff must fail.
      const chk = checkAgainst(t);
      expect(chk.status).toBe(1);
      expect(chk.stderr).toContain("FRESHNESS DIFF FAILED");
      // The diff names the new unit.
      expect(chk.stderr).toContain("FAKE_INJECTED_EVENT");
    } finally {
      rmSync(t.root, { recursive: true, force: true });
    }
  }, scaleTestTime(FRESHNESS_DIFF_TIMEOUT_MS));

  test("inject a NEW subcommand into the temp source: --check exits 1 naming the gap", () => {
    const t = buildTempTree();
    try {
      expect(genInto(t).status).toBe(0);

      // Add a fake case to amadeus-audit.ts's entry switch (switch(subcommand)).
      // The first case is `case "append": {`; inject a sibling before it.
      const audit = readFileSync(t.auditPath, "utf-8");
      const injected = audit.replace(
        'case "append": {',
        'case "fake-injected-sub": {\n      break;\n    }\n    case "append": {',
      );
      expect(injected).not.toBe(audit);
      writeFileSync(t.auditPath, injected);

      const chk = checkAgainst(t);
      expect(chk.status).toBe(1);
      expect(chk.stderr).toContain("FRESHNESS DIFF FAILED");
      expect(chk.stderr).toContain("fake-injected-sub");
    } finally {
      rmSync(t.root, { recursive: true, force: true });
    }
  }, scaleTestTime(FRESHNESS_DIFF_TIMEOUT_MS));

  test("missing committed registry: --check exits 1", () => {
    const t = buildTempTree();
    try {
      // Generate ratchet only path? Simpler: never generate, just check.
      const chk = checkAgainst(t);
      expect(chk.status).toBe(1);
      expect(chk.stderr).toMatch(/does not exist/);
    } finally {
      rmSync(t.root, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// 4. The RATCHET catches a simulated covered-count DECREASE.
// ---------------------------------------------------------------------------
describe("ratchet anti-regression (covered count cannot silently drop)", () => {
  test("a committed ratchet with a HIGHER baseline than reality fails --check", () => {
    const root = mkdtempSync(join(tmpdir(), "cov-ratchet-"));
    try {
      // Reuse the real source via the default root (no SRC override), scan the
      // small claim fixture, and point committed baselines at temp files.
      const registry = join(root, ".coverage-registry.json");
      const ratchet = join(root, ".coverage-ratchet.json");

      // Generate honest baselines from real source.
      const gen = spawnSync(process.execPath, [TOOL], {
        encoding: "utf-8",
        env: {
          ...process.env,
          AMADEUS_COVERAGE_TESTS_DIR: CLAIMS_FIXTURE_DIR,
          AMADEUS_COVERAGE_REGISTRY: registry,
          AMADEUS_COVERAGE_RATCHET: ratchet,
        },
      });
      expect(gen.status).toBe(0);

      // Now SIMULATE a regression: bump the committed ratchet's `function`
      // covered count ABOVE what the registry actually shows. The current
      // reality (6 covered) is now BELOW the inflated baseline -> ratchet fails.
      const r = JSON.parse(readFileSync(ratchet, "utf-8"));
      const realFn = r.coveredByClass.function;
      r.coveredByClass.function = realFn + 5;
      writeFileSync(ratchet, `${JSON.stringify(r, null, 2)}\n`);

      const chk = spawnSync(process.execPath, [TOOL, "--check"], {
        encoding: "utf-8",
        env: {
          ...process.env,
          AMADEUS_COVERAGE_TESTS_DIR: CLAIMS_FIXTURE_DIR,
          AMADEUS_COVERAGE_REGISTRY: registry,
          AMADEUS_COVERAGE_RATCHET: ratchet,
        },
      });
      expect(chk.status).toBe(1);
      expect(chk.stderr).toContain("RATCHET FAILED");
      expect(chk.stderr).toContain("function");
      expect(chk.stderr).toContain("DROPPED");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("ratchetFromRows derives covered-count-per-class from the rows", () => {
    const { rows } = liveRegistry;
    const r = ratchetFromRows(rows);
    // Sanity: function covered count equals the rows' covered functions.
    const fnCovered = rows.filter(
      (x) => x.unitClass === "function" && x.status === "covered",
    ).length;
    expect(r.coveredByClass.function).toBe(fnCovered);
  });
});

describe("ratchet parsing (parse, don't validate — malformed input is a diagnosis, not a crash)", () => {
  test("valid ratchet text parses to the proven coveredByClass", () => {
    const doc = ratchetFromRows(liveRegistry.rows);
    const r = parseRatchetText(`${JSON.stringify(doc, null, 2)}\n`);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.coveredByClass).toEqual(doc.coveredByClass);
  });

  test("invalid JSON (merge-conflict garbage) => MALFORMED detail", () => {
    const r = parseRatchetText("<<<<<<< HEAD conflict garbage");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.detail).toContain("invalid JSON");
  });

  test("non-object JSON => MALFORMED detail", () => {
    for (const text of ["42", '"str"', "null", "[1,2]"]) {
      const r = parseRatchetText(text);
      expect(r.ok).toBe(false);
    }
  });

  test("missing or non-object coveredByClass field => MALFORMED detail", () => {
    for (const text of ["{}", '{"coveredByClass":[1]}', '{"coveredByClass":7}']) {
      const r = parseRatchetText(text);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.detail).toContain("coveredByClass must be an object");
    }
  });

  test("wrong-typed count (string) => MALFORMED, not a silent pass", () => {
    // Before the fix, `"function": "five"` sailed through: `now < "five"` is
    // always false, so a corrupt baseline silently PASSED the ratchet.
    const r = parseRatchetText('{"coveredByClass":{"function":"five"}}');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.detail).toContain("coveredByClass.function");
  });

  test("negative / non-integer counts => MALFORMED detail", () => {
    for (const v of ["-1", "1.5"]) {
      const r = parseRatchetText(`{"coveredByClass":{"function":${v}}}`);
      expect(r.ok).toBe(false);
    }
  });

  test("missing unit-class key => MALFORMED detail (a conflict can delete a line)", () => {
    const doc = ratchetFromRows(liveRegistry.rows);
    const covered = { ...doc.coveredByClass } as Record<string, number>;
    delete covered.hook;
    const r = parseRatchetText(JSON.stringify({ coveredByClass: covered }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.detail).toContain("coveredByClass.hook");
  });

  test("runCheck (in-process) turns a corrupt / missing ratchet into a diagnosis", () => {
    const root = mkdtempSync(join(tmpdir(), "cov-ratchet-ip-"));
    const prev = process.env.AMADEUS_COVERAGE_RATCHET;
    try {
      const ratchet = join(root, ".coverage-ratchet.json");
      // Corrupt committed ratchet -> MALFORMED diagnosis, not a crash.
      writeFileSync(ratchet, "<<<<<<< HEAD conflict garbage\n");
      process.env.AMADEUS_COVERAGE_RATCHET = ratchet;
      const bad = runCheck(liveRegistry.rows);
      expect(bad.ok).toBe(false);
      expect(bad.messages.join("\n")).toContain("RATCHET FAILED [MALFORMED]");
      // Missing ratchet -> the existing does-not-exist diagnosis still fires.
      process.env.AMADEUS_COVERAGE_RATCHET = join(root, "nope.json");
      const missing = runCheck(liveRegistry.rows);
      expect(missing.ok).toBe(false);
      expect(missing.messages.join("\n")).toContain("does not exist");
      // A VALID ratchet still flows into the drop comparison: an inflated
      // baseline (reality < baseline) fails with the DROPPED diagnosis, and
      // the honest baseline passes -> the parser did not weaken the ratchet.
      const doc = ratchetFromRows(liveRegistry.rows);
      const inflated = {
        ...doc,
        coveredByClass: {
          ...doc.coveredByClass,
          function: doc.coveredByClass.function + 5,
        },
      };
      writeFileSync(ratchet, `${JSON.stringify(inflated, null, 2)}\n`);
      process.env.AMADEUS_COVERAGE_RATCHET = ratchet;
      const dropped = runCheck(liveRegistry.rows);
      expect(dropped.ok).toBe(false);
      expect(dropped.messages.join("\n")).toContain("DROPPED");
      writeFileSync(ratchet, `${JSON.stringify(doc, null, 2)}\n`);
      expect(runCheck(liveRegistry.rows).ok).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.AMADEUS_COVERAGE_RATCHET;
      else process.env.AMADEUS_COVERAGE_RATCHET = prev;
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("--check reports RATCHET FAILED [MALFORMED] + exit 1 on a corrupt committed ratchet", () => {
    const root = mkdtempSync(join(tmpdir(), "cov-ratchet-malformed-"));
    try {
      const ratchet = join(root, ".coverage-ratchet.json");
      writeFileSync(ratchet, "<<<<<<< HEAD conflict garbage\n");
      const chk = spawnSync(process.execPath, [TOOL, "--check"], {
        encoding: "utf-8",
        env: {
          ...process.env,
          AMADEUS_COVERAGE_TESTS_DIR: CLAIMS_FIXTURE_DIR,
          AMADEUS_COVERAGE_RATCHET: ratchet,
        },
      });
      expect(chk.status).toBe(1);
      expect(chk.stderr).toContain("RATCHET FAILED [MALFORMED]");
      expect(chk.stderr).toContain("invalid JSON");
      // Diagnosis, not a crash: no unhandled stack trace frames.
      expect(chk.stderr).not.toContain("at runCheck");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// 5. The SUBCOMMAND CROSS-CHECK (anti-rot guard b) holds for real source.
// ---------------------------------------------------------------------------
describe("subcommand cross-check (anti-rot guard b)", () => {
  test("structured parser count == independent dispatch-site count for every tool", () => {
    expect(subcommandCrossCheck()).toEqual([]);
  });

  test("the switch-dispatch parser reads only depth-0 cases (excludes nested sub-switches)", () => {
    // A miniature source with an entry switch + a nested switch keyed on a
    // different var. Only the entry cases must surface.
    const src = `
function main() {
  switch (subcommand) {
    case "get": { handleGet(); break; }
    case "set": { handleSet(); break; }
    case "lookup": {
      switch (sub) {
        case "phase-of": return; // nested — must NOT surface
        case "agent-for": return;
      }
      break;
    }
  }
}`;
    const cases = parseSwitchDispatchCases(src, "subcommand");
    expect(cases).toEqual(["get", "set", "lookup"]);
    expect(cases).not.toContain("phase-of");
    expect(cases).not.toContain("agent-for");
  });

  test("the object-dispatch parser reads only depth-1 keys (excludes handler-body keys)", () => {
    const src = `
const COMMANDS: Record<string, Handler> = {
  artifacts: () => { const x = { nested: 1 }; },
  topo: () => {},
  "validate-scope": (args) => {},
};`;
    const keys = parseObjectDispatchKeys(src, "COMMANDS");
    expect(keys).toEqual(["artifacts", "topo", "validate-scope"]);
    expect(keys).not.toContain("nested");
  });
});

// ---------------------------------------------------------------------------
// 6. covers-header parsing (the claim-discovery surface).
// ---------------------------------------------------------------------------
describe("covers: header parsing", () => {
  test("single-line // covers: with comma-separated ids", () => {
    const ids = parseCoversHeader(
      "// covers: function:stateFilePath, function:auditFilePath\nimport x;\n",
      false,
    );
    expect(ids).toEqual(["function:stateFilePath", "function:auditFilePath"]);
  });

  test("multi-line continuation folds in sub-ids (t114 shape) but skips prose", () => {
    const src = [
      "// covers: invariant:audit-first-atomicity",
      "//   sub-ids (one per state-mutating handler):",
      "//     invariant:audit-first-atomicity:approve  (handleApprove :675)",
      "//     invariant:audit-first-atomicity:reject   (handleReject :769)",
      "//",
      "// t114 — prose line with no class:id token here.",
      "import x;",
    ].join("\n");
    const ids = parseCoversHeader(src, false);
    expect(ids).toContain("invariant:audit-first-atomicity");
    expect(ids).toContain("invariant:audit-first-atomicity:approve");
    expect(ids).toContain("invariant:audit-first-atomicity:reject");
    // The `:675` annotation must NOT become a phantom id.
    expect(ids.some((i) => i.includes("675"))).toBe(false);
  });

  test("# covers: works for shell tests", () => {
    const ids = parseCoversHeader(
      "#!/usr/bin/env bash\n# covers: audit:WORKFLOW_COMPLETED\nset -e\n",
      true,
    );
    expect(ids).toEqual(["audit:WORKFLOW_COMPLETED"]);
  });

  test("no covers: header -> empty", () => {
    expect(parseCoversHeader("// just a comment\nimport x;\n", false)).toEqual(
      [],
    );
  });

  test("mechanismOfTestFile reads the dot-segment", () => {
    expect(mechanismOfTestFile("t112.none.test.ts")).toBe("none");
    expect(mechanismOfTestFile("sdk-drive.calibration.test.ts")).toBe("sdk");
    expect(mechanismOfTestFile("tfoo.cli.test.ts")).toBe("cli");
  });
});

// ---------------------------------------------------------------------------
// 7. Determinism: registryJson is byte-stable across two builds.
// ---------------------------------------------------------------------------
describe("determinism", () => {
  test("registryJson is byte-identical across two independent builds", () => {
    const a = registryJson(buildRegistry().rows);
    const b = registryJson(buildRegistry().rows);
    expect(a).toBe(b);
  });

  test("MECHANISMS and UNIT_CLASSES are stable enumerations", () => {
    expect([...MECHANISMS]).toEqual(["none", "cli", "sdk", "tui"]);
    expect([...UNIT_CLASSES]).toEqual([
      "function",
      "audit",
      "scope",
      "stage",
      "hook",
      "subcommand",
      "render-surface",
    ]);
  });
});
