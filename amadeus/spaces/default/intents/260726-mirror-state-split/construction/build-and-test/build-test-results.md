# Build & Test Results — 260726-mirror-state-split

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(いずれも construction/fix-mirror-state-split/code-generation/) — 本結果は code-summary.md の検証表の再掲+B&T 段の再実測で構成(数値はコマンド出力転記)。

## 実測結果(ブランチ fix/1547-1534-mirror-read-unification、base origin/main = 2c80d6ead)

| 検証 | exit | 実測者 |
|---|---|---|
| bun scripts/package.ts + bun run promote:self | 0 | builder |
| bun run dist:check | 0 | conductor 再実測(rebase 後) |
| bun run promote:self:check | 0 | conductor 再実測 |
| bun run typecheck | 0 | conductor 再実測 |
| bun run lint | 0 | conductor 再実測 |
| bash tests/run-tests.sh --ci | 0(RESULT: PASS / Failed assertions: 0) | conductor |
| bun run coverage:ci | 0 | conductor |
| lcov patch 照合(diff 追加行 × DA × allowlist) | 未カバー 0 | conductor |
| mirror trio + t265 | 53 pass 0 fail(Ran 53 tests across 4 files) | conductor+reviewer 独立 |
| 落ちる実証(pre-fix 面 t300) | 3 fail(#1547a/b verbatim)→ 復元 5 pass | conductor 再演 |

既知フレーク: wall-clock drift 1件(t-codex-hooks-migration、並行負荷起因・自変更外 — main でも観測)。

## verdict(検証面の書き分け)

**条件付き READY** — 以下を検証済み面/未検証面として明示する:
- 検証済み: read 統一の挙動(t300 in-process)、配布同期、全ゲート green、§12a reviewer READY(iteration 1、Minor 1件是正済み)
- 未検証(PR/CI 面へ引き継ぎ): GitHub Actions 上の CI green(push 後に実測)、codecov patch check-run の green(pulls API で確定)
- 未検証(着地後へ引き継ぎ): FR-6(#1534 の文書化クローズ)は PR の main 着地実測後に実施(close-after-landing)
