# Scalability Design — U7 CI And Package Gates

> Stage: construction / nfr-design  
> Unit: U7 CI And Package Gates

## Scaling Model

U7はinstaller-related PRのgate registryとして拡張する。`scalability-requirements.md` のfirst-release targetsは、1,000 changed files、11 installer gates、100 coverage registry entries、1,000 dependency findings、1,000 secret findings、2,000 package dry-run entries、20 artifactsである。

## Capacity Boundaries

| Dimension | Design |
|---|---|
| changed files | repo-relative Git pathをlinearにclassifierへ通す。 |
| installer gates | Gate registryとしてGateName/checkName/command/dependency/pathConditionをdata-drivenに保持する。 |
| coverage registry | mapped keysだけを評価し、unrelated repository filesはscanしない。 |
| dependency findings | normalized finding arrayをlinearに評価し、blocking summaryをboundedにする。 |
| secret findings | verified flagだけでblocking判定し、detailはartifactへ分離する。 |
| package dry-run entries | allowlist evaluationをlinearにし、unexpected filesだけsummaryに出す。 |
| artifacts | `.amadeus-ci/setup/` 配下20 artifacts程度に保ち、summaryはartifact pathsを指す。 |

## Gate Registry Strategy

Gate definitions are data-driven enough to add a future gate without rewriting classifier logic. Each gate includes:

- GateName;
- stable GitHub Actions check name;
- command;
- cwd;
- inputs;
- output artifact;
- pass/fail mapping;
- timeout;
- dependencies;
- path condition.

Installer gatesが11を超えたら、explicit gate registry fileとdependency graph validationを導入する。

## CI Matrix Strategy

First release avoids broad OS matrix for every installer-related PR. U6 portability fixtures run on primary CI OS. If Windows shell compatibility becomes repeated failure, add targeted smoke/portability matrix jobs only. U8 release preflight may reuse U7 gates but does not expand U7 PR scope into publish concerns.

## Growth Guardrails

- full installer workflow > 20 min p95: parallel jobs or scheduled extensionsを追加する。ただしFR-016 blockersは残す。
- dependency findings > 1,000: normalized schemaにpagination/chunked reportsを追加する。
- coverage registry > 100: grouped summaryとbaseline metadataを追加する。
- package entries > 2,000: package `files` allowlistとpublish scopeを再検討する。

## Upstream Coverage

- `performance-requirements.md`: parallel gate execution and per-gate budgets をscaling planに反映した。
- `security-requirements.md`: security findings and package contents growthをbounded evaluationにした。
- `scalability-requirements.md`: capacity targets、growth triggers、CI matrix strategy を直接反映した。
- `reliability-requirements.md`: stable GatePlan/check names/artifactsをscaling boundaryに含めた。
- `tech-stack-decisions.md`: GatePlan/GateCheck/report schemas、normalized security schemas に従う。
- `business-logic-model.md`: Gate Plan、Concrete Gate Execution Contract、report artifacts に沿う。
