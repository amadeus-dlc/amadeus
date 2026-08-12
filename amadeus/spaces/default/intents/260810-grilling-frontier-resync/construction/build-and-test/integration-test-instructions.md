# Integration Test Instructions

**Intent**: 260810-grilling-frontier-resync / **Stage**: build-and-test (3.6) / **Test Strategy**: Comprehensive

上流入力(consumes 全数): `code-generation-plan.md` / `code-summary.md` / `pr-convergence-report.md`(各 Unit の実装実績と検証実測 — 本書の検証対象の正本)、`unit-of-work.md`(U1/U2/U3 の完了条件)、`requirements.md`(FR/NFR の受け入れ基準)、`bolt-plan.md`(Bolt ごとの検証列)。

## 対象と根拠

実 FS・実 record 様式を読む検証はすべて integration 層に置く。本 intent の中核契約(センサーの verdict 5態・cutoff 迂回路不在・protocol 逐語 pin)はここで担保される。

| # | テスト | trace 先 | 実行 |
|---|---|---|---|
| I-1 | `tests/integration/t531-grilling-budget-sensor.integration.test.ts` | FR-CONTRACT-4 AC(3態+異形+未知 depth = 5態、落ちる実証込み)/ BR-U2-2/3/7/8/9(cutoff 前 record の9入力組合せ)/ BR-U2-4(answer-evidence 側 vacuity guard) | `bun test tests/integration/t531-grilling-budget-sensor.integration.test.ts` |
| I-2 | `tests/integration/t415-interaction-budget-contract.test.ts` | FR-CONTRACT-6(新契約の逐語 pin+復活禁止 pin)/ FR-PROTO-4〜10 / FR-CONTRACT-1/2/5 / FR-PROJ-1 / FR-CONTRACT-3 | `bun test tests/integration/t415-interaction-budget-contract.test.ts` |
| I-3 | `tests/integration/t517-question-budget-sensor.integration.test.ts` | FR-CONTRACT-4(ii)(未知 depth fail-open の封鎖 — 旧 pin の改訂面) | `bun test tests/integration/t517-question-budget-sensor.integration.test.ts` |
| I-4 | `tests/integration/t199-generated-prefix-contract.test.ts` | FR-PROJ-4(配布投影の契約) | `bun test tests/integration/t199-generated-prefix-contract.test.ts` |
| I-5 | フルスイート `bash tests/run-tests.sh --ci` | 横断ゲート(レジストリ ratchet・境界ガード・カバレッジ整合)は絞り込み実行では構造的に射程外(cid:code-generation:c3-conductor-runs-full-suite) | 下記「帰属」参照 |

## 帰属(既存赤の切り分け)

フルスイートに失敗が出た場合、**未改変ベースでの同一失敗集合の再現**を経てからのみ環境起因・既存事象と分類する(cid:build-and-test:bt-20260730-2)。ベース比較の同一条件には per-user の gitignored な外部入力(active-intent cursor、env)も含める(cid:build-and-test:c1-tsr-ambient-repro-on-base)。立証なしに「既存の問題」と述べない。
