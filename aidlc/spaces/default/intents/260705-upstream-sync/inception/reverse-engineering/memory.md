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
- 2026-07-05T23:15:00Z — Interpretation: 「Always rerun for freshness」を全面再スキャンではなく差分スキャン（3049eadf..HEAD の非 aidlc 34 ファイル）+ 影響評価として解釈。根拠: 正本 codekb/amadeus は 2026-07-05T12:25Z の全面再解析で新しく、差分は merge 済み PR 4 本（#489/#500/#503/#505）に限定されるため。ピア協議（engineer2/engineer3、decision 記録済み）の「差分列挙 + 影響評価」方式に従う。
- 2026-07-05T23:15:00Z — Deviation: 実行順が本来の stage 順と逆転し、Intent 作成直後に上流調査（ドリフト 7 項目・Adaptive Workflows 影響分析）を先行した。根拠: #498 症状（produces の codekb/engineer1 誤解決）による engineer3 PR merge 待ちの順序制約（decision 記録済み）。
- 2026-07-05T23:15:00Z — Tradeoff: 共有 store の timestamp.md（store 既存の慣行）と engine produces が要求する reverse-engineering-timestamp.md の併存。全面改名は他 Intent の参照を壊しうるため、追加的に reverse-engineering-timestamp.md を作り timestamp.md を履歴の正として参照する方式を選択。
- 2026-07-05T23:30:00Z — Deviation: architect subagent の成果物に未来時刻（2026-07-06T12:00:00Z）と実在しない scope 名（docs、incident-response）の混入を検品で検出し、conductor が実測値（date -u、.agents/amadeus/scopes/ 実在一覧）で修正した。subagent 生成物のタイムスタンプと列挙値は必ず実測で裏取りする。
