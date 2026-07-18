# Build Instructions — hooks-config-conflict（Issue #770）

上流入力（consumes全数）: `../fix-770-hooks-config-conflict/code-generation/code-generation-plan.md`（`code-generation-plan`）、`../fix-770-hooks-config-conflict/code-generation/code-summary.md`（`code-summary`）。

## 前提と依存関係

- リポジトリルートで Bun を使用する。検証環境は Bun `1.3.13`、Codex CLI `0.144.5`。
- 依存関係が未導入の場合だけ `bun install` を実行する。追加の常駐process、network service、external agmsg installはビルド要件にしない。
- 正本は `packages/framework/core/` と `packages/framework/harness/codex/`。`dist/` とself-install treeを手編集しない。

## ビルドと決定的検証

本プロジェクトのビルド判定は、TypeScript型検査と生成面のdrift検査で構成する。

1. `bun run typecheck` — application/test TypeScriptを`tsc --noEmit`で検査する。
2. `bun run lint` — Biomeを実行する。既存complexity warningは記録し、新規errorを許容しない。
3. `bun run dist:check` — 全6 harnessの配布treeが正本と一致することを検査する。
4. `bun run promote:self:check` — project-local self-install treeのdriftを検査する。
5. 生成面を修正した場合だけ `bun scripts/package.ts` と `bun run promote:self` を正本から再生成し、3・4を再実行する。

## 成功条件とトラブルシューティング

- 成功条件は4コマンドすべてexit 0、`dist:check`全harness OK、`promote:self:check` sync、型error 0、lint error 0。
- `dist:check`失敗時は正本とmanifest投影を確認し、distを直接直さない。
- Codex CLIがPATHにないCIではdoctorがthrowせず、`codex CLI on PATH`の診断失敗へ正規化されることを `t-codex-hooks-ownership.test.ts` で検証する。
- local active `.codex/hooks.json` はper-clone runtimeであり、ビルド生成・Git index操作・doctorによる上書きの対象にしない。
