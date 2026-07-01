# Unit Design Brief

## 概要

この文書は Unit Design Brief である。
Inception では、Unit の課題解決方針を定め、Bolt 分割と Construction へ渡す設計入力だけを扱う。
詳細な Domain Design、Logical Design、実装設計、テスト設計は Construction で確定する。

## 設計戦略

- 新しい内部 skill は初期 Construction slice では作らない。
- まず公開 `amadeus-*` skill が共有する実行時問題報告契約として、報告先分類、最低項目、人間承認付き Issue 候補化を定義する。
- 報告先分類は、現在の Intent 対象、後続 Issue 候補、報告不要の3つにする。
- 報告は現在の Intent 成果物へ無関係な改善を混ぜるためではなく、Maintainer が判断できる候補を提示するためのものとして扱う。
- validator または evaluator で検出すべき観点は報告項目に含めるが、validator の `pass` を内容承認として扱わない。

## 責務境界

- 所有するもの: 実行時問題報告の分類基準、最低項目、人間承認付き Issue 候補化。
- 所有しないもの: GitHub Issue の自動大量作成、全 amadeus-* skill への一括反映、validator の構造契約変更、内容承認。
- 依存してよいもの: Issue #248、Ideation 成果物、BC001 自己開発運用、既存の公開 skill 境界、validator の判定説明。
- 後続で再確認が必要になる条件: 共通契約の重複が増え、内部 skill 化した方が公開 skill の説明を簡潔に保てる場合。

## 構成候補

- Execution Concern Classification
- Minimum Report Fields
- Human Gated Follow-up Issue Candidate
- Validator and Evaluator Detection Candidate

## データと契約候補

- 入力候補: skill 名、対象 Intent、phase、stage、Unit、Bolt、根拠 path、PR URL、Issue URL、検証結果。
- 出力候補: 実行時問題報告、後続 Issue 候補、報告不要理由。
- 状態候補: `current_intent`、`follow_up_issue_candidate`、`no_report_required`。
- 事前条件候補: 対象 Intent の境界、または報告対象の根拠を参照できること。
- 事後条件候補: 問題や懸念が分類され、必要な最低項目を持つこと。
- 不変条件候補: 人間承認なしに GitHub Issue を作成しないこと。

## 検証観点

- `amadeus-ideation`、`amadeus-inception`、`amadeus-construction` の source skill から共通契約を読める。
- 共通契約が scope 外の改善を現在の Intent 成果物へ混ぜないことを説明している。
- 報告項目に秘密情報を含めない制約を読める。
- validator の `pass` と内容承認の違いを読める。

## Bolt 分割方針

- B001 で報告契約を source skill に定義する。
- B002 は U002 側で、昇格先 skill と eval の整合確認を扱う。

## Construction への引き継ぎ

- Domain Design で確定する事項: なし。
- Logical Design で確定する事項: 共通契約を各公開 skill のどの見出しへ置くか。
- 実装時に確認する事項: 代表 skill の対象範囲、報告項目の過不足、内部 skill 化が必要になる兆候。
- 検証時に確定する事項: validator、typecheck、diff check、関連 eval の結果。
