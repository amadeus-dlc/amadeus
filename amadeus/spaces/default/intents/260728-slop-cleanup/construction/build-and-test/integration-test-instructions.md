# Integration Test 手順 — Slop cleanup

上流入力: `code-generation-plan.md`、`code-summary.md`

## 対象と準備

既存の Bun integration test を使用し、Journal migration converter と process observability seam を検証する。

- `tests/integration/t356-journal-convert.test.ts`
- `tests/integration/t357-observability-seam.test.ts`

テストは一時ディレクトリと既存 fixture だけを使用する。AWS、GitHub、OTLP collector など外部依存の起動は不要である。

## 実行方法と成功条件

```bash
bun test \
  tests/integration/t356-journal-convert.test.ts \
  tests/integration/t357-observability-seam.test.ts
```

全テストが pass、fail が 0 であること。Markdown shard 変換の lossless invariant、process observation の first-caller-wins、flush、再 flush の no-op、disabled/fail-open 契約を確認する。

## 失敗時の対応

`t356` の失敗は Journal 正本と生成面、`t357` の失敗は `registered` 削除前後の runtime 差分を確認する。最大2回の局所修正で解消できなければ、failure 名と出力を `build-test-results.md` に残す。
