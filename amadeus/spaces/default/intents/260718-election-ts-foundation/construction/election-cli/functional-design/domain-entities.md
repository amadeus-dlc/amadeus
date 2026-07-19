# Domain Entities — election-cli(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## 型

| 型 | 形 | 由来 |
|---|---|---|
| `ElectionDirective` | `distribute \| collect-wait \| tally-ready \| render \| verify \| done \| hold` の判別ユニオン(payload 形状は実装時確定 — decisions.md 委任。各枝は verb 名指し+引数を必須フィールドに持つ) | FR-0、ADR-3 |
| `ReportResult` | `"distributed" \| "ballots-collected" \| "tallied" \| "rendered" \| "verified" \| "hold-resolved"`(hold-resolved は resolution 必須 — Q2=A 裁定の復帰表参照) | ADR-3 追補 |
| `TransitionError` | `"invalid-transition" \| "unknown-election" \| "unknown-result"` | BR-C3 |

ElectionState は U2 の定義(**7状態** — rendered 追加、Q2=A 裁定)を消費 — 遷移規則の所有は U5、保存は U2(所有分離は component-dependency の層)。

## 不変条件

- 状態遷移は report 経由のみ(verb 実行自体は状態を進めない — next/report の分離、amadeus-orchestrate 同型)
- hold からの復帰は人間裁定の report のみ
