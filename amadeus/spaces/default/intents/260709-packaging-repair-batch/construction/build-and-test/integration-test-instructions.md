# Integration Test Instructions — packaging-repair-batch

## 実行

`bash tests/run-tests.sh --ci` — smoke / unit / integration 層を含む CI プロファイル。両 fix ブランチ統合状態で exit 0 を確認する(結果は build-test-results.md)。

## 統合境界の検証ポイント

- #701: `bun scripts/package.ts <name> --check` の実 CLI 実行(サブプロセス)で orphan 検出と ORPHAN 行の出力を検証(t-package-check-root-orphan)
- #702: 実 CLI を temp git fixture に対して実行し、検証失敗時に fixture 全ファイルが byte 不変であることを検証(t-release-sync-atomicity)
- #702: release-it after:bump 配線(packages/setup/.release-it.json)は無変更 — リリースフロー自体の統合検証はスコープ外(release.yml 一本運用は不変)
