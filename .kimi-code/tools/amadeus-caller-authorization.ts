import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { detectHarnessType } from "./amadeus-harness.ts";

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

interface KimiActiveSubagents {
  version: 1;
  mainSessionId: string;
  roles: Record<string, number>;
}

export type MainConductorAuthorization =
  | { kind: "authorized" }
  | { kind: "denied"; role: string };

function parseActiveSubagents(raw: string): KimiActiveSubagents | null {
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
    return { kind: "denied", role: "unknown" };
  }

  let parsed: KimiActiveSubagents | null = null;
  try {
    parsed = parseActiveSubagents(readFileSync(markerPath, "utf-8"));
  } catch {
    // An unreadable role carrier cannot prove a main-conductor caller.
  }
  if (parsed === null) return { kind: "denied", role: "unknown" };

  try {
    const currentSessionId = readFileSync(
      join(projectDir, "amadeus", ".amadeus-sessions", ".current-session"),
      "utf-8",
    ).trim();
    if (
      currentSessionId.length === 0 ||
      currentSessionId !== parsed.mainSessionId
    ) {
      return { kind: "denied", role: "unknown" };
    }
  } catch {
    return { kind: "denied", role: "unknown" };
  }

  const activeRole = Object.keys(parsed.roles).sort()[0];
  return activeRole === undefined
    ? { kind: "authorized" }
    : { kind: "denied", role: activeRole };
}

export function callerAuthorizationError(role: string): string {
  return (
    `Amadeus mutation denied: Kimi caller role "${role}" is not the main conductor. ` +
    "The workflow state and audit log were not changed."
  );
}
