// schemaVersion 2（v2 互換ライフサイクル）の Intent 検証。
// 契約は docs/amadeus/lifecycle/state.md と scopes.md に従う。

type LifecycleV2Context = {
  pass: (target: string, condition: string, evidence: string) => void;
  failRow: (target: string, condition: string, evidence: string) => void;
  checkFile: (path: string, condition: string) => void;
};

type LifecycleV2Input = {
  base: string;
  intentId: string;
  state: Record<string, any>;
};

type StageDef = {
  slug: string;
  phase: "ideation" | "inception" | "construction";
  perUnit: boolean;
  scopes: readonly string[];
  requiredArtifacts: readonly string[];
};

const scopeValues = new Set([
  "enterprise",
  "feature",
  "mvp",
  "poc",
  "bugfix",
  "refactor",
  "infra",
  "security-patch",
  "workshop",
]);

const depthValues = new Set(["Minimal", "Standard", "Comprehensive"]);
const statusValues = new Set(["in_progress", "parked", "completed"]);
const phaseValues = ["ideation", "inception", "construction", "completed"] as const;
const stageStateValues = new Set(["pending", "active", "awaiting_approval", "revising", "completed", "skipped"]);
const approvalViaValues = new Set(["conversation", "pr"]);
const autonomyValues = new Set(["continue_autonomously", "gate_every_bolt"]);

const businessScopes = ["enterprise", "feature", "mvp"];
const inceptionScopes = [...businessScopes, "workshop"];

// scope 対応は skills/amadeus/references/stage-catalog.md の表と一致させる。
const stageCatalog: readonly StageDef[] = [
  { slug: "intent-capture", phase: "ideation", perUnit: false, scopes: [...businessScopes, "poc"], requiredArtifacts: ["ideation/intent-capture/stakeholder-map.md"] },
  { slug: "market-research", phase: "ideation", perUnit: false, scopes: ["enterprise", "feature"], requiredArtifacts: ["ideation/market-research/competitive-analysis.md", "ideation/market-research/market-trends.md", "ideation/market-research/build-vs-buy.md"] },
  { slug: "feasibility", phase: "ideation", perUnit: false, scopes: businessScopes, requiredArtifacts: ["ideation/feasibility/feasibility-assessment.md", "ideation/feasibility/constraint-register.md", "ideation/feasibility/raid-log.md"] },
  { slug: "scope-definition", phase: "ideation", perUnit: false, scopes: businessScopes, requiredArtifacts: ["ideation/scope-definition/scope-document.md", "ideation/scope-definition/intent-backlog.md"] },
  { slug: "team-formation", phase: "ideation", perUnit: false, scopes: ["enterprise", "feature"], requiredArtifacts: ["ideation/team-formation/team-assessment.md", "ideation/team-formation/skill-matrix.md", "ideation/team-formation/mob-composition.md"] },
  { slug: "rough-mockups", phase: "ideation", perUnit: false, scopes: businessScopes, requiredArtifacts: ["ideation/rough-mockups/wireframes.md", "ideation/rough-mockups/user-flow.md"] },
  { slug: "approval-handoff", phase: "ideation", perUnit: false, scopes: ["enterprise", "feature"], requiredArtifacts: ["ideation/approval-handoff/initiative-brief.md", "ideation/decisions.md", "ideation/traceability.md"] },
  { slug: "reverse-engineering", phase: "inception", perUnit: false, scopes: [...businessScopes, "poc", "bugfix", "refactor", "security-patch", "workshop"], requiredArtifacts: [] },
  { slug: "practices-discovery", phase: "inception", perUnit: false, scopes: [...inceptionScopes, "infra"], requiredArtifacts: ["inception/practices-discovery/team-practices.md", "inception/practices-discovery/discovered-rules.md", "inception/practices-discovery/evidence.md", "inception/practices-discovery/timestamp.md"] },
  { slug: "requirements-analysis", phase: "inception", perUnit: false, scopes: [...inceptionScopes, "poc", "bugfix", "refactor", "infra"], requiredArtifacts: ["inception/requirements-analysis/requirements.md"] },
  { slug: "user-stories", phase: "inception", perUnit: false, scopes: inceptionScopes, requiredArtifacts: ["inception/user-stories/stories.md", "inception/user-stories/personas.md", "inception/user-stories/assessment.md"] },
  { slug: "refined-mockups", phase: "inception", perUnit: false, scopes: inceptionScopes, requiredArtifacts: ["inception/refined-mockups/mockups.md", "inception/refined-mockups/interaction-spec.md", "inception/refined-mockups/design-system-mapping.md", "inception/refined-mockups/accessibility-checklist.md"] },
  { slug: "application-design", phase: "inception", perUnit: false, scopes: inceptionScopes, requiredArtifacts: ["inception/application-design/components.md", "inception/application-design/component-methods.md", "inception/application-design/services.md", "inception/application-design/component-dependency.md", "inception/application-design/design-decisions.md"] },
  { slug: "units-generation", phase: "inception", perUnit: false, scopes: inceptionScopes, requiredArtifacts: ["inception/units-generation/units.md", "inception/units-generation/unit-dependencies.md"] },
  { slug: "delivery-planning", phase: "inception", perUnit: false, scopes: inceptionScopes, requiredArtifacts: ["inception/delivery-planning/bolt-plan.md", "inception/delivery-planning/risk-and-sequencing-rationale.md", "inception/delivery-planning/external-dependency-map.md"] },
  { slug: "functional-design", phase: "construction", perUnit: true, scopes: [...inceptionScopes, "refactor"], requiredArtifacts: ["functional-design/business-logic-model.md", "functional-design/business-rules.md", "functional-design/domain-entities.md"] },
  { slug: "nfr-requirements", phase: "construction", perUnit: true, scopes: [...inceptionScopes, "infra", "security-patch"], requiredArtifacts: ["nfr-requirements/performance-requirements.md", "nfr-requirements/security-requirements.md", "nfr-requirements/scalability-requirements.md", "nfr-requirements/reliability-requirements.md", "nfr-requirements/tech-stack-decisions.md"] },
  { slug: "nfr-design", phase: "construction", perUnit: true, scopes: [...inceptionScopes, "infra"], requiredArtifacts: ["nfr-design/performance-design.md", "nfr-design/security-design.md", "nfr-design/scalability-design.md", "nfr-design/reliability-design.md", "nfr-design/logical-components.md"] },
  { slug: "infrastructure-design", phase: "construction", perUnit: true, scopes: [...inceptionScopes, "infra"], requiredArtifacts: ["infrastructure-design/deployment-architecture.md", "infrastructure-design/infrastructure-services.md", "infrastructure-design/monitoring-design.md", "infrastructure-design/cicd-pipeline.md"] },
  { slug: "code-generation", phase: "construction", perUnit: true, scopes: [...inceptionScopes, "poc", "bugfix", "refactor", "security-patch"], requiredArtifacts: ["code-generation/plan.md", "code-generation/summary.md"] },
  { slug: "build-and-test", phase: "construction", perUnit: false, scopes: [...inceptionScopes, "poc", "bugfix", "refactor", "security-patch"], requiredArtifacts: [] },
  { slug: "ci-pipeline", phase: "construction", perUnit: false, scopes: [...inceptionScopes, "infra"], requiredArtifacts: ["construction/ci-pipeline/ci-config.md", "construction/ci-pipeline/quality-gates.md"] },
] as const;

const stageBySlug = new Map(stageCatalog.map((stage) => [stage.slug, stage]));

function expectedStageSlugs(scope: string): Set<string> {
  return new Set(stageCatalog.filter((stage) => stage.scopes.includes(scope)).map((stage) => stage.slug));
}

export function checkLifecycleV2Intent(ctx: LifecycleV2Context, input: LifecycleV2Input): void {
  const statePath = `${input.base}/state.json`;
  ctx.pass(statePath, "schemaVersion 2 の Intent を v2 互換ライフサイクルとして検証する", "schemaVersion=2");

  checkRootFields(ctx, statePath, input);
  const scope = String(input.state.scope ?? "");
  if (!scopeValues.has(scope)) return;

  checkCurrentStage(ctx, statePath, input.state, scope);
  checkStages(ctx, statePath, input, scope);
  checkPhaseGates(ctx, statePath, input.state);
  checkBolts(ctx, statePath, input.state);
  checkCompletedArtifacts(ctx, input);
}

function checkRootFields(ctx: LifecycleV2Context, statePath: string, input: LifecycleV2Input): void {
  checkAllowedValue(ctx, statePath, "`scope` が既知の値である", input.state.scope, scopeValues);
  checkAllowedValue(ctx, statePath, "`depth` が既知の値である", input.state.depth, depthValues);
  checkAllowedValue(ctx, statePath, "`status` が既知の値である", input.state.status, statusValues);
  checkAllowedValue(ctx, statePath, "`phase` が既知の値である", input.state.phase, new Set(phaseValues));

  if (String(input.state.intentId ?? "") === input.intentId) {
    ctx.pass(statePath, "`intentId` が Intent ディレクトリ名と一致する", input.intentId);
  } else {
    ctx.failRow(statePath, "`intentId` が Intent ディレクトリ名と一致する", String(input.state.intentId ?? ""));
  }

  if (String(input.state.status) === "completed" && String(input.state.phase) !== "completed") {
    ctx.failRow(statePath, "`status` が completed の場合 `phase` も completed である", String(input.state.phase));
  }
}

function checkCurrentStage(ctx: LifecycleV2Context, statePath: string, state: Record<string, any>, scope: string): void {
  const condition = "`currentStage` が scope の実行対象である";
  if (String(state.phase) === "completed" && state.currentStage === undefined) {
    ctx.pass(statePath, condition, "phase completed のため不要");
    return;
  }
  checkAllowedValue(ctx, statePath, condition, state.currentStage, expectedStageSlugs(scope));
}

function checkAllowedValue(ctx: LifecycleV2Context, statePath: string, condition: string, actual: unknown, allowed: Set<string>): void {
  const value = String(actual ?? "");
  if (allowed.has(value)) {
    ctx.pass(statePath, condition, value);
  } else {
    ctx.failRow(statePath, condition, value === "" ? "未設定" : value);
  }
}

function checkStages(ctx: LifecycleV2Context, statePath: string, input: LifecycleV2Input, scope: string): void {
  const stages = input.state.stages;
  if (typeof stages !== "object" || stages === null || Array.isArray(stages)) {
    ctx.failRow(statePath, "`stages` のキー集合が scope の実行対象と一致する", "stages がオブジェクトではない");
    return;
  }

  const expected = expectedStageSlugs(scope);
  const actual = new Set(Object.keys(stages));
  const missing = [...expected].filter((slug) => !actual.has(slug));
  const extra = [...actual].filter((slug) => !expected.has(slug));
  if (missing.length === 0 && extra.length === 0) {
    ctx.pass(statePath, "`stages` のキー集合が scope の実行対象と一致する", `${scope}: ${actual.size} ステージ`);
  } else {
    const detail = [missing.length > 0 ? `不足: ${missing.join(", ")}` : "", extra.length > 0 ? `過剰: ${extra.join(", ")}` : ""].filter(Boolean).join(" / ");
    ctx.failRow(statePath, "`stages` のキー集合が scope の実行対象と一致する", detail);
  }

  for (const [slug, entry] of Object.entries(stages as Record<string, any>)) {
    const stage = stageBySlug.get(slug);
    if (!stage) continue;
    if (stage.perUnit && entry && typeof entry === "object" && entry.units && typeof entry.units === "object") {
      const unitEntries = Object.entries(entry.units as Record<string, any>);
      if (unitEntries.length === 0) {
        ctx.failRow(statePath, "Unit 単位ステージの `units` が空ではない", slug);
        continue;
      }
      for (const [unitId, unitEntry] of unitEntries) {
        checkStageEntry(ctx, statePath, `${slug}.units.${unitId}`, unitEntry);
      }
      continue;
    }
    checkStageEntry(ctx, statePath, slug, entry);
  }
}

function checkStageEntry(ctx: LifecycleV2Context, statePath: string, label: string, entry: any): void {
  const state = String(entry?.state ?? "");
  if (!stageStateValues.has(state)) {
    ctx.failRow(statePath, "ステージ状態が既知の値である", `${label}: ${state === "" ? "未設定" : state}`);
    return;
  }
  ctx.pass(statePath, "ステージ状態が既知の値である", `${label}: ${state}`);
  if (state !== "completed") return;

  const approval = entry?.approval;
  if (!approval || typeof approval !== "object" || String(approval.approvedAt ?? "") === "") {
    ctx.failRow(statePath, "completed のステージは approval evidence を持つ", `${label}: approval.approvedAt がない`);
    return;
  }
  const via = String(approval.via ?? "");
  if (!approvalViaValues.has(via)) {
    ctx.failRow(statePath, "approval の `via` が既知の値である", `${label}: ${via === "" ? "未設定" : via}`);
    return;
  }
  if (via === "pr" && String(approval.reference ?? "") === "") {
    ctx.failRow(statePath, '`via: "pr"` の approval は `reference` を持つ', `${label}: reference がない`);
    return;
  }
  ctx.pass(statePath, "completed のステージは approval evidence を持つ", `${label}: ${via}`);
}

function checkPhaseGates(ctx: LifecycleV2Context, statePath: string, state: Record<string, any>): void {
  const phase = String(state.phase ?? "");
  const order = phaseValues.indexOf(phase as (typeof phaseValues)[number]);
  if (order <= 0) return;

  const gates = state.phaseGates;
  for (const previous of phaseValues.slice(0, order)) {
    if (previous === "completed") continue;
    const gate = gates && typeof gates === "object" ? gates[previous] : undefined;
    if (!gate || typeof gate !== "object") {
      ctx.failRow(statePath, "先行 phase の `phaseGates` が記録されている", `${previous} の記録がない`);
      continue;
    }
    if (gate.skipped === true) {
      ctx.pass(statePath, "先行 phase の `phaseGates` が記録されている", `${previous}: skipped`);
      continue;
    }
    if (String(gate.approvedAt ?? "") === "" || String(gate.via ?? "") !== "pr" || String(gate.reference ?? "") === "") {
      ctx.failRow(statePath, "phaseGates の evidence が approvedAt、via、reference を持つ", `${previous}`);
      continue;
    }
    ctx.pass(statePath, "先行 phase の `phaseGates` が記録されている", `${previous}: pr`);
  }
}

function checkBolts(ctx: LifecycleV2Context, statePath: string, state: Record<string, any>): void {
  if (state.autonomy !== undefined) {
    checkAllowedValue(ctx, statePath, "`autonomy` が既知の値である", state.autonomy, autonomyValues);
  }
  const bolts = state.bolts;
  if (bolts === undefined) return;
  if (typeof bolts !== "object" || bolts === null || Array.isArray(bolts)) {
    ctx.failRow(statePath, "Bolt 状態が既知の値である", "bolts がオブジェクトではない");
    return;
  }
  for (const [boltId, entry] of Object.entries(bolts as Record<string, any>)) {
    const boltState = String(entry?.state ?? "");
    if (!stageStateValues.has(boltState)) {
      ctx.failRow(statePath, "Bolt 状態が既知の値である", `${boltId}: ${boltState === "" ? "未設定" : boltState}`);
      continue;
    }
    ctx.pass(statePath, "Bolt 状態が既知の値である", `${boltId}: ${boltState}`);
    if (boltState !== "completed") continue;
    const gate = entry?.gate;
    if (!gate || String(gate.approvedAt ?? "") === "" || String(gate.via ?? "") !== "pr" || String(gate.reference ?? "") === "") {
      ctx.failRow(statePath, "completed の Bolt は PR の gate evidence を持つ", boltId);
    } else {
      ctx.pass(statePath, "completed の Bolt は PR の gate evidence を持つ", boltId);
    }
  }
}

function checkCompletedArtifacts(ctx: LifecycleV2Context, input: LifecycleV2Input): void {
  const stages = input.state.stages;
  if (typeof stages !== "object" || stages === null) return;

  for (const [slug, entry] of Object.entries(stages as Record<string, any>)) {
    const stage = stageBySlug.get(slug);
    if (!stage) continue;
    if (stage.perUnit) {
      checkPerUnitArtifacts(ctx, input.base, stage, entry);
      continue;
    }
    if (String(entry?.state ?? "") !== "completed") continue;
    for (const artifact of stage.requiredArtifacts) {
      ctx.checkFile(`${input.base}/${artifact}`, "completed のステージは必須成果物を持つ");
    }
  }

  checkCompletedBoltArtifacts(ctx, input);
}

function checkPerUnitArtifacts(ctx: LifecycleV2Context, base: string, stage: StageDef, entry: any): void {
  const units = entry?.units;
  if (!units || typeof units !== "object") return;
  for (const [unitId, unitEntry] of Object.entries(units as Record<string, any>)) {
    if (unitId === "implicit") continue;
    if (String(unitEntry?.state ?? "") !== "completed") continue;
    for (const artifact of stage.requiredArtifacts) {
      ctx.checkFile(`${base}/construction/${unitId}/${artifact}`, "completed のステージは必須成果物を持つ");
    }
  }
}

function checkCompletedBoltArtifacts(ctx: LifecycleV2Context, input: LifecycleV2Input): void {
  const bolts = input.state.bolts;
  if (!bolts || typeof bolts !== "object") return;
  const boltArtifacts = ["build-instructions.md", "unit-test-instructions.md", "summary.md", "test-results.md"];
  for (const [boltId, entry] of Object.entries(bolts as Record<string, any>)) {
    if (boltId === "implicit") continue;
    if (String(entry?.state ?? "") !== "completed") continue;
    for (const artifact of boltArtifacts) {
      ctx.checkFile(`${input.base}/construction/bolts/${boltId}/${artifact}`, "completed のステージは必須成果物を持つ");
    }
  }
}
