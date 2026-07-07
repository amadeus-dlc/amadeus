# Unit Of Work Story Map

## Upstream Trace

User Stories stage は skip されているため、この story map は `requirements` の FR/NFR と `decisions` の ADR を unit に対応付ける。`components`, `component-methods`, `services`, `component-dependency` は unit boundary の根拠として扱う。

## Requirement Mapping

| Requirement / Decision | Unit |
| --- | --- |
| FR-1 layout candidates must be compared | U1 Layout Decision Record |
| FR-2 path impact inventory must be traceable | U1 Layout Decision Record, U2 Contributor Documentation Update |
| FR-3 release and drift guards must be preserved | U3 Guard Validation Plan |
| FR-4 `packages/setup` must remain sibling intent dependency | U1 Layout Decision Record, U2 Contributor Documentation Update |
| FR-5 migration/no-migration support | U1 Layout Decision Record, U4 Follow-up Migration Preparation |
| FR-6 documentation impact must be explicit | U2 Contributor Documentation Update |
| NFR-1 maintainability | U1 Layout Decision Record, U2 Contributor Documentation Update |
| NFR-2 testability | U3 Guard Validation Plan |
| NFR-3 reversibility | U1 Layout Decision Record, U4 Follow-up Migration Preparation |
| NFR-4 safety | U3 Guard Validation Plan |
| ADR-001 staged mixed layout recommendation | U1 Layout Decision Record |
| ADR-002 root `dist/` public install contract | U1 Layout Decision Record, U2 Contributor Documentation Update, U3 Guard Validation Plan |
| ADR-003 manifest path contract maintained | U1 Layout Decision Record, U4 Follow-up Migration Preparation |
| ADR-004 `packages/setup` not implementation target | U1 Layout Decision Record, U2 Contributor Documentation Update |

## Coverage Verification

すべての functional requirements、non-functional requirements、主要 ADR は少なくとも1つの unit に割り当てられている。すべての unit は少なくとも1つの requirement または decision に対応している。

## Cross-Cutting Concerns

- 日本語 Markdown: U1、U2、U4 に影響する。
- `dist:check` / `promote:self:check`: U3 の中心 concern だが、U1 と U2 の記述とも整合する必要がある。
- `packages/setup` sibling dependency: U1 と U2 にまたがる。
- Future migration reversibility: U1 と U4 にまたがる。
