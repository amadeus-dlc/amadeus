# B002 手順参照の追加と promote 同期

## 概要

state 更新手順を持つ phase skill の該当手順へ雛形生成スクリプトの利用参照を追加し、対象 skill（amadeus-validator を含む）を promote で同期する Bolt である。

## 対象ユニット

- U001

## 設計

- [U001 Unit Design Brief](../units/U001-state-scaffold-contract/design.md)

## 完了条件

- state 更新を記述する対象 skill（intent-capture、inception、functional-design、bolt-preparation、construction traceability-finalization）の該当手順から、スクリプトの利用が遷移種別を含めて 1 行程度で読める。
- 変更した source skill と昇格先成果物が promote 手順で同期され、`npm run test:it:promote-skill` が pass する。
- 変更 PR がレビュー支援契約（挙動差分要約、skill-forge 確認、粒度制約）に従っている。

## 依存

- B001

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `skills/amadeus-validator/SKILL.md` と昇格先（スクリプト同梱の案内） | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | state 更新手順を持つ phase skill の SKILL.md（intent-capture、inception、functional-design、bolt-preparation、construction traceability-finalization）と各昇格先 | 未確認 | なし | 未確認 |

## 未確認事項

- 参照を追加する手順の正確な範囲（公開入口 skill にも書くか、内部 skill だけか）は Task Generation と実装で確定する。
