# Monitoring Design — harness-provenance

上流入力(consumes 全数): performance-design.md, security-design.md, scalability-design.md, reliability-design.md, logical-components.md, components.md, services.md, business-logic-model.md

## Observability surface

reliability-design.mdどおりstate Harnessを一次面、通常memory entryを補助面とする。security-design.mdのraw非記録を守り、performance-design.mdとscalability-design.mdの固定処理へmonitoring overheadを追加しない。components.md、services.md、logical-components.md、business-logic-model.mdはいずれも外部monitoring serviceを必要としない。

## Signals and checks

| Signal | Source | Check |
|---|---|---|
| Harness type | `amadeus-state.md` | exactly-one + 7値 |
| Human context | stage `memory.md` | 実観測entryの正規化値、raw不在 |
| Unknown degradation | state Harness | `unknown` assertion |
| Distribution health | CI drift checks | package/promote check |

metric、log aggregation、trace、dashboard、alert ruleは追加しない。raw env、resolver途中source、session identifierは観測出力へ追加しない。

## Incident use

障害調査ではstate Harnessを最初に確認し、必要ならmemoryの補助contextを読む。値の誤りはauthorization incidentではなく観測品質issueとして扱う。
