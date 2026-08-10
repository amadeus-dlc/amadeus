# Code Summary — fix-2810-prose-tokenization

## 変更

- plugin prose の正規参照 13 行を `{{HARNESS_DIR}}/plugins/<name>/...` へ変更した。
- `.cursor` と `.opencode` の rules 配下名を manifest と同じ `amadeus-rules` に統一した。
- plugin Markdown の root-relative 参照ガード、全 manifest の transform/seed 等価性、compose 後 command 解決の回帰テストを追加した。
- manifest 実値を共有する test fixture を追加し、8 manifest・7 distinct harness directory を独立 test case で同じ corpus に対して検証した。

## 変更ファイル

- 実装: `packages/framework/core/tools/amadeus-harness.ts`
- prose: `plugins/pr-convergence/stages/pr-convergence.md`、`plugins/formal-model-check/stages/formal-model-check.md`、`plugins/formal-model-check/stages/tla-authoring.md`、`plugins/formal-model-check/README.md`
- テスト: `tests/unit/t146-core-hygiene.test.ts`、`tests/helpers/harness-dir-fixture.ts`、`tests/integration/t532-plugin-prose-transform-seed-equivalence.integration.test.ts`、`tests/integration/t2790-plugin-staging-seed-harness-dir.integration.test.ts`

## Red → Green 実測

- Red: `bun test tests/unit/t146-core-hygiene.test.ts` → exit 1。既存 corpus の root-relative plugin 参照 12 件を検出し、注入 fixture も検出した。
- Red: `KNOWN_RULES_SUBDIR` の修正 2 行を一時除去した状態で `bun test tests/integration/t532-plugin-prose-transform-seed-equivalence.integration.test.ts` → exit 1、7 pass、4 fail、104 assertions。独立ケースとして `cursor transform and seed are byte-equivalent`、`opencode transform and seed are byte-equivalent`、`.cursor resolves its manifest-declared rules subdir`、`.opencode resolves its manifest-declared rules subdir` の失敗を同一実行で個別に観測した。受信値はいずれも rename 前の `rules` だった。
- Red: `bun run build` 後の `bun test tests/integration/t2790-plugin-staging-seed-harness-dir.integration.test.ts` → exit 1。compose 後の root-relative plugin command 残存を検出した。build 前の stale `dist/` 起因の失敗は Red 証跡から除外した。
- Green: 復元後の t532 単独実行 → exit 0、11 tests、132 assertions。
- Green: 上記 3 対象ファイルの同時実行 → exit 0、21 tests、187 assertions。
- 指定検索 `rg -n '(^|[^/A-Za-z0-9._-])plugins/[a-z0-9-]+/(tools|stages|specs|hooks)/' ...` → exit 1、出力 0 件。

## 検証

- `bun run build`、`bun run typecheck`、`bun run lint` → exit 0。lint は既存の情報・警告のみで error 0。
- `bun run test:ci` → exit 0、959 files、12,870 assertions、failed 0。
- `bun run coverage:ci -- -P 4` → exit 0、959 files、12,870 assertions、failed 0。
- `bun tests/coverage-project-gate.ts --check` → exit 0、92.8424%（minimum 90.00%）。
- `bun run distribution:check`、`bun run source-only:check`、graph compile check、coverage registry check、complexity gate → すべて exit 0。
- plugin-conformance E2E → exit 0、3 tests、41 assertions。

## 逸脱と後続境界

- 実装逸脱なし。stale `dist/` を排除するため compose Red の前に build を挟んだ。
- patch coverage gate は clean tree と base ref が必要なため、コミット後の CI で確認する。
- isolated reproducible-build はコミット済み SHA を 2 回 clone する CI 契約のため、コミット後の CI で確認する。
- FR-5(b) の repo 外 consumer 型 A/B 再演と exit code 記録は Build and Test へ引き渡す。
- FR-6 の GitHub 書込、提出工程、closing keyword 適用は後続の人間管理境界へ引き渡す。
