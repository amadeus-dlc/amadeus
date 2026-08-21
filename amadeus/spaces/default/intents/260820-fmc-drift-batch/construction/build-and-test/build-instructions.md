# Build Instructions — 260820-fmc-drift-batch

上流入力: 各 unit の `construction/<unit>/code-generation/code-generation-plan.md` と `code-summary.md`(applicability-arms / revise-model-commit / boundary-three-face / advisory-retirement の4面)。本 intent の実装は4本の Bolt PR(#3362 / #3363 / #3364 / #3374)として `origin/main` へ着地済みであり、ビルド対象断面は `origin/main`(検証時点 `99f61828c`)である。

## 依存インストール

- ランタイム: Bun(TypeScript / ESM、`bun` が PATH にあること)
- 手順: リポジトリルートで `bun install --frozen-lockfile`
- 実測: 118 packages、約1秒(検証時点)

## 環境セットアップ

- 追加の環境変数・ローカルサービスは不要(フレームワーク自体が対象)
- ローカルでフルスイートを回す場合のみ: `amadeus/spaces/<space>/intents/active-intent` カーソルを退避する(cid:code-generation:c2-260809-otel-cursor — OTel の one-workspace-per-process 不変量によるローカル専用赤の回避)。targeted 実行では不要
- `TEST_TIME_FACTOR` は既定のままでよい(CI 既定 2)

## ビルドコマンド

- `bun run build` — packager が全ハーネスの `dist/` とセルフインストール面を再生成する(正本 = `packages/framework/core/` / `packages/framework/harness/<name>/`)
- 型検査: `bun run typecheck`(`tsc --noEmit` ×2 tsconfig)
- リント: `bun run lint`(Biome。エラー 0 が基準 — warning は既存分が残る)

## ビルド検証

- `bun run build` の exit 0 を確認(検証実測: exit 0)
- `bun run typecheck` exit 0(検証実測: exit 0)
- `bun run lint` exit 0(検証実測: exit 0 — errors 0 / 483 warnings は既存)
- 追跡ファイル不変の確認: build 後に `git status --short` で tracked 変更が出ないこと(dist は未追跡)

## トラブルシューティング

- **typecheck が tests 側で落ちる**: `tsconfig.tests.json` 断面のみの赤は生成台帳(coverage-registry 等)との resync 漏れを疑う(cid:build-and-test:bt-ledger-resync)
- **build 後に投影面が古い**: マージ取込直後は必ず `bun run build` を先に実行してから registry regen 等を行う(cid:code-generation:c5-regen-needs-build)
- **フルスイートで t-approve-batch 系が4件落ちる**: active-intent カーソル未退避のローカル専用赤(上記環境セットアップ参照)
