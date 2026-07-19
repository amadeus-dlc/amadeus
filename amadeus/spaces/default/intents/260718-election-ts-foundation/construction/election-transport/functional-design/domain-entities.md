# Domain Entities — election-transport(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## 型

| 型 | 形 | 由来 |
|---|---|---|
| `ShortNotification` | `{ electionId: ElectionId; viewPath: string }` — 2フィールドのみ(FR-2a の型保証。質問文・選択肢・推奨の追加はフィールド不在により表現不能) | FR-2a |
| `DeliveryRecord` | `{ voter: VoterId; at: string; transport: "agmsg" \| "subagent" }` | FR-2b/7b |
| `TransportError` | `"send-failed" \| "voter-unknown" \| "view-missing"` | FR-2 |
| `VoterTransport` | notify 1メソッドの interface(port — テストは fake 実装をテスト側に置く。本番コードにテスト分岐なし) | FR-7a、construction ガードレール |

## 不変条件

- 通知 payload の情報量上限 = ShortNotification の2フィールド(型が上限を強制)
