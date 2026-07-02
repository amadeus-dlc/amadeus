# スコープ

## 対象境界

### 対象

| 識別子 | 境界 | 根拠 | 状態 |
|---|---|---|---|
| SC-IN-001 | 並行運用の判断基準（並行させる単位、共有成果物の統合手順、ゲート承認の運用）を steering policy として記録する。 | [Issue #351](https://github.com/amadeus-dlc/amadeus/issues/351) | 採用 |
| SC-IN-002 | 複数 worktree での並行作業を、policy を根拠に進められるようにする。 | [Issue #351](https://github.com/amadeus-dlc/amadeus/issues/351) | 採用 |
| SC-IN-003 | Issue #334 の cycle で観察した並行運用の実例（Issue #309 や #315 との並行、マージ後再生成による衝突解消、同一 worktree での検証競合を避けた Bolt の直列実行）を判断基準の根拠として記録する。 | [Issue #351](https://github.com/amadeus-dlc/amadeus/issues/351) | 採用 |
| SC-IN-004 | 既存 Git Branching Policy との責務分担を整理する。 | [Discovery](../../../discoveries/20260702-parallel-execution.md) | 採用 |
| SC-IN-005 | 対象の並行運用は、1 人の人間と複数エージェント（複数 worktree）の範囲に限定する。 | [Discovery G001](../../../discoveries/20260702-parallel-execution/grillings/G001-parallel-execution-scope-and-split.md) | 採用 |

### 対象外

| 識別子 | 境界 | 根拠 | 状態 |
|---|---|---|---|
| SC-OUT-001 | 新しい phase や人間ゲートを追加する。 | [Issue #351](https://github.com/amadeus-dlc/amadeus/issues/351) | 採用 |
| SC-OUT-002 | 並行実行の他候補（ゲート待ちキューの可視化、Bolt の依存 wave 並行実行）を扱う。 | [Discovery](../../../discoveries/20260702-parallel-execution.md) | 採用 |
| SC-OUT-003 | 複数人チームでの並行と、複数 workspace での組織利用を扱う。 | [Discovery G001](../../../discoveries/20260702-parallel-execution/grillings/G001-parallel-execution-scope-and-split.md) | 採用 |
| SC-OUT-004 | 既存 Intent 20260701-git-branching-policy の lifecycle を再開して更新する。 | [G001](grillings/G001-new-intent-vs-existing-intent-update.md) | 採用 |

## 実行制御

| 項目 | 値 | 理由 |
|---|---|---|
| 実行スコープ | infra | 複数 worktree の並行作業基準を steering policy として整備するため。 |
| 省略 stage | なし | 並行運用の判断基準を Inception で分解し、Construction で steering policy と検証契約に反映する必要があるため。 |

## 成果物深度

| 項目 | 値 | 理由 |
|---|---|---|
| 深度 | standard | 並行させる単位、共有成果物の統合手順、ゲート承認の運用を、複数 worktree の作業判断として追跡できる粒度が必要であるため。 |

## 検証戦略

| 項目 | 値 | 理由 |
|---|---|---|
| 戦略 | standard | validator、必要な eval、diff check で、steering policy と参照契約を確認するため。 |

## Inception への引き継ぎ

- policy の配置先（既存 `git-branching.md` への追記か、新規 policy ファイルか）を確定する。
- 並行運用の判断基準（並行させる単位、統合の順序、共有成果物の統合手順、同一 worktree での Bolt 実行の直列化、ゲート承認のバッチ化）を Requirement と Acceptance にする。
- Issue #334 の cycle で観察した実例を、policy 本文と根拠参照のどちらへ記録するかを確定する。
- 既存 Git Branching Policy と `policies.md` との参照関係と責務分担を確定する。
- validator または evaluator で検出する候補と、人間判断だけで扱う候補を分ける。
