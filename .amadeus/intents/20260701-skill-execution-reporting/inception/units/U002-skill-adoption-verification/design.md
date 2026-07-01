# Unit Design Brief

## 概要

この文書は Unit Design Brief である。
Inception では、Unit の課題解決方針を定め、Bolt 分割と Construction へ渡す設計入力だけを扱う。
詳細な Domain Design、Logical Design、実装設計、テスト設計は Construction で確定する。

## 設計戦略

- U001 の共通契約を基準に、source skill、昇格先 skill、関連 eval の整合を確認する。
- `skills/amadeus-*/` から `.agents/skills/amadeus-*/` へ反映する場合は、既存の昇格手順を使う。
- 初回の代表 skill は、phase 公開入口である `amadeus-ideation`、`amadeus-inception`、`amadeus-construction` を優先する。
- `amadeus-discovery` と `amadeus-validator` は、Construction の差分規模と契約の適合性を見て同時反映または後続 Issue 候補にする。
- eval で直接確認できない対象は、対象外理由を Construction の decisions または traceability に残す。

## 責務境界

- 所有するもの: 代表 skill 反映、source skill と昇格先 skill の整合、関連 eval の確認。
- 所有しないもの: 全 skill への一括適用、validator の成果物構造契約変更、GitHub Issue 自動作成。
- 依存してよいもの: U001 の報告契約、昇格手順、llm templates eval、amadeus templates eval。
- 後続で再確認が必要になる条件: 代表 skill だけでは報告契約の横展開が不十分と分かった場合。

## 構成候補

- Representative Public Skill Adoption
- Promotion Consistency Check
- LLM Template Expectation
- Template Contract Expectation

## データと契約候補

- 入力候補: U001 の報告契約、source skill、昇格先 skill、eval ファイル。
- 出力候補: skill 差分、昇格結果、eval 結果、対象外理由。
- 状態候補: `aligned`、`needs_update`、`out_of_scope`。
- 事前条件候補: U001 の共通契約が定義済みであること。
- 事後条件候補: 代表 skill と eval が同じ報告契約または対象外理由を持つこと。
- 不変条件候補: 手動同期で昇格先を更新しないこと。

## 検証観点

- `npm run typecheck` が pass する。
- `npm run diff:check` が pass する。
- `npm run test:it:promote-skill` が必要に応じて pass する。
- 関連 eval を実行し、報告契約の期待が壊れていないことを確認する。
- 対象 Intent の validator が pass する。

## Bolt 分割方針

- B002 で代表 skill の昇格と eval 整合確認を扱う。
- B002 は B001 で source skill の共通契約が定義されてから実行する。

## Construction への引き継ぎ

- Domain Design で確定する事項: なし。
- Logical Design で確定する事項: eval で確認する文言、source skill と昇格先 skill の対象範囲。
- 実装時に確認する事項: 昇格手順、差分規模、代表 skill 以外の対象外理由。
- 検証時に確定する事項: promote-skill integration test、typecheck、diff check、関連 eval、validator の結果。
