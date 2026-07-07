# Deployment Pipeline — Memory

## Upstream References

- `ci-config.md` / `quality-gates.md`: CI/CD 境界と gate 契約
- U8 `deployment-architecture.md` / `cicd-pipeline.md`: release workflow SSOT

## Interpretations

- 2026-07-07T15:10:00Z — npm CLI パッケージのため blue/green/canary ではなく manual gated release を deployment strategy として文書化した。

## Deviations

- 2026-07-07T15:10:00Z — stage Step 4 の feature flag configuration は N/A と判断し、成果物から省略（SemVer/dist-tag が変更制御）。

## Tradeoffs

- 2026-07-07T15:10:00Z — staging registry なし。dry-run dispatch を staging 相当とし、protected environment を prod 相当とした。

## Open questions

- （なし — gate 承認可能）
