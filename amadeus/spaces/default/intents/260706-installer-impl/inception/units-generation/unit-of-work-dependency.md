# Unit Of Work Dependency — インストーラの実装

> Stage: units-generation / Intent: `260706-installer-impl`  
> Upstream: `application-design/components.md`, `component-methods.md`, `services.md`, `component-dependency.md`, `decisions.md`, `requirements-analysis/requirements.md`, `user-stories/stories.md`

## Dependency DAG

This artifact describes topology only. It does not choose a delivery sequence, recommended build order, or critical path. Stage 2.8 Delivery Planning will choose the economic path through this DAG.

```yaml
units:
  - name: U1 Setup Package Shell
    depends_on: []
  - name: U2 Version And Distribution Source
    depends_on: [U1 Setup Package Shell]
  - name: U3 Target State And Manifest
    depends_on: [U1 Setup Package Shell]
  - name: U4 Operation Planning And Safety
    depends_on: [U2 Version And Distribution Source, U3 Target State And Manifest]
  - name: U5 Apply Verify And UX
    depends_on: [U4 Operation Planning And Safety]
  - name: U6 Installer Test Harness
    depends_on: [U1 Setup Package Shell, U2 Version And Distribution Source, U3 Target State And Manifest, U4 Operation Planning And Safety, U5 Apply Verify And UX]
  - name: U7 CI And Package Gates
    depends_on: [U6 Installer Test Harness]
  - name: U8 Manual Release And Docs
    depends_on: [U5 Apply Verify And UX, U7 CI And Package Gates]
```

## Dependency Rationale

| Unit | Direct Dependencies | Rationale |
|---|---|---|
| U1 Setup Package Shell | none | Package metadata, bin, runtime startup, and parser are foundational and do not need downstream behavior. |
| U2 Version And Distribution Source | U1 | Resolver and archive loading need command/runtime scaffolding and supported harness grammar. |
| U3 Target State And Manifest | U1 | Detection and manifest contracts need package types and command/runtime scaffolding but do not need source archives. |
| U4 Operation Planning And Safety | U2, U3 | Planner needs source metadata from U2 and target/manifest/snapshot state from U3. |
| U5 Apply Verify And UX | U4 | Applier, reporter, prompts, manifest write-after-apply, and verification execute an approved plan. |
| U6 Installer Test Harness | U1, U2, U3, U4, U5 | The test harness spans package, resolver, detection, planning, apply, verification, and non-interactive behavior. |
| U7 CI And Package Gates | U6 | CI gates need deterministic tests and smoke fixtures before becoming blocking. |
| U8 Manual Release And Docs | U5, U7 | User docs depend on real CLI behavior; release workflow depends on package gates and publish validation. |

## Integration Points

| Producer | Consumer | Contract |
|---|---|---|
| U1 | U2, U3, U4, U5 | `SetupCommand`, `Harness`, command grammar, package metadata, runtime entrypoint |
| U2 | U4 | `ResolvedVersion`, `LoadedDistribution`, `DistributionFile[]`, archive/source errors |
| U3 | U4, U5 | `InstallerManifest`, `TargetDetection`, `TargetSnapshot`, manifest store contract |
| U4 | U5 | `FileOperationPlan`, backup operations, no-write reason, force/conflict classification |
| U5 | U6 | executable install/upgrade flows, plain-text reports, verification outcomes |
| U6 | U7 | test commands, smoke fixtures, coverage outputs, negative-case fixtures |
| U7 | U8 | package validation gates, dry-run output, release prerequisites |

## Parallel Development Opportunities

- `U2 Version And Distribution Source` and `U3 Target State And Manifest` can be developed in parallel after `U1 Setup Package Shell` because source archive loading and target detection share only common command/types.
- Documentation drafting in `U8 Manual Release And Docs` can begin from accepted contracts, but final user-facing README content depends on `U5` behavior and `U7` release gates being concrete.
- `U6 Installer Test Harness` can add fixtures incrementally as each upstream unit lands, but the unit is considered complete only when it covers U1 through U5.

## Coupling Constraints

- U2 must not write target files.
- U3 must not download archives or apply changes.
- U4 must not call filesystem/network/prompt APIs directly except through snapshots and metadata value objects.
- U5 must not recompute planning policy while applying.
- U7 must not publish packages; publication belongs to U8.
- U8 must not bypass U7 gates for production publication.

