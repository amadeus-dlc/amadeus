// covers: subcommand:no-silent-drop:check, subcommand:no-silent-drop:census-evidence
// size: small
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  loadVerifiedAstGrep,
  parseSource,
  scanParsedSources,
  scanSourceForTest,
} from "../no-silent-drop/ast-scan.ts";
import { captureSnapshot, resultExitCode, runGate } from "../no-silent-drop/engine.ts";
import {
  addedFindings,
  approvalDigest,
  assertShrinkOnly,
  filterExemptions,
  parseBaseline,
  parseExemptions,
  validateApproval,
} from "../no-silent-drop/ledger.ts";
import {
  type ApprovalDoc,
  type BaselineDoc,
  digest,
  type Finding,
  findingFingerprint,
  InfraFailure,
} from "../no-silent-drop/model.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
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
      if (target === undefined) return { kind: "not-found", target: slug };
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

function artifact(root: string, path: string, value: unknown): { path: string; digest: string } {
  const bytes = `${JSON.stringify(value)}\n`;
  writeFileSync(join(root, path), bytes);
  return { path, digest: digest(bytes) };
}

function bootstrapRepository(): { root: string; baseRevision: string; artifactPaths: string[] } {
  const root = mkdtempSync(join(REPO_ROOT, ".nsd-bootstrap-"));
  temporaryDirectories.push(root);
  for (const path of ["packages/framework/core", "packages/framework/harness", "scripts", "tests/no-silent-drop/bootstrap"]) {
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
  runGit(root, ["add", "packages", "scripts"]);
  runGit(root, ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", "commit", "-qm", "base"]);
  const baseRevision = runGit(root, ["rev-parse", "HEAD"]);
  runGit(root, ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", "commit", "--allow-empty", "-qm", "post"]);
  const postRevision = runGit(root, ["rev-parse", "HEAD"]);
  const emptyDigest = digest("");
  const legacyFingerprint = "f".repeat(64);
  const secondLegacyFingerprint = "e".repeat(64);
  const preEntries = [
    {
      fingerprint: legacyFingerprint,
      ruleId: "NSD003",
      file: "packages/framework/core/legacy.ts",
      reason: "Approved pre-fix mutation contract debt.",
      issues: ["#1874"],
    },
    {
      fingerprint: secondLegacyFingerprint,
      ruleId: "NSD003",
      file: "packages/framework/core/other-legacy.ts",
      reason: "Approved pre-fix mutation contract debt.",
      issues: ["#1878"],
    },
  ];
  const preIdentities = [legacyFingerprint, secondLegacyFingerprint];
  const preIdentityDigest = digest([...preIdentities].sort().join("\n"));
  const postApproval = {
    schemaVersion: 1,
    censusDigest: emptyDigest,
    entries: [],
  } as const satisfies ApprovalDoc;
  const baselineValue = {
    schemaVersion: 1,
    direction: "shrink-only",
    generatedFrom: {
      revision: postRevision,
      censusDigest: emptyDigest,
      approvalDigest: approvalDigest(postApproval),
      previousDigest: preIdentityDigest,
    },
    entries: [],
  };
  const baselineBytes = `${JSON.stringify(baselineValue)}\n`;
  writeFileSync(join(root, "tests/no-silent-drop/baseline.json"), baselineBytes);
  const exemptionsValue = { schemaVersion: 1, previousDigest: emptyDigest, entries: [] };
  const exemptionsBytes = `${JSON.stringify(exemptionsValue)}\n`;
  writeFileSync(join(root, "tests/no-silent-drop/exemptions.json"), exemptionsBytes);
  const ruleBundleDigest = "a".repeat(64);
  const semanticDependencyDigest = "b".repeat(64);
  const preRaw = artifact(root, "tests/no-silent-drop/bootstrap/pre-raw.json", { schemaVersion: 1 });
  const preClassification = artifact(root, "tests/no-silent-drop/bootstrap/pre-classification.json", { schemaVersion: 1 });
  const preApproval = artifact(root, "tests/no-silent-drop/bootstrap/pre-approval.json", {
    schemaVersion: 1,
    censusDigest: preIdentityDigest,
    entries: [{
      fingerprint: legacyFingerprint,
      classification: "TP",
      reason: "Approved mutation contract debt.",
      issues: ["#1874"],
    }, {
      fingerprint: secondLegacyFingerprint,
      classification: "TP",
      reason: "Approved mutation contract debt.",
      issues: ["#1878"],
    }],
  });
  const postRaw = artifact(root, "tests/no-silent-drop/bootstrap/post-raw.json", { schemaVersion: 1 });
  const postClassification = artifact(root, "tests/no-silent-drop/bootstrap/post-classification.json", { schemaVersion: 1 });
  const postApprovalRef = artifact(root, "tests/no-silent-drop/bootstrap/post-approval.json", postApproval);
  const approved = (
    path: string,
    revision: string,
    refs: { raw: { digest: string }; classification: { digest: string }; approval: { digest: string } },
    identities: string[],
  ) => artifact(root, path, {
    schemaVersion: 1,
    revision,
    rawDigest: refs.raw.digest,
    classificationDigest: refs.classification.digest,
    approvalDigest: refs.approval.digest,
    ruleBundleDigest,
    semanticDependencyDigest,
    identities,
  });
  const preApproved = approved(
    "tests/no-silent-drop/bootstrap/pre-approved.json",
    baseRevision,
    { raw: preRaw, classification: preClassification, approval: preApproval },
    preIdentities,
  );
  const postApproved = approved(
    "tests/no-silent-drop/bootstrap/post-approved.json",
    postRevision,
    { raw: postRaw, classification: postClassification, approval: postApprovalRef },
    [],
  );
  const candidate = { path: "tests/no-silent-drop/baseline.json", digest: digest(baselineBytes) };
  const humanReview = artifact(root, "tests/no-silent-drop/bootstrap/human-review.json", {
    schemaVersion: 1,
    decision: "approved",
    reviewer: "human-reviewer",
    reviewedAt: "2026-08-02T00:00:00.000Z",
    candidateDigest: candidate.digest,
    preApprovedEvidenceDigest: preApproved.digest,
    postApprovedEvidenceDigest: postApproved.digest,
  });
  const provenance = {
    schemaVersion: 1,
    commandVersion: "no-silent-drop-bootstrap-v1",
    bootstrapBaseRevision: baseRevision,
    preRevision: baseRevision,
    postRevision,
    ruleBundleDigest,
    semanticDependencyDigest,
    pre: { raw: preRaw, classification: preClassification, approval: preApproval, approvedEvidence: preApproved },
    post: { raw: postRaw, classification: postClassification, approval: postApprovalRef, approvedEvidence: postApproved },
    candidate,
    humanReview,
    approvedPre: { identitySetDigest: preIdentityDigest, entries: preEntries },
    candidateB0: { identitySetDigest: emptyDigest },
    initialExemptions: { bytesDigest: digest(exemptionsBytes), identitySetDigest: emptyDigest, entries: [] },
    removed: [
      { fingerprint: legacyFingerprint, issue: "#1874" },
      { fingerprint: secondLegacyFingerprint, issue: "#1878" },
    ],
    added: [],
  };
  writeFileSync(join(root, "tests/no-silent-drop/bootstrap-provenance.json"), `${JSON.stringify(provenance)}\n`);
  return {
    root,
    baseRevision,
    artifactPaths: [
      "tests/no-silent-drop/bootstrap-provenance.json",
      preRaw.path,
      preApproved.path,
    ],
  };
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
    expect(scan(unsafe).map((finding) => finding.ruleId)).toContain("NSD003");
    expect(scan(safe).filter((finding) => finding.ruleId === "NSD003")).toEqual([]);
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
});

describe("no-silent-drop boundaries", () => {
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

  test("first adoption accepts a fully bound bootstrap provenance when the base has no ledger", async () => {
    const fixture = bootstrapRepository();
    const result = await runGate("check", fixture.root, { baseRevision: fixture.baseRevision });
    expect(result).toEqual({ schemaVersion: 1, status: "pass", code: "NO_SILENT_DROP_OK", findings: [] });
    expect(resultExitCode(result)).toBe(0);
  });

  test("first adoption fails closed for absent, mutated, mismatched, or incomplete provenance", async () => {
    const mutations: Array<(fixture: ReturnType<typeof bootstrapRepository>) => void> = [
      (fixture) => rmSync(join(fixture.root, fixture.artifactPaths[0]!)),
      (fixture) => writeFileSync(join(fixture.root, fixture.artifactPaths[1]!), '{"schemaVersion":1} \n'),
      (fixture) => {
        const path = join(fixture.root, fixture.artifactPaths[0]!);
        const value = JSON.parse(readFileSync(path, "utf8"));
        value.bootstrapBaseRevision = "0".repeat(40);
        writeFileSync(path, `${JSON.stringify(value)}\n`);
      },
      (fixture) => rmSync(join(fixture.root, fixture.artifactPaths[2]!)),
      (fixture) => {
        const path = join(fixture.root, fixture.artifactPaths[0]!);
        const value = JSON.parse(readFileSync(path, "utf8"));
        value.approvedPre.identitySetDigest = "c".repeat(64);
        writeFileSync(path, `${JSON.stringify(value)}\n`);
      },
    ];
    for (const mutate of mutations) {
      const fixture = bootstrapRepository();
      mutate(fixture);
      const result = await runGate("check", fixture.root, { baseRevision: fixture.baseRevision });
      expect(result.status).toBe("error");
      expect(resultExitCode(result)).toBe(2);
    }
  });

  test("real repository check emits the public pass envelope and exit 0", async () => {
    const result = await runGate("check", REPO_ROOT);
    expect(result).toEqual({ schemaVersion: 1, status: "pass", code: "NO_SILENT_DROP_OK", findings: [] });
    expect(resultExitCode(result)).toBe(0);
  });

  test("CLI writes one JSON document to stdout", () => {
    const result = spawnSync("bun", ["run", "no-silent-drop"], { cwd: REPO_ROOT, encoding: "utf8" });
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
