// amadeus-kiro-vocab.ts — dual-vocabulary acceptance for the two Kiro IDE
// PostToolUse seams (issue #753).
//
// The registered .kiro.hook matchers use the IDE tool vocabulary
// (`invoke_sub_agent` / `spec`) while the adapter's case checks used the CLI
// vocabulary (`subagent` / `todo_list`) alone — mutually exclusive, so the
// seams could never fire. This module mirrors the sibling canonicalTool()
// pattern (write|fs_write, shell|execute_bash): accept BOTH vocabularies
// defensively, whichever one the live payload carries.
//
// Extracted as an importable module (not inline in the adapter script) so the
// mapping logic is drivable in-process by bun --coverage — spawned subprocess
// runs are invisible to it (cid:code-generation:bun-coverage-spawn-blindspot).

/** True when the tool name is the subagent tool in either vocabulary:
 *  CLI `subagent`, IDE `invoke_sub_agent`. */
export function isSubagentTool(name: string): boolean {
  return name === "subagent" || name === "invoke_sub_agent";
}

/** The TaskUpdate-shaped tool_input the core sync-statusline hook keys on. */
export interface StateSyncInput {
  status: string;
  activeForm: string;
}

/** Map a state-sync payload (either vocabulary) to the core hook's
 *  TaskUpdate shape, or null when the payload is not a stage transition.
 *
 *  - CLI `todo_list` is command-shaped: a `create` whose first task
 *    description carries the stage-protocol "[slug]" suffix maps to the
 *    in_progress transition (live-captured shape, findings.md §0.2).
 *  - IDE `spec` is assumed task-status shaped ({task, status}) after the
 *    IDE's spec task-execution tool. No live capture exists yet; per the
 *    FR-3 pre-approved branch this shape mapping may chase the measured
 *    payload if it differs — the dual-vocabulary acceptance itself is fixed.
 *    A missing status defaults to in_progress; any other status is forwarded
 *    verbatim and filtered by the core hook (which only fires on
 *    in_progress).
 */
export function mapStateSyncInput(
  name: string,
  ti: Record<string, unknown>,
): StateSyncInput | null {
  if (name === "todo_list") {
    if ((ti.command as string) !== "create") return null;
    const tasks = (ti.tasks as Array<{ task_description?: string }>) ?? [];
    const desc = tasks[0]?.task_description ?? "";
    if (!desc) return null;
    return { status: "in_progress", activeForm: desc };
  }
  if (name === "spec") {
    const desc = typeof ti.task === "string" ? ti.task : "";
    if (!desc) return null;
    const status = typeof ti.status === "string" && ti.status.length > 0 ? ti.status : "in_progress";
    return { status, activeForm: desc };
  }
  return null;
}
