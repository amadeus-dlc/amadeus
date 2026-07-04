import { sanitizeErrorDetail } from "./aidlc-failure-evidence.ts";

export type SubagentOutcome = "success" | "failure" | "unknown";
export type SubagentStatusSource = "subagent_status" | "status" | "missing" | "untrusted";

export interface SubagentOutcomeResult {
  readonly outcome: SubagentOutcome;
  readonly source: SubagentStatusSource;
  readonly rawStatus: string | null;
}

export interface SubagentAuditRow {
  readonly outcome: SubagentOutcome;
  readonly source: SubagentStatusSource;
  readonly agentType: string;
  readonly agentId: string | null;
}

const SUCCESS_STATUSES = new Set(["success", "succeeded", "ok", "completed"]);
const FAILURE_STATUSES = new Set(["failure", "failed", "error", "errored", "cancelled", "timeout"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringField(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeStatus(rawStatus: string | null): SubagentOutcome {
  if (rawStatus === null) return "unknown";
  const normalized = rawStatus.trim().toLowerCase();
  if (SUCCESS_STATUSES.has(normalized)) return "success";
  if (FAILURE_STATUSES.has(normalized)) return "failure";
  return "unknown";
}

export function classifySubagentOutcome(payload: unknown): SubagentOutcomeResult {
  if (!isRecord(payload)) {
    return { outcome: "unknown", source: "untrusted", rawStatus: null };
  }
  if (payload.hook_event_name !== "SubagentStop") {
    return { outcome: "unknown", source: "untrusted", rawStatus: null };
  }

  const subagentStatus = stringField(payload.subagent_status);
  if (subagentStatus !== null) {
    return {
      outcome: normalizeStatus(subagentStatus),
      source: "subagent_status",
      rawStatus: subagentStatus,
    };
  }

  const status = stringField(payload.status);
  if (status !== null) {
    return {
      outcome: normalizeStatus(status),
      source: "status",
      rawStatus: status,
    };
  }

  return { outcome: "unknown", source: "missing", rawStatus: null };
}

export function buildSubagentAuditFields(payload: unknown): Record<string, string> {
  const outcome = classifySubagentOutcome(payload);
  const record = isRecord(payload) ? payload : {};
  const agentType = stringField(record.agent_type) ?? "unknown";
  const agentId = stringField(record.agent_id);
  const agentMessage = stringField(record.last_assistant_message);
  const fields: Record<string, string> = {
    "Agent Type": agentType,
    "Subagent Outcome": outcome.outcome,
    "Status Source": outcome.source,
  };
  if (agentId !== null) fields["Agent ID"] = agentId;
  if (agentMessage !== null) fields.Message = sanitizeErrorDetail(agentMessage, 200);
  if (outcome.rawStatus !== null) fields["Status Value"] = sanitizeErrorDetail(outcome.rawStatus, 80);
  return fields;
}

function auditField(block: string, field: string): string | null {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = block.match(new RegExp(`^\\*\\*${escaped}\\*\\*:\\s*(.+)$`, "m"));
  return match ? match[1].trim() : null;
}

export function normalizeSubagentAuditRow(block: string): SubagentAuditRow {
  const rawOutcome = auditField(block, "Subagent Outcome");
  const outcome =
    rawOutcome === "success" || rawOutcome === "failure" || rawOutcome === "unknown"
      ? rawOutcome
      : "unknown";
  const rawSource = auditField(block, "Status Source");
  const source =
    rawSource === "subagent_status" ||
    rawSource === "status" ||
    rawSource === "missing" ||
    rawSource === "untrusted"
      ? rawSource
      : "missing";
  return {
    outcome,
    source,
    agentType: auditField(block, "Agent Type") ?? "unknown",
    agentId: auditField(block, "Agent ID"),
  };
}
