# Performance Design — U7 CI And Package Gates

> Stage: construction / nfr-design  
> Unit: U7 CI And Package Gates

## Design Goals

U7の性能設計は、installer-related PRに必要なblocking gatesを20分 p95以内で完了させることにある。`performance-requirements.md` の通り、npm publish、SBOM/provenance generation、post-publish verification はU7の対象外である。

## Gate Execution Strategy

| Gate group | Budget | Execution |
|---|---:|---|
| changed-file installer classification | p95 <= 5s | PR changed filesだけを使い、path rulesをlinearに評価する。 |
| package metadata / dry-run | 2-3 min | metadataをfail earlyしつつ、他の独立gateは止めない。 |
| smoke / integration | 5-10 min | U6 command surfaceを呼び、fake ports/temp targetsを使う。 |
| coverage registry/ratchet | <= 3 min | registryとbaseline keysだけを読む。 |
| typecheck / lint / dist / promote | <= 5 min each | 既存root scriptsをstable check nameで呼ぶ。 |
| scanner-producing steps | <= 5 min each | dependency/secret findingsをnormalized JSONに変換する。 |
| security gate evaluation | <= 5 min | normalized findingsをlinearに評価する。 |

Independent gatesはGitHub Actions job/stepで並列化する。`package-metadata` は `package-dry-run`、installer smoke/integration、dependency audit のdependencyにできるが、typecheck/lint/dist-check/secret-scanなどの独立gateは可能な限り実行し、修正に必要な失敗をまとめて出す。

## Artifact Strategy

Gate scripts write bounded JSON reports under `.amadeus-ci/setup/`。Large finding setsはmachine-readable detailをartifactに残し、summaryにはcounts、blocking ids、artifact pathsだけを出す。Scanner-producing steps must write:

- `.amadeus-ci/setup/dependency-findings.json`;
- `.amadeus-ci/setup/secret-findings.json`.

Required pathでfindings fileがない、timeout、malformed JSONの場合は deterministically failed gate にする。

## Measurement Plan

GitHub Actions logs or report JSON include per-gate duration。Full installer-related PR workflowはparallel executionとBun dependency cacheを前提に p95 <= 20 min を測る。Correct pass/fail classification が性能より優先し、missing required gateやunresolved checkは時間内でもfailにする。

## Non-Goals

- U7はpublish、tag作成、GitHub Release作成をしない。
- U7はscanner tool choiceを固定しない。
- U7はdriftを自動修正しない。
- U7はglobal repository gatesを弱めない。

## Upstream Coverage

- `performance-requirements.md`: per-gate budget、parallelism、scanner output timing、full workflow budget を設計した。
- `security-requirements.md`: security gatesはnormalized findingsが存在してから評価する。
- `scalability-requirements.md`: changed files/gates/findings/artifactsのcapacityをperformance planに含めた。
- `reliability-requirements.md`: independent gate reporting、missing scanner output failure、stable report artifacts を性能より優先する。
- `tech-stack-decisions.md`: GitHub Actions、Bun/TypeScript scripts、JSON artifacts に従う。
- `business-logic-model.md`: Concrete Gate Execution Contract、parallel execution、scanner workflows に沿う。
