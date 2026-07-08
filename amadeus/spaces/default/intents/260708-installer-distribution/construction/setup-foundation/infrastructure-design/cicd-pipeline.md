# CI/CD Pipeline — setup-foundation

> ステージ: infrastructure-design (3.4) / Unit: setup-foundation / 作成: 2026-07-08
> 出典: `../nfr-requirements/tech-stack-decisions.md`(フロア 18.3)、team.md(CI 基準)、codekb `code-quality-assessment.md`

## 既存 CI への組み込み(新規ジョブなし)

- 既存の単一ワークフロー(.github/workflows/ci.yml: install → typecheck → lint → dist:check → promote:self:check → tests)に**そのまま同乗**する
- U1 が追加する配線(team.md Mandated: 同一 PR): `packages/setup` を tsconfig の include と lint 対象に追加。`bun run lint` のスコープ拡張(tests/ のみ → tests/+packages/setup/)は **root package.json の lint スクリプト修正1行**で実現(新規ステップ・ジョブは追加しない)
- ビルド(`bun build` → dist/cli.js)はテストの遅延セットアップ(U4 設計)で実行されるため、CI に独立ビルドステップを追加しない
