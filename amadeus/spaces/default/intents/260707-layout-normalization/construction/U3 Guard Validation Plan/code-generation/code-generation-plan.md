# Code Generation Plan — U3 Guard Validation Plan

## Plan

- [x] Step 1: U3 functional design の validation command entity と guard rules を確認する。
- [x] Step 2: `docs/reference/18-workspace-layout.md` に Validation Checklist を追加する。
- [x] Step 3: docs/design-only、packaging/manifest/path changes、self-install changes、TypeScript/test helper changes、harness runtime behavior changes の validation を分けて記録する。
- [x] Step 4: `dist:check` と `promote:self:check` を layout decision の中心 guard として保持する。
- [x] Step 5: Test files は追加しない。U3 は validation plan documentation unit であり runtime behavior を変更しないため。
- [x] Step 6: Test configuration は追加しない。

## Traceability

- FR-3 release and drift guards must be preserved: Step 2-4。
- NFR-2 testability: Step 3。
- NFR-4 safety: Step 4。

## Scope Note

Command execution itselfは Build and Test で扱う。U3 は validation plan の明文化を担当する。
