# External Dependency Map（260705-github-kanban-sync）

上流入力: [bolt-plan.md](bolt-plan.md)、[constraint-register.md](../../ideation/feasibility/constraint-register.md)

外部チームや外部 API の契約待ちは存在しない。ゲート項目は Maintainer の人間操作 3 種だけである。

| # | ゲート項目 | 所有者 | ブロックする Bolt | リードタイム | 緩和 |
|---|---|---|---|---|---|
| E1 | `gh auth refresh -s project`（scope 付与） | Maintainer | B002 | 数分（対話操作） | B002 着手前に依頼する。未付与でも sync は明示エラーで安全に停止する（FR-4.1） |
| E2 | org project「Amadeus Intents」の作成と amadeus repo へのリンク（D-AD8） | Maintainer | B002 | 数分 | 同上。project 不在も明示エラーで停止する（FR-3.1） |
| E3 | 各 Bolt PR の merge | Maintainer | 次の Bolt の基点更新 | レビュー時間に依存 | 直列実行のため、merge 待ちの間は次 Bolt の branch を先行作成しない（Git Branching Policy の merge 後処理に従う） |
