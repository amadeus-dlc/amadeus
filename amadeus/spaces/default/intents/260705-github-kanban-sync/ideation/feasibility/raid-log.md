# RAID ログ（260705-github-kanban-sync）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)、[market-trends.md](../market-research/market-trends.md)

## Risks（リスク）

| ID | リスク | 影響 | 緩和 |
|---|---|---|---|
| R01 | GraphQL rate limit / スキーマ変更で sync が失敗する | 鏡が古くなる | 冪等な全上書き設計により次回 flush で回復。鮮度フィールドで遅延が見える。暫定機構のため作り込まない |
| R02 | 複数 worktree からの同時 flush が競合する | 一時的な表示揺れ | 全 Intent スキャン + 全上書きの冪等設計で最終状態は収束する |
| R03 | hook 追加がツール実行のレイテンシを悪化させる | 開発体験の劣化 | PostToolUse はローカルキュー書き込みだけにする（C05） |

## Assumptions（前提）

| ID | 前提 |
|---|---|
| A01 | `aidlc-state.md` の Active Agent / Worktree Path / stage 進捗は今後も維持される（エンジン側の契約） |
| A02 | audit shard 名（`<host>-<clone>`）からホスト識別を取得できる |
| A03 | Projects v2 と `gh api graphql` は本仕組みの寿命（暫定期間）中は安定している |

## Issues（既知の問題）

| ID | 問題 | 状態 |
|---|---|---|
| I01 | 現在の `gh` トークンに `project` scope が無い | 未解消。Construction 開始前に `gh auth refresh -s project` を人間が実施する（C11） |
| I02 | `intents.json` に Issue 参照フィールドが無い | 承認済み。scope-definition で Maintainer が `issues` フィールド追加を承認した（DECISION_RECORDED、decision-log D11）。実装は段階 ① で行う |

## Dependencies（依存）

| ID | 依存先 | 内容 |
|---|---|---|
| D01 | GitHub CLI（gh） | 認証と GraphQL 呼び出しの唯一の経路（C03） |
| D02 | 既存 hooks 基盤 | PostToolUse / Stop / SessionEnd の結線先と hooks-health の drop 記録形式 |
| D03 | エンジンの状態契約 | `intents.json` と `aidlc-state.md` のフィールド構造（読み取りのみ。エンジンには変更を加えない = C02） |
