import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { detectHarnessType, harnessDir } from "./amadeus-harness.ts";

export const KIMI_ACTIVE_SUBAGENTS_RELATIVE_PATH = join(
  "amadeus",
  ".amadeus-sessions",
  "kimi-active-subagents.json",
);
export const KIMI_SUBAGENT_DENY_RELATIVE_PATH = join(
  "amadeus",
  ".amadeus-sessions",
  "kimi-subagent-transition-deny",
);
export const KIMI_SESSION_ENDED_DENY_RELATIVE_PATH = join(
  "amadeus",
  ".amadeus-sessions",
  "kimi-session-ended-deny",
);
export const CURRENT_SESSION_RELATIVE_PATH = join(
  "amadeus",
  ".amadeus-sessions",
  ".current-session",
);

interface KimiActiveSubagents {
  version: 1;
  mainSessionId: string;
  roles: Record<string, number>;
}

// The four separable causes of a main-conductor denial. Collapsing them into
// one opaque `role: "unknown"` is what made the carrier faults of a
// cross-harness handover undiagnosable: a missing marker, a stale
// `.current-session`, and a retained deny latch all reached the operator as the
// same sentence. A carrier SPLIT (the adapter writing under a raw cwd while the
// core hooks resolve a marker-verified project dir) deliberately reports
// `marker-absent` rather than a fifth value: the guard only ever reads one
// project dir, so from its vantage point a split IS an absent marker, and the
// split-vs-absent distinction belongs to the handover runbook instead.
export type CallerDenialReason =
  | "deny-latch"
  | "marker-absent"
  | "session-mismatch"
  | "active-role";

export type MainConductorDenial = {
  kind: "denied";
  reason: CallerDenialReason;
  role: string;
};

export type MainConductorAuthorization =
  | { kind: "authorized" }
  | MainConductorDenial;

/** The part of a denial the operator-facing message needs. */
export type CallerDenialSummary = Pick<MainConductorDenial, "reason" | "role">;

// Denials that cannot name a role still carry one, so the pre-existing
// operator-facing sentence keeps its shape; the reason is the new signal.
function denied(reason: CallerDenialReason, role = "unknown"): MainConductorDenial {
  return { kind: "denied", reason, role };
}

export function parseActiveSubagents(raw: string): KimiActiveSubagents | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      (parsed as { version?: unknown }).version !== 1
    ) {
      return null;
    }
    const roles = (parsed as { roles?: unknown }).roles;
    const mainSessionId = (parsed as { mainSessionId?: unknown }).mainSessionId;
    if (
      typeof mainSessionId !== "string" ||
      mainSessionId.trim().length === 0
    ) {
      return null;
    }
    if (roles === null || typeof roles !== "object" || Array.isArray(roles)) {
      return null;
    }
    for (const [role, count] of Object.entries(roles)) {
      if (
        role.trim().length === 0 ||
        typeof count !== "number" ||
        !Number.isSafeInteger(count) ||
        count < 1
      ) {
        return null;
      }
    }
    return {
      version: 1,
      mainSessionId,
      roles: roles as Record<string, number>,
    };
  } catch {
    return null;
  }
}

export function authorizeMainConductor(
  projectDir: string,
): MainConductorAuthorization {
  if (detectHarnessType() !== "kimi") return { kind: "authorized" };

  const markerPath = join(projectDir, KIMI_ACTIVE_SUBAGENTS_RELATIVE_PATH);
  const denyPath = join(projectDir, KIMI_SUBAGENT_DENY_RELATIVE_PATH);
  const endedPath = join(projectDir, KIMI_SESSION_ENDED_DENY_RELATIVE_PATH);
  if (
    existsSync(denyPath) ||
    existsSync(endedPath) ||
    existsSync(`${markerPath}.lock`)
  ) {
    return denied("deny-latch");
  }

  let parsed: KimiActiveSubagents | null = null;
  try {
    parsed = parseActiveSubagents(readFileSync(markerPath, "utf-8"));
  } catch {
    // An unreadable role carrier cannot prove a main-conductor caller.
  }
  if (parsed === null) return denied("marker-absent");

  try {
    const currentSessionId = readFileSync(
      join(projectDir, CURRENT_SESSION_RELATIVE_PATH),
      "utf-8",
    ).trim();
    if (
      currentSessionId.length === 0 ||
      currentSessionId !== parsed.mainSessionId
    ) {
      return denied("session-mismatch");
    }
  } catch {
    return denied("session-mismatch");
  }

  const activeRole = Object.keys(parsed.roles).sort()[0];
  return activeRole === undefined
    ? { kind: "authorized" }
    : denied("active-role", activeRole);
}

// The verb the recovery guidance points at. Named once so the message and the
// state CLI arm cannot drift apart.
export const SESSION_TAKEOVER_VERB = "session-takeover";

const DENIAL_CAUSE: Record<CallerDenialReason, string> = {
  "deny-latch":
    "a subagent-transition deny latch, a session-ended tombstone, or an in-flight role-marker lock is still present",
  "marker-absent":
    "the Kimi role carrier (kimi-active-subagents.json) is missing or unreadable under this project dir — a session that never ran SessionStart here, or a carrier written under a different project dir, both land here",
  "session-mismatch":
    "the host-stamped .current-session does not match the role carrier's main session id — another harness or another session claimed this workspace last",
  "active-role":
    "a subagent role is still recorded as active, so this caller cannot be the main conductor",
};

function takeoverCommand(): string {
  return `bun ${harnessDir()}/tools/amadeus-state.ts ${SESSION_TAKEOVER_VERB} --confirm [--project-dir <path>]`;
}

// The recovery guidance deliberately names only the two supported layers:
// re-firing SessionStart, and the human-confirmed takeover verb. Overriding the
// harness type through the environment also lifts the guard, but it does so by
// disabling the authorization boundary rather than repairing the carrier, so it
// is never offered here as a recovery route.
export function callerAuthorizationError(denial: CallerDenialSummary): string {
  const rolesHint = denial.reason === "active-role"
    ? ` Because a role is still active, the takeover additionally requires --confirm-roles "${denial.role}" so the retained role is acknowledged rather than silently seized.`
    : "";
  // Each segment is bound on its own line rather than concatenated across
  // lines: bun's lcov leaves the continuation lines of a multi-line `+` chain
  // at DA:0 under union merge, which reads as an untested message.
  const denied = `Amadeus mutation denied: Kimi caller role "${denial.role}" is not the main conductor. The workflow state and audit log were not changed.`;
  const cause = `Cause (${denial.reason}): ${DENIAL_CAUSE[denial.reason]}.`;
  const recovery = `Recovery: restart this Kimi session so SessionStart re-establishes the main-conductor carrier. If restarting is not possible, ask the human to confirm and then run \`${takeoverCommand()}\`.`;
  return `${denied}\n${cause}\n${recovery}${rolesHint}`;
}
