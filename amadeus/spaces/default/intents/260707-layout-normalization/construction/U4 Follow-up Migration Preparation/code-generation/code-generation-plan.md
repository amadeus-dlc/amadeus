# Code Generation Plan — U4 Follow-Up Migration Preparation

## Plan

- [x] Step 1: U4 functional design の follow-up entities と migration seam rules を確認する。
- [x] Step 2: `docs/reference/18-workspace-layout.md` に Potential Follow-Up Slices を追加する。
- [x] Step 3: source root abstraction, test fixture abstraction, manifest contract seam, documentation compatibility update を future migration slice として記録する。
- [x] Step 4: 各 slice に goal, non-goal, target areas, guard commands を含める。
- [x] Step 5: Test files は追加しない。U4 は future work documentation unit であり runtime behavior を変更しないため。
- [x] Step 6: Test configuration は追加しない。

## Traceability

- FR-5 migration/no-migration support: Step 2-4。
- NFR-3 reversibility: Step 3-4。
- `packages/setup` sibling dependency boundary: retained by not adding setup implementation tasks。

## Scope Note

U4 は future migration の入口を記録するだけであり、full workspace normalization をこの intent の必須実装にはしない。
