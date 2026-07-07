# Cost Analysis — @amadeus-dlc/setup

## Upstream Inputs

- `slo-config.md`: CI duration が cost driver
- `dashboards.md`: 2 GHA jobs per PR
- `deployment-log.md`: E1 only（GHA dispatch 未実施）

**Analysis date**: 2026-07-07

## Cost Model

AWS リソースはプロビジョニングしない。コストは **GitHub Actions minutes** + **npm registry**（無料 public publish）+ **maintainer time**。

## GitHub Actions Cost Estimate

| Job | Est. duration | Frequency | Monthly est. |
|-----|--------------|-----------|--------------|
| `check` | ~5–10 min | per PR + main push | variable |
| `installer-gates` | ~10–15 min | installer PR only | variable |
| `release-setup` | ~30 min | rare dispatch | negligible |

**Assumption**: solo maintainer、~4 installer PR/month → ~60–100 GHA min/month。

Public repo なら GHA minutes 無料枠内の見込み。

## npm Registry

| Item | Cost |
|------|------|
| public publish | $0 |
| bandwidth | npm 側 |

## Maintainer Time (toil)

| Activity | Est. time | Automatable? |
|----------|-----------|--------------|
| E3 env setup | 30 min once | partial（docs） |
| dry-run dispatch | 10 min/release | no（intentional manual） |
| git staging untracked files | 15 min | yes（PR prep） |
| gate failure triage | variable | partial（runbooks） |

## Optimization Recommendations

| Priority | Recommendation | Savings |
|----------|---------------|---------|
| P1 | installer-gates skip on non-installer PR | ~50% gate minutes |
| P2 | bun dependency cache（既存）維持 | cold start 削減 |
| P3 | 重複 typecheck/lint 統合検討 | defense-in-depth vs minutes tradeoff |
| P4 | v2: L1 bench を optional gate 化 | release confidence vs CI cost |

## AWS Cost Explorer

**N/A** — no AWS resources provisioned。

## ROI Summary

実装コストに対し、CI gate による defect escape 防止が primary value。GHA minutes 最適化は secondary。
