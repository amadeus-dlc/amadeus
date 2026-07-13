# CI Configuration

## 上流と対象

3 unitの `code-summary.md`、`build-and-test-summary.md`、`build-test-results.md` を入力とし、既存 `.github/workflows/ci.yml` をCI正本として維持する。新規workflow、registry、secretは追加しない。

## Triggerと依存関係

- 既存CIはpull requestとmain pushで起動する。
- `metrics-snapshot` jobは `needs: coverage` かつ `github.event_name == 'push' && github.ref == 'refs/heads/main'` に限定する。
- `ci-success` のneedsへ追加せず、PRクリティカルパスを変えない。
- `timeout-minutes: 5`、固定 `concurrency.group: metrics-snapshot-main`、`queue: max`、`cancel-in-progress: false` で異なるmain commitを直列化する。

## Buildとartifact

- coverage jobが `coverage/coverage-totals.json` と `coverage/tests-totals.json` を `amadeus-coverage-report` としてuploadする。
- snapshot jobはartifact名を明示してdownloadし、Bunと`lizard==1.23.0`を準備後、`bun scripts/metrics-snapshot.ts --write` を実行する。
- 生成対象は `metrics/*.json` のみ。外部artifact repositoryや新規package publishはない。

## Commitとpush制御

- authorは `github-actions[bot]`、job単位 `contents: write`、top-levelは`contents: read`を維持する。
- push前にfetch/rebaseし、non-fast-forwardだけ最大3回retryする。rebase conflict、認証、protected branch rejection、その他失敗は即時loud-failする。
- collectorはretry中に再実行しない。実remoteへのpushはローカル検証で行わない。
- checkoutが保持するrepository `GITHUB_TOKEN`でpushするため、GitHub公式仕様上、そのpush eventは新しいworkflow runを作らない。PATや別GitHub App tokenへ置換する場合は、この非再帰保証を再評価する。
