# Unit Test Instructions — 260710-kiro-stale-hooks(minimal strategy)

Test strategy: **minimal**(bugfix)— 対象バグのリグレッションテスト + 既存スイート green 維持。

## リグレッションテスト(本 intent で追加)

- 場所: `tests/smoke/t148-kiro-file-structure.test.ts` の test「no .kiro.hook files in the CLI kiro harness (#719 re-injection guard)」
- 実行: `bun test ./tests/smoke/t148-kiro-file-structure.test.ts`(期待: 11 pass / 0 fail)
- 検証内容: (a) `packages/framework/harness/kiro/hooks/` に `.kiro.hook` 0 件(source 再混入ガード) (b) `dist/kiro/.kiro/hooks/` に `.kiro.hook` 0 件
- 赤の再現(落ちる実証): source に任意の `.kiro.hook` を置くと fail(実測済み: 10 pass / 1 fail → 削除で復帰)

## 関連既存テスト(無改修 green 維持)

- `bun test ./tests/unit/t147-kiro-hook-adapter.test.ts` — adapter の seam 契約
- 全スイート: `bash tests/run-tests.sh --ci`
