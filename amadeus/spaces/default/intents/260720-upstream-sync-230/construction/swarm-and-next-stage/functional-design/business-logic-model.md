# Business Logic Model — swarm-and-next-stage

> 上流入力(consumes全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## 目的と境界

U03はC2 Workflow Runtime Correctnessのbatch/next面を所有し、FR-1 item 3のswarm batch advanceとFR-2 item 10のgate next-stage namingを、既存orchestrator/state/swarmの判定seamへ閉じる。public seamは`unit-of-work.md`と`component-methods.md`が定める2関数だけである。

```ts
function selectNextSwarmBatch(graph: BoltDag, currentRun: RunEvidence): BatchSelection;
function resolveNextInScopeStage(current: StageSlug, grid: CompiledGrid): StageSlug | null;
```

U03はBolt DAG recoveryを行わずU02の回復済みgraphを消費する。unit-major iterationやscope previewはU05、swarm worker/refereeのmerge実行は既存C2 swarm owner、全24項目のverification/ledger closureはU12に残す。新規service、database、network、UIは追加しない。

## Upstream input traceability

| Input | 採用した制約 | 設計箇所 |
|---|---|---|
| `unit-of-work.md` | U03責務、2 public seam、DAG順、current-run convergence、SKIP非表示 | 目的と境界、2つのworkflow |
| `unit-of-work-story-map.md` | items 3/10のprimary ownerはU03、U12は集約のみ | 目的と境界、Verification scenarios |
| `requirements.md` | merge failure非converged、actual next in-scope、terminal null、FR-0 verification-first | Batch workflow、Next-stage workflow |
| `components.md` | C2 pure decision seam、既存CLI/lock/audit再利用、一般refactor禁止 | 目的と境界、Integration boundaries |
| `component-methods.md` | 2関数の正準signature、rejected/failed時の既存state不変契約 | Public seam、Data flow |
| `services.md` | invocation-local runtime、同期CLI、既存lock/audit、DB/networkなし | Integration boundaries |

## Swarm batch selection workflow

1. `selectNextSwarmBatch`は回復済み`BoltDag`のbatch列を、DAGに記録された順のまま読む。
2. 各batchについて、`currentRun`がconvergedと示すunitだけを当該runの完了集合として扱う。
3. merge failureを持つunitは、検証が成功していてもconverged集合へ入れない。
4. DAG順に最初の未完了batchを選び、そのbatchの未完了unitだけを`BatchSelection`へ返す。
5. 選択後のworker dispatch、検証、mergeは既存swarm境界の責務であり、このpure seamはstateやauditを変更しない。

batch内またはbatch間に独自tie-breakを追加しない。順序の正本は`BoltDag`であり、current runより前のclaimed resultをconverged根拠として再利用しない。

## Next in-scope stage workflow

1. `resolveNextInScopeStage`は`CompiledGrid`内の`current`より後を、compiled orderのまま評価する。
2. scope上SKIPとなるstageを候補から除外する。
3. 最初に存在する次のin-scope stageの`StageSlug`を返す。
4. 候補が存在しない終端では`null`を返す。SKIP stage slugや架空のplaceholderを終端値にしない。
5. gateの`next_stage` projectorと、その後のengine `next`は同じresolver結果を消費し、表示名と実directiveを一致させる。

終端の利用者向け文言は`null`のprojectionであり、domain valueを別のslugへ置換しない。未知stageやmalformed gridのfailure policyは本承認範囲で新設せず、既存C1/C2 validation境界に従う。

## FR-0 characterization branch

実装差分より先に、2契約の現行挙動を反証可能なfixtureで固定する。

| Contract | Characterization | Result handling |
|---|---|---|
| swarm batch advance | 複数batch、current-run converged、merge failureを入力し、選択batch/unitを比較 | EQUIVALENTなら挙動差分0。非同等なら不足だけをADAPT |
| gate next-stage naming | in-scope、SKIPを挟むscope、terminalを入力し、gate表示と次directiveを比較 | EQUIVALENTなら挙動差分0。非同等なら不足だけをADAPT |

EQUIVALENT時もtargeted regression testとverdict evidenceはU03成果として残す。現行実装を別abstractionへ置き換えること自体を成果にしない。

## Integration boundaries

- `selectNextSwarmBatch`と`resolveNextInScopeStage`は入力から結果を返すpure decision seamで、lock、state write、audit emitを所有しない。
- CLI projectorは既存stdout/stderr/exit code契約へ薄く写像する。
- state mutationが必要な後続処理は既存intent lock/audit transaction内だけで実行する。
- C2既存choke pointへ最小変更し、巨大な`amadeus-orchestrate.ts`や`amadeus-state.ts`の一般refactorを行わない。

## Verification scenarios

- 2 batch以上のDAGで、先頭batchがcurrent runで全convergedなら次batch、未完了unitが残れば先頭batchを選ぶ。
- check成功後にmerge failureとなったunitはconverged数0として残り、次batchへ進まない。
- current run外のclaimed convergenceを与えても完了根拠に使わない。
- currentの直後がSKIPなら、その後の最初のin-scope stageを返し、gate表示と次のengine directiveを一致させる。
- currentが最終in-scope stageなら`null`を返し、SKIP slugや架空slugを出さない。
- characterizationでEQUIVALENTとなった経路は変更前後bytes/observable resultを一致させ、挙動変更0を証明する。

## Review — Iteration 1

Reviewer: `amadeus-architecture-reviewer-agent`  
Runtime UTC: `2026-07-20T14:15:51Z`  
Verdict: **READY**

### Findings

- Blocking findings: 0件。
- Non-blocking findings: 0件。
- E-OC1承認範囲への適合: 2つの正準signatureを維持し、未完了batchを`BoltDag`記録順で選択する。完了根拠はcurrent runのconverged evidenceだけであり、merge failureを非convergedとして扱う。
- next-stage契約への適合: `CompiledGrid`上の実在する次のin-scope stageだけを返し、SKIP stageを出力せず、終端を`null`とする。gate projectorとengine directiveの意味も一致している。
- 互換性・ownershipへの適合: FR-0でEQUIVALENTならproduction挙動差分0とし、U03はitems 3/10のtargeted test/evidenceだけを所有し、全体evidence/ledger集約をU12へ残している。
- 承認外判断の混入: 新規signature、独自tie-break、新規failure policy、新規終端値、新規ownership判断はいずれもない。未確定の`BatchSelection` field/no-selection variantとmalformed grid時の扱いは既存正本・既存validation境界へ明示的に留保されている。
- consumes利用: `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`の6件すべてが、境界、規則、entity lifecycle、検証シナリオへ実質的に反映されている。
- 成果物整合: `business-logic-model.md`、`business-rules.md`、`domain-entities.md`は、同じ2 seam、DAG/current-run/merge-failure規則、next-stage/terminal規則、FR-0分岐、U03/U12責務分離を一貫して記述している。

### Sensor evaluation

| Sensor | 評価 | 根拠 |
|---|---|---|
| `required-sections` | PASS | 3成果物はいずれもH2見出しを2件以上持つ。 |
| `upstream-coverage` | PASS | 3成果物はいずれもconsumes 6件を列挙し、個別の設計反映先をtraceしている。 |
| `linter` | N/A (PASS) | 成果物はMarkdownのみで、対象となるTypeScript/JavaScript実装ファイルはない。 |
| `type-check` | N/A (PASS) | 実装対象のTypeScript/TSXファイルはなく、コード片は承認済みsignatureの宣言に限定される。 |
| `answer-evidence` | PASS | `functional-design-questions.md`にE-OC1承認時刻、質問0件、承認境界、曖昧性分析が記録され、3成果物がその境界内で導出されている。 |
