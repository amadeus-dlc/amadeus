# Build & Test Results — parser-checkbox-fixes(2026-07-16 fresh 実測)

対象ツリー: conductor 本線(fc3174b21 = main c5f32fd03 merge + 両修正ミラー)。PR 実体は #1037(bolt/fix-1013)/ #1035(bolt/fix-1015)。

## 本線 fresh 実行(全 exit code)

| コマンド | exit |
|---|---|
| `bun install --frozen-lockfile` | 0 |
| `bun run typecheck` | 0 |
| `bun run lint` | 0 |
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |
| `bun tests/complexity-gate.ts --check` | 0 |
| `bun tests/gen-coverage-registry.ts --check` | 0 |
| 関連テスト6ファイル(新規3+回帰 t75/t194/t27) | 99 pass / 0 fail |
| `bash tests/run-tests.sh --smoke` | RESULT: PASS(56 files 365 tests、wall-clock drift 0) |

## PR head の CI(権威、実測確認済み)

- #1037: typecheck-lint-drift-tests pass / codecov/patch pass / Coverage Report pass(純化後 head)
- #1035: typecheck-lint-drift-tests pass / Codecov pass(再接地後 head — iteration1 の dist:check 赤は rebase+全ツリー regen で解消、iteration2 READY)

## 落ちる実証(builder 実測+architecture reviewer 独立再実測)

- #1013: 散文行(F)・節不一致(G)が修正前 exit 0 → RED、修正後 GREEN。verbatim repro(--project-dir/--target-dir override)で exit 1+無書き込みを reviewer が再実測
- #1015: [?]/[R] 崩落+4状態ヘッダが修正前 RED、修正後 4/4 GREEN。reviewer が pre-fix commit 差し替えで RED を独立再現

## 既存赤の帰属(L-CG1 準拠 — assertion 実文確認済み)

- builder 実測のフルスイート赤(t-team-up-codex-resume の herdr session 残留 / t224 並列負荷 drift / t19 pre-existing)はすべて assertion 実文で非自変更起因を確定(#1013 builder は base dist 差し替え対照まで実施)。本線 fresh の smoke/関連テストに赤なし。
