# Build Instructions — 260807-projectdir-worktree-fix

上流入力(consumes 全数): code-generation-plan（fix-2352-projectdir-marker の実装ステップ正本として本書のビルド対象を確定）、code-summary（変更ファイル一覧の出典）

## 依存インストール

```bash
bun install --frozen-lockfile
```

- 前提: bun が PATH にあること（本 worktree で実測済み: 261 packages / exit 0）

## 環境セットアップ

- 追加 env 不要。source-only 境界のため fresh worktree では self-install 面（`.claude/tools` / `dist/`）が存在しない — 最初の build が生成する（cid:scope-definition:c3-worktree-selfinstall-bootstrap）
- 注意: `CLAUDE_PROJECT_DIR` を fixture へ向けた検証を行う場合、本修正後も env が cwd-marker 段より上で勝つ（意図された契約 — requirements AC-1b 改訂）

## ビルドコマンド

```bash
bun run build
```

- packager が manifest 発見の全ハーネス dist と self-install 面を再生成する

## ビルド検証

```bash
git status --short   # tracked ファイルの差分が自編集分のみであること（dist は未追跡生成物）
bun run typecheck    # exit 0
bun run lint         # exit 0
```

実測（code-summary 転記、2026-08-07 worktree 2352-project-dir-fix）: build 成功・tracked 差分は自編集4ファイルのみ・typecheck/lint とも exit 0。

## トラブルシューティング

- `Module not found` で framework CLI が起動しない → build 前の worktree（self-install 未生成）。`bun install && bun run build` を先に実行
- 型検査が dist 由来のエラーを出す → dist は未追跡生成物。`bun run build` で再生成してから再実行
