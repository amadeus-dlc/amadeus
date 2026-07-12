# CD Configuration

## 上流と正本

`ci-config.md`、`quality-gates.md`、U3の `deployment-architecture.md` / `cicd-pipeline.md` を入力とし、`.github/workflows/ci.yml` の `metrics-snapshot` jobを唯一のCD正本とする。新規workflow、environment、registry、secretは作らない。

## Triggerとpromotion

- PRでは既存merge-blocking gatesだけを実行し、snapshot jobは`ci-success`へ含めない。
- main pushかつcoverage成功時だけsnapshot jobを起動する。
- `amadeus-coverage-report` をdownloadし、snapshot生成後に`metrics/*.json`だけをbot commitする。
- repository `GITHUB_TOKEN`のjob単位`contents: write`でpushし、新規workflow runの再帰を防ぐ。

## Failure制御

- 固定concurrency、`queue: max`、`cancel-in-progress: false`でmain commit間を直列化する。
- non-fast-forwardだけ最大3回retryし、rebase conflict、認証、その他失敗は即時停止する。
- collectorをretry中に再実行せず、誤データを回復処理で再生成しない。
