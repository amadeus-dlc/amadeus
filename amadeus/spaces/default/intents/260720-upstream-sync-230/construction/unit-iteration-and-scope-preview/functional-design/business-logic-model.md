# Business Logic Model — unit-iteration-and-scope-preview

> 上流入力(consumes全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## 目的と境界

U05はC2 Workflow Runtime Correctnessのnew capability面として、FR-2 item 8のopt-in unit-major iterationとitem 9のscope cost previewを既存state/graph/CLIへ追加する。public seamは次の正準2関数だけである。

```ts
function nextConstructionStep(state: WorkflowState, graph: StageGraph): ConstructionStep;
function previewScopeCost(scope: ScopeName, grid: CompiledGrid): ScopeSummary;
```

U05はUnit kind/schemaを所有せずU01のclosed vocabularyを消費する。batch advance/next-stage namingはU03、全体verification/ledger closureはU12に残す。新規service、database、network、UIは追加しない。

## Upstream input traceability

| Input | 採用した制約 | 設計箇所 |
|---|---|---|
| `unit-of-work.md` | 2 public seam、opt-in state verb、default不変、4 consumer共通summary | 2 workflow、Compatibility |
| `unit-of-work-story-map.md` | items 8–9のprimary ownerはU05、U01 consumer、U12集約 | 目的と境界、Verification |
| `requirements.md` | Unit外側、決定順、不正値mutation前reject、stage/gate count、additive JSON | Iteration、Preview |
| `components.md` | C2 pure decision seam、既存CLI/lock/audit再利用、一般refactor禁止 | Integration boundaries |
| `component-methods.md` | 2関数の正準signature、failed result非mutation | Public seam、Failure table |
| `services.md` | invocation-local同期処理、既存transaction、DB/networkなし | Integration boundaries |

## Unit-major iteration workflow

1. state verbはiteration値を検証し、`unit-major`だけをopt-in値として受理する。不正値はstate、plan、graph、auditの全mutation前にrejectする。
2. iteration fieldが未指定なら、既存stage-major resolverへそのまま委譲し、順序、directive、state、human/JSON bytesを変更しない。
3. `unit-major`では、既存Unit列を外側の順序、`StageGraph`のcompiled stage列を内側の順序として走査する。
4. 各組について既存scope、stage eligibility、Unit kind、coverage判定を適用し、最初の未完了かつ実行可能な組を`ConstructionStep`として返す。
5. Unit内の対象stageが完了したら次Unitへ進む。独自sort、名前順tie-break、別stage listは導入しない。
6. state更新はdecision後に既存lock/audit transactionが行い、`nextConstructionStep`自身は入力を変更しない。

non-per-unit stageの適格性と遷移は既存`StageGraph`規則を維持する。unit-majorはper-unit matrixの反復軸だけを変更し、scopeやstage実行可否を再定義しない。

## Scope cost preview workflow

1. `previewScopeCost`は指定`ScopeName`と正本`CompiledGrid`を受ける。
2. gridのeffective in-scope stageを既存compiled orderで数え、同じ集合からapproval gate数を数える。
3. 一回の`ScopeSummary`を生成し、scope confirmation、intent birth、scope-change、validate-gridへ渡す。
4. human projectorは同じstage数・gate数を表示し、consumer別の再集計をしない。
5. JSON projectorは同じvalueをadditiveな`summary`として出し、既存key/value/順序を変更しない。

countの正本はstage sourceや各CLIのhardcoded listではなく`CompiledGrid`である。同じscope/gridからconsumerに依存しない同じcountを返す。

## Compatibility and failure table

| Input | Result | Mutation/bytes |
|---|---|---|
| iteration未指定 | 既存stage-major step | 既存生成bytes不変 |
| `unit-major` | Unit外側・既存順のstep | 既存transaction内だけ更新 |
| 不正iteration | 既存typed failure | state/plan/graph/audit不変 |
| valid scope/grid | 共通`ScopeSummary` | human表示追加、JSON additive summary |

既存error policyを増やさず、正本validationの結果を既存CLI stdout/stderr/exit codeへ薄く写像する。

## Integration boundaries

- 2関数はstate/graph/gridを入力にするpure decision seamである。
- mutationは既存intent lock/audit transaction内だけで行う。
- scope confirmation、birth、scope-change、validate-gridはsummary consumerでありcount ownerではない。
- C2既存choke pointへ最小変更し、巨大fileの一般refactorや第二grid parserを導入しない。

## Verification scenarios

- 2 Unit×複数per-unit stageで、stage-majorとunit-majorのmatrix順を対照し、unit-majorがUnit外側・既存unit/compiled stage順で決定的に進むことを固定する。
- iteration未指定fixtureで、directive、state、human/JSON出力のgolden bytesを変更前と比較する。
- 不正iterationでstate、plan、runtime graph、auditのpre/post bytesが一致する。
- 全scopeについて`previewScopeCost`とcompiled gridのstage/gate countを照合する。
- 4 consumerのhuman countが一致し、JSONの既存field不変かつ`summary`だけadditiveであることを確認する。

## Review — Iteration 1

- Reviewer identity: `amadeus-architecture-reviewer-agent`
- Review timestamp (UTC, `date -u`): `Mon Jul 20 14:20:25 UTC 2026`
- Verdict: **READY**

### Findings

- Blocking findings: なし。
- E-OC1範囲: public seamは正準2 signatureに限定され、`unit-major`とstate verbはopt-in、Unit外側・既存unit順・compiled stage順、iteration未指定時のstage-majorと生成bytes不変、不正iterationのstate/plan/graph/audit全mutation前rejectを一貫して定義している。
- Scope preview: scope confirmation、intent birth、scope-change、validate-gridの4 consumerが同じ`CompiledGrid`由来のstage/gate countを同じ`ScopeSummary` semanticsから投影し、JSONは既存field/value/順序を維持したadditiveな`summary`に限定されている。
- 境界: 新規tie-break、consumer別count、未指定経路のbytes変更、新しいownership/error policy判断は追加されていない。Unit kind/schemaはU01、batch/next-stage namingはU03、全体evidence/ledger集約はU12に残している。
- consumes実質利用: `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`の6件が、境界・signature・順序・互換性・transaction・service制約へ具体的に反映されている。
- 成果物整合: `business-logic-model.md`、`business-rules.md`、`domain-entities.md`は、正準型、反復順、preview count、mutation境界、非entity/ownershipについて相互矛盾がない。

### Sensor evaluation

| Sensor | Result | Evidence |
|---|---|---|
| `required-sections` | PASS | 3成果物はいずれも2件以上のH2見出しを持つ。 |
| `upstream-coverage` | PASS | 3成果物はいずれもdirectiveのconsumes 6件を明示し、設計判断への実質利用を示す。 |
| `linter` | N/A | 対象成果物にlint対象の`.ts`/`.js`ファイルはない。Markdown内のsignature例のみ。 |
| `type-check` | N/A | 対象成果物にtype-check対象の`.ts`/`.tsx`ファイルはない。Markdown内のsignature例のみ。 |
| `answer-evidence` | PASS | `functional-design-questions.md`に質問0件の`[Answer]:`、E-OC1承認時刻、曖昧性分析が記録されている。 |
