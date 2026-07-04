import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface ErrorAuditInput {
  readonly tool: string;
  readonly command: string;
  readonly error: string;
  readonly detail?: string;
}

export interface HookDropEntry {
  readonly hook: string;
  readonly timestamp: string;
  readonly reason: string;
}

export interface HookDropFileSummary {
  readonly hook: string;
  readonly drops: number;
  readonly malformed: number;
  readonly lastTimestamp: string | null;
  readonly lastReason: string | null;
}

export interface HookDropSummary {
  readonly filesObserved: number;
  readonly totalDrops: number;
  readonly malformedLines: number;
  readonly hooks: HookDropFileSummary[];
}

const SECRET_PATTERNS: RegExp[] = [
  /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /\b(token|secret|password|api[_-]?key)=([^\s]+)/gi,
  /\b(AWS_SECRET_ACCESS_KEY|AWS_SESSION_TOKEN|GITHUB_TOKEN)=([^\s]+)/gi,
];

function redactSecrets(value: string): string {
  let redacted = value;
  for (const pattern of SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, (match, key) => {
      if (typeof key === "string" && key.length > 0) return `${key}=<redacted>`;
      return "<redacted>";
    });
  }
  return redacted;
}

export function sanitizeErrorDetail(value: string, limit = 1200): string {
  const collapsed = redactSecrets(value).replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
  if (collapsed.length <= limit) return collapsed;
  return `${collapsed.slice(0, limit)}...`;
}

export function errorFingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export function buildErrorAuditFields(input: ErrorAuditInput): Record<string, string> {
  const detail = sanitizeErrorDetail(input.detail ?? input.error);
  return {
    Tool: input.tool,
    Command: input.command,
    Error: input.error,
    "Error detail": detail,
    "Error fingerprint": errorFingerprint(detail),
  };
}

function parseDropLine(hook: string, line: string): HookDropEntry | null {
  const trimmed = line.trim();
  if (trimmed.length === 0) return null;
  const tabIndex = trimmed.indexOf("\t");
  if (tabIndex === -1) return null;
  const timestamp = trimmed.slice(0, tabIndex).trim();
  const reason = trimmed.slice(tabIndex + 1).trim();
  if (timestamp.length === 0 || reason.length === 0 || Number.isNaN(Date.parse(timestamp))) {
    return null;
  }
  return { hook, timestamp, reason };
}

export function summarizeHookDrops(healthDir: string): HookDropSummary {
  if (!existsSync(healthDir)) {
    return { filesObserved: 0, totalDrops: 0, malformedLines: 0, hooks: [] };
  }

  const hooks: HookDropFileSummary[] = [];
  let totalDrops = 0;
  let malformedLines = 0;

  for (const file of readdirSync(healthDir).filter((name) => name.endsWith(".drops")).sort()) {
    const hook = file.slice(0, -".drops".length);
    const raw = readFileSync(join(healthDir, file), "utf-8");
    let drops = 0;
    let malformed = 0;
    let lastTimestamp: string | null = null;
    let lastReason: string | null = null;

    for (const line of raw.split(/\r?\n/)) {
      if (line.trim().length === 0) continue;
      const entry = parseDropLine(hook, line);
      if (entry === null) {
        malformed++;
        continue;
      }
      drops++;
      lastTimestamp = entry.timestamp;
      lastReason = entry.reason;
    }

    totalDrops += drops;
    malformedLines += malformed;
    hooks.push({ hook, drops, malformed, lastTimestamp, lastReason });
  }

  return { filesObserved: hooks.length, totalDrops, malformedLines, hooks };
}
