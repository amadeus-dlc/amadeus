# Build and Test Results — 260807-stage-perf-report

上流入力(consumes 全数): code-generation-plan(Step 11 の検証一式と Step 12 の性能 assert を実行対象として消費)、code-summary(builder 実測値・PR CI 実績・OQ-2 の乖離記録要求を照合対象として消費)

測定 ref: record ブランチ `worktree-260807-stage-perf-report`(origin/main `b37367e1c` をマージ済み)。実装は PR #2448 が main へ着地済み(merge commit `fa7665dfd`)。

## 実行結果(実測 exit code)

| コマンド | exit | 内容 |
|----------|------|------|
| `bun install --frozen-lockfile` | 0 | — |
| `bun run build` | 0 | dist + self-install 面の再生成 |
| `bun run typecheck` | 0 | tsc --noEmit ×2 |
| `bun run lint` | 0 | Biome |
| `bun tests/gen-coverage-registry.ts --check` | 0 | fresh / ratchet held |
| `bun test t486 + t487`(対象 twin) | 0 | **74 pass / 0 fail**(55 + 19) |
| `bun test t-coverage-mechanism-ratchet` | 0 | cli spawner 台帳の整合 |
| `bun run test:ci`(フルスイート) | 6 | 903 files / 12,085 assertions、**6 files fail** — 全件が既存事象(下記) |

## フルスイート失敗 6 件の帰属(未改変ベースとの失敗集合 diff で立証)

**帰属手順**: `git worktree add --detach <origin/main>` で未改変ベースを作り、同一ファイル集合を両ツリーで実行して失敗集合を比較した(cid:build-and-test:c4-260805-subagent-type-guard)。

### (a) 依存未インストール由来 — 3 files / 35 assertions

`no-silent-drop-gate` / `no-silent-drop-repository-adoption` / `t413-no-silent-drop-ci-adoption` が `InfraFailure: TOOL_MISSING: local ast-grep package is unavailable` で失敗。作業ツリーに `@ast-grep/napi` が無かったことが原因で、コードとは無関係。

**立証**: `bun install --frozen-lockfile` 後の再実行で **38 fail → 3 fail** へ減少(該当 3 ファイルはすべて green 化)。

### (b) ambient 入力(アクティブ intent の runtime-graph)由来 — 3 files / 3 assertions

`t17`(`lookup next-stage intent-capture feature`)/ `t66`(nextInScopeStage walk parity)/ `t-runtime-dispatch-seam`(in-process 実 subcommand dispatch)が失敗。

**機序**: `amadeus-state.ts lookup` はアクティブ intent の `runtime-graph.json` を優先して読む。本ワークスペースのアクティブ intent は **self-feature** スコープであり、そのグラフでは `intent-capture` の次が `build-and-test` になる。テストは stock の `feature` スコープを前提に `market-research` を期待するため落ちる。

**決定的立証**(cid:reverse-engineering:c3-chr-deterministic-repro の趣旨): 未改変ベースツリーへ**同じ ambient 入力のみ**(本 intent の `runtime-graph.json` + `amadeus-state.md` + `active-intent` カーソル)を植え、他は一切変更せずに同 3 ファイルを実行 → **3 件とも同一に再現**(`lookup next-stage intent-capture feature` = `build-and-test`)。ambient 入力を持たない素のベースでは **184 pass / 0 fail**。

したがって本 3 件は「アクティブな self-feature intent を持つ作業ツリーでフルスイートを走らせると落ちる」既存の環境依存であり、本 intent の変更に起因しない。PR #2448 の CI(clean checkout・アクティブ intent 無し)は 13 checks すべて green で着地している。

**手順上の申し送り(§13 選挙 E-SPR-BTS13 の両票が指摘)**: 本ランの ambient 再現は `runtime-graph.json` を byte-copy して植えた。既存の `cid:build-and-test:c1-tsr-ambient-repro-on-base` は「per-user の gitignored な外部入力(active-intent cursor、env 等)をベース側へ同一値で再現する」ことを求める一方、**生成物(runtime-graph.json 等)は byte-copy の対象にせず依存を個別に実証する**と明示している。本ランの手順はその除外面に触れており、生成物ごと植えると自変更由来の欠陥を masking しうる。本件では失敗機序が `lookup` の読む runtime-graph の内容そのものであり、cursor だけでは再現条件が揃わなかったための選択だが、手順としては既決則と整合しない。ノルム矛盾監査または当該 cid の改訂選挙で扱うべき事項として申し送る。

## OQ-2 の閉包(requirements.md が本ステージへ委譲した記録要求)

`unparseableReviewHeading` の機械集計値は **117**。上流(RE observed 参照値)の **3** と乖離する。

**機序**(欠陥ではなく仕様どおり): FD A4 が命じる 2 段マッチの寛容側 `/^## Review(?:[ \t].*)?$/` は、厳密マーカー `^## Review — Iteration N$` に一致しない見出しをすべて unparseable として計上する。実コーパスには裸の `## Review`(73 件)、`## Review Iteration N Remediation`(26 件)、`## Review History` 等が実在し、これらが差を作る。上流の参照値 3 は「接尾辞付き見出し」に限定した狭い観測だった。

OQ-2 は「実装の機械集計値を最終確定とする」と定めているため実装は変更せず、**確定値 117** を本書に記録して閉包する(参照値は fixture 契約ではない)。

## 判定

**READY(条件付き)** — 本 intent の変更に起因する失敗はゼロ。フルスイートの 6 件はいずれも既存事象で、(a) は依存インストールで解消、(b) は ambient 入力による既存の環境依存として立証済み。(b) は本 intent のスコープ外だが、フルスイートの実行条件に影響する実在の課題として申し送る。
