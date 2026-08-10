// covers: numeric-provenance-mapping-contract
// size: medium

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { REPO_ROOT } from "../harness/fixtures.ts";

type JsonObject = Record<string, unknown>;

const CONTRACT_ROOT = join(REPO_ROOT, "packages", "framework", "core", "amadeus-common", "contracts");
const SCHEMA_PATH = join(CONTRACT_ROOT, "numeric-provenance-mapping-contract.schema.json");
const FIXTURE_PATH = join(
  REPO_ROOT,
  "tests",
  "fixtures",
  "numeric-provenance-mapping-contract",
  "approved-mapping.fixture.json",
);

const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8")) as JsonObject;
const fixture = JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as JsonObject;

function object(value: unknown): JsonObject {
  expect(value).toBeObject();
  return value as JsonObject;
}

function array(value: unknown): unknown[] {
  expect(value).toBeArray();
  return value as unknown[];
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function sampleIdentity(relativePath: string, line: number, normalizedText: string): string {
  return sha256(JSON.stringify([relativePath, line, normalizedText]));
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const record = value as JsonObject;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function matchesType(value: unknown, expected: unknown): boolean {
  if (expected === "object") return typeof value === "object" && value !== null && !Array.isArray(value);
  if (expected === "array") return Array.isArray(value);
  if (expected === "integer") return Number.isInteger(value);
  if (expected === "null") return value === null;
  return typeof value === expected;
}

function validateReferenceOrUnion(
  value: unknown,
  rule: JsonObject,
  path: string,
  root: JsonObject,
): string[] | undefined {
  if (typeof rule.$ref === "string") {
    const name = rule.$ref.replace("#/$defs/", "");
    return validateSchema(value, object(root.$defs)[name], path, root);
  }
  if (Array.isArray(rule.oneOf)) {
    const variants = rule.oneOf.map((variant) => validateSchema(value, variant, path, root));
    return variants.filter((errors) => errors.length === 0).length === 1
      ? []
      : [`${path}: expected exactly one schema variant`];
  }
  return undefined;
}

function validateScalar(value: unknown, rule: JsonObject, path: string): string[] {
  const errors: string[] = [];
  if ("const" in rule && !sameJson(value, rule.const)) errors.push(`${path}: const mismatch`);
  if (Array.isArray(rule.enum) && !rule.enum.some((entry) => sameJson(value, entry))) {
    errors.push(`${path}: value is outside enum`);
  }
  if (typeof rule.type === "string" && !matchesType(value, rule.type)) {
    errors.push(`${path}: expected ${rule.type}`);
    return errors;
  }
  if (typeof value === "number" && typeof rule.minimum === "number" && value < rule.minimum) {
    errors.push(`${path}: smaller than minimum`);
  }
  return errors;
}

function validateString(value: unknown, rule: JsonObject, path: string): string[] {
  const errors: string[] = [];
  if (typeof value === "string") {
    if (typeof rule.minLength === "number" && value.length < rule.minLength) {
      errors.push(`${path}: shorter than minLength`);
    }
    if (typeof rule.pattern === "string" && !new RegExp(rule.pattern).test(value)) {
      errors.push(`${path}: pattern mismatch`);
    }
  }
  return errors;
}

function validateArray(value: unknown, rule: JsonObject, path: string, root: JsonObject): string[] {
  if (!Array.isArray(value)) return [];
  const errors: string[] = [];
  if (typeof rule.minItems === "number" && value.length < rule.minItems) errors.push(`${path}: too few items`);
  if (typeof rule.maxItems === "number" && value.length > rule.maxItems) errors.push(`${path}: too many items`);
  if (rule.items !== undefined) {
    for (const [index, item] of value.entries()) {
      errors.push(...validateSchema(item, rule.items, `${path}[${index}]`, root));
    }
  }
  return errors;
}

function validateRequired(record: JsonObject, rule: JsonObject, path: string): string[] {
  const errors: string[] = [];
  for (const required of Array.isArray(rule.required) ? rule.required : []) {
    if (typeof required === "string" && !(required in record)) errors.push(`${path}.${required}: required`);
  }
  return errors;
}

function validateObject(value: unknown, rule: JsonObject, path: string, root: JsonObject): string[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return [];
  const errors: string[] = [];
  const record = value as JsonObject;
  const properties = rule.properties === undefined ? {} : object(rule.properties);
  errors.push(...validateRequired(record, rule, path));
  if (rule.additionalProperties === false) {
    for (const key of Object.keys(record)) {
      if (!(key in properties)) errors.push(`${path}.${key}: additional property`);
    }
  }
  for (const [key, childRule] of Object.entries(properties)) {
    if (key in record) errors.push(...validateSchema(record[key], childRule, `${path}.${key}`, root));
  }
  return errors;
}

function validateSchema(value: unknown, rawRule: unknown, path = "$", root = schema): string[] {
  const rule = object(rawRule);
  const special = validateReferenceOrUnion(value, rule, path, root);
  if (special !== undefined) return special;
  const scalarErrors = validateScalar(value, rule, path);
  if (scalarErrors.some((error) => error.endsWith(`expected ${rule.type}`))) return scalarErrors;
  return [
    ...scalarErrors,
    ...validateString(value, rule, path),
    ...validateArray(value, rule, path, root),
    ...validateObject(value, rule, path, root),
  ];
}

function nearestRank(values: number[], percentile: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil((percentile / 100) * sorted.length) - 1]!;
}

function classification(values: number[]): { mode: string; window?: number; coverage?: string } {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const p95 = nearestRank(values, 95);
  const window = Math.max(p95, min + 1);
  if (min < max && window < max) {
    const covered = values.filter((value) => value <= window).length;
    return { mode: "enforcement", window, coverage: `${covered}/${values.length}` };
  }
  return { mode: "measurement-only" };
}

describe("numeric provenance mapping schema", () => {
  test("is a closed Draft 2020-12 contract with the fixed predicate vocabulary", () => {
    expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(schema.additionalProperties).toBe(false);
    const definitions = object(schema.$defs);
    const predicate = object(definitions.fixedPredicate);
    const properties = object(predicate.properties);

    expect(object(properties.claimClasses).const).toEqual([
      "count",
      "ratio",
      "percentage",
      "measured-value",
    ]);
    expect(object(properties.provenanceKinds).const).toEqual([
      "command-token",
      "measurement-reference",
      "hex-sha",
      "relative-link",
    ]);
    expect(object(properties.structuralRegions).const).toEqual([
      "paragraph",
      "list-item",
      "table-row",
    ]);
    expect(object(properties.commandTokens).const).toEqual([
      "git",
      "grep",
      "rg",
      "wc",
      "find",
      "ls",
      "jq",
      "gh",
      "bun",
    ]);
    expect(object(properties.sampleIdentityExpression).const).toBe(
      "sha256(utf8(JSON.stringify([relativePath,line,normalizedText])))",
    );
  });

  test("defines mapping-independent index input/output discriminators", () => {
    const definitions = object(schema.$defs);
    const descriptor = object(definitions.artifactDescriptor);
    const variants = array(descriptor.oneOf).map(object);
    expect(variants).toHaveLength(2);
    const declaredSource = object(object(variants[0]!.properties).source);
    const codekbSource = object(object(variants[1]!.properties).source);
    expect(declaredSource.const).toBe("declared-artifact");
    expect(codekbSource.const).toBe("codekb-re-scan");

    const indexContract = object(definitions.designTimeArtifactIndexContract);
    expect(indexContract.required).toEqual(["input", "output"]);
    const indexProperties = object(indexContract.properties);
    expect(object(indexProperties.input).$ref).toBe("#/$defs/designTimeArtifactIndexInput");
    expect(object(indexProperties.output).$ref).toBe("#/$defs/designTimeArtifactIndexOutput");
  });
});

describe("approved mapping fixture", () => {
  test("conforms to the closed schema and rejects incomplete or widened variants", () => {
    expect(validateSchema(fixture, schema)).toEqual([]);

    const missingReason = structuredClone(fixture);
    delete object(array(object(missingReason.approvedSampleSet).samples)[0]).reason;
    expect(validateSchema(missingReason, schema).some((error) => error.includes("reason: required"))).toBe(true);

    const widenedCodekb = structuredClone(fixture);
    object(array(object(object(widenedCodekb.artifactIndexContract).output).descriptors)[1]).stageSlug = "guessed";
    expect(validateSchema(widenedCodekb, schema).some((error) => error.includes("schema variant"))).toBe(true);

    const staleApproval = structuredClone(fixture);
    object(staleApproval.approval).schemaRevision = 2;
    expect(validateSchema(staleApproval, schema).some((error) => error.includes("const mismatch"))).toBe(true);
  });

  test("contains only declared/indexed descriptors and keeps codekb scan-only", () => {
    const indexContract = object(fixture.artifactIndexContract);
    const output = object(indexContract.output);
    const descriptors = array(output.descriptors).map(object);
    expect(descriptors).toHaveLength(2);

    expect(descriptors[0]).toMatchObject({
      source: "declared-artifact",
      stageSlug: "requirements-analysis",
      producesKey: "requirements",
      artifactKind: "requirements",
      eligibility: "candidate",
    });
    expect(descriptors[1]).toMatchObject({
      source: "codekb-re-scan",
      artifactKind: "codekb-re-scan",
      eligibility: "scan-only",
    });
    expect(descriptors[1]).not.toHaveProperty("stageSlug");
    expect(descriptors[1]).not.toHaveProperty("producesKey");
  });

  test("pins thirty complete binary labels with deterministic unique identities", () => {
    const sampleSet = object(fixture.approvedSampleSet);
    const samples = array(sampleSet.samples).map(object);
    expect(samples).toHaveLength(30);

    const identities = new Set<string>();
    for (const sample of samples) {
      expect(typeof sample.meaningfulNumericClaim).toBe("boolean");
      expect(typeof sample.validProvenanceNotMissed).toBe("boolean");
      expect(sample.labelerRole).toBe("amadeus-quality-agent");
      expect(String(sample.reason).trim().length).toBeGreaterThan(0);
      const expected = sampleIdentity(String(sample.relativePath), Number(sample.line), String(sample.normalizedText));
      expect(sample.identity).toBe(expected);
      identities.add(expected);
    }
    expect(identities).toHaveLength(30);
    expect(samples.filter((sample) => !sample.meaningfulNumericClaim || !sample.validProvenanceNotMissed)).toHaveLength(
      0,
    );
    expect(samples.flatMap((sample) => (typeof sample.provenanceDistance === "number" ? [sample.provenanceDistance] : [])))
      .toEqual(array(object(array(fixture.classificationCases)[0]).distances) as number[]);
  });

  test("uses an unambiguous canonical JSON tuple for sample identity", () => {
    const relativePath = "amadeus/spaces/default/intents/fixture/requirements.md";
    const first = { line: 5, normalizedText: "10件" };
    const second = { line: 51, normalizedText: "0件" };

    expect(`${relativePath}${first.line}${first.normalizedText}`).toBe(
      `${relativePath}${second.line}${second.normalizedText}`,
    );
    expect(JSON.stringify([relativePath, first.line, first.normalizedText])).toBe(
      '["amadeus/spaces/default/intents/fixture/requirements.md",5,"10件"]',
    );
    expect(JSON.stringify([relativePath, second.line, second.normalizedText])).toBe(
      '["amadeus/spaces/default/intents/fixture/requirements.md",51,"0件"]',
    );
    expect(sampleIdentity(relativePath, first.line, first.normalizedText)).not.toBe(
      sampleIdentity(relativePath, second.line, second.normalizedText),
    );
  });

  test("derives the lower-bound window and rejects upper-bound saturation", () => {
    const cases = array(fixture.classificationCases).map(object);
    const lower = cases.find((entry) => entry.id === "lower-bound-saturation")!;
    const upper = cases.find((entry) => entry.id === "upper-bound-saturation")!;

    expect(classification(array(lower.distances) as number[])).toEqual({
      mode: "enforcement",
      window: 1,
      coverage: "19/20",
    });
    expect(lower.expected).toEqual({
      mode: "enforcement",
      searchScope: { kind: "bounded", window: 1 },
      statistics: { count: 20, min: 0, median: 0, p95: 0, max: 2 },
      coverage: { numerator: 19, denominator: 20 },
      downgradeReasons: [],
    });

    expect(classification(array(upper.distances) as number[])).toEqual({
      mode: "measurement-only",
    });
    expect(upper.expected).toMatchObject({
      mode: "measurement-only",
      searchScope: { kind: "full-structural-region" },
      downgradeReasons: ["upper-bound-saturation"],
    });
  });

  test("maps stage plus record-relative pattern to produces key without scan-only projection", () => {
    const mapping = object(fixture.mapping);
    const policies = array(mapping.policies).map(object);
    expect(policies).toHaveLength(1);
    expect(policies[0]).toMatchObject({
      stageSlug: "requirements-analysis",
      recordRelativeOutputPattern: "inception/requirements-analysis/requirements.md",
      producesKey: "requirements",
      claimClass: "count",
      mode: "enforcement",
      searchScope: { kind: "bounded", window: 1 },
    });
    expect(policies.some((policy) => policy.producesKey === "codekb-re-scan")).toBe(false);
    expect(mapping.wiredStages).toEqual(["requirements-analysis"]);
  });

  test("binds READY approval to schema, snapshot, mapping, recomputation and role", () => {
    const approval = object(fixture.approval);
    expect(approval).toMatchObject({
      schemaRevision: 1,
      approverRole: "amadeus-quality-agent",
      verdict: "READY",
    });
    for (const key of [
      "snapshotDigest",
      "mappingDigest",
      "recomputationDigest",
      "approvalReceiptDigest",
    ]) {
      expect(approval[key]).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(approval.recomputationDigest).toBe(approval.mappingDigest);
    const authorityPayload = {
      schemaRevision: fixture.schemaRevision,
      predicateRevision: fixture.predicateRevision,
      artifactIndexContract: fixture.artifactIndexContract,
      approvedSampleSet: fixture.approvedSampleSet,
      classificationCases: fixture.classificationCases,
    };
    expect(object(fixture.mapping).authoritySweepDigest).toBe(sha256(canonicalJson(authorityPayload)));
    expect(approval.snapshotDigest).toBe(
      sha256(canonicalJson(object(object(fixture.artifactIndexContract).input).snapshot)),
    );
    expect(approval.mappingDigest).toBe(sha256(canonicalJson(fixture.mapping)));
    const approvalPayload = {
      schemaRevision: approval.schemaRevision,
      snapshotDigest: approval.snapshotDigest,
      mappingDigest: approval.mappingDigest,
      recomputationDigest: approval.recomputationDigest,
      approverRole: approval.approverRole,
      verdict: approval.verdict,
    };
    expect(approval.approvalReceiptDigest).toBe(sha256(canonicalJson(approvalPayload)));
    expect(JSON.stringify(fixture)).not.toMatch(/(?:^|["'])\/(?:Users|home)\//);
  });
});
