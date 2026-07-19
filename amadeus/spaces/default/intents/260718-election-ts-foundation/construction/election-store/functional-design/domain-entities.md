# Domain Entities — election-store(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## 型(U1 型の直列化+store 固有)

| 型 | 形 | 由来 |
|---|---|---|
| `StoreError` | `"exists" \| "duplicate" \| "not-found" \| "io-error"` | FR-1a/3b、C2 表 |
| `Ledger` | 受理票の追記列(OriginalBallot/AmendBallot 混在 — U1 の判別ユニオンを直列化) | FR-3c |
| `ElectionStatus` | `{ voted: VoterId[]; pending: VoterId[]; state: ElectionState }` — 導出値(保存しない) | FR-3c |
| `ElectionState` | `"draft" \| "open" \| "collecting" \| "tallied" \| "recorded" \| "hold"`(ADR-3 の6状態 — 状態遷移の所有は U5、保存面は U2) | ADR-3 |

## 不変条件

- ledger/timeline は追記のみ(既存エントリの書換 API を持たない — append-only)
- 実体化済み ballots/ は不変(後着は timeline+late 区画のみ)
