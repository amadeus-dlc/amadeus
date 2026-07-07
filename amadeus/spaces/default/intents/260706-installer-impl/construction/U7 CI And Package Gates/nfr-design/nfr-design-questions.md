# NFR Design Questions — U7 CI And Package Gates

> Stage: construction / nfr-design  
> Unit: U7 CI And Package Gates

## Questions

### Q1. U7で追加のNFR設計判断が必要か

[Answer]: No additional questions. U7のNFR RequirementsとFunctional Designで、GitHub Actions、Bun/TypeScript gate scripts、installer-related path classifier、Concrete Gate Execution Contract、normalized security schemas、coverage registry/ratchet、dist/promote drift guards、U8 handoff boundary が固定済みであるため、追加のユーザー判断は不要。

## Ambiguity Analysis

曖昧な回答はない。U7はinstaller-related PRのblocking gateを所有するが、npm publish、GitHub Release作成、tagging、SBOM/provenance、post-publish verification はU8が所有する。

矛盾はない。`performance-requirements.md` はparallel gate実行とfull workflow p95 20分を要求し、`security-requirements.md` はdependency/secret scanner normalized findings と allowlist governance を要求し、`scalability-requirements.md` は11 gates/1,000 findings/20 artifactsを要求し、`reliability-requirements.md` はdeterministic GatePlan、stable check names、U8 handoff onlyを要求している。`tech-stack-decisions.md` と `business-logic-model.md` はConcrete Gate Execution Contractとschemaを定義しており、設計方針と一致する。

不足情報はない。scanner tool choice は後続CI implementationで選べるが、U7 blocking判定は normalized JSON schema に固定する。

## Upstream Coverage

- `performance-requirements.md`: gate timing、parallelism、scanner findings emission、full workflow budget を確認した。
- `security-requirements.md`: dependency/secret gate、allowlist schema、package metadata/content validation、no publish token を確認した。
- `scalability-requirements.md`: changed files、gate count、findings count、package entries、artifact count を確認した。
- `reliability-requirements.md`: deterministic path classification、stable check names、fail-fast制限、U8 handoff boundary を確認した。
- `tech-stack-decisions.md`: GitHub Actions、Bun scripts、JSON artifacts、normalized schemas、coverage floor を確認した。
- `business-logic-model.md`: Gate Selection、Gate Plan、Concrete Gate Execution Contract、security/coverage/drift workflows、U8 handoff を確認した。
