<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-06T02:42:00Z — Interpretation: Maintainer 指示（2026-07-06 02:39Z 周知）によるメイン直接処理へ切替。B003 は conductor が直接実装する（品質手順 = TDD・実測裏取り・reviewer・fresh 検証は維持）。codegen subagent には停止を通知済み。
- 2026-07-06T02:50:00Z — Interpretation: B003 を conductor が直接実装（TDD: eval 4 観点を先行、RED = 現行 eslint 経路の 127 を確認 → 2 段検出実装で GREEN 4/4）。実 rule fixture は lints/check.ts が自 repo 固定（cwd 非依存）のため、cwd 依存の no-stub-compat/check.ts を直接 lint:check に配線する方式で AC Row 6 を充足した。
- 2026-07-06T03:00:00Z — Interpretation: reviewer READY（iteration 1/2、実測 6 系統）。所見 2 件（非ブロッカー）を反映: A = skillMdPath の 3 段上パスは dev repo 専用である考察と採用理由（write 対象 = 正準ソース、配布先に再生成ユースケースなし）を plan に記録。B = AC-6 期待 JSON の記述を実出力形へ訂正。
