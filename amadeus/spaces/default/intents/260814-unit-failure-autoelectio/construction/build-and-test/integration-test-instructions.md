# Integration Test Instructions — Issue #2976

上流: `construction/unit-failure-autoelectio/code-generation/code-generation-plan.md` と `code-summary.md`。

## 実行方法

```bash
bun test --timeout 120000 tests/integration/t369-protocol-autosolo-hook.test.ts
bun run test:ci
```

CIの初回コンパイルが遅い場合だけ、失敗ファイルを `bun test --timeout 120000 <file>` で単独再実行する。

## 期待する検証範囲

- 8つのconductor面が同一のfailure-election契約を持つ。
- CLI decline、hold、split、interrupt、CLI errorが人間裁定へ戻る。
- smoke / unit / integration全体で既存挙動が回帰しない。
