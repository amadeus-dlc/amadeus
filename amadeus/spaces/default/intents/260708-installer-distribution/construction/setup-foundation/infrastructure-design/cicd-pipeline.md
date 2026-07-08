# CI/CD Pipeline — setup-foundation

> ステージ: infrastructure-design (3.4) / Unit: setup-foundation / 作成: 2026-07-08
> 出典: `../nfr-requirements/tech-stack-decisions.md`(フロア 18.3)・`performance-requirements.md`(NFR-006「CI 互換」— lint/typecheck 対象に packages/setup を含める検証条件はこの要件の義務)、`../nfr-design/logical-components.md`(src/ の深いネスト構造 — グロブ形状の根拠)、`../../publish-readiness/nfr-design/performance-design.md`(遅延ビルドの定義元)、team.md(CI 基準)、codekb `code-quality-assessment.md`

## 既存 CI への組み込み(新規ジョブなし)

- 既存の単一ワークフロー(.github/workflows/ci.yml: install → typecheck → lint → dist:check → promote:self:check → tests)に**そのまま同乗**する
- U1 が追加する配線(team.md Mandated: 同一 PR):
  - tsconfig include へ **再帰グロブ `packages/setup/src/**/*.ts`** を追加(logical-components の src/ は domain/internal/ports/modules/shared の深いネスト構造のため、packages/framework 前例の非再帰 `*.ts` に倣うとサブディレクトリ全滅 — 再帰形を明示指定)
  - `bun run lint` のスコープ拡張(`check tests/` → `check tests/ packages/setup/`)は root package.json の lint スクリプト修正1行(新規ステップ・ジョブは追加しない)
- CI に独立ビルドステップを追加しない。ビルド済み `dist/cli.js` に依存するテストは2箇所のみで、いずれも**テスト内の遅延ビルド**(存在しなければ `bun build` を1回)で自給する:
  - U1 の FR-002 スモーク E2E(bunx/npx 両起動確認 — U1 functional-design ワークフロー4)が遅延ビルドヘルパーを**初出実装**し、
  - U4 の pack 契約テストが同ヘルパーを再利用する(U4 nfr-design の遅延セットアップはこの共有)
  上記2箇所以外の U1〜U3 テストは **TS ソースを bun:test で直接実行**し、dist/cli.js を経由しない(この前提を明示 — ビルド順序への隠れ依存を作らない)
