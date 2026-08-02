# Code Summary — fix-2033-face-sync(#2033)

上流入力(consumes 全数): requirements.md(FR-1〜FR-7 の実装。functional-design / nfr-design / infrastructure-design は self-fix スコープで SKIP のため consumes_absent expected — 設計判断は requirements の AC に従った)

実装ブランチ: `fix/2033-self-scope-grid-face-sync`(base origin/main 47574fbab)。コミット3件: `0009e5fff`(t413+grid 止血)→ `862a61851`(prose 止血)→ `904c702de`(センサー拡張+manifest+テスト+投影)。conductor ツリーへ content-mirror merge 済み(approve evidence 経路 (a))。

## 実装内容(FR 対応)

| FR | 実装 | 受け入れ基準の実測 |
|---|---|---|
| FR-1 grid 止血 | 4面の self-feature 4セル(feasibility/approval-handoff/practices-discovery/nfr-requirements)を SKIP へ。formal-model-check 非追加 | 4面 EXECUTE 18→14、共有キー全セル一致(t413 (b) green) |
| FR-2 prose 止血 | self-feature/document/refactor を `.claude` 版で4面同期(self-fix は0行差で未変更) | cmp 16組 byte 一致、t413 (c) green |
| FR-3 t413 | `tests/integration/t413-self-scope-face-parity.test.ts`(3検査)。止血前 Red 実測済み(cell 4件+prose 12件) | 止血後 3/3 green(conductor 再実行でも確認) |
| FR-4 センサー値比較 | `SurfaceSnapshot<T>` ジェネリック化で body / stage cells を retain、`compareAcrossFaces`(+`compareCells`/`compareBodies`)を flatMap 直後に新設。共有 stage キーの交差集合のみ比較、**期待値定数なし**(面間一致が不変条件)。`Finding` へ `cell-mismatch`/`body-mismatch`+`stage`/`expected`/`actual` 追加 | 片面注入で cell-mismatch/body-mismatch 検出(FR-6 テスト)。実リポジトリ pass true / findings 0、実行 40ms(budget 5000ms) |
| FR-5 manifest 是正 | 「drift guards が release-blocking」→ t413 参照へ。output_schema 更新 | grep: t413 参照1件、旧文言0件。id/command/matches/advisory/timeout 不変 |
| FR-6 テスト | fixture `seedHarness` を実値 seed 化、新テスト3件(cell/body/corpus sweep) | **Red 実測ログあり**(FR-4 実装前 7 pass/2 fail → 実装後 9 pass/0 fail、scratchpad/fr6-red.log)。既存6テスト green 維持 |
| FR-7 投影同期 | dist 7ハーネス再生成+promote:self 5面投影 | dist:check exit 0 / promote:self:check exit 0(builder・conductor の両実測) |

## 閉包実証(元欠陥への貫通)

pre-fix 断面(47574fbab)の5面を scratch へ再構成して新旧センサーを対照実行(tracked 無改変):
- 旧センサー: pass true / findings 0(**欠陥を素通し** — #2033 の盲点の再現)
- 新センサー: pass false / **findings 28**(cell-mismatch 16 = 4 stage×4 face、body-mismatch 12 = 3 scope×4 face)

corpus sweep の非空虚性: 実データで共有 stage cell 128+body 16 を実比較(空回りでないことの実測)。

## 検証(exit code は実測転記)

builder 実測: typecheck 0 / lint 0 / dist:check 0 / promote:self:check 0 / complexity-gate 0 / coverage:ci 0(9962 assertions、0 failed)/ **patch-gate 0(added 107 / covered 107 / uncovered 0、allowlist 追加なし)** / project-gate 0(89.72%)/ 宣言テスト7ファイル(実在7、Ran 80 tests across 7 files、80 pass)。

conductor 裏取り(bolt worktree で再実行): t413+センサーテスト = Ran 12 tests across 2 files、0 fail / dist:check 0 / promote:self:check 0。

sensor id pin の直接実測(reviewer Minor 2 対応、conductor ツリー = mirror merge 後): `bun test tests/integration/t89.test.ts tests/integration/t93.test.ts` → **Ran 35 tests across 2 files、35 pass / 0 fail**(id pin 非破壊の直接証跡)。

## 設計選択(FR の一意未規定領域 — builder 申告、conductor 受理)

1. **body-mismatch は expected/actual を省略** — ファイル全文の載せ込みによる出力肥大を避け、harness+scope+path で特定可能とした(既存 `scope?` と同じ optional 様式)。manifest output_schema に「cell-mismatch only」を明記。FR-4 AC(findings に body-mismatch が現れる)は充足
2. **面間比較の参照面に第1面(.claude)を採用** — 値の定数化ではなく実データ由来の全等価性判定。分岐のどちら側が報告されるかのみに影響し検出可否は不変(コードコメントに明記)。t413 の prose 比較と同一イディオム

補正2件(逸脱非該当): Biome cognitive complexity 29>15 のため比較関数を分解(complexity gate blocking)/ bolt worktree に node_modules 不在のため `bun install --frozen-lockfile`(gitignored、untracked 0確認)。
