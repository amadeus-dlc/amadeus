# ビルド・テスト実行結果(build-test-results)

上流入力(consumes 全数): code-generation-plan.md、code-summary.md — 実行コマンド集合は build-instructions.md / 各 test-instructions の宣言どおり。

## 実行断面

- 対象: `otel-improvement` ブランチ着地コミット **`5d912e0dd`**(PR #1844 スカッシュマージ後)
- 実行日時: 2026-07-31(本ステージ実行時に fresh 実測)
- 実行環境: macOS(Apple Silicon)、bun 1.3.13

## ビルド(生成物同期)

| コマンド | exit |
|---|---|
| `bun run typecheck` | **0** |
| `bun run lint` | **0** |
| `bun run dist:check` | **0** |
| `bun run promote:self:check` | **0** |

## テスト

| スイート | 結果 |
|---|---|
| `bash tests/run-tests.sh --ci`(smoke+unit+integration+e2e) | **PASS — 714 ファイル / 9,772 assertions / 0 fail** |
| `bun tests/deletion-gate.ts --check` | **overall GREEN**((a)〜(f) 全 PASS、評価 SHA `5d912e0dd`) |
| `bun tests/deletion-gate.ts --require-green` | **exit 0** |

削除ゲート内訳(verbatim 要旨): (a) mixed Journal 159 assertions PASS / (b) registry 完備 / (c) legacy call site 0 / (d) migration-equivalence 52 tests・5 suites PASS / (e) Relay 非生成 30 assertions PASS / (f) drift guards PASS。

## CI(GitHub 側)

PR #1844 最終 run(head `ef0be78d8`): **CI Success 到達(17 checks pass / 0 fail)**。t258 の既知偽赤 #1830 経路Aは hang guard 300s 化で解消済み。

## 検証済み面と未検証面の明示(verdict-names-unverified-facets)

- **検証済み**: 本リポジトリ内の全テスト層、生成物同期、削除ゲート、GitHub CI
- **未検証(明示引き継ぎ)**: OTLP Relay の実 collector(Jaeger 等)相手の疎通は Phase 0 PoC 実測が根拠であり、本断面では fixture サーバー検証まで(実運用 collector 接続は observability opt-in 後の運用面)
