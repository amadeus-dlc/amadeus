# Risk & Sequencing Rationale — otel-meta-schema

上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md — Bolt 列は unit-of-work-dependency.md の YAML DAG(機械正)から、各 Bolt の中身と規模は unit-of-work.md の按分から、walking skeleton の位置づけは requirements.md FR-RES-3 と story-map の段1から、ゲート要件は components.md の pin 連動(U4)から導出した。

## リスク台帳

| リスク | 位置づけ | 制御 |
|---|---|---|
| R1 注入 seam の設計不成立(最大) | U1 | walking skeleton で最初に実証(Bolt 1 単独ゲート)。失敗時は ADR-2 再裁定へ |
| R2 tracer-provider 3者交差の並行事故 | U1/U2/U3 | DAG エッジで直列化済み(U2/U3 は U1 後)。着手前実 diff 再評価 |
| R3 canonical 79 化の pin 6箇所同時更新漏れ | U4 | 落ちる実証(1箇所残しで赤)を Bolt 3 の完成条件に含める |
| R4 FR-SUB-4 供給経路の不在 | U2 | FD 段で hook API 実測 — 不在なら resolver 契約のみで fail-open 確定(申告済み委譲) |
| R5 stacktrace redaction の漏れ | U3 | 絶対パス注入の落ちる実証+corpus 相当の実 stack サンプル検証 |
| R6 dist 二重 module graph の旧バイト読み | 全 Bolt | NFR-4 を各 PR の checklist 化+dist:check/promote:self:check |

## 順序の根拠

risk-first: R1(seam)を Bolt 1 に先行させ、価値の大きい U3(バグ改修一次証拠)を batch 2 の並行枠で早期化。U4 は registry 交差の直列制約により batch 3。docs は実装確定後(実属性対応表の正確性)。
