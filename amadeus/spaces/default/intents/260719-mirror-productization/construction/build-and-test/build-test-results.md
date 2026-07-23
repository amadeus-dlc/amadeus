# Build and Test Results

本結果は U1〜U4 の `code-generation-plan.md` と `code-summary.md` を上流証跡として集約した。

## Build

| 検査 | 結果 |
|---|---|
| `bun run typecheck` | PASS |
| Biome 744 files error check | PASS |
| `bun run dist:check` | PASS |
| `bun run promote:self:check` | PASS |

## Tests

| 対象 | Files / Tests | Assertions | Failed | 結果 |
|---|---:|---:|---:|---|
| U4対象 | 3 files / 49 tests | 205 | 0 | PASS |
| 正規CI `bun tests/run-tests.ts --ci` | 478 files | 6888 | 0 | PASS |

正規CIの終了コードは0、最終行は`RESULT: PASS`。Claude substrate unavailableによる既定SKIPとwall-clock drift advisory 1件があったが、failed files / assertionsはいずれも0である。

## Coverage and Failures

U1〜U4の主要分岐、3 phase×4象限、障害回復、ask相関、生成済みCLI E2E、配布一致を検証済み。未解決のテスト失敗はない。fixtureが生成した監査ファイルは残存していない。
