# Bolt Plan — Codex Duration Bounds

## Upstream Inputs

本計画は `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md` を入力とする。技術DAGの有効順序から、ユーザー承認済みのfeedback-propagation順を選ぶ。

## Delivery Invariants

- 1 Issue = 1 Unit = 1 Bolt = 1 [Pull Request](https://github.com/amadeus-dlc/amadeus/pulls)。
- 順序は `#1602 → #1998 → #1999 → #1919`。前段のchange reviewが人間によりmergeされるまで後段の実装に着手しない。
- ベース/マージ先は `main`、Boltごとに短命worktree branchを使い、人間承認後にsquash mergeする。
- `in-progress` は実着手中の1 Issueにのみ付与。現在は [#1602](https://github.com/amadeus-dlc/amadeus/issues/1602) だけである。
- 各merge後、存在する後続worktreeは最新 `main` へrebaseする。未作成なら次Bolt開始時に最新 `main` から作る。前段conformanceを再実行して改善波及を確認する。
- 各BoltはTDDで公開seamのRedを先に実測し、最小実装でGreenへ戻す。生成物は正本から同期し、直接編集しない。

## Ordered Bolt Sequence

| Order | Bolt | Issue / Unit | Walking Skeleton | Complexity | Depends on |
|---:|---|---|---|---|---|
| 1 | `execution-observability-baseline` | [#1602](https://github.com/amadeus-dlc/amadeus/issues/1602) | Yes | XL | none |
| 2 | `convergence-budgets` | [#1998](https://github.com/amadeus-dlc/amadeus/issues/1998) | No | L | Bolt 1 |
| 3 | `interaction-budgets` | [#1999](https://github.com/amadeus-dlc/amadeus/issues/1999) | No | M | Bolt 2 |
| 4 | `bounded-unit-pool` | [#1919](https://github.com/amadeus-dlc/amadeus/issues/1919) | No | L | Bolt 2、delivery policy上はBolt 3のmerge |

## Bolt 1 — execution-observability-baseline

### Included Unit and Slice

`execution-observability-baseline` 1 Unit。最初にcore identity/clock→1つのdeterministic adapter→canonical audit→state/runtime/OTel projection→package checkを貫く最小E2Eを成立させる。この縦スライスはBoltを分けるものではなく、同じBolt内で全7 harness capabilityと#1602の全DoDへ広げる。

### Definition of Done

- root/child/attempt identity、resume/compact/Redo、monotonic/wall/invalid measurement、legacy-unknown/incomplete/unavailableの決定的testがGreen。
- C2のaudit-first single-writer lifecycleとC1の純粋contractが配線され、duplicate begin/finishにfail-closed。
- 7 package面のcapability matrix、影響adapter fixture、5 self-install面、package/promote drift guardがGreen。
- 固定workload、observed SHA、capability、開始/終了条件、duration、attemptのcontrol baselineが機械可読に記録される。
- [#1602](https://github.com/amadeus-dlc/amadeus/issues/1602) のchange reviewが人間に承認・mergeされる。

### Confidence Hypothesis and Demo

同じworkloadをharness横断でroot/parent/attempt/durationにより相関でき、欠測を0や成功に偽装しない。Demoは固定workloadのaudit、projection、baseline reportとpackage check。

## Bolt 2 — convergence-budgets

### Included Unit

`convergence-budgets` 1 Unit。Bolt 1のidentity・measurement・C2 receiptを実利用する。

### Definition of Done

- Stop continuation/recoverable retryの `cap-1` / `cap` / `cap+1`、resume、compact、audit noiseがproperty/regression testでGreen。
- allowlistのpositive/negative、effect-possible/unknown、auth/config/canonical writeのsafe terminationがGreen。
- Bolt 1と同じworkloadでduration、attempt、counter、terminationのcontrol/treatmentを比較。
- 影響adapter/package/self-install/docsを同期し、[#1998](https://github.com/amadeus-dlc/amadeus/issues/1998) のchange reviewが人間に承認・mergeされる。

### Confidence Hypothesis and Demo

audit noiseやsession境界でbudgetを回避できず、no-effect-confirmedの一時failureだけは有界retryで回復する。Demoはcap境界とrecoverable/non-recoverable対比。

## Bolt 3 — interaction-budgets

### Included Unit

`interaction-budgets` 1 Unit。Bolt 2の共通reserveをquestion/follow-up/reviewer dispatchへ適用する。

### Definition of Done

- 3種counterがstage instanceへ結び付き、resume/compact/再描画でresetせず、同一idempotency keyは二重消費しない。
- reviewer cap後は新reviewを開始せず、未解決findingを既存人間gateへ渡す。
- Codex専用gateなしで共通semanticsとharness-native renderingが成立。
- 影響adapter/package/self-install/docsを同期し、[#1999](https://github.com/amadeus-dlc/amadeus/issues/1999) のchange reviewが人間に承認・mergeされる。

### Confidence Hypothesis and Demo

question/follow-up/reviewはresumeを跨いでも同じstage instance budgetを消費し、cap+1を開始しない。Demoはduplicate rendering、resume、review exhaustionの対比。

## Bolt 4 — bounded-unit-pool

### Included Unit

`bounded-unit-pool` 1 Unit。Bolt 2のC3とC2、Bolt 1のmeasurementを使い、Bolt 3のInteraction Adapterへは技術依存しない。

### Definition of Done

- FIFO、active <= cap、Unit attempt、queue-entry identity、exactly-once settle/release/requeueのmodel/property testがGreen。
- local failureでtransitive dependentを取消し独立Unitを継続、systemic/unknown failureで新dispatchを停止。
- maximum active、queue順、attempt、batch result、terminationをBolt 1 controlと同じworkloadで比較。
- 影響driver/package/self-install/docsを同期し、[#1919](https://github.com/amadeus-dlc/amadeus/issues/1919) のchange reviewが人間に承認・mergeされる。
- 4契約の統合workload、package/promote、Intent park、fresh Codex session resume dogfoodの証跡を残す。

### Confidence Hypothesis and Demo

queuedをactiveに数えずhard capを守り、retryは同じUnit attemptを消費し、slotを1度だけ解放する。Demoはcontrolled worker/latchでFIFO、maximum active、local/systemic failureを可視化する。

## Landing and Propagation Protocol

1. 現在のIssueだけが `in-progress` であることを確認する。
2. Bolt内でTDD、対象suite、全体gate、package/promoteを完了する。
3. 対象Issueの[Pull Request](https://github.com/amadeus-dlc/amadeus/pulls)を人間reviewへ渡す。AIはmergeしない。
4. 人間merge後に対象Issueから `in-progress` を外す。
5. 後続branchがあれば最新 `main` へrebase、なければ次Bolt開始時に最新 `main` から作成する。前段conformanceを再実行する。
6. 次Issueに `in-progress` を付け、次Boltを開始する。

Bolt 1のwalking-skeleton gate承認後、engineが残りBoltのautonomy ladderを1度だけ提示する。本計画はその回答を先取りしない。
