# Unit of Work（260705-github-kanban-sync）

上流入力: [components.md](../application-design/components.md)、[component-methods.md](../application-design/component-methods.md)、[services.md](../application-design/services.md)、[component-dependency.md](../application-design/component-dependency.md)、[decisions.md](../application-design/decisions.md)、[requirements.md](../requirements-analysis/requirements.md)、[stories.md](../user-stories/stories.md)

intent-backlog.md の P1〜P3 をそのまま Unit とする（P4 = auto-archive は人間設定のため Unit にしない。FR-3.8）。
1 Unit = 1 Bolt = 1 PR である。

| Unit | Deployment model | Complexity |
|---|---|---|
| u001-registry-issues-field | embedded（既存 `intents.json` へのスキーマ追加。独立した実行物なし） | S |
| u002-kanban-sync-cli | standalone（repo-local の CLI。`bun dev-scripts/kanban-sync.ts` 単体で完結） | L |
| u003-kanban-hooks | embedded（Claude Code の hooks 基盤へ repo-local 設定で組み込み） | M |

## u001-registry-issues-field（P1）

- **範囲**: `intents.json` の各 entry へ任意フィールド `issues`（数値配列）を追加し、既存 entry を遡及補完する（D-AD10: 実装者の直接編集、ワンショット）。既存読み手（エンジン、validator）の互換確認テストを含む。
- **成果物**: `intents.json` の更新、互換性の検証（既存 `npm run test:all` が green のままであること + `issues` 有無両方の entry を読めることの検証）。
- **対応**: FR-1.1〜1.3、US-1。
- **完了条件**: US-1 の受け入れ基準 3 件。

## u002-kanban-sync-cli（P2）

- **範囲**: `dev-scripts/kanban/scan.ts`（C-1 IntentScanner、C-2 ColumnMapper）、`dev-scripts/kanban/board.ts`（C-3 ProjectsClient）、`dev-scripts/kanban-sync.ts`（C-4 SyncRunner、`--all` / `--dirs`、worktree からの `--all` 拒否ガード = D-AD11）。TDD で C-1 / C-2 は実ファイル fixture、C-3 は GraphQL 引数生成境界を検証する。
- **成果物**: 上記 3 ファイル + テスト。board 実機での初回 sync 結果（人間が board を確認する = mob-composition.md の協働点）。
- **対応**: FR-2.1〜2.3、FR-3.1〜3.7、FR-4.1〜4.2、US-2〜US-5。
- **完了条件**: US-2〜US-5 の受け入れ基準。人間操作の前提（`gh auth refresh -s project`、org project「Amadeus Intents」の作成と repo リンク = D-AD8、C11）が着手前に済んでいること。

## u003-kanban-hooks（P3）

- **範囲**: `dev-scripts/kanban/hooks/kanban-queue.ts`（C-5）、`dev-scripts/kanban/hooks/kanban-flush.ts`（C-6、`*` の drop 化 = D-AD11）、`.claude/settings.json` への repo-local 結線（D-AD9）、`.gitignore` へ `.claude/kanban-sync/` 追加。
- **成果物**: hook 2 本 + テスト（キュー追記の純関数部、flush の抑制判定部）+ settings 結線。
- **対応**: FR-5.1〜5.4、US-6。
- **完了条件**: US-6 の受け入れ基準 3 件。

## Unit にしないもの

- P4（auto-archive）: Projects v2 の built-in workflow 設定。U002 の board 確認時に Maintainer が有効化する（FR-3.8）。
- 遡及補完スクリプト: 作らない（D-AD10）。
