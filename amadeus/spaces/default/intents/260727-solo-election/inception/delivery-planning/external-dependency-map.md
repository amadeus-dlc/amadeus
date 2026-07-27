# External Dependency Map — solo-election

上流入力(consumes 全数): bolt-plan.md、requirements.md(FR-10 降格・FR-13 同期の外部面)、unit-of-work.md(同期面)、unit-of-work-dependency.md(外部依存が Bolt 順序に影響しないことの確認)、unit-of-work-story-map.md(降格時のユーザー体験段)、components.md(TLC 対象 = TLA 拡張の出典)、team-practices.md(gh/GitHub 境界の現行実践)、feasibility-assessment.md 経由の外部前提(constraint-register C-06/C-07)。

## 外部依存

| 依存 | 種別 | 状態 |
|---|---|---|
| Agent tool(subagent spawn)+ subagent の Bash 実行権 | ハーネス機能 | 実証済み(本 intent の §12a reviewer 運用ほか)。不能環境は FR-10 の loud 降格 |
| TLC(TLA+ 完全探索) | CI の workflow_dispatch 専用ジョブ(two-layer-verification-posture 既設) | 既存 — Bolt 1 で発動 |
| GitHub(PR/CI/ミラー #1595) | 外部サービス | 既存経路。可用性障害時は mirror ノルムどおり loud 記録+リトライ |
| npm 等の新規外部サービス | — | なし |

## 依存の扱い

- すべて既存経路の再利用で、新規の資格情報・鍵・external サービス契約は発生しない。障害時の扱いは各行の状態列どおり(loud 記録・リトライ・降格)。
