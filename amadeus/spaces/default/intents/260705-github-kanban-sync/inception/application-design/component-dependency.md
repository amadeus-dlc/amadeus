# Component Dependency（260705-github-kanban-sync）

上流入力: [components.md](components.md)

## 依存グラフ

```
QueueHook (C-5)      FlushHook (C-6)
 dev-scripts/kanban/hooks/   │ 起動（child process、--dirs <queue の dirName 群>）
     │                       ▼
     ▼                kanban-sync.ts CLI (C-4 SyncRunner, --all | --dirs)
 .claude/kanban-sync/        │
  queue / last-success       ├─► IntentScanner (C-1) ─► ColumnMapper (C-2)
  / drops.log                │        │ 読み取りのみ
                             │        ▼
                             │   intents.json / aidlc-state.md / audit/
                             └─► ProjectsClient (C-3)
                                      │ gh api graphql
                                      ▼
                                 GitHub Projects v2
```

## 依存の規律

- C-1 / C-2 は GitHub を知らない（純ローカル）。C-3 はローカル成果物を知らない。合成は C-4 だけが行う。テストは C-1 / C-2 を実ファイル fixture で、C-3 を gh 呼び出しの引数生成境界で検証する。
- hook（C-5 / C-6）は CLI（C-4）にだけ依存し、ライブラリ関数を直接 import しない。hook の失敗は exit 0 で握り、drop 記録に残す（FR-5.4）。
- hook の実体は `dev-scripts/kanban/hooks/` に置く。`.claude/hooks/` は Amadeus 本体（`.agents/amadeus/hooks/`、parity 対象）への symlink のため、そこには置かない（C02、D-AD9）。
- worktree からの flush は、その worktree のキューに載った Intent（= その worktree で実際に書かれた record）だけを `--dirs` で部分 sync する。queue の `*`（registry 変更）は自動実行せず drop 記録に落とすため、自動 flush が他 Intent のカードへ書く経路は存在しない。加えて CLI 側も worktree からの `--all` を拒否する二重ガードを持つ（D-AD7 改訂、D-AD11）。
- Amadeus エンジン成果物への依存は読み取り専用であり、逆方向（エンジン → 本ツール）の依存は作らない（C02）。
- P1（issues フィールド）は C-1 の入力形式にだけ影響する。P2（C-1〜C-4）、P3（C-5 / C-6）の PR 分割は依存の向きと一致する。
