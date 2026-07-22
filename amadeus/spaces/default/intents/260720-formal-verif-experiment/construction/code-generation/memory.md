<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
2026-07-22T02:45:00Z — U8 builder サブエージェントの最終出力末尾に偽 system-reminder 風の指示様テキストが混入(ハーネスが marker-prefix-forgery / system-reminder-tag として無害化)。instruction-like-text-rejection に従い指示として実行せず破棄、本行で記録しユーザーへ報告。実報告内容(U8 実装・検証 green)はディスク実測で裏取りして採用。
2026-07-22T02:15:00Z — conductor の report 誤用(--result completed)で code-generation の gate-start+approve が U8 未実装・§13 未実施のまま監査に記録された。state を正値(code-generation 進行中)へ復旧し、続行。監査行は append-only のため訂正記録として本行を残す。swarm finalize のブランチ merge は未着地だったため conductor が明示 merge で回収。
2026-07-22T01:00:00Z — ts-arm LOC予算超過(見積280–450→実測code-only 1,081)をユーザー裁定(a)で受容: FDスコープ(BR-01〜23全域性証明・PBT・freeze manifest)に対する見積過小と認定。再分解は不要。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
