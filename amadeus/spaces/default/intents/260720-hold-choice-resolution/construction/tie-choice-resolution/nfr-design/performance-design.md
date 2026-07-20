# Performance Design — U1 tie-choice-resolution

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md — 設計は performance-requirements.md P-1〜P-3 の各行を実装形へ落とし、フロー位置は business-logic-model.md の受理/render フロー、実行基盤は tech-stack-decisions.md の Bun 継承に依拠。security/scalability/reliability の各要求が性能設計に追加制約を課さないことを本文末尾で確認。

## 設計

| NFR | 実装形 |
| --- | --- |
| P-1 | parseChoiceResolution は単一 regex `/^choice:(0|[1-9][0-9]*)$/` の1回適用+Number 変換のみ(固定様式短トークン — 実測義務対象外の記録は P-1 に確定済み)。ループ・再帰なし |
| P-2 | 実在照合は `choices.some(c => c.internalNo === n)` の1パス(choices 実測 2〜5件 — P-2 の機械集計)。エラー時の valid 列挙 `choices.map(...).join("/")` も同一オーダー |
| P-3 | render 側は既存 map 群へ分岐1つ追加(parseChoiceResolution 1回+find 1回)— 生成式・既存パスのコスト不変(business-logic-model.md render フロー) |

## 他 NFR からの制約確認

security-requirements.md S-1〜S-4(検証位置・情報漏洩なし)、scalability-requirements.md SC-1〜SC-3(規模非依存)、reliability-requirements.md R-1(append 順不変)は、いずれも上記実装形へ追加の性能コストを課さない(単発 CLI・同期処理のまま)。専用の性能計測・ベンチは追加しない(tech-stack-decisions.md の新規ツールゼロと整合)。
