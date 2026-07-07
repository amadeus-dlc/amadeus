# Scalability Design — U8 Manual Release And Docs

> Stage: construction / nfr-design  
> Unit: U8 Manual Release And Docs

## Scaling Model

U8はlow-volume manual release workflowとして設計する。`scalability-requirements.md` のfirst-release targetsは、1,000 tags、2,000 package dry-run entries、11 reused U7 gates、20 release artifacts、25 docs files、500 npm metadata versionsである。

## Capacity Boundaries

| Dimension | Design |
|---|---|
| tags scanned | normalized SemVer recordsをsortし、GitHub Release orderingに依存しない。 |
| package dry-run entries | allowlistとunexpected entriesをlinearに評価する。 |
| U7 preflight gates | release modeで11 gatesをunconditionalに再利用する。 |
| release artifacts | `.amadeus-ci/setup/`配下にbounded JSON reportsを置く。 |
| docs files | root READMEとpackages/setup READMEを中心に、最大25 docs surfacesをlocal checkする。 |
| npm metadata versions | existing-version checkをbounded query/parseにする。 |
| workflow frequency | manual low-volumeのためrelease queueは不要。 |

## Release Matrix Strategy

First release uses one selected tag and one package: `@amadeus-dlc/setup`。Publish itself does not need broad OS matrix。Portability evidence comes from U7/U6 preflight; CI/Deployment design may add targeted portability jobs without changing U8 publish authority.

Dry-run and publish modes share validation paths so dry-run remains a faithful rehearsal. The only branch is whether publish is invoked after validation and approval.

## Growth Guardrails

- tags > 1,000: benchmark tag resolver and add pagination/cache if needed;
- package entries > 2,000: revisit package `files` allowlist and publish scope;
- docs surfaces > 25: define docs manifest for release consistency checks;
- multiple npm packages: create separate release orchestration ADR;
- workflow > 35 min excluding approval: split evidence/post-publish jobs without weakening blockers.

## Artifact Summary

Large dry-run, SBOM, provenance, and npm metadata evidence should be stored as artifacts. Summary shows selected tag、package version、dist-tag、validation statuses、guard that blocked publish or published status、artifact links。

## Upstream Coverage

- `performance-requirements.md`: release workflow budgets and artifact limits are preserved under growth.
- `security-requirements.md`: scaling does not weaken publish guards or docs safety checks.
- `scalability-requirements.md`: capacity targets、growth triggers、release matrix strategy を直接反映した。
- `reliability-requirements.md`: dry-run/publish share validation path and keep deterministic summaries.
- `tech-stack-decisions.md`: one workflow、one package、Bun scripts、docs surfaces に従う。
- `business-logic-model.md`: Workflow Inputs、Tag Selection、Release Validation Plan、Documentation Workflow を拡張境界にした。
