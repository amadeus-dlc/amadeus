# 260715-parser-checkbox-fixes 再スキャン記録

## メタデータ

| 項目 | 値 |
| --- | --- |
| Intent | `260715-parser-checkbox-fixes` |
| Repository | `amadeus` |
| Project type | Brownfield |
| 手法 | 既存 CodeKB に対する diff-refresh（cid:reverse-engineering:c1、E-L63 の base 選定2則） |
| Base commit | `cf3dc88b46a2b23bcfd71b1136632d1739cdd7e5` |
| Observed commit | `6495e03a12d9e7149c2e80b59f171a90607a2d2c` |
| 距離 | 65 commits |
| 観測日時 | 2026-07-16 |
| Focus | #1013 practices-promote parseRules の ALWAYS/NEVER 契約非検証 / #1015 scope-change checkbox 再構築の6→4状態崩落＋ヘッダ drift |
| 実施体制 | Developer code scan → Architect synthesis の直列実行（cid:reverse-engineering:c3） |

## Base 選定と到達可能性

base=`cf3dc88b46a2b23bcfd71b1136632d1739cdd7e5` はリーダーから割当済み（re-scans の全 observed のうち HEAD 祖先で距離最小=65）。本スキャンで到達可能性を再実測した:

- `git merge-base --is-ancestor cf3dc88b46a2b23bcfd71b1136632d1739cdd7e5 HEAD` → **exit 0**（祖先性確認）
- `git rev-list --count cf3dc88b46a2b23bcfd71b1136632d1739cdd7e5..HEAD` → **65**（距離）
- `git rev-parse HEAD` → `6495e03a12d9e7149c2e80b59f171a90607a2d2c`（observed 実測一致）

共有 `reverse-engineering-timestamp.md` 冒頭の「最新」ポインタは `260709-canonical-settings`（observed `e55cc25143717d84b3e7f1a543151f0b7c99b96f`）だが、`git merge-base --is-ancestor e55cc25… HEAD` は **exit 1**（非祖先 — 並行 intent の別系譜 SHA）。E-L63 の rescan-base-ancestry に従い、非祖先 observed は base 候補から除外する。共有 timestamp は repo-level freshness pointer に限り、差分 base の真実源には使用しない。

## 引用元様式との照合（citation-semantics-check）

本記録は既存 `re-scans/260713-swarm-driver-migration.md` の E-L63 様式（メタデータ表 → Base 選定と到達可能性 → 差分の焦点所見）に倣う。引用元との相違点を意図的相違として明記する:

- **相違1**: 引用元は「全 Observed commit を候補に merge-base で走査」して base を導出したが、本 intent は base をリーダー割当で受領済みのため「割当 base の到達可能性を再実測して裏取り」する形にした。到達可能性判定コマンド・exit code の記載義務は同一。
- **相違2**: 引用元の Focus は新機能（swarm driver）の**不在確認**が主眼だが、本 intent は既存欠陥2件の**現存確認**が主眼。よって「差分の焦点所見」は現行実装の欠陥現存を file:line で確定する記述にした。
- **エラー分岐の前提一致**: 両者とも「非祖先 observed の除外」「共有 timestamp を base 真実源にしない」という E-L63 の前提を共有し、この点は忠実に踏襲した。

## Source 等価性

- `.claude/tools/amadeus-{state,utility,lib}.ts` は `packages/framework/core/tools/amadeus-{state,utility,lib}.ts` と byte 同一（`diff -q` で3ファイルとも IDENTICAL 実測）。
- 編集正本は `packages/framework/core/tools/`、`.claude/tools/` は self-install コピー、`dist/<harness>/…/tools/` は build 出力。

## 差分の焦点所見

### 区間交差

`git diff --name-only cf3dc88..HEAD -- .claude/tools/ .claude/amadeus-common/ packages/framework/` の実測:

- `amadeus-utility.ts` = **変更あり**（#1015 の handleScopeChange 面。行番号シフト: 三項マーカー引用 3227→3228-3230 開始 +1、ヘッダ :3238・正本テンプレ :2748 は一致）
- `amadeus-lib.ts` = **変更あり**（CheckboxState/CHECKBOX_MAP/CHECKBOX_REVERSE 面。引用行 58/60-67/69-76 は現行値で一致）
- `amadeus-state.ts` = **区間無変更**（#1013 の :2556-2561 は base 時点と不変）
- `practices-discovery.md` = **区間無変更**（stage 契約 :101 は不変）

### #1013 現存確認

`amadeus-state.ts:2556-2561` の `parseRules` は「非空・非コメント・非見出し」フィルタのみで ALWAYS/NEVER 契約を検証しない。呼び出し元は `handlePracticesPromote` の2箇所（:2570 mandated / :2571 forbidden）のみ、export なし。observed HEAD で現存。

### #1015 現存確認

`amadeus-utility.ts:3228-3230` の三項が completed/in-progress/skipped の3状態のみ明示し、awaiting-approval/revising/pending を末尾 `[ ]` に落とす。`parseCheckboxes`（`amadeus-lib.ts:3395`）は6状態を正しく復元するため existingMap は忠実だが、再構築三項で `[?]`/`[R]` が pending に崩落。副次 drift は再構築ヘッダ :3238 の4状態表記（正本テンプレ :2748 は6状態）。observed HEAD で現存。

### 既存テスト

- #1013: `tests/integration/t75.test.ts` が practices-promote を検査するが fixture は全行 ALWAYS/NEVER 整形済みで、契約非接頭行の拒否ケースは不在 → **未カバー**。
- #1015: `tests/unit/t194-recompose.test.ts` は別関数 `handleRecompose`（marker untouched）を検査。scope-change の再構築＋`[?]`/`[R]` 保存を結合するテストは全域 grep で0件 → **未カバー**。

## Always-rerun-for-freshness の充足

区間65コミットの diff 実測（フォーカス面の変更有無 + 現行 file:line の直読）で満たした。state.ts / practices-discovery.md は区間無変更で欠陥貫通、utility.ts / lib.ts は区間変更ありだが引用行の欠陥は未修正で現存。base/observed の真実源は本 intent の `inception/reverse-engineering/scan-notes.md` および本ファイル。
