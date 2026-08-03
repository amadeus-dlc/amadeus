# Logical Components — text-mutation-loud-failure

## 上流入力

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とし、既存Amadeus Runtime Commands内のmutationを深い型境界へ分解する。

## コンポーネント一覧

| ID | コンポーネント | 責務 | 所有しないもの |
| --- | --- | --- | --- |
| LC-TM-01 | `MutationTargetValidator` | slug文法、operation union、bulk key重複を適用前に検証 | state parse、I/O |
| LC-TM-02 | `StageStateValidator` | grammar全体、一意slug、checkbox／suffixをparseしopaque state生成 | mutation、diagnostic |
| LC-TM-03 | `ValidatedStageState` | original bytes、document identity、canonical range indexのread-only authority | filesystem capability |
| LC-TM-04 | `StageTextMutator` | target lookup、range置換、setter内reparse、postcondition | caller success、write |
| LC-TM-05 | `CandidateStateValidatorPort` | candidate contentを `StageStateValidator` でreparseし、setterへ検証済みsnapshotを返す | mutation、I/O |
| LC-TM-06 | `MutationInvariantGuard` | target／非対象projectionを照合し専用errorを生成 | normal not-found判定 |
| LC-TM-07 | `MutationTransaction` | canonical target順、step間reparse、final validation、all-or-nothing result | console、audit実装 |
| LC-TM-08 | `AtomicStateWriterPort` | existing writerへ最大1回委譲しcanonical再読でpre／post-commit failureを分類 | mutation policy、retry |
| LC-TM-09 | `CallerMutationAdapter` | end-to-end orchestration、caller別error mapping、private audit／success closureの順序制御 | message解析、raw mutation、公開success callback |
| LC-TM-10 | `MutationFailurePresenter` | input／validation／not-found／invariant／writer failureをstderr JSON／exit 1／stdoutなしへ投影 | persistent audit、success、internal failure |
| LC-TM-11 | `CallerInventoryGuard` | 全callsiteのexhaustive result処理と禁止sink未到達を静的検査 | production dispatch |
| LC-TM-12 | `MutationPerfHarness` | L1／L4／L8のcounter、latency、RSS、digest計測 | production verdict変更 |

## Interface契約

```text
MutationTargetValidator.validate(targets):
  valid(canonicalTargets) | invalid-target | duplicate-target

StageStateValidator.validate(content):
  ValidatedStageState | validation-failure

StageTextMutator.setCheckbox(validated, target, value):
  changed(content) | not-found(target) | throws StateMutationInvariantError

StageTextMutator.setStageSuffix(validated, target, value):
  changed(content) | not-found(target) | throws StateMutationInvariantError

MutationTransaction.apply(original, canonicalTargets):
  ready(verified-no-write | candidate)
  | failed(input | validation | not-found | invariant)
  | rethrows unknown

AtomicStateWriterPort.commit(candidate):
  committed-write
  | failed(pre-commit)
  | failed(post-commit-durability)
  | rethrows internal when canonical reread is unavailable or third bytes

CallerMutationAdapter.run(rawState, targets):
  owns private emitAuditAndSuccess closure; never passes it to collaborators
  failure -> MutationFailurePresenter
  verified-no-write -> private emitAuditAndSuccess
  candidate -> AtomicStateWriterPort
    -> committed-write -> private emitAuditAndSuccess
    -> typed writer failure -> MutationFailurePresenter
    -> internal -> existing internal boundary
```

`ValidatedStageState` constructorは `StageStateValidator` だけが所有する。`CandidateStateValidatorPort` はそのvalidatorへの一方向adapterであり、`StageTextMutator` がcandidate contentを渡してsetter内postcondition用snapshotを受け取る。mutatorはsnapshotを外へ返さず従来どおり `changed(content)` を返すため、transactionは次step用に別途reparseする。`StageTextMutator` はraw input overloadを公開しない。`StateMutationInvariantError` はmodule exportされたclassとtype guardを単一ownerにし、transactionだけがcatchする。

## 依存方向

```text
CallerMutationAdapter
  -> MutationTargetValidator
  -> MutationTransaction
       -> StageStateValidator -> ValidatedStageState
       -> StageTextMutator
            -> CandidateStateValidatorPort -> StageStateValidator
            -> MutationInvariantGuard
       -> StageStateValidator（各step／final reparse）
  -> AtomicStateWriterPort -> writeStateFile -> writeFileAtomic
  -> MutationFailurePresenter（typed failure only）
  -> module-private existing mutation audit / success emitter
       （verified-no-writeまたはcommitted-write branchだけ）

CallerInventoryGuard -> authored callsites（test/static only）
MutationPerfHarness -> injected ports/counters（test only）
```

pure component LC-TM-01〜07はfilesystem、console、process exit、audit writerをimportしない。presenterは永続audit capabilityを持たず、caller adapterだけがprivate emitterを所有してresult／error typeで分岐する。

## Failure domainとblast radius

| failure domain | 影響 | 封じ込め |
| --- | --- | --- |
| input／state validation | 当該invocation | setter前停止、全永続bytes不変 |
| target not-found | 当該target／bulk全体 | contentを返さず、全中間破棄 |
| mutation invariant | 当該transaction | 専用errorをtransactionでcatch、writer未到達 |
| writer pre-commit | canonical state | original bytes、audit／success未到達 |
| writer post-commit fsync | durability判定 | candidate再読、audit／success未到達、rollback禁止 |
| unknown exception | caller internal boundary | not-found／successへ変換しない |

## Resource ownership

transactionがoriginal／current／candidateの最大3世代とvalidated indexを所有し、return後に解放する。temp file lifecycleは既存 `writeFileAtomic` が所有する。新しいlock、cache、queue、child process、network、database、Herdr／tmux等terminal multiplexerはruntime dependencyにしない。

## 後続への引渡し

Code Generationは `packages/framework/core/tools/amadeus-lib.ts` のparser／validator／mutator、既存writer seam、`amadeus-jump.ts`、`amadeus-utility.ts`、`amadeus-state.ts` のcaller adapterをcanonical sourceで実装する。generated projection、package／promotion parity、repository全体のstatic gate接続は `repository-adoption` が所有する。
