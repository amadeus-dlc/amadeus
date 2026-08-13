# 依存関係

## Internal Dependency Graph

```text
amadeus/config.json
  -> amadeus-graph.ts
  -> compiled scope-grid.json / stage-graph.json
  -> amadeus-orchestrate.ts
  -> plugins/pr-convergence/stages/pr-convergence.md

plugins/pr-convergence/plugin.json
  -> amadeus-plugin.ts compose/drop
  -> code-generation.produces += pr-convergence-report
  -> orchestrator per-unit coverage
  -> amadeus-state.ts completion guards

pr-convergence-cli.ts
  -> pr-convergence-gh-runner.ts -> gh -> GitHub
  -> pr-convergence-predicate.ts
  -> pr-convergence-ledger.ts
  -> pr-convergence-provenance.ts
  -> pr-convergence-presentation.ts
  -> record filesystem

pr-convergence-report.md
  -> report-format sensor
  -> artifact coverage/state completion
```

## External Dependencies

| Dependency | Usage | Failure Mode |
|---|---|---|
| GitHub | PR state、checks、review threads、PR creation | unavailable/rate limit/API error で exit 2 |
| `gh` CLI | authenticated GitHub process adapter | absent/unauthenticated で runner を作らない |
| local filesystem | state、audit、report、compiled graph | absent/malformed artifact で refusal または parse failure |
| Bun runtime | TypeScript CLI/test execution | runtime unavailable で tooling 停止 |

## Coupling and Direction

- host config は plugin 名/stage slug を知るが、plugin 内部実装を知らない。
- core graph/state は artifact 名と sensor severity を知るが、GitHub convergence 意味論を知らない。
- plugin は core implementation を import せず、`amadeus-log` を process boundary で呼ぶ。
- report sensor は CLI renderer を import せず、独立 parser で format drift を検出する。

## Critical Dependency Gaps

1. **CLI → receipt**: report write と同時に durable execution receipt を生成する edge がない。
2. **receipt → audit**: report digest、PR/head identity、CLI invocation identity を audit event に結ぶ edge がない。
3. **audit → completion**: state guard が receipt/digest/event を照合する edge がない。
4. **local branch → GitHub head**: `create` が local commit、remote ref、GitHub PR head SHA を比較する edge がない。
5. **sensor → stage**: sensor manifest は存在するが、stage は `sensors: []`、severity は advisory で blocking edge がない。

## Change Impact

attestation を追加すると、report schema、CLI writer、sensor/validator、audit contract、state completion guard、tests の同時変更が必要になる。scope binding 自体は独立しており、非 self-* opt-in contract を変更する必要はない。
