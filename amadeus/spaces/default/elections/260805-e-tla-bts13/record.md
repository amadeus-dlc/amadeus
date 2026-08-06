# Election Record — E-TLA-BTS13

- question: intent 260804-tla-authoring の code-generation(batch 4)〜build-and-test 区間の §13 学習候補の採否。候補は以下の4件。C1/C3 を採用し C2/C4 を不採用(理由付き)とする案と、全件不採用(0件)の案から選ぶ。

【C1(採用候補)】cid:requirements-analysis:bun-coverage-spawn-blindspot / cid:code-generation:seam-placement-measured-module ファミリへの追補: composed host(os temp へ compose したコピー)を in-process 動的 import するテストは、bun --coverage がコピー全モジュールを計測して lcov universe を汚染し、project coverage % を無音希釈する(実測: t450 単独で SF 110 中 100 が temp コピー、CI universe 17,648→116,489 行・92.19%→75.66%。project gate は CI 専用ステップのためローカル coverage:ci では検知不能だった)。composed-runtime を駆動する E2E は spawn 子プロセス(計測対象外)を既定とし、恒久修正(repo 外 SF の loud 除外)は #2315。選挙 E-TLA-U5COV 裁定 A の一般化。

【C2(不採用候補 — 理由: 既存 cid の違反実例であり新規則ではない)】spawn 専用 driver から実行時値を in-process import すると全行 0-hit 搭載で patch 行が absent→missed 反転する — 既存 cid:code-generation:seam-placement-measured-module が既に禁じる形そのもの(違反実例として PM ラウンドへ回付)。

【C3(採用候補)】知識クラス: engine の await-advisory-choice が供給する formal_checks[].command の verbatim 実行は、provider auto がローカル Darwin 環境検査で ENVIRONMENT_UNAVAILABLE(fail-closed)になりうる — ローカル実行では --provider docker の付加(TLC 探索意味論に非関与の実行環境引数)を許容し、逸脱として申告する。また advisory 解消には相関3フラグ付き run が必須で、相関なしの同等 run では解消されない(実測: 相関なし CI runner 実行→advisory 残存、相関付き再実行→解消)。

【C4(不採用候補 — 理由: 既存 stale-binary / dist 再生成ファミリで被覆)】base 前進で並行 intent の新 sensor が正本に入ると、worktree の未追跡 self-install 面が stale になり全集合ピンのテスト(t93 等)が偽赤になる — bun run build での再生成が既存規範どおりの対処。

裁定: C1+C3 を採用、C2/C4 は理由付き不採用(choice 1: 2票)
内訳: choice1=2票 choice2=0票
- 留保(subagent-1, GoA2): 採用に3条件を付す。(1) C1 の persist 文には、機序が bun の『spawn した子プロセスを計測しない』という契約なき実装差に依存すること、および恒久修正が Issue #2315(OPEN、実在確認済み)であることを本文へ明記する — 依存を隠したまま『spawn 化すれば安全』とだけ書くと、bun の世代交代で規則が無音失効する(E-TLA-U5COV で subagent-2 が付した同趣旨の留保の persist 面への引き継ぎ)。(2) C1 は独立 cid を新設せず、bun-coverage-spawn-blindspot(team.md:166)/ seam-placement-measured-module(project.md:167)への追補として書き、既存2則が patch 面(absent→missed 反転)を扱うのに対し本追補が project universe 面(母数膨張による無音希釈)を埋める、という被覆関係を1文で明示する。(3) C4 の不採用は『既存ファミリ被覆』で足りるが、base 前進が正本へ新 sensor を持ち込む経路は既存の base-advance-regrounding が『自 Bolt が正本を触った場合』を主語にしており厳密には同一でないため、C2 と同様に次回 PM ラウンドへ違反実例ではなく運用知識として回付し、そこで再判定する(黙って落とさない)。
- 留保(subagent-2, GoA2): persist 文の逐語精度を2点条件とする。(a) C3 の advisory 未解消側の run は「相関なし CI runner 実行」でなく、実測どおり「ローカルの run-model-check-ci.ts run（相関3フラグ非同梱）」と書く — advisory-run-note.md の実文は当該 run をローカル実行として記録しており、候補文の表現は一次記録と一致しない(verbatim-quote-with-cite)。(b) C1 は「project gate は CI 専用ステップのためローカル coverage:ci では検知不能」の根拠を .github/workflows/ci.yml:432 の file:line で焼き込む — 本追補の非自明性はこの検知不能性そのものにあるため、根拠が落ちると追補の存在理由が読めなくなる。
票タイムライン: 配信 2026-08-05T23:03:37Z → 配信 2026-08-05T23:03:37Z → subagent-1 2026-08-06T00:00:00Z(受理 2026-08-05T23:05:16Z) → subagent-2 2026-08-05T23:05:05Z(受理 2026-08-05T23:05:44Z) → 開票 2026-08-05T23:06:03Z
GoA[E-TLA-BTS13]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
