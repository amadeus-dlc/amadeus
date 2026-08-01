# External Dependency Map — 260801-cg-plan-guard

上流入力(consumes 全数): unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md、components.md、requirements.md

- `requirements.md` の前提(GitHub 可用性・ソロモード)と `unit-of-work.md` の変更面から外部依存を棚卸しした。`unit-of-work-dependency.md` / `unit-of-work-story-map.md` の Unit 境界に外部依存の追加はない。
- 「新規外部依存なし」の判定は `components.md` の C1〜C7 全数が既存3モジュール内の追加であることの棚卸しによる。

## 外部依存

| 依存 | 用途 | 障害時 |
|---|---|---|
| GitHub(gh) | PR 作成・CI・マージ | PR 発行不能時は builder が push まで完遂し conductor へ報告(workflow は継続) |
| GitHub Actions CI | blocking gate 集合 | 赤はジョブログ実文で再帰属(rerun-red-reattribution) |
| なし(新規ランタイム依存) | — | Bun-only 前提不変(Forbidden 準拠) |

## 内部依存(参考)

audit シャード(SWARM イベント読み)と runtime-graph(bolt_dag)は repo 内完結 — 外部サービス依存なし。corpus 10+1 record も repo 内(読み取り専用)。
