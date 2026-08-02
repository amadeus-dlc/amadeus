import { createHash } from "node:crypto";

export const RULE_IDS = ["NSD001", "NSD002", "NSD003"] as const;
export type RuleId = (typeof RULE_IDS)[number];

export const INFRA_CODES = [
  "TOOL_MISSING",
  "RULE_INVALID",
  "BASELINE_MISSING",
  "BASELINE_INVALID",
  "SCAN_ROOT_MISSING",
  "SCAN_ZERO",
  "SCAN_INVALID_SYMLINK",
  "SOURCE_UNREADABLE",
  "SCAN_PARTIAL",
  "SOURCE_CHANGED_DURING_SCAN",
  "INTERNAL_ERROR",
] as const;
export type InfraCode = (typeof INFRA_CODES)[number];

export type Finding = {
  readonly ruleId: RuleId;
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly message: string;
  readonly snippet: string;
  readonly fingerprint: string;
};

export type GateResult =
  | {
      readonly schemaVersion: 1;
      readonly status: "pass";
      readonly code: "NO_SILENT_DROP_OK";
      readonly findings: readonly [];
      readonly evidence?: Evidence;
      readonly candidate?: BaselineDoc;
    }
  | {
      readonly schemaVersion: 1;
      readonly status: "violations";
      readonly code: "POLICY_VIOLATIONS";
      readonly findings: readonly [Finding, ...Finding[]];
    }
  | {
      readonly schemaVersion: 1;
      readonly status: "error";
      readonly code: InfraCode;
      readonly findings: readonly [];
      readonly detail: string;
    };

export type BaselineEntry = {
  readonly fingerprint: string;
  readonly ruleId: RuleId;
  readonly file: string;
  readonly reason: string;
  readonly issues: readonly string[];
};

export type BaselineDoc = {
  readonly schemaVersion: 1;
  readonly direction: "shrink-only";
  readonly generatedFrom: {
    readonly revision: string;
    readonly censusDigest: string;
    readonly approvalDigest: string;
  };
  readonly entries: readonly BaselineEntry[];
};

export type ExemptionDoc = {
  readonly schemaVersion: 1;
  readonly entries: readonly {
    readonly fingerprint: string;
    readonly reason: string;
  }[];
};

export type Evidence = {
  readonly schemaVersion: 1;
  readonly revision: string;
  readonly targetDigest: string;
  readonly censusDigest: string;
  readonly counts: {
    readonly C_pre: number;
    readonly B_pre: number;
    readonly B0: number;
  };
  readonly findings: readonly Finding[];
  readonly approvalDigest?: string;
};

export type ApprovalDoc = {
  readonly schemaVersion: 1;
  readonly censusDigest: string;
  readonly entries: readonly {
    readonly fingerprint: string;
    readonly classification: "TP" | "FP";
    readonly reason: string;
    readonly issues: readonly string[];
  }[];
};

export class InfraFailure extends Error {
  constructor(
    readonly code: InfraCode,
    message: string,
  ) {
    super(message);
    this.name = "InfraFailure";
  }
}

export function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeSnippet(snippet: string): string {
  return snippet.replace(/\s+/g, " ").trim();
}

export function findingFingerprint(
  ruleId: RuleId,
  file: string,
  snippet: string,
  ordinal: number,
): string {
  return digest(["no-silent-drop:v1", ruleId, file, normalizeSnippet(snippet), String(ordinal)].join("\0"));
}

export function passResult(extra: Pick<GateResult & { status: "pass" }, "evidence" | "candidate"> = {}): GateResult {
  return { schemaVersion: 1, status: "pass", code: "NO_SILENT_DROP_OK", findings: [], ...extra };
}

export function violationResult(findings: readonly Finding[]): GateResult {
  if (findings.length === 0) throw new Error("violationResult requires at least one finding");
  return {
    schemaVersion: 1,
    status: "violations",
    code: "POLICY_VIOLATIONS",
    findings: findings as [Finding, ...Finding[]],
  };
}

export function errorResult(code: InfraCode, detail: string): GateResult {
  return { schemaVersion: 1, status: "error", code, findings: [], detail };
}
