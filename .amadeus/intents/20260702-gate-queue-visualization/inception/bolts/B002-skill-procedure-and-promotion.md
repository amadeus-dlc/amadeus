# B002 手順記載と promote 同期

## 概要

`amadeus-validator` の利用者向け文書へ承認待ちキュー一覧の実行手順を記載し、source skill と昇格先を promote 手順で同期する。

## 対象ユニット

- U001

## 設計

- [design.md](../units/U001-approval-queue-listing-contract/design.md)

## 完了条件

- 一覧の実行手順（コマンド）が `amadeus-validator` の利用者向け文書から読める。
- source skill（`skills/amadeus-validator/`）と昇格先（`.agents/skills/amadeus-validator/`）が `dev-scripts/promote-skill.ts` で同期されている。
- `npm run test:it:promote-skill` が pass する。

## 依存

- B001

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT003 | amadeus-dlc/amadeus | `skills/amadeus-validator/SKILL.md` と `.agents/skills/amadeus-validator/SKILL.md` | 未確認 | なし | 未確認 |

## 未確認事項

- 手順を置く見出しの位置は Construction Functional Design で確定する。
- `README.md` など skill 文書以外への記載の要否は Task Generation で確定する。
