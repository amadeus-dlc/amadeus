# Unit Design Brief

## 概要

この文書は Unit Design Brief である。
Inception では、policy 参照と検出境界の課題解決方針を定め、Bolt 分割と Construction へ渡す設計入力だけを扱う。
詳細な Domain Design、Logical Design、実装設計、テスト設計は Construction で確定する。

## 設計戦略

- Git ブランチ戦略 policy を、Intent 成果物と PR 説明から参照できる対象として扱う。
- validator または evaluator で扱えるものは構造や明示的な参照に限定する。
- merge 可否、例外の妥当性、人間承認が必要な判断は、人間判断として残す。

## 責務境界

- 所有するもの: policy 参照方針、検出候補、人間判断に残す候補。
- 所有しないもの: policy ルール本文の全詳細、GitHub branch protection、CI workflow。
- 依存してよいもの: U001 の Git ブランチ戦略 policy、Intent traceability、acceptance、PR 説明。
- 後続で再確認が必要になる条件: validator または evaluator の責務分担が変更される場合。

## 構成候補

- Policy Reference Rule: Intent 成果物と PR 説明から参照する policy を扱う。
- Detection Candidate: validator または evaluator で検出する候補を扱う。
- Human Judgment Boundary: 機械検査へ寄せない判断を扱う。

## データと契約候補

- 入力候補: policy path、Intent ID、Requirement、Acceptance、PR URL、branch name、CI 結果。
- 出力候補: policy 参照、検出候補、人間判断対象、後続 Issue 候補。
- 状態候補: 未確認、参照済み、検出候補、対象外。
- 事前条件候補: Git ブランチ戦略 policy が存在する。
- 事後条件候補: 対象 Intent の traceability または PR 説明から policy 参照を読める。
- 不変条件候補: validator の `pass` を内容承認として扱わない。

## 検証観点

- policy 参照が成果物上に残る。
- 検出候補と人間判断対象を混同しない。
- 例外や後続 Issue 候補を現在の Intent に混ぜすぎない。

## Bolt 分割方針

- B003 で policy 参照方針と検出境界を扱う。

## Construction への引き継ぎ

- Domain Design で確定する事項: `BC001 自己開発運用` の policy 参照として扱うかを確認する。
- Logical Design で確定する事項: policy 本文内で検出候補と人間判断対象をどう分けて書くかを確定する。
- 実装時に確認する事項: validator または evaluator の変更が必要か、policy 文書だけで足りるかを確認する。
- 検証時に確定する事項: validator、必要な eval、typecheck、diff check のうち今回必要な入口を確定する。
