# Constraint Register — Intent Mirror の GitHub Project Status 同期

上流入力(consumes 全数): intent-statement

intent-statement のスコープ境界(Issue #1560 全体・非対象4項)を制約として書き下し、技術・組織・外部の3分類で登録する。

## 技術制約

| ID | 制約 | 出典 |
|----|------|------|
| C-T1 | ProjectV2 の Status 更新は GraphQL API のみ(REST 不可)。既存 gateway は REST `gh api` 構成のため GraphQL argv ビルダーの追加が必要 | GitHub 公式 API 仕様+gateway 直読(HEAD) |
| C-T2 | Status option ID は Project ごとに異なり、対象 Project の Status フィールドと選択肢を都度解決する必要がある | Issue #1560 状態マッピング欄+実測(Project #5 の option id 4件) |
| C-T3 | Issue 本文更新と Project Status 更新は別 mutation — アトミック化は不可能で、部分成功を前提とした冪等 reconcile 設計が必須 | Issue #1560 失敗・再試行セマンティクス欄 |
| C-T4 | GitHub Actions・daemon・polling は使用しない。既存 eligible boundary と manual invocation の create/sync/close チェーン内で完結する | Issue #1560 Lifecycle 統合欄 |
| C-T5 | gh CLI は optional dependency — runnable/auth readiness を利用前検査し、不在・未認証・API 障害は loud fail、workflow は恒久停止しない | cid:practices-discovery:gh-scripts-boundary |
| C-T6 | TypeScript/ESM + Bun、正本は packages/framework/core/、dist・self-install は生成物として同期(7ハーネス全て) | project.md § Tech Stack / cid:build-and-test:bt-dist-regen-seven-harnesses |

## 組織・運用制約

| ID | 制約 | 出典 |
|----|------|------|
| C-O1 | 認証 scope の自動変更は行わない。`project` scope 等の要件はドキュメント化で対応(現行環境は保有済み — 実測) | Issue #1560 失敗セマンティクス欄+`gh auth status` 実測 |
| C-O2 | Project からの削除・アーカイブは行わない(非対象)。**追加は行う**(2026-07-27 仕様変更 B): 設定済み対象 Project へ create チェーン内で冪等に追加し、現在フェーズ Status を即設定。auto-add workflow 非依存 | Issue #1560 非対象欄+仕様変更 B(Change Request 記録) |
| C-O3 | 双方向同期はしない — record が正本、record → Issue/Project の一方向 | Issue #1560 非対象欄+team.md intent-first ミラー運用 |
| C-O4 | walking skeleton を最初の Construction Bolt とし、単独ゲートで人間確認 | org.md § Walking Skeleton(amadeus-feature は greenfield 相当扱い) |

## 外部依存の制約

| ID | 制約 | 出典 |
|----|------|------|
| C-E1 | GraphQL rate limit(5,000 points/h 級)と一時障害 — 同期は少数リクエストで rate limit 逼迫は想定薄(推定: high confidence)だが、失敗分類と retryable 判定は必須 | GitHub 公式仕様+gateway エラー分類 :492-493 |
| C-E2 | Status 選択肢名は Project 管理者がいつでも変更しうる外部可変値 — 解決不能時は safety-blocked で停止し completion close へ進まない。改訂後の既定マッピング(フェーズ名 Ideation/Inception/Construction/Operation)は実 Project #5 の現選択肢に Done 以外存在せず、Project 側の再構成または上書き設定が運用前提(実測 2026-07-27) | Issue #1560(2026-07-27 改訂版)失敗セマンティクス欄+Project #5 選択肢実測 |
