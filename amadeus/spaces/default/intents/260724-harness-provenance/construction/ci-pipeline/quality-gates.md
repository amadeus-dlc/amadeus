# Quality Gates — harness-provenance

上流入力(consumes 全数): `code-summary`、`build-and-test-summary`、`build-test-results`。

## PR blocking gates

| Gate | 合格条件 | 本intentの証拠 |
|---|---|---|
| Typecheck | `bun run typecheck` exit 0 | PASS |
| Lint | `bun run lint` error 0 | PASS |
| Complexity | 新規違反0、regression 0 | PASS |
| Distribution drift | `dist:check`と`promote:self:check` exit 0 | PASS |
| Tests | smoke+unit+integration failure 0 | metadata不整合2件を是正し、未解消failure 0 |
| Project coverage | project baselineを下回らない | 既存project gateで判定 |
| Patch coverage | 新規・変更行の既存thresholdを満たす | 既存patch gateで判定 |
| Relative coverage | headがmerge-base比較を満たす | 既存relative gateで判定 |
| Aggregate | 適用jobがすべてsuccess | `ci-success`がfail-closedに集約 |

`build-test-results`で既存dependency advisory 12件を分離記録した。本変更はdependencyとlockfileを変更していないため、新規security gateは追加しない。repository全体のdependency remediationは別scopeで扱う。

## Non-blocking and skipped surfaces

- `metrics-snapshot`はPR blocking集約外。ただし`main`上の失敗は赤く可視化する。
- Claude substrate依存live testsはCI credential不在時に明示skipし、通常のunit/integrationは継続する。
- application deploy、container、DB、IaCがないため、ECR/S3 build artifact、DAST、IaC scan、staging deploy gateは非該当。

## Merge and release policy

branch protection上のrequired checkは`CI Success`を正準集約面とする。`main`へのmergeはCI greenとreview READYを実測した後、ユーザー承認を得てsquash mergeする。

releaseはCI mergeから自動publishしない。`.github/workflows/release.yml`の`workflow_dispatch`を人間が起動し、release-itによるversion/tag、GitHub Release、自動notes、npm provenance publishを一続きで実行する。

## 新設・変更

新設gate 0、workflow変更 0、secret追加 0。既存CIが`code-summary`の変更面と`build-and-test-summary` / `build-test-results`の検証契約をすでに包含しているためである。
