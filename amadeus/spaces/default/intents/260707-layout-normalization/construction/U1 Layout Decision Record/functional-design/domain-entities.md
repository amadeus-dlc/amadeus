# Domain Entities — U1 Layout Decision Record

## Upstream Trace

この entity 定義は `unit-of-work`, `unit-of-work-story-map`, `requirements`, `components`, `component-methods`, `services` を元に、runtime model ではなく documentation-domain model として定義する。

## Entities

| Entity | Attributes | Lifecycle |
| --- | --- | --- |
| Layout Candidate | name, description, pros, cons, reversibility, guard impact | collected -> compared -> accepted/rejected |
| Path Impact Item | path, owner, risk, validation guard | inventoried -> referenced -> validated |
| Design Decision | context, decision, consequences, alternatives rejected | drafted -> reviewed -> approved |
| Sibling Dependency | name, owning intent, coordination note | identified -> bounded -> referenced |
| Guard Contract | command, purpose, pass condition | existing -> preserved -> verified |

## Relationships

- Design Decision は複数の Layout Candidate を比較する。
- Layout Candidate は複数の Path Impact Item を持つ。
- Guard Contract は Path Impact Item の risk を検証する。
- Sibling Dependency は Design Decision の scope boundary に含まれるが、implementation target にはならない。

## State Invariants

- Approved Design Decision は少なくとも1つの selected option と2つ以上の rejected alternatives を持つ。
- Guard Contract は `dist:check` と `promote:self:check` を必ず含む。
- Sibling Dependency の `packages/setup` は implementation unit に割り当てない。
