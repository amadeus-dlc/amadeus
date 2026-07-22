# Unit Test Instructions — upstream-sync-230

> 上流入力(consumes 全数): 全12ユニットの `code-generation-plan.md`、`code-summary.md`

各ユニットの `code-summary.md` に記録された新設・拡張テストの unit 層を集約する。実行は `bun test <paths>` または `bash tests/run-tests.sh --ci`(全層)。

## 本 intent の新設 unit テスト

| ファイル | 対象ユニット / 契約 |
|---|---|
| tests/unit/t248-stage-contract.test.ts | U01 — validateStageFrontmatter / normalizeUnitKind の fail-closed(FR-2 item 7、FR-6 item 18) |
| tests/unit/t249-workspace-inspection.test.ts | U06 — fake-fs pure seam(nested/submodule 分類境界、FR-3) |
| tests/unit/t250-unit-iteration-and-scope-preview.test.ts | U05 — previewScopeCost 一致・iteration 検証(FR-2 items 8-9) |
| tests/unit/t-plugin-projection.test.ts | U09 — discovery/projection/drift の純関数面(FR-6 item 19) |
| tests/unit/t252-plugin-composition.test.ts | U10 — inspect/plan/apply/drop の atomicity・no-clobber(FR-6 item 20) |

既存の拡張: t113(next_stage 投影、U03)、t62/t64/t186(既定互換、U01/U05)。ポリシー: 純関数層のみを unit に置き、実 FS を触る検証は integration 層(fs-tests-integration-first)。

## 実行と判定

- 実行: `bun test <上表の paths>`(実行前に path 実在を機械確認し、runner の「Ran ... across M files」と期待ファイル数を照合する — test-path-set-completeness)。
- 判定: 0 fail を green とし、赤は失敗 assertion の実文まで読んで帰属してから対処する。
