<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-17 — functional-design を per-unit ループで U1/U2/U3 実施(gate:false per-unit → 全ユニット完了で gate:true)。各ユニット4成果物を architect subagent へ委任、conductor(e2)が sensors/reviewer/§13/gate を所有(subagent-utilization、委任申告済み)。
- 2026-07-17 — 全ユニット共通: 業務ルールは classifyTestSize(test-size.ts:49)由来の転記に閉じ独自 size 判定を再実装しない(ADR-04・Q1 e4 二重化禁止)。domain-entities は既存 TestSize/Tier/SizeClassification/SizeLedger 再利用、frontend は全 N/A(反証可能根拠・N/A≠PASS 分離)。
- 2026-07-17 — U3 実測所見: 既存 coverage は tier 非分離(combineCoverageReports が全 tier を単一 lcov.info へ結合、run-tests.ts:619-635)。C5 #683 整合は tier キー命名規約を計画(実層別 lcov 生成は #683 Out)。

## Deviations
- 2026-07-17 — U1 reviewer READY(GoA 2、3 Minor): story-map 装飾トークン/declared 消費者列挙不整合(真の消費者=既存 drift gate)/Out 根拠 FR-7 引用不正確 → 3件是正。
- 2026-07-17 — U2 upstream-coverage FAILED(story-map 欠落)→ ヘッダ+本文引用で全 PASSED。reviewer READY(0 指摘)、FR-5 実測ステージ未明記 → U2 code-generation/build-and-test 段で実測と明確化。
- 2026-07-17 — U3 reviewer READY(Major 1・Minor 1、非ブロッキング): Major=coveragePath 導出が純関数シグネチャと矛盾 → tier からの純命名規約(既存読取なし)へ是正。Minor=test-size.ts:60→:61・ループ span 過剰修正 :54-61 を自己捕捉し :55-60 へ再訂正(fix-diff-independent-reverify)。

## Tradeoffs
- 2026-07-17 — 設計のみ(実装 Out)のため業務ロジックは IF 契約・業務ルール・ドメインモデルの設計に閉じ、実コードは code-generation/別 intent へ送る。各ユニットに architecture-reviewer を1巡ずつ(§12a per-unit)。

## Open questions
- 2026-07-17 — FR-5 実行時間予算値は U2 code-generation/build-and-test 段で tier 別実測→選挙で確定(設計段は枠のみ)。coveragePath 実層別 lcov 配線・tier-aware ゲート CI・実移設は #683/移設 intent(Out)。次は nfr-requirements/nfr-design/code-generation を per-unit 継続。
