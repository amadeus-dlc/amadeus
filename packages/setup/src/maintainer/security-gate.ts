import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type DependencyFinding = {
  id: string;
  scanner: string;
  packageName: string;
  advisoryId: string;
  affectedRange: string;
  severity: "low" | "medium" | "high" | "critical";
  reachable?: boolean;
  surface: "installer-runtime" | "publish-tooling" | "dev-only" | "unknown";
  fingerprint: string;
  url?: string;
};

export type DependencyFindingsFile = {
  schemaVersion: 1;
  scanner: string;
  generatedAt: string;
  findings: DependencyFinding[];
};

export type SecretFinding = {
  id: string;
  scanner: string;
  verified: boolean;
  fingerprint: string;
  path: string;
  line: number;
  ruleId: string;
};

export type SecretFindingsFile = {
  schemaVersion: 1;
  scanner: string;
  generatedAt: string;
  findings: SecretFinding[];
};

export type VulnerabilityAllowlistEntry = {
  advisoryId: string;
  packageName: string;
  affectedRange: string;
  reason: string;
  owner: string;
  expiresAt: string;
};

export type VulnerabilityAllowlistFile = {
  schemaVersion: 1;
  entries: VulnerabilityAllowlistEntry[];
};

export type SecurityGateResult = {
  ok: boolean;
  mode: "audit" | "secrets";
  blockingFindings: string[];
  exceptions: string[];
  reportOnly: string[];
  invalidSchema?: string[];
};

const SEVERITIES = new Set(["low", "medium", "high", "critical"]);
const SURFACES = new Set(["installer-runtime", "publish-tooling", "dev-only", "unknown"]);

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isExpired(expiresAt: string, now = new Date()): boolean {
  const expiry = new Date(`${expiresAt}T23:59:59.999Z`);
  return now.getTime() > expiry.getTime();
}

function validateDependencyFindings(raw: unknown): { ok: true; file: DependencyFindingsFile } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object") {
    return { ok: false, errors: ["findings root must be an object"] };
  }
  const file = raw as Partial<DependencyFindingsFile>;
  if (file.schemaVersion !== 1) {
    errors.push("schemaVersion must be 1");
  }
  if (!file.scanner || typeof file.scanner !== "string") {
    errors.push("scanner must be a non-empty string");
  }
  if (!file.generatedAt || typeof file.generatedAt !== "string") {
    errors.push("generatedAt must be a non-empty string");
  }
  if (!Array.isArray(file.findings)) {
    errors.push("findings must be an array");
    return { ok: false, errors };
  }
  for (const [index, finding] of file.findings.entries()) {
    const prefix = `findings[${index}]`;
    if (!finding || typeof finding !== "object") {
      errors.push(`${prefix} must be an object`);
      continue;
    }
    for (const field of ["id", "scanner", "packageName", "advisoryId", "affectedRange", "severity", "surface", "fingerprint"] as const) {
      if (!finding[field] || typeof finding[field] !== "string") {
        errors.push(`${prefix}.${field} must be a non-empty string`);
      }
    }
    if (finding.severity && !SEVERITIES.has(finding.severity)) {
      errors.push(`${prefix}.severity must be low|medium|high|critical`);
    }
    if (finding.surface && !SURFACES.has(finding.surface)) {
      errors.push(`${prefix}.surface must be installer-runtime|publish-tooling|dev-only|unknown`);
    }
    if (finding.reachable !== undefined && typeof finding.reachable !== "boolean") {
      errors.push(`${prefix}.reachable must be boolean when present`);
    }
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, file: file as DependencyFindingsFile };
}

function validateSecretFindings(raw: unknown): { ok: true; file: SecretFindingsFile } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object") {
    return { ok: false, errors: ["findings root must be an object"] };
  }
  const file = raw as Partial<SecretFindingsFile>;
  if (file.schemaVersion !== 1) {
    errors.push("schemaVersion must be 1");
  }
  if (!file.scanner || typeof file.scanner !== "string") {
    errors.push("scanner must be a non-empty string");
  }
  if (!file.generatedAt || typeof file.generatedAt !== "string") {
    errors.push("generatedAt must be a non-empty string");
  }
  if (!Array.isArray(file.findings)) {
    errors.push("findings must be an array");
    return { ok: false, errors };
  }
  for (const [index, finding] of file.findings.entries()) {
    const prefix = `findings[${index}]`;
    if (!finding || typeof finding !== "object") {
      errors.push(`${prefix} must be an object`);
      continue;
    }
    for (const field of ["id", "scanner", "fingerprint", "path", "ruleId"] as const) {
      if (!finding[field] || typeof finding[field] !== "string") {
        errors.push(`${prefix}.${field} must be a non-empty string`);
      }
    }
    if (typeof finding.verified !== "boolean") {
      errors.push(`${prefix}.verified must be boolean`);
    }
    if (!Number.isInteger(finding.line) || (finding.line ?? 0) < 1) {
      errors.push(`${prefix}.line must be an integer >= 1`);
    }
    if (finding.path?.startsWith("/")) {
      errors.push(`${prefix}.path must be repo-relative`);
    }
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, file: file as SecretFindingsFile };
}

function validateAllowlist(raw: unknown): { ok: true; file: VulnerabilityAllowlistFile } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object") {
    return { ok: false, errors: ["allowlist root must be an object"] };
  }
  const file = raw as Partial<VulnerabilityAllowlistFile>;
  if (file.schemaVersion !== 1) {
    errors.push("schemaVersion must be 1");
  }
  if (!Array.isArray(file.entries)) {
    errors.push("entries must be an array");
    return { ok: false, errors };
  }
  for (const [index, entry] of file.entries.entries()) {
    const prefix = `entries[${index}]`;
    for (const field of ["advisoryId", "packageName", "affectedRange", "reason", "owner", "expiresAt"] as const) {
      if (!entry?.[field] || typeof entry[field] !== "string") {
        errors.push(`${prefix}.${field} must be a non-empty string`);
      }
    }
    if (entry?.expiresAt && !isIsoDate(entry.expiresAt)) {
      errors.push(`${prefix}.expiresAt must be YYYY-MM-DD`);
    }
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, file: file as VulnerabilityAllowlistFile };
}

function isBlockingDependencyFinding(finding: DependencyFinding): boolean {
  if (finding.severity !== "high" && finding.severity !== "critical") {
    return false;
  }
  if (finding.surface === "dev-only") {
    return false;
  }
  return finding.reachable === true || finding.surface === "installer-runtime" || finding.surface === "publish-tooling" || finding.surface === "unknown";
}

function matchesAllowlist(finding: DependencyFinding, entry: VulnerabilityAllowlistEntry): boolean {
  return (
    entry.advisoryId === finding.advisoryId &&
    entry.packageName === finding.packageName &&
    entry.affectedRange === finding.affectedRange &&
    entry.reason.trim().length > 0 &&
    entry.owner.trim().length > 0 &&
    isIsoDate(entry.expiresAt) &&
    !isExpired(entry.expiresAt)
  );
}

export function runDependencyAuditGate(findingsPath: string, allowlistPath: string): SecurityGateResult {
  if (!existsSync(findingsPath)) {
    return {
      ok: false,
      mode: "audit",
      blockingFindings: [],
      exceptions: [],
      reportOnly: [],
      invalidSchema: [`missing findings file: ${findingsPath}`],
    };
  }
  const parsed = validateDependencyFindings(JSON.parse(readFileSync(findingsPath, "utf-8")));
  if (!parsed.ok) {
    return {
      ok: false,
      mode: "audit",
      blockingFindings: [],
      exceptions: [],
      reportOnly: [],
      invalidSchema: parsed.errors,
    };
  }
  const allowlistParsed = validateAllowlist(JSON.parse(readFileSync(allowlistPath, "utf-8")));
  if (!allowlistParsed.ok) {
    return {
      ok: false,
      mode: "audit",
      blockingFindings: [],
      exceptions: [],
      reportOnly: [],
      invalidSchema: allowlistParsed.errors,
    };
  }

  const blockingFindings: string[] = [];
  const exceptions: string[] = [];
  const reportOnly: string[] = [];

  for (const finding of parsed.file.findings) {
    const label = `${finding.advisoryId}@${finding.packageName} (${finding.severity}, ${finding.surface})`;
    if (!isBlockingDependencyFinding(finding)) {
      reportOnly.push(label);
      continue;
    }
    const matched = allowlistParsed.file.entries.find((entry) => matchesAllowlist(finding, entry));
    if (matched) {
      exceptions.push(`${label} allowed by ${matched.owner} until ${matched.expiresAt}`);
      continue;
    }
    blockingFindings.push(label);
  }

  return {
    ok: blockingFindings.length === 0,
    mode: "audit",
    blockingFindings,
    exceptions,
    reportOnly,
  };
}

export function runSecretScanGate(findingsPath: string): SecurityGateResult {
  if (!existsSync(findingsPath)) {
    return {
      ok: false,
      mode: "secrets",
      blockingFindings: [],
      exceptions: [],
      reportOnly: [],
      invalidSchema: [`missing findings file: ${findingsPath}`],
    };
  }
  const parsed = validateSecretFindings(JSON.parse(readFileSync(findingsPath, "utf-8")));
  if (!parsed.ok) {
    return {
      ok: false,
      mode: "secrets",
      blockingFindings: [],
      exceptions: [],
      reportOnly: [],
      invalidSchema: parsed.errors,
    };
  }

  const blockingFindings: string[] = [];
  const reportOnly: string[] = [];
  for (const finding of parsed.file.findings) {
    const label = `${finding.ruleId}@${finding.path}:${finding.line}`;
    if (finding.verified) {
      blockingFindings.push(label);
      continue;
    }
    reportOnly.push(label);
  }

  return {
    ok: blockingFindings.length === 0,
    mode: "secrets",
    blockingFindings,
    exceptions: [],
    reportOnly,
  };
}

function parseCli(argv: string[]): Record<string, string> {
  const values: Record<string, string> = { mode: argv[0] ?? "" };
  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.startsWith("--")) {
      values[arg.slice(2)] = argv[index + 1] ?? "";
      index += 1;
    }
  }
  return values;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = parseCli(process.argv.slice(2));
  let result: SecurityGateResult;
  if (args.mode === "audit") {
    result = runDependencyAuditGate(resolve(args.findings ?? ""), resolve(args.allowlist ?? ""));
  } else if (args.mode === "secrets") {
    result = runSecretScanGate(resolve(args.findings ?? ""));
  } else {
    process.stderr.write("usage: security-gate.ts audit|secrets --findings <path> [--allowlist <path>] [--report <path>]\n");
    process.exitCode = 2;
    result = {
      ok: false,
      mode: "audit",
      blockingFindings: [],
      exceptions: [],
      reportOnly: [],
      invalidSchema: ["unknown mode"],
    };
  }

  if (args.report) {
    mkdirSync(dirname(resolve(args.report)), { recursive: true });
    writeFileSync(resolve(args.report), `${JSON.stringify(result, null, 2)}\n`, "utf-8");
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.invalidSchema && result.invalidSchema.length > 0 ? 2 : result.ok ? 0 : 1;
}
