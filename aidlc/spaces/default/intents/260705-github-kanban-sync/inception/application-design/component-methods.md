# Component Methods（260705-github-kanban-sync）

上流入力: [components.md](components.md)、[requirements.md](../requirements-analysis/requirements.md)

各コンポーネントの公開関数と契約である。すべて Bun + TypeScript、実行時依存は gh CLI のみ（C03、N4）。

## C-1 IntentScanner（scan.ts）

| 関数 | 契約 |
|---|---|
| `scanIntents(spaceDir: string, now: Date, dirNames?: string[]): IntentCard[]` | `intents.json` を読み、entry ごとに record dir の `aidlc-state.md` と `audit/` を読んで IntentCard を返す。`dirNames` 指定時はその record だけを対象にする（部分 sync 用）。record dir が無い entry は agent / host / stage を `未確認` で返す（欠損で落とさない） |
| `parseStateFields(content: string): {agent, worktree, stage, awaiting}` | `**Active Agent**` などのフィールド行と `[?]` 行を正規表現で抽出する純関数 |
| `latestHost(auditDir: string): string` | 各 `<host>-<clone>.md` の本文中 `**Timestamp**:` の最大値を比較し、最新の shard のファイル名から `<host>` を返す純関数。mtime は使わない（checkout / rebase で書き換わり編集順序を反映しないため。FR-2.2） |

## C-2 ColumnMapper（scan.ts）

| 関数 | 契約 |
|---|---|
| `columnOf(card: IntentCard, phase: string): Column` | 優先順: `awaiting` → `Awaiting Approval`、status が completed / complete → `Done`、それ以外は Lifecycle Phase を列名へ写像（INITIALIZATION → Ideation に丸める。decisions.md D-AD2） |

## C-3 ProjectsClient（board.ts）

| 関数 | 契約 |
|---|---|
| `assertProjectScope(): void` | `gh auth status` の scope に `project` が無ければ、対処コマンド（`gh auth refresh -s project`）を含むメッセージで throw（FR-4.1） |
| `resolveProject(org: string, title: string): ProjectRef` | org の project を title で解決。見つからなければ「人間が作成する必要がある」旨を含むメッセージで throw（FR-3.1、C11） |
| `ensureFields(p: ProjectRef): FieldMap` | Status の option 6 個と text フィールド 7 個（Agent / Host / Worktree / Scope / Stage / Issue / Synced At）を存在確認し、無ければ作成して ID 対応表を返す（FR-3.5）。実装留意: 単一選択フィールドの option 追加は「既存 option 全体を読み出し、既存 ID を保持したまま新規分を加えた完全なセットを `updateProjectV2Field` へ渡す」必要がある。素朴な追加は既存 option の置換・ID 欠落を招く |
| `listItems(p: ProjectRef): Map<title, itemId>` | 既存 item をタイトル（dirName）で索引する |
| `upsertItem(p, fields, card, column): void` | タイトル一致の item が無ければ draft issue として作成し、全フィールドを mutation で上書きする（FR-3.4、FR-3.6）。1 item 分の mutation は 1 リクエストにまとめる |

## C-4 SyncRunner（kanban-sync.ts CLI）

| 関数 | 契約 |
|---|---|
| `main(argv): Promise<number>` | scope 検査 → project 解決 → ensureFields → scan → upsert。`--all` は全 Intent を対象（メインリポジトリでの手動実行用）、`--dirs <dirName,...>` は指定 record だけを対象（flush 用の部分 sync）。どちらも指定が無ければエラー。**`--all` は cwd がメインリポジトリのチェックアウトであることを検証し（`git rev-parse --git-dir` が `.git` ディレクトリ実体を指すこと = worktree でないこと）、worktree からの呼び出しは明示エラーで拒否する（D-AD11）**。成功で 0。失敗は 1 段落のエラーメッセージと非 0 exit（部分書き込みは冪等性で無害。FR-4.2） |

## C-5 QueueHook（kanban-queue.ts）

| 関数 | 契約 |
|---|---|
| stdin JSON → 判定 → 追記 | `tool_input.file_path` が `aidlc/spaces/default/intents/` 配下のとき、path から record の dirName を抽出して `.claude/kanban-sync/queue` へ 1 行追記して exit 0（`intents.json` 直接更新は全 dirName 扱いの `*` を積む）。それ以外は即 exit 0。ネットワーク・child process なし（FR-5.1、N2。対象を default space に限定するのはスキャン範囲 FR-2.1 と揃えるため） |

## C-6 FlushHook（kanban-flush.ts）

| 関数 | 契約 |
|---|---|
| stdin JSON → 判定 → 実行 | queue が空なら exit 0。`last-success` が 2 分以内なら exit 0（FR-5.2 の抑制。抑制は worktree ローカルで、目的は同一セッションの連続起動抑止）。それ以外は queue の dirName 群で `bun dev-scripts/kanban-sync.ts --dirs <...>` を同期実行し、成功なら queue truncate + last-success 更新、失敗なら `drops.log` に 1 行追記して exit 0（hook は失敗を伝播させない。FR-5.4）。**queue の `*`（registry 変更）は自動実行の対象にしない**。dirName 群だけを `--dirs` で流し、`*` は `drops.log` へ「registry 変更あり、メインリポジトリでの手動 `--all` が必要」と 1 行記録して queue から消化する（D-AD11） |
