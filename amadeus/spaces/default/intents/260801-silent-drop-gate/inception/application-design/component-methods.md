# Component Methods — no-silent-drop

## 設計入力

公開 method は `requirements.md` の閉じた result schema と failure contract、`architecture.md`／`component-inventory.md` の既存 gate seam、`team-practices.md` の test-first 方針に従う。以下は Application Design の interface であり、AST pattern や business rule の詳細は Functional Design で確定する。

## 共通型

```ts
type RuleId = "NSD001" | "NSD002" | "NSD003";
type NonEmptyArray<T> = readonly [T, ...T[]];

type GateResult =
  | { schemaVersion: 1; status: "pass"; code: "NO_SILENT_DROP_OK"; message: string; findings: []; scan: ScanSummary }
  | { schemaVersion: 1; status: "violations"; code: "POLICY_VIOLATIONS"; message: string; findings: NonEmptyArray<Finding>; scan: ScanSummary }
  | { schemaVersion: 1; status: "error"; code: InfraCode; message: string; findings: []; scan: ScanSummary | null };

type TextMutationResult =
  | { kind: "changed"; content: string }
  | { kind: "not-found"; target: string };
```

`Finding`、`ScanSummary`、`InfraCode` は `requirements.md` FR-09 の閉集合をそのまま使用する。`GateResult` に optional success／error field を足して分岐を曖昧にしない。

`changed` は「一意な対象が見つかり、返却 content を再 parse すると期待 postcondition が成立する」という operation outcome である。既に期待値である idempotent set は同じ bytes の `changed`、対象0件は `not-found` とする。重複／malformed line は `ValidatedStageState` の生成に失敗するため、この2分岐へ入らない。

## C1 Gate Contract

```ts
function loadGateContract(mode: "check" | "census-evidence" | "approve-evidence" | "baseline-candidate", input: ContractFiles, io: ReadTextPort): ContractLoadResult;
function loadTrustedPreviousLedgers(baseRevision: GitObjectId, git: GitReadPort): PreviousLedgerResult;
function validateGateContract(contract: unknown): ContractValidationResult;
function ruleForId(contract: GateContract, ruleId: RuleId): RuleDefinition;
function classifyCatalogCandidate(candidate: ApiCandidate, catalog: StatusCatalog): "included" | "excluded";
function semanticContractFor(candidate: StructuralCandidate, catalog: SemanticCatalog): SemanticContractResult;
```

- `loadGateContract`: config、catalog、rule、exemption を明示 path から読む。`check` では baseline と trusted base revision を必須とし、欠落を `BASELINE_MISSING` にする。evidence modes だけは bootstrap のため baseline 非依存だが、空 baseline を捏造しない。
- `loadTrustedPreviousLedgers`: CI event が明示した full Git object ID だけを受け、shell を介さない `git show <base>:<literal-ledger-path>` で base baseline／exemption bytes を読む。current ledger の `previousDigest` はこの bytes の digest と一致しなければならない。初回 baseline が base にない場合だけ、current tree の `bootstrap-provenance.json` に含む approved `B_pre`／candidate `B0` digest、初期 exemption identity set／digest を検証して previous-set とする。base object 不明は `INTERNAL_ERROR`、base に存在すべき ledger 欠落は `BASELINE_MISSING` とする。
- `validateGateContract`: schema version、3 roots、拡張子、除外、RuleId、初回 `NSD002` catalog の exact set、`NSD001` の許可 union／transition、`NSD003` の write／postcondition／success outcome 対応表を検証する。
- `ruleForId`: unknown rule を返さず `RULE_INVALID` へ変換可能な result を返す。
- `classifyCatalogCandidate`: census の全候補を included／excluded のどちらかへ閉じる。名前ヒューリスティックだけで included にしない。
- `semanticContractFor`: symbol identity、宣言済み return union、許可 variant、path constraint を返す。catalog と TypeScript symbol が一意に対応しない場合は `RULE_INVALID` とする。

## C2 Source Manifest Scanner

```ts
function buildExpectedManifest(config: ScanConfig, fs: ScanFsPort): ManifestResult;
function readSourceSnapshot(manifest: SourceManifest, fs: ScanFsPort): SourceSnapshotResult;
function materializeReadOnlyMirror(snapshot: SourceSnapshot, temp: TempCorpusPort): MirrorCorpusResult;
function verifyScanReceipts(expected: SourceManifest, receipts: readonly ScanReceipt[]): ReceiptVerificationResult;
function verifySourceStability(before: SourceManifest, mirror: MirrorCorpus, fs: ScanFsPort, temp: TempCorpusPort): StabilityResult;
```

- `buildExpectedManifest`: regular file のみを正規化し、symlink、root 欠落、読取不能、0件を typed error にする。
- `readSourceSnapshot`: path、language、bytes、SHA-256 を対応付ける。同じ元 path を2回読まず、以後の解析はこの bytes だけを使う。
- `materializeReadOnlyMirror`: snapshot bytes を isolated mirror に書き、全 mirror digest が snapshot digest と一致する場合だけ path map を返す。元 source は参照しない。
- `verifyScanReceipts`: 内部 coverage sentinel が返した repository path と snapshot digest の組を expected と比較し、完全一致の場合だけ success。検出 finding の有無を receipt に使わない。
- `verifySourceStability`: ast-grep 後の mirror digest が snapshot と一致し、元 source の再 manifest も走査前と一致する場合だけ success。finding と semantic projection は常に snapshot bytes に由来するため、一時的な元 source 変更と結果 bytes が混在しない。

## C3 Ast-grep Rule Adapter

```ts
interface ProcessPort {
  run(command: string, argv: readonly string[]): Promise<ProcessResult>;
}

function resolveAstGrepBinary(resolve: ResolveBinaryPort): BinaryResolutionResult;
function buildAstGrepArgv(bundle: RuleBundle, mirrorRoot: string): readonly string[];
function decodeAstGrepJson(stdout: Uint8Array): AstGrepDecodeResult;
async function runAstGrep(request: AstGrepRequest, process: ProcessPort): Promise<AstGrepRunResult>;
```

- `resolveAstGrepBinary`: repository-local exact dependencyだけを解決し、PATH fallback／network resolution を行わない。
- `buildAstGrepArgv`: shell string を作らず argv 配列を返す。rule bundle は `NSD001`〜`NSD003` の candidate rule と、各 file の root `program` をちょうど1件返す内部 coverage sentinel を含む。
- `decodeAstGrepJson`: unknown field や sentinel 重複を無視して成功扱いしない。stdout JSON schema mismatch は `INTERNAL_ERROR` とする。
- `runAstGrep`: read-only mirror を1回走査し、exit、stdout、stderr を一度だけ分類する。sentinel match を path map と snapshot digest に結合して `ScanReceipt` を返す。spawn ENOENT は `TOOL_MISSING`、timeout／signal／spawn I/O failure は `INTERNAL_ERROR`、process が起動して nonzero exit なら stderr 文言を解析せず `RULE_INVALID` とする。どの failure も違反0件にしない。

## C4 Census Normalizer

```ts
function createSemanticProgram(snapshot: SourceSnapshot, compiler: TypeScriptCompilerPort): SemanticProgramResult;
function classifyCandidate(candidate: AstGrepMatch, program: SemanticProgram, contract: SemanticCatalog): SemanticClassificationResult;
function evaluateCatalogPaths(candidate: SemanticCandidate, contract: PathContract): PathEvaluationResult;
function normalizeRawMatch(match: ClassifiedMatch, source: SourceSnapshot, rule: RuleDefinition): FindingNormalizationResult;
function astFingerprint(node: AstNodeProjection): string;
function normalizeCensus(matches: readonly ClassifiedMatch[], sources: SourceSnapshot): CensusResult;
function enumerateStructuralStatusCandidates(matches: readonly AstGrepMatch[]): StructuralCandidateResult;
function classifyStatusCandidates(candidates: readonly StructuralCandidate[], program: SemanticProgram, catalog: SemanticCatalog, dependencyReceipt: SemanticDependencyReceipt): ApiCandidateCensusResult;
```

- `createSemanticProgram`: authored target path は snapshot bytes を必ず overlay し、repository-local TypeScript `Program`／`TypeChecker` を作る。compiler lib と external declaration は frozen install／tsconfig から読み、path＋digest の semantic dependency receipt を evidence に含める。解析中に authored target の元 filesystem を再読しない。
- `classifyCandidate`: ast-grep candidate の callee symbol、return union、discriminant variant、Result 消費を C1 catalog と照合する。型解決不能／複数 contract 一致は `RULE_INVALID` とし、除外扱いにしない。
- `evaluateCatalogPaths`: catalog に列挙した catch terminal、必須 write、postcondition、success outcome について、分岐／早期 return を含む全構文 path を保守的に評価する。証明できない path は semantic-unresolved として `RULE_INVALID` にする。
- `astFingerprint`: node kind、正規化 token、必要な親 context を hash し、line number を identity に含めない。
- `normalizeCensus`: identity で一意化し、同一 identity の重複を error にし、identity 順で sort する。
- `enumerateStructuralStatusCandidates`: ast-grep が返した status-return／write／success 構造候補を identity 順に列挙するだけで、型分類は行わない。
- `classifyStatusCandidates`: 同一 snapshot の `SemanticProgram`、C1 catalog、compiler／external declaration の `SemanticDependencyReceipt` を必須入力とし、discriminated union return と success/write 対応候補を全件 included／excluded／unresolved のいずれかへ分類する。別 Program や receipt digest 不一致は `RULE_INVALID` とする。

## C5 Baseline & Exemption Policy

```ts
function parseBaseline(raw: unknown): BaselineParseResult;
function parseExemptions(raw: unknown): ExemptionParseResult;
function evaluateExemptions(raw: readonly Finding[], markers: readonly MarkerNode[], exemptions: ExemptionLedger): ExemptionApplicationResult;
function evaluateBaseline(effective: readonly Finding[], baseline: Baseline): BaselineVerdict;
function evaluateLedgerRatchets(previous: TrustedPreviousLedgers, currentBaseline: Baseline, currentExemptions: ExemptionLedger): LedgerRatchetResult;
function compareIdentitySets(previous: ReadonlySet<string>, next: ReadonlySet<string>): RatchetVerdict;
function classifyPrecision(findings: readonly ClassifiedFinding[]): PrecisionResult;
function approveCensusEvidence(census: RawCensusEvidence, classifications: ClassificationLedger, approval: ApprovalReceipt): ApprovedCensusEvidenceResult;
function buildBaselineCandidate(pre: CensusEvidence, post: CensusEvidence, issueIdentities: IssueIdentityContract): BaselineCandidateResult;
```

- `evaluateExemptions`: marker grammar、直後の単一 `NSD002` ExpressionStatement、非空 reason、陳腐化を検証し、`{ rawFindings, appliedExemptionIdentities, effectiveFindings, policyFindings }` を返す。`effectiveFindings = rawFindings - valid NSD002 exemptions` であり、`NSD001`／`NSD003` は除けない。
- `evaluateBaseline`: committed baseline が保持する unexempted TP identity 集合と `effectiveFindings` を比較し、subset だけを許可する。exemption を外した source finding は effective set に復帰して新規 identity として拒否される。
- `evaluateLedgerRatchets`: trusted base baseline／exemption set と current ledger set をそれぞれ比較し、追加および同数置換を拒否する。source finding と current ledger の同時追加でも、previous set を current tree から読まないため隠蔽できない。承認済み増加は scope change で pre-authorized delta を base revision に先行配置する別 workflow とし、本 intent の通常 check は許可しない。
- `compareIdentitySets`: added／removed／retained を返し、同数置換を `RATCHET_REPLACEMENT` にする。
- `classifyPrecision`: finding 0件を fixture 100%の場合だけ0.0%とする。
- `approveCensusEvidence`: raw census の全 identity と classification entry が全単射で、manifest／rule bundle／semantic dependency digest が一致し、approval receipt が classification digest、reviewer、承認時刻、human gate audit event ID を結合し、FP entry が0件の場合だけ immutable approved evidence を作る。不足、余剰、重複、digest mismatch、空理由、FP 1件以上は拒否する。
- `buildBaselineCandidate`: pre／post approved evidenceのFP=0を再検証し、`B_pre = pre.effectiveTpIdentities`、`B0 = post.effectiveTpIdentities` とする。`B0 ⊂ B_pre`、削除集合が #1878／#1874 identity と一致、追加集合が空の場合だけ candidate bytes を返す。正本 file は書かない。

## C6 Gate Command & Result Renderer

```ts
async function runNoSilentDrop(deps: GateDependencies): Promise<GateResult>;
async function runCensusEvidence(deps: EvidenceDependencies, outputPath: string): Promise<EvidenceCommandResult>;
async function runApproveEvidence(deps: EvidenceApprovalDependencies, censusPath: string, classificationPath: string, approvalPath: string, outputPath: string): Promise<EvidenceCommandResult>;
async function runBaselineCandidate(deps: CandidateDependencies, prePath: string, postPath: string, outputPath: string): Promise<EvidenceCommandResult>;
function renderMachineResult(result: GateResult): string;
function renderHumanSummary(result: GateResult): string;
function exitCodeFor(result: GateResult): 0 | 1 | 2;
```

`runNoSilentDrop` の固定順序は Contract(`check`) → Trusted Base Ledgers → Current Ledger Ratchets → Expected Manifest → Source Snapshot → Read-only Mirror → ast-grep＋Coverage Sentinel → Receipt／Stability → Semantic Classification／Census → Exemption Application → Baseline(effective set) → Result とする。前段が Error なら後段を実行せず、manifest 確定後だけ `ScanSummary` を保持する。entrypoint だけが stdout、stderr、`process.exitCode` を各1回設定する。

初回 bootstrap は次の一方向手順で循環を避ける。

1. 修正前 revision で `runCensusEvidence(..., C_pre-raw.json)` を実行する。baseline は読まず、raw／exempted／effective census と全 digest を明示 path に出す。
2. 人間が全 identity の TP／FP、非空理由、reviewer を `classification-pre.json` に記録する。FPが1件でもあればclassifier／catalog／fixtureを修正してraw censusから再実行し、FP=0になったclassificationだけについてquality review／human gateがclassification digestを結合した `approval-pre.json` を発行する。
3. `runApproveEvidence(C_pre-raw, classification-pre, approval-pre, C_pre-approved)` が全単射、digest、approval audit event を検証する。
4. #1878／#1874 修正後にも同じ3 command／approval 手順で `C_post-approved` を作る。
5. `runBaselineCandidate(C_pre-approved, C_post-approved, candidate-B0.json)` が集合条件を検証し、candidate と `bootstrap-provenance.json` を新規 path にだけ書く。
6. 人間レビュー済み candidate を通常の repository change で `baseline.json` へ昇格する。その後初めて `runNoSilentDrop(check --base-revision <CI event SHA>)` を blocking gate として実行する。

## R1／R2 Text Mutation Boundary

```ts
function validateStageState(content: string): StageStateValidationResult;
function setCheckbox(content: ValidatedStageState, slug: string, state: CheckboxState): TextMutationResult;
function setStageSuffix(content: ValidatedStageState, slug: string, suffix: "EXECUTE" | "SKIP"): TextMutationResult;
function requireChanged(result: TextMutationResult, context: MutationContext): string;

class StateMutationInvariantError extends Error {
  readonly code = "STATE_MUTATION_INVARIANT";
  constructor(
    readonly target: string,
    readonly operation: "checkbox" | "suffix",
    readonly reason: "reparse-failed" | "postcondition-failed" | "non-target-changed",
  );
}
```

- `validateStageState` は stage slug ごとに canonical line がちょうど1件であることを検査して opaque `ValidatedStageState` を作る。重複、malformed section／checkbox／suffix は既存 typed validation failure であり、setter を呼ばない。全 R2 caller はこの precondition を共有する。
- helper は対象 slug が1件なら replacement 後を再 parse し、期待 marker／suffix を確認して `changed` を返す。既に期待値なら同じ bytes の idempotent `changed`、0件だけは bytes 不変の `not-found` とする。setter の構築algorithmが破損して再parse／postconditionに失敗した場合だけ module-internal `StateMutationInvariantError` をthrowし、通常の `TextMutationResult` 分岐には追加しない。
- R2 のtransaction boundaryは setter 呼出全体を囲み、`StateMutationInvariantError` だけを型guardでcatchして `MutationTransaction.failed(invariant)` へ遷移させ、既存CLI errorへ写像する。未知のexceptionはcatch内で畳まず外側の既存internal error boundaryへ再throwする。validation／not-found／duplicate-target／invariantの診断先はstderrだけであり、state bytesと全永続audit bytesを呼出前から変えない。write／audit／success JSONより前に停止し、retry上限は0とする。

## R3／R4 Mirror Failure Propagation

```ts
function persistBlocked(
  ports: MirrorStateStorePorts,
  context: MirrorExecutionContext,
  snapshot: MirrorStateSnapshot,
  receipt: MirrorOperationReceipt,
  classification: MirrorFailureClass,
  summary: string,
  effect?: MirrorMutationEffect,
): MirrorOperationOutcome;
```

R4 entryは module-internal `OperationPreparationResult = ready(snapshot) | maintenance-blocked(progress, snapshot, summary) | maintenance-completed(snapshot)` を返す。既存outboxがあるinvocationはmaintenance-onlyとし、blocked／completedのどちらも今回transitionを構築・評価しない。既存 `stateFailure(..., effect="not-started", retryable=true)` を返して終端し、callerが続行する場合だけ後続invocationを明示的に開始する。

`ready` の後だけ、内部 `StateResult` は `{ kind: "ok"; snapshot; commit: "clean" | "outbox-pending" } | { kind: "failed"; phase: "pre-commit" | "durability-unknown"; summary }` を生成する。atomic adapterがtyped `phase` を設定し、summary prefixは分岐に使わない。`persistBlocked` は `failed(pre-commit)` を既存 `stateFailure(..., effect="not-started", retryable=false)`、`failed(durability-unknown)` を `stateFailure(..., effect="outcome-unknown", retryable=false)`、`ok` だけを元のbusiness `safety-blocked` へ写像する。公開 `MirrorOperationOutcome`／`MirrorWarning` unionは変更しない。

| Failure source | `StateResult`／outcome | Retry／recovery |
|---|---|---|
| prior outbox maintenance blocked／completed | current-transition `StateResult` なし → `stateFailure`、classification=`state-write`、effect=`not-started`、retryable=true | 今回transition評価0回。後続invocationだけを許可 |
| `ready` 後のlock〜rename 前 | `failed(pre-commit)` → `stateFailure`、warning classification=`state-write`、effect=`not-started` | invocation 内0回、呼出開始bytes 不変 |
| rename 後 directory fsync | `failed(durability-unknown)` → `stateFailure`、warning classification=`state-write`、effect=`outcome-unknown` | invocation 内0回、次回 read／recovery で old/new を判定 |
| state commit 後 audit append failure | `ok(outbox-pending)` → intended `safety-blocked` | committed snapshot の outbox を次回 drain、重複防止 transaction ID |
| audit append 後 outbox clear failure | `ok(outbox-pending)` → intended `safety-blocked` | stale outbox を次回 idempotent drain／clear |

## Error handling の共通原則

- pure component は throw を正常分岐に使わず discriminated result を返す。
- entrypoint の予期しない例外だけを `INTERNAL_ERROR` に変換する。
- stderr は人間向けであり、CI／test は stdout JSON と exit code を正本にする。
- failure を empty array、unchanged string、warning-only success へ変換しない。

## Infrastructure error の exhaustive mapping

| Failure source | InfraCode | `scan` |
|---|---|---|
| repository-local binary 解決失敗／spawn ENOENT | `TOOL_MISSING` | manifest 確定後の `ScanSummary` |
| config／catalog／rule schema 不正、起動済み ast-grep の nonzero exit、semantic contract 解決不能 | `RULE_INVALID` | contract 時は `null`、解析時は `ScanSummary` |
| `check` の baseline 欠落／schema 不正 | `BASELINE_MISSING`／`BASELINE_INVALID` | `null` |
| root 欠落／対象0件／symlink／source unreadable | `SCAN_ROOT_MISSING`／`SCAN_ZERO`／`SCAN_INVALID_SYMLINK`／`SOURCE_UNREADABLE` | `null` |
| sentinel receipt の欠落・余剰・重複 | `SCAN_PARTIAL` | `ScanSummary` |
| 元 source または read-only mirror の digest 変化 | `SOURCE_CHANGED_DURING_SCAN` | `ScanSummary` |
| timeout、signal、spawn I/O failure、stdout JSON schema mismatch、予期しない例外 | `INTERNAL_ERROR` | manifest 確定前は `null`、確定後は `ScanSummary` |

`Violations` は `NonEmptyArray<Finding>` だけを受け取り、空なら `Pass`、infrastructure failure が1件でもあれば `Error` とする。`exitCodeFor` は discriminant の exhaustive `switch` で `pass=0`、`violations=1`、`error=2` を返す。
