# Unit Design Brief

## 概要

この文書は Unit Design Brief である。
Inception では、`dry-run` 契約の同期検証の課題解決方針を定め、Bolt 分割と Construction へ渡す設計入力だけを扱う。
詳細な Domain Design、Logical Design、実装設計、テスト設計は Construction で確定する。

## 設計戦略

- source skill の変更を `dev-scripts/promote-skill.ts` で昇格先成果物へ反映する。
- `dev-scripts/evals/amadeus-templates/check.ts` の text contract を拡張し、`dry-run` mode、出力項目、副作用禁止、`scaffold-only` 差分、consumer 境界を検出する。
- 対象 Intent の validator を実行し、Inception 成果物の構造を確認する。
- 標準検証または関連 eval の結果を Construction の証拠として残す。

## 責務境界

- 所有するもの: source skill と昇格先成果物の同期方針、text contract、検証証拠。
- 所有しないもの: `dry-run` の候補表示本体、過去分析本体、学習分類本体、PR 作成、merge。
- 依存してよいもの: `dev-scripts/promote-skill.ts`、`dev-scripts/evals/amadeus-templates/check.ts`、`amadeus-validator`。
- 後続で再確認が必要になる条件: text contract だけでは読み取り専用性を確認できない場合、別 eval が必要になる場合。

## 構成候補

- promoted skill synchronization
- dry-run text contract
- no side effect contract check
- validator evidence
- construction verification note

## データと契約候補

- 入力候補: source skill path、昇格先成果物 path、eval path、validator command。
- 出力候補: promote-skill 結果、eval 結果、validator 結果、未確認事項。
- 状態候補: 同期済み、検証済み、修正待ち、未確認。
- 事前条件候補: source skill に `dry-run` 契約が定義されている。
- 事後条件候補: 昇格先成果物と text contract が `dry-run` 契約を参照できる。
- 不変条件候補: 昇格先成果物は手動同期ではなく promote-skill で反映する。

## 検証観点

- `dev-scripts/promote-skill.ts amadeus-discovery --replace` が使われている。
- `dev-scripts/evals/amadeus-templates/check.ts` が `dry-run` mode の主要文言を検出している。
- 対象 Intent の validator が pass している。
- 必要な標準検証が pass している。

## Bolt 分割方針

- B002 で source skill から昇格先成果物への同期と text contract 更新を扱う。

## Construction への引き継ぎ

- Domain Design で確定する事項: なし。
- Logical Design で確定する事項: text contract の検出観点。
- 実装時に確認する事項: text contract を既存 eval に追加するか、別 eval に分けるか。
- 検証時に確定する事項: promote-skill、eval、validator、標準検証の結果。
