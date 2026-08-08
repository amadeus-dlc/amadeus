# Build and Test Results — Intent 260807-tla-specs-relocation

上流入力(consumes 全数): `code-generation-plan.md`、`code-summary.md`

`code-generation-plan.md` の Step 12(検証)と検収基準、`code-summary.md` の「Test coverage summary」で申告された実績を、本ステージで再実行して確定した結果を記録する。数値はすべて下表のコマンド出力からの転記であり、記憶・見込みからは書かない。

測定 ref: worktree ブランチ `worktree-tla-specs-space-relocation` HEAD = `bb12d0a74c81aac54b22d595928055093759da92`(= PR #2419 head、`git rev-parse HEAD` 実測)

## 実行した検証と結果

| 検査 | コマンド | exit | 結果 |
|---|---|---|---|
| 型検査 | `bun run typecheck` | 0 | PASS |
| Lint | `bun run lint` | 0 | PASS |
| フルスイート | `bash tests/run-tests.sh --ci` | 3 | 888 files / 11,864 assertions / **failed files 3・failed assertions 3**(全件が環境起因と立証 — 下節) |
| source-only 境界 | `bun run source-only:check` | 0 | `source-only boundary: clean` |
| グラフ不変量 | `bun .claude/tools/amadeus-graph.ts compile --check` | 0 | `compile invariant check: OK (i)-(v)` |
| 形式検証(advisory) | engine 供給の `run-model-check.ts`(相関3フラグ付き) | 0 | `NOT_DETECTED`(runId `19f142f1-e273-4b0e-83a5-09abfa3c8279`) |

### センサー

| センサー | 対象 | verdict |
|---|---|---|
| linter | `packages/framework/core/tools/amadeus-formal-verif-model-map.ts` | SENSOR_PASSED(audit seq 1000) |
| type-check | 同上 | SENSOR_PASSED(audit seq 1002) |

### CI(同一 SHA `bb12d0a7` に対する権威判定)

`gh pr checks 2419` 実測 — CI Success / Coverage Report / Coverage Report (base) / Coverage Report (head) / Detect CI changes / Intent Mirror distribution contract / Lint and complexity / Plugin conformance E2E / Reproducible build / Source-only and graph invariants / Tests / Typecheck / CodeRabbit のすべて **pass**。Formal model check と Metrics Snapshot は `skipping`(paths 条件)。

`Reproducible build`(隔離2回ビルドの再現性検査)と `Coverage Report`(Project/Patch の両ゲート)は CI を正の判定面とする(cid:code-generation:local-lcov-pre-push)。ローカルでの再実行は行っていない。

## ローカル失敗3件の帰属 — すべて環境起因(自変更由来ではない)

失敗ファイル: `tests/unit/t17.test.ts`、`tests/unit/t-runtime-dispatch-seam.test.ts`、`tests/integration/t66.test.ts`。

いずれも「このワークスペースに **進行中の active intent が存在する**」という ambient 状態への依存で落ちる。CI は active intent を持たないため同一 SHA で全件 green。

### 立証手順(cid:build-and-test:c4-260805-subagent-type-guard に従う分離 worktree 比較)

1. merge-base `5f2ad9195d9ce3ea55d6bf3d34509f2c5ca2c12b` を `git worktree add --detach` で分離ツリーへ展開し、`node_modules` を symlink 共有のうえ `bun run build` を独立実行(対象3ファイルは `dist/claude/.claude/tools/` を読むため生成物が必要 — exit 0)
2. **未改変ベース(cursor なし)**: 同一3ファイルで `184 pass / 0 fail`
3. **本ツリー(cursor あり)**: 同一3ファイルで `181 pass / 3 fail`
4. **未改変ベースに active-intent cursor を置いて再測**(`260807-failclosed-recovery-path`、Current Stage = build-and-test): `182 pass / 2 fail` — `t17` と `t66` が**本ツリーと同一の失敗**を再現。ベース側でも同型に落ちることをもって、この2件がベース由来と確定した
5. 残る `t-runtime-dispatch-seam` は、テスト本文のコメントが依存を明示している —「`summary` resolves its handler by own-property, then **exits 1 when no runtime-graph.json is present**」(`tests/unit/t-runtime-dispatch-seam.test.ts:109-110`)。`runtime-graph.json` は gitignored のため未改変ベースには存在せず exit 1(pass)、本ツリーの active intent には存在するため exit 0(fail)。コードではなく当該ファイルの実在が分岐要因

### 根本原因の観測

`bun dist/claude/.claude/tools/amadeus-state.ts lookup next-stage intent-capture feature` を両ツリーで実行した実測:

- 本ツリー(active intent = 260807-tla-specs-relocation / self-refactor / build-and-test)→ `build-and-test`
- 未改変ベース(cursor なし)→ `market-research`(= t17 の期待値)
- 未改変ベース(cursor = 260807-failclosed-recovery-path)→ `none`

`lookup next-stage` は引数で渡した scope ではなく active intent の runtime graph を優先解決する。両ツリーの `dist/claude/.claude/tools/data/stage-graph.json` は JSON 正規化 diff で**完全一致**(グラフ形状の差はない)ため、差分要因は ambient state に限られる。

本 intent のスコープ(`specs/tla` 移設 + spec root resolver)外の既存挙動であり、本ステージでは修正しない。

### 検証コマンド(帰属の再現)

```
git worktree add --detach <scratch>/base-tree 5f2ad9195d9ce3ea55d6bf3d34509f2c5ca2c12b
ln -s <repo>/node_modules <scratch>/base-tree/node_modules
(cd <scratch>/base-tree && bun run build)
(cd <scratch>/base-tree && bun test tests/unit/t17.test.ts tests/unit/t-runtime-dispatch-seam.test.ts tests/integration/t66.test.ts --timeout 120000)
bun test tests/unit/t17.test.ts tests/unit/t-runtime-dispatch-seam.test.ts tests/integration/t66.test.ts --timeout 120000
```

## wall-clock drift(参考・非ブロッキング)

`--ci` の test-size 行列が5ファイルの declared=medium / measured=large を報告(`t-codex-hooks-migration` 32.9s、`t225-upstream-v2-migration-preflight` 41.6s、`t49-bolt-sensor-failures` 30.4s、`t05-run-tests-parallel` 33.0s、`t17` 41.9s)。いずれも本 intent の変更対象外ファイルであり、フルスイート並走時の負荷起因(cid:code-generation:fanout-load-settle-before-integration)。CI 側は pass。

## 形式検証(advisory)の実行記録

engine の `await-advisory-choice` が `run_required: true` で供給したコマンドを実行した。

- advisory: `formal-model-check has no recorded verdict (amadeus/spaces/default/specs/tla)`、code `never-run`、instance `38fed498-6c68-4162-8208-95da6e825468`、spec identity `sha256:19967308767d059ea06a6dbf3ffa0bf3415d0341d59997778cdb930c9ea7fdaf`
- 1回目(コマンド逐語)→ `HARNESS_ERROR` / `ENVIRONMENT_UNAVAILABLE`(グローバル mise が JAVA_HOME を temurin-26.0.2 へ上書き)
- 2回目(`mise x java@temurin-26.0.1+8 -- ` 前置、相関3フラグは逐語維持)→ `NOT_DETECTED` / exit 0
- 逸脱申告: JDK 固定の前置は `cid:requirements-analysis:java-home-mise-shim-override` が定めるローカル実行手順であり、TLC 探索意味論には非関与。恒久対応は Issue #2410

再実行後の `next` で advisory は解消され、`run-stage` へ復帰したことを実測。
