# Build Instructions — standing-delegation-grant

上流入力(consumes 全数): `../standing-grant/code-generation/code-generation-plan.md`、`../standing-grant/code-generation/code-summary.md`

## 前提と依存インストール

- ランタイム: Bun(TypeScript/ESM、`bun --version` で確認)。追加のグローバル依存なし
- 依存インストール: リポジトリルートで `bun install`(node-pty 等の dev 依存を含む。code-generation 中に typecheck 127 → `bun install` で解消した実測あり — code-summary.md の検証節参照)

## ビルドコマンドと検証

本プロジェクトはトランスパイル成果物を持たず、「ビルド」= 配布ツリーの再生成と型検査で構成する:

1. `bun scripts/package.ts` — `dist/<harness>/` 6ツリーを正本(`packages/framework/core/` + `harness/<name>/`)から再生成
2. `bun run promote:self` — セルフインストールツリー(`.claude/`、`.codex/`)へ反映
3. `bun run typecheck`(`tsc --noEmit`)— 型検査
4. 検証: `bun run dist:check` と `bun run promote:self:check` が exit 0(ドリフトゼロの決定的ガード)

## トラブルシューティング

- typecheck が module 解決 127 で落ちる → `bun install` 未実施(worktree 新設直後に発生しやすい)
- dist:check 赤 → 正本編集後の `bun scripts/package.ts` 忘れ。dist の手編集は禁止(Forbidden)
- registry 鮮度赤(gen-coverage-registry FRESHNESS)→ `bun tests/gen-coverage-registry.ts` で再生成(lib の関数目録が変わる変更後に必要 — 本 intent の Major-1 是正でも実測)
