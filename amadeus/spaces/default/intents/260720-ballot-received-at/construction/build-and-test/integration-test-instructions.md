# Integration Test Instructions — 260720-ballot-received-at

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## 対象

- `bun test tests/integration/t235-election-store.integration.test.ts` — appendBallot 受理時刻引数(13呼出更新)の round-trip
- `bun test tests/integration/t236-election-loop.integration.test.ts` — ライフサイクル E2E(#1273 の resolveBallots 配線と受理時刻レイヤーの共存)
- 全層: `bash tests/run-tests.sh --ci`(bolt 実測 RESULT: PASS、exit 0)

## 合否基準

e4 レビューの live e2e 実測(receivedAt stamp)と合わせ、CLI ハンドラ完走(handleVerify exit 0)の閉包が成立していること。
