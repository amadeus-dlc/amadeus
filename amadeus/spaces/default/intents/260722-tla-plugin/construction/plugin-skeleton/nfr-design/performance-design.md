# Performance Design — U2 plugin-skeleton

上流: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Discovery

- core walk後にplugin stageをpath辞書順で1回walkし、frontmatter parseとslug index生成を各file1回行う。
- 0-plugin時はbaseline outputをbyte-identicalに保ち、追加indexやcacheを作らない。

## Benchmark

- 回帰試験は100 plugin×各1 stage×4KiB fixtureと0-plugin baselineを同一processで交互実行し、warm-up 2回後10回のmedian追加時間をbaselineの20%以内とする。
- capacity試験は別に1,000 stage/64MiB以下fixtureをwarm-up 2回後10回実行し、各compile<10秒を要求する。両試験でOS/Bun/bytesを記録する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T22:18:14Z
- **Iteration:** 1
- **Scope decision:** none

性能基準、component境界、error schemaにMajor 3件があります。

### Findings

- 100 plugin baseline比20%基準が欠落
- component依存と共有資源とblast radiusが不足
- code別error必須fieldと単一行JSONが不足

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T22:19:20Z
- **Iteration:** 2
- **Scope decision:** none

前回のMajor 3件はすべて閉包し、新規blocking findingはありません。

### Findings

- Resolved — 性能試験分離、component境界、discriminated error schemaを具体化しました。
