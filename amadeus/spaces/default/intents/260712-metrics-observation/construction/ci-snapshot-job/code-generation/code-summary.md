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
- integration: 2件 pass（最終検証で確認）。
- workflow静的契約: pass。

## 計画逸脱

- landing後の実CI確認とP3 issue起票は未実施。ローカル実装段階では実remoteへのpushとGitHub外部変更を行わないため、残存作業として引き継ぐ。

## 独立レビュー修正

- NFF判定を `non-fast-forward` / `(fetch first)` に限定し、protected-branch rejectionを即時失敗として固定した。
- bare remoteをpush直前にadvanceし、初回NFF後の2回目retry成功を実証した。
- totals pathが `amadeus-coverage-report` upload step内に属することをblock抽出で検証した。
