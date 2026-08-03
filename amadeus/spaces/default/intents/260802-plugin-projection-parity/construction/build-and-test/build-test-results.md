# Build and Test Results — plugin projection parity

`code-generation-plan.md` のverification計画と `code-summary.md` の実装結果に対して、以下を同一changesetで実行した。

## Build結果

| Command | Result | Evidence |
|---|---|---|
| `bun run typecheck` | PASS | exit 0、production/test TypeScript error 0 |
| `bun run lint` | PASS | exit 0、既存cognitive-complexity warningのみ |
| `bun scripts/package.ts --check` | PASS | Claude、Codex、Cursor、OpenCode、Kimi、Kiro CLI、Kiro IDEの7面OK |
| `bun run promote:self:check` | PASS | 5 self-install面のMISSING／DIFFERS／ORPHAN／MISPLACED 0 |
| `bun run distribution:check` | PASS | 412 payloads、4 docs／44 topics、416 files |

## Test結果

| Suite | Passed | Failed | Assertions | Notes |
|---|---:|---:|---:|---|
| corrected-goal focused suite | 64 | 0 | 394 | unit、integration、fresh Git E2E |
| contributor／transaction／test-size corrective set | 43 | 0 | 118 | contributor runner誤分類とtest tierを再検証 |
| `bun run test:ci` | 757 files | 0 files | 10,257 | RESULT: PASS |
| t07 isolated rerun | 16 | 0 | 記録対象外 | 並列負荷timeoutの切り分け |

skipを合格の代用にしていない。coverage percentageはこのrepositoryのframeworkが合否値として出力しないため、要件traceと全CIのassertion結果をcoverage evidenceとした。

## Acceptance evidence

- AC-1／AC-2: fresh Git E2Eで5面のstartup前発見とstartup 2回後Git cleanを確認。
- AC-3: `.agents/skills/amadeus-formal-model-check/SKILL.md` の存在と `.codex/skills/...` 不在を確認。
- AC-4: Codex欠損／改変をcurrent-hostだけ修復し、他4面byte不変を確認。
- AC-5: 未選択fixtureとKiro 2 package面がneutral／package-onlyであることを確認。
- AC-6: promotion integrationで欠落、drift、orphan、misplacedを非0診断することを確認。

## Failure・残件

最終結果にfailure、stack trace、未修正defect、security blockerはない。性能testは性能NFRがないため非適用である。
