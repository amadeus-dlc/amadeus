<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-04T17:30:00Z — Minimal 戦略では unit-test-instructions のみ生成が原則だが、エンジンの produces 要求（report が成果物不在を拒否する）を満たすため、integration / performance / security の各 instruction は「適用判断」を記す簡潔な文書として生成した; 空ファイルでなく判断根拠を残す形にした。
- 2026-07-04T17:30:00Z — ビルドは tsc --noEmit（typecheck）で代替した; 本リポジトリはトランスパイル成果物を持たず、型検査がビルド相当の検証になるため。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-04T17:30:00Z — parity eval は sandbox 内で git init が Operation not permitted になり実行できない; test:all の最終確認は sandbox 外で行う運用が必要。
