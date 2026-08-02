# External Dependency Map — otel-meta-schema

上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md — Bolt 列は unit-of-work-dependency.md の YAML DAG(機械正)から、各 Bolt の中身と規模は unit-of-work.md の按分から、walking skeleton の位置づけは requirements.md FR-RES-3 と story-map の段1から、ゲート要件は components.md の pin 連動(U4)から導出した。

## 外部依存

| 依存 | 種別 | 状態 |
|---|---|---|
| なし(新規パッケージ依存ゼロ) | — | vendored OTel API のみ(既存方針維持) |
| GitHub(PR/CI) | 運用 | 既存 blocking gate 集合をそのまま使用 |
| ハーネス hook API(model/session 供給・PreToolUse) | 実行環境 | claude を最初の実証対象。他ハーネスは fail-open 省略で段階導入(scope-document の Won't どおり全ハーネス保証はしない) |

外部サービスの新規到達性要件なし。

## 検証方針

外部前提の検証は実ツール直接照会(feasibility:c1)— ハーネス hook API の実測は FD 段(R4)で行い、本ステージでは前提を追加しない。
