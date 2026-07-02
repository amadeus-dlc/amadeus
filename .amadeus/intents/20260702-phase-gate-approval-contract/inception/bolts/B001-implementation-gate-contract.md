# B001 実装ゲートの契約変更

## 概要

`amadeus-construction-implementation-execution` の前提を「`taskGeneration.status` が `passed`（人間承認済み）の場合だけ実装へ進む」に変更し、`amadeus-construction-bolt-preparation` に `ready_for_approval` で停止して承認を待つ行動を肯定形で明記する Bolt である。

## 対象ユニット

- U001

## 設計

- [U001 Unit Design Brief](../units/U001-phase-gate-skill-contract/design.md)

## 完了条件

- implementation-execution の前提が `passed` だけを許可し、`ready_for_approval` では実装せずに停止して人間承認待ちを報告することが読める。
- bolt-preparation に、`ready_for_approval` へ到達したら停止して人間の承認を待ち、承認を得てから `passed` にして `kind: approval` の evidence を追加する行動が手順として読める。
- 両 skill の source と昇格先が promote 手順で同期され、`npm run test:it:promote-skill` が pass する。
- 変更 PR がレビュー支援契約（挙動差分要約、skill-forge 確認、粒度制約）に従っている。

## 依存

- なし。

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `skills/amadeus-construction-implementation-execution/SKILL.md`, `.agents/skills/amadeus-construction-implementation-execution/**` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `skills/amadeus-construction-bolt-preparation/SKILL.md`, `.agents/skills/amadeus-construction-bolt-preparation/**` | 未確認 | なし | 未確認 |

## 未確認事項

- skill 本文の最終文言は Task Generation と実装で確定する。
