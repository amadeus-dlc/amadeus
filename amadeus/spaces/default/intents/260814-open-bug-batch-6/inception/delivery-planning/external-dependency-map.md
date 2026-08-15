# External Dependency Map — 260814-open-bug-batch-6

## 外部依存

| 依存 | 種別 | 影響 Bolt | 可用性・リスク |
| --- | --- | --- | --- |
| GitHub(gh CLI、PR/CI/merge queue) | サービス | 全 Bolt | 認証済みを実測済み。障害時は push/PR 作成が遅延(loud fail、ワークフローは継続) |
| GitHub Actions required CI(ci-success 集約) | サービス | 全 Bolt | blocking 検証の正本(remote-first)。queue 遅延は待ち時間のみ |
| 並行 intent 260814-priority-bug-batch(PR 群) | 内部並行作業 | 全 Bolt | ファイル交差時は直列化。merge queue 上の先行 PR とは queue 合成で自動整合 |
| bun / TLC 等ローカルツールチェーン | ツール | B1-B5 | 検証済み(本セッションで build・TLC 実行実績) |

## 非依存(明示)

- 外部 API・クラウドインフラ・デプロイ環境への依存なし(リリースは本 intent のスコープ外)
- #3077(選挙 CLI)/ #3078(孤児モジュール)は本 intent の Bolt 実行をブロックしない(起票済み・スコープ外)
