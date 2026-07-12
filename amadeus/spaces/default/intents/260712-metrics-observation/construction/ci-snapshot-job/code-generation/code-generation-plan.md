# Code Generation Plan — ci-snapshot-job

## 前提

- 対象は U3。既存 `.github/workflows/ci.yml` に main push限定の `metrics-snapshot` jobを追加する。独立workflowは作らない。
- Test Strategy は **Standard**。workflowの静的契約を5〜8件の単体テストで固定し、実Git操作の境界をfixture統合テストで検証する。
- application codeの新規層、DB、migration、UIは対象外。既存CIのtop-level read権限と `ci-success` 集約は変更しない。

## 実装計画

- [x] **Step 1: coverage artifact の供給契約を拡張する**
  - 対象: `.github/workflows/ci.yml`
  - 既存 `amadeus-coverage-report` の upload path に `coverage/coverage-totals.json` と `coverage/tests-totals.json` を追加する。
  - Story traceability: A-1（CI生成）、B-1（tests/coverage値の供給）。

- [x] **Step 2: `metrics-snapshot` job の起動・権限・依存を実装する**
  - 対象: `.github/workflows/ci.yml`
  - `needs: coverage`、`if: github.event_name == 'push' && github.ref == 'refs/heads/main'`、`timeout-minutes: 5`、job単位 `permissions: contents: write` を宣言する。
  - `ci-success` の `needs` / `require_result` には追加せず、PRクリティカルパス外である理由をjobコメントに残す。
  - Story traceability: A-1、A-2、B-2。

- [x] **Step 3: 異なるmain commit間の排他と実行環境を実装する**
  - 対象: `.github/workflows/ci.yml`
  - 固定 `concurrency.group: metrics-snapshot-main`、`queue: max`、`cancel-in-progress: false` をjobに設定する。
  - checkout、Bun setup、既存pinの `lizard==1.23.0`、`actions/download-artifact` の `name: amadeus-coverage-report`、`bun scripts/metrics-snapshot.ts --write` を配線する。
  - `secrets.*` と新規credentialは参照しない。
  - Story traceability: A-1、A-2、B-2、B-3。

- [x] **Step 4: bot commit と限定retry pushを実装する**
  - 対象: `.github/workflows/ci.yml`、必要なら `scripts/` 配下の単一責務helper（workflow内で明瞭に収まらない場合のみ）
  - `github-actions[bot]` authorで `metrics/*.json` のみcommitする。
  - `git fetch origin main` → `git rebase origin/main` → `git push origin HEAD:main` を最大3回実行し、non-fast-forwardだけをretryする。
  - rebase衝突、認証失敗、その他のpush失敗、3回目のNFFはloud-failし、collectorは再実行しない。
  - Story traceability: A-1、A-2、B-2。

- [x] **Step 5: workflow静的契約の単体テストを5〜8件追加する**
  - 必須テストファイル: `tests/unit/t222-ci-snapshot-wiring.test.ts`
  - 既存 `readFileSync` + anchor文字列検査様式を使い、次を独立に確認する: main pushガード、job単位write権限、`ci-success`非包含、`secrets.`非出現、artifact名、固定concurrency+queue、5分timeout、totals upload path（計8件）。
  - jobブロックをアンカーで切り出して検査し、他jobの文字列による偽陽性を避ける。
  - Story traceability: A-1、A-2、B-2。

- [x] **Step 6: push失敗分類の単体・統合テストを追加する**
  - 必須テストファイル: `tests/unit/t222-ci-snapshot-push-retry.test.ts`
  - NFFで最大3回、2回目成功、認証失敗は即時停止、その他失敗は即時停止、3回目NFF失敗、rebase衝突即時停止、collector非再実行を確認する（計7件）。
  - 必須テストファイル: `tests/integration/t222-ci-snapshot-push-retry.integration.test.ts`
  - bare remote + 複数clone fixtureでNFF後のfetch/rebase/push成功と衝突時失敗を確認する。実remoteへのpushは行わない。
  - Story traceability: A-1、A-2、B-2。

- [x] **Step 7: テスト設定への包含を確認する**
  - 対象: `tsconfig.tests.json`、`tests/run-tests.ts`、`package.json`
  - `t222` のunit/integrationテストが既存 discovery、typecheck、lint に含まれることを確認する。除外時のみ既存設定を最小修正し、新規テスト設定は作らない。
  - Story traceability: A-1、A-2。

- [x] **Step 8: U3 の局所・workflow検証を実行する**
  - `bun tests/run-tests.ts --unit --filter t222-ci-snapshot`
  - `bun tests/run-tests.ts --integration --filter t222-ci-snapshot`
  - `bun run typecheck`、`bun run lint:check`
  - workflow構文検証（既存の検証コマンドがあれば使用）と `git diff --check`
  - 着地後の実CIで、main push時のみ起動、ループ非誘発、bot author、`metrics/*.json` 到達を確認し `code-summary.md` に記録する。
  - Story traceability: A-1、A-2、B-2。

- [ ] **Step 9: landing-time運用TODOを追跡可能にする**
  - lizardをinstallするjobが3つになるため、#837レビュー条件に従いP3 enhancementを起票する。PR/Issue操作はconductorの明示指示とlanding手順に従う。
  - Story traceability: A-1（保守可能なCI運用）。

## 完了条件

- main push時だけsnapshotが生成・書き戻され、PR runと `ci-success` を妨げない。
- 異なるmain commitのjobが直列化され、NFFだけが最大3回retryされる。
- artifact名・権限・secrets非使用・retry分類がStandard戦略の単体・統合テストで固定される。

## 独立レビュー修正

- [x] NFF判定を限定し、protected branch等のremote rejectionを即時失敗にする。
- [x] push直前のremote advanceで実NFFを起こし、2回目以降の成功を検証する。
- [x] totalsが `amadeus-coverage-report` upload stepに属することをblock単位で検証する。
