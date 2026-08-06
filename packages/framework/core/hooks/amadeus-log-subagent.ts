// SubagentStop hook: Emit SUBAGENT_COMPLETED when a subagent finishes.
// Replaces the previous free-form `## Subagent Completed` markdown write with
// a canonical audit event.
//
// Receives JSON on stdin with subagent info. No-op if no audit shard exists.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ensureOtelBootstrap } from "../otel/bootstrap.ts";
import { appendAuditEntryViaEvents } from "../otel/migration-adapter.ts";
import { initProcessObservability } from "../tools/amadeus-observability.ts";
import {
  activeWorkflowIsComplete,
  type ClaudeCodeHookInput,
  errorMessage,
  hasActiveWorkflowAudit,
  hooksHealthDir,
  isClaudeCodeHookInput,
  isoTimestamp,
  normalizeAgentType,
  recordHookDrop,
  readHookStdin,
  resolveProjectDirFromHook,
} from "../tools/amadeus-lib.ts";
import { harnessDir } from "../tools/amadeus-harness.ts";
import {
  classifyAgentType,
  isWarnableVerdict,
  type ModelResolution,
  resolveAllowedAgentTypes,
  resolveEffectiveModel,
  resolvePersonaPin,
  sanitizeAdvisoryValue,
} from "../tools/amadeus-subagent-observability.ts";

// Drain stdin first: the payload's `cwd` is the top rung of project-dir
// resolution (#1482), and the stream can only be read once.
const hookStdin = await readHookStdin();
const projectDir = resolveProjectDirFromHook(import.meta.url, hookStdin.cwd);

// Write health heartbeat
const healthDir = hooksHealthDir(projectDir);
mkdirSync(healthDir, { recursive: true });
writeFileSync(join(healthDir, "log-subagent.last"), isoTimestamp(), "utf-8");

// Read JSON from stdin. Exit cleanly if stdin is a TTY (no Claude Code JSON
// coming) — avoids blocking on terminal read in test / debug-mode contexts.
if (process.stdin.isTTY) process.exit(0);

const input = hookStdin.text;
let parsed: ClaudeCodeHookInput;
try {
  const raw: unknown = JSON.parse(input);
  if (!isClaudeCodeHookInput(raw)) process.exit(0);
  parsed = raw;
} catch {
  process.exit(0);
}

// SubagentStop delivers agent_type as "" for generic Task agents (#845).
const agentType = normalizeAgentType(parsed.agent_type);
// #2279: an ad-hoc dispatch name used to land in the record indistinguishable
// from a declared persona. Classify it against the allowed set and say so on
// stderr, where whoever is driving the session will see it without opening the
// audit trail. Advisory only: every failure here returns null, which drops the
// verdict and leaves the emit below untouched — losing an audit row would cost
// more than missing one check.
function typeVerdictFor(agentType: string): string | null {
  try {
    const resolution = resolveAllowedAgentTypes(join(projectDir, harnessDir(), "agents"));
    for (const warning of resolution.warnings) process.stderr.write(`advisory: ${warning}\n`);
    const verdict = classifyAgentType(agentType, resolution);
    if (isWarnableVerdict(verdict)) {
      const shown = sanitizeAdvisoryValue(agentType);
      process.stderr.write(
        `advisory: subagent type "${shown}" is ${verdict} (allowed set: personas + builtin ledger) — see #2279\n`,
      );
    }
    return verdict;
  } catch (e) {
    process.stderr.write(`advisory: subagent type check skipped: ${sanitizeAdvisoryValue(errorMessage(e))}\n`);
    return null;
  }
}

const typeVerdict = typeVerdictFor(agentType);
const agentId: string = parsed.agent_id ?? "";
const agentMessage: string = (parsed.last_assistant_message ?? "").slice(0, 200);

// #2279 FR-3 (U2): the model that actually served the dispatch, with its
// resolution source (ADR-3). The completed payload carries no tool_input, so
// requestedModel is undefined BY CONTRACT — not an omitted lookup (BR-U2-5).
// The pin is read only for a persona verdict, and the same fail-open rule as
// the type check applies: any failure returns null, skips the attributes, and
// leaves the emit below untouched.
function modelResolutionFor(agentType: string, typeVerdict: string | null): ModelResolution | null {
  try {
    let personaPin: string | undefined;
    if (typeVerdict === "persona") {
      const pinResolution = resolvePersonaPin(agentType, join(projectDir, harnessDir(), "agents"));
      for (const warning of pinResolution.warnings) process.stderr.write(`advisory: ${warning}\n`);
      personaPin = pinResolution.pin;
    }
    return resolveEffectiveModel({
      harnessModel: typeof parsed.model === "string" ? parsed.model : undefined,
      requestedModel: undefined,
      personaPin,
    });
  } catch (e) {
    process.stderr.write(`advisory: subagent model attribution skipped: ${sanitizeAdvisoryValue(errorMessage(e))}\n`);
    return null;
  }
}

const modelResolution = modelResolutionFor(agentType, typeVerdict);

// Gate on ANY per-clone shard of the active intent (glob-merge), NOT this clone's
// own shard — a fresh clone / new worktree mints a new clone-id, so a bare
// self-shard existsSync would drop the event until the engine's first append.
if (!hasActiveWorkflowAudit(projectDir)) process.exit(0);

// #845: the active intent may already be Completed (Status=Completed on its
// amadeus-state.md). Appending SUBAGENT_COMPLETED to a closed workflow leaves
// unpushed audit residue in every worktree that merely runs subagents after the
// intent finished — no-op once the workflow is terminal.
if (activeWorkflowIsComplete(projectDir)) process.exit(0);

// Telemetry process span (opt-in; no-op unless observability.enabled)
initProcessObservability("hook:log-subagent", projectDir);

const fields: Record<string, string> = {
  "Agent Type": agentType,
};
if (agentId) fields["Agent ID"] = agentId;
if (agentMessage) fields.Message = agentMessage;
if (typeVerdict) fields["Type Verdict"] = typeVerdict;
// ADR-5: unresolved writes neither attribute — the pair is all-or-nothing so
// no half-recorded row can exist for the aggregation CLI to misread.
if (modelResolution?.kind === "resolved") {
  fields.Model = modelResolution.model;
  fields["Model Source"] = modelResolution.source;
}

try {
  // Stand up the canonical emit path before the first emit (emitEvent throws
  // with no Logger Provider registered). Inside the try so a bootstrap failure
  // lands on the SAME fail-open drop as an append failure.
  //
  // Agent ID and Message are conditional here, which is why this hook stayed on
  // the legacy writer while the other four migrated: default-deny redaction
  // dropped any key the registry did not name, and naming them required would
  // have thrown on the calls that omit them. They are registered optional now,
  // so both survive the write without becoming mandatory.
  ensureOtelBootstrap(projectDir);
  appendAuditEntryViaEvents("SUBAGENT_COMPLETED", fields, projectDir);
} catch (e) {
  recordHookDrop(projectDir, "log-subagent", errorMessage(e));
  process.exit(0);
}
