# Integration Test Instructions — 260730-open-bug-batch-3

上流入力(consumes 全数): 3 unit(fix-1752/fix-1773/fix-1772)の code-generation-plan.md / code-summary.md — 各バグの閉包テスト(Red→Green 済み)を summary から転記した。

## 対象 integration/e2e テスト(閉包の正本)

- `tests/integration/t265-engine-boundary.integration.test.ts` — #1752 の受理/拒否2ケース分離(create receipt succeeded → 受理、attempted/不在 → 拒否)
- `tests/integration/t371-intent-initialized-boundary.test.ts` — #1791 初回 create 経路の不変確認
- `tests/integration/t373-election-ballot-blind-storage.integration.test.ts` — #1773 の格納分離(collecting 中 ledger 非出現・gitignore 実測・統合冪等性・io-error fail-closed)
- `tests/integration/t236-election-loop.integration.test.ts` — 選挙 CLI 全 verb ループ+#1772 の view 搬送
- `tests/e2e/t237-election-walking-skeleton.test.ts` — 選挙 e2e スケルトン

## 実行

実行前に全 path の実在を確認し、実行後に `Ran N tests across M files` を宣言数と照合する(cid:build-and-test:test-path-set-completeness)。合否基準: 0 fail。
