# Build and Test Results — 260814-ambient-error-sink

> 実測 ref: HEAD `ee1394489`(= code commit a6e7dbee6 + 台帳同期)。すべて実行出力からの転記。ログ: session scratchpad の `full-suite-3004.log`(1回目・赤)/ `full-suite-3004b.log`(2回目・緑)。

## 結果(確定値)

| コマンド | 結果 |
|---|---|
| `bash tests/run-tests.sh --ci` 1回目 | exit 12 / RESULT: FAIL — Failed files 12 / Failed assertions 46。**全件が台帳同期漏れ由来**: (a) model-map.json の実装ハッシュピン(SOURCE_DRIFT、formal-verif 系 11 ファイル) (b) coverage allowlist の handlePark セレクタ fingerprint 不一致(t535)。コード欠陥ではなくエラーメッセージが名指す機械的是正で閉じる |
| 是正 | `updateModelMap --impl-only`(impl hash 1件更新)+ handlePark セレクタ2件を gate 自身の `createSemanticSelector` で再アンカー(+31 行の定数シフト、実測) |
| `bash tests/run-tests.sh --ci` 2回目 | **exit 0 / RESULT: PASS — Failed files 0 / Failed assertions 0** |
| `bun run typecheck` / `bun run lint` | exit 0 / exit 0(是正後再実行) |
| t544 単独(conductor 独立再実測) | 4 pass / 0 fail、本 intent audit shard md5 前後不変 |
| t214 / t258 / t404 / t-formal-verif-tla-model | 0 fail(是正後) |
| `bun run build` / `bun run source-only:check` | exit 0(builder 実測)、追跡ファイルへの dist 起因変更なし |

## 未検証面(申し送り)

- PR #3011 の CI は pr-convergence ステージで実測する。
- 1回目の赤で観測した t143(SDK weekly limit)は2回目で PASS(コード非依存の切り分けどおり)。
