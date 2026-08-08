<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
2026-08-08T11:20Z — 宣言済み逸脱: 並行宣言された batch 1 / batch 3 を逐次実装した(engine のプラン乖離ガードが code-generation ステージゲートで report を拒否)。選挙 E-CGDRIFT で 2-0(GoA 2x2)により「環境強制の意図的逸脱として申告して進む」を採用。unit-of-work-dependency.md への依存エッジ追加(engine が名指しした もう一方の exit)は採らない — u4 と u5 の間、および batch 1 の3 unit 間に技術的依存は無く、実在しない依存を graph へ焼き込むことは P2(記録は実測事実のみ)に反するため。

機序(両投票者の留保による精密化 — 当初の「swarm referee を使えなかった」という記述は実測と食い違うため訂正):
- **batch 1 では `prepare` は実際に走った** — audit seq 559 `amadeus.swarm.started` が `Batch number: 1` / `Concurrency cap: 3` / `Unit names: u1-autonomy-core,u3-question-route-observability,u6-plugin-docs-drift` を記録している(measurement ref = 本 intent の audit シャード `j5ik2o-mac-studio-lan-f3d36374cb9b.jsonl`)。構造的に不能だったのは referee 全体ではなく、**engine が repo 内に作った worktree に対する agent 自身の書込・git 操作**であり(cid:code-generation:c1-pcp-isolated-session-swarm-incompat)、その帰結として `check` / `finalize` の convergence が記録されなかった。`SWARM_[A-Z_]*` の全域 grep でも本 intent の audit に現れるのは `SWARM_STARTED` 1件のみで、`SWARM_COMPLETED` は 0 件である。
- **batch 3(u4 / u5)は fan-out 自体が存在しない** — batch 1 とは別の事実であり、prepare を試みていない。u4 は Agent の worktree isolation で builder を1体起動して実装し、u5 は record 内レポートのみのため conductor が直接実施した。

代替の検証水準(`converged` 表記は用いない — swarm referee の verdict は存在しないため):
- **u4**: builder head との fidelity 確認として、conductor ツリーと `origin/main` 起点の PR worktree の双方へ `8d5f8fdee`(conduit 本体)と `c7bf27864`(ratchet 登録)を取り込み、対象ファイル差分が空であることを確認。PR worktree での実測 exit code — `bun run build` 0 / `bun run typecheck` 0 / `bun run lint` 0 / `bun tests/gen-coverage-registry.ts --check` 0 / `bun run source-only:check` 0、対象テスト `7 pass / 0 fail`。落ちる実証は conductor が kimi 面で独立に1セット実施(注入 → `4 pass 1 fail` かつ赤が `harness:kimi` を名指し → `git checkout f679e2864 -- <path>` で復元 → `git status --short` clean・残渣 grep 0 hit → 再実行 `5 pass / 0 fail`)。最終的な担保は PR #2532 の CI 全 check green(Tests / Coverage / Reproducible build / Source-only ほか、失敗ゼロ・保留ゼロ)であり、これが referee の代替として機能した検証面である。
- **u5**: コード変更ゼロのため CI 対象面が無く、§12a reviewer による**数値の独立再導出**が検証面である。reviewer は audit シャードと述語定義の read 許可のもとでコーパス全体4値・per-record 16セル・依存着地4面・時系列3点を再計算して全一致を確認し、さらに conductor が見落としていた過大計上1件(records 146 → 実数 145)を検出した。
- 両 unit とも §12a 独立レビューは **READY**(u4 invocation `b2a756da…` / u5 invocation `a60c7858…`、いずれも iteration 1)。

2026-08-08T12:30Z — **上記「依存エッジ追加は採らない」の訂正(record-sync レビュー m1 指摘)**: E-CGDRIFT 裁定(申告して進む)は、プラン乖離ガードに裁定を消費する経路が存在しない(amadeus-orchestrate.ts:5490-5495 の実測)ことが判明して**実行不能**となり、ユーザー裁定により方針を反転 — unit-of-work-dependency.md へ依存エッジを**追加した**。ただし「実在しない技術的依存を焼き込まない」という当初の懸念は、エッジを「技術的依存」と「実行環境制約」に区別する表で保存している(同ファイル :16-30、phase-check-construction.md:18 にも開示済み)。

2026-08-08T12:30Z — **transcript 完了述語の実測 provenance(record-sync レビュー m2 指摘)**: §13 学習 `cid:code-generation:c1-transcript-predicate-excludes-prompt` が引く poll 数値の一次出力 — u4 §12a レビュアー待機スクリプト(scratchpad/wait-u4rev.sh)の逐語出力: 誤発火時 `DONE size=149736 poll=1`(ファイル全体 grep の述語が自プロンプト内の `VERDICT: ` トークンへマッチ — 抽出した最終テキストは中間ナレーション「Now I'll write the re-scan record.」相当の走行中出力)、述語を最終 assistant テキスト限定へ是正後 `DONE size=464302 poll=15`(真の verdict を捕捉)。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
