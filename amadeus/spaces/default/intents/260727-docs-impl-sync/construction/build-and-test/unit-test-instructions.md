# Unit Test Instructions — docs-impl-sync

上流入力(consumes 全数): code-generation-plan.md, code-summary.md

依拠箇所: 検証対象は code-generation-plan.md Step 5 の受け入れ基準 grep 群と docs ゲート。テスト戦略 Minimal(スコープ既定)につき新規テストの下限なし — 既存スイート green 維持のみ(cid:build-and-test:bt-proportional-selection)。

## 実行する検査

1. docs 整合ゲート: `bun test tests/unit/t174-docs-legacy-refs-gate.test.ts`(各 PR ブランチ)
2. 受け入れ基準 grep(requirements FR-1〜FR-5 — 実行結果は build-test-results.md に転記)

## 生成しない検査(根拠)

- 新規 unit テスト: docs 変更はテスト対象コードを持たず、Minimal 戦略は既存 green 維持のみを要求(requirements NFR-4)
