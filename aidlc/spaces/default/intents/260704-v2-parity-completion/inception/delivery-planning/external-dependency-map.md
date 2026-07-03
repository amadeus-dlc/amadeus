# External Dependency Map：260704-v2-parity-completion

## 一覧

| 外部依存 | 依存する Bolt | 内容 | 供給状態 |
|---|---|---|---|
| awslabs/aidlc-workflows（v2 branch、commit `fde1e1af7aae16f4c4defc991aa3877ee2ac26` の `dist/claude/`） | B001、B002、B003 | エンジン、stage 定義、sensors、hooks、38 skill のコピー元。パリティ検査の基準 | 取得済み（MIT-0。基準 commit 固定、更新は明示的に行う。C003） |
| Bun | B001〜B004 | エンジン、hook、検査スクリプトの実行系 | 導入済み（既存 dev-scripts が前提にしている） |
| Claude Code（skill と hook の実行ホスト） | B001、B002、B004 | skill 起動、hooks 発火、dogfooding の実行環境 | 稼働中（この環境自体） |
| real provider（examples 再生成の実行） | B004 | `npm run examples:generate:real` の実行 | 未確認（実行時の環境とコストは B004 開始時に確認する） |
