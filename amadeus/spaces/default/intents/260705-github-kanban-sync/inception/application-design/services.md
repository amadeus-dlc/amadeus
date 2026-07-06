# Services（260705-github-kanban-sync）

上流入力: [components.md](components.md)、[requirements.md](../requirements-analysis/requirements.md)

本 Intent は常駐サービスを持たない。実行単位は次の 2 つだけである。

## 実行単位

| 実行単位 | 起動方法 | 構成 |
|---|---|---|
| 手動 sync（P2） | `bun dev-scripts/kanban-sync.ts --all` を人間がメインリポジトリで起動 | SyncRunner（C-4）が IntentScanner / ColumnMapper / ProjectsClient を合成する 1 パス処理 |
| 自動 flush（P3） | Claude Code の PostToolUse / Stop / SessionEnd（`.claude/settings.json` = 非 symlink の実ファイル、の hooks 設定から `dev-scripts/kanban/hooks/` を直接指す。`.claude/hooks/` symlink 配下には置かない） | QueueHook（C-5）と FlushHook（C-6、`--dirs` の部分 sync）。状態は `.claude/kanban-sync/` のローカルファイルのみ |

## 外部接点

| 接点 | 方向 | プロトコル |
|---|---|---|
| GitHub Projects v2 | 書き込みのみ（一方向鏡、C01） | `gh api graphql`（認証は gh の既存ログイン + project scope） |
| ローカル成果物（intents.json、aidlc-state.md、audit/） | 読み取りのみ | ファイル読み取り。エンジン成果物への書き込みはしない（C02） |
