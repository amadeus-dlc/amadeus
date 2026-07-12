# Business Logic Model — U3: ci-snapshot-job

1. ci.yml へ `metrics-snapshot` job 追加: `needs: coverage`、`if: github.event_name == 'push' && github.ref == 'refs/heads/main'`
2. **coverage job 側の修正を含む**: 既存 `Upload coverage artifact` ステップ(ci.yml:100-106)の `path:` へ `coverage/coverage-totals.json` と `coverage/tests-totals.json` を追加(現状は lcov.info と html のみ — reviewer F1 実測)→ 本 job が同 artifact を download
3. `bun scripts/metrics-snapshot.ts --write` 実行 → 成功時 metrics/*.json を git commit+push(GITHUB_TOKEN、bot author — release.yml 前例様式)
4. 失敗時は job 赤(既存 CI Success 集約に載る)— リトライ・握りつぶしなし
