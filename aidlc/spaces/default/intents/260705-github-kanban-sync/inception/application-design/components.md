# Components（260705-github-kanban-sync）

上流入力: [requirements.md](../requirements-analysis/requirements.md)、[stories.md](../user-stories/stories.md)

暫定機構（C07）のため、コンポーネントは「テスト境界として意味がある最小の分割」に留める。
実装先は `dev-scripts/kanban/`（ライブラリ）、`dev-scripts/kanban-sync.ts`（CLI）、`dev-scripts/kanban/hooks/`（hook 2 本）である（C02）。
`.claude/hooks/` は `.agents/amadeus/hooks/`（Amadeus 本体、parity 対象）への symlink であるため、hook の実体をそこへ置かない。`.claude/settings.json`（非 symlink の実ファイル）の hooks 設定から `dev-scripts/kanban/hooks/` を直接指す（decisions.md D-AD9）。

## 一覧

| # | Component | 置き場所 | 責務 | 対応 FR |
|---|---|---|---|---|
| C-1 | IntentScanner | `dev-scripts/kanban/scan.ts` | `intents.json` と各 Intent の `aidlc-state.md`、audit shard 名を読み、IntentCard の配列（board 非依存の中間表現）を作る | FR-1.1、FR-2.1〜2.3 |
| C-2 | ColumnMapper | `dev-scripts/kanban/scan.ts` 内の純関数 | IntentCard から列（Status option 名）を決める。承認待ち優先 → Done → phase 列 | FR-3.2 |
| C-3 | ProjectsClient | `dev-scripts/kanban/board.ts` | `gh api graphql` の薄い wrapper。scope 検査、project 解決、field / option の ensure、item の upsert | FR-3.1、FR-3.3〜3.7、FR-4.1 |
| C-4 | SyncRunner | `dev-scripts/kanban-sync.ts`（CLI） | C-1 → C-2 → C-3 を合成し、冪等な upsert を実行する。`--all`（全 Intent、メインリポジトリでの手動実行用）と `--dirs <dirName,...>`（部分 sync、flush 用）の 2 モード。終了コードとエラーメッセージの契約を持つ | FR-3.4、FR-4.2 |
| C-5 | QueueHook | `dev-scripts/kanban/hooks/kanban-queue.ts` | PostToolUse。default space の Intent record への Write / Edit を検知して、対象 record の dirName をキューへ 1 行追記。ネットワーク接続なし | FR-5.1 |
| C-6 | FlushHook | `dev-scripts/kanban/hooks/kanban-flush.ts` | Stop / SessionEnd。キュー非空 かつ 直近 2 分に成功なし のとき、キュー中の dirName 群を `kanban-sync.ts --dirs` で部分 sync。drop 記録 | FR-5.2、FR-5.4 |

## 中間表現（IntentCard）

```ts
type IntentCard = {
  dirName: string;        // カードタイトル
  uuid: string;
  status: string;         // intents.json の status
  scope: string;
  agent: string;          // aidlc-state.md の Active Agent（無ければ "未確認"）
  host: string;           // 最終更新 audit shard の <host>（無ければ "未確認"）
  worktree: string;       // Worktree Path（空なら リポジトリ直下 を示す "-"）
  stage: string;          // Current Stage
  awaiting: boolean;      // [?] ステージの存在
  issues: number[];       // intents.json の issues（無ければ []）
  syncedAt: string;       // ISO 8601 UTC
};
```

## 状態ファイル（hook 用、gitignore 対象）

- キュー: `.claude/kanban-sync/queue`（1 行 1 dirName。flush 成功で truncate）
- 実行記録: `.claude/kanban-sync/last-success`（ISO 8601 1 行。2 分抑制の判定に使う）
- drop 記録: `.claude/kanban-sync/drops.log`（hooks-health と同型の追記ログ）

状態ファイルは worktree ごとに独立する（checkout に付随する）。
2 分抑制も worktree ローカルだが、flush は自 worktree のキューに載った Intent のカードしか書かないため（D-AD7 改訂）、worktree 間で抑制を共有しなくても他 Intent のカードを壊さない。抑制の目的は同一セッション内の連続起動の抑止だけである。
