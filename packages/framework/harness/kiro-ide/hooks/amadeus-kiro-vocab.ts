// amadeus-kiro-vocab.ts — the measured Kiro IDE USER_PROMPT context and
// delegated-tool vocabulary (issue #753).
//
// The registered delegated-tool matcher uses `invoke_sub_agent`, while existing
// CLI fixtures use `subagent`; accept both at that one payload-dependent seam.
// State sync is intentionally absent here: U07 drives it from the audit tail.
//
// Extracted as an importable module (not inline in the adapter script) so the
// mapping logic is drivable in-process by bun --coverage — spawned subprocess
// runs are invisible to it (cid:code-generation:bun-coverage-spawn-blindspot).

interface KiroIdeHookContext {
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: string;
  toolSuccess?: boolean;
}

type HookContextResult =
  | { kind: "ok"; value: KiroIdeHookContext }
  | { kind: "empty"; reason: "missing" | "malformed" | "not-object" };

export function parseKiroIdeHookContext(payload: unknown): HookContextResult {
  if (payload === undefined || payload === null || payload === "") {
    return { kind: "empty", reason: "missing" };
  }

  let parsed: unknown = payload;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed) as unknown;
    } catch {
      return { kind: "empty", reason: "malformed" };
    }
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { kind: "empty", reason: "not-object" };
  }

  const source = parsed as Record<string, unknown>;
  const value: KiroIdeHookContext = {};
  if (typeof source.toolName === "string") value.toolName = source.toolName;
  if (
    typeof source.toolArgs === "object" &&
    source.toolArgs !== null &&
    !Array.isArray(source.toolArgs)
  ) {
    value.toolArgs = source.toolArgs as Record<string, unknown>;
  }
  if (typeof source.toolResult === "string") value.toolResult = source.toolResult;
  if (typeof source.toolSuccess === "boolean") value.toolSuccess = source.toolSuccess;
  return { kind: "ok", value };
}

/** True when the tool name is the subagent tool in either vocabulary:
 *  CLI `subagent`, IDE `invoke_sub_agent`. */
export function isSubagentTool(name: string): boolean {
  return name === "subagent" || name === "invoke_sub_agent";
}
