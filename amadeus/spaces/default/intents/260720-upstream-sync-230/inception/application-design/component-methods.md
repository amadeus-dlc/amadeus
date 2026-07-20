# Component Methods — upstream-sync-230

> 上流入力(consumes 全数): `requirements.md`、`architecture.md`、`component-inventory.md`、`team-practices.md`。`stories.md` は本 scope で SKIP 済み。

以下は design-level の公開 seam であり、詳細な business rule と error 文言は Functional Design で確定する。domain result は class-free の判別 union とし、filesystem mutation 前の validation を必須にする。

## C1: Stage Contract Kernel

```ts
type UnitKind = /* closed vocabulary defined from approved stage model */;
type ContractResult<T> =
  | { kind: "ok"; value: T }
  | { kind: "invalid"; errors: readonly StageContractError[] };

function validateStageFrontmatter(raw: unknown, context: ValidationContext): ContractResult<StageFrontmatter>;
function normalizeUnitKind(raw: unknown): ContractResult<UnitKind>;
function compileStageGraph(stages: readonly StageFrontmatter[]): ContractResult<readonly GraphStage[]>;
function requiredArtifactsForUnit(stage: GraphStage, kind: UnitKind): readonly string[];
```

- unknown kind/field type は `invalid`。`when` は正規化して保持するが評価しない。
- schema、graph、directive、sensor は同じ型と語彙を importし、文字列集合を複製しない。

## C2: Workflow Runtime Correctness

```ts
function recoverBoltDag(state: WorkflowState, units: readonly Unit[]): RecoveryResult<BoltDag>;
function recoverGateRevision(state: WorkflowState, audit: readonly AuditEntry[]): RecoveryResult<WorkflowState>;
function selectNextSwarmBatch(graph: BoltDag, currentRun: RunEvidence): BatchSelection;
function classifyHelpIntent(input: string): HelpRouting;
function inspectComposeMarker(marker: MarkerStat, now: Date): MarkerFreshness;
function assertRecomposeAllowed(state: WorkflowState): GuardResult;
function nextConstructionStep(state: WorkflowState, graph: StageGraph): ConstructionStep;
function previewScopeCost(scope: ScopeName, grid: CompiledGrid): ScopeSummary;
function resolveNextInScopeStage(current: StageSlug, grid: CompiledGrid): StageSlug | null;
```

- recovery は再実行で no-op となり、auditを二重発行しない。
- rejected/failed result は state、audit、marker を不変にする。CLI は判別 union を stdout/stderr/exit codeへ薄く写像する。

## C3: Workspace Inspection

```ts
type WorkspaceScan = {
  root: string;
  nestedRoot?: string;
  nestedCandidates: readonly string[];
  submodules: readonly SubmoduleObservation[];
  advisories: readonly WorkspaceAdvisory[];
};

function inspectWorkspace(root: string, io: ReadOnlyFs): WorkspaceScan;
function detectDepthOneProjects(root: string, io: ReadOnlyFs): readonly ProjectCandidate[];
function inspectSubmodules(root: string, io: ReadOnlyFs): readonly SubmoduleObservation[];
```

- top-level signal がある場合は depth-1探索をしない。候補複数は `nestedRoot` 未設定で返す。
- scan は read-only。birth/detect/doctor は同一 `WorkspaceScan` を表示形式へ写像する。

## C4: Plugin Composition

```ts
type PluginPlanResult =
  | { kind: "ready"; plan: PluginCompositionPlan }
  | { kind: "rejected"; errors: readonly PluginError[] };

function discoverPlugins(sourceRoot: string, io: ReadOnlyFs): readonly PluginDescriptor[];
function inspectPlugin(plugin: PluginDescriptor, host: HostSnapshot): PluginPlanResult;
function planPluginComposition(plugin: ValidPlugin, host: HostSnapshot): PluginCompositionPlan;
function applyPluginPlan(plan: PluginCompositionPlan, tx: WorkspaceTransaction): ApplyResult;
function planPluginDrop(record: PluginRecord, host: HostSnapshot): PluginDropPlan;
function applyPluginDrop(plan: PluginDropPlan, tx: WorkspaceTransaction): DropResult;
function diagnosePlugins(host: HostSnapshot): readonly PluginDiagnostic[];
```

- `inspectPlugin` は same-name stage、malformed manifest、unknown seam、clobberを全数収集し、書込前に拒否する。
- `applyPluginPlan` は temp treeへ適用→C1/C2 compile・sensor確認→atomic commit の順。失敗時は既存bytes不変。
- dropは record所有pathだけを除去し、user-authored pathを推測削除しない。`applyPluginDrop` もtemp treeでcompile/doctorを通してからatomic commitし、失敗時はhost bytes、composition record、auditをすべて不変にする。

## C5: Distribution Projection

```ts
function discoverPluginSources(root: string, io: ReadOnlyFs): readonly PluginSource[];
function buildPluginProjection(plugin: PluginSource, harness: HarnessName): ProjectionResult;
function buildHarnessTree(manifest: HarnessManifest, plugins: readonly PluginSource[]): BuildResult;
function checkHarnessTree(name: HarnessName): readonly Drift[];
function buildSelfInstallProjection(name: SelfInstallHarness): BuildResult;
```

- discovery順、projection path、manifest serialization はcanonical sortで決定的にする。
- plugin 0件の `buildHarnessTree` は既存 `buildTree` と byte-identical。self-install型は既存4面のclosed unionを維持する。

## C6: Harness and Reviewer Adapters

```ts
function spawnHookWithRuntime(args: readonly string[], input: HookInput): SpawnResult;
function parseKiroIdeHookContext(payload: unknown): HookContextResult;
function renderClaudeHookCommand(projectDirVariable: "$CLAUDE_PROJECT_DIR", hook: HookSpec): string;
function reviewerReadScope(unit: UnitRef, consumes: readonly ArtifactRef[]): ReadScope;
function runtimeReviewIdentity(persona: ReviewerPersona, utcDate: string): ReviewHeader;
```

- spawn executable は `process.execPath`。shell commandのproject dirは全箇所でdouble quoteする。
- Kiro adapterはpayload absence/tool failure/agent identityを判別し、timeout raceへfallbackしない。
- reviewer scope外のpathは理由なしで読めず、日付は `date -u` の入力値だけを使う。

## C7: Verification, Documentation, and Ledger

```ts
function classifyDisposition(item: UpstreamItem, evidence: VerificationEvidence): DispositionVerdict;
function traceCoverage(items: readonly UpstreamItem[], evidence: readonly EvidenceRef[]): TraceResult;
function assertPhaseVerification(result: VerificationRun): VerificationResult;
function planLedgerTransition(ledger: Ledger, evidence: CompletionEvidence): LedgerTransitionResult;
```

- EQUIVALENT は characterization evidence が upstream contract全体を満たす場合だけ返す。
- `APPLIED` は24項目、全必須gate、最終SHAが揃うまで拒否する。再実行は既存履歴と同じtransitionを増殖させない。
