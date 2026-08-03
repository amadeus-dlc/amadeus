# Build Test Results — Codex Duration Bounds

## 実行対象

4 Unitの `code-generation-plan.md` と `code-summary.md` を入力に、最新main `11fc8a7206c2b6960d122ef7cd99ef404fd846ce` を検証した。対象Issueは #1602、#1998、#1999、#1919であり、#1919のE2E追補も含む。

## 結果

| Command／Gate | Verdict | Evidence |
|---|---|---|
| `bun run typecheck` | PASS | TypeScript error 0 |
| `bun run lint` | PASS | exit 0、既存386 warnings／23 infosのみ |
| `bun scripts/package.ts --check` | PASS | 7 harness OK |
| `bun run promote:self:check` | PASS | 5 self-install face OK |
| `t425-unit-pool`＋`t134-swarm-referee` | PASS | 57 tests、218 assertions、0 failure |
| `bun run test:ci` | PASS | 754 files、10,239 assertions、0 failure |
| fixed workload treatment | PASS | median 44.884ms、p95 48.119ms、maximumActive 2 |
| fixed workload termination | PASS | attempts各1、FIFO `u0,u1,u2,u3`、`completed` |
| security event shape | PASS | `forbiddenEventFields: []` |
| [PR #2075](https://github.com/amadeus-dlc/amadeus/pull/2075) CI／review | PASS | required jobs、CodeRabbit、Cursor Bugbot Green |

## 初期エラーと再検証

最初のtypecheckは依存未導入により`tsc`がexit 127だった。`bun install --frozen-lockfile`でlockfile既定依存を復元後、同一commandがPASSしたため製品failureではない。固定workloadの最初の呼び出しは相対 `--repo .` をdynamic importが解決できず失敗したが、絶対path指定へ修正して20測定すべてPASSした。

full suiteのwall-clock driftは4 filesで観測したがfailureは0であり、単独rerunを要するtimeoutはなかった。live Claude／AWS testはsubstrate／credential不在で自己skipし、決定的な派生testは成功した。

## Fixed Workload 証跡

同一inputのcontrol `906612bddeed6b46ede1991ab83be8682c7e50cc` はmedian 21.916ms、p95 22.196ms、maximumActive 4。機能merge treatment `a8e1ce025a918310ab7d803270bb6fc6b649c598` はmedian 43.176ms、p95 44.839ms、maximumActive 2。最新mainでもcap 2、2 wave、各attempt 1、terminal completedを維持した。

## 未解決項目

製品test failure、package drift、protected-file tamper、機密field出力、未解決review、未merge実装は0件。#1919はclosedで `in-progress` 除去済み。Formal Model Checkは明示的にSKIPされており、未実施をfailureとして扱わない。
