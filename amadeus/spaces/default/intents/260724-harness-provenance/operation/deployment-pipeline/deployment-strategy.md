# Deployment Strategy — harness-provenance

上流入力(consumes 全数): `ci-config`、`quality-gates`、`deployment-architecture`、`cicd-pipeline`。

## Strategy

versioned developer-tool packageのcontinuous deliveryを採用する。`deployment-architecture`が示すように常駐service、traffic、compute environmentは存在せず、`cicd-pipeline`は正本→dist→self-installの決定的promotionを持つ。したがってblue/green、canary、rollingではなく、immutable versionと人間承認releaseでriskを制御する。

`ci-config`と`quality-gates`がPR段階でfull/drift/coverageをfail-closedに検証し、greenな`main`だけをrelease候補とする。production相当のnpm publishは別途`workflow_dispatch`で承認される。

## Promotion matrix

| Tier | Artifact | Entry gate | Exit gate |
|---|---|---|---|
| Source | `packages/framework/core/` | review対象diff | typecheck/lint/tests |
| Distribution | `dist/{claude,codex,cursor,opencode,kiro,kiro-ide}` | package生成 | `dist:check` |
| Self-install | `.claude/.codex/.cursor/.opencode`等 | promote生成 | `promote:self:check` |
| Main | squash merge commit | CI Success + review READY + user approval | main push CI |
| Release | GitHub Release + npm package | human dispatch + main/tag guards | workflow成功 |

## Blast radius and rollout

新規intentだけがbirth時に`Harness`を記録する。既存stateは変更せず、`Harness`なしV7を読める。配布後のblast radiusは新規intent作成に限定され、network trafficやshared databaseはない。

段階的確認が必要な場合は、release workflowの`dry-run`でversion/tag/publishなしのrehearsalを行い、その後に通常dispatchする。feature flagは追加しない。`AMADEUS_HARNESS_TYPE=manual`は検出overrideであり、rollout制御やsecurity boundaryとして扱わない。

## Success criteria

- release workflowがguard、build、GitHub Release、npm publishを順に完了する
- npm provenanceが付与され、prereleaseは`next`へ分離される
- post-publish verificationはregistry propagation後に別途実行し、in-run `npx` cacheによる偽alarmを作らない
- 新規intentのstateに固定7値の`Harness`がexactly once記録される

## Non-applicable strategies

blue/green、canary、rolling、A/B testing、AppConfig/Evidently、DB migration、staging traffic smokeは対象runtimeがないため非該当。これらを模倣する追加workflowや環境は作らない。
