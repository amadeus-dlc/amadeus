// amadeus-session-takeover.ts — the MANUAL half of cross-harness resume.
//
// WHY THIS EXISTS. The Kimi caller guard reads a per-clone carrier
// (`kimi-active-subagents.json` + `.current-session` + two deny latches) that no
// other harness writes and that no repository operation carries between clones.
// When that carrier is stale — a workflow started under another harness, a
// worktree the marker was never written into, a session killed before its
// tombstone could be retired — every mutating verb is refused, `unpark`
// included. There is then no in-band way back: the automatic layer (SessionStart)
// only helps if the session can be restarted and its hook is wired.
//
// This module is the second layer. It is NOT a bypass of the authorization
// boundary — it repairs the carrier the boundary reads, and only when a human
// has said so on this very turn. Everything it can refuse, it refuses before
// touching a byte, so a refused takeover leaves the workspace exactly as it was.
//
// SPLIT OF RESPONSIBILITY. The decision is pure (planSessionTakeover) and the
// write is separate (applySessionTakeover); the audit row stays with the state
// tool, which owns the RECOVERY_COMPLETED emitter. That keeps the emitter
// pairing single-sited and makes the whole decision table reachable in-process
// by tests.

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import {
  authorizeMainConductor,
  type CallerDenialReason,
  KIMI_ACTIVE_SUBAGENTS_RELATIVE_PATH,
  KIMI_SESSION_ENDED_DENY_RELATIVE_PATH,
  KIMI_SUBAGENT_DENY_RELATIVE_PATH,
  parseActiveSubagents,
  SESSION_TAKEOVER_VERB,
} from "./amadeus-caller-authorization.ts";

export const CURRENT_SESSION_RELATIVE_PATH = join(
  "amadeus",
  ".amadeus-sessions",
  ".current-session",
);

/** What the operator asked for, parsed but not yet judged. */
export type SessionTakeoverRequest = {
  /** `--confirm` was passed. */
  readonly confirmed: boolean;
  /** `--confirm-roles` values, or null when the flag is absent. */
  readonly confirmedRoles: readonly string[] | null;
  /** `--session-id` override, or null to adopt the host-stamped session. */
  readonly sessionId: string | null;
};

export type SessionTakeoverArgsParse =
  | { readonly kind: "parsed"; readonly request: SessionTakeoverRequest }
  | { readonly kind: "invalid"; readonly message: string };

function invalidArgs(message: string): SessionTakeoverArgsParse {
  return { kind: "invalid", message: `${SESSION_TAKEOVER_VERB}: ${message}` };
}

// A value-taking flag whose value is absent, blank, or itself a flag is an
// ERROR, never a silently dropped flag. The takeover rebinds which session owns
// the workspace, so a dropped `--session-id` would bind the host-stamped
// session instead of the one the operator named — and report exit 0 while doing
// it. Unknown arguments are rejected for the same reason: a mistyped flag must
// not read as "no override was asked for".
export function parseSessionTakeoverArgs(
  args: readonly string[],
): SessionTakeoverArgsParse {
  let confirmed = false;
  let confirmedRoles: string[] | null = null;
  let sessionId: string | null = null;
  for (let i = 0; i < args.length; i++) {
    const flag = args[i] ?? "";
    if (flag === "--confirm") {
      confirmed = true;
      continue;
    }
    if (flag !== "--confirm-roles" && flag !== "--session-id") {
      return invalidArgs(`unknown argument "${flag}".`);
    }
    const value = args[i + 1];
    if (value === undefined || value.startsWith("--")) {
      return invalidArgs(`${flag} requires a value.`);
    }
    i++;
    if (flag === "--session-id") {
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        return invalidArgs(`${flag} requires a non-empty session id.`);
      }
      sessionId = trimmed;
      continue;
    }
    const roles = value.split(",").map((role) => role.trim()).filter((role) =>
      role.length > 0
    );
    if (roles.length === 0) {
      return invalidArgs(`${flag} requires at least one role name.`);
    }
    confirmedRoles = roles;
  }
  return { kind: "parsed", request: { confirmed, confirmedRoles, sessionId } };
}

/** What the workspace actually looks like right now. */
export type SessionTakeoverFacts = {
  /** The live denial, or null when this caller is already the main conductor. */
  readonly denial: { reason: CallerDenialReason; role: string } | null;
  /** The host-stamped `.current-session`, or null when absent or blank. */
  readonly hostSessionId: string | null;
  /** Subagent roles the carrier still records as active, sorted. */
  readonly retainedRoles: readonly string[];
  /**
   * A real human prompt turn was recorded AFTER the last takeover on this
   * clone's ledger. One turn therefore authorizes at most one takeover — the
   * property that stops a model from looping the verb off a single approval.
   */
  readonly humanTurnGrounded: boolean;
};

export type SessionTakeoverDecision =
  | { readonly kind: "refused"; readonly message: string }
  | { readonly kind: "noop" }
  | {
    readonly kind: "rebind";
    readonly reason: CallerDenialReason;
    readonly sessionId: string;
    readonly retainedRoles: readonly string[];
  };

function refused(message: string): SessionTakeoverDecision {
  return { kind: "refused", message };
}

function sameRoleSet(
  acknowledged: readonly string[],
  retained: readonly string[],
): boolean {
  const left = [...new Set(acknowledged.map((role) => role.trim()))].sort();
  const right = [...retained].sort();
  return left.length === right.length &&
    left.every((role, index) => role === right[index]);
}

// The refusal order is the trust order: consent first, then grounding, then the
// facts. A caller that has not been confirmed is never told which session id it
// would have adopted.
export function planSessionTakeover(
  request: SessionTakeoverRequest,
  facts: SessionTakeoverFacts,
): SessionTakeoverDecision {
  if (!request.confirmed) {
    return refused(
      `${SESSION_TAKEOVER_VERB} rebinds this workspace's main-conductor carrier and needs the human in the loop: re-run it with --confirm once the human has approved the takeover.`,
    );
  }
  if (!facts.humanTurnGrounded) {
    return refused(
      `${SESSION_TAKEOVER_VERB} found no HUMAN_TURN on this clone's ledger after the last takeover. Ask the human to approve in their own turn, then re-run — a single approval cannot authorize a second takeover.`,
    );
  }
  if (facts.denial === null) return { kind: "noop" };
  const sessionId = request.sessionId?.trim() || facts.hostSessionId;
  if (sessionId === null || sessionId.length === 0) {
    return refused(
      `${SESSION_TAKEOVER_VERB} cannot tell which session to bind: amadeus/.amadeus-sessions/.current-session is absent or empty and no --session-id was given.`,
    );
  }
  if (facts.retainedRoles.length > 0) {
    const listed = facts.retainedRoles.join(",");
    if (request.confirmedRoles === null) {
      return refused(
        `${SESSION_TAKEOVER_VERB} refuses to seize a workspace that still records active subagent role(s): ${listed}. Confirm with the human that those roles are finished, then re-run with --confirm-roles "${listed}".`,
      );
    }
    if (!sameRoleSet(request.confirmedRoles, facts.retainedRoles)) {
      return refused(
        `${SESSION_TAKEOVER_VERB} was given --confirm-roles "${
          request.confirmedRoles.join(",")
        }" but the carrier records ${listed}. The acknowledgement must name exactly the retained roles.`,
      );
    }
  }
  return {
    kind: "rebind",
    reason: facts.denial.reason,
    sessionId,
    retainedRoles: facts.retainedRoles,
  };
}

/** The carrier as the guard would read it, for the decision above. */
export function readSessionTakeoverFacts(
  projectDir: string,
  humanTurnGrounded: boolean,
): SessionTakeoverFacts {
  const authorization = authorizeMainConductor(projectDir);
  return {
    denial: authorization.kind === "denied"
      ? { reason: authorization.reason, role: authorization.role }
      : null,
    hostSessionId: readHostSessionId(projectDir),
    retainedRoles: readRetainedRoles(projectDir),
    humanTurnGrounded,
  };
}

function readHostSessionId(projectDir: string): string | null {
  try {
    const raw = readFileSync(
      join(projectDir, CURRENT_SESSION_RELATIVE_PATH),
      "utf-8",
    ).trim();
    return raw.length === 0 ? null : raw;
  } catch {
    // No host stamp is a fact about the workspace, not a failure to report.
    return null;
  }
}

// The roles the operator must acknowledge are exactly the roles the GUARD would
// honour, so the carrier is read through the guard's own parser rather than a
// second, weaker JSON walk — a carrier the guard rejects wholesale must not
// yield roles here that block the very takeover meant to repair it.
function readRetainedRoles(projectDir: string): string[] {
  let raw = "";
  try {
    raw = readFileSync(
      join(projectDir, KIMI_ACTIVE_SUBAGENTS_RELATIVE_PATH),
      "utf-8",
    );
  } catch {
    // An unreadable carrier records no roles to acknowledge — the takeover is
    // then repairing exactly that unreadability.
    return [];
  }
  const parsed = parseActiveSubagents(raw);
  return parsed === null ? [] : Object.keys(parsed.roles).sort();
}

/**
 * Rebind the carrier to `sessionId`: retire the latches, drop a residual lock,
 * and write both faces the guard compares. Ordering matters — the marker is
 * renamed into place last so a crash mid-write leaves the workspace denied
 * (fail-closed) rather than half-authorized.
 */
export function applySessionTakeover(
  projectDir: string,
  sessionId: string,
): void {
  const markerPath = join(projectDir, KIMI_ACTIVE_SUBAGENTS_RELATIVE_PATH);
  mkdirSync(dirname(markerPath), { recursive: true });
  for (
    const latch of [
      join(projectDir, KIMI_SUBAGENT_DENY_RELATIVE_PATH),
      join(projectDir, KIMI_SESSION_ENDED_DENY_RELATIVE_PATH),
    ]
  ) {
    if (existsSync(latch)) rmSync(latch, { force: true });
  }
  rmSync(`${markerPath}.lock`, { recursive: true, force: true });
  writeFileSync(
    join(projectDir, CURRENT_SESSION_RELATIVE_PATH),
    `${sessionId}\n`,
    "utf-8",
  );
  const temporaryPath = `${markerPath}.${process.pid}.takeover`;
  writeFileSync(
    temporaryPath,
    `${JSON.stringify({ version: 1, mainSessionId: sessionId, roles: {} })}\n`,
    "utf-8",
  );
  renameSync(temporaryPath, markerPath);
}
