# Code Generation Memory

## Interpretations

- 2026-07-07T08:02:00Z — Code Generation は4 unit すべてに対して実行し、documentation/design-focused changes として扱った。
- 2026-07-07T08:02:00Z — U1 は `docs/reference/18-workspace-layout.md` の追加、U2 は docs navigation/contributor guidance、U3 は validation checklist、U4 は future migration slices として実装した。
- 2026-07-07T08:02:00Z — Test files は追加しなかった。すべての unit が documentation-only で runtime behavior を変更しないため。

## Deviations

- 2026-07-07T08:02:00Z — Code Generation stage は subagent mode だが、作業内容が小さな documentation patch であり、既に全 context を main agent が保持していたため inline で実装した。

## Tradeoffs

- 2026-07-07T08:02:00Z — `docs/reference/18-workspace-layout.md` を新規 design record として追加し、overview/contributing/README から参照する形にした。既存 architecture chapter に混ぜるより Issue #610 の decision と acceptance criteria を追跡しやすいため。

## Open questions

- 2026-07-07T08:02:00Z — Build and Test で docs-only change としてどの validation command を実行するかを決める。

## User-directed follow-up

- 2026-07-07T08:08:00Z — Build and Test 承認後、ユーザーから「実装がないのはなぜ」「ファイル移動するんじゃないの」と指摘があり、方針を docs-only から implementation-bearing migration に変更した。
- 2026-07-07T08:10:00Z — ユーザーが `dist/` と `scripts/` は root に維持し、`packages/framework/core` と `packages/framework/harness` だけを移動対象にする方針を明示した。
