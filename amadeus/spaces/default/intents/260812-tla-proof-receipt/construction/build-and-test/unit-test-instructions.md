# Unit Test Instructions — 260812-tla-proof-receipt

上流入力(consumes 全数): `construction/fix-2913-proof-receipt/code-generation/code-generation-plan.md`(Step 1 の Red→Green スライスが unit 層の対象を FR-2 の identity digest 一致に定めている)、`construction/fix-2913-proof-receipt/code-generation/code-summary.md`(テスト面の列挙 — `tests/unit/t534-tla-referee-receipt-identity.test.ts` が FR-2、日常 CI 対象)。

- Test Strategy: Comprehensive(`amadeus-state.md` の `**Test Strategy**: Comprehensive`)。ただし「15 tests per component は上限であってノルマではない」(stage 契約 Step 4-8)ため、要件駆動で必要な検査のみを置く。

## 対象と方針

| 対象 | 要件 | テスト |
|---|---|---|
| `tla-referee-toolchain.ts` の `sourceIdentityOf` | FR-2(identity 符号化の統一 = decoded string 形、互換分岐なし) | `tests/unit/t534-tla-referee-receipt-identity.test.ts` |

FR-2 の受け入れ確認は要件の逐語で「同一バイト列に対し referee 形と loader 形の digest が一致する unit テスト」であり、t534 がこれを固定する。純関数(digest 計算)であるため unit 層に置く。実 FS・プロセスに触れる検査は integration 層へ置き(project.md `cid:code-generation:fs-tests-integration-first`)、それらは integration-test-instructions.md が扱う。

code-generation-plan.md Step 1 の Red は現行 object 形(`{bytes: base64}`)での digest 不一致として実測済みで、Green は decoded string 形への統一。互換受理分岐は要件(FR-2)が明示的に禁じているため追加していない(code-summary.md「FR-2 ✅ decoded string 形へ統一、互換分岐なし」)。

## 実行コマンド

```
bun test ./tests/unit/t534-tla-referee-receipt-identity.test.ts
```

日常 CI では `bash tests/run-tests.sh --ci` の unit 層に自動的に含まれる(番号採番済みの通常テスト)。

## カバレッジ期待

Patch Coverage Gate と Project Coverage Gate(絶対下限 AND merge-base 相対許容低下幅の AND 条件 — project.md § Testing Posture)を正の判定とし、ローカル `coverage:ci` の事前完走は必須にしない(`cid:code-generation:local-lcov-pre-push`)。

本 unit の patch coverage は PR #2920 で closure 済み。報告された UNCOVERED 行は cg2913-cov-report.md の per-line 表(lcov `DA:` の hit 数を実読)で全件 in-process 駆動へ閉じ、新規 waiver は追加していない(同レポート「STOP lines: None. Every reported line closed; no waiver added.」)。
