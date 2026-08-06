import { createHash } from "node:crypto";
import {
  type Dirent,
  lstatSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import type { Stats } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  loadVerifiedAstGrep,
  parseSource,
  scanParsedSources,
  scanSourceForTest,
} from "./ast-scan.ts";
import { loadTrustedPreviousLedgers } from "./bootstrap.ts";
import {
  addedFindings,
  approvalDigest,
  buildCandidate,
  CANONICAL_PATHS,
  filterExemptions,
  parseApproval,
  trustedBaseSha,
  validateApproval,
} from "./ledger.ts";
import {
  baselineDocFromFold,
  exemptionsDocFromFold,
  type FoldedLedger,
  foldEvents,
  loadEvents,
} from "./events.ts";
import {
  digest,
  errorResult,
  type Evidence,
  type GateResult,
  InfraFailure,
  passResult,
  violationResult,
} from "./model.ts";

export const SCAN_ROOTS = [
  "packages/framework/core",
  "packages/framework/harness",
  "scripts",
] as const;

export type Mode = "check" | "census-evidence" | "approve-evidence" | "baseline-candidate";

type SnapshotFile = {
  readonly absolute: string;
  readonly relative: string;
  readonly size: number;
  readonly mtimeMs: number;
  readonly content: string;
  readonly hash: string;
};

type DirectoryStamp = {
  readonly absolute: string;
  readonly mtimeMs: number;
};

type Snapshot = {
  readonly files: readonly SnapshotFile[];
  readonly directories: readonly DirectoryStamp[];
  readonly targetDigest: string;
};

export type GateOptions = { readonly baseRevision?: string };

const SOURCE_EXTENSION = /\.(?:ts|tsx|js|jsx|mjs|cjs)$/;
const SKIP_DIRECTORIES = new Set(["dist", "node_modules", "vendor", ".git"]);
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function compareBytes(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function readSource(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    throw new InfraFailure("SOURCE_UNREADABLE", `${path}: ${String(error)}`);
  }
}

function captureFile(repoRoot: string, path: string, stat: Stats): SnapshotFile {
  const content = readSource(path);
  return {
    absolute: path,
    relative: relative(repoRoot, path),
    size: stat.size,
    mtimeMs: stat.mtimeMs,
    content,
    hash: hashText(content),
  };
}

function readDirectory(directory: string): Dirent<string>[] {
  try {
    return readdirSync(directory, { withFileTypes: true, encoding: "utf8" });
  } catch (error) {
    throw new InfraFailure("SOURCE_UNREADABLE", `${directory}: ${String(error)}`);
  }
}

function walkSnapshotDirectory(
  repoRoot: string,
  directory: string,
  files: SnapshotFile[],
  directories: DirectoryStamp[],
): void {
  const directoryStat = lstatSync(directory);
  directories.push({ absolute: directory, mtimeMs: directoryStat.mtimeMs });
  for (const entry of readDirectory(directory)) {
    const path = join(directory, entry.name);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) {
      throw new InfraFailure("SCAN_INVALID_SYMLINK", `scan target contains a symlink: ${relative(repoRoot, path)}`);
    }
    if (stat.isDirectory()) {
      if (!SKIP_DIRECTORIES.has(entry.name)) walkSnapshotDirectory(repoRoot, path, files, directories);
    } else if (stat.isFile() && SOURCE_EXTENSION.test(entry.name)) {
      files.push(captureFile(repoRoot, path, stat));
    }
  }
}

export function captureSnapshot(repoRoot = REPO_ROOT): Snapshot {
  const files: SnapshotFile[] = [];
  const directories: DirectoryStamp[] = [];
  for (const root of SCAN_ROOTS) {
    const absoluteRoot = join(repoRoot, root);
    let rootStat: ReturnType<typeof lstatSync>;
    try {
      rootStat = lstatSync(absoluteRoot);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new InfraFailure("SCAN_ROOT_MISSING", `scan root is missing: ${root}`);
      }
      throw new InfraFailure("SOURCE_UNREADABLE", `${root}: ${String(error)}`);
    }
    if (rootStat.isSymbolicLink()) {
      throw new InfraFailure("SCAN_INVALID_SYMLINK", `scan root is a symlink: ${root}`);
    }
    if (!rootStat.isDirectory()) {
      throw new InfraFailure("SCAN_ROOT_MISSING", `scan root is not a directory: ${root}`);
    }
    walkSnapshotDirectory(repoRoot, absoluteRoot, files, directories);
  }
  files.sort((left, right) => compareBytes(left.relative, right.relative));
  directories.sort((left, right) => compareBytes(left.absolute, right.absolute));
  if (files.length === 0) throw new InfraFailure("SCAN_ZERO", "validated target set contains zero authored source files");
  const targetDigest = digest(files.map((file) => `${file.relative}\0${file.hash}`).join("\n"));
  return { files, directories, targetDigest };
}

export function verifySnapshot(snapshot: Snapshot): void {
  for (const directory of snapshot.directories) {
    let stat: ReturnType<typeof lstatSync>;
    try {
      stat = lstatSync(directory.absolute);
    } catch (error) {
      throw new InfraFailure("SOURCE_CHANGED_DURING_SCAN", `${directory.absolute}: ${String(error)}`);
    }
    if (!stat.isDirectory() || stat.isSymbolicLink() || stat.mtimeMs !== directory.mtimeMs) {
      throw new InfraFailure("SOURCE_CHANGED_DURING_SCAN", `directory changed during scan: ${directory.absolute}`);
    }
  }
  for (const file of snapshot.files) {
    let stat: ReturnType<typeof lstatSync>;
    try {
      stat = lstatSync(file.absolute);
    } catch (error) {
      throw new InfraFailure("SOURCE_CHANGED_DURING_SCAN", `${file.relative}: ${String(error)}`);
    }
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== file.size || stat.mtimeMs !== file.mtimeMs) {
      throw new InfraFailure("SOURCE_CHANGED_DURING_SCAN", `source metadata changed during scan: ${file.relative}`);
    }
    if (hashText(readSource(file.absolute)) !== file.hash) {
      throw new InfraFailure("SOURCE_CHANGED_DURING_SCAN", `source bytes changed during scan: ${file.relative}`);
    }
  }
}

function currentRevision(repoRoot: string): string {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" });
  if (result.error || result.status !== 0 || typeof result.stdout !== "string") {
    throw new InfraFailure("INTERNAL_ERROR", "current revision is not an unambiguous full SHA");
  }
  const revision = result.stdout.trim();
  if (!/^[0-9a-f]{40}$/.test(revision)) {
    throw new InfraFailure("INTERNAL_ERROR", "current revision is not an unambiguous full SHA");
  }
  return revision;
}

function validateAstShape(repoRoot: string): void {
  const fixturePath = join(repoRoot, "tests", "no-silent-drop", "ast-shape-fixture.ts.txt");
  let fixture: string;
  try {
    fixture = readFileSync(fixturePath, "utf8");
  } catch (error) {
    throw new InfraFailure("RULE_INVALID", `AST shape fixture is unavailable: ${String(error)}`);
  }
  const findings = scanSourceForTest("ast-shape-fixture.ts", fixture, repoRoot);
  const actual = findings.map((finding) => finding.ruleId).sort().join(",");
  if (actual !== "NSD001,NSD001,NSD002,NSD003") {
    throw new InfraFailure("RULE_INVALID", `AST shape fixture mismatch: ${actual || "no findings"}`);
  }
}

function censusDigestOf(fingerprints: readonly string[]): string {
  return digest([...fingerprints].sort().join("\n"));
}

function readApproval(repoRoot: string) {
  const path = CANONICAL_PATHS.approval(repoRoot);
  try {
    return parseApproval(readFileSync(path, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new InfraFailure("BASELINE_MISSING", `approval is missing: ${path}`);
    }
    throw error;
  }
}

async function execute(mode: Mode, repoRoot: string, options: GateOptions): Promise<GateResult> {
  validateAstShape(repoRoot);
  const snapshot = captureSnapshot(repoRoot);
  const ast = loadVerifiedAstGrep(repoRoot);
  const parsed = snapshot.files.map((file) => parseSource(ast, file.relative, file.content));
  const semanticScan = scanParsedSources(parsed);
  const rawFindings = semanticScan.findings;
  verifySnapshot(snapshot);

  const revision = currentRevision(repoRoot);
  let folded: FoldedLedger;
  if (mode === "check") {
    const trustedSha = trustedBaseSha(options.baseRevision);
    if (trustedSha === null) {
      throw new InfraFailure("BASELINE_INVALID", "check mode requires a non-zero trusted base revision");
    }
    folded = loadTrustedPreviousLedgers(repoRoot, trustedSha).folded;
  } else {
    folded = foldEvents(loadEvents(repoRoot).byUlid.values());
  }
  const exemptions = exemptionsDocFromFold(folded);
  const baseline = baselineDocFromFold(folded, revision, folded.effectiveDigest);
  const findings = filterExemptions(rawFindings, exemptions, semanticScan.exemptionEligible);
  const censusDigest = censusDigestOf(findings.map((finding) => finding.fingerprint));
  const evidence: Evidence = {
    schemaVersion: 1,
    revision,
    targetDigest: snapshot.targetDigest,
    censusDigest,
    counts: {
      C_pre: rawFindings.length,
      B_pre: findings.length,
      B0: baseline.entries.length,
    },
    findings,
  };

  if (mode === "census-evidence") return passResult({ evidence });

  if (mode === "check") {
    // Custody (subset check) already enforced inside loadTrustedPreviousLedgers.
    // Grant additions with issue tracking are allowed; only new findings outside
    // the folded effective set are violations.
    const added = addedFindings(findings, baseline);
    return added.length > 0 ? violationResult(added) : passResult();
  }

  const approval = readApproval(repoRoot);
  validateApproval(approval, findings, censusDigest);
  const approvedEvidence = { ...evidence, approvalDigest: approvalDigest(approval) };
  if (mode === "approve-evidence") return passResult({ evidence: approvedEvidence });
  return passResult({
    evidence: approvedEvidence,
    candidate: buildCandidate(revision, censusDigest, approval, findings),
  });
}

export async function runGate(mode: Mode, repoRoot = REPO_ROOT, options: GateOptions = {}): Promise<GateResult> {
  try {
    return await execute(mode, repoRoot, options);
  } catch (error) {
    if (error instanceof InfraFailure) return errorResult(error.code, error.message);
    return errorResult("INTERNAL_ERROR", error instanceof Error ? error.message : String(error));
  }
}

export function isMode(value: string | undefined): value is Mode {
  return value === "check"
    || value === "census-evidence"
    || value === "approve-evidence"
    || value === "baseline-candidate";
}

export function resultExitCode(result: GateResult): 0 | 1 | 2 {
  if (result.status === "pass") return 0;
  if (result.status === "violations") return 1;
  return 2;
}
