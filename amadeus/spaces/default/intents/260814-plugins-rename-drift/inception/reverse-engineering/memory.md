<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-08-14T07:29:51Z — 差分 base に d7ffaa544(HEAD の祖先で距離最小=4)を選定、observed = cd64486a6(= origin/main); 本 intent に prior re-scan record はなく、re-scans/ + timestamp の全 observed から祖先距離で選んだ。Issue の観測 ref c0f9edf27 以降に plugins/pr-convergence/ が変更されているため、消費者棚卸しは observed 断面で全数再実測する(xrev は採らない — 患部の表現形式を変える移行は無いが、実測値の currency を取り直す)。

- 2026-08-14T07:42:11Z — Issue 主張の 4 実測値が observed 断面で更新(パス軸 25→26、テスト 19→20、config union :58-67→:58-66、worktree ガード :146-165→:143-165); #2999 の新設テストが増分の帰属先。後続ステージの受け入れ基準は observed 断面の値を使う。
- 2026-08-14T07:42:11Z — RE 発見の drift 4 件のうち QP-1(宣言側 fail-open)は #2997 スコープ内、QP-4(t445 硬結合)は #2996 完了条件6 の対象のため起票せず intent 内で扱う; QP-2/QP-3 は §14 auto で #3026/#3028 に起票した。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
