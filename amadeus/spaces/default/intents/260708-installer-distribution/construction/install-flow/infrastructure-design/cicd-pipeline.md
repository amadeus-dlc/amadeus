# CI/CD Pipeline — install-flow

> ステージ: infrastructure-design (3.4) / Unit: install-flow / 作成: 2026-07-08
> 出典: `../nfr-requirements/performance-requirements.md`(E2E 計測区間)、`../nfr-design/performance-design.md`(「E2E 計測の実装位置」— テストランナー側で `amadeus-setup install --yes` を子プロセス起動して計測、CLI 本体に計測コードを入れない)、U1 `../../setup-foundation/functional-design/domain-entities.md`(ExtractedPayload.locate の codeload ラッパー契約)+ ADR-003、tests/harness/fixtures.ts の既存流儀(AMADEUS_SRC = dist/claude/.claude)

## E2E テストインフラ(既存流儀への同乗)

- install の E2E は **フィクスチャアーカイブ**(リポジトリ内 dist/ から生成した tar.gz — 実 GitHub 非依存)+一時ターゲットディレクトリで実行。tests/harness の AMADEUS_SRC 流儀(dist からコピー)に整合
- フィクスチャ生成ヘルパーは **codeload 形状を明示的に再現する**: 全エントリを単一のトップレベルラッパーディレクトリ(codeload は `<repo>-<version>/` を生成 — タグ先頭の `v` は落ちる。例 `amadeus-0.6.9/`)配下に持つ tar.gz を作る。U1 の `ExtractedPayload.locate` はこのラッパーを名前非依存で解決してから `dist/<harness>/` を検出する契約(U1 functional-design/domain-entities.md で確定)。**ラッパーなしのフラット tar.gz でのフィクスチャ生成は禁止** — locate がラッパー剥がしを実装した場合にフラットフィクスチャでは実アーカイブと逆の形状をテストする false green となり、team.md Mandated(失敗注入で赤くなることの実証)が成立しないため
- Http ポートの fake(テスト側ヘルパー)がフィクスチャ tar.gz を返す — 実ネットワーク E2E はリリース前 `--release` 層のみ(team.md の既存区分)
- 実ネットワーク E2E の選別機序: `--release`/`--e2e` フラグは e2e ティア全体を ON にするだけで細分化しないため(tests/run-tests.ts 実測)、**実ネットワークテスト自身が環境変数 `AMADEUS_SETUP_E2E_NETWORK=1` を `test.skipIf` でガード**する(未設定ならスキップ)。素の `--e2e` ローカル実行は既定でオフラインを保ち、リリース手順(U4 手順書)がこの変数を設定して実行する。run-tests.ts の改修は不要
- 新規 CI ジョブ・ステップなし(既存 tests 実行に同乗)
