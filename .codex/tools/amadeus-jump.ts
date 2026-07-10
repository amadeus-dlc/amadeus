import { appendAuditEntry } from "./amadeus-audit.ts";
import {
  type CheckboxState,
  countCheckboxes,
  emitError,
  errorMessage,
  findStageBySlug,
  firstInScopeStageOfPhase,
  getField,
  isoTimestamp,
  loadScopeMapping,
  loadStageGraph,
  nextInScopeStage,
  PHASE_NUMBERS,
  PHASES,
  parseCheckboxes,
  parseStateStageSuffixes,
  readStateFile,
  resolveProjectDir,
  resolveStage,
  type StageEntry,
  setCheckbox,
  setField,
  stageIndex,
  writeStateFile,
} from "./amadeus-lib.js";

// The EFFECTIVE per-stage action: the live state file's EXECUTE/SKIP suffix
// (a recomposed plan) wins over the static scope grid - the same resolution
// rule the router applies (nextInScopeStage's override seam). Every jump-side
// grid read goes through this so a jump and an advance can never disagree
// about which stages are on the plan.
function effectiveAction(
  suffixes: Map<string, "EXECUTE" | "SKIP">,
  scopeMapping: { stages: Record<string, string> },
  slug: string,
): string | undefined {
  return suffixes.get(slug) ?? scopeMapping.stages[slug];
}

// --- Audit emission helper ---
function emitAudit(
  pd: string,
  eventType: string,
  fields: Record<string, string>
): void {
  appendAuditEntry(eventType, fields, pd);
}

// --- Direction derivation (single source of truth) ---
// resolve derives the jump direction from the stage-graph indices; execute must
// reconcile the caller-supplied --direction against the SAME derivation, or a
// mis-specified direction silently runs the wrong skip/reset bookkeeping (a
// forward jump to an earlier stage regresses Current Stage, leaves downstream
// [x] in place, and emits a false `Direction: FORWARD` audit). Both handlers
// call deriveDirection so they can never disagree.
export function deriveDirection(
  currentIdx: number,
  targetIdx: number
): "forward" | "backward" | "redo" {
  if (targetIdx > currentIdx) return "forward";
  if (targetIdx < currentIdx) return "backward";
  return "redo";
}

// Reconcile a caller-supplied direction with the graph-derived one. Returns the
// authoritative expected direction on mismatch so the caller can be told the
// correct value (loud rejection, not a silent wrong-direction execution).
export function directionReconcile(
  supplied: string,
  currentIdx: number,
  targetIdx: number
): { ok: true } | { ok: false; expected: "forward" | "backward" | "redo" } {
  const expected = deriveDirection(currentIdx, targetIdx);
  return supplied === expected ? { ok: true } : { ok: false, expected };
}

// --- CLI entry point ---

let projectDir: string | undefined;

function main(): void {
  const rawArgs = process.argv.slice(2);

  // Extract --project-dir
  const filteredArgs: string[] = [];
  for (let i = 0; i < rawArgs.length; i++) {
    if (rawArgs[i] === "--project-dir" && i + 1 < rawArgs.length) {
      projectDir = rawArgs[i + 1];
      i++;
    } else {
      filteredArgs.push(rawArgs[i]);
    }
  }

  const subcommand = filteredArgs[0];

  try {
    switch (subcommand) {
      case "resolve":
        handleResolve(filteredArgs.slice(1));
        break;
      case "execute":
        handleExecute(filteredArgs.slice(1));
        break;
      default:
        error(`Unknown subcommand: ${subcommand}. Valid: resolve, execute`);
    }
  } catch (e) {
    error(errorMessage(e));
  }
}

if (import.meta.main) {
  main();
}

// --- Parse named flags ---

function parseFlags(
  args: string[]
): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--") && i + 1 < args.length) {
      flags[args[i].slice(2)] = args[i + 1];
      i++;
    }
  }
  return flags;
}

// Canonicalise a phase token (name or number) to its canonical name, or null.
//
// A bare PHASE_NUMBERS[lower] walks the prototype chain, so all-lowercase
// Object.prototype members (`constructor`, `__proto__`) resolve to truthy
// non-string values and slip past the `!canonical` guard. Object.hasOwn keeps
// those names on the null path. Kept local to this tool (E-L17): the
// PHASE_NUMBERS constant stays shared, but each site carries its own guard to
// avoid cross-file churn; #833 tracks lifting the three copies.
export function ownPhase(input: string): string | null {
  const lower = input.toLowerCase();
  if (Object.hasOwn(PHASE_NUMBERS, lower)) return PHASE_NUMBERS[lower];
  return (PHASES as readonly string[]).includes(lower) ? lower : null;
}

// --- Subcommand: resolve ---

export function handleResolve(args: string[]): void {
  const flags = parseFlags(args);
  const pd = resolveProjectDir(projectDir);
  const content = readStateFile(pd);

  // Determine scope
  const scope = flags.scope || getField(content, "Scope") || "feature";
  const scopeMapping = loadScopeMapping()[scope];
  if (!scopeMapping) error(`Unknown scope: ${scope}`);
  // The live plan's per-stage suffix overrides (a recomposed plan) - every
  // grid read below resolves through effectiveAction so a suffix-promoted
  // stage is jumpable and a suffix-SKIPped one is refused, matching the
  // router's own resolution. ONLY when the resolved scope IS the state's own
  // scope: an explicit `--scope <other>` asks about a DIFFERENT scope's plan,
  // and the state's suffixes describe the current plan, not that one.
  const suffixes =
    scope === (getField(content, "Scope") || "")
      ? parseStateStageSuffixes(content)
      : new Map<string, "EXECUTE" | "SKIP">();

  // Determine current position
  const currentSlug = getField(content, "Current Stage") || "state-init";
  const currentStage = resolveStage(currentSlug);
  if (!currentStage) error(`Cannot resolve current stage: ${currentSlug}`);

  // Resolve target
  let targetStage: StageEntry | null = null;

  if (flags.stage) {
    targetStage = resolveStage(flags.stage) || null;
    if (!targetStage) error(`Unknown stage: ${flags.stage}`);

    // Check if target is on the EFFECTIVE plan (suffix override wins).
    if (effectiveAction(suffixes, scopeMapping, targetStage.slug) === "SKIP") {
      error(
        `Stage "${targetStage.slug}" is skipped for scope "${scope}". Choose a different stage or change scope.`
      );
    }
  } else if (flags.phase) {
    const canonicalPhase = ownPhase(flags.phase);
    if (!canonicalPhase) error(`Unknown phase: ${flags.phase}`);

    // The first EFFECTIVE-EXECUTE stage of the phase: walk the full graph in
    // order applying the suffix override, so a recomposed plan targets the
    // stage the router would actually run first. Falls back to the static
    // firstInScopeStageOfPhase result when no suffix touches the phase (the
    // two agree on an unrecomposed plan).
    const graphForPhase = loadStageGraph();
    targetStage =
      graphForPhase.find(
        (s) =>
          s.phase === canonicalPhase &&
          effectiveAction(suffixes, scopeMapping, s.slug) === "EXECUTE",
      ) ?? firstInScopeStageOfPhase(canonicalPhase, scope);
    if (!targetStage) {
      error(
        `Phase "${canonicalPhase}" has no executable stages for scope "${scope}".`
      );
    }
  } else {
    error("Usage: resolve --stage <slug|#> or --phase <name|#> [--scope <scope>]");
  }

  const currentIdx = stageIndex(currentStage.slug);
  const targetIdx = stageIndex(targetStage.slug);
  const direction = deriveDirection(currentIdx, targetIdx);

  // Compute affected stages (against the EFFECTIVE plan, not the static grid)
  const graph = loadStageGraph();
  const affectedSlugs: string[] = [];

  if (direction === "forward") {
    // Stages between current (exclusive) and target (exclusive)
    for (let i = currentIdx + 1; i < targetIdx; i++) {
      if (effectiveAction(suffixes, scopeMapping, graph[i].slug) === "EXECUTE") {
        affectedSlugs.push(graph[i].slug);
      }
    }
  } else if (direction === "backward") {
    // Target and all stages after (on the effective plan)
    for (let i = targetIdx; i < graph.length; i++) {
      if (effectiveAction(suffixes, scopeMapping, graph[i].slug) === "EXECUTE") {
        affectedSlugs.push(graph[i].slug);
      }
    }
  }
  // redo: only the target itself

  console.log(
    JSON.stringify({
      target_slug: targetStage.slug,
      target_phase: targetStage.phase.toUpperCase(),
      target_number: targetStage.number,
      target_name: targetStage.name,
      current_slug: currentStage.slug,
      current_number: currentStage.number,
      direction,
      affected_stages: affectedSlugs,
      valid: true,
    })
  );
}

// --- Subcommand: execute ---

export function handleExecute(args: string[]): void {
  const flags = parseFlags(args);
  const pd = resolveProjectDir(projectDir);
  let content = readStateFile(pd);

  const targetSlug = flags.target;
  if (!targetSlug) error("Usage: execute --target <slug> --direction <forward|backward|redo> [--scope <scope>]");

  const direction = flags.direction;
  if (
    direction !== "forward" &&
    direction !== "backward" &&
    direction !== "redo"
  ) {
    error(`Invalid direction: ${flags.direction}. Valid: forward, backward, redo`);
  }

  const scope = flags.scope || getField(content, "Scope") || "feature";
  const scopeMapping = loadScopeMapping()[scope];
  if (!scopeMapping) error(`Unknown scope: ${scope}`);
  // The live plan's suffix overrides - execute resolves the same EFFECTIVE
  // plan resolve does (see effectiveAction), so a recomposed stage is
  // reachable and a recompose-SKIPped one refused here too. Same
  // scope-matches-state guard as resolve: a foreign --scope consults the
  // static grid only.
  const suffixes =
    scope === (getField(content, "Scope") || "")
      ? parseStateStageSuffixes(content)
      : new Map<string, "EXECUTE" | "SKIP">();

  const targetStage = findStageBySlug(targetSlug);
  if (!targetStage) error(`Unknown stage: ${targetSlug}`);

  // Scope validation - target must be EXECUTE on the EFFECTIVE plan (mirrors
  // resolve). Without this, an orchestrator bypassing resolve can land the
  // workflow on a stage the plan says should be skipped.
  if (effectiveAction(suffixes, scopeMapping, targetSlug) === "SKIP") {
    error(
      `Stage "${targetSlug}" is skipped for scope "${scope}". Choose a different target or change scope.`
    );
  }

  const graph = loadStageGraph();
  const targetIdx = stageIndex(targetSlug);
  const checkboxes = parseCheckboxes(content);

  // Build a lookup of current checkbox states
  const checkboxMap = new Map(checkboxes.map((c) => [c.slug, c.state]));

  const stagesSkipped: string[] = [];
  const stagesReset: string[] = [];

  // Get current stage for audit
  const currentSlug = getField(content, "Current Stage") || "state-init";
  const currentIdx = stageIndex(currentSlug);

  const reconcile = directionReconcile(direction, currentIdx, targetIdx);
  if (!reconcile.ok)
    error(
      `Direction mismatch: --direction ${direction}, but ${currentSlug} → ${targetSlug} is a ${reconcile.expected} transition. Re-run with --direction ${reconcile.expected}.`
    );

  // States that count as "in-flight" (skip on forward jump, reset on backward jump)
  const IN_FLIGHT_STATES: CheckboxState[] = [
    "pending",
    "in-progress",
    "awaiting-approval",
    "revising",
  ];

  if (direction === "forward") {
    // Mark intermediate in-flight stages → [S], leave [x] alone. Gate on the
    // EFFECTIVE plan so a recompose-ADDed stage (grid SKIP, suffix EXECUTE)
    // is marked [S] like any other on-plan stage, and a recompose-SKIPped one
    // is passed over.
    for (let i = currentIdx + 1; i < targetIdx; i++) {
      const slug = graph[i].slug;
      if (effectiveAction(suffixes, scopeMapping, slug) !== "EXECUTE") continue;
      const state = checkboxMap.get(slug);
      if (state && IN_FLIGHT_STATES.includes(state)) {
        content = setCheckbox(content, slug, "skipped");
        stagesSkipped.push(slug);
      }
    }
    // Also mark the current stage if it's in-flight AND the target is further
    // forward (target !== current). When target === current, direction is "redo"
    // not "forward" — but guard explicitly in case caller mis-specifies.
    if (currentSlug !== targetSlug) {
      const currentState = checkboxMap.get(currentSlug);
      if (
        currentState &&
        currentState !== "pending" &&
        IN_FLIGHT_STATES.includes(currentState)
      ) {
        content = setCheckbox(content, currentSlug, "skipped");
        stagesSkipped.push(currentSlug);
      }
    }
  } else if (direction === "backward") {
    // Reset target + downstream [x]/[-]/[?]/[R]/[S] → [ ]
    const RESETTABLE: CheckboxState[] = [
      "completed",
      "in-progress",
      "awaiting-approval",
      "revising",
      "skipped",
    ];
    for (let i = targetIdx; i < graph.length; i++) {
      const slug = graph[i].slug;
      // Effective plan again: a recompose-ADDed stage's [x] is reset by a
      // backward jump like any on-plan stage (ADD-then-jump consistency).
      if (effectiveAction(suffixes, scopeMapping, slug) !== "EXECUTE") continue;
      const state = checkboxMap.get(slug);
      if (state && RESETTABLE.includes(state)) {
        content = setCheckbox(content, slug, "pending");
        stagesReset.push(slug);
      }
    }
  } else {
    // redo: reset target only → [ ]
    content = setCheckbox(content, targetSlug, "pending");
    stagesReset.push(targetSlug);
  }

  // Mark target [-] so state and checkbox agree. This was missing before the
  // refactor — jump set Current Stage=target but left the checkbox at [ ]/[S]/
  // pending, causing an orchestrator to see an inconsistent state.
  content = setCheckbox(content, targetSlug, "in-progress");

  // Detect phase-boundary crossing. Jump asymmetry was a MAJOR finding —
  // advance emits PHASE_COMPLETED/VERIFIED/STARTED when crossing phases,
  // but jump did not. Now it does, matching the state machine contract.
  const currentStageForPhase = findStageBySlug(currentSlug);
  const crossesPhaseBoundary =
    !!currentStageForPhase && currentStageForPhase.phase !== targetStage.phase;

  // Update state fields. Thread the (post-edit) state content so the Next
  // Stage projection honours suffix overrides + checkboxes - the advance
  // precedent's threading, applied to the jump path.
  const nextAfterTarget = nextInScopeStage(targetSlug, scope, content);
  const timestamp = isoTimestamp();

  content = setField(content, "Lifecycle Phase", targetStage.phase.toUpperCase());
  content = setField(content, "Current Stage", targetSlug);
  content = setField(content, "Next Stage", nextAfterTarget ? nextAfterTarget.slug : "none");
  content = setField(content, "Active Agent", targetStage.lead_agent);
  content = setField(content, "Status", "Running");
  content = setField(content, "Last Updated", timestamp);
  content = setField(content, "In Progress", targetSlug);
  content = setField(content, "Next Action", `Execute ${targetStage.name}`);

  // Count [x] checkboxes for Completed field
  const completedCount = countCheckboxes(content, "completed");
  content = setField(content, "Completed", String(completedCount));

  // Find last completed stage before target
  const allCheckboxes = parseCheckboxes(content);
  let lastCompleted = "state-init";
  for (let i = targetIdx - 1; i >= 0; i--) {
    const cb = allCheckboxes.find((c) => c.slug === graph[i].slug);
    if (cb && cb.state === "completed") {
      lastCompleted = graph[i].slug;
      break;
    }
  }
  content = setField(content, "Last Completed Stage", lastCompleted);

  // Atomic audit emissions (audit-first — throws before writeStateFile if any fail)
  try {
    // Per-stage STAGE_SKIPPED for every skipped stage (one event per [S] transition)
    for (const skippedSlug of stagesSkipped) {
      emitAudit(pd, "STAGE_SKIPPED", {
        Stage: skippedSlug,
        Reason: `Skipped by jump to ${targetSlug} (${direction})`,
      });
    }

    // Phase boundary events (if crossing phases — matches advance's contract)
    if (crossesPhaseBoundary && currentStageForPhase) {
      emitAudit(pd, "PHASE_COMPLETED", {
        "From phase": currentStageForPhase.phase,
        "To phase": targetStage.phase,
        "Stages completed": String(completedCount),
        Details: `Phase boundary crossed via ${direction} jump`,
      });
      emitAudit(pd, "PHASE_VERIFIED", {
        "Phase boundary": `${currentStageForPhase.phase} → ${targetStage.phase}`,
        Details: "Traceability verification on jump",
      });
      emitAudit(pd, "PHASE_STARTED", {
        Phase: targetStage.phase,
        Scope: scope,
      });
    }

    // The canonical STAGE_JUMPED event for the target itself
    emitAudit(pd, "STAGE_JUMPED", {
      Direction: direction.toUpperCase(),
      Source: currentSlug,
      Target: targetSlug,
      Scope: scope,
      Details: `${direction.toUpperCase()} jump from ${currentSlug} to ${targetSlug} (${targetStage.number}). Scope: ${scope}.`,
    });

    // Target enters Active state — emit STAGE_STARTED so audit reflects the
    // stage transition symmetric with advance's STAGE_STARTED emission.
    emitAudit(pd, "STAGE_STARTED", {
      Stage: targetSlug,
      Agent: targetStage.lead_agent,
    });
  } catch (e) {
    error(`Audit emission failed: ${errorMessage(e)}`);
  }

  writeStateFile(pd, content);

  console.log(
    JSON.stringify({
      direction,
      target: targetSlug,
      target_phase: targetStage.phase.toUpperCase(),
      stages_skipped: stagesSkipped,
      stages_reset: stagesReset,
      state_updated: true,
      audit_appended: true,
      completed_count: completedCount,
      workflow_stopped: false,
      timestamp,
    })
  );
}

// --- Utility ---

function error(msg: string): never {
  const pd = resolveProjectDir(projectDir);
  const command = `amadeus-jump ${process.argv.slice(2).join(" ")}`.trim();
  emitError(pd, "amadeus-jump", command, msg);
}
