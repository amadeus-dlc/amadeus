# External Dependency Map

Intent: 260818-priority-bug-batch-4

上流: `bolt-plan.md`(Bolt 構成)。

## 判定: 外部依存なし(fully AI-contained)

本 intent の 2 Bolt はいずれも本リポジトリ内のコード・テスト・docs の変更で完結し、外部 API・データ提供窓口・外部チームハンドオフ・承認リードタイムを持たない。

| 項目 | 状態 |
|---|---|
| 外部 API / サービス | なし(GitHub API は gh CLI 経由の既存 CI/PR 運用のみで、新規依存ではない) |
| データ可用性ウィンドウ | なし |
| 外部チームハンドオフ | なし(ソロモード) |
| 承認ゲート(人間) | PR マージ(常任承認条件外の場合)のみ — 内部運用ノルムであり外部依存ではない |
