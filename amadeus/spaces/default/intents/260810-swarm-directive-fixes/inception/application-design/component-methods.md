# Component Methods

入力: [`requirements.md`](../requirements-analysis/requirements.md)、CodeKB [`architecture.md`](../../../../codekb/amadeus/architecture.md)、[`component-inventory.md`](../../../../codekb/amadeus/component-inventory.md)。型名は設計上の論理型であり、Functional Designで既存型へ写像する。

## C1 Public Interface

```ts
type UnitOutcome = "succeeded" | "failed" | "cancelled";
type UnitKey = { intent: string; stage: string; unit: string; attempt?: string; batch?: string };
type UnitOutcomeEntry = UnitKey & { outcome: UnitOutcome; reason?: string; sequence: number };
type OutcomeProjection = {
  units: readonly UnitOutcomeEntry[];
  unresolvedFailures: readonly UnitOutcomeEntry[];
  constructionSuspended: boolean;
  suspensionReason?: string;
};
type ProjectionDiagnostic = {
  eventId: string;
  sequence: number;
  code: "missing-join-key" | "ambiguous-attempt" | "contradictory-terminal";
  missing: readonly (keyof UnitKey)[];
};
type ProjectionResult =
  | { ok: true; projection: OutcomeProjection }
  | { ok: false; diagnostics: readonly ProjectionDiagnostic[] };

function projectConstructionOutcomes(
  records: readonly NormalizedAuditRecord[],
  context: { intent: string; stage: string },
): ProjectionResult;
```

- malformed / incomplete correlation はUnitOutcomeEntryへ捏造せず`ok:false`の診断として返し、callerはerror directiveへ変換する。
- latest sequence は同一 Unit attempt 内だけで優先し、別 intent / stage / attempt を上書きしない。

## C2 Public Interface

```ts
function effectiveProducerPopulation(
  declaredUnits: readonly string[],
  outcomes: OutcomeProjection,
): { succeeded: readonly string[]; blocking: readonly string[]; cancelled: readonly string[] };

function expandPerUnitConsumes(
  templates: readonly ArtifactConsumeTemplate[],
  succeededUnits: readonly string[],
): readonly ResolvedConsume[];
```

- `blocking` 非空または declared Units 0件では caller が fail-closed。
- 出力は stable Unit order × frontmatter artifact order、重複なし、`{unit-name}` なし。

## C3 Integration Methods

```ts
type FailureTransition =
  | { kind: "continue" }
  | { kind: "retry-unit"; target: UnitKey }
  | { kind: "skip-unit"; target: UnitKey; outcome: "cancelled"; reason: string }
  | { kind: "await-unit-ruling"; target: UnitKey; siblings: readonly UnitOutcomeEntry[] }
  | { kind: "parked"; trigger: UnitKey; preservedOutcomes: readonly UnitOutcomeEntry[] };

function resolveFailureTransition(
  projection: OutcomeProjection,
  selectionContext: BatchSelectionContext,
): FailureTransition;

function resolveConsumerInputs(
  consumer: GraphStage,
  projection: OutcomeProjection,
  disk: PresenceReader,
): { consumes: string[]; consumesAbsent: AbsentConsume[] } | ErrorDirective;
```

- Retry / Skip は単一失敗 Unit Z、Abort は Construction全体。
- `skip-unit`だけがtarget attemptを`cancelled`へ遷移させ、siblingsは入力時outcomeを逐語保持する。複数failedの`await-unit-ruling`順序はoriginal batch order、同順内はUnit slugで決定する。
- presence split はfan-out後にだけ実行する。

## C4 Guard Method

```ts
function assertReviewerInputsAvailable(directive: RunStageDirective): void;
```

- `expected:false` required absence は非0のruntime validation error。
- `expected:true`（scope設計上の欠落）は既存契約どおり許容し、present consumeだけをscopeへ載せる。

## Error Contract

pure component は判別 unionで理由を返し、CLI adapterだけが既存 `kind:"error"` / exit semanticsへ変換する。`report --result failed` は引き続き exit 0 + error directiveであり、新しい受理値を追加しない。

## Audit Join and Conflict Rules

- Unit poolの既存terminal outcome `succeeded | failed | cancelled` をUnit結果の正本とし、`BOLT_FAILED`はhalt reason / Retry・Skip・Abort裁定、`SWARM_BATON_RETURNED`はbatch closureとmember outcome参照を担う。
- Retryは新`attemptId`のacquireで表し、旧failed attemptを改変しない。Skipはcurrent attemptを`cancelled`でsettleしreasonを保持する。Abortは`BOLT_FAILED Reason=aborted`をtriggerとして全Constructionのparked projectionを作るが、siblings outcomeは変更しない。
- 順序はcanonical audit shard merge後の`seq`。同一event identityはdedupeし、同一UnitKey・同一seqで異なるterminal outcomeが残る場合は`contradictory-terminal`でfail-closedする。
- non-swarmでは`batchId`をnullではなく明示的なsolo correlation identityへ正規化し、swarm/soloを同じUnitKey比較へ載せる。
