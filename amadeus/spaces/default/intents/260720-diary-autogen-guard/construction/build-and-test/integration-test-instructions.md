# Integration Test Instructions — 260720-diary-autogen-guard

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## 対象

- `bun test tests/integration/t-diary-autogen-guard.test.ts`(新設)— バグ前提再現(record 複数+cursor 不在)で不変条件「diary 生成 or loud advisory、無音 skip なし」/ 正当 skip(record 0件)の無音維持 / advisory の stderr 限定(stdout 非汚染)
- `bun test tests/integration/t-ensure-stage-diary.test.ts`(既存 — 期待値変更なし)
- 全層: `bash tests/run-tests.sh --ci`(bolt 実測: exit 0、389 files / 5521 assertions / Failed 0)

## 合否基準

不変条件 HELD(閉包実測済み)+既存 t72/t201 グリーン維持+e2 レビューの独立再現(dist 面切替 赤1→緑6)。
