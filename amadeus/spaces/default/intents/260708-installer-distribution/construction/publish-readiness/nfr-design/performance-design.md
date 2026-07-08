# Performance Design — publish-readiness

> ステージ: nfr-design (3.3) / Unit: publish-readiness / 作成: 2026-07-08
> 出典: `../nfr-requirements/performance-requirements.md`(pack テスト ≤30秒+ビルド10秒、ドリフト ≤1秒)・`tech-stack-decisions.md`

## テスト実行の構造(CI 予算内)

- pack 契約テストは **1回の `npm pack --dry-run --json` 実行結果を beforeAll で取得し、複数アサーション(satisfied/missing/unexpected 検査)で共有**する — npm CLI 起動(数秒)をテストケース毎に繰り返さない
- ビルド前提(dist/cli.js)は「存在しなければ `bun build` を1回実行」の遅延セットアップ(既にビルド済みの CI フローでは 0 コスト)
- ドリフトテストは同一ファイルの readFile+比較のみ(独立テストケース、npm 起動なし)
