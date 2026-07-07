# NFR Requirements Questions — U8 Manual Release And Docs

> Stage: construction / nfr-requirements  
> Unit: U8 Manual Release And Docs  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Decision

U8 では追加の人間質問を実施しない。

## Rationale

- `business-logic-model.md` が manual release workflow、workflow inputs、tag selection、release preflight、publish guard、post-publish verification、documentation workflow を定義している。
- `business-rules.md` が trigger、tag/version、validation/publish、documentation、release metadata の rules を定義している。
- `requirements.md` の FR-015 と FR-017 が docs と manual release workflow の acceptance を固定している。
- `technology-stack.md` が GitHub Actions、Bun/TypeScript、package layout、既存 CI baseline を固定している。

## Resolved Questions

| Question | Answer |
|---|---|
| Should normal `main` merge publish the installer? | No. Publish is allowed only from `workflow_dispatch` release workflow. |
| Should omitted tag use GitHub Release ordering? | No. Omitted tag resolves to latest stable SemVer tag from canonical repository tags. |
| Should release context use U7 changed-file detection? | No. U7 gates that affect publish correctness are required unconditionally in release context. |
| Should dry-run publish? | No. `dry_run:true` produces validation summary and exits without npm publish. |
| Should docs mention `init` as alias? | No. Docs must use `install` and `upgrade`; `init` is not a first-release command or alias. |

