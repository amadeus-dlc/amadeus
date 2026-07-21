# NFR Design Questions — harness-hook-correctness

> 上流入力(consumes 全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。
>
> 対象: U07 `harness-hook-correctness`。承認済みNFRと正準3 public seamを既存adapter/package/test境界へ機械配置する。
>
> E-OC1 判定: **質問0問**。leader承認 `2026-07-21T00:02:20Z`。

## 質問不要の根拠

- Performance: invocation-localの`process.execPath` spawn、payload一回parse、authored settings一回parseを既存choke pointへ置く。新cache、pool、async queue、latency/throughput SLOはない。
- Security: `spawnHookWithRuntime`、`parseKiroIdeHookContext`、`renderClaudeHookCommand`の正準3 seamだけを公開し、unknown/failed/malformedはfail-closed、visible drop、payload推測0とすることが既決である。
- Scalability: 6 harness projectionと承認済み11 Claude hook commandをmanifest/generator-driven全数検査し、4 self-install closed list、statusline/permission bytesを変更しない。
- Reliability: audit-first、forward-only、payload-free audit-tail self-gate、advisory fail-open、debug opt-in、source/projection drift loud failureを既存contractへ配置する。新retry、circuit breaker、recovery journal、failoverは不要である。
- Logical components: authored adapter/settings、3 pure/public seams、内部classifier/path/identity/drop/settings traversal、package generator、unit/integration/e2e fixturesの既存責務へ閉じる。database、network service、AWS infrastructure、metrics backendを追加しない。

新public API、component ownership、failure分類、retry/recovery、SLO、AWS service、projection scopeを選ぶ余地はない。成果物化中に新たなcomponent境界、failure path、performance threshold、security permission、infrastructure判断が必要になった場合は確定前に停止し、再付議する。

## [Answer]

[Answer]: 質問0問で可。E-OC1でleader承認済み（`2026-07-21T00:02:20Z`）。承認範囲は正準3 seam、`process.execPath`と既存spawn契約、Kiro IDE fail-closed/visible drop、audit-first/forward-only/payload-free self-gate/advisory fail-open、Claude承認済み11 hook command限定、statusline/permission bytes不変、6 harness/4 self-install、既存Bun/TypeScript/package/test stackの機械設計に限定する。新public API、ownership、failure分類、retry、recovery、SLO、cache、queue、AWS infrastructure、network、database、metrics、projection scopeは追加しない。
