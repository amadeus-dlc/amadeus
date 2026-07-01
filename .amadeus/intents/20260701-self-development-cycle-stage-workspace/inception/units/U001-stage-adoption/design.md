# Unit Design Brief

## 概要

この文書は Unit Design Brief である。
Inception では、stage 採用判断の課題解決方針を定め、Bolt 分割と Construction へ渡す設計入力だけを扱う。
詳細な Domain Design、Logical Design、実装設計、テスト設計は Construction で確定する。

## 設計戦略

- stage0、stage1、stage2 を後続 Intent が参照できる語彙として扱う。
- stage2 を次回 stage0 として扱う条件は、merge、基準 commit、Maintainer の採用判断をそろえる。
- 採用判断は自動判定にせず、人間判断として追跡する。

## 責務境界

- 所有するもの: stage 判定語彙、stage0 採用条件、Maintainer の採用判断。
- 所有しないもの: build workspace と target workspace の具体的な対応記録、example snapshot provenance、assets 混入検出。
- 依存してよいもの: `.amadeus/glossary.md`、`.amadeus/steering/policies.md`、`.amadeus/development.md`。
- 後続で再確認が必要になる条件: stage 語彙を `CONTEXT.md` に追加する必要が出た場合。

## 構成候補

- Stage Terminology: stage0、stage1、stage2 の意味を扱う。
- Stage Adoption Rule: stage2 を次回 stage0 として採用する条件を扱う。
- Stage Adoption Decision: Maintainer の採用判断を扱う。

## データと契約候補

- 入力候補: PR merge 状態、基準 commit、validator 結果、標準検証結果、workspace 対応記録。
- 出力候補: stage0 採用可否、採用判断の根拠、次回作業で使う基準 commit。
- 状態候補: 未判断、採用、非採用。
- 事前条件候補: 対象 PR が merge 済みであり、build workspace が merge 後の基準 commit を参照している。
- 事後条件候補: 採用判断が対象成果物または PR 説明から追跡できる。
- 不変条件候補: stage2 は Maintainer の承認なしに次回 stage0 へ自動昇格しない。

## 検証観点

- stage 判定語彙が後続 Intent から参照できる。
- stage0 採用条件が成果物から追跡できる。
- Maintainer の採用判断の有無が記録できる。

## Bolt 分割方針

- B001 で stage 判定語彙と stage0 採用条件の記録を扱う。

## Construction への引き継ぎ

- Domain Design で確定する事項: stage 判定語彙が全体 Glossary だけで足りるか、Domain Map との関係を確定する。
- Logical Design で確定する事項: 採用判断を `decisions.md`、`traceability.md`、PR 説明のどこへ主記録するかを確定する。
- 実装時に確認する事項: `.amadeus/glossary.md` と `.amadeus/steering/policies.md` の記述が重複しないこと。
- 検証時に確定する事項: validator と標準検証が stage 採用判断の証拠として十分か。
