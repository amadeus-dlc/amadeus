# External Dependency Map — record-roundtrip-pbt (#1980)

上流入力(consumes 全数): unit-of-work.md(全 Unit の所在 — 外部依存の走査母体)、components.md(reuse inventory の fast-check/typescript 既存性 — 依存棚卸しの転記元)、requirements.md(NFR-5 既存ゲート)、unit-of-work-dependency.md(CI 面の共有)、unit-of-work-story-map.md(配布面価値の依存確認)

## 外部依存の棚卸し

| 依存 | 種別 | 状態 | 備考 |
|---|---|---|---|
| fast-check ^4.9.0 | devDependency | **既存**(#697 導入済み) | 新規追加なし(ADR-1 前提)。配布フレームワークへの runtime dependency 追加もなし(Forbidden 遵守 — PBT はテスト側のみ) |
| typescript ^6.0.3 | devDependency | **既存** | ADR-2 の AST 走査は既存 devDependency のみで成立(新規外部依存ゼロ) |
| GitHub Actions(ci.yml) | CI 基盤 | 既存 | Bolt 5(lint ステップ追加)/ Bolt 6(workflow_dispatch ジョブ追加)。外部サービスの新規契約なし |
| Codecov | 既存 CI 連携 | 既存 | Bolt 1 のコア改修行が patch 母集団入り(NFR-2)。異常時は cid:requirements-analysis:external-status-triage に従う |
| GitHub(PR/mirror) | ホスティング | 既存 | mirror は auto-mirror: auto の既存境界運用のまま。新規外部操作なし |

## 結論

新規の外部依存・外部サービス契約・環境プロビジョニングは**ゼロ**。すべて既存基盤の上で完結する(deployment-pipeline 系ステージが SKIP であることと整合)。
