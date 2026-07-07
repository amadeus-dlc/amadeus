<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-07-07T03:51:16Z — practices-discovery の再実行では、証拠で確定できる branch/CI/code-style は再質問せず、人間判断が必要な installer package boundary・coverage floor・release practice・security gate・CLI safety だけを grilling した; Brownfield の「ask only gaps」条項に合わせた

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-07-07T03:51:16Z — `packages/setup/` だけ追加する案は repo 全体では完全にMECEではないが、既存 `core/` / `harness/` / `dist/` / `scripts/` の全面移動を installer intent に含めない staged layout を採用; repo-layout normalization は別 refactor とする
- 2026-07-07T03:51:16Z — installer の品質床は line coverage percentage ではなく coverage registry + ratchet とし、CI の blocking gate で補強する; 既存 test governance と整合させるため

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-07-07T02:40:23Z — Walking Skeleton の扱いは approval gate で確認する; この intent は brownfield だが npm インストーラは新しい配布入口なので、最初の Bolt を小さな end-to-end スライスとしてゲートする提案にした
