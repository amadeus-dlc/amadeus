# Build & Test Results — 260804-tla-authoring

上流入力(consumes 全数): 各 unit の code-generation-plan.md(検証宣言)と code-summary.md(Bolt ごとの実測 exit code の一次記録)。

## 実測結果(conductor ツリー、U5 #2312 着地後の origin/main 再接地断面)

| 検証 | 結果(実測) |
|---|---|
| `bun run build` | exit 0、追跡ファイル差分なし |
| `bun run typecheck` | exit 0 |
| `bun run lint` | exit 0 |
| `bash tests/run-tests.sh --ci`(full CI) | **RESULT: PASS**(exit 0) |
| formal-model-check(advisory 相関 run) | FormalElection **NOT_DETECTED / exit 0**(相関 run)+ CI runner で両モデル 5/5 NOT_DETECTED(construction/formal-model-check/advisory-run-note.md 転記) |

## PR CI(全 Bolt の着地時実測 — 一次記録は各 code-summary.md と PR CI 実文)

- U1/U6(batch 1)・U2 #2268・U3 #2269・U4 #2287・U5 #2312: 各 PR で必須 check 全 green のうえ人間承認でマージ(squash)。U5 の CI 実文: `project coverage gate: OK — current 92.2233%` / `Patch coverage gate: PASS`

## 帰属切り分けの記録(既定ノルム: assertion 実文で確定)

初回 full CI で 2 ファイル(tests/integration/t93.test.ts / tests/unit/t150-codex-packaging.test.ts、3 assertions)が赤 → assertion 実文で「並行 intent #2284 の新 sensor(amadeus-pr-convergence-report-format.md)が正本に着地済みで、worktree の self-install 面(.claude/sensors、未追跡)が stale」と確定(自変更由来ではない)。`bun run build` の再生成で 22 pass / 0 fail へ回復し、full CI 再実行で RESULT: PASS。
