# Domain Entities — U4 docs-sync

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

エンティティ集合は unit-of-work.md U4 の内容(棚卸し表 ✅ 10ファイル+α)を components.md C-7 の表から転記し、requirements.md AC-6 の「同一 Bolt 群内更新」対象を確定する。unit-of-work-story-map.md ジャーニー1 の読者(開発者)が参照する面。

## 更新対象台帳(components.md C-7 表の ✅ 集合 — README.ja.md 追加是正後の10ファイル)

| ファイル | 更新内容(services.md 実行面表への整合) |
|---|---|
| docs/reference/09-testing.md / .ja.md | tier 一覧へ perf 追加、--perf/--all 記述、perf.yml 節新設 |
| README.md / README.ja.md | CI 概要の更新(blocking = 高速検証 / 非 blocking = perf.yml)— en/ja 対訳同期 |
| docs/guide/publishing-setup.md / .ja.md | test:ci 記述の整合 |
| docs/reference/01-architecture.md / .ja.md | CI 構成図・記述の整合 |
| docs/reference/11-contributing.md / .ja.md | 検証コマンド一覧へ --perf 追記 |

+ Bolt 冒頭の component-methods.md C-7 dual-key 再 grep で検出された差分ファイル(あれば台帳へ追記)

## 不変条件

- ❌ 集合(docs/research/upstream-sync/ の履歴2ファイル)は無接触
- コード内文書面(run-tests usage・workflow コメント)は U1〜U3 で更新済み — U4 では検査のみ(重複更新しない)
