# Reliability Design — U8 Manual Release And Docs

> Stage: construction / nfr-design  
> Unit: U8 Manual Release And Docs

## Reliability Objectives

U8はmaintainerがGitHub Actions buttonを押したとき、deterministicなdry-runまたはguarded publish attemptを返す。`reliability-requirements.md` の通り、docsは `install` / `upgrade` を主導線にし、stale manual-copyや `init` instructionsをprimary pathにしない。

## Release State Machine

| State | Trigger | Result |
|---|---|---|
| input-invalid | invalid tag/dist-tag/confirm-package | fail before expensive validation and credential use |
| preflight-failed | U7 release preflight fails | fail before build/publish with per-gate reports |
| validation-failed | build/evidence/publish-validation/docs check fails | fail before publish |
| dry-run-complete | `dry_run:true` and validation passes | no publish, release validation summary |
| publish-blocked | approval/identity missing or ambiguous | no publish, guard reason |
| publish-failed | npm publish returns failure | no retry loop, summary names package/version/phase |
| published-verification-failed | publish succeeded, post-publish verification failed | workflow failure but published state visible |
| published | publish and post-publish verification succeed | release summary with evidence |

## Determinism Invariants

- workflow trigger for publish path is `workflow_dispatch` only;
- omitted tag uses stable SemVer ordering, not GitHub Release metadata;
- explicit tag must exist exactly;
- prerelease with `npm_dist_tag: latest` fails before publish;
- release preflight mode never records `installerRelated:false`;
- package version matches selected tag before publish;
- `npm publish` runs at most once;
- `cwd` for publish is `packages/setup`;
- docs use `amadeus-setup install` and `amadeus-setup upgrade`, not `init`;
- docs include `bunx`, best-effort `npx` caveat, and Bun-required wording.

## Failure Diagnostics

Every non-publish outcome states which guard blocked publish. Publish failure includes npm command phase and package/version without token values. Post-publish failure includes failed check names and published package/version. Docs consistency failure names stale file paths and expected command/package/runtime caveat text.

## Docs Consistency

Docs consistency checks cover root `README.md` and `packages/setup/README.md` first. Checks require:

- package name `@amadeus-dlc/setup`;
- bin `amadeus-setup`;
- `install` and `upgrade` examples;
- no `amadeus-setup init` or init alias;
- Bun-required statement;
- best-effort `npx` caveat;
- supported harnesses `claude`、`codex`、`kiro`、`kiro-ide`;
- one harness per invocation;
- `--yes` vs `--force`;
- backup and manifest path safety;
- GitHub Actions button release with latest stable tag default.

## Test Strategy

Fixtures cover tag selection、explicit missing tag、prerelease dist-tag failure、dry-run no publish、U7 preflight failure、existing npm version、missing/ambiguous identity、npm publish failure、post-publish verification failure、docs stale command/package/caveat checks。

## Upstream Coverage

- `performance-requirements.md`: reliability states reuse measured validation/publish/docs paths.
- `security-requirements.md`: publish guards、identity validation、secret-safe reporting、docs safety are invariants.
- `scalability-requirements.md`: state machine remains one package/one tag even as artifacts/tags/docs grow.
- `reliability-requirements.md`: targets、failure handling、determinism、portability、diagnostics を直接設計した。
- `tech-stack-decisions.md`: workflow inputs、release-preflight/publish-validation/evidence/post-publish interfaces に従う。
- `business-logic-model.md`: Release Workflow、Tag Selection、Publish Guard、Post-Publish Verification、Documentation Workflow に沿う。
