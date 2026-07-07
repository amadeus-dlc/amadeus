# Unit Of Work Story Map — インストーラの実装

> Stage: units-generation / Intent: `260706-installer-impl`  
> Upstream: `application-design/components.md`, `component-methods.md`, `services.md`, `component-dependency.md`, `decisions.md`, `requirements-analysis/requirements.md`, `user-stories/stories.md`

## Story To Unit Map

| Story | Primary Unit(s) | Supporting Unit(s) | Notes |
|---|---|---|---|
| US-001: package entrypoint を起動できる | U1 Setup Package Shell | U6 Installer Test Harness, U7 CI And Package Gates | package metadata, bin, Bun/npx behavior, help startup |
| US-002: 選択 harness を導入できる | U1, U2, U3, U4, U5 | U6 | clean target install crosses source loading, planning, apply, manifest, verify |
| US-003: 対話モードで harness と target を選べる | U1, U5 | U6 | prompt adapter and parser/mode behavior |
| US-004: 非対話 install を安全に実行できる | U1, U4, U5 | U6, U7 | validation, no-write guarantees, plan output, CI coverage |
| US-005: manifest 付き導入を更新できる | U2, U3, U4, U5 | U6 | manifest-first detection, version comparison, manifest update |
| US-006: 手動コピー導入を保守的に更新できる | U3, U4, U5 | U6 | manual/unknown/partial/none/unsupported classification and conservative plan |
| US-007: changed shared file を backup 付きで更新できる | U3, U4, U5 | U6 | md5 classification, backup path, report/manifest traceability |
| US-008: stable SemVer tag から version を解決できる | U2 | U6 | tag filtering, duplicate handling, explicit prerelease/version behavior |
| US-009: 手動 release workflow で publish できる | U7, U8 | U1, U2, U6 | workflow_dispatch, latest stable tag default, package dry-run, SBOM/provenance |
| US-010: installer PR を blocking gates で検証できる | U6, U7 | U1..U5 | path-triggered gates, tests, coverage, audit/OSV, secret scan |
| US-011: README から正しい導入方法を理解できる | U8 | U1, U5, U7 | install/upgrade docs, Bun/npx caveat, manual copy no longer primary |
| US-012: network failure から再実行できる | U2 | U6 | one retry, classified error, no target modifications |
| US-013: release metadata を docs と照合できる | U8 | U7 | Could Have maintainer docs and post-publish verification |

## Unit To Story Coverage

| Unit | Stories Covered |
|---|---|
| U1 Setup Package Shell | US-001, US-002, US-003, US-004, US-009 |
| U2 Version And Distribution Source | US-002, US-005, US-008, US-009, US-012 |
| U3 Target State And Manifest | US-002, US-005, US-006, US-007 |
| U4 Operation Planning And Safety | US-002, US-004, US-005, US-006, US-007 |
| U5 Apply Verify And UX | US-002, US-003, US-004, US-005, US-006, US-007, US-011 |
| U6 Installer Test Harness | US-001, US-002, US-004, US-005, US-006, US-007, US-008, US-010, US-012 |
| U7 CI And Package Gates | US-001, US-004, US-009, US-010, US-011 |
| U8 Manual Release And Docs | US-009, US-011, US-013 |

## Cross-Cutting Story Notes

- US-002 is intentionally cross-unit because a real install path touches package startup, source loading, target snapshot, planning, apply, manifest, and verification.
- US-005, US-006, and US-007 share target/manifest/planning/apply boundaries, but they remain distinct acceptance areas for test design.
- US-009 and US-010 connect runtime package correctness to release readiness; they are not runtime features, but they are Must acceptance criteria.
- US-011 depends on actual CLI behavior and release posture so docs do not drift from implementation.

## Per-Unit Story Flow

### U1 Setup Package Shell

1. Establish package metadata and bin contract for US-001.
2. Add parser/runtime validation needed by US-003 and US-004.
3. Expose package-level scripts needed by U7 for US-009 and US-010.

### U2 Version And Distribution Source

1. Implement SemVer tag resolution for US-008.
2. Add archive fetch/extract and metadata reader for US-002 and US-005.
3. Add retry/classified failure behavior for US-012.

### U3 Target State And Manifest

1. Define manifest schema/store for US-005.
2. Implement target detection and snapshot for US-006.
3. Preserve manifest-first harness detection and ambiguous `kiro`/`kiro-ide` behavior for upgrade safety.

### U4 Operation Planning And Safety

1. Build install and upgrade plans for US-002, US-005, and US-006.
2. Enforce non-interactive, `--yes`, `--force`, collision, backup, and no-write policies for US-004 and US-007.
3. Keep plan/report/apply traceability explicit for NFR-002 and NFR-003.

### U5 Apply Verify And UX

1. Apply approved plans and write backups for US-002 and US-007.
2. Write manifest after successful apply and classify manifest write failures for US-005.
3. Render plan/result/error output and run verification for US-002, US-003, US-004, and US-011.

### U6 Installer Test Harness

1. Add fake ports and temp target fixtures for U1..U5.
2. Cover no-write guarantees, network retry, target states, backup names, and manifest-first upgrade.
3. Produce commands and outputs consumed by U7.

### U7 CI And Package Gates

1. Detect installer-related PR changes for US-010.
2. Wire package dry-run, smoke/integration, typecheck/lint, coverage/ratchet, dist/promote, audit/OSV, and secret scan gates.
3. Provide release prerequisites consumed by U8.

### U8 Manual Release And Docs

1. Add workflow_dispatch release path for US-009.
2. Document package metadata and release verification for US-013.
3. Update README/setup docs for US-011, including Bun requirement, best-effort `npx`, `install`, and `upgrade`.

## Coverage Verification

- Every Must story US-001 through US-012 is assigned to at least one primary unit.
- Could Have story US-013 is assigned to U8 because release docs can be handled without changing runtime boundaries.
- Every unit U1 through U8 has at least one mapped story.
- No Won't Have story is assigned to a unit.

