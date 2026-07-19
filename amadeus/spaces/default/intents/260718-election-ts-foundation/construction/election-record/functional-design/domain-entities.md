# Domain Entities — election-record(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## 型(U1 の型を消費 — 新規は検査結果型のみ)

| 型 | 形 | 由来 |
|---|---|---|
| `GoaFreq` | `Map<Goa, number>` 相当の度数(再計算関数から導出 — 保存しない) | FR-5a |
| `VerifyFinding` | `{ kind: "reservation-count" \| "ballot-count" \| "freq-mismatch" \| "timeline-order"; expected; actual }` | FR-6 |
| `VerifyResult` | `Result<void, VerifyFinding[]>`(全 finding を列挙 — 最初の1件で打ち切らない) | FR-6b |
| `TimelineEvent` | `{ kind: "distributed" \| "ballot" \| "tally" \| "late"; at: string; voter?: VoterId }` — 記帳実体は U2 所有、型は U1/U3 共有 | FR-2b/5a |

## 不変条件

- GoA 行は保存値でなく票データからの再計算のみで生成(文書のふりをしたフィールドを持たない — construction ガードレール)
