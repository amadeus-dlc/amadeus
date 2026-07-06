<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-06T09:50:00Z — 既存 codekb（解析 2026-07-06T07:58:00Z、基準 b452f4fb = PR #565 後。timestamp.md の実測値）を採用した（stub 不要 = #548 修正後の標準動作、本日 3 Intent の前例どおり）。
- 2026-07-06T09:50:00Z — codekb 基準 b452f4fb と現 main（e535ad89）の差分のうち、本 Intent の実装対象 scripts/amadeus-install.ts は PR #577（#573 の doctor / installer smoke 修正）で変更されている。実装は feasibility で現物を実測済み（MANIFEST 構造、書き込み点 3 箇所は feasibility 時点の断面。runStep 出力形式と fix: 規約は rough-mockups §12a が #577 後の断面で照合済み）であり、Construction も現 HEAD の実コードを直接読むため、codekb の再解析は不要と判断した。codekb は背景知識、実装判断の正は現物。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
