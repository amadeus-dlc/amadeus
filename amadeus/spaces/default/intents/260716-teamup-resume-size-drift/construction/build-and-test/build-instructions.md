# Build Instructions — teamup-resume-size-drift(Issue #1081)

上流入力(consumes 全数): fix-1081-size-drift の code-generation-plan.md / code-summary.md。

## 手順

1. 変更はテストファイル1行(dist 非関与)— ビルド工程は不要。同期確認として `bun run dist:check` / `bun run promote:self:check` を実行(全 0 実測済み)
2. 検証コマンド: `bun run typecheck` / `bun run lint` / `bun test tests/unit/t-test-size-drift.test.ts` / `bash tests/run-tests.sh --integration --filter t-team-up-codex-resume`

## 注意

宣言行(`// size: large`、:1)は parseSizeAnnotation の先頭40行走査域に置くこと — 位置を下げる変更は宣言を無効化しうる(test-size.ts:279-291)。
