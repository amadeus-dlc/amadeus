# Build and Test Results — 260814-park-provenance

測定 ref: PR #3053 head `b373a0af1fd3eb8929e38a8dee00a9443d47ca9d`(bolt-3016-park-provenance、origin/main merge 済み)。上流: `construction/park-provenance/code-generation/code-summary.md`。push-first 方針により、フルスイートとカバレッジの正本判定は PR CI。

## Build(builder 実測、bolt worktree)

- `bun run build` 0(追跡ファイル不変)/ `bun run typecheck` 0 / `bun run lint` 0 / `bun run source-only:check` 0 / `bun run distribution:check` 0 / `updateModelMap --impl-only` 0(base merge 後に再実行済み)

## Tests

- ローカル(builder 実測): t17 87 pass / 0 fail、t3016 5 pass / 0 fail(いずれも exit 0)。フルスイート(c0fed35a5 直前の断面)Failed 1/13430 — 既知フレーク t07 のみ(単独 16 pass、経路不交差 grep 0 hit / exit 1 で帰属切り分け済み)
- **CI 正本(head b373a0af1、`gh pr checks 3053` 転記)**: failing **0** — Tests / Typecheck / Lint and complexity / Coverage Report(+base/head)/ Reproducible build / Source-only and graph invariants / Intent Mirror distribution contract / Plugin conformance E2E / Control byte gate / CI Success すべて pass(Formal model check / Metrics Snapshot は仕様どおり skipping)
- 懸念だった `amadeus-lib.ts` 新規 resolution 行の patch coverage は CI の Coverage Report が pass — in-process テスト追加は不要と確定
- mergeStateStatus: **CLEAN**(base 競合は 3-stage blob 再構成で解消済み、marker 機械検査 0 件・parse 検証 OK)

## Verdict

検証済み: ビルド・型・lint・境界検査・CI 全必須ゲート・受理/拒否/consume-once/resume(engine 実経路)。未検証面: なし(前回申し送りの coverage 懸念は CI green で解消)。マージは人間承認待ち。
