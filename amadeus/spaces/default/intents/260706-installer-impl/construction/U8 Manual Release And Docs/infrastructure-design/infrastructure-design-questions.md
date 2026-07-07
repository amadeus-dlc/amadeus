# Infrastructure Design Questions — U8 Manual Release And Docs

> Stage: construction / infrastructure-design  
> Unit: U8 Manual Release And Docs

## Questions

### Q1. インストーラreleaseを通常のpush、merge、tag pushで自動publishするか

[Answer]: No. release/publishはGitHub Actions `workflow_dispatch` の手動ボタンだけで起動する。通常は `tag` 未指定でlatest stable SemVer tagを選び、`dry_run:true` を既定にする。`dry_run:false` のpublishはprotected environment approvalとexactly one publish identityが確認できる場合だけ許可する。

## Ambiguity Analysis

曖昧な回答はない。ユーザー要望は「GitHub Actionからボタンを押してリリース」「通常は最新タグからリリース」であり、`business-logic-model.md` と `security-design.md` も `workflow_dispatch`、latest stable SemVer tag default、dry-run、protected environment、publish guardを要求している。

矛盾はない。`reliability-design.md` はordinary push/merge/tag pushでpublishしないこと、docsが `install` / `upgrade` を使い `init` を禁止することをinvariantにしている。Infrastructure Designはmanual release workflow、release preflight、SBOM/provenance evidence、publish validation、docs consistencyに限定する。

不足情報はない。具体的なnpm credential modeはtoken-basedまたはtrusted publishingのどちらかを後続CI/Deploymentで選べるが、real publishではexactly one modeを検証する契約を固定する。

## Upstream Coverage

- `performance-design.md`: release workflow budgets、latest stable tag selection、artifact strategyを反映する。
- `security-design.md`: manual trigger、protected environment、publish identity contract、SBOM/provenance、docs safetyを反映する。
- `scalability-design.md`: one package/one tag、20 artifacts、25 docs surfaces、500 npm metadata versionsを反映する。
- `reliability-design.md`: release state machine、determinism invariants、docs consistency、failure diagnosticsを反映する。
- `logical-components.md`: ReleaseWorkflow、ReleaseInputValidator、ReleaseTagSelector、ReleasePreflightRunner、PackageBuilder、ReleaseEvidenceGenerator、PublishValidator、PublishIdentityValidator、PublishExecutor、PostPublishVerifier、DocsConsistencyChecker、ReleaseReporterを前提にする。
- `components.md`: Release Workflow Contract と Documentation Update Owner の境界を参照する。
- `services.md`: npm Registry Publication と GitHub Actions PR Gates の関係を反映する。
- `business-logic-model.md`: Release Workflow、Workflow Inputs、Tag Selection、Release Preflight Policy、Release Validation Plan、Publish Guard、Post-Publish Verification、Documentation Workflowを反映する。
