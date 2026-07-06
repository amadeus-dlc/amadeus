<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-05T23:50:00Z — Q1（採否）は人間の個別承認で A = 候補 3 確定（契約級の auto 例外、経路 人間 → leader → engineer2）。requirements は文書化系に収束し、エンジンコード変更が消えたため並行 Intent（#428、#504+#507）との接触面も消滅した（Construction 前ピア連絡は「接触なし」の確認連絡に縮退）。scope は feature のまま維持（Intake 後の変更は state 再構築の混乱の方が大きい。実体は docs 系として進む）。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-06T00:30:00Z — reviewer iteration 1 は NOT-READY（実装一致の再確認基準の欠落、イベントカウント整合、言語の条件分岐残置）。全件反映: FR-2.3（code-generation 時点の実装再読了 + 実装参照による PR レビュー委任）、FR-1.5 拡張（自己参照カウント）、NFR-1 確定表現（全文英語を確認済み）。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-06T00:40:00Z — reviewer の参考指摘: audit-format.md は 3 箇所に存在（skills/amadeus/references/aidlc-v2/ と .agents/skills/... = 68 events 版、.agents/amadeus/knowledge/amadeus-shared/ = 70 events + GUARD_EXEMPTED 収録版）。FR-1.5 の引用文字列で実質一意だが、functional-design で (1) フルパス確定、(2) knowledge/amadeus-shared はエンジン配布資産のため parity-map / skills 正準ソース同期の要否（DR-2、Corrections c3 の適用範囲）を確認する。
