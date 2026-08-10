import { createHash } from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  existsSync,
  fstatSync,
  openSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import { relative, resolve } from "node:path";
import { requireFlagValue } from "./amadeus-sensor-flags.ts";

export type NumericClaimClass = "count" | "ratio" | "percentage" | "measured-value";

export interface NumericClaim {
  readonly claimClass: NumericClaimClass;
  readonly line: number;
  readonly column: number;
  readonly normalizedText: string;
  readonly regionId: number;
  readonly logicalLine: number;
}

export type ProvenanceKind = "command-token" | "measurement-reference" | "hex-sha" | "relative-link";

export interface ProvenanceMatch {
  readonly kind: ProvenanceKind;
  readonly evidence: string;
  readonly distance: number;
  readonly line: number;
  readonly column: number;
}

export interface ProvenanceContext {
  readonly markdown: string;
  readonly outputPath: string;
}

export interface EvaluationInput {
  readonly stage: string;
  readonly outputPath: string;
  readonly content:
    | { readonly kind: "present"; readonly markdown: string }
    | { readonly kind: "missing" }
    | { readonly kind: "unavailable"; readonly reason: "outside-root" | "not-regular-file" | "path-race" };
}

export interface EvaluationDeps {
  readonly fileExists: (path: string) => boolean;
  readonly isRegularFile: (path: string) => boolean;
}

function memoizedEvaluationDeps(deps: EvaluationDeps): EvaluationDeps {
  const facts = new Map<string, { readonly exists: boolean; readonly regular: boolean }>();
  const fact = (path: string): { readonly exists: boolean; readonly regular: boolean } => {
    const cached = facts.get(path);
    if (cached) return cached;
    const exists = deps.fileExists(path);
    const value = { exists, regular: exists && deps.isRegularFile(path) };
    facts.set(path, value);
    return value;
  };
  return {
    fileExists: (path) => fact(path).exists,
    isRegularFile: (path) => fact(path).regular,
  };
}

export interface NumericProvenanceFinding {
  readonly path: string;
  readonly stage: string;
  readonly claim_class: NumericClaimClass;
  readonly line: number;
  readonly column: number;
  readonly excerpt: string;
  readonly expected: readonly string[];
}

export interface NumericProvenanceVerdict {
  readonly pass: boolean;
  readonly skipped: boolean;
  readonly findings_count: number;
  readonly findings: readonly NumericProvenanceFinding[];
  readonly metrics: Readonly<Record<string, number | string>>;
  readonly reason: string;
}

export type NumericProvenanceMode = "enforcement" | "measurement-only";

export type NumericProvenanceSearchScope =
  | { readonly kind: "bounded"; readonly window: number }
  | { readonly kind: "full-structural-region" };

export interface NumericProvenancePolicy {
  readonly stageSlug: string;
  readonly recordRelativeOutputPattern: string;
  readonly producesKey: string;
  readonly claimClass: NumericClaimClass;
  readonly mode: NumericProvenanceMode;
  readonly searchScope: NumericProvenanceSearchScope;
  readonly evidenceId: string;
}

export interface NumericProvenanceMapping {
  readonly schemaRevision: 1;
  readonly predicateRevision: "fr-pred-v1";
  readonly authorityPath: string;
  readonly authorityDigest: string;
  readonly cutoffYymmdd: number;
  readonly policies: readonly NumericProvenancePolicy[];
  readonly wiredStages: readonly string[];
}

export interface NumericProvenanceClassificationInput {
  readonly artifactKind: string;
  readonly claimClass: NumericClaimClass;
  readonly labeledCount: number;
  readonly falsePositiveCount: number;
  readonly provenancePositiveDistances: readonly number[];
}

export interface NumericProvenanceClassificationEvidence {
  readonly artifactKind: string;
  readonly claimClass: NumericClaimClass;
  readonly labeledCount: number;
  readonly falsePositiveRate: Readonly<{ numerator: number; denominator: number }>;
  readonly provenancePositiveCount: number;
  readonly statistics: Readonly<{
    count: number;
    min: number | null;
    median: number | null;
    p95: number | null;
    max: number | null;
  }>;
  readonly coverage: Readonly<{ numerator: number; denominator: number }>;
  readonly mode: NumericProvenanceMode;
  readonly searchScope: NumericProvenanceSearchScope;
  readonly downgradeReasons: readonly string[];
}

export interface CorpusSnapshot {
  readonly observedSha: string;
  readonly graphRevision: string;
  readonly predicateRevision: "fr-pred-v1";
  readonly corpusContentDigest: string;
}

export interface DeclaredProducesRow {
  readonly stageSlug: string;
  readonly recordRelativeOutputPattern: string;
  readonly producesKey: string;
}

export interface DesignTimeArtifactIndexInput {
  readonly snapshot: CorpusSnapshot;
  readonly declaredProduces: readonly DeclaredProducesRow[];
  readonly codekbRescanPaths: readonly string[];
}

export type SweepArtifactDescriptor =
  | {
      readonly source: "declared-artifact";
      readonly relativePath: string;
      readonly stageSlug: string;
      readonly recordRelativeOutputPattern: string;
      readonly producesKey: string;
      readonly artifactKind: string;
      readonly eligibility: "candidate" | "excluded" | "lightweight";
      readonly reasonCode: string;
    }
  | {
      readonly source: "codekb-re-scan";
      readonly relativePath: string;
      readonly artifactKind: "codekb-re-scan";
      readonly eligibility: "scan-only";
      readonly reasonCode: "codekb-scan-only";
    };

export function indexSweepArtifacts(input: DesignTimeArtifactIndexInput): readonly SweepArtifactDescriptor[] {
  const descriptors: SweepArtifactDescriptor[] = input.declaredProduces.map((row) => {
    const basename = row.recordRelativeOutputPattern.split("/").at(-1) ?? "";
    const excluded =
      basename === "memory.md" ||
      basename.endsWith("-questions.md") ||
      /(^|[-_])(ack|acknowledgement)([-_.]|$)/i.test(basename);
    const lightweight = LIGHTWEIGHT_BASENAMES.has(basename) || LIGHTWEIGHT_PRODUCES.has(row.producesKey);
    return {
      source: "declared-artifact",
      relativePath: row.recordRelativeOutputPattern,
      stageSlug: row.stageSlug,
      recordRelativeOutputPattern: row.recordRelativeOutputPattern,
      producesKey: row.producesKey,
      artifactKind: row.producesKey,
      eligibility: excluded ? "excluded" : lightweight ? "lightweight" : "candidate",
      reasonCode: excluded ? "mechanically-excluded" : lightweight ? "lightweight-report" : "declared-candidate",
    };
  });
  descriptors.push(
    ...input.codekbRescanPaths.map(
      (relativePath): SweepArtifactDescriptor => ({
        source: "codekb-re-scan",
        relativePath,
        artifactKind: "codekb-re-scan",
        eligibility: "scan-only",
        reasonCode: "codekb-scan-only",
      }),
    ),
  );
  return descriptors.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

function median(sorted: readonly number[]): number | null {
  if (sorted.length === 0) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1]! + sorted[middle]!) / 2 : sorted[middle]!;
}

function nearestRank(sorted: readonly number[], percentile: number): number | null {
  if (sorted.length === 0) return null;
  return sorted[Math.ceil((percentile / 100) * sorted.length) - 1]!;
}

function validateClassificationInput(input: NumericProvenanceClassificationInput): void {
  if (!Number.isSafeInteger(input.labeledCount) || input.labeledCount < 0) {
    throw new Error("invalid-labeled-count");
  }
  if (
    !Number.isSafeInteger(input.falsePositiveCount) ||
    input.falsePositiveCount < 0 ||
    input.falsePositiveCount > input.labeledCount
  ) {
    throw new Error("invalid-false-positive-count");
  }
  if (input.provenancePositiveDistances.some((distance) => !Number.isSafeInteger(distance) || distance < 0)) {
    throw new Error("invalid-provenance-distance");
  }
}

function strictInteriorWindow(min: number | null, p95: number | null): number | null {
  if (min === null) return null;
  if (p95 === null) return null;
  return Math.max(p95, min + 1);
}

function exceedsFalsePositiveThreshold(input: NumericProvenanceClassificationInput): boolean {
  if (input.labeledCount === 0) return true;
  return input.falsePositiveCount * 10 > input.labeledCount;
}

function lacksObservedDistanceRange(min: number | null, max: number | null): boolean {
  if (min === null) return true;
  if (max === null) return true;
  return min >= max;
}

function saturatesUpperBound(window: number | null, max: number | null): boolean {
  if (window === null) return true;
  if (max === null) return true;
  return window >= max;
}

function classificationDowngradeReasons(
  input: NumericProvenanceClassificationInput,
  distances: readonly number[],
  min: number | null,
  max: number | null,
  window: number | null,
): string[] {
  const reasons: string[] = [];
  if (input.labeledCount < 30) reasons.push("labeled-count-below-30");
  if (exceedsFalsePositiveThreshold(input)) reasons.push("false-positive-rate-above-0.10");
  if (distances.length < 20) reasons.push("provenance-positive-count-below-20");
  if (lacksObservedDistanceRange(min, max)) reasons.push("distance-range-not-observed");
  if (saturatesUpperBound(window, max)) reasons.push("upper-bound-saturation");
  return reasons;
}

export function classifyNumericProvenanceEvidence(
  input: NumericProvenanceClassificationInput,
): NumericProvenanceClassificationEvidence {
  validateClassificationInput(input);
  const distances = [...input.provenancePositiveDistances].sort((left, right) => left - right);
  const min = distances[0] ?? null;
  const max = distances.at(-1) ?? null;
  const p95 = nearestRank(distances, 95);
  const window = strictInteriorWindow(min, p95);
  const reasons = classificationDowngradeReasons(input, distances, min, max, window);
  const mode: NumericProvenanceMode = reasons.length === 0 ? "enforcement" : "measurement-only";
  const covered = window === null ? distances.length : distances.filter((distance) => distance <= window).length;
  return {
    artifactKind: input.artifactKind,
    claimClass: input.claimClass,
    labeledCount: input.labeledCount,
    falsePositiveRate: { numerator: input.falsePositiveCount, denominator: input.labeledCount },
    provenancePositiveCount: distances.length,
    statistics: {
      count: distances.length,
      min,
      median: median(distances),
      p95,
      max,
    },
    coverage: { numerator: covered, denominator: distances.length },
    mode,
    searchScope:
      mode === "enforcement" && window !== null
        ? { kind: "bounded", window }
        : { kind: "full-structural-region" },
    downgradeReasons: reasons,
  };
}

export function sampleNumericClaimIdentity(relativePath: string, line: number, normalizedText: string): string {
  return createHash("sha256").update(JSON.stringify([relativePath, line, normalizedText]), "utf8").digest("hex");
}

export interface SweepLabel {
  readonly meaningfulNumericClaim: boolean;
  readonly validProvenanceNotMissed: boolean;
  readonly reason: string;
}

export interface SweepDeps {
  readonly indexInput: DesignTimeArtifactIndexInput;
  readonly listMarkdownFiles: (corpusRoot: string) => readonly string[];
  readonly readFile: (relativePath: string) => string;
  readonly labels: ReadonlyMap<string, SweepLabel>;
  readonly evaluationDeps: EvaluationDeps;
  readonly requireEnforcement?: boolean;
}

export interface SweepLabeledSample extends SweepLabel {
  readonly identity: string;
  readonly relativePath: string;
  readonly line: number;
  readonly normalizedText: string;
  readonly labelerRole: "amadeus-quality-agent";
  readonly provenanceDistance: number | null;
}

export interface SweepGeneratedMapping {
  readonly authoritySweepDigest: string;
  readonly mechanicalExclusionRevision: "fr-pred-v1";
  readonly policies: readonly NumericProvenancePolicy[];
  readonly wiredStages: readonly string[];
}

export interface SweepReport {
  readonly snapshot: CorpusSnapshot;
  readonly artifactIndex: Readonly<{
    input: DesignTimeArtifactIndexInput;
    output: Readonly<{ descriptors: readonly SweepArtifactDescriptor[] }>;
  }>;
  readonly samples: readonly SweepLabeledSample[];
  readonly evidence: readonly NumericProvenanceClassificationEvidence[];
  readonly mapping: SweepGeneratedMapping;
}

interface SweepObservation {
  readonly descriptor: SweepArtifactDescriptor;
  readonly relativePath: string;
  readonly claim: NumericClaim;
  readonly provenanceDistance: number | null;
  readonly identity: string;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function matchesOutputPattern(pattern: string, path: string): boolean {
  const escaped = pattern
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join("[^/]+");
  return new RegExp(`^${escaped}$`).test(path);
}

function recordRelativePath(relativePath: string): string | undefined {
  return relativePath.replace(/\\/g, "/").match(/(?:^|\/)amadeus\/spaces\/[^/]+\/intents\/[^/]+\/(.+)$/)?.[1];
}

function descriptorForPath(
  relativePath: string,
  descriptors: readonly SweepArtifactDescriptor[],
): SweepArtifactDescriptor | undefined {
  const normalized = relativePath.replace(/\\/g, "/");
  const recordRelative = recordRelativePath(normalized);
  for (const descriptor of descriptors) {
    if (descriptor.source === "codekb-re-scan") {
      if (descriptor.relativePath === normalized) return descriptor;
    } else if (
      descriptor.eligibility === "candidate" &&
      recordRelative !== undefined &&
      matchesOutputPattern(descriptor.recordRelativeOutputPattern, recordRelative)
    ) {
      return descriptor;
    }
  }
  return undefined;
}

export function sweepNumericProvenance(corpusRoot: string, deps: SweepDeps): SweepReport {
  const descriptors = indexSweepArtifacts(deps.indexInput);
  const observations: SweepObservation[] = [];
  for (const relativePath of [...deps.listMarkdownFiles(corpusRoot)].sort()) {
    const descriptor = descriptorForPath(relativePath, descriptors);
    if (!descriptor) continue;
    const markdown = deps.readFile(relativePath);
    const index = indexMarkdown(markdown);
    const evaluationDeps = memoizedEvaluationDeps(deps.evaluationDeps);
    for (const claim of index.claims) {
      const match = nearestFromIndex(claim, index, `${corpusRoot}/${relativePath}`, evaluationDeps);
      observations.push({
        descriptor,
        relativePath,
        claim,
        provenanceDistance: match?.distance ?? null,
        identity: sampleNumericClaimIdentity(relativePath, claim.line, claim.normalizedText),
      });
    }
  }

  const grouped = new Map<string, SweepObservation[]>();
  for (const observation of observations) {
    const key = `${observation.descriptor.artifactKind}\0${observation.claim.claimClass}`;
    const group = grouped.get(key) ?? [];
    group.push(observation);
    grouped.set(key, group);
  }

  const evidence: NumericProvenanceClassificationEvidence[] = [];
  const samples: SweepLabeledSample[] = [];
  for (const [key, group] of [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const [artifactKind, claimClass] = key.split("\0") as [string, NumericClaimClass];
    const uniqueSamples = new Map<string, SweepObservation>();
    for (const observation of [...group].sort((left, right) => left.identity.localeCompare(right.identity))) {
      const previous = uniqueSamples.get(observation.identity);
      if (
        previous &&
        (previous.relativePath !== observation.relativePath ||
          previous.claim.line !== observation.claim.line ||
          previous.claim.normalizedText !== observation.claim.normalizedText)
      ) {
        throw new Error("sample-identity-collision");
      }
      if (!previous) uniqueSamples.set(observation.identity, observation);
    }
    const selected = [...uniqueSamples.values()]
      .filter((observation) => deps.labels.has(observation.identity))
      .slice(0, 50);
    const labeled = selected.flatMap((observation): SweepLabeledSample[] => {
      const label = deps.labels.get(observation.identity);
      if (!label) return [];
      return [
        {
          identity: observation.identity,
          relativePath: observation.relativePath,
          line: observation.claim.line,
          normalizedText: observation.claim.normalizedText,
          meaningfulNumericClaim: label.meaningfulNumericClaim,
          validProvenanceNotMissed: label.validProvenanceNotMissed,
          reason: label.reason,
          labelerRole: "amadeus-quality-agent",
          provenanceDistance: observation.provenanceDistance,
        },
      ];
    });
    samples.push(...labeled);
    evidence.push(
      classifyNumericProvenanceEvidence({
        artifactKind,
        claimClass,
        labeledCount: labeled.length,
        falsePositiveCount: labeled.filter(
          (sample) => !sample.meaningfulNumericClaim || !sample.validProvenanceNotMissed,
        ).length,
        provenancePositiveDistances: group.flatMap((observation) =>
          observation.provenanceDistance === null ? [] : [observation.provenanceDistance],
        ),
      }),
    );
  }

  if ((deps.requireEnforcement ?? true) && !evidence.some((row) => row.mode === "enforcement")) {
    throw new Error("no-enforcement-group");
  }
  const allPolicies: NumericProvenancePolicy[] = [];
  for (const row of evidence) {
    for (const descriptor of descriptors) {
      if (descriptor.source !== "declared-artifact" || descriptor.artifactKind !== row.artifactKind) continue;
      allPolicies.push({
        stageSlug: descriptor.stageSlug,
        recordRelativeOutputPattern: descriptor.recordRelativeOutputPattern,
        producesKey: descriptor.producesKey,
        claimClass: row.claimClass,
        mode: row.mode,
        searchScope: row.searchScope,
        evidenceId: `${row.artifactKind}/${row.claimClass}`,
      });
    }
  }
  const wiredStages = [
    ...new Set(
      allPolicies.filter((policy) => policy.mode === "enforcement").map((policy) => policy.stageSlug),
    ),
  ].sort();
  const policies = allPolicies.filter((policy) => wiredStages.includes(policy.stageSlug));
  policies.sort(
    (left, right) =>
      left.stageSlug.localeCompare(right.stageSlug) ||
      left.recordRelativeOutputPattern.localeCompare(right.recordRelativeOutputPattern) ||
      left.claimClass.localeCompare(right.claimClass),
  );
  const authoritySweepDigest = createHash("sha256")
    .update(canonicalJson({ snapshot: deps.indexInput.snapshot, descriptors, samples, evidence, policies, wiredStages }))
    .digest("hex");
  return {
    snapshot: deps.indexInput.snapshot,
    artifactIndex: { input: deps.indexInput, output: { descriptors } },
    samples,
    evidence,
    mapping: {
      authoritySweepDigest,
      mechanicalExclusionRevision: "fr-pred-v1",
      policies,
      wiredStages,
    },
  };
}

export const NUMERIC_PROVENANCE_CUTOFF_YYMMDD = 260810;

const AUTHORITY_PATH =
  "amadeus/spaces/default/intents/260810-numeric-provenance-guard/construction/numeric-provenance-sensor-cli/measurements/numeric-provenance-corpus-sweep.md";

export const GENERATED_NUMERIC_PROVENANCE_MAPPING: NumericProvenanceMapping = Object.freeze({
  schemaRevision: 1,
  predicateRevision: "fr-pred-v1",
  authorityPath: AUTHORITY_PATH,
  authorityDigest: "49dc7da5c90f1ed243df5695330b92afcf3afd4bdd56f8af7235797825e52e35",
  cutoffYymmdd: NUMERIC_PROVENANCE_CUTOFF_YYMMDD,
  policies: Object.freeze(
    [
      ...(["count", "measured-value", "percentage", "ratio"] as const).map((claimClass) => ({
        stageSlug: "code-generation",
        recordRelativeOutputPattern: "construction/*/code-generation/code-generation-plan.md",
        producesKey: "code-generation-plan",
        claimClass,
        mode: "measurement-only" as const,
        searchScope: { kind: "full-structural-region" as const },
        evidenceId: `code-generation-plan/${claimClass}`,
      })),
      ...(["count", "measured-value", "percentage", "ratio"] as const).map((claimClass) => ({
        stageSlug: "code-generation",
        recordRelativeOutputPattern: "construction/*/code-generation/code-summary.md",
        producesKey: "code-summary",
        claimClass,
        mode: claimClass === "count" ? ("enforcement" as const) : ("measurement-only" as const),
        searchScope:
          claimClass === "count"
            ? ({ kind: "bounded" as const, window: 1 })
            : ({ kind: "full-structural-region" as const }),
        evidenceId: `code-summary/${claimClass}`,
      })),
      ...(["count", "measured-value"] as const).map((claimClass) => ({
        stageSlug: "code-generation",
        recordRelativeOutputPattern: "construction/*/code-generation/pr-convergence-report.md",
        producesKey: "pr-convergence-report",
        claimClass,
        mode: "measurement-only" as const,
        searchScope: { kind: "full-structural-region" as const },
        evidenceId: `pr-convergence-report/${claimClass}`,
      })),
    ].map((policy) => Object.freeze(policy)),
  ),
  wiredStages: Object.freeze(["code-generation"]),
});

export function validateGeneratedMapping(mapping: NumericProvenanceMapping): void {
  if (mapping.schemaRevision !== 1) throw new Error("numeric-provenance-mapping-schema-mismatch");
  if (mapping.predicateRevision !== "fr-pred-v1") throw new Error("numeric-provenance-predicate-revision-mismatch");
  if (!/^[0-9a-f]{64}$/.test(mapping.authorityDigest)) throw new Error("numeric-provenance-authority-digest-invalid");
  if (!Number.isSafeInteger(mapping.cutoffYymmdd) || mapping.cutoffYymmdd < 0) {
    throw new Error("numeric-provenance-cutoff-invalid");
  }
  if (mapping.policies.length === 0) throw new Error("numeric-provenance-policies-empty");
  const keys = new Set<string>();
  for (const policy of mapping.policies) {
    const key = [
      policy.stageSlug,
      policy.recordRelativeOutputPattern,
      policy.producesKey,
      policy.claimClass,
    ].join("\0");
    if (keys.has(key)) throw new Error("numeric-provenance-policy-conflict");
    keys.add(key);
    if (policy.searchScope.kind === "bounded" && (!Number.isSafeInteger(policy.searchScope.window) || policy.searchScope.window < 0)) {
      throw new Error("numeric-provenance-window-invalid");
    }
  }
  const expectedStages = [
    ...new Set(mapping.policies.filter((policy) => policy.mode === "enforcement").map((policy) => policy.stageSlug)),
  ].sort();
  if (JSON.stringify([...mapping.wiredStages].sort()) !== JSON.stringify(expectedStages)) {
    throw new Error("numeric-provenance-wired-stages-mismatch");
  }
}

const LIGHTWEIGHT_BASENAMES = new Set([
  "status.md",
  "progress.md",
  "completion.md",
  "receipt.md",
  "run-status.md",
  "deployment-status.md",
]);
const LIGHTWEIGHT_PRODUCES = new Set(["status", "progress", "completion", "receipt"]);
const EXPECTED_PROVENANCE = ["command-token", "measurement-reference", "hex-sha", "relative-link"] as const;

interface ArtifactContext {
  readonly recordDate: number;
  readonly recordRelativePath: string;
  readonly basename: string;
  readonly stageSlug: string;
}

type ArtifactClassification =
  | { readonly kind: "skipped"; readonly reason: string }
  | { readonly kind: "applicable"; readonly policies: ReadonlyMap<NumericClaimClass, NumericProvenancePolicy> };

function artifactContext(input: EvaluationInput): ArtifactContext | undefined {
  const normalized = input.outputPath.replace(/\\/g, "/");
  const match = normalized.match(/(?:^|\/)amadeus\/spaces\/[^/]+\/intents\/([^/]+)\/(.+)$/);
  if (!match) return undefined;
  const dateText = match[1]!.slice(0, 6);
  if (!/^\d{6}$/.test(dateText)) return undefined;
  const recordRelativePath = match[2]!;
  return {
    recordDate: Number(dateText),
    recordRelativePath,
    basename: recordRelativePath.split("/").at(-1) ?? "",
    stageSlug: input.stage.trim(),
  };
}

function mechanicallyExcluded(context: ArtifactContext): string | undefined {
  if (context.basename.endsWith("-questions.md")) return "excluded";
  if (context.basename === "memory.md") return "excluded";
  if (context.recordRelativePath === "amadeus-state.md") return "excluded";
  if (context.recordRelativePath.startsWith("verification/") || context.recordRelativePath.startsWith("audit/")) {
    return "excluded";
  }
  if (/(^|[-_])(ack|acknowledgement)([-_.]|$)/i.test(context.basename)) return "excluded";
  if (LIGHTWEIGHT_BASENAMES.has(context.basename)) return "lightweight-report";
  return undefined;
}

export function classifyArtifact(
  context: ArtifactContext,
  mapping: NumericProvenanceMapping,
): ArtifactClassification {
  const rows = mapping.policies.filter(
    (policy) =>
      policy.stageSlug === context.stageSlug &&
      matchesOutputPattern(policy.recordRelativeOutputPattern, context.recordRelativePath),
  );
  if (rows.length === 0) return { kind: "skipped", reason: "unmapped-artifact" };
  if (rows.some((row) => LIGHTWEIGHT_PRODUCES.has(row.producesKey))) {
    return { kind: "skipped", reason: "lightweight-report" };
  }
  return {
    kind: "applicable",
    policies: new Map(rows.map((row) => [row.claimClass, row])),
  };
}

function skipped(reason: string): NumericProvenanceVerdict {
  return {
    pass: true,
    skipped: true,
    findings_count: 0,
    findings: [],
    metrics: {},
    reason,
  };
}

const NUMBER = "[0-9]+(?:[.,][0-9]+)*";
const COUNT = new RegExp(
  String.raw`\b${NUMBER}[ \t]*(?:件|個|本|行|ファイル|files?|items?|lines?|tests?)(?![A-Za-z])`,
  "gi",
);
const RATIO = new RegExp(String.raw`\b${NUMBER}[ \t]*\/[ \t]*${NUMBER}[ \t]*(?:PASS|FAIL)\b`, "gi");
const PERCENTAGE = new RegExp(String.raw`\b${NUMBER}[ \t]*%`, "g");
const MEASURED_VALUE = new RegExp(String.raw`(?:実測|計測|measured|observed)[^\r\n]{0,40}?\b${NUMBER}\b`, "gi");
const MASKS = [
  /\b\d{4}-\d{2}-\d{2}(?:T[^\s]*)?/g,
  /\b(?:Issue[ \t]*#?|FR[- ]|id[:#-]?)[0-9]+(?:-[A-Z0-9]+)*/gi,
  /\b[0-9a-f]{7,40}\b/gi,
  /\bv?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?\b/g,
] as const;

function maskedLine(line: string): string {
  const withoutHeadingNumber = line.replace(/^(\s{0,3}#{1,6}[ \t]+)\d+(?:\.\d+)*(?:[.)])?[ \t]*/, "$1");
  return MASKS.reduce((value, pattern) => value.replace(pattern, (match) => " ".repeat(match.length)), withoutHeadingNumber);
}

function claimsOfLine(
  line: string,
  pattern: RegExp,
  claimClass: NumericClaimClass,
  lineNumber: number,
  regionId: number,
  logicalLine: number,
): NumericClaim[] {
  pattern.lastIndex = 0;
  return Array.from(line.matchAll(pattern), (match) => ({
    claimClass,
    line: lineNumber,
    column: (match.index ?? 0) + 1,
    normalizedText: match[0].trim().replace(/[ \t]+/g, " "),
    regionId,
    logicalLine,
  }));
}

interface IndexedLine {
  readonly raw: string;
  readonly line: number;
  readonly regionId: number;
  readonly logicalLine: number;
}

interface MarkdownIndex {
  readonly lines: readonly IndexedLine[];
  readonly claims: readonly NumericClaim[];
}

function indexMarkdown(markdown: string): MarkdownIndex {
  const claims: NumericClaim[] = [];
  const lines: IndexedLine[] = [];
  let fence: "`" | "~" | undefined;
  let regionId = 0;
  let logicalLine = 0;
  let previousWasContent = false;

  for (const [index, rawLine] of markdown.split(/\r?\n/).entries()) {
    const fenceMatch = rawLine.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1]![0] as "`" | "~";
      fence = fence === marker ? undefined : (fence ?? marker);
      previousWasContent = false;
      continue;
    }
    if (fence !== undefined) continue;
    if (rawLine.trim() === "" || /^\s{0,3}#{1,6}[ \t]/.test(rawLine)) {
      previousWasContent = false;
      continue;
    }
    const isTable = /^\s*\|/.test(rawLine);
    const isListStart = /^\s*(?:[-+*]|\d+[.)])[ \t]+/.test(rawLine);
    if (!previousWasContent || isTable || isListStart) {
      regionId += 1;
      logicalLine = 0;
    } else {
      logicalLine += 1;
    }
    previousWasContent = !isTable;

    lines.push({ raw: rawLine, line: index + 1, regionId, logicalLine });

    const line = maskedLine(rawLine);
    claims.push(
      ...claimsOfLine(line, COUNT, "count", index + 1, regionId, logicalLine),
      ...claimsOfLine(line, RATIO, "ratio", index + 1, regionId, logicalLine),
      ...claimsOfLine(line, PERCENTAGE, "percentage", index + 1, regionId, logicalLine),
      ...claimsOfLine(line, MEASURED_VALUE, "measured-value", index + 1, regionId, logicalLine),
    );
  }

  return {
    lines,
    claims: claims.sort(
      (left, right) =>
        left.line - right.line ||
        left.column - right.column ||
        left.claimClass.localeCompare(right.claimClass),
    ),
  };
}

/** Scans only the four claim classes fixed by FR-PRED-1. */
export function scanNumericClaims(markdown: string): readonly NumericClaim[] {
  return indexMarkdown(markdown).claims;
}

const COMMAND_TOKENS = ["git", "grep", "rg", "wc", "find", "ls", "jq", "gh", "bun"] as const;
const COMMAND_TOKEN = new RegExp(String.raw`(?:^|[\s/])(${COMMAND_TOKENS.join("|")})(?=$|[\s])`, "i");
const MEASUREMENT_REFERENCE = /測定 ref|measurement ref|observed at|\bHEAD\b|origin\/main/gi;
const HEX_SHA = /\b[0-9a-f]{7,40}\b/gi;
const MARKDOWN_LINK = /\[[^\]\r\n]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const KIND_ORDER: readonly ProvenanceKind[] = [
  "command-token",
  "measurement-reference",
  "hex-sha",
  "relative-link",
];

function isWithin(path: string, root: string): boolean {
  return path === root || path.startsWith(`${root}/`);
}

function acceptedRelativeLink(outputPath: string, rawTarget: string, deps: EvaluationDeps): string | undefined {
  const withoutFragment = rawTarget.split("#", 1)[0]!;
  if (withoutFragment === "" || /^(?:[A-Za-z][A-Za-z0-9+.-]*:|\/\/|\/)/.test(withoutFragment)) {
    return undefined;
  }
  const output = outputPath.replace(/\\/g, "/");
  const segments = output.split("/");
  const amadeusIndex = segments.lastIndexOf("amadeus");
  if (amadeusIndex < 0) return undefined;
  const repositoryPrefix = segments.slice(0, amadeusIndex).join("/") || "/";
  const resolved = normalizePosixPath(`${output.slice(0, output.lastIndexOf("/"))}/${withoutFragment}`);
  const repositoryRoot = repositoryPrefix === "/" ? "/" : repositoryPrefix;
  if (!isWithin(resolved, repositoryRoot)) return undefined;

  const marker = "/amadeus/spaces/";
  const markerIndex = output.indexOf(marker);
  if (markerIndex < 0) return undefined;
  const workspacePrefix = output.slice(0, markerIndex);
  const afterMarker = output.slice(markerIndex + marker.length);
  const [space] = afterMarker.split("/");
  const intentMarker = `/amadeus/spaces/${space}/intents/`;
  const intentIndex = output.indexOf(intentMarker);
  if (intentIndex < 0) return undefined;
  const intentTail = output.slice(intentIndex + intentMarker.length);
  const intentRecord = intentTail.split("/", 1)[0]!;
  const recordRoot = `${workspacePrefix}${intentMarker}${intentRecord}`;
  const recordRelative = isWithin(resolved, recordRoot) ? resolved.slice(recordRoot.length + 1) : undefined;
  const basename = resolved.split("/").at(-1) ?? "";
  const allowedRecord =
    recordRelative !== undefined &&
    (recordRelative.startsWith("verification/") ||
      /^construction\/.+\/(?:measurements|verification)\//.test(recordRelative) ||
      /-(?:measurement|measurements|sweep|benchmark|test-results)\.(?:md|json)$/i.test(basename));
  const codekbRoot = `${workspacePrefix}/amadeus/spaces/${space}/codekb/`;
  const allowedCodekb =
    isWithin(resolved, codekbRoot.slice(0, -1)) &&
    /^.+\/re-scans\/[^/]+\.md$/.test(resolved.slice(codekbRoot.length));
  if (!allowedRecord && !allowedCodekb) return undefined;
  if (!deps.fileExists(resolved) || !deps.isRegularFile(resolved)) return undefined;
  return resolved;
}

function normalizePosixPath(path: string): string {
  const absolute = path.startsWith("/");
  const stack: string[] = [];
  for (const part of path.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (stack.length === 0) return absolute ? "/../" : "../";
      stack.pop();
    } else {
      stack.push(part);
    }
  }
  return `${absolute ? "/" : ""}${stack.join("/")}`;
}

function candidatesOnLine(line: IndexedLine, outputPath: string, deps: EvaluationDeps): ProvenanceMatch[] {
  const candidates: ProvenanceMatch[] = [];
  for (const code of line.raw.matchAll(/`([^`\r\n]+)`/g)) {
    const token = code[1]!.match(COMMAND_TOKEN);
    if (token) {
      candidates.push({
        kind: "command-token",
        evidence: token[1]!.toLowerCase(),
        distance: 0,
        line: line.line,
        column: (code.index ?? 0) + 1,
      });
    }
  }
  MEASUREMENT_REFERENCE.lastIndex = 0;
  for (const match of line.raw.matchAll(MEASUREMENT_REFERENCE)) {
    candidates.push({
      kind: "measurement-reference",
      evidence: match[0],
      distance: 0,
      line: line.line,
      column: (match.index ?? 0) + 1,
    });
  }
  HEX_SHA.lastIndex = 0;
  for (const match of line.raw.matchAll(HEX_SHA)) {
    candidates.push({
      kind: "hex-sha",
      evidence: match[0].toLowerCase(),
      distance: 0,
      line: line.line,
      column: (match.index ?? 0) + 1,
    });
  }
  MARKDOWN_LINK.lastIndex = 0;
  for (const match of line.raw.matchAll(MARKDOWN_LINK)) {
    const resolved = acceptedRelativeLink(outputPath, match[1]!, deps);
    if (resolved) {
      candidates.push({
        kind: "relative-link",
        evidence: resolved,
        distance: 0,
        line: line.line,
        column: (match.index ?? 0) + 1,
      });
    }
  }
  return candidates;
}

function nearestFromIndex(
  claim: NumericClaim,
  index: MarkdownIndex,
  outputPath: string,
  deps: EvaluationDeps,
): ProvenanceMatch | undefined {
  const matches: ProvenanceMatch[] = [];
  for (const line of index.lines) {
    if (line.regionId !== claim.regionId) continue;
    for (const candidate of candidatesOnLine(line, outputPath, deps)) {
      matches.push({ ...candidate, distance: Math.abs(line.logicalLine - claim.logicalLine) });
    }
  }
  return matches.sort(
    (left, right) =>
      left.distance - right.distance ||
      left.line - right.line ||
      left.column - right.column ||
      KIND_ORDER.indexOf(left.kind) - KIND_ORDER.indexOf(right.kind),
  )[0];
}

export function measureNearestProvenanceDistance(
  claim: NumericClaim,
  context: ProvenanceContext,
  deps: EvaluationDeps,
): ProvenanceMatch | undefined {
  return nearestFromIndex(claim, indexMarkdown(context.markdown), context.outputPath, deps);
}

export function resolveProvenance(
  claim: NumericClaim,
  context: ProvenanceContext,
  deps: EvaluationDeps,
  searchScope: NumericProvenanceSearchScope,
): ProvenanceMatch | undefined {
  const nearest = measureNearestProvenanceDistance(claim, context, deps);
  if (!nearest) return undefined;
  if (searchScope.kind === "bounded" && nearest.distance > searchScope.window) return undefined;
  return nearest;
}

export function evaluateNumericProvenance(
  input: EvaluationInput,
  deps: EvaluationDeps,
): NumericProvenanceVerdict {
  if (input.content.kind === "missing") return skipped("file-not-found");
  if (input.content.kind === "unavailable") return skipped("not-applicable");
  const context = artifactContext(input);
  if (!context || context.stageSlug === "") return skipped("not-applicable");
  if (context.recordDate < GENERATED_NUMERIC_PROVENANCE_MAPPING.cutoffYymmdd) return skipped("pre-cutoff");
  const exclusion = mechanicallyExcluded(context);
  if (exclusion) return skipped(exclusion);
  const classification = classifyArtifact(context, GENERATED_NUMERIC_PROVENANCE_MAPPING);
  if (classification.kind === "skipped") return skipped(classification.reason);

  const markdownIndex = indexMarkdown(input.content.markdown);
  const claims = markdownIndex.claims;
  const lineCount = input.content.markdown.split(/\r?\n/).length;
  if (claims.length === 0 && lineCount < 100) return skipped("not-applicable");

  const findings: NumericProvenanceFinding[] = [];
  const evaluationDeps = memoizedEvaluationDeps(deps);
  let enforcementCandidates = 0;
  let measurementCandidates = 0;
  let provenancedCount = 0;
  for (const claim of claims) {
    const policy = classification.policies.get(claim.claimClass);
    if (!policy) continue;
    const nearest = nearestFromIndex(claim, markdownIndex, input.outputPath, evaluationDeps);
    const provenance =
      nearest && (policy.searchScope.kind === "full-structural-region" || nearest.distance <= policy.searchScope.window)
        ? nearest
        : undefined;
    if (provenance) provenancedCount += 1;
    if (policy.mode === "enforcement") {
      enforcementCandidates += 1;
      if (!provenance) {
        findings.push({
          path: context.recordRelativePath,
          stage: context.stageSlug,
          claim_class: claim.claimClass,
          line: claim.line,
          column: claim.column,
          excerpt: claim.normalizedText,
          expected: EXPECTED_PROVENANCE,
        });
      }
    } else {
      measurementCandidates += 1;
    }
  }
  findings.sort(
    (left, right) =>
      left.path.localeCompare(right.path) ||
      left.line - right.line ||
      left.column - right.column ||
      left.claim_class.localeCompare(right.claim_class),
  );
  const candidateCount = enforcementCandidates + measurementCandidates;
  const metrics = {
    candidate_count: candidateCount,
    provenanced_count: provenancedCount,
    unprovenanced_count: candidateCount - provenancedCount,
    unprovenanced_rate: candidateCount === 0 ? 0 : (candidateCount - provenancedCount) / candidateCount,
    enforcement_candidates: enforcementCandidates,
    measurement_only_candidates: measurementCandidates,
  };
  return {
    pass: findings.length === 0,
    skipped: false,
    findings_count: findings.length,
    findings,
    metrics,
    reason: findings.length === 0 ? "evaluated" : "numeric-provenance-missing",
  };
}

interface Flags {
  stage?: string;
  outputPath?: string;
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--stage") {
      flags.stage = requireFlagValue(argv, ++index, "--stage", fail);
    } else if (argv[index] === "--output-path") {
      flags.outputPath = requireFlagValue(argv, ++index, "--output-path", fail);
    }
  }
  return flags;
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

function isContainedPath(candidate: string, root: string): boolean {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !rel.startsWith("/"));
}

function sameObject(
  left: Readonly<{ dev: number | bigint; ino: number | bigint }>,
  right: Readonly<{ dev: number | bigint; ino: number | bigint }>,
): boolean {
  return left.dev === right.dev && left.ino === right.ino;
}

function readArtifact(
  requestedPath: string,
  projectRoot: string,
): EvaluationInput["content"] {
  const root = realpathSync(projectRoot);
  const requested = resolve(root, requestedPath);
  if (!isContainedPath(requested, root)) return { kind: "unavailable", reason: "outside-root" };
  if (!existsSync(requested)) return { kind: "missing" };

  let descriptor: number | undefined;
  try {
    const canonical = realpathSync(requested);
    if (!isContainedPath(canonical, root)) return { kind: "unavailable", reason: "outside-root" };
    const before = statSync(canonical, { bigint: true });
    if (!before.isFile()) return { kind: "unavailable", reason: "not-regular-file" };
    const noFollow = fsConstants.O_NOFOLLOW as number | undefined;
    if (typeof noFollow !== "number") throw new Error("O_NOFOLLOW is unavailable");
    descriptor = openSync(canonical, fsConstants.O_RDONLY | noFollow);
    const opened = fstatSync(descriptor, { bigint: true });
    if (!opened.isFile() || !sameObject(before, opened)) {
      return { kind: "unavailable", reason: "path-race" };
    }
    const afterCanonical = realpathSync(requested);
    const after = statSync(afterCanonical, { bigint: true });
    if (!isContainedPath(afterCanonical, root) || !sameObject(opened, after)) {
      return { kind: "unavailable", reason: "path-race" };
    }
    return { kind: "present", markdown: readFileSync(descriptor, "utf8") };
  } catch (error) {
    if (errorCode(error) === "ENOENT") return { kind: "missing" };
    if (errorCode(error) === "ELOOP") return { kind: "unavailable", reason: "path-race" };
    throw error;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

function productionEvaluationDeps(projectRoot: string): EvaluationDeps {
  const canonicalRoot = realpathSync(projectRoot);
  const facts = new Map<string, { exists: boolean; regular: boolean }>();
  function fact(path: string): { exists: boolean; regular: boolean } {
    const cached = facts.get(path);
    if (cached) return cached;
    let result = { exists: false, regular: false };
    try {
      const lexical = resolve(projectRoot, path);
      const canonical = realpathSync(lexical);
      if (isContainedPath(lexical, canonicalRoot) && isContainedPath(canonical, canonicalRoot)) {
        const stat = statSync(canonical);
        result = { exists: true, regular: stat.isFile() };
      }
    } catch {
      // Rejected and missing provenance links are ordinary non-matches.
      facts.set(path, result);
      return result;
    }
    facts.set(path, result);
    return result;
  }
  return {
    fileExists: (path) => fact(path).exists,
    isRegularFile: (path) => fact(path).regular,
  };
}

export function fail(message: string): never {
  process.stderr.write(`amadeus-sensor-numeric-provenance: ${message}\n`);
  process.exit(1);
}

export function main(argv: string[] = process.argv.slice(2)): void {
  const flags = parseFlags(argv);
  if (!flags.stage) fail("--stage is required");
  if (!flags.outputPath) fail("--output-path is required");
  try {
    validateGeneratedMapping(GENERATED_NUMERIC_PROVENANCE_MAPPING);
    const projectRoot = process.cwd();
    const content = readArtifact(flags.outputPath, projectRoot);
    const verdict = evaluateNumericProvenance(
      { stage: flags.stage, outputPath: resolve(projectRoot, flags.outputPath), content },
      productionEvaluationDeps(projectRoot),
    );
    process.stdout.write(`${JSON.stringify(verdict)}\n`);
    process.exit(0);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

if (import.meta.main) main();
