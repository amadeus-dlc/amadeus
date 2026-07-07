# Domain Entities — U6 Installer Test Harness

> Stage: functional-design / Unit: `U6 Installer Test Harness`  
> Upstream: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `component-methods.md`, `services.md`

## Entity Overview

U6 entities are testing support objects. They make U1-U5 contracts executable in tests without becoming installer runtime concepts.

## TestFixture

| Attribute | Rule |
|---|---|
| `name` | Stable case name. |
| `covers` | Requirement/story identifiers. |
| `sourceFixture` | Fake distribution/tag/archive setup. |
| `targetFixture` | Temp target state. |
| `command` | CLI or service invocation. |
| `expected` | Exit/result/plan/files/output assertions. |

## FakePorts

| Fake | Purpose |
|---|---|
| `FakeTagSourcePort` | deterministic tag lists and tag-list failures |
| `FakeArchiveSourcePort` | archive success, transient retry, failure |
| `FakeArchiveExtractorPort` | harness dist success/missing/invalid archive |
| `FakeFileSystemPort` | temp filesystem and controlled read/write failures |
| `FakeManifestStorePort` | manifest read/write success/failure |
| `FakePromptPort` | confirmation accept/decline and harness choices |
| `FakeClockPort` | stable backup timestamps |

## CoverageRegistryEntry

| Attribute | Rule |
|---|---|
| `testId` | Unique stable test identifier. |
| `covers` | FR/US/NFR identifiers. |
| `type` | unit / integration / smoke / snapshot. |
| `status` | expected pass/fail in current suite. |

## Relationships

```text
TestFixture
  -> FakePorts + temp target
  -> setup service / CLI
  -> FileOperationPlan + SetupResult + filesystem assertions
  -> CoverageRegistryEntry
```

## State Boundaries

- U6 fixtures live in repository tests, not user target projects.
- U6 may create temp files during tests and must clean them.
- U6 must not require npm publish credentials.
- U6 must not depend on live GitHub for routine CI.

