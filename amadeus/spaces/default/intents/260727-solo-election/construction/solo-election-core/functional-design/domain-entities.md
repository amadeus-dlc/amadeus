# Domain Entities — solo-election-core (U1)

上流入力(consumes 全数): component-methods.md(型変更点)、business-logic-model.md(個数照合)、requirements.md(FR-03 の票属性)、unit-of-work.md(U1 が型を足さない境界の根拠)、unit-of-work-story-map.md(エンティティが支えるジャーニー段)、components.md(所在 file:line の出典)、services.md(不変エンティティの実行時役割)。

## 変更エンティティ

| 型 | 変更 | 所在 |
|---|---|---|
| HoldReason | `"tie" \| "block" \| "quorum-short" \| "discussion-needed"` → `+ "split"` | amadeus-election-model.ts:419 |
| HOLD_RESOLUTIONS | `split: { adopted: "tallied", rejected: "tallied", reopen: "collecting" }` を追加 | amadeus-election.ts:81-86 |

## 不変エンティティ(境界の明示)

- Election(voters: string[] — :55。2体判定はこの length を読むだけで型変更なし)
- Ballot / OriginalBallot / AmendBallot(voterKind "subagent" は定義済み :126-145 — U1 は新規スキーマを足さない)
- TallyResult の形(established / hold の直和 — reason 値域のみ拡張)
- GoaCounts(favor/against/abstain/discuss の4カウンタ — 不変)
- DeliveryDirective / DeliveryRecord(transport 層 — U1 は触らない)
