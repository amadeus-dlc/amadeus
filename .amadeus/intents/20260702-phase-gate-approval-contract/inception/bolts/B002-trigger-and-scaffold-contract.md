# B002 grilling トリガーと scaffold-only 条件の契約変更

## 概要

phase skill（ideation、inception、construction）の decision review に文言規約による決定論的 grilling トリガーを追加し、`amadeus-ideation` の auto 判定の scaffold-only 条件を確定判断の記録 3 種への参照の実在に限定する Bolt である。

## 対象ユニット

- U001

## 設計

- [U001 Unit Design Brief](../units/U001-phase-gate-skill-contract/design.md)

## 完了条件

- 3 つの phase skill の decision review 記述に、前段 phase 必須成果物の `未確定事項` と `未確認事項` 見出しで「<現在 phase> で判断する」を含む項目が 1 件以上残っていれば `grill_required` とする規則が定義されている。
- 後続 phase へ送る未確定事項は「〜は <phase> で判断する。」の形で書くという記録規約が、同じ契約の中に定義されている。
- ideation の auto 判定の scaffold-only 条件が、GitHub Issue の確定判断、Grilling Decision Trail、Discovery Brief の確定済み判定と候補判断の 3 種への参照の実在と導出可能性になっている。
- 対象 skill の source と昇格先が promote 手順で同期され、`npm run test:it:promote-skill` が pass する。
- 変更 PR がレビュー支援契約（挙動差分要約、skill-forge 確認、粒度制約）に従っている。

## 依存

- B001

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `skills/amadeus-ideation/SKILL.md`, `.agents/skills/amadeus-ideation/**` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `skills/amadeus-inception/SKILL.md`, `.agents/skills/amadeus-inception/**` | 未確認 | なし | 未確認 |
| IT003 | amadeus-dlc/amadeus | `skills/amadeus-construction/SKILL.md`, `.agents/skills/amadeus-construction/**` | 未確認 | なし | 未確認 |
| IT004 | amadeus-dlc/amadeus | `skills/amadeus-decision-review/SKILL.md`, `.agents/skills/amadeus-decision-review/**` | 未確認 | なし | 未確認 |

## 未確認事項

- トリガーを `amadeus-decision-review` の判断ノード表に統合するか、各 phase skill の Decision Review 節だけに書くかは Task Generation と実装で確定する。
