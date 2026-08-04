# Security Test Instructions

## Threat Modelと対象

`code-generation-plan.md` と `code-summary.md` のNFR-1は、Goal改ざん、権限昇格、replay、audit repudiationを主要riskとする。network service、認証endpoint、IaCは存在しないためDASTやIaC scanは非適用とし、authorization・integrityのnegative testをload-bearing security evidenceとする。

## 実行方法

```bash
bun test --timeout 120000 \
  tests/unit/t427-goal-reconciliation.test.ts \
  tests/integration/t428-goal-revision-authority.integration.test.ts \
  tests/integration/t429-legacy-goal-migration.integration.test.ts \
  tests/integration/t427-goal-reconciliation-completion.integration.test.ts
```

加えて `bun run lint`、`bun run typecheck`、lockfile固定buildを実行する。

## 合格条件

- stage approval、standing delegation、LLM単独、別Intent / sessionの証跡でGoal revisionを有効化できない。
- receipt改ざん、digest mismatch、stale revision、unknown verdict、artifact guard bypassを拒否する。
- auditからGoal revision、receipt、evidence、人間裁定を追跡できる。
- Critical / High相当の未解決findingを残さない。dependency CVE scanはrepositoryの標準CIに専用gateがないため、本stageでは未実施として明示する。
