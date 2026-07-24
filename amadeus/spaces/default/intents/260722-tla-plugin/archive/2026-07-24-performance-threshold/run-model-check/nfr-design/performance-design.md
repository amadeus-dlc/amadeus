# Performance Design — U3 run-model-check

上流: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Budget

- planner検証後のTLC spawn deadlineを120秒、CLI全体を180秒、CI jobを30分でfail-closedにする。
- warm cache、固定FormalElection、2 vCPU/7GiB相当でwarm-up 1回後5回実行し、各回のspawn<120秒かつCLI<180秒を要求する。

## Resource

- stdout/stderr各16MiBを上限とし、超過はHARNESS_ERRORにする。1 invocationは1 modelだけを扱う。
- image/jar cacheは検証済みcontent-addressed bytesだけをread-only共有する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T22:18:14Z
- **Iteration:** 1
- **Scope decision:** none

EnvReceipt、terminal manifest、logical component契約にMajor 3件があります。

### Findings

- planner別inspection対応表が不足
- manifest自己digest回避とoutcome別artifact集合が不足
- component依存とwriter/failure境界が不足

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T22:19:20Z
- **Iteration:** 2
- **Scope decision:** none

前回のMajor 3件はすべて閉包し、新規blocking findingはありません。

### Findings

- Resolved — planner inspection matrix、manifest artifact集合、component writer/failure契約を具体化しました。
