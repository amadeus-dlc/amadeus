<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-27T08:35:00Z — core/tools のコメントに repo-only の scripts/<file> パストークンを書くと全 dist へ投影され t258-boundary-guard(出荷 core/tools は scripts/ を参照しない)が赤になる — builder が allowlist 追加でなくコメント reword で是正(ガード趣旨準拠)。出荷面コメントの語彙制約として新規性あり
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-27T08:32:00Z — CG 宣言センサー3種(linter/type-check/answer-evidence)は record md 成果物が filter 構造不適合で発火不能(matches-rejection 実測)。代替: builder が worktree で bun run lint / typecheck を実行 exit 0、conductor が dist:check exit 0 + t307 9 pass を独立再実行(cid:reverse-engineering:c3-codekb-sensor の CG 面同型)
- 2026-07-27T08:32:00Z — §12a check-read は degrade スコープの契約制約により未使用。実装コードの検証は conductor 直接実測(定数 grep・INSTALL.md 実文・dist:check・t307)で代替(cid:code-generation:checkread-degrade-scope-unavailable)
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
