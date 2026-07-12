# Business Logic Model — U3: ci-snapshot-job

1. ci.yml へ `metrics-snapshot` job 追加: `needs: coverage`、`if: github.event_name == 'push' && github.ref == 'refs/heads/main'`
2. coverage job が coverage-totals.json / tests-totals.json を artifact 化 → 本 job が download
3. `bun scripts/metrics-snapshot.ts --write` 実行 → 成功時 metrics/*.json を git commit+push(GITHUB_TOKEN、bot author — release.yml 前例様式)
4. 失敗時は job 赤(既存 CI Success 集約に載る)— リトライ・握りつぶしなし
