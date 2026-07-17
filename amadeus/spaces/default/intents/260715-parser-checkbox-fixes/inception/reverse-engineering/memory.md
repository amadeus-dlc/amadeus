<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-07-15T22:32:01Z — diff-refresh base は rescan-base-ancestry 準拠で cf3dc88(祖先・距離65=全 re-scans observed 中最小)を採用; e55cc25(canonical-settings observed)は merge-base --is-ancestor exit 1 の非祖先で除外。source 等価性・全引用の sed 再実測は Developer/Architect の2段で完遂
- 2026-07-15T22:32:01Z — bugfix スコープの diff-refresh につき codekb 更新はフォーカス面(code-structure/re-scans/timestamp)+scan-notes に限定; business-overview 等は区間 diff に矛盾変更なしを確認の上で対象外(c1 の差分更新充足)
- 2026-07-15T22:32:01Z — センサー実測(manual-sensor-fire-before-gate-report): scan-notes へ required-sections/upstream-coverage 各 exit 0 PASS; codekb 3ファイルは sensor filter **/{amadeus-docs,intents}/** 非該当で N/A(反証可能根拠=フィルタ文字列)

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-07-15T22:32:01Z — conductor のディスパッチプロンプトが現「最新」節を harness-port と誤記載(実測は canonical-settings 観測面); builder が実測を正として正しく降格・是正(citation-semantics-check の適用)。行番号ずれも1件検出: #1015 三項は :3227-3230→現 HEAD :3228-3230(三項本体 :3229)

- 2026-07-15T22:38:11Z — スキャン後に main が2コミット前進(#1019 record-sync/#1028 metrics — フォーカス面 diff 0を実測)。e3 レビュー留保起点の鮮度再確認で、6a23b0ec 非祖先(exit 1)=base cf3dc88 維持を再実測し、codekb は merge union で本 intent 節=最新・harness-port 節=履歴へ整合(後着地側の c3-relabel)。observed 6495e03a1 の結論は landed main でも有効(base-advance-regrounding の RE 面適用)

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-15T22:32:01Z — #1015 修正の設計論点: rebuild 側の写像源を CHECKBOX_MAP に一本化するか(正準1定義)+ヘッダ書き戻し :3238 の6状態表記化 — requirements/design で確定。#1013 は契約プレフィックス検証の fail 形(PRACTICES_OVERRIDE exit 非0 か warning skip か)が Issue の期待挙動(a)/(b) 未確定 — requirements で確定
