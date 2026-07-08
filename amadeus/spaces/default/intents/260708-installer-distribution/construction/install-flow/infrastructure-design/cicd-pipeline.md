# CI/CD Pipeline — install-flow

> ステージ: infrastructure-design (3.4) / Unit: install-flow / 作成: 2026-07-08
> 出典: `../nfr-requirements/performance-requirements.md`(E2E 計測区間)、tests/harness/fixtures.ts の既存流儀(AMADEUS_SRC = dist/claude/.claude)

## E2E テストインフラ(既存流儀への同乗)

- install の E2E は **フィクスチャアーカイブ**(リポジトリ内 dist/ から生成した tar.gz — 実 GitHub 非依存)+一時ターゲットディレクトリで実行。tests/harness の AMADEUS_SRC 流儀(dist からコピー)に整合
- Http ポートの fake(テスト側ヘルパー)がフィクスチャ tar.gz を返す — 実ネットワーク E2E はリリース前 `--release` 層のみ(team.md の既存区分)
- 新規 CI ジョブ・ステップなし(既存 tests 実行に同乗)
