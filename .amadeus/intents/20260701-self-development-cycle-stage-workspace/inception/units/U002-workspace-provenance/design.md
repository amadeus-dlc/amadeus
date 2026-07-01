# Unit Design Brief

## 概要

この文書は Unit Design Brief である。
Inception では、workspace provenance 記録の課題解決方針を定め、Bolt 分割と Construction へ渡す設計入力だけを扱う。
詳細な Domain Design、Logical Design、実装設計、テスト設計は Construction で確定する。

## 設計戦略

- build workspace、host environment、target workspace、target artifacts を別の概念として記録する。
- 対応記録は後続 Intent の traceability、decisions、PR 説明から追える形にする。
- validator と標準検証結果を stage 判定の証拠候補として扱う。

## 責務境界

- 所有するもの: workspace 対応記録、利用した skill / validator / 開発用スクリプト、検証結果の証拠候補。
- 所有しないもの: stage 判定語彙そのもの、example snapshot provenance の十分性、assets 混入検出。
- 依存してよいもの: U001 の stage 判定方針、`.amadeus/development.md`、`.amadeus/steering/policies.md`。
- 後続で再確認が必要になる条件: evidence を JSON として標準化する必要が出た場合。

## 構成候補

- Workspace Correspondence: build workspace と target workspace の対応を扱う。
- Tool Provenance: 利用した skill、validator、開発用スクリプトを扱う。
- Verification Evidence: validator と標準検証結果を扱う。

## データと契約候補

- 入力候補: workspace path、commit、skill path、validator path、md5、検証コマンド、検証結果。
- 出力候補: provenance 記録、検証証拠、stage 判定根拠。
- 状態候補: 未記録、記録済み、検証済み。
- 事前条件候補: 対応する GitHub Issue と Intent が存在する。
- 事後条件候補: PR 準備条件から workspace 対応記録と検証結果を追跡できる。
- 不変条件候補: build workspace と target workspace を同じ意味で扱わない。

## 検証観点

- workspace 対応記録先が定義されている。
- validator 結果と標準検証結果が追跡できる。
- stage 判定の根拠として使える情報が不足しない。

## Bolt 分割方針

- B002 で workspace 対応記録と検証証拠の記録を扱う。

## Construction への引き継ぎ

- Domain Design で確定する事項: provenance 記録をどの概念名で扱うかを確定する。
- Logical Design で確定する事項: Markdown と JSON のどちらを主記録にするかを確定する。
- 実装時に確認する事項: `.amadeus/development.md` と各 Intent の `traceability.md` の責務が重複しないこと。
- 検証時に確定する事項: validator が記録先の存在を確認する必要があるか。
