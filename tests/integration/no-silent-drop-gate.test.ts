// covers: subcommand:no-silent-drop:check, subcommand:no-silent-drop:census-evidence
// size: medium
import { scaleTestTime } from "../lib/test-time-factor.ts";
import { afterEach, describe, expect, test } from "bun:test";
import {
  chmodSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import {
  assertSafeRelativePath,
  loadVerifiedAstGrep,
  NSD003_CATALOG,
  parseSource,
  scanParsedSources,
  scanSourceForTest,
  stateResultKinds,
} from "../no-silent-drop/ast-scan.ts";
import { isAncestor, loadTrustedPreviousLedgers } from "../no-silent-drop/bootstrap.ts";
import {
  captureSnapshot,
  isMode,
  resultExitCode,
  runGate,
  verifySnapshot,
} from "../no-silent-drop/engine.ts";
import { encodeEvent, type GrantEvent } from "../no-silent-drop/events.ts";
import {
  addedFindings,
  assertExemptionsShrinkOnly,
  assertShrinkOnly,
  buildCandidate,
  filterExemptions,
  parseApproval,
  parseBaseline,
  parseExemptions,
  readBaseline,
  readExemptions,
  trustedBaseSha,
  validateApproval,
} from "../no-silent-drop/ledger.ts";
import { ulidFromSeed } from "../no-silent-drop/ulid.ts";
import {
  type ApprovalDoc,
  type BaselineDoc,
  type Finding,
  findingFingerprint,
  InfraFailure,
  violationResult,
} from "../no-silent-drop/model.ts";
import { noSilentDropTrustedBase } from "../lib/no-silent-drop-trusted-base.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const revision = (...args: string[]): string | null => {
  const result = spawnSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" });
  const value = result.status === 0 ? result.stdout.trim() : "";
  return /^[0-9a-f]{40}$/.test(value) ? value : null;
};
const TRUSTED_BASE_REVISION = noSilentDropTrustedBase(REPO_ROOT) ?? revision("rev-parse", "HEAD^");
if (TRUSTED_BASE_REVISION === null) {
  throw new Error("no-silent-drop check needs a trusted base: neither a merge-base nor HEAD^ resolved");
}
const require = createRequire(import.meta.url);
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function scan(source: string): Finding[] {
  return scanSourceForTest("fixture.ts", source, REPO_ROOT);
}

function semanticScan(source: string) {
  const ast = loadVerifiedAstGrep(REPO_ROOT);
  return scanParsedSources([parseSource(ast, "fixture.ts", source)]);
}

const VERIFIED_MUTATION_HELPER = `
  type TextMutationResult = { kind: "changed"; content: string } | { kind: "not-found"; target: string };
  type Line = { line: string; start: number; end: number; state: string; suffix: string };
  type Data = { content: string };
  type ValidatedStageState = { readonly validated: true };
  declare function validateStageState(content: string): ValidatedStageState;
  declare function validatedStageStateData(state: ValidatedStageState, operation: string, target: string): Data;
  declare function targetStageLine(data: Data, target: string): Line | undefined;
  function changed(content: string): TextMutationResult { return { kind: "changed", content }; }
  function verifyStageMutation(
    before: Data,
    content: string,
    operation: string,
    target: string,
    postcondition: (line: Line) => boolean,
  ): TextMutationResult {
    const reparsed = validateStageState(content);
    const after = validatedStageStateData(reparsed, operation, target);
    const targetAfter = targetStageLine(after, target);
    if (targetAfter === undefined || !postcondition(targetAfter)) throw "postcondition-failed";
    const targetBefore = targetStageLine(before, target);
    if (
      targetBefore === undefined
      || before.content.slice(0, targetBefore.start) !== content.slice(0, targetAfter.start)
      || before.content.slice(targetBefore.end) !== content.slice(targetAfter.end)
    ) throw "non-target-changed";
    return changed(content);
  }
`;

function delegatedMutation(name: "setCheckbox" | "setStageSuffix", delegate: string): string {
  const desired = name === "setCheckbox" ? "newState: string" : "action: string";
  const replacement = name === "setCheckbox"
    ? 'target.line.replace("old", newState)'
    : 'target.line.replace("old", action)';
  const postcondition = name === "setCheckbox"
    ? "(line: Line) => line.state === newState"
    : "(line: Line) => line.suffix.startsWith(action)";
  return `
    function ${name}(state: ValidatedStageState, slug: string, ${desired}): TextMutationResult {
      const operation = "${name}";
      const data = validatedStageStateData(state, operation, slug);
      const target = targetStageLine(data, slug);
      if (target === undefined) { return { kind: "not-found", target: slug }; }
      const nextLine = ${replacement};
      const content = data.content.slice(0, target.start) + nextLine + data.content.slice(target.end);
      ${delegate.replace("$POSTCONDITION", postcondition)}
    }
  `;
}

function baseline(fingerprints: readonly string[]): BaselineDoc {
  return {
    schemaVersion: 1,
    direction: "shrink-only",
    generatedFrom: { revision: "r", censusDigest: "c", approvalDigest: "a" },
    entries: fingerprints.map((fingerprint) => ({
      fingerprint,
      ruleId: "NSD001",
      file: "a.ts",
      reason: "legacy finding",
      issues: ["#1979"],
    })),
  };
}

function runGit(root: string, args: string[]): string {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
}

const FIXTURE_IDENTITY = ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.com"];

/** Scannable working tree with an empty event ledger directory, committed as `base`. */
function scannableRepository(): string {
  const root = mkdtempSync(join(tmpdir(), "nsd-repo-"));
  temporaryDirectories.push(root);
  for (const path of [
    "packages/framework/core",
    "packages/framework/harness",
    "scripts",
    "tests/no-silent-drop/events",
  ]) {
    mkdirSync(join(root, path), { recursive: true });
  }
  symlinkSync(join(REPO_ROOT, "node_modules"), join(root, "node_modules"));
  writeFileSync(join(root, "packages/framework/core/source.ts"), "export const value = 1;\n");
  writeFileSync(join(root, "packages/framework/harness/source.ts"), "export const harness = 1;\n");
  writeFileSync(join(root, "scripts/source.ts"), "export const script = 1;\n");
  writeFileSync(
    join(root, "tests/no-silent-drop/ast-shape-fixture.ts.txt"),
    readFileSync(join(REPO_ROOT, "tests/no-silent-drop/ast-shape-fixture.ts.txt"), "utf8"),
  );
  runGit(root, ["init", "-q"]);
  // Only the scan roots are committed, so `tests/` stays out of the base tree.
  runGit(root, ["add", "packages", "scripts"]);
  runGit(root, [...FIXTURE_IDENTITY, "commit", "-qm", "base"]);
  return root;
}

/**
 * A base commit that predates the event ledger: the working tree carries an events
 * directory, the base tree does not. The gate must refuse that shape, because it
 * has no trusted previous set to ratchet against.
 */
function ledgerlessBaseRepository(): { root: string; baseRevision: string } {
  const root = scannableRepository();
  const baseRevision = runGit(root, ["rev-parse", "HEAD"]);
  runGit(root, [...FIXTURE_IDENTITY, "commit", "--allow-empty", "-qm", "head"]);
  return { root, baseRevision };
}

/**
 * The supported shape: the base commit already carries the event ledger, so the gate
 * has a trusted previous set and custody has base bytes to compare head against.
 */
function ledgerBaseRepository(): { root: string; baseRevision: string; ulid: string; grant: GrantEvent } {
  const root = scannableRepository();
  const ulid = ulidFromSeed("grant:grandfather:gate-fixture");
  const grant: GrantEvent = {
    schemaVersion: 1,
    ulid,
    op: "grant",
    kind: "grandfather",
    fingerprint: "d".repeat(64),
    ruleId: "NSD001",
    file: "packages/framework/core/legacy.ts",
    reason: "Approved legacy finding carried by the event ledger.",
    issues: ["#1979"],
  };
  writeFileSync(join(root, `tests/no-silent-drop/events/${ulid}.json`), encodeEvent(grant));
  runGit(root, ["add", "tests"]);
  runGit(root, [...FIXTURE_IDENTITY, "commit", "-qm", "adopt event ledger"]);
  const baseRevision = runGit(root, ["rev-parse", "HEAD"]);
  runGit(root, [...FIXTURE_IDENTITY, "commit", "--allow-empty", "-qm", "head"]);
  return { root, baseRevision, ulid, grant };
}

function snapshotRepository(): string {
  const root = mkdtempSync(join(tmpdir(), "nsd-snapshot-"));
  temporaryDirectories.push(root);
  for (const path of ["packages/framework/core", "packages/framework/harness", "scripts"]) {
    mkdirSync(join(root, path), { recursive: true });
    writeFileSync(join(root, path, "source.ts"), "export const value = 1;\n");
  }
  return root;
}

describe("no-silent-drop AST rules", () => {
  test("NSD001 detects an empty catch block", () => {
    expect(scan("try { work(); } catch (error) {}").map((finding) => finding.ruleId)).toEqual(["NSD001"]);
  });

  test("NSD001 detects log-only and non-terminal catch blocks", () => {
    expect(scan("try { work(); } catch (error) { console.warn(error); }").map((finding) => finding.ruleId)).toEqual(["NSD001"]);
    expect(scan("try { work(); } catch { cleanup(); }").map((finding) => finding.ruleId)).toEqual(["NSD001"]);
  });

  test("a catch that returns or rethrows is not a finding", () => {
    expect(scan("function f() { try { work(); } catch (error) { throw error; } }")).toEqual([]);
    expect(scan("function f() { try { work(); } catch (error) { return failure(error); } }")).toEqual([]);
  });

  test("a catch with a terminal action on only one path remains a finding", () => {
    const source = "function f(ok: boolean) { try { work(); } catch (error) { if (ok) throw error; cleanup(); } }";
    expect(scan(source).map((finding) => finding.ruleId)).toEqual(["NSD001"]);
  });

  test("intentional-drop cannot exempt NSD001 or bypass NSD002 without ledger validation", () => {
    const source = `
      type StateResult = { kind: "ok" } | { kind: "failed" };
      declare function applyTransition(): StateResult;
      // intentional-drop: bypass
      applyTransition();
      // intentional-drop: bypass
      try { work(); } catch (error) {}
    `;
    expect(scan(source).map((finding) => finding.ruleId)).toEqual(["NSD002", "NSD001"]);
  });

  test("NSD002 detects only a discarded applyTransition StateResult", () => {
    const source = `
      type StateResult = { kind: "ok" } | { kind: "failed" };
      declare function applyTransition(...args: unknown[]): StateResult;
      function decide(): boolean { return true; }
      decide();
      applyTransition(ports, context, snapshot, transition);
    `;
    expect(scan(source).map((finding) => finding.ruleId)).toEqual(["NSD002"]);
  });

  test("NSD002 accepts a discriminant check and ignores APIs outside the closed catalog", () => {
    const source = `
      type StateResult = { kind: "ok" } | { kind: "failed" };
      declare function applyTransition(): StateResult;
      function report(): void {}
      function decide(): boolean { return true; }
      report();
      const accepted = decide();
      if (decide()) report();
      const transition = applyTransition();
      if (transition.kind !== "ok") throw new Error("failed");
    `;
    expect(scan(source)).toEqual([]);
  });

  test("semantic contracts fail closed when applyTransition is unresolved or a catalog target has multiple implementations", () => {
    expect(() => stateResultKinds({} as never, { getResolvedSignature: () => undefined } as never))
      .toThrow("does not resolve to a single callable contract");
    expect(() => scan("declare function applyTransition(): unknown; applyTransition();"))
      .toThrow("applyTransition return type is not the approved StateResult contract");
    expect(() => scan(`
      function setCheckbox(): void {}
      function setCheckbox(): void {}
    `)).toThrow("multiple implementations resolve to one NSD003 catalog contract");
  });

  test("NSD003 proves persistBlocked write and postcondition before success on every path", () => {
    const unsafe = `
      type StateResult = { kind: "ok" } | { kind: "failed" };
      declare function applyTransition(): StateResult;
      function persistBlocked(): Outcome {
        applyTransition();
        return { kind: "safety-blocked" };
      }
    `;
    const safe = `
      type StateResult = { kind: "ok" } | { kind: "failed" };
      declare function applyTransition(): StateResult;
      function persistBlocked(): Outcome {
        const persisted = applyTransition();
        if (persisted.kind !== "ok") return { kind: "failed" };
        return { kind: "safety-blocked" };
      }
    `;
    const failedArmSafe = `
      type StateResult = { kind: "ok" } | { kind: "failed" };
      type Outcome = { kind: "failed" } | { kind: "safety-blocked" };
      declare function applyTransition(): StateResult;
      declare function transitionFailure(result: StateResult): Outcome;
      function persistBlocked(): Outcome {
        const result = applyTransition();
        if (result.kind === "failed") return transitionFailure(result);
        return { kind: "safety-blocked" };
      }
    `;
    expect(scan(unsafe).map((finding) => finding.ruleId)).toContain("NSD003");
    expect(scan(safe).filter((finding) => finding.ruleId === "NSD003")).toEqual([]);
    expect(scan(failedArmSafe).filter((finding) => finding.ruleId === "NSD003")).toEqual([]);
  });

  test("NSD003 persistBlocked failure-arm proof rejects incomplete or mismatched handling", () => {
    const declarations = `
      type StateResult = { kind: "ok" } | { kind: "failed" };
      type Outcome = { kind: "failed" } | { kind: "safety-blocked" };
      declare function applyTransition(): StateResult;
      declare function transitionFailure(result: StateResult): Outcome;
      declare const other: StateResult;
      declare const early: boolean;
    `;
    const bodies = [
      `const result = applyTransition(); return { kind: "safety-blocked" };`,
      `const result = applyTransition(); if (result.status === "failed") return transitionFailure(result); return { kind: "safety-blocked" };`,
      `const result = applyTransition(); if (result.kind === "ok") return transitionFailure(result); return { kind: "safety-blocked" };`,
      `const result = applyTransition(); if (result.kind === "failed") return { kind: "safety-blocked" }; return { kind: "safety-blocked" };`,
      `const result = applyTransition(); if (other.kind === "failed") return transitionFailure(other); return { kind: "safety-blocked" };`,
      `if (early) return { kind: "safety-blocked" }; const result = applyTransition(); if (result.kind === "failed") return transitionFailure(result); return { kind: "safety-blocked" };`,
      `applyTransition(); return { kind: "safety-blocked" };`,
    ];
    for (const body of bodies) {
      const source = `${declarations} function persistBlocked(): Outcome { ${body} }`;
      expect(scan(source).filter((finding) => finding.ruleId === "NSD003")).toHaveLength(1);
    }
  });

  test("NSD003 proves text mutation target and postcondition before success", () => {
    const unsafe = `
      function setCheckbox(content: string, slug: string): MutationResult {
        return { kind: "ok", content: content.replace(slug, "done") };
      }
    `;
    const safe = `
      function setCheckbox(content: string, slug: string): MutationResult {
        if (!content.includes(slug)) return { kind: "not-found" };
        const next = content.replace(slug, "done");
        if (!next.includes("done")) return { kind: "failed" };
        return { kind: "ok", content: next };
      }
    `;
    expect(scan(unsafe).map((finding) => finding.ruleId)).toEqual(["NSD003"]);
    expect(scan(safe)).toEqual([]);
    expect(scan(`
      function setCheckbox(content: string, slug: string): MutationResult {
        if (!content.includes(slug)) return { kind: "not-found" };
        const next = content.replace(slug, "done");
        if (!next.includes("done")) return { kind: "failed" };
        const result = { kind: "ok", content: next };
        return result;
      }
    `)).toEqual([]);
  });

  test("NSD003 accepts only a directly returned, verified mutation helper delegate", () => {
    const safe = VERIFIED_MUTATION_HELPER
      + delegatedMutation("setCheckbox", "return verifyStageMutation(data, content, operation, slug, $POSTCONDITION);")
      + delegatedMutation("setStageSuffix", "return verifyStageMutation(data, content, operation, slug, $POSTCONDITION);");
    expect(scan(safe).filter((finding) => finding.ruleId === "NSD003")).toEqual([]);
  });

  test("NSD003 rejects unverified, wrong, or ignored mutation helper delegates", () => {
    const unverified = VERIFIED_MUTATION_HELPER.replace(
      /function verifyStageMutation\([\s\S]*?\n {2}}\n$/,
      "function verifyStageMutation(_before: Data, content: string): TextMutationResult { return changed(content); }\n",
    ) + delegatedMutation("setCheckbox", "return verifyStageMutation(data, content, operation, slug, $POSTCONDITION);");
    const wrong = VERIFIED_MUTATION_HELPER.replaceAll("verifyStageMutation", "verifyOtherMutation")
      + delegatedMutation("setCheckbox", "return verifyOtherMutation(data, content, operation, slug, $POSTCONDITION);");
    const ignored = VERIFIED_MUTATION_HELPER
      + delegatedMutation("setCheckbox", "verifyStageMutation(data, content, operation, slug, $POSTCONDITION); return changed(content);");
    for (const source of [unverified, wrong, ignored]) {
      expect(scan(source).filter((finding) => finding.ruleId === "NSD003")).toHaveLength(1);
    }
  });

  test("NSD003 helper resolution fails closed when the approved delegate is unresolved or ambiguous", () => {
    const unresolved = VERIFIED_MUTATION_HELPER.replace(
      /function verifyStageMutation\([\s\S]*?\n {2}}\n$/,
      "declare function verifyStageMutation(before: Data, content: string, operation: string, target: string, postcondition: (line: Line) => boolean): TextMutationResult;\n",
    ) + delegatedMutation("setCheckbox", "return verifyStageMutation(data, content, operation, slug, $POSTCONDITION);");
    const ambiguous = VERIFIED_MUTATION_HELPER
      + "function verifyStageMutation(_before: Data, content: string): TextMutationResult { return changed(content); }\n"
      + delegatedMutation("setCheckbox", "return verifyStageMutation(data, content, operation, slug, $POSTCONDITION);");
    expect(() => scan(unresolved)).toThrow("verifyStageMutation does not resolve to one implementation");
    expect(() => scan(ambiguous)).toThrow("verifyStageMutation does not resolve to one implementation");
  });

  test("NSD003 proves compose resync write and reparse before success", () => {
    const unsafe = `
      function resyncOneIntent(next: string): Outcome {
        if (!stageProgressSectionOf(next)) return outcome("section-unrecognized");
        return outcome("resynced");
      }
    `;
    const safe = `
      function resyncOneIntent(next: string): Outcome {
        const rewritten = replaceStageProgressSection(next);
        if (!stageProgressSectionOf(rewritten)) return outcome("section-unrecognized");
        writeStateFile(rewritten);
        return outcome("resynced");
      }
    `;
    expect(scan(unsafe).map((finding) => finding.ruleId)).toEqual(["NSD003"]);
    expect(scan(safe)).toEqual([]);
  });

  test("fingerprints survive unrelated line movement but distinguish duplicate occurrences", () => {
    expect(findingFingerprint("NSD001", "a.ts", "catch (e) {}", 0)).toBe(
      findingFingerprint("NSD001", "a.ts", "catch (e) {}", 0),
    );
    expect(findingFingerprint("NSD001", "a.ts", "catch (e) {}", 0)).not.toBe(
      findingFingerprint("NSD001", "a.ts", "catch (e) {}", 1),
    );
  });

  test("verified ast-grep loader rejects overrides, absent packages, and untrusted resolution", () => {
    const previous = process.env.NAPI_RS_NATIVE_LIBRARY_PATH;
    try {
      process.env.NAPI_RS_NATIVE_LIBRARY_PATH = "/tmp/untrusted.node";
      expect(() => loadVerifiedAstGrep(REPO_ROOT)).toThrow("cannot override");
    } finally {
      if (previous === undefined) delete process.env.NAPI_RS_NATIVE_LIBRARY_PATH;
      else process.env.NAPI_RS_NATIVE_LIBRARY_PATH = previous;
    }

    const missing = mkdtempSync(join(tmpdir(), "nsd-ast-missing-"));
    temporaryDirectories.push(missing);
    expect(() => loadVerifiedAstGrep(missing)).toThrow("package is unavailable");

    const fake = mkdtempSync(join(tmpdir(), "nsd-ast-fake-"));
    temporaryDirectories.push(fake);
    const packageDirectory = join(fake, "node_modules", "@ast-grep", "napi");
    mkdirSync(packageDirectory, { recursive: true });
    writeFileSync(join(packageDirectory, "package.json"), '{"version":"0.44.0"}\n');
    expect(() => loadVerifiedAstGrep(fake)).toThrow("version must be 0.45.0");
    writeFileSync(join(packageDirectory, "package.json"), '{"version":"0.45.0"}\n');
    expect(() => loadVerifiedAstGrep(fake)).toThrow("outside the verified local package");

    expect(() => loadVerifiedAstGrep(REPO_ROOT, {
      resolve: () => { throw new Error("resolve failed"); },
      load: () => ({}),
    })).toThrow("entrypoint is unavailable");
    expect(() => loadVerifiedAstGrep(REPO_ROOT, {
      resolve: (specifier) => require.resolve(specifier),
      load: () => { throw new Error("native failed"); },
    })).toThrow("native binding failed to load");
  });

  test("AST parsing fails closed for parser, rule, sentinel, and error-region failures", () => {
    const lang = { TypeScript: "ts", Tsx: "tsx", JavaScript: "js" };
    const throwingParser = { Lang: lang, parse: () => { throw new Error("parse"); } };
    expect(() => parseSource(throwingParser as never, "fixture.ts", "x")).toThrow("ast-grep parse failed");

    const throwingRule = {
      Lang: lang,
      parse: () => ({ root: () => ({ findAll: () => { throw new Error("rule"); } }) }),
    };
    expect(() => parseSource(throwingRule as never, "fixture.tsx", "x")).toThrow("candidate rule failed");

    const node = (kind: string, text = "") => ({
      kind: () => kind,
      text: () => text,
      range: () => ({ start: { line: 0, column: 0 } }),
    });
    const nodesParser = (nodes: unknown[]) => ({
      Lang: lang,
      parse: () => ({ root: () => ({ findAll: () => nodes }) }),
    });
    expect(() => parseSource(nodesParser([]) as never, "fixture.js", "x")).toThrow("expected one program");
    expect(() => parseSource(nodesParser([node("program"), node("program")]) as never, "fixture.mjs", "x"))
      .toThrow("expected one program");
    expect(() => parseSource(nodesParser([node("program"), node("ERROR", "catch (")]) as never, "fixture.ts", "catch ("))
      .toThrow("unparseable candidate AST region");
  });

  test("semantic scan fails closed when a scanned catalog host resolves no implementation", () => {
    const ast = loadVerifiedAstGrep(REPO_ROOT);
    const renamed = `
      type ValidatedStageState = { readonly validated: true };
      export function setCheckboxV2(state: ValidatedStageState, slug: string, desired: string) {
        return { kind: "changed", content: desired };
      }
    `;
    const host = NSD003_CATALOG.find((entry) => entry.name === "setCheckbox");
    if (!host) throw new Error("setCheckbox is missing from the NSD003 catalog");
    expect(() => scanParsedSources([parseSource(ast, host.file, renamed)]))
      .toThrow("NSD003 catalog entry resolves to no implementation: setCheckbox");
    expect(() => scanParsedSources([parseSource(ast, "fixture.ts", renamed)])).not.toThrow();

    // A same-named helper elsewhere must not stand in for the host's own
    // declaration: counted repo-wide, this scan has exactly one setCheckbox and
    // the rename reads as fine. The contract is about THIS file.
    const decoy = `
      type ValidatedStageState = { readonly validated: true };
      export function setCheckbox(state: ValidatedStageState, slug: string, desired: string) {
        return { kind: "changed", content: desired };
      }
    `;
    expect(() => scanParsedSources([
      parseSource(ast, host.file, renamed),
      parseSource(ast, "elsewhere.ts", decoy),
    ])).toThrow("NSD003 catalog entry resolves to no implementation: setCheckbox");
  });

  test("semantic scan rejects structural omissions and escaping evidence paths", () => {
    expect(() => scanParsedSources([{
      file: "fixture.ts",
      source: "try { work(); } catch {}",
      candidates: [],
    }])).toThrow("structural/semantic candidate coverage mismatch");
    expect(() => assertSafeRelativePath("/absolute/evidence.json", REPO_ROOT)).toThrow("path escapes");
    expect(() => assertSafeRelativePath("../escape.json", REPO_ROOT)).toThrow("path escapes");
    expect(() => assertSafeRelativePath("tests/evidence.json", REPO_ROOT)).not.toThrow();
  });

  test("semantic contracts reject unresolved and malformed persistence or mutation helpers", () => {
    expect(() => scan("const applyTransition = 1; applyTransition();")).toThrow();
    expect(() => scan(`
      type StateResult = { kind: "ok" };
      declare function applyTransition(): StateResult;
      function persistBlocked() {
        const result = applyTransition();
        if (result.kind === "failed") { throw new Error("failed"); }
        return { kind: "safety-blocked" };
      }
    `)).toThrow("approved StateResult contract");

    const guardedBlock = `
      type StateResult = { kind: "ok" } | { kind: "failed" };
      declare function applyTransition(): StateResult;
      declare const fallback: unknown;
      function persistBlocked() {
        const result = applyTransition();
        if (result.kind === "failed") { return fallback; }
        return { kind: "safety-blocked" };
      }
    `;
    expect(scan(guardedBlock).some((finding) => finding.ruleId === "NSD003")).toBe(true);

    const wrongHelperResult = VERIFIED_MUTATION_HELPER.replace(
      "  ): TextMutationResult {\n    const reparsed",
      '  ): { kind: "changed"; content: string } {\n    const reparsed',
    ) + delegatedMutation("setCheckbox", "return verifyStageMutation(data, content, operation, slug, $POSTCONDITION);");
    expect(() => scan(wrongHelperResult)).toThrow("does not return TextMutationResult");

    const malformedParameters = VERIFIED_MUTATION_HELPER.replace(
      "before: Data,",
      "{ content: before }: Data,",
    ) + delegatedMutation("setCheckbox", "return verifyStageMutation(data, content, operation, slug, $POSTCONDITION);");
    expect(scan(malformedParameters).some((finding) => finding.ruleId === "NSD003")).toBe(true);

    expect(scan(`
      type ValidatedStageState = { readonly validated: true };
      function setCheckbox(state: string, slug: string, desired: string) {
        if (slug === undefined) { return { kind: "not-found" }; }
        return { kind: "changed", content: desired };
      }
    `).some((finding) => finding.ruleId === "NSD003")).toBe(true);

    expect(scan(`
      type ValidatedStageState = { readonly validated: true };
      function setCheckbox(state: ValidatedStageState, slug: string, desired: string) {
        const target = undefined;
        if (target === undefined) { return { kind: "not-found" }; }
        return { kind: "changed", content: desired };
      }
    `).some((finding) => finding.ruleId === "NSD003")).toBe(true);
  });
});

describe("no-silent-drop ledger", () => {
  test("baseline parser rejects unknown schema and duplicate fingerprints", () => {
    expect(() => parseBaseline('{"schemaVersion":2}')).toThrow(InfraFailure);
    const duplicate = baseline(["same", "same"]);
    expect(() => parseBaseline(JSON.stringify(duplicate))).toThrow("duplicate fingerprint");
  });

  test("exemption parser requires a non-empty reason", () => {
    expect(() => parseExemptions('{"schemaVersion":1,"entries":[{"fingerprint":"x","reason":""}]}')).toThrow(
      "is invalid",
    );
  });

  test("intentional-drop requires the adjacent NSD002 identity to match the ledger exactly", () => {
    const source = `
      type StateResult = { kind: "ok" } | { kind: "failed" };
      declare function applyTransition(): StateResult;
      // intentional-drop: approved best-effort transition

      applyTransition();
    `;
    const scanned = semanticScan(source);
    const finding = scanned.findings[0]!;
    expect(filterExemptions(scanned.findings, {
      schemaVersion: 1,
      entries: [{ fingerprint: finding.fingerprint, reason: "Approved best-effort transition." }],
    }, scanned.exemptionEligible)).toEqual([]);
    expect(() => filterExemptions(scanned.findings, { schemaVersion: 1, entries: [] }, scanned.exemptionEligible))
      .toThrow("no matching exemption ledger entry");
    expect(() => filterExemptions(scanned.findings, {
      schemaVersion: 1,
      entries: [{ fingerprint: "stale", reason: "Stale marker." }],
    }, scanned.exemptionEligible)).toThrow("stale or does not target");
  });

  test("ratchet allows removals and rejects additions or same-count replacements", () => {
    expect(() => assertShrinkOnly(baseline(["a"]), baseline(["a", "b"]))).not.toThrow();
    expect(() => assertShrinkOnly(baseline(["a", "c"]), baseline(["a", "b"]))).toThrow("addition/replacement");
  });

  test("new findings are exactly those absent from the baseline", () => {
    const findings = scan("try { a(); } catch (error) {}\ntry { b(); } catch (error) {}");
    expect(addedFindings(findings, baseline([findings[0]!.fingerprint]))).toEqual([findings[1]]);
  });

  test("approval is exact, duplicate-free, and rejects FP admission", () => {
    const findings = scan("try { a(); } catch (error) {}");
    const approval: ApprovalDoc = {
      schemaVersion: 1,
      censusDigest: "digest",
      entries: [{ fingerprint: findings[0]!.fingerprint, classification: "TP", reason: "confirmed", issues: ["#1979"] }],
    };
    expect(() => validateApproval(approval, findings, "digest")).not.toThrow();
    expect(() => validateApproval({ ...approval, entries: [{ ...approval.entries[0]!, classification: "FP" }] }, findings, "digest"))
      .toThrow("cannot enter the baseline");
  });

  test("ledger parsers reject malformed envelopes and entries", () => {
    expect(() => parseBaseline("{")) .toThrow("not valid JSON");
    expect(() => parseBaseline("null")).toThrow("schemaVersion 1");
    expect(() => parseBaseline('{"schemaVersion":1,"direction":"shrink-only"}')).toThrow("generatedFrom/entries");
    expect(() => parseBaseline(JSON.stringify({
      schemaVersion: 1,
      direction: "shrink-only",
      generatedFrom: { revision: 1, censusDigest: "c", approvalDigest: "a" },
      entries: [],
    }))).toThrow("generatedFrom.revision");
    expect(() => parseBaseline(JSON.stringify({
      schemaVersion: 1,
      direction: "shrink-only",
      generatedFrom: { revision: "r", censusDigest: "c", approvalDigest: "a", previousDigest: 1 },
      entries: [],
    }))).toThrow("previousDigest");
    expect(() => parseBaseline(JSON.stringify({
      schemaVersion: 1,
      direction: "shrink-only",
      generatedFrom: { revision: "r", censusDigest: "c", approvalDigest: "a" },
      entries: [{ fingerprint: "f", ruleId: "BAD", file: "/a.ts", reason: "", issues: [1] }],
    }))).toThrow("entries[0] is invalid");

    expect(() => parseExemptions("{")).toThrow("not valid JSON");
    expect(() => parseExemptions('{"schemaVersion":1,"previousDigest":1,"entries":[]}')).toThrow("entries array");
    expect(() => parseExemptions('{"schemaVersion":1,"entries":[null]}')).toThrow("entries[0] is invalid");
    expect(() => parseExemptions('{"schemaVersion":1,"entries":[{"fingerprint":"f","reason":"r"},{"fingerprint":"f","reason":"r"}]}'))
      .toThrow("duplicate fingerprint");

    expect(() => parseApproval("{")).toThrow("not valid JSON");
    expect(() => parseApproval("null")).toThrow("censusDigest and entries");
    expect(() => parseApproval('{"schemaVersion":1,"censusDigest":"c","entries":[null]}'))
      .toThrow("entries[0] is invalid");
  });

  test("ledger readers, ratchets, base resolution, and candidate construction fail closed", () => {
    const root = mkdtempSync(join(tmpdir(), "nsd-ledger-"));
    temporaryDirectories.push(root);
    const missing = join(root, "missing.json");
    expect(readBaseline(missing, false)).toBeNull();
    expect(() => readBaseline(missing, true)).toThrow("baseline is missing");
    expect(() => readExemptions(missing)).toThrow("exemptions are missing");

    const baseExemptions = { schemaVersion: 1 as const, entries: [{ fingerprint: "a", reason: "legacy" }] };
    const addedExemption = { schemaVersion: 1 as const, entries: [{ fingerprint: "b", reason: "new" }] };
    expect(() => assertExemptionsShrinkOnly(addedExemption, baseExemptions)).toThrow("exemption ratchet rejects");

    const envNames = ["AMADEUS_NSD_TRUSTED_BASE_SHA", "GITHUB_BASE_SHA", "GITHUB_EVENT_BEFORE"] as const;
    const saved = envNames.map((name) => process.env[name]);
    try {
      for (const name of envNames) delete process.env[name];
      expect(trustedBaseSha()).toBeNull();
      expect(trustedBaseSha("0".repeat(40))).toBeNull();
      expect(() => trustedBaseSha("short")).toThrow("event-specific full SHA");
    } finally {
      saved.forEach((value, index) => {
        const name = envNames[index]!;
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      });
    }

    const findings = scan("try { a(); } catch {}");
    const approval: ApprovalDoc = {
      schemaVersion: 1,
      censusDigest: "digest",
      entries: [{ fingerprint: findings[0]!.fingerprint, classification: "TP", reason: "confirmed", issues: ["#1979"] }],
    };
    expect(() => validateApproval({ ...approval, censusDigest: "wrong" }, findings, "digest")).toThrow("does not match");
    expect(() => validateApproval({ ...approval, entries: [...approval.entries, approval.entries[0]!] }, findings, "digest"))
      .toThrow("duplicate or unknown");
    expect(() => validateApproval({ ...approval, entries: [] }, findings, "digest")).toThrow("is missing");
    expect(buildCandidate("r", "digest", approval, findings).entries[0]?.fingerprint).toBe(findings[0]?.fingerprint);
    expect(() => buildCandidate("r", "digest", {
      ...approval,
      entries: [{ ...approval.entries[0]!, fingerprint: "f".repeat(64) }],
    }, findings)).toThrow("approval references an unknown finding");
    expect(violationResult(findings).status).toBe("violations");
    expect(() => violationResult([])).toThrow("at least one finding");
  });
});

describe("no-silent-drop boundaries", () => {
  test("trusted-base lookup returns null when no ancestor baseline matches", () => {
    const root = mkdtempSync(join(tmpdir(), "nsd-trusted-base-miss-"));
    temporaryDirectories.push(root);
    const baselineDir = join(root, "tests", "no-silent-drop");
    mkdirSync(baselineDir, { recursive: true });
    writeFileSync(
      join(baselineDir, "baseline.json"),
      `${JSON.stringify({ generatedFrom: { previousDigest: "f".repeat(64) } })}\n`,
    );
    for (const args of [
      ["init"],
      ["config", "user.email", "fixture@example.test"],
      ["config", "user.name", "Fixture"],
      ["add", "tests/no-silent-drop/baseline.json"],
      ["commit", "-m", "fixture"],
    ]) {
      expect(spawnSync("git", args, { cwd: root, encoding: "utf8" }).status).toBe(0);
    }

    expect(noSilentDropTrustedBase(root)).toBeNull();
  });

  test("check mode fails closed without a trusted base revision", async () => {
    expect(await runGate("check", REPO_ROOT)).toMatchObject({
      status: "error",
      code: "BASELINE_INVALID",
      detail: expect.stringContaining("trusted base revision"),
    });
  });

  test("snapshot rejects a symlink in an authoritative scan root", () => {
    const root = mkdtempSync(join(tmpdir(), "nsd-snapshot-"));
    temporaryDirectories.push(root);
    for (const path of ["packages/framework/core", "packages/framework/harness", "scripts"]) {
      mkdirSync(join(root, path), { recursive: true });
      writeFileSync(join(root, path, "source.ts"), "export const value = 1;\n");
    }
    symlinkSync(join(root, "scripts", "source.ts"), join(root, "scripts", "alias.ts"));
    expect(() => captureSnapshot(root)).toThrow("contains a symlink");
  });

  test("snapshot rejects missing, symlinked, non-directory, and empty roots", () => {
    const missing = mkdtempSync(join(tmpdir(), "nsd-root-missing-"));
    temporaryDirectories.push(missing);
    expect(() => captureSnapshot(missing)).toThrow("scan root is missing");

    const symlinked = snapshotRepository();
    rmSync(join(symlinked, "scripts"), { recursive: true, force: true });
    symlinkSync(join(symlinked, "packages", "framework", "core"), join(symlinked, "scripts"));
    expect(() => captureSnapshot(symlinked)).toThrow("scan root is a symlink");

    const fileRoot = snapshotRepository();
    rmSync(join(fileRoot, "scripts"), { recursive: true, force: true });
    writeFileSync(join(fileRoot, "scripts"), "not a directory\n");
    expect(() => captureSnapshot(fileRoot)).toThrow("scan root is not a directory");

    const empty = snapshotRepository();
    for (const path of ["packages/framework/core/source.ts", "packages/framework/harness/source.ts", "scripts/source.ts"]) {
      rmSync(join(empty, path));
    }
    expect(() => captureSnapshot(empty)).toThrow("zero authored source files");
  });

  test("snapshot verification detects removed directories, metadata changes, and byte changes", () => {
    const removedDirectoryRoot = snapshotRepository();
    const removedDirectorySnapshot = captureSnapshot(removedDirectoryRoot);
    rmSync(join(removedDirectoryRoot, "scripts"), { recursive: true, force: true });
    expect(() => verifySnapshot(removedDirectorySnapshot)).toThrow();

    const removedFileRoot = snapshotRepository();
    const removedFileSnapshot = captureSnapshot(removedFileRoot);
    rmSync(join(removedFileRoot, "scripts", "source.ts"));
    const removedFileDirectory = removedFileSnapshot.directories.find((entry) => entry.absolute.endsWith("/scripts"))!;
    utimesSync(join(removedFileRoot, "scripts"), new Date(), new Date(removedFileDirectory.mtimeMs));
    expect(() => verifySnapshot(removedFileSnapshot)).toThrow();

    const changedRoot = snapshotRepository();
    const changedSnapshot = captureSnapshot(changedRoot);
    const source = join(changedRoot, "scripts", "source.ts");
    writeFileSync(source, "export const value = 2;\n");
    const changedFile = changedSnapshot.files.find((entry) => entry.absolute === source)!;
    utimesSync(source, new Date(), new Date(changedFile.mtimeMs));
    expect(() => verifySnapshot(changedSnapshot)).toThrow();

    const exactRoot = snapshotRepository();
    const exactSnapshot = captureSnapshot(exactRoot);
    const exactFile = exactSnapshot.files[0]!;
    expect(() => verifySnapshot({
      ...exactSnapshot,
      directories: [],
      files: [{ ...exactFile, absolute: join(exactRoot, "missing.ts") }],
    })).toThrow("missing.ts");
    expect(() => verifySnapshot({
      ...exactSnapshot,
      directories: [],
      files: [{ ...exactFile, hash: "0".repeat(64) }],
    })).toThrow("source bytes changed");
  });

  test("snapshot wraps unreadable source files and directories", () => {
    const fileRoot = snapshotRepository();
    const source = join(fileRoot, "scripts", "source.ts");
    chmodSync(source, 0o000);
    try {
      expect(() => captureSnapshot(fileRoot)).toThrow();
    } finally {
      chmodSync(source, 0o600);
    }

    const directoryRoot = snapshotRepository();
    const directory = join(directoryRoot, "scripts");
    chmodSync(directory, 0o000);
    try {
      expect(() => captureSnapshot(directoryRoot)).toThrow();
    } finally {
      chmodSync(directory, 0o700);
    }
  });

  test("gate reports revision and AST-shape infrastructure failures without throwing", async () => {
    const noGit = snapshotRepository();
    mkdirSync(join(noGit, "tests", "no-silent-drop", "events"), { recursive: true });
    writeFileSync(
      join(noGit, "tests", "no-silent-drop", "ast-shape-fixture.ts.txt"),
      readFileSync(join(REPO_ROOT, "tests/no-silent-drop/ast-shape-fixture.ts.txt"), "utf8"),
    );
    symlinkSync(join(REPO_ROOT, "node_modules"), join(noGit, "node_modules"));
    expect((await runGate("check", noGit)).status).toBe("error");

    const missingFixture = snapshotRepository();
    expect(await runGate("check", missingFixture)).toMatchObject({ status: "error", code: "RULE_INVALID" });

    const badFixture = snapshotRepository();
    mkdirSync(join(badFixture, "tests", "no-silent-drop"), { recursive: true });
    writeFileSync(join(badFixture, "tests", "no-silent-drop", "ast-shape-fixture.ts.txt"), "export const ok = true;\n");
    symlinkSync(join(REPO_ROOT, "node_modules"), join(badFixture, "node_modules"));
    expect(await runGate("check", badFixture)).toMatchObject({ status: "error", code: "RULE_INVALID" });

    expect(isMode("check")).toBe(true);
    expect(isMode("census-evidence")).toBe(true);
    expect(isMode("approve-evidence")).toBe(true);
    expect(isMode("baseline-candidate")).toBe(true);
    expect(isMode("unknown")).toBe(false);
  });

  test("approval modes report missing and malformed approval documents", async () => {
    const missing = ledgerlessBaseRepository();
    expect(await runGate("approve-evidence", missing.root)).toMatchObject({
      status: "error",
      code: "BASELINE_MISSING",
    });

    const malformed = ledgerlessBaseRepository();
    writeFileSync(join(malformed.root, "tests/no-silent-drop/approval.json"), "{");
    expect(await runGate("approve-evidence", malformed.root)).toMatchObject({
      status: "error",
      code: "BASELINE_INVALID",
    });
  });

  test("a trusted base carrying the event ledger passes and exits 0", async () => {
    const fixture = ledgerBaseRepository();
    const result = await runGate("check", fixture.root, { baseRevision: fixture.baseRevision });
    expect(result).toEqual({ schemaVersion: 1, status: "pass", code: "NO_SILENT_DROP_OK", findings: [] });
    expect(resultExitCode(result)).toBe(0);
  });

  test("a trusted base without the event ledger fails closed", async () => {
    const fixture = ledgerlessBaseRepository();
    const result = await runGate("check", fixture.root, { baseRevision: fixture.baseRevision });
    expect(result).toMatchObject({
      status: "error",
      code: "BASELINE_MISSING",
      detail: expect.stringContaining("trusted base does not contain the event ledger"),
    });
    expect(resultExitCode(result)).toBe(2);
  });

  test("a trusted base outside the head lineage fails closed", async () => {
    const fixture = ledgerBaseRepository();
    const divergentRevision = runGit(fixture.root, [
      ...FIXTURE_IDENTITY,
      "commit-tree",
      "4b825dc642cb6eb9a060e54bf8d69288fbee4904",
      "-m",
      "divergent",
    ]);
    const result = await runGate("check", fixture.root, { baseRevision: divergentRevision });
    expect(result).toMatchObject({
      status: "error",
      code: "BASELINE_MISSING",
      detail: expect.stringContaining("trusted base does not contain the event ledger"),
    });
    expect(resultExitCode(result)).toBe(2);
  });

  test("deleting a trusted-base event without a snapshot fails closed", async () => {
    const fixture = ledgerBaseRepository();
    rmSync(join(fixture.root, `tests/no-silent-drop/events/${fixture.ulid}.json`));
    const result = await runGate("check", fixture.root, { baseRevision: fixture.baseRevision });
    expect(result).toMatchObject({
      status: "error",
      code: "BASELINE_INVALID",
      detail: expect.stringContaining("event custody subset check failed"),
    });
    expect(resultExitCode(result)).toBe(2);
  });

  test("rewriting a trusted-base event in place fails closed", async () => {
    const fixture = ledgerBaseRepository();
    writeFileSync(
      join(fixture.root, `tests/no-silent-drop/events/${fixture.ulid}.json`),
      encodeEvent({ ...fixture.grant, reason: "Rewritten after the trusted base." }),
    );
    const result = await runGate("check", fixture.root, { baseRevision: fixture.baseRevision });
    expect(result).toMatchObject({
      status: "error",
      code: "BASELINE_INVALID",
      detail: expect.stringContaining("in-place mutation forbidden"),
    });
    expect(resultExitCode(result)).toBe(2);
  });

  test("trusted previous ledgers support event custody and reject incomplete or invalid bases", () => {
    const createLedgerRepo = () => {
      const root = mkdtempSync(join(tmpdir(), "nsd-ledger-git-"));
      temporaryDirectories.push(root);
      mkdirSync(join(root, "tests/no-silent-drop/events"), { recursive: true });
      const ulid = ulidFromSeed("grant:grandfather:legacy");
      writeFileSync(join(root, `tests/no-silent-drop/events/${ulid}.json`), encodeEvent({
        schemaVersion: 1,
        ulid,
        op: "grant",
        kind: "grandfather",
        fingerprint: "legacy",
        ruleId: "NSD001",
        file: "a.ts",
        reason: "legacy finding",
        issues: ["#1979"],
      }));
      const identity = ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.com"];
      runGit(root, ["init", "-q"]);
      runGit(root, ["add", "."]);
      runGit(root, [...identity, "commit", "-qm", "base"]);
      const sha = runGit(root, ["rev-parse", "HEAD"]);
      // The ledger path requires a strict ancestor, so HEAD must move past the base.
      runGit(root, [...identity, "commit", "--allow-empty", "-qm", "head"]);
      const unrelated = runGit(root, [
        ...identity,
        "commit-tree",
        runGit(root, ["rev-parse", "HEAD^{tree}"]),
        "-m",
        "unrelated",
      ]);
      return { root, sha, head: runGit(root, ["rev-parse", "HEAD"]), unrelated };
    };

    const complete = createLedgerRepo();
    expect(loadTrustedPreviousLedgers(complete.root, complete.sha).source).toBe("events");
    expect(() => loadTrustedPreviousLedgers(complete.root, "invalid")).toThrow("not a resolvable full commit");
    expect(() => loadTrustedPreviousLedgers(complete.root, complete.head))
      .toThrow("not a strict ancestor of HEAD");
    expect(() => loadTrustedPreviousLedgers(complete.root, complete.unrelated))
      .toThrow("not a strict ancestor of HEAD");

    const missingEvents = mkdtempSync(join(tmpdir(), "nsd-ledger-missing-"));
    temporaryDirectories.push(missingEvents);
    mkdirSync(join(missingEvents, "tests/no-silent-drop"), { recursive: true });
    runGit(missingEvents, ["init", "-q"]);
    runGit(missingEvents, [
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.com",
      "commit",
      "--allow-empty",
      "-qm",
      "empty",
    ]);
    const emptySha = runGit(missingEvents, ["rev-parse", "HEAD"]);
    expect(() => loadTrustedPreviousLedgers(missingEvents, emptySha)).toThrow("event ledger is missing");

    const nonRepository = mkdtempSync(join(tmpdir(), "nsd-lineage-error-"));
    temporaryDirectories.push(nonRepository);
    expect(() => isAncestor(nonRepository, "a".repeat(40), "b".repeat(40)))
      .toThrow("trusted base lineage could not be verified");
  });

  test("real repository check emits the public pass envelope and exit 0", async () => {
    const result = await runGate("check", REPO_ROOT, { baseRevision: TRUSTED_BASE_REVISION });
    expect(result).toEqual({ schemaVersion: 1, status: "pass", code: "NO_SILENT_DROP_OK", findings: [] });
    expect(resultExitCode(result)).toBe(0);

    const census = await runGate("census-evidence", REPO_ROOT);
    expect(census).toMatchObject({ status: "pass", evidence: { revision: expect.any(String) } });
    const approved = await runGate("approve-evidence", REPO_ROOT);
    expect(approved).toMatchObject({ status: "pass", evidence: { approvalDigest: expect.any(String) } });
    const candidate = await runGate("baseline-candidate", REPO_ROOT);
    expect(candidate).toMatchObject({ status: "pass", candidate: { schemaVersion: 1 } });
  });

  test("CLI writes one JSON document to stdout", () => {
    const result = spawnSync("bun", [
      "run",
      "no-silent-drop",
      "--",
      "--base-revision",
      TRUSTED_BASE_REVISION,
    ], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      timeout: scaleTestTime(30_000),
    });
    expect(result.status).toBe(0);
    expect(result.stdout.trim().split("\n")).toHaveLength(1);
    expect(JSON.parse(result.stdout)).toEqual({
      schemaVersion: 1,
      status: "pass",
      code: "NO_SILENT_DROP_OK",
      findings: [],
    });
  });
});
