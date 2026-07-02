# Unit Design Brief

## 概要

この文書は Unit Design Brief である。
Inception では、approval evidence 検査の課題解決方針を定め、Bolt 分割と Construction へ渡す設計入力だけを扱う。
検査の実装位置の詳細と fail メッセージの文言は Construction で確定する。

## 設計戦略

- 検査は既存の `taskGeneration` 検査枠組み（`taskGenerationEvidencePaths` と `ready_for_approval` / `passed` の分岐）への追加として実装し、新しい検査カテゴリを作らない。
- eval 先行（RED → GREEN）で進める。fixture の approval evidence を除去した改変ケースが fail することを、実装前に確認する。
- 既存実データとの整合を検査導入の前提にする。`passed` 34 件すべてが approval evidence を持つことを確認済みであり、既存成果物の pass 維持を受け入れ条件にする。
- `ready_for_approval` は承認前の正常な中間状態として扱い、approval evidence を要求しない。

## 責務境界

- 所有するもの: `passed` と `kind: approval` の対応検査、eval の改変ケース、validator の promote 同期。
- 所有しないもの: 承認内容の妥当性判断、evidence の `path` が指す成果物の内容検査、skill 本文の契約（U001）。
- 依存してよいもの: `state.json.construction.bolts[].taskGeneration` の既存構造、`dev-scripts/evals/amadeus-validator/check.ts` の fixture 改変形式、promote 手順。
- 後続で再確認が必要になる条件: evidence の構造（`kind` の語彙、配列位置）が変わった場合、state 雛形生成（Issue #311）が evidence の初期値を持つ場合。

## 構成候補

- evidence 検査: `passed` の Bolt に対する `kind: approval` の実在検査を扱う。
- eval 改変ケース: fixture から approval evidence を除去して fail を確認する検証を扱う。
- 昇格同期: source validator と昇格先の promote 同期を扱う。

## データと契約候補

- 入力候補: `.amadeus/intents/**/state.json` の `construction.bolts[].taskGeneration`。
- 出力候補: 検査結果の pass または fail と、fail 時の対象 Bolt の特定情報。
- 状態候補: `passed`（approval 必須）、`ready_for_approval`（approval 不要）、`construction.bolts` なし（対象外）。
- 事前条件候補: `state.json` が JSON として解釈できる。
- 事後条件候補: 承認なしの `passed` が構造検証を通過しない。
- 不変条件候補: 既存の pass している成果物は検査追加後も pass する。

## 検証観点

- eval は、approval あり（pass）、approval なしの `passed`（fail）、`ready_for_approval`（pass）の 3 ケースを固定入力で検証する。
- 実装前に eval が失敗することを確認する（RED の記録）。
- `npm run test:it:amadeus-validator` と `npm run test:all` が pass する。
- source と昇格先の validator の一致を promote 手順で確認する。

## Bolt 分割方針

- B003 で eval の改変ケースを先行追加し、検査を実装し、promote で同期する。

## Construction への引き継ぎ

- Functional Design で確定する事項: 検査の実装位置（既存分岐への追加箇所）、fail メッセージの文言、approval evidence の `path` の種類を限定するかの判断。
- 検証時に確定する事項: eval の改変ケースの具体的な fixture 操作。
