# 数値 provenance コーパス sweep

この成果物は、U1 の `numeric-provenance-mapping-contract.schema.json` と固定 predicate `fr-pred-v1` を U2 の design-time generator で実測した authority である。runtime は統計を再計算せず、末尾の mapping projection だけを readonly に使用する。

## Snapshot

- 観測コミット: `9b2f60ed2b3b98c98894d98acf3add7bbc6f132f`
- runtime graph digest: `9d8096713f323b6646d3e0d3b8f4becc9ff1d4945197c78910e96e0e9d879be3`
- predicate revision: `fr-pred-v1`
- corpus content digest: `04d9bece55bd125cc1edd35a139e438ac0ce31f224f25d992f8b5e7feb9422f3`
- Markdown: 8,685 files
- declared produces: 121 rows
- codekb re-scan: 127 files
- artifact descriptor: 248 rows
- classification evidence: 185 groups

## Enforcement の導出

`code-summary/count` の決定的 sample identity 50件を二値レビューした。全件が意味のある数値主張であり、固定 predicate が許可済み provenance を見落としていないため、偽陽性率は `0/50` である。

provenance-positive 507件の論理距離は `min=0, median=0, p95=0, max=2` だった。U1 の式 `W = max(p95, min + 1)` により `W=1` となり、`W < max` を満たす。被覆は `506/507` なので、この組だけを enforcement とする。ほかの組は label 数、偽陽性率、positive 数、または upper-bound saturation の条件を満たさず measurement-only とする。

## 配線

enforcement policy を持つ stage 集合は `code-generation` のみである。manifest は advisory severity を保持し、stage frontmatter にはこの集合だけを配線する。

## Machine section

`numeric-provenance-sweep/v1` の key と collection は generator の canonical order である。`authoritySweepDigest` は完全な snapshot、248 descriptors、50 labeled samples、185 evidence groups、projection、wired stage 集合から算出した。

```json
{
  "schema": "numeric-provenance-sweep/v1",
  "snapshot": {
    "observedSha": "9b2f60ed2b3b98c98894d98acf3add7bbc6f132f",
    "graphRevision": "9d8096713f323b6646d3e0d3b8f4becc9ff1d4945197c78910e96e0e9d879be3",
    "predicateRevision": "fr-pred-v1",
    "corpusContentDigest": "04d9bece55bd125cc1edd35a139e438ac0ce31f224f25d992f8b5e7feb9422f3"
  },
  "counts": {
    "markdownFiles": 8685,
    "declaredProduces": 121,
    "codekbRescans": 127,
    "artifactDescriptors": 248,
    "labeledSamples": 50,
    "classificationGroups": 185
  },
  "enforcementEvidence": {
    "artifactKind": "code-summary",
    "claimClass": "count",
    "labeledCount": 50,
    "falsePositiveRate": {"numerator": 0, "denominator": 50},
    "provenancePositiveCount": 507,
    "statistics": {"count": 507, "min": 0, "median": 0, "p95": 0, "max": 2},
    "coverage": {"numerator": 506, "denominator": 507},
    "mode": "enforcement",
    "searchScope": {"kind": "bounded", "window": 1},
    "downgradeReasons": []
  },
  "mapping": {
    "authoritySweepDigest": "49dc7da5c90f1ed243df5695330b92afcf3afd4bdd56f8af7235797825e52e35",
    "mechanicalExclusionRevision": "fr-pred-v1",
    "policies": [
      {"stageSlug":"code-generation","recordRelativeOutputPattern":"construction/*/code-generation/code-generation-plan.md","producesKey":"code-generation-plan","claimClass":"count","mode":"measurement-only","searchScope":{"kind":"full-structural-region"},"evidenceId":"code-generation-plan/count"},
      {"stageSlug":"code-generation","recordRelativeOutputPattern":"construction/*/code-generation/code-generation-plan.md","producesKey":"code-generation-plan","claimClass":"measured-value","mode":"measurement-only","searchScope":{"kind":"full-structural-region"},"evidenceId":"code-generation-plan/measured-value"},
      {"stageSlug":"code-generation","recordRelativeOutputPattern":"construction/*/code-generation/code-generation-plan.md","producesKey":"code-generation-plan","claimClass":"percentage","mode":"measurement-only","searchScope":{"kind":"full-structural-region"},"evidenceId":"code-generation-plan/percentage"},
      {"stageSlug":"code-generation","recordRelativeOutputPattern":"construction/*/code-generation/code-generation-plan.md","producesKey":"code-generation-plan","claimClass":"ratio","mode":"measurement-only","searchScope":{"kind":"full-structural-region"},"evidenceId":"code-generation-plan/ratio"},
      {"stageSlug":"code-generation","recordRelativeOutputPattern":"construction/*/code-generation/code-summary.md","producesKey":"code-summary","claimClass":"count","mode":"enforcement","searchScope":{"kind":"bounded","window":1},"evidenceId":"code-summary/count"},
      {"stageSlug":"code-generation","recordRelativeOutputPattern":"construction/*/code-generation/code-summary.md","producesKey":"code-summary","claimClass":"measured-value","mode":"measurement-only","searchScope":{"kind":"full-structural-region"},"evidenceId":"code-summary/measured-value"},
      {"stageSlug":"code-generation","recordRelativeOutputPattern":"construction/*/code-generation/code-summary.md","producesKey":"code-summary","claimClass":"percentage","mode":"measurement-only","searchScope":{"kind":"full-structural-region"},"evidenceId":"code-summary/percentage"},
      {"stageSlug":"code-generation","recordRelativeOutputPattern":"construction/*/code-generation/code-summary.md","producesKey":"code-summary","claimClass":"ratio","mode":"measurement-only","searchScope":{"kind":"full-structural-region"},"evidenceId":"code-summary/ratio"},
      {"stageSlug":"code-generation","recordRelativeOutputPattern":"construction/*/code-generation/pr-convergence-report.md","producesKey":"pr-convergence-report","claimClass":"count","mode":"measurement-only","searchScope":{"kind":"full-structural-region"},"evidenceId":"pr-convergence-report/count"},
      {"stageSlug":"code-generation","recordRelativeOutputPattern":"construction/*/code-generation/pr-convergence-report.md","producesKey":"pr-convergence-report","claimClass":"measured-value","mode":"measurement-only","searchScope":{"kind":"full-structural-region"},"evidenceId":"pr-convergence-report/measured-value"}
    ],
    "wiredStages": ["code-generation"]
  }
}
```

## 承認状態

generator の再計算と U1 schema への適合証拠は作成済みである。最終 `READY` receipt は Build and Test の lead である `amadeus-quality-agent` が独立再計算後に付与するため、本 Unit は承認主体を代行しない。
