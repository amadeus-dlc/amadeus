# Integration Test Instructions: pr-convergence plugin

上流入力(consumes 全数): code-generation-plan、code-summary(各 unit)、unit-of-work

## integration 層テスト(実 FS・fixture 駆動 — fs-tests-integration-first)

| テスト | 対象 | 固定する契約 |
|---|---|---|
| `t445-stage-frontmatter-compose.integration.test.ts`(7) | U1 compose E2E | install→produces 反映→drop byte-identical(BR-U1-7/9)。unknown-seam 解消の対照(RE probe2 の rejected→受理) |
| `t447-pr-convergence-ledger.integration.test.ts`(27) | U2 台帳 | 全数ページング(合成2ページ fixture — BR-U2-4)/ bot 判定 __typename / severity 転記 / terminalized 抽出(BR-U2-9)/ bodyDigest 化 |
| `t448-pr-convergence-cli.integration.test.ts`(30) | U2 CLI | status/report/override の exit code 3値契約 / 不成立時レポート非生成(BR-U2-7)/ HUMAN_TURN 不在拒否・converged:true 拒否(BR-U2-8)/ emit 先行 loud fail / log-tool パスの harness 中立性 |
| `t449-pr-convergence-packaging-e2e.integration.test.ts`(12) | U3 E2E | **NFR-1 両側実証**: レポート不在→next 同 batch 再発出(落ちる実証)/ 未 install→前進(対照)/ パス厳密性 / ADR-5 順序 UNKNOWN_SENSOR throw / drop byte-identical+produces stock 復帰 |
| `t450-pr-convergence-report-format-sensor.integration.test.ts`(21) | U3 C8 センサー | converged/override 正例+必須フィールド欠落11ケース赤(renderReport 生成 fixture で 2-reader 乖離検出) |

## 実行手順

`bun test tests/integration/t445-*.test.ts tests/integration/t447-*.test.ts tests/integration/t448-*.test.ts tests/integration/t449-*.test.ts tests/integration/t450-*.test.ts --timeout=30000`

## fixture の正本

GraphQL fixture は実 PR 実測(4件)+合成(2件、README に明記)— 外部 seam 語彙の契約正本(A-1 充足)。
