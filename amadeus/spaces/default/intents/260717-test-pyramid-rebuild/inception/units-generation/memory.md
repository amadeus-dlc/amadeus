<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-17T13:35Z — C1〜C5(application-design)を3ユニットへ分割: U1-size-ledger(C1 台帳 materialize、根)/ U2-layer-spec-gate(C2 層責務+C3 tier-aware ゲート設計+FR-2 比率/FR-5 実行時間予算)/ U3-migration-coverage(C4 移設選定+C5 #683 整合)。U2/U3 は U1(台帳=データ源)のみに依存し相互依存なし → construction で U1 完了後に並行実装可能。
- 2026-07-17T13:36Z — U1(台帳 materialize)は「実装 Out」ではなく FR-1 の成果物生成範囲内と解釈(classifyTestSize 決定的スイープの正式 record 成果物化。RE が scratch tpr-ledger.json に保持済みを昇格)。Out は実テスト移設・run-tests.sh 実装変更・ゲート CI 配線であり、台帳・設計・計画は本 intent スコープ。
- 2026-07-17T13:37Z — parseBoltDag 用 YAML edge block(units/depends_on)を dependency.md に記述し、`amadeus-runtime.ts compile` 実測で bolt_dag NON-NULL・3ユニット(U1根/U2・U3→U1)を事前確認(per-unit-loop-activation / recompile-before-construction-bolt-dag 充足)。

## Deviations
- 2026-07-17T13:40Z — architecture-reviewer READY(GoA 1)。LOW 指摘2件のうち #1(C4→C2 の DAG エッジ除外の裏取り薄)を是正: C4 の `buildMigrationLedger`(component-methods:113-118)が remediation を signal 内訳から導出し C2 の allowedMaxSize を参照しないことを明示、U3→U2 実データ依存なしを裏取り(引用 :113-118 を verbatim 実測確認)。#2(story-map に Mermaid なし)は規約違反でないため非対応(テーブルで価値整理は充足)。

- 2026-07-17T13:43Z — leader 差し戻し(既決執行・選挙不要): #1158(E-PM9 C7)で phases/inception.md に着地した N1/N2(規模見積りは行数で記録・定性のみ禁止)違反。park 中で #1158 読了を逃していた。origin/main 取り込み→inception.md 規模節読み直し→3ユニット規模を行数見積り化(U1 ≈450〜560行/U2 ≈200〜280行/U3 ≈280〜320行)+N3(adapter 先行着地禁止)充足を明記→reviewer 増分再確認。

## Tradeoffs
- 2026-07-17T13:35Z — units-generation は mode:inline だが multi-artifact 3成果物を architect subagent へ委任し conductor(e2)が sensors/reviewer/§13/gate を所有(subagent-utilization、委任申告済み)。application-design と同型。

## Open questions
- 2026-07-17 — U2 の実行時間予算(FR-5)の目標値は construction/U2 で各 tier 実行時間を実測して選挙確定(値は requirements 段で断定せず routing 済み)。tier-aware ゲートの CI 実装配線・比率/時間の強制ゲート化・実テスト移設は移設 intent(Out)。
