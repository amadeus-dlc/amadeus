# Build & Test Results — 260726-t258-p95-flake

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(いずれも construction/fix-t258-p95-flake/code-generation/ — 検証対象と実測 exit code の導出元) — 数値は code-summary.md 検証表(conductor 再実測)からの転記。

## 実測結果(ブランチ fix/1511-t258-p95-relative-gate、base f8fe817c5)

| 検証 | exit |
|---|---|
| bun run typecheck / bun run lint | 0 / 0 |
| 述語 unit + t257 + t258(57 tests) | 0(57 pass 0 fail) |
| bash tests/run-tests.sh --ci | 0(RESULT: PASS) |
| bun run coverage:ci | 0 |
| patch gate(origin/main base) | PASS(added 13 / covered 13 / uncovered 0) |
| dist:check / promote:self:check | 0 / 0(無風) |

reviewer(architecture)も同マトリクスを独立再実行し一致(code-generation-plan.md Review 節)。

## verdict(検証面の書き分け)

**条件付き READY**:
- 検証済み: 述語の値レベル網羅(旧赤・新緑対照+退行検出の両側)、配線、全ゲート green、§12a READY(iteration 1、Minor 2件是正済み)
- 未検証(PR/CI 面へ引き継ぎ): GitHub Actions 上の green(push 後実測)。**実 CI 負荷下でのフレーク解消の最終確認は着地後の main push 観測**(偽赤の非再発は統計事象のため即日断定不能 — #1511 クローズ時にその旨を明記)
