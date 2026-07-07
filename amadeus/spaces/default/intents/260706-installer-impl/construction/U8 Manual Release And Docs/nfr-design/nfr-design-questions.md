# NFR Design Questions — U8 Manual Release And Docs

> Stage: construction / nfr-design  
> Unit: U8 Manual Release And Docs

## Questions

### Q1. U8で追加のNFR設計判断が必要か

[Answer]: No additional questions. U8のNFR RequirementsとFunctional Designで、GitHub Actions `workflow_dispatch`、latest stable SemVer tag default、`dry_run:true` default、confirm package guard、protected environment、exactly one publish identity mode、U7 release preflight、SBOM/provenance、publish validation、post-publish verification、installer-first docs が固定済みであるため、追加のユーザー判断は不要。

## Ambiguity Analysis

曖昧な回答はない。U8はmanual release workflowとdocsを所有し、ordinary push/merge/tag pushでのpublish、multi-registry publishing、multiple package publishing、organization-wide rolloutは所有しない。

矛盾はない。`performance-requirements.md` はmanual workflow validation、tag selection、preflight、publish validation、docs checkのbudgetを要求し、`security-requirements.md` はmanual authorization、protected environment、publish identity、SBOM/provenance、docs safetyを要求し、`scalability-requirements.md` はtag/docs/artifact/package growthを制限し、`reliability-requirements.md` はbutton-triggered dry-run/publish determinism と docs consistencyを要求している。`tech-stack-decisions.md` と `business-logic-model.md` はrelease workflow path、inputs、publish guard、docs workflowを定義しており、設計方針と一致する。

不足情報はない。publish identity の具体モードは CI/Deployment design に委譲されるが、U8は exactly one verified mode before publish という契約を固定する。

## Upstream Coverage

- `performance-requirements.md`: workflow input validation、tag selection、U7 preflight、dry-run/publish workflows、docs consistency budgets を確認した。
- `security-requirements.md`: manual trigger、confirm package、protected environment、publish identity、SBOM/provenance、secret-safe reporting を確認した。
- `scalability-requirements.md`: 1,000 tags、2,000 package entries、11 U7 gates、20 artifacts、25 docs files、500 npm versions を確認した。
- `reliability-requirements.md`: latest stable tag default、dry-run no-publish、publish validation、identity validation、post-publish failure、docs stale checks を確認した。
- `tech-stack-decisions.md`: GitHub Actions workflow_dispatch、release-setup.yml、Bun scripts、publish command、docs surfaces を確認した。
- `business-logic-model.md`: Release Workflow、Tag Selection、Release Preflight、Validation Plan、Publish Guard、Post-Publish Verification、Documentation Workflow を確認した。
