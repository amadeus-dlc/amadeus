# Team Practices

## Way of Working

私たちは `main` を中心に、短命ブランチと Pull Request を使う GitHub Flow / トランクベース寄りの運用を行う。Amadeus 自体の変更では intent 成果物を先に承認し、Construction の実装は Bolt 単位で分離して canonical source へ着地する。

## Walking Skeleton

私たちは `amadeus-feature` を含む greenfield-shaped scope の最初の Construction Bolt を walking skeleton として扱い、必ず人間の gate で確認する。既存コードへの変更であっても scope が `amadeus-feature` ならこの規則を維持し、standing grant の自動認可対象にはしない。

## Testing Posture

私たちは TypeScript のテストを `tests/` 配下へ置き、Bun runner で unit / integration / e2e / smoke を検証する。変更と並行して回帰テストを追加し、typecheck、Biome、complexity、coverage、dist / self-install drift、smoke / unit / integration の blocking CI を green に保つ。

## Deployment

私たちはアプリケーションのデプロイ基盤を持たず、release は `.github/workflows/release.yml` の手動 `workflow_dispatch` から release-it、GitHub Release、npm publish を一続きで実行する。Pull Request や Amadeus workflow から version を上げず、publish は人間の承認下で行う。

## Code Style

私たちは TypeScript / ESM と Bun 直接実行、camelCase の内部名、snake_case の directive field、kebab-case の CLI flag、UPPER_SNAKE_CASE の audit event に従う。`packages/framework/core/` の harness-neutral source と `packages/framework/harness/<name>/` の projection を分離し、期待される非成功結果は判別 union、予期しない失敗は例外または fatal CLI error として扱う。
