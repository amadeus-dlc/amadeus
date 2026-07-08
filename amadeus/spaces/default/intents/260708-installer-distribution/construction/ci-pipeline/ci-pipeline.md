# CI Pipeline — installer-distribution

> ステージ: ci-pipeline (3.7) / 作成: 2026-07-09 / lead: pipeline-deploy
> 出典: `../build-and-test/build-and-test-summary.md`・`test-results.md`(実測結果)、各 Unit の `code-summary.md`、infrastructure-design 全5ユニットの cicd-pipeline.md

## パイプライン構成(既存への同乗 — 新規ファイル・新規ジョブなし)

本 intent の CI 方針は「既存単一ワークフローへの同乗」で全ユニット一貫しており、**ワークフロー YAML の変更はゼロ**。必要だった配線は Bolt 1 で完了済み:

- root tsconfig include へ再帰グロブ `packages/setup/src/**/*.ts`(型検査対象化)
- root package.json の lint スコープ `check tests/ packages/setup/`
- テストは既存 `tests/{smoke,unit,integration}` 層に配置され `bash tests/run-tests.sh --ci` に自動包含

## 品質ゲート定義(マージ前必須 — 実証済み)

| ゲート | コマンド | 実証 |
|--------|----------|------|
| 型検査 | `bun run typecheck` | PR #648〜#654 全グリーン |
| lint | `bun run lint`(Biome) | 同上 |
| 配布物ドリフト | `bun run dist:check` | 同上 |
| セルフインストール同期 | `bun run promote:self:check` | 同上 |
| テスト | `bash tests/run-tests.sh --ci`(t68・pack 契約・BR-I16 回帰含む) | 同上 |

- リリース前追加層: `--release`(e2e ティア)+`AMADEUS_SETUP_E2E_NETWORK=1` の実ネットワーク E2E(設定者は手順書章3)

## アーティファクトと配布

- 成果物リポジトリ: npm レジストリのみ(`@amadeus-dlc/setup`、独立 semver 0.1.0 — FR-017)
- publish は CI 外の手動(CON-004)。`vX.Y.Z` git タグが配布物取得先(resolver は GitHub Releases/tags を照会 — ADR-003)
- CI からの publish/provenance は初回リリーススコープ外(SEC-P03 注記が手順書章5に配置済み)

## 既知の注意点

- t92.test.ts のローカル環境固有赤(bunx TS 解決ドリフト)は GitHub ランナーでは発生しない(全 PR で実証)— 恒久対応は起票待ち Issue 参照
