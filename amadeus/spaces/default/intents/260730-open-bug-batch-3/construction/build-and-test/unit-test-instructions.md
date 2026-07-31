# Unit Test Instructions — 260730-open-bug-batch-3

上流入力(consumes 全数): 3 unit(fix-1752/fix-1773/fix-1772)の code-generation-plan.md / code-summary.md — 各 unit のリグレッションテスト所在を summary の「テスト」節から転記した。

## 対象 unit テスト

- `bun test tests/unit/t265-engine-boundary.test.ts` — mirror boundary 判定の純関数面(#1752 隣接)
- `bun test tests/unit/t234-election-model.test.ts` — Choice/DistributionView のキー集合契約(#1772。BR-2 改訂後の新契約を verbatim assert)

## 合否基準

0 fail。t234 のキー集合 assert は推薦マーカー・先行票・peer status の不搬送(BR-2 中核禁止)の執行機構を兼ねる — 変更時は要件裁定必須(cid:reverse-engineering:c1-pinned-behavior-ruling)。
