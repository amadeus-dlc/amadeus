# Code Generation Plan — U1 Layout Decision Record

## Plan

- [x] Step 1: 既存 reference docs の構成を確認する。
- [x] Step 2: Issue #610 の decision source of truth として `docs/reference/18-workspace-layout.md` を追加する。
- [x] Step 3: design record に Context, Decision, Alternatives Considered, Path Impact, Guard Preservation, Consequences, Future Migration Trigger を含める。
- [x] Step 4: `packages/setup` を sibling package / separate intent として扱う境界を明記する。
- [x] Step 5: `dist:check` と `promote:self:check` の guard preservation を明記する。
- [x] Step 6: Test files は追加しない。U1 は documentation-only unit であり runtime behavior や testable code を追加しないため。
- [x] Step 7: Test configuration は追加しない。既存 test configuration に変更不要。

## Traceability

- FR-1 layout candidates must be compared: Step 3。
- FR-2 path impact inventory must be traceable: Step 3。
- FR-3 release and drift guards must be preserved: Step 5。
- FR-4 `packages/setup` must remain sibling intent dependency: Step 4。
- FR-5 migration/no-migration support: Step 3。
- FR-6 documentation impact must be explicit: Step 2 and later U2。

## Scope Note

U1 は design record の追加のみを行う。Reference overview や contributor docs へのリンク追加は U2 Contributor Documentation Update で扱う。
