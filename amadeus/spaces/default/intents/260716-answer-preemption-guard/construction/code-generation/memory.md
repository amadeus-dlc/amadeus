<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-07-17T00:45:00Z — designer-export golden(tests/fixtures/designer-export/export.json)の再生成源は dist コピーの `amadeus-graph export` — `.claude/` 側の実行はユーザー定義 scope(amadeus/grilling-integration 等)を拾い fixture 源にならない(+124行の見かけ diff で実測検出)。§13 候補: 「golden の再生成は対象テストが読む配布面のツールで行う」(injection-surface-verify の golden 生成源への対称)
- 2026-07-17T00:45:00Z — mirror の cherry-pick -n は複数コミット指定でも最初の衝突で停止し後続が無音未適用になる — 部分 mirror を t89 旧文面+dist 32/32 の実測で検出し、残り2コミット適用+amend で回復。§13 候補: 「複数コミット cherry-pick -n の後は適用コミット数を git status/対象面 diff で機械確認する」

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-07-17T00:45:00Z — builder が「全32 stage 宣言」(E-APG-AD-DEV 旧字面)適用で t89 初期化不変条件(Case 7/8)と衝突する事態に実装せず停止(deviation-stop-before-implement)→ E-APG-CG 照会 → 争点は E-APG-AD-DEV 再裁定 (i)(29 stage、22:53:17Z 開票)で既決と leader 回答 → no-election-for-decided-norms により (i) を適用し 29/32 で確定。ADR-2・plan Step 4 へ遡及注記済み

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-07-17T00:45:00Z — t89 再整合は fixture 5 dir への manifest 追加+カウント assertion 更新を選択(compileWithSensors の REAL_SENSORS マージ化は検査の独立性を弱めるため不採用)。初期化不変条件 Case 7/8 は無変更維持

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-07-17T00:45:00Z — PR #1123 のマージは per-PR ユーザー承認待ち(no-AI-merge)。マージ後に FR-7(Issue #922 クローズ — close-after-landing-verification)を実行すること
