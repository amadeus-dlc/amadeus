# 要求

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| R001 | 並行させる単位の判断基準（衝突面による並行可否）が steering policy から読める。 | 採用済み | なし | [R001-parallel-unit-criteria.md](requirements/R001-parallel-unit-criteria.md) |
| R002 | 共有成果物の統合手順（追従と再生成の順序）が steering policy から読める。 | 採用済み | なし | [R002-shared-artifact-integration.md](requirements/R002-shared-artifact-integration.md) |
| R003 | ゲート承認の運用（キュー確認、バッチ承認、遡及承認）が steering policy から読める。 | 採用済み | なし | [R003-gate-approval-operation.md](requirements/R003-gate-approval-operation.md) |
| R004 | 同一 worktree での実行の直列化と worktree 単位の並行の使い分けが steering policy から読める。 | 採用済み | なし | [R004-worktree-serialization.md](requirements/R004-worktree-serialization.md) |
| R005 | 新規 policy が索引から参照でき、既存 Git Branching Policy との責務分担が両 policy から読める。 | 採用済み | R001, R002, R003, R004 | [R005-registration-and-boundary.md](requirements/R005-registration-and-boundary.md) |

## 依存関係

| 要求 | 依存 | 理由 |
|---|---|---|
| R001 | なし | 並行可否の判断基準は他の要求に依存せず定義できるため。 |
| R002 | なし | 統合手順は観察済みの実例だけを前提に定義できるため。 |
| R003 | なし | 承認運用は確定済みのゲート契約と実行入口だけを前提に定義できるため。 |
| R004 | なし | 直列化の基準は観察済みの実例だけを前提に定義できるため。 |
| R005 | R001, R002, R003, R004 | 索引登録と責務分担の記述は、policy 本文の判断基準が揃っていることが前提になるため。 |

## 受け入れ状態

| 要求 | 状態 | 証拠 |
|---|---|---|
| R001 | 採用済み | 未登録 |
| R002 | 採用済み | 未登録 |
| R003 | 採用済み | 未登録 |
| R004 | 採用済み | 未登録 |
| R005 | 採用済み | 未登録 |
