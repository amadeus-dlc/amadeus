# RE 差分リフレッシュ記録: 260804-goal-reconciliation-guar

上流成果物(consumes): なし。入力はIntent state、[Issue #2163](https://github.com/amadeus-dlc/amadeus/issues/2163)、クロスレビューrun `95396baf-2578-47a8-9ff9-395799739fbb`、Developer Code Scanの完全結果である。Project TypeはBrownfield、Scopeは`self-fix`、DepthはMinimal、Test StrategyはComprehensive。

## 実行メタデータ

- Date: `2026-08-04T03:32:54Z`
- Base commit: `a8e1ce025a918310ab7d803270bb6fc6b649c598`
- Observed commit: `58761daa5c3df5200d766e647f172819541a3c44`
- Distance: `68 commits`
- 区間規模: `2262 files changed, 318811 insertions(+), 7130 deletions(-)`
- Focus: Issue #2163 — 承認済みゴールとの未照合によるIntent偽完了。normal gated/non-gated report、direct `complete-workflow`、terminal `finalize`、already-completed recovery、mirror settlement後commitの対称面。
- Scan mode: focused differential refresh。ユーザー指定observedを固定し、Developer scanをlive canonical sourceで再確認した。コード、Intent state、memory、dist、root生成面は変更していない。

## Base選定

本Intent固有の過去re-scanは存在しない。既存`re-scans/*.md`から40桁のObserved commitを抽出し、commitが存在し、`git merge-base --is-ancestor <observed> HEAD`がexit 0となる候補だけを残した。その中で`git rev-list --count <observed>..HEAD`が最小の候補を選ぶと、`260802-plugin-projection-parity.md`のobserved `a8e1ce025a918310ab7d803270bb6fc6b649c598`（距離68）が最新reachable baseとなった。

detached HEADで、`amadeus/spaces/default/intents/intents.json`と本Intent recordに他作業者の未コミット変更があるため、stage定義のtrunk統合は行わなかった。観測対象は指定SHAで固定されており、共有CodeKBは既存履歴を残す差分追記に限定した。

## Developer Code Scanの統合結果

### 終端経路

| 経路 | 現行の流れ | Goal Ownership gap |
| --- | --- | --- |
| normal gated final | `report` → `approve` → `complete-workflow` | 最終stage承認はあるが、goalとaggregate outputの照合がない |
| normal non-gated final | `report` → `complete-workflow` | stage completion verdictをworkflow goal verdictとして扱う |
| direct | `amadeus-state complete-workflow <slug>` | slugのfinalityとgoal receiptを一般条件として検査しない |
| terminal finalize | `finalize` → `Status: Completed` | state-only writerでaudit/registryと非対称、goal guardなし |
| already-completed recovery | `Status: Completed` → `done` | 元のcompletion traceにgoal receiptがあるか再検証しない |
| mirror-enabled completion | prepare → external boundary settlement → terminal commit | settlementはmirror収束でありgoal達成ではない |

### 現行guardの実体

- `packages/framework/core/tools/amadeus-state.ts:379-396`の`verifyPhaseCheckArtifact`は対象pathへ`existsSync`を行うだけで、本文、goal identity、success metrics、verdictを読まない。
- 同`:562-625`のcompletion auditはstage、phase、scope、stage件数、completion instanceを記録するが、goal revision、reconciliation verdict、evidence、人間裁定を持たない。
- 同`:2332-2439`の`handleFinalize`は次stageがない場合にstateを`Completed`へする独立terminal writerで、completion auditとIntent registryを更新しない。
- 同`:2450-2598`の`completeWorkflowForTarget`はartifact/phase/mirror条件後にaudit、state、registry、cursorを確定するが、goalを解決しない。stageが既に`[x]`ならartifact/phase guardも再実行しない。
- 同`:5541-5555`の`workflowCompletionSettlement`はmirror boundaryのsettlementでありGoal Ownership receiptではない。
- `packages/framework/core/tools/amadeus-orchestrate.ts:3927-3943`は通常`report`でgate statusとfinalityからhandlerを選ぶが、state command自体の不変条件ではない。
- 同`:4912-4937`はfinal stageが既に`Completed`なら早期`done`を返す。
- `packages/framework/core/tools/amadeus-workflow-completion.ts:9-73`のprepared completionはinstance、stage、pending/completedだけを持ち、goal identity/revisionを持たない。
- `packages/framework/core/tools/amadeus-lib.ts:4373-4401`の派生consumerもstateの`Status`文字列だけをterminal factとして読む。

### 存在しない概念

live sourceにはworkflow completionと結合されたgoal identity、goal revision、`ACHIEVED` / `DEVIATED` / `UNVERIFIED`、durable goal reconciliation receipt、completion audit traceが存在しない。`Revision Count`はstage gateのreject/revise回数であり、goal revisionとして流用できない。

## Architect Synthesis

### 根因

局所guardは複数回強化されているが、「最新の承認済みゴールに対してaggregate outputが達成済みか」というCross-Stage Invariantのownerがstate machineに存在しない。各stage/phaseの完了を合成すればworkflow goalも達成した、という暗黙の推論がterminal transitionに残っている。さらにterminal writerが`complete-workflow`と`finalize`に分裂し、already-completed recoveryが既存statusを無条件に信頼するため、経路別修正では再び迂回が生じる。

### 推奨境界

1. original goalから人間承認済みrevisionを辿れる、stage `Revision Count`と独立したGoal Revision identityを持つ。
2. Intent、goal id/revision、typed verdict、success metric/evidence参照、人間裁定参照を持つdurable Goal Reconciliation Receiptを作る。
3. `ACHIEVED`かつcurrent revision一致だけをcompletion capabilityとする。`DEVIATED`はgoal revision作成・人間承認へ戻り、新revisionに対して再照合する。`UNVERIFIED`は人間裁定へ戻す。
4. `Completed`、`WORKFLOW_COMPLETED`、Intent registry `complete`、cursor clearを行える単一completion authorityを設ける。
5. normal gated/non-gated、direct、terminal finalize、already-completed recoveryをすべて同authorityへ通す。direct pathではfinalityも再検証する。
6. goal receipt検証をmirror外部close/syncより前に置き、未検証ゴールの外部完了を防ぐ。その後に既存artifact/phase/mirror guardを維持する。

### Failure semantics

- receipt欠落、stale revision、`DEVIATED`、`UNVERIFIED`、finality不一致、evidence欠損はtyped refusalとし、state・audit・registry・cursor・mirror外部作用を変更しない。
- 意味的達成を機械判定できない場合は推測せず、人間へ具体的な未検証項目と証拠を提示する。人間裁定は実HUMAN_TURN由来のprovenanceをreceiptへ結ぶ。
- crash recoveryはcompletion instanceに加えてgoal receipt identityを固定し、再試行時も同じcurrent revisionとreceiptを再検証する。
- historical Completed intentにreceiptが無い場合のmigration/compatibility policyはRequirements Analysisで裁定する。早期`done`で黙認はしない。

## 検証結果

### 既存greenの意味

Developer scanの現行guard対照3 suiteは51 pass / 0 failだった。Architectは次の3 fileをobserved HEADで再実行した。

```text
bun test --timeout 120000 \
  tests/unit/t-phase-check-gate-seam.test.ts \
  tests/integration/t361-amadeus-mirror-lifecycle-completion.integration.test.ts \
  tests/integration/t243-post-complete-audit-stop.test.ts

52 pass
0 fail
324 expect() calls
```

このgreenはphase-check存在、mirror settlement、completion crash recovery、post-complete audit suppressionが機能する証拠である。同時に、goal identity/receiptを持たないfixtureでも`Completed`へ進む現行characterizationであり、Issue #2163を反証しない。

### 必要な回帰matrix

| 軸 | negative | positive |
| --- | --- | --- |
| goal status | unmet metric、`DEVIATED`、`UNVERIFIED`、stale revision | current revisionの`ACHIEVED` |
| phase evidence | 空/無関係phase-check | receiptがtraceする関連evidence |
| route | gated/non-gated/direct/finalize/recovery全て拒否 | 全routeが単一authority経由で同じ結果 |
| scope | Operation実行/skip双方 | scope非依存で同じinvariant |
| revision | 暗黙縮退、stage Revision Count流用 | before/after/reason/impactを人間承認したgoal revision |
| side effect | refusal後にstate/audit/registry/mirror変更なし | success時だけtraceable terminal commit |

## 更新成果物

- `business-overview.md`
- `architecture.md`
- `code-structure.md`
- `api-documentation.md`
- `component-inventory.md`
- `technology-stack.md`
- `dependencies.md`
- `code-quality-assessment.md`
- `reverse-engineering-timestamp.md`
- `re-scans/260804-goal-reconciliation-guar.md`

既存CodeKBのIssue #2163外の情報は削除せず、直前の`registry-drift-guard`現在マーカーだけを履歴へ降格した。
