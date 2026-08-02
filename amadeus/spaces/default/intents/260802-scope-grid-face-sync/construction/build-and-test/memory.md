<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-08-02T11:50:06Z — bt-proportional-selection 適用: perf は timeout budget(40ms/5000ms)、security は依存ゼロ+ローカル FS 読取のみへ trace。生成しない検査(DAST・負荷試験・追加依存監査)は根拠付きで成果物に明記。
- 2026-08-02T11:50:06Z — verdict-names-unverified-facets 適用: 非 claude ハーネスでの実 birth E2E は未検証と明記(grid 読取経路はコード実読で確定済み、残余リスク低)。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-08-02T11:50:06Z — 初回検証で exit をパイプ越しに捕捉する誤り(no-exit-capture-through-pipe 違反)を自己捕捉し、自己捕捉 exit で全コマンド再実行(typecheck は node_modules 不在の 127 も発覚 → bun install 後 0)。
- 2026-08-02T11:50:06Z — センサー発火を >/dev/null で実行した(E-1059-CG 追補2の禁止形)— audit の件数照合(PASSED 12/FAILED 2)で不発なしを確認し、FAILED 2件(H2 floor)を是正して再発火 PASSED。以後は出力可視で実行する。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
