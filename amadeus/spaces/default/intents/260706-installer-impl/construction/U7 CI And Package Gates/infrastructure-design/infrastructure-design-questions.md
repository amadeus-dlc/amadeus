# Infrastructure Design Questions — U7 CI And Package Gates

> Stage: construction / infrastructure-design  
> Unit: U7 CI And Package Gates

## Questions

### Q1. U7のCIゲートでnpm publish、GitHub Release作成、release credential設定を扱うか

[Answer]: No. U7はinstaller-related PRのmerge前blocking gateだけを扱う。npm publish、GitHub Release作成、tag作成、SBOM/provenance生成、post-publish verification、npm token設定はU8 release workflowの責務に残す。

## Ambiguity Analysis

曖昧な回答はない。`business-logic-model.md` はU7をpackage gate、test gate、coverage gate、drift guard、security gate、metadata gateに限定し、release/publishはU8が所有すると明記している。

矛盾はない。`security-design.md` はno token/no publish boundaryを要求し、`reliability-design.md` はU7成功がrelease publicationではなくU8 handoff readyを意味すると定義している。Infrastructure DesignはGitHub Actions PR gates、Bun setup、normalized scanner findings、stable check names、report artifactsに限定する。

不足情報はない。具体的なscanner tool choiceは後続CI実装で選んでよいが、normalized dependency/secret findings JSONとmissing/malformed failureはU7 contractとして固定する。

## Upstream Coverage

- `performance-design.md`: per-gate budget、parallelism、scanner findings artifacts、20分p95 budgetを反映する。
- `security-design.md`: dependency/secret gates、allowlist governance、package validation、no token/no publish boundaryを反映する。
- `scalability-design.md`: 1,000 changed files、11 gates、1,000 findings、2,000 dry-run entries、20 artifactsを反映する。
- `reliability-design.md`: deterministic GatePlan、stable check names、failure diagnostics、U8 handoff onlyを反映する。
- `logical-components.md`: InstallerChangeDetector、GateRegistry、GatePlanner、GateRunner、PackageMetadataGate、PackageDryRunGate、CoverageGate、SecurityGate、DriftGuard、GateReporterを前提にする。
- `components.md`: Package Check と Release Workflow Contract の境界を参照する。
- `services.md`: GitHub Actions PR Gates、npm Registry Publication、manual release postureを反映する。
- `business-logic-model.md`: Gate Selection、Gate Plan、Concrete Gate Execution Contract、Dependency/Secret/Coverage/Drift workflows、CI Handoff To U8を反映する。
