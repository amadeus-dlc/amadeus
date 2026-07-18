# Unit Test Instructions — 260717-state-mirror-fixes

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(両 unit — fix-1170-retreat-guard / fix-1172-skip-denominator)

## 対象と実行

| Bolt | テスト | 実行 | 期待 |
|---|---|---|---|
| U2 #1172 | tests/unit/t232-amadeus-mirror.test.ts(fixture 実様式+両様式+18/18 ケース) | `bun test tests/unit/t232-amadeus-mirror.test.ts` | 12 pass |
| U1 #1170 | tests/unit には新設なし(nfr-design T-3 写像 — in-process 駆動は integration 層) | — | 既存 unit 群 green 維持(t147/t149/t209 は E-SMF-CG1 A 方式で retarget 済み) |

## 注記

U1 の in-process テストを unit 層に置かない判断は fs-tests-integration-first(E-SMF-ND 追補の2軸)による(code-summary.md fix-1170 のテスト配置)。
