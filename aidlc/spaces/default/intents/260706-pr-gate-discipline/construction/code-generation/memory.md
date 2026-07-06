<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T02:08:00Z — stage-protocol.md からの知識文書参照は、同文書の既存参照様式（`.claude/knowledge/amadeus-shared/...`）に合わせた。配布先では `.claude/knowledge` → `.agents/amadeus/knowledge` の symlink（installer の claudeSymlinks）で解決される。
- 2026-07-06T02:08:00Z — 知識文書 §1 Invariants の drift 権威は、当初「知識文書側 = 正」と実装したが、reviewer iteration 1 の指摘で承認済み設計（domain-entities.md「乖離時はルール側 = 正」）との反転を検出し、設計どおり「ルール側 = 正、知識文書を追随させる」へ修正した。workspace memory がメソドロジ既定を上書きする既存の優先順位とも整合する。
- 2026-07-06T02:12:00Z — reviewer 指摘のうち memory.md の配置（unit 配下でない）は偽陽性と判断した。エンジン directive の memory_path がこのパスを指定し、前例 260706-docs-lang-guide も同配置（construction/{stage}/memory.md + unit 成果物は construction/{unit}/{stage}/）。aidlc-state.md の Per unit: [TBD] は前例 e10f8294 どおり実 unit 名 pr-gate-discipline へ手動更新した。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-06T02:08:00Z — team.md の不変条件 3 行目は「merge は人間が行う（次項）。」とし、既存 `### merge` 小節への内部参照で重複を避けた（4 行上限の内数）。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-06T02:08:00Z — 実装は developer subagent へ委譲し、着手前に origin/main（#542 反映後）へ rebase してから parity-map を編集した。parity:check は ok（199 engine files、基準 b67798c3）。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
