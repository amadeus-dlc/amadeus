# External Dependency Map — autonomy-reachability(#2378)

上流入力(consumes 全数): unit-of-work.md / unit-of-work-dependency.md / unit-of-work-story-map.md(Unit 側の依存の外部面)、requirements.md(NFR-5 配布制約)、components.md(C6 Conduit の配布面が Codecov/CI 依存の対象)、scope-document.md(Out 境界)。

## 外部依存の目録

| 依存 | 種別 | 影響 Bolt | 可用性・対策 |
|---|---|---|---|
| GitHub(PR・CI) | サービス | 全 Bolt の着地 | 既存運用どおり。CONFLICTING 中は CI 不発(conflicting-pr-suppresses-ci)— converge-loop で対処 |
| bun ランタイム | ツールチェーン | 全 Bolt | 1.3.13 実測済み(本 worktree) |
| JDK/TLC(formal-model-check) | 任意 | なし(specs/tla 非接触 — advisory は defer-with-risk 裁定済み) | CI の専用ジョブでのみ実行(本 intent の依存ではない) |
| Codecov(patch gate) | サービス | Bolt 1〜4 | 既存 blocking gate。外部 status 異常時は external-status-triage に従う |

## 非依存の明示(N/A)

- AWS 等のクラウド基盤: N/A — 本プロジェクトは配備基盤を持たない(project.md Deployment)
- 他リポジトリ: N/A — 単一 repo `amadeus` 完結
- 外部 API キー・シークレット: N/A — 追加なし

## 内部依存(参照)

Unit 間依存は unit-of-work-dependency.md の DAG が正本(u2→u1、u4→u2、u5→u1/u2/u3)。本 map は外部面のみを扱う。
