# Unit of Work Story Map — Codex Duration Bounds

## Upstream Inputs and Mapping Rule

`user-stories` stageはSKIPのため、本書は `requirements.md` の利用者価値、FR、ACをstory相当として扱う。Unit境界は `components.md`、公開契約は `component-methods.md`、runtimeは `services.md`、依存は `component-dependency.md`、理由は `decisions.md` を参照する。

## Outcome Stories

| Story ID | 利用者成果 | Requirements / AC | Primary Unit | Supporting Units |
|---|---|---|---|---|
| S1 | 同一workloadのroot/child/attemptをresumeやcompact後も相関できる | FR-01.1〜06、AC-01 | `execution-observability-baseline` | 後続全Unitが回帰検証 |
| S2 | durationと欠測の品質を推測なしで比較できる | FR-01.7〜10、FR-08.1、NFR-03〜04 | `execution-observability-baseline` | Unit 2〜4がtreatment比較 |
| S3 | audit noiseやresumeでStop budgetを回避できず決定的に終端する | FR-02、FR-04A、AC-02 | `convergence-budgets` | `execution-observability-baseline` |
| S4 | 安全な一時エラーは有界に自動復旧し、不明な副作用は安全停止する | FR-03、AC-03 | `convergence-budgets` | `bounded-unit-pool` |
| S5 | question/follow-up/reviewが無限反復せず、未解決事項を人間判断へ渡す | FR-04、AC-04 | `interaction-budgets` | `convergence-budgets` |
| S6 | swarmのactive数、FIFO、Unit attempt、slot releaseが有界で、局所失敗後も独立Unitを継続できる | FR-05、AC-05 | `bounded-unit-pool` | `convergence-budgets` |
| S7 | 全supported harnessが同じcore predicateと欠測capability契約で判定される | FR-06、AC-06 | `execution-observability-baseline` | 全4 Unit |
| S8 | Issueごとの改善を最新baseで次の作業へ波及させ、統合dogfoodで確認できる | FR-07〜08、AC-07 | 全4 Unit | Delivery Planning |

## Stories Spanning Multiple Units

| Cross-cutting story | 分担 |
|---|---|
| S2 baseline/treatment | Unit 1が固定controlとmeasurement schemaを作り、Unit 2〜4が同じworkloadとschemaでtreatmentを追記する |
| S4 bounded recovery | Unit 2がcore retry schema/allowlist/budgetを所有し、Unit 4がswarmの既存retry経路に接続する |
| S7 harness conformance | Unit 1がcapability matrixと共通predicateを導入し、各後続Unitが変更面とdistributionを回帰検証する |
| S8 propagation | 各Unitが自分の変更単位を完結し、着地後のrebase・conformance・label付け替えで次Unitへ手渡する |

## Within-Unit Story Sequence

この順番はUnit内の実装整合順であり、Unit間の経済的delivery順ではない。

### execution-observability-baseline

1. S1のidentity/lifecycle不変条件をred testで固定する。
2. S2のclock/availability schemaとbaseline workloadを導入する。
3. S7の7 harness capability matrixとdistribution conformanceを通す。
4. S8のobserved SHA・control・受入receiptを記録する。

### convergence-budgets

1. S3のcap境界とaudit-noise regressionをred testで固定する。
2. S4のallowlist、retry budget、safe terminationを追加する。
3. S2の同一workloadでcontrol/treatmentを比較する。
4. S7/S8の影響adapter・distribution・rebase受入を完了する。

### interaction-budgets

1. S5の3 counterとidempotency境界をred testで固定する。
2. question/follow-up/reviewer dispatchをUnit 2の共通reserveに接続する。
3. S2のtreatment比較とS7のdistribution conformanceを通す。
4. S8のrebase・単一 `in-progress` 受入を記録する。

### bounded-unit-pool

1. S6のFIFO/active/attempt/releaseモデルをred testで固定する。
2. S4のrecoverable swarm pathとsystemic failure停止をUnit 2 contractへ接続する。
3. dependency-aware cancellationとbatch resultを追加する。
4. S2/S7/S8のtreatment・distribution・統合dogfood受入を完了する。

## Coverage Verification

| Verification | Result |
|---|---|
| 全story相当が1つ以上のPrimary Unitを持つ | PASS — S1〜S8全数をmapping |
| 全Unitが1つ以上のstoryを持つ | PASS — Unit 1: S1/S2/S7/S8、Unit 2: S3/S4/S8、Unit 3: S5/S8、Unit 4: S4/S6/S8 |
| FR-01〜FR-08が取得可能である | PASS — StoryのRequirements列で全FR群をcoverage |
| AC-01〜AC-07がPrimary Unitを持つ | PASS — S1〜S8に割当 |
| 複数Unit storyの所有境界がある | PASS — Cross-cutting tableでprovider/consumerを固定 |
