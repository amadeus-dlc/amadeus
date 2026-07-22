# Build and Test Results — upstream-sync-230

> 上流入力(consumes 全数): 全12ユニットの `code-generation-plan.md`、`code-summary.md`

測定 ref: `965f609174006b643d385f50bd090209881e8e18`(branch `resume-usync-230-takeover`)、実行 2026-07-22T05:36Z 前後、実行者: conductor(本セッション)。数値は各コマンドの実出力からの転記。

## 実測結果

| コマンド | exit code | 実測メモ |
|---|---|---|
| `bun run typecheck` | 0 | tsc --noEmit(base + tests) |
| `bun run lint:check` | 0 | Biome |
| `bun run dist:check` | 0 | 6ハーネスツリー全て in sync |
| `bun run promote:self:check` | 0 | self-install 4面全て in sync |
| `bun tests/complexity-gate.ts --check` | 0 | 違反 0 |
| `bun tests/gen-coverage-registry.ts --check` | 0 | fresh / guards green / ratchet held |
| `bash tests/run-tests.sh --ci` | 0 | **RESULT: PASS。Test files: 415 / Failed files: 0 / Failed assertions: 0** |

## 付記

- wall-clock drift(advisory・非失敗): `t-codex-hooks-migration`(measured large)、`t225-upstream-v2-migration-preflight`(measured large)— いずれも本 intent 非改変の既知負荷起因。
- coverage: 各ユニット実装時に local lcov で patch 追加行未カバー 0 を実測済み(各 `code-summary.md`)。U12 時点の full 検査でも `coverage-patch-gate.ts --check` PASS(101 measured / 101 covered / uncovered 0 — U12 code-summary 転記)。
- 落ちる実証: 新設ゲート・検査は各ユニットで失敗注入→赤→復元→緑を実測済み(各 `code-summary.md` に記録)。
