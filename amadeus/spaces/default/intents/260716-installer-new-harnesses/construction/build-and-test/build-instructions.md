# Build Instructions — Issue #1048

上流入力(consumes 全数): `../installer-enum-extension/code-generation/code-generation-plan.md`(変更目録)、`../installer-enum-extension/code-generation/code-summary.md`(検証実測)。

## 手順(既存機構のみ — 新規ビルド機構なし)

1. `bun install`(依存追加なし — lockfile 不変)
2. 正本編集後の regen: `bun scripts/package.ts`(dist 6ツリー)→ `bun run promote:self`(self-install 2ツリー)
3. 同期検証: `bun run dist:check` / `bun run promote:self:check`(いずれも exit 0 を要求)
4. installer バンドル: `packages/setup` は npm pack 時に dist/cli.js へバンドル(検証は unit-test-instructions 参照)

## 実測(Bolt 1、worktree bolt1-1048 HEAD c4bf43450)

package.ts / promote:self / dist:check / promote:self:check すべて exit 0(builder+conductor 裏取り+PR レビュアー e2 の3重実測)。
