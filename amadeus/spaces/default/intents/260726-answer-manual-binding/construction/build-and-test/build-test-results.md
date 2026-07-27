# Build & Test Results — 260726-answer-manual-binding

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(いずれも construction/fix-answer-manual-binding/code-generation/ — 検証対象・実測 exit code・逸脱裁定の導出元) — 数値は code-summary.md 検証表(conductor 再実測)からの転記。

## 実測結果(ブランチ fix/1548-answer-manual-binding、base db92ed0bd)

| 検証 | exit |
|---|---|
| bun run typecheck / bun run lint | 0 / 0 |
| t282 単体(19 tests) | 0(19 pass 0 fail) |
| bash tests/run-tests.sh --ci | 0(RESULT: PASS) |
| bun run coverage:ci | 0(RESULT: PASS)※ |
| patch gate(origin/main base) | PASS(added 40 / covered 40 / uncovered 0) |
| dist:check / promote:self:check | 0 / 0 |
| 落ちる実証(pre-fix 面 t282) | 3 fail(起票文言 verbatim)→ 復元 19 pass |

※ conductor 1回目の coverage:ci は kill 済み先行実行の stale distribution lock による t-package-write-sweep 偽赤(assertion 実文「distribution writer lock timed out after 5000ms」で帰属確定)— 生存プロセス 0 確認のうえ stale reader 回収 → 再実行 PASS。環境起因・自変更外。

## verdict(検証面の書き分け)

**条件付き READY**:
- 検証済み: 2層修正の挙動(guard 通過+consume+封鎖解除、consume まで実 assert)、非 answer 経路の不変(reviewer 独立再導出)、全ゲート green、§12a READY(iteration 1、指摘0件)
- 未検証(PR/CI 面へ引き継ぎ): GitHub Actions 上の green(push 後実測)
