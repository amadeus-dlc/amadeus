# Build Instructions — 260807-failclosed-recovery-path

上流入力(consumes 全数): 各 unit の `code-generation-plan.md` と `code-summary.md`(`construction/{fix-2313-reconcile-freshness,fix-2330-advisory-store-recovery,fix-2358-unit-done-declaration}/code-generation/`)。build 対象面(NFR-4 の配布境界: #2313 = `scripts/` repo-only / #2330・#2358 = `packages/framework/core/tools/` 正本)は各 unit の code-summary.md の「実装結果」節から導出した。

## 依存インストールと環境

- ランタイム: Bun(非対話シェルの PATH に必須)。依存は `bun install --frozen-lockfile`。
- 環境変数・ローカルサービスは不要(全検証はローカル FS + git のみ)。
- worktree 直後は未追跡のセルフインストール面(`.claude/tools` 等)が空のため、`bun run build` を先に実行しないと framework CLI は起動しない(`cid:scope-definition:c3-worktree-selfinstall-bootstrap`)。

## ビルドコマンド

1. `bun run build` — `packages/framework/core/` 正本から `dist/` とセルフインストール面を再生成する(#2330/#2358 の正本変更が投影されることの確認面)。
2. ビルド検証: `bun run typecheck`(strict `tsc --noEmit`)と `bun run lint`(Biome)。
3. 追跡ファイル不変確認: `bun run build` 後に `git status --porcelain` で追跡ファイルの差分が出ないこと(NFR-4 — 生成物は未追跡)。

## トラブルシューティング

- `Module not found` で CLI が起動しない → 上記の worktree ブートストラップ(`bun run build` 未実行)が第一容疑。
- no-silent-drop gate のローカル実行が `BASELINE_INVALID` → NFR-3 どおり `--base-revision <HEAD の厳密祖先の完全 SHA>` が必須(HEAD 自身は strict-ancestor 拒否)。SHA は `git rev-parse` 実出力のみを使う。
