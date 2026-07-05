<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-05T20:35:00Z — GUI のないインストーラのため、mockups は CLI の成功・異常系の実出力例、design-system-mapping と accessibility-checklist は不適用判断 + CLI 代替規約として作成した（rough-mockups の代替方針の精緻化）。新規判断は出力チャネル割り当て（stdout/stderr）だけで、FR-1.1 と整合。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-05T20:50:00Z — reviewer iteration 1 は NOT-READY（構造 1 = H2 不足 2 ファイル、トレーサビリティ 2 = user-flow 未参照・スモーク fail exit の FR 不在、カバレッジ 1 = 事前チェック 3 パターン中 1 例、軽微 1 = ラベル英語化の根拠）。全件修正: H2 追加、user-flow を上流入力に追加 + 更新規約・ハーネス別フローを interaction-spec に反映、事前チェック 3 パターンの reason 文言表を追加、スモーク fail の exit 扱いは O-2 と併せて functional-design で確定と明記（断定を撤回）、ラベル英語化を Q2 として明示（機械可読ラベル兼用の根拠、gate 承認で確定）。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
