# Scope Definition 質問 — 260722-tla-plugin

> E-OC1 証跡: ソロモード・選挙不要判定(根拠種別: 各問ユーザー本人の HUMAN_TURN 直接回答 — Grill me)。合意サマリのユーザー承認タイムスタンプ: 2026-07-22T11:38:47Z(「はい、確定」)
> モード: Grill me(質問は1問ずつ動的に追記)
> 上流入力(consumes 全数): intent-statement(必須・読了)、feasibility-assessment(読了)、constraint-register(読了)
> 既決(質問対象外): in/out 境界は intent-statement の Initial Scope Signal で確定済み(含む: ステージ新設・.tla外部化・run-model-check.ts・CI統合・完備性sensor / 含まない: 実験資材退役・新規モデル・一律義務化)

## Q1. proto-Unit の実行順序方針

事実: raid-log の R3(plugin合成→compile→実行の E2E 未実証)と R4(.tla 外部化のモデル同一性)が本intentの2大リスク。前例(260717 scope-definition:c3)は「dependency と risk-first を優先し、未証明の基盤に依存する価値面を先行着地させない」を採用。

- A. risk-first(推奨): 最初の Bolt を「plugin compose→graph 解決→formal-model-check ステージ実行の薄い E2E(walking skeleton)」とし、R3/R4 を先に潰してから CI 統合・sensor を積む
- B. value-first: CI 統合(検証能力の実利)を先に着地させ、plugin 化は後段
- C. layer-first: 下層(run-model-check.ts)→中層(.tla外部化)→上層(plugin/CI/sensor)の順
- X. Other (please specify)

[Answer]: A — risk-first(walking skeleton で plugin E2E + モデル同一性を先に実証、CI/sensor は後段)(2026-07-22, Grill me)

## Q2. MoSCoW 分類の確認 — 全capability を Must とするか

事実: intent-statement の成功指標は5点(モデル外部化・汎用実行器・CI統合・sensor落ちる実証・プラグインライフサイクル)すべての実測成立を完了条件と定義済み(Q1裁定 @intent-capture = E2E動作)。前例(260717 scope-definition:c2)は「公開契約を完結させる capability はすべて Must とし Should/Could を置かない」を採用。

- A. 全5 capability を Must(推奨): 成功指標と1:1で対応し、Should/Could を置かない。Won't(実験資材退役・新規モデル・Linux sandbox provider・一律義務化)を明示除外
- B. sensor を Should に降格: コア経路(モデル+実行器+CI)を Must、sensor は入れば良い
- X. Other (please specify)

[Answer]: A — 全5 capability を Must(Won't: 実験資材退役・新規モデル・Linux sandbox provider・一律義務化)(2026-07-22, Grill me)

## Q3. 期限制約の有無

事実: リポジトリ・既決ノルムに本intentへの期限を定める記録はない(自己調査では確認不能な、ユーザーのみが知る事実)。

- A. 期限なし(推奨・推定 confidence: high): 品質ゲート優先で進める
- B. 期限あり: 具体的な期日を指定(X で明記)
- X. Other (please specify)

[Answer]: A — 期限なし(品質ゲート優先)(2026-07-22, Grill me)
