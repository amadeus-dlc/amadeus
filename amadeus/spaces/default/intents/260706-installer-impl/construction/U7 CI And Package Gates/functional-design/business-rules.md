# Business Rules — U7 CI And Package Gates

> Stage: construction / functional-design  
> Unit: U7 CI And Package Gates  
> Upstream: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `component-methods.md`, `services.md`

## Gate Requirement Rules

| Rule | Statement |
|---|---|
| BR-U7-001 | PR changed files が `packages/setup/**` を含む場合、installer gate は必須である。 |
| BR-U7-002 | installer tests、installer docs、release workflow、package metadata、installer-owned CI configuration の変更も installer-related として扱う。 |
| BR-U7-003 | installer-related でない PR は U7 package-specific gate を skip してよいが、既存の global repository gate を弱めてはならない。 |
| BR-U7-004 | U7 gate は publish、npm token 使用、GitHub Release 作成を実行してはならない。これらは U8 の手動 release workflow が所有する。 |
| BR-U7-005 | installer-related PR では package dry-run、smoke/integration、coverage registry/ratchet、typecheck、lint、`dist:check`、`promote:self:check`、dependency audit/OSV、secret scan、package metadata validation がすべて blocking である。 |
| BR-U7-006 | 各 gate は `business-logic-model.md` の Concrete Gate Execution Contract に定義された command、cwd、output artifact、exit code mapping、timeout、dependency、path condition を満たさなければならない。 |

## Package Metadata Rules

| Rule | Statement |
|---|---|
| BR-U7-010 | `@amadeus-dlc/setup` の package metadata は `name`、`bin`、`license`、`repository`、`files` allowlist を検証する。 |
| BR-U7-011 | root `package.json` は dev-only boundary として扱い、publishable installer package に変換してはならない。 |
| BR-U7-012 | package dry-run の成果物に target project runtime memory、audit、local state、不要な repo source を含めてはならない。 |
| BR-U7-013 | license metadata は repository の MIT + Apache-2.0 dual-license posture と矛盾してはならない。 |

## Test And Coverage Rules

| Rule | Statement |
|---|---|
| BR-U7-020 | U6 の fake ports/temp target fixtures を CI で使い、real GitHub や user project mutation に依存する installer test を blocking gate にしてはならない。 |
| BR-U7-021 | no-write guarantee、backup-before-copy、manifest-first upgrade、`kiro`/`kiro-ide` ambiguity、network retry、report/manifest traceability は installer integration gate の必須 coverage key である。 |
| BR-U7-022 | coverage quality floor は line coverage threshold ではなく `covers:` registry と ratchet で表現する。 |
| BR-U7-023 | registry freshness が stale、または ratchet が main branch baseline より下がった場合、CI は失敗する。 |
| BR-U7-024 | smoke test は `amadeus-setup --help`、Bun-required behavior、minimal non-interactive validation を含む。 |

## Security Rules

| Rule | Statement |
|---|---|
| BR-U7-030 | dependency audit/OSV が installer runtime または publish tooling に reachable な High/Critical vulnerability を見つけた場合、CI は失敗する。 |
| BR-U7-031 | High/Critical vulnerability の allowlist は advisory id、package、affected range、reason、owner、expiry を必須にする。 |
| BR-U7-032 | allowlist entry が失効、reason 欠落、owner 欠落、range mismatch の場合、例外として扱ってはならない。 |
| BR-U7-033 | verified secret が 1 件でも検出された場合、CI は失敗する。 |
| BR-U7-034 | dependency 追加は runtime dependency discipline として rationale を PR に残す必要がある。 |
| BR-U7-035 | dependency scanner と secret scanner は具体ツールに依存せず、`security-gate.ts` の normalized JSON schema に変換されてから blocking 判定される。 |
| BR-U7-036 | security normalized schema または allowlist schema が不正な場合、tooling failure ではなく CI failure として扱う。 |
| BR-U7-037 | secret scan report は secret value を出力してはならない。fingerprint、path、line、rule id のみを出力する。 |

## Drift Guard Rules

| Rule | Statement |
|---|---|
| BR-U7-040 | `core/` または `harness/<name>/` の変更がある場合、`dist:check` と `promote:self:check` は blocking である。 |
| BR-U7-041 | `dist/<harness>/` は generated artifact であり、CI は手編集を検出したら失敗する。 |
| BR-U7-042 | CI は drift を自動修正して commit してはならない。開発者が source regeneration と self promotion を同一変更に含める。 |

## Reporting Rules

| Rule | Statement |
|---|---|
| BR-U7-050 | gate summary は installer-related 判定、実行 gate、skip 理由、failure reason、allowlist exception を人間が読める形で出す。 |
| BR-U7-051 | failure は最初の 1 件で止めず、実行可能な gate はできるだけ完走して一括 report する。 |
| BR-U7-052 | U7 の report は release-ready を宣言しない。宣言できるのは PR gate の pass/fail と U8 handoff readiness だけである。 |

## Upstream Coverage

- `unit-of-work.md`: U7 の package validation と PR gate ownership を rule 化する。
- `unit-of-work-story-map.md`: US-010 の blocking gate を BR-U7-001 から BR-U7-052 に展開する。
- `requirements.md`: FR-016 の acceptance criteria と NFR-005 を validation/security rules に反映する。
- `components.md`: Package Check と Release Workflow Contract の boundary を package metadata rules と U8 handoff に反映する。
- `component-methods.md`: `checkPackageMetadata` の検査項目と `ReleaseWorkflowContract` の非 publish boundary を採用する。
- `services.md`: GitHub Actions PR Gates の failure behavior を reporting/security rules に反映する。
