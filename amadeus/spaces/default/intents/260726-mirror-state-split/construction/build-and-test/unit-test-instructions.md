# Unit Test Instructions — 260726-mirror-state-split

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(いずれも construction/fix-mirror-state-split/code-generation/ — 検証対象の Steps・FR 対応・実測 exit code の導出元)。

## 対象と実行

- `bun test tests/unit/t232-amadeus-mirror.test.ts` — status 比較・sectionValue の新サーフェス(code-summary.md FR-1/FR-2 対応表の unit 面)
- 削除シンボル(handleCreate/handleSync/handleClose/writeMirrorIssueField)のテストは code-generation-plan.md Step 5 に従い除去済み — 残存参照 0 は typecheck が保証

## 判定

t232 unit 14 pass 0 fail(mirror trio 53 tests の内訳、code-summary.md 検証表)。
