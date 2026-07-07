# Code Generation Plan — U2 Contributor Documentation Update

## Plan

- [x] Step 1: README と docs/reference の repository layout 説明を確認する。
- [x] Step 2: `docs/reference/00-overview.md` に Workspace Layout Decision への chapter link を追加する。
- [x] Step 3: `docs/README.md` に root framework layout と `packages/setup` sibling package boundary の案内を追加する。
- [x] Step 4: `docs/reference/11-contributing.md` の repository structure と workflow に sibling setup package の説明を追加する。
- [x] Step 5: root `README.md` の Repository layout に `packages/setup` sibling boundary と design record link を追加する。
- [x] Step 6: Test files は追加しない。U2 は documentation-only unit であり runtime behavior を変更しないため。
- [x] Step 7: Test configuration は追加しない。

## Traceability

- FR-2 path impact inventory must be traceable: README/docs/contributing に design record link を追加。
- FR-4 `packages/setup` must remain sibling intent dependency: docs に sibling boundary を追加。
- FR-6 documentation impact must be explicit: repository layout docs を更新。

## Scope Note

U2 は docs navigation と contributor explanation のみを扱う。Generated `dist/` や source code は変更しない。
