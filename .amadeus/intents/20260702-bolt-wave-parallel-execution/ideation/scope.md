# スコープ

## 対象境界

### 対象

| 識別子 | 境界 | 根拠 | 状態 |
|---|---|---|---|
| SC-IN-001 | bolts の依存グラフから wave（並行実行できる Bolt の集合）を導出する契約を定義する。 | [Issue #352](https://github.com/amadeus-dlc/amadeus/issues/352) | 採用 |
| SC-IN-002 | wave 単位の並行実行、統合、検証の手順を Construction skill に定義する。 | [Issue #352](https://github.com/amadeus-dlc/amadeus/issues/352) | 採用 |
| SC-IN-003 | 実行契約を並行運用ポリシー（worktree 分離、同一 worktree での直列化）と整合させる。 | [並行運用ポリシー](../../../steering/policies/parallel-operation.md) | 採用 |
| SC-IN-004 | 対象の並行運用は、1 人の人間と複数エージェント（複数 worktree）の範囲に限定する。 | [G001](../../../discoveries/20260702-parallel-execution/grillings/G001-parallel-execution-scope-and-split.md) | 採用 |

### 対象外

| 識別子 | 境界 | 根拠 | 状態 |
|---|---|---|---|
| SC-OUT-001 | 複数人での Bolt 分担を扱う。 | [Issue #352](https://github.com/amadeus-dlc/amadeus/issues/352) | 採用 |
| SC-OUT-002 | リモート実行基盤を扱う。 | [Issue #352](https://github.com/amadeus-dlc/amadeus/issues/352) | 採用 |
| SC-OUT-003 | 複数人チームでの並行と、複数 workspace での組織利用を扱う。 | [G001](../../../discoveries/20260702-parallel-execution/grillings/G001-parallel-execution-scope-and-split.md) | 採用 |
| SC-OUT-004 | 新しい phase や人間ゲートを追加する。既存の Task Generation Gate の契約を変えない。 | [Discovery](../../../discoveries/20260702-parallel-execution.md) | 採用 |

## 実行制御

| 項目 | 値 | 理由 |
|---|---|---|
| 実行スコープ | feature | Bolt の直列実行前提に、依存 wave による並行実行という新しい契約を追加するため。 |
| 省略 stage | なし | wave 導出と実行手順の契約を Inception で分解し、Construction で skill 本文への定義と検証を行うため。 |

## 成果物深度

| 項目 | 値 | 理由 |
|---|---|---|
| 深度 | standard | wave の導出規則、実行と統合の手順、既存ゲート契約との関係を追跡できる粒度が必要であるため。 |

## 検証戦略

| 項目 | 値 | 理由 |
|---|---|---|
| 戦略 | standard | skill 文書の契約変更が中心のため、validator、標準検証、skill-forge 確認、必要な場合の eval で確認するため。 |

## Inception への引き継ぎ

- wave 導出の契約（bolts.md の依存表からの導出規則、wave の表現方法）を確定する。
- 定義先の Construction skill（公開入口 `amadeus-construction` か、内部 skill のどこか）を確定する。
- wave ごとの統合と検証の手順（worktree 分離での実行、wave 完了時の統合、検証の順序）を確定する。
- Task Generation Gate（Bolt ごとの承認）と wave 実行の関係（wave 単位のまとめ承認の扱い）を確定する。
- 並行運用ポリシーとの参照関係（policy を参照するか、契約を skill 側に持つか）を確定する。
