# Ideation

## 実現可能性

| 観点 | 状態 | メモ |
|---|---|---|
| 技術 | feasible | policy 化に必要な判断材料は観察済みである。Issue #334 の cycle が並行運用の実例（Issue #309 や #315 との並行、マージ後再生成による衝突解消、同一 worktree での検証競合を避けた Bolt の直列実行）を提供しており、推測ではなく観察を根拠にできる。記録先の steering policy 構造（`policies.md` と `policies/git-branching.md`）は Intent 20260701-git-branching-policy が確立している。 |
| 運用 | feasible | 並行運用の判断（どの Intent を並行させるか、統合の順序、同一 worktree での Bolt 実行の直列化）は現在都度判断であり、policy 記録により Agent が判断根拠を参照できるようになる。既存 Git Branching Policy との責務分担の整理が必要である。 |
| セキュリティ | feasible | workspace 内の Markdown の記録だけで成立する。秘密情報や認証情報を扱わない。 |
| 依存 | feasible | 待機条件だった共有インデックスの生成物化（Issue #334）は cycle 完了で解消している。前提になる Git Branching Policy の Intent 20260701-git-branching-policy は construction 完了済みである。 |

## 体制

| 役割 | 種別 | 関心 |
|---|---|---|
| Maintainer | 判断者 | policy の配置先、判断基準の採用、ゲート承認の運用（バッチ化）を判断する。並行させる Intent と統合の順序を決める主要利用者でもある。 |
| Agent | 実行者 | 複数 worktree での並行作業時に policy を参照し、並行させる単位、共有成果物の統合手順、同一 worktree での Bolt 直列化の判断を policy を根拠に進める。 |
| Reviewer | 参照者 | PR や Intent 成果物から policy 参照を読み、並行運用の判断が policy と整合しているか確認する。 |
| Validator | 構造検出者 | policy ファイルの存在と、成果物からの参照の構造条件を検出する候補になる。 |
| Evaluator | 品質評価者 | policy の判断基準と、実際の運用説明の矛盾を確認する候補になる。 |

## 初期モック

| モック | 目的 | ファイル |
|---|---|---|
| 初期確認 | 複数 worktree で並行する Intent の作業が、policy を根拠に、並行させる単位の判断、共有成果物の統合、ゲート承認のバッチ処理を進める流れを示す。 | [initial-confirmation.puml](mocks/initial-confirmation.puml) |

## 未確定事項

- policy の配置先（既存 `git-branching.md` への追記か、新規 policy ファイルか）は Inception で判断する。
- 判断基準の粒度（並行させる単位、統合の順序、共有成果物の統合手順、同一 worktree での Bolt 実行の直列化、ゲート承認のバッチ化を、どこまで規則化するか）は Inception で判断する。
- Issue #334 の cycle で観察した実例の記録先（policy 本文か、根拠参照か）は Inception で判断する。
- validator または evaluator で検出する候補と、人間判断だけで扱う候補の区分は Inception で判断する。

## 学習候補

- ゲート待ちキューの可視化（Intent 20260702-gate-queue-visualization）の一覧は、ゲート承認のバッチ化の判断材料として再利用できる可能性がある。
- 並行運用で新しい実例（統合の失敗、想定外の衝突）が観察された場合に、policy の判断基準を更新する運用が必要になる可能性がある。
