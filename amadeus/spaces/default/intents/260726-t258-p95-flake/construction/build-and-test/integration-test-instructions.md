# Integration Test Instructions — 260726-t258-p95-flake

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(いずれも construction/fix-t258-p95-flake/code-generation/ — 検証対象と実測 exit code の導出元)。

## 対象と実行

- `bun test tests/integration/t258-lifecycle-transaction.test.ts` — median 配線+provenance へ median 追加(code-summary.md FR-1)+退行合成列の fail 伝播1ケース(FR-4)
- `bun test tests/integration/t257-status-registry-migration.test.ts` — 同一 canonical 述語への配線(FR-3)
- フル: `bash tests/run-tests.sh --ci` exit 0(RESULT: PASS)

## 判定

57 pass 0 fail(3 ファイル一括、code-summary.md 検証表転記)。
