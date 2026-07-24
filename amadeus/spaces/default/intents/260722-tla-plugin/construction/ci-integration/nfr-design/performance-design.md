# Performance Design — U4 ci-integration

上流: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Job budget

- formal jobを`timeout-minutes: 30`、U3 CLIを180秒で制限し、dispatch時だけ実行する。
- image pull、jar取得、TLC、artifact verify/uploadの時間をstep summaryへ記録する。

## Existing bands

- push/PRではjob-level skipとし、既存7 jobのcritical pathを増やさない。
- 1 runner、1 container、1 modelに限定し、artifact stream上限16MiBを維持する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T22:18:14Z
- **Iteration:** 1
- **Scope decision:** none

供給網契約、失敗証跡flow、component境界にMajor 3件があります。

### Findings

- setup-bun可変tagとSHA固定が矛盾
- bootstrap失敗後のalways証跡とexit優先順位が不足
- component依存とfailure domainが不足

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T22:20:05Z
- **Iteration:** 2
- **Scope decision:** none

前回のMajor 3件はすべて閉包し、供給網固定、terminal-state制御、failure domainを実装可能な粒度へ具体化しました。

### Findings

- Resolved — setup-bun SHA固定、always terminal flow、component isolationを閉包しました。
