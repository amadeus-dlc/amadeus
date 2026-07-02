# 成果物の証拠記録と後段評価の機械化 Discovery Brief

## 入力テーマ

- [Issue #315](https://github.com/amadeus-dlc/amadeus/issues/315) の「成果物の証拠記録と後段評価を機械化する」。

## 確認した前提

- 入力元は GitHub Issue である。
- 対象分類は Amadeus DLC 契約と Amadeus 実装の両方である。
- 変更対象領域は、provenance 記録契約と dev-scripts（#296）、steering knowledge 契約と learning-review skill の契約（#297）、validator 後段の evaluator と eval（#240）である。
- Issue #315 は証拠記録と後段評価を扱う親 Issue であり、子 Issue として #240、#296、#297 を持つ。
- 根本課題は、手書き Markdown の証拠記録がもっともらしく間違った値でも validator を pass することである。
- Issue #315 の進め方は、先に #296 と #297 で記録形式を確定し、評価対象の形式が決まってから #240 の評価軸を安定させる。あわせて #240 の初期スコープから、`provenance:check`（#296）と validator の構造検査（#307）に重なる項目を除く。
- #307 の approval evidence 構造検査は、epic #314 の cycle（Intent [20260702-phase-gate-approval-contract](../intents/20260702-phase-gate-approval-contract.md)）で実装済みであり、#240 のスコープから除外する重なりの一方は確定している。
- 最初に Ideation へ進める recommended 候補は #296 である（[G001](20260702-evidence-record-and-evaluation/grillings/G001-recommended-first-candidate.md) の GD001）。
- 既存 Discovery に同じテーマはない。

## 判定

multi_intent

## 判定理由

- Issue #315 は、provenance 記録の生成と検証（dev-scripts と CI）、steering knowledge の文書契約、validator 後段の evaluator という 3 つの異なる成果物層にまたがるため、単一 Intent として扱うには大きい。
- #296 と #297 は記録形式を確定する側、#240 はその形式を評価する側であり、評価軸の安定には記録形式の先行確定が必要である（Issue #315 の進め方）。
- #296 と #297 は、成果物と検証観点が異なる（Intent 配下の機械可読記録と dev-scripts に対して、steering 文書の契約と学習ループの書き戻し規則）ため、統合しない。

## Intent Draft

該当なし

## Intent 候補

| 候補 | 状態 | Intent | 課題 | 成功状態 | 除外範囲 | 依存 |
|---|---|---|---|---|---|---|
| provenance 記録の生成と検証を機械化する（#296） | recommended | 未作成 | provenance の記録（workspace の path と commit、利用ツールの path、commit、md5、stage 判定根拠）が手書き Markdown であり、もっともらしく間違った値でも validator を pass する。 | dev-script が provenance 記録を機械可読形式（JSON）で実測から生成して Intent 配下に出力し、人間が値を手書きせず、`provenance:check` が記録済みの値を再計算して照合し、drift を CI で検出できる。 | 証拠内容の意味評価（#240）、steering knowledge の契約変更（#297）、`examples/skill-provenance.json` の既存契約の置き換えは含めない。 | なし |
| steering knowledge の項目に根拠と状態の契約を追加する（#297） | waiting | 未作成 | knowledge の項目が根拠情報を持たない箇条書きであり、誤った学びが一度 knowledge に入ると以後の全セッションが前提として継承するのに、取り消しを判断する材料がない。 | knowledge の各項目が知識、根拠（Issue、PR、Intent、decision へのリンク必須）、状態（`採用` と `retired` の 2 値、`retired` は置き換え先または取り消し理由の参照必須）を持ち、`amadeus-learning-review` の契約に「knowledge へ書き戻すときは根拠リンクを添える」が追加されている。 | knowledge 項目の内容妥当性の自動評価（#240 の接続性評価の対象）、glossary、Domain Map、Context Map の契約変更は含めない。 | #296 と独立に進められるが、Issue #315 の進め方（記録形式の先行確定）に従い #240 より先に扱う。順次実行では #296 の後に扱う。 |
| amadeus-validator 後段に amadeus-evaluator を追加する（#240） | waiting | 未作成 | validator の `pass` は実行時に参照できる最低限の構造条件の充足だけを示し、証拠の実在性と接続性、Issue の意図や Acceptance との対応は評価されない。 | validator pass 後に実行できるルールベース中心の evaluator が evaluation report を出力し、evaluator、validator、`provenance:check` の検査責務の境界が記録されている。 | `provenance:check` と重なる照合（#296）、validator の構造検査と重なる項目（#307 で実装済み）、LLM による意味評価の必須化は初期スコープに含めない。 | 評価対象の記録形式（#296、#297）の確定後に扱う。 |

## 候補判断

- recommended は「provenance 記録の生成と検証を機械化する（#296）」である（GD001）。
- #240 の評価軸は主に #296 の機械可読記録の形式に依存し、Issue #315 が指摘する初期スコープの重なり（`provenance:check` と #240）も #296 の確定で解消される。
- #297 は #296 と独立に進められる文書契約中心の候補だが、Issue #315 の進め方（記録形式の先行確定）に従い #240 より先に扱う。順次実行では #296 の後に扱う。
- #240 は #296 と #297 の記録形式確定後に扱う。

## 既存 Intent との関係

- [20260701-self-development-cycle-stage-workspace](../intents/20260701-self-development-cycle-stage-workspace.md) の U002 Unit Design Brief は「evidence を JSON として標準化する必要が出た場合」を再確認条件として残しており、#296 はこの再確認条件の発火に相当する。
- [20260702-phase-gate-approval-contract](../intents/20260702-phase-gate-approval-contract.md) は #307 の approval evidence 構造検査を実装済みであり、#240 の初期スコープから除外する重なりの根拠である。

## 推奨次アクション

- recommended 候補「provenance 記録の生成と検証を機械化する（#296）」を `amadeus-ideation` に渡す。
