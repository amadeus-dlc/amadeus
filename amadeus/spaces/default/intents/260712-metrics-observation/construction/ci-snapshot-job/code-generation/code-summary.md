# Code Summary — ci-snapshot-job

## 変更ファイル

- `.github/workflows/ci.yml`: totals artifact供給、main限定snapshot job、固定concurrency、bot commit、push retryを追加した。
- `scripts/metrics-push-retry.ts`: fetch/rebase/pushとNFF限定最大3回retryを分離した。
- `tests/unit/t222-ci-snapshot-{wiring,push-retry}.test.ts`: workflow契約と失敗分類を検証した。
- `tests/integration/t222-ci-snapshot-push-retry.integration.test.ts`: bare remoteと複数cloneでrebase成功・衝突を検証した。

## 判断

- `amadeus-coverage-report` を明示してdownloadし、`ci-success` には追加しない。
- collectorはpush retry中に再実行せず、rebase・認証・その他失敗は即時停止する。
- job権限のみ `contents: write` とし、secret参照は追加しない。

## テスト結果

- unit: 16件 pass。
- typecheck: pass。
- integration: 3件 pass（実workflow読込境界を含む）。
- workflow静的契約: pass。

## 計画逸脱

- landing後の実CI確認とP3 issue起票は未実施。ローカル実装段階では実remoteへのpushとGitHub外部変更を行わないため、残存作業として引き継ぐ。
- rebase後に導入済みだったunit×Small ratchetとの交差により、workflow実ファイル読込を `tests/integration/t222-ci-snapshot-push-retry.integration.test.ts` へ移した。unit側には文字列入力だけを受ける最小 `extractCiSnapshotWiring` seamを追加し、固定fixtureで同じ静的契約を高速検証する。計画記載の `readFileSync` 境界はunitからintegrationへ移ったが、必須unitファイルと契約項目は維持した。allowlist追加は行っていない。

## 独立レビュー修正

- NFF判定を `non-fast-forward` / `(fetch first)` に限定し、protected-branch rejectionを即時失敗として固定した。
- bare remoteをpush直前にadvanceし、初回NFF後の2回目retry成功を実証した。
- totals pathが `amadeus-coverage-report` upload step内に属することをblock抽出で検証した。

## Review — Iteration 2（rebase後・裁定A反映）

**Verdict:** READY
**Reviewer:** amadeus-architecture-reviewer-agent
**Date:** 2026-07-12

### Findings

- Blocking findingなし。unit側は文字列入力のみの最小 `extractCiSnapshotWiring` seamと固定fixtureに限定され、実workflow読込・実git remote/process境界はintegrationへ移動した。裁定A、Small purity、短時間実行、allowlist追加禁止を満たす。
- workflowは固定 `metrics-snapshot-main`、`queue: max`、`cancel-in-progress: false`、job単位 `contents: write`、5分timeout、`amadeus-coverage-report`を明示し、`ci-success`非依存・secret非参照を検証している。
- push retryは `non-fast-forward` / `(fetch first)` のみ最大3回対象とし、実bare remoteで初回NFF後の成功とrebase衝突の即時loud-failを確認した。collectorはretry中に再実行されない。

### 検証結果

- focused（t222を含む全対象）: 44 pass / 0 fail（実git retry境界を含み約2.5秒）。
- size purity (`tests/unit/t-test-size-drift.test.ts`): 16 pass / 0 fail。allowlist差分なし。
- `git diff --check`: pass。正準full CIはconductor実測exit 0を確認済み。

### 残存リスク

- `extractCiSnapshotWiring` は意図的に最小の文字列seamであり、YAMLのjob順序・アンカー名変更では偽陽性で赤くなる。NFF判定はgitの英語stderr表現に依存し、queueは100件上限である。いずれも既知の運用リスクとして監視が必要。
