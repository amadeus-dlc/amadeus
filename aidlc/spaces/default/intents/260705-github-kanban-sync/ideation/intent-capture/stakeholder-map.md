# Stakeholder Map — GitHub Kanban Sync（260705-github-kanban-sync）

## 主要ステークホルダーと関心事

| ステークホルダー | 役割 | 関心事 |
|---|---|---|
| Maintainer（j5ik2o） | ゲート審査官、唯一の人間作業者 | 並行作業の全体像の一覧性。承認待ちキューの発見。放置ゲートの検出。正準台帳（`intents.json`）の構造変更の妥当性 |
| 実行エージェント（Claude、Codex） | 各 worktree での Intent 実行者 | hook 起動 sync がツール実行のレイテンシを悪化させないこと。sync 失敗が workflow を阻害しないこと |
| Amadeus エンジン・validator | 状態と成果物の契約の所有者 | `intents.json` のスキーマ変更（`issues` フィールド追加）が既存の読み手（エンジン、validator、既存スクリプト）を壊さないこと |

## 意思決定者と影響者

- **意思決定者**：Maintainer。台帳スキーマ変更の承認、各ゲート承認、PR の merge をすべて担う（merge 操作は人間が行う）。
- **影響者**：実行エージェントと hooks 基盤。sync の発火点と失敗時の回復設計は既存 hook 群（`amadeus-audit-logger.ts`、hooks-health）の実装制約に従う。

このプロジェクトは 1 人の人間と複数エージェントの自己開発体制であり、外部の承認者や利用部門は存在しない。

## コミュニケーション要件

- 進捗と判断は、本 Intent record（`aidlc/spaces/default/intents/260705-github-kanban-sync/`）と Issue #470 で追跡する。
- 段階（①台帳整備、②手動 sync、③hook 結線）ごとに別 PR とし、PR 説明から Issue #470 と本 Intent をリンクする。
- 台帳スキーマ変更（`issues` フィールド）は、実装前に Maintainer の明示承認を得る（正準台帳の構造変更のため）。
