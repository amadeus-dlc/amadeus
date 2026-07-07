# Functional Design Questions — U8 Manual Release And Docs

> Stage: construction / functional-design  
> Unit: U8 Manual Release And Docs  
> Upstream: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `component-methods.md`, `services.md`, U7 functional design

## Decision

追加の人間質問は実施しない。U8 の範囲は `requirements.md` の FR-015 / FR-017、`unit-of-work.md` の U8 定義、`unit-of-work-story-map.md` の US-009 / US-011 / US-013、`component-methods.md` の `ReleaseWorkflowContract` / `DocumentationUpdateOwner`、`services.md` の npm Registry Publication で固定済みである。

## Fixed Answers

### Q1: release は自動か手動か

- [Answer]: A
- A. GitHub Actions の `workflow_dispatch` だけで実行する。push to `main` や tag push では publish しない。

### Q2: tag input が未指定の場合はどうするか

- [Answer]: A
- A. canonical repository の stable SemVer tag のうち最新を選ぶ。prerelease は明示 tag 入力時だけ許可する。

### Q3: U7 gate は U8 で再実行するか

- [Answer]: A
- A. release workflow の preflight として U7 の package metadata、package dry-run、smoke/integration、coverage registry、security、drift guard を再利用する。

### Q4: docs はどの command 名を主導線にするか

- [Answer]: A
- A. `amadeus-setup install` と `amadeus-setup upgrade` を主導線にする。`init` は書かない。

## Ambiguity Analysis

曖昧さは残っていない。`requirements.md` は manual release workflow、latest stable tag default、SBOM/provenance、post-publish verification、installer-first docs を要求している。U7 が blocking PR gates を所有し、U8 は release button、publish path、release docs、user-facing installation docs を所有する。

## Upstream Coverage

- `unit-of-work.md`: U8 の release/docs boundary と traceability を採用する。
- `unit-of-work-story-map.md`: US-009、US-011、US-013 を主対象にする。
- `requirements.md`: FR-015 と FR-017 を主契約、FR-001 / FR-002 / FR-007 / FR-016 / NFR-005 を補助契約として扱う。
- `components.md`: Release Workflow Contract と Documentation Update Owner を具体化する。
- `component-methods.md`: `buildReleaseValidationPlan`、`ReleaseWorkflowContract`、`DocumentationUpdateOwner` を workflow/docs contract として使う。
- `services.md`: npm Registry Publication と GitHub Actions PR Gates の境界を採用する。
- U7 functional design: release preflight の gate command contract を再利用する。
