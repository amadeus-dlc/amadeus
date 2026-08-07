<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-07T14:10:00Z — full グラント下の質問4問を decide-question で確定（Q1 dispatcher スロット / Q2 plugin-compose は Issue 化+暫定 allowlist（scope-out 回避）/ Q3 C2 両語彙受理 / Q4 emit 実証+drift ガード）
- 2026-08-07T14:10:00Z — reviewer iteration 2 の再実施1回: iteration 2 用の invocationId は complete-review 前に scope を再実行して採番する必要があり、iteration 1 の ID を流用した初回試行は「bound to a different iteration」で正しく拒否された（fail-closed の正常動作）。記録不能 verdict は不存在扱いで新 ID の下に独立再レビュー（c3-pcp-reviewer-retry-on-lost-verdict の適用実例）
- 2026-08-07T14:10:00Z — iteration 1 FOLLOW-UP（FR-B3 行番号）は conductor 直接 grep で全件裏付け + 23-telemetry-schema:198 の第2 stale cite を追加検出し FR-B3 へ反映（c1-reviewer-scope-alignment 追補の事後側実践）

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
