# Components — installer-new-harnesses(Issue #1048)

> 上流入力(consumes 全数): `../requirements-analysis/requirements.md`(FR-1〜6)、`../user-stories/stories.md`(US-1.1〜3.1)、codekb の architecture.md / component-inventory.md(RE 全数再検証済み台帳)、`../practices-discovery/team-practices.md`(既存実践)、`../refined-mockups/mockups.md`(最終出力契約)、`../reverse-engineering/scan-notes.md`。

## 変更コンポーネント(C 群 — 全て既存、構造変更なし)

| C | 実体 | 変更 |
| --- | --- | --- |
| C1 | `packages/setup/src/domain/harness.ts` | union(:9)+all(:19-24)の 4→6 値(FR-1 AC-1a) |
| C2 | `packages/setup/src/domain/engine-layout.ts` | map(:8-13)へ opencode→.opencode / cursor→.cursor の各固有 dir(AC-1b — kiro 型共有にしない) |
| C3 | `packages/setup/src/modules/reporter.ts` | renderHelp(:19-27)usage 2本+invalid(:137)の列挙文字列(AC-1c — mockups.md の verbatim) |
| C4 | 契約テスト2本(setup-harness / setup-harness-parse) | 件数・集合 literal・文言の6値化(AC-1d) |
| C5 | `tests/integration/setup-install-flow.test.ts`+`tests/lib/setup-codeload-fixture.ts` | fixture へ dist/opencode・dist/cursor エントリ追加(FR-3 AC-3a) |
| C6 | `packages/framework/core/tools/amadeus-lib.ts`(:121)+`amadeus-utility.ts`(:860) | advisory 2面の6値化(FR-6 — install 正しさと分離。core 面のため **dist 6ツリー+セルフインストール2ツリー(.claude/.codex)= 計8ミラーの regen 必須**: `bun scripts/package.ts`+`bun run promote:self` — ls dist/ 実測6+e1 RE の find 実測8コピーと整合) |
| C7 | README.md(:58-59/:109)(+README.ja.md 対訳) | docs 同期(FR-5) |

## 非変更(構造保証の層別)

- wizard/verifier/plan/applier/payload-factory: 列挙駆動の自動伝播(RE 面2 — per-harness ハードコード0の実測)につき非接触
- pack-contract・migrate・promote-self: 非接触(FR-4 前提/AC-6d)
