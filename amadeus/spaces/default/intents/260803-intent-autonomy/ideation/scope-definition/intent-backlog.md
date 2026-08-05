# Prioritized Intent Backlog

## 上流と優先方式

本backlogは`intent-statement.md`、`scope-document.md`、[#2067](https://github.com/amadeus-dlc/amadeus/issues/2067)、[#2095](https://github.com/amadeus-dlc/amadeus/issues/2095)、[#2096](https://github.com/amadeus-dlc/amadeus/issues/2096)から導出した。`feasibility-assessment`と`constraint-register`は本Intentでは存在しない。

全項目をMoSCoWのMust-haveとし、priorityは依存順を表す。数値根拠のないWSJF / RICEスコアは付けない。

## Must-have Backlog

| Priority | ID | Proto-Unit | 主な成果 | Depends on | Trace |
|---:|---|---|---|---|---|
| 0 | BL-00 | Issue contract reconciliation | GAP-01〜13の承認済み要求・設計判断・test oracle | なし | 3 Issues + 現行contract |
| 1 | BL-01 | Monitor schema and compile | workflow manifest、検証、runtime graph投影、安定ID | BL-00 | #2095 宣言モデル |
| 2 | BL-02 | Durable cycle runtime | cycle照合、threshold、ignore、audit-backed履歴、clone/session耐性 | BL-01 | #2095 永続化と再開 |
| 3 | BL-03 | Judge and stop latch | evidence SPI、閉じたroute、crash resume、fingerprint latch | BL-02 | #2095 Core境界 |
| 4 | BL-04 | Internal contribution SPI | PluginがCore変更なしでMonitor / provider / route ruleを寄与 | BL-01〜03 | #2095 Plugin SPI |
| 5 | BL-05 | Quality evidence normalization | reviewer / sensor / produces / conditionのobligationとfingerprint | BL-04 | #2096 §2–3 |
| 6 | BL-06 | Repair policy | fixed point / churn / regression、repair / replan / stalled | BL-05 | #2096 §4–6 |
| 7 | BL-07 | First-party Plugin activation | 同梱、compile、`semi/full`自動、`none`任意、preflight | BL-04〜06 | #2096 Pluginと配線 |
| 8 | BL-08 | Autonomy mode and grant | 3モード、Intent束縛grant、人間だけの変更、audit provenance | BL-00 | #2067 Modeとgrant |
| 9 | BL-09 | Automatic gate/question decisions | 事前裁定、norm / 過去裁定、election、recommendation、Walking Skeleton | BL-08 | #2067 Gate、質問、品質 |
| 10 | BL-10 | Quality-loop integration | `semi/full`からPluginを使い、停止・再開とgrant状態を統合 | BL-07〜09 | #2067 + #2096 |
| 11 | BL-11 | Audit review UX and status | Event Registry、確認surface、accept / flag、result envelope | BL-08〜10 | #2067 AuditとUX |
| 12 | BL-12 | Five-harness contract suite | 5harnessで同一の決定論的contract tests、adapter-only拡張性 | BL-03〜11 | 3 Issues Harness AC |
| 13 | BL-13 | Five-harness live verification | opt-in smoke、solo electionまたはloud degradation、green記録 | BL-12 | #1717の必要部分 |

## Won't-have Backlog

| ID | 対象外 | 根拠 |
|---|---|---|
| WH-01 | 外部runner / scheduler、常駐supervisor | #2067 / #2095 / #2096 |
| WH-02 | GitHub / PR review / merge / convergence | #2067 / #2095 / #2096 |
| WH-03 | 外部Plugin manifest形式 | #2095 / #2096、#2065へ疎結合 |
| WH-04 | 新規stage、scope-grid行、stage runner | #2095 / #2096 |
| WH-05 | Kiroを含む#1717全体 | #2067が要求する部分blockerのみ |
| WH-06 | 時間・費用budget一般化 | 外部運用制約 |
| WH-07 | 新規権限、waiver自動承認、自動rollback | #2067外部権限境界 |
| WH-08 | 自動的な後続Intent作成 | #2067確認UX |

## Backlog受入ルール

- 各Proto-Unitは上流Issueの受け入れ条件へ双方向traceを持つ
- 未記載仕様を実装都合で補完しない。GAP-IDとして可視化し、承認後にcontractへ落とす
- 各段階を独立検証可能にし、後続が前段の正規化済みcontractだけへ依存する
- 現行5harnessの共通Coreはbyte-parity / drift guardを維持し、harness固有分岐はadapterへ閉じ込める
