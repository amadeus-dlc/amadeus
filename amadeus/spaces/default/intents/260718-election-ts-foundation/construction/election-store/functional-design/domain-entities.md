# Domain Entities — election-store(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## 型(U1 型の直列化+store 固有)

| 型 | 形 | 由来 |
|---|---|---|
| `StoreError` | `"exists" \| "duplicate" \| "not-found" \| "io-error"` | FR-1a/3b、C2 表 |
| `Ledger` | 受理票の追記列(OriginalBallot/AmendBallot 混在)+ **late 区画(LateBallot 列 — reexamRequired を永続)** | FR-3c/3d |
| `ElectionStatus` | `{ voted: VoterId[]; pending: VoterId[]; state: ElectionState }` — voted/pending は導出値、**state は election.json の明示フィールドから読取**(E-ETF-FD2 (3) — 旧「導出値」併記の自己矛盾を是正) | FR-3c |
| `ElectionState` | ADR-3 の状態集合(E-ETF-FD2 Q2 裁定で確定 — 遷移の所有は U5、**election.json への保存は U2**) | ADR-3 |

## 不変条件

- ledger/timeline は追記のみ(既存エントリの書換 API を持たない — append-only)
- 実体化済み ballots/ は不変(後着は timeline+late 区画のみ)
