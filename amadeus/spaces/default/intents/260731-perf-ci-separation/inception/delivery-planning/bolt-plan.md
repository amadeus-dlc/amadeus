# Bolt Plan — 260731-perf-ci-separation

上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md

unit-of-work.md の 4 Unit を 1 Unit = 1 Bolt = 1 PR で直列実行する(unit-of-work-dependency.md の DAG に従う)。

## Bolt 列

| Bolt | Unit | ブランチ(案) | 主変更 | 完了条件 |
|---|---|---|---|---|
| 1 | perf-tier-and-migration | `bolt/perf-tier-and-migration` | tests/run-tests.ts、tests/perf/ 新設・移設、coverage データ再生成 | AC-1/AC-4/AC-5 全 green、PR マージ |
| 2 | perf-workflow | `bolt/perf-workflow` | .github/workflows/perf.yml 新設 | AC-2(マージ後 dispatch green まで)、PR マージ |
| 3 | ci-slim | `bolt/ci-slim` | ci.yml 3 job 削除 | AC-3、FR-3d 対照表照合、PR マージ |
| 4 | docs-sync | `bolt/docs-sync` | docs 10ファイル+α | AC-6、NFR-1 非退行層の実測記録、PR マージ |

- 各 Bolt は git worktree 分離で実装(cid:code-generation:solo-bolt-worktree-required)。ベース=main、マージターゲット=main、スカッシュマージ
- Bolt 2 の AC-2 完全充足(dispatch green)はマージ後の実測 — マージ前は静的検証+マージ直後に dispatch 実行して確認。失敗時は即 follow-up
- requirements.md の FR→Bolt 対応: FR-1/4/5→Bolt1、FR-2→Bolt2、FR-3→Bolt3、FR-6→Bolt4(components.md C-1〜C-7 の写像は unit-of-work.md どおり)

## Walking Skeleton の扱い

本 intent は既存コードベースへのインクリメンタル変更(新パッケージ・新配布経路なし — perf.yml は既存 CI 基盤上の workflow 追加)であり、project.md Walking Skeleton 節の「greenfield 要素を含む intent」に該当しない。ただし scope は self-feature のため、Mandated「active scope が self-feature なら最初の Construction Bolt に walking-skeleton gate を維持」に従い、**Bolt 1 は単独・ゲート付きで実行し、ユーザー承認後に残り Bolt へ進む**。Bolt 1 は「--ci から perf が消え、--perf で全量が回る」端到端スライスであり skeleton の実質を満たす。

## Construction Autonomy Mode

Bolt 1 出荷後のラダープロンプトでユーザーが選択(org.md — 自律継続 or 全 Bolt ゲート)。ソロモード・直列 DAG のため並行 builder 枠(最大4)は使用しない。
