# CI Quality Gates

## 上流検証

`code-summary.md` の実装契約と `build-and-test-summary.md` / `build-test-results.md` の実測結果をquality gateへtraceする。ローカル正準CIは337 files・4,597 assertions・失敗0である。

## Merge-blocking gates

| Gate | Criteria | Failure action |
|---|---|---|
| TypeScript | `bun run typecheck` exit 0 | merge block |
| Lint | `bun run lint:check` exit 0、新規errorなし | merge block |
| Build parity | `dist:check` / `promote:self:check` exit 0 | merge block |
| Complexity | 新規違反・回帰0 | merge block |
| Unit/Integration | failed file/assertion 0 | merge block |
| Coverage/Codecov | 既存coverage jobとstatus成功 | merge block |

## Snapshot job gate

`metrics-snapshot` はmain push後の観測jobで、PRの`ci-success`には含めない。ただし起動後のcollector、writer、git push失敗はjobを赤くし、誤データや部分snapshotを黙認しない。download artifactは `amadeus-coverage-report` に固定する。

## Securityと権限

- workflow全体はread、snapshot jobだけwrite。
- `secrets.*` と新規credentialを参照しない。
- bot commitは `metrics/*.json` のみを対象とする。
- branch protection等によるpush拒否はretry対象にせず、運用者が確認可能なloud failureとする。

## 残存確認

landing後、main workflow起動、bot author、実queueを観測する。自己誘発ループはrepository `GITHUB_TOKEN`によるpushが新しいworkflow runを作らないGitHub公式仕様で抑止される。token方式を変更した場合は再検証する。
