# Build Instructions — 260812-tla-proof-receipt

上流入力(consumes 全数): `construction/fix-2913-proof-receipt/code-generation/code-generation-plan.md`(Step 6 が指定する実TLC実行の固定手順 `mise x java@temurin-26.0.1+8 -- bun ...` と Step 7 の回帰検証コマンド集合)、`construction/fix-2913-proof-receipt/code-generation/code-summary.md`(検証表の `bun run typecheck` / `bun run lint` の exit code 実測)。

- Depth: Minimal(`amadeus-state.md` の `**Depth**: Minimal`)— コマンドと環境変数に限定し、troubleshooting 節は Step 10 でビルドが失敗した場合のみ置く。本ステージではビルド失敗が発生しなかったため置かない。
- 測定 ref: worktree `/Users/j5ik2o/orca/workspaces/amadeus/issue-2913-tla-authoring-proof-receipt`、branch `fix/2913-tla-authoring-proof-receipt`、HEAD `23efaab5e`(`git branch --show-current` / `git log --oneline -1` 実測)。

## 前提と依存導入

本リポジトリは Bun 直接実行(TypeScript/ESM)であり、コンパイル成果物を生成するビルド工程は持たない。「ビルド」に相当するのは型検査・lint・生成面の再生成である。

```
bun install --frozen-lockfile
```

変更面は plugin `plugins/formal-model-check/tools/` とテスト面に閉じており(code-summary.md「変更面」節)、`packages/framework/core/` を触っていないため、本 unit では `bun run build`(dist/セルフインストール面の再生成)は必要としない。

## 環境変数

| 変数・ラッパ | 用途 | 必要な場面 |
|---|---|---|
| `mise x java@temurin-26.0.1+8 -- <cmd>` | TLC 実行の JDK 固定 | `tests/formal-verif/` の実TLC面のみ |
| (なし) | 日常 CI 相当の型検査・lint・unit/integration | 常時 |

グローバル mise が `JAVA_HOME` を temurin-26.0.2 へ上書きするため、素の `export JAVA_HOME=...` や `JAVA_HOME=... bun ...` は効かない。実TLC実行は必ず上記ラッパ形で固定する(project.md `cid:requirements-analysis:java-home-mise-shim-override`、code-generation-plan.md Step 6 が指定する形)。

## ビルド・検証コマンド

```
bun run typecheck        # tsc --noEmit -p tsconfig.json && -p tsconfig.tests.json
bun run lint             # Biome
```

実測(本ステージ、フォアグラウンド・exit code 個別捕捉):

| コマンド | exit | 備考 |
|---|---|---|
| `bun run typecheck` | 0 | 出力は `$ tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.tests.json` のみ |
| `bun run lint` | 0 | `Checked 1786 files in 461ms. No fixes applied. / Found 459 warnings. / Found 17 infos.`(warning・info はいずれも既存分 — cg2913-cov-report.md が同数を報告) |

code-summary.md の検証表(builder 実測 0 / conductor 再実測 0)と本ステージの再実測が一致する。
