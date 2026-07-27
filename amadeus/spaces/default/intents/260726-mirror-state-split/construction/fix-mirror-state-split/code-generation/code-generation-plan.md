# Code Generation Plan — fix-mirror-state-split(Issue #1547 + #1534)

上流入力(consumes 全数): requirements.md(inception/requirements-analysis — FR-1〜FR-7 / NFR-1〜3 / 制約。本 plan の全 Step の導出元)。units-generation は本スコープ SKIP のため unit 系 consumes は不在(degrade 様式 — cid:code-generation:degrade-scope-unit-dir-layout)。

## 実装環境

- 実装は専用 git worktree(`.claude/worktrees/mirror-state-split`、ブランチ `fix/1547-1534-mirror-read-unification`、base `origin/main`)で行う(cid:code-generation:solo-bolt-worktree-required)
- Bolt 1本(bugfix、walking-skeleton off)。PR は code+tests+dist 同期のみ。record はこのチェックポイントコミット経由

## Steps(regression-first 順序)

1. **Red の固定(FR-5)**: 新規 integration テスト(t232 の DI シーム様式 `main(argv, projectDir, run, runLifecycle)` に倣うが、runLifecycle は stub でなく実 lifecycle+gateway 層 stub)で3ケースを書く:
   (1) real-create → v1 ブロック永続化 → `status` が issueNumber を認識し mirror-missing を報告しない
   (2) 同 record への再 create が `mirror already exists: #<N>` で拒否される
   (3) v1 不在 / `issueNumber:null` の record は従来どおり mirror-missing(負の対照)
   現行コードで (1)(2) が赤・(3) が緑であることをログ実文+lcov DA で確認してから修正に入る
2. **FR-1**: `amadeus-mirror.ts` `buildSnapshot`(:169 の `getField(stateContent, "Mirror Issue")`)を v1 権威へ — `parseMirrorStateDocument`(codec)/ `readMirrorState`(state-store)から `issueNumber` を導出。exit code 契約(:282-286)と findings 語彙は不変
3. **FR-2**: `amadeus-orchestrate.ts:314` / `:3522` の `hasMirrorIssue` 判定を v1 権威へ。読取ロジックは codec 側の単一ヘルパー(canonical 1定義)から導出し、orchestrate に parse を複製しない
4. **FR-3**: 実 mutation 経路(`runLegacyMutation` — 名称は誤誘導のため `runMutation` 等へ是正可)の create に v1 issueNumber の事前ガードを追加し、`mirror already exists: #<N> (duplicate create is refused; run sync instead)` で exit 非0 拒否。lifecycle の provenance 検証へ到達させない
5. **FR-4**: デッドコード削除 — `handleCreate`(:379)/`handleSync`(:425)/`handleClose`(:450)/`writeMirrorIssueField`(:363)と、これらのみが使う legacy ヘルパー。t232 の legacy 直呼びテスト・legacy field seed(`makeWorkspace` :61)は v1 seed / 実挙動テストへ置換。`amadeus-worktree.ts:249` の同名 `handleCreate` は別物 — 触らない
6. **FR-2 受け入れ検証**: `getField(stateContent, "Mirror Issue")` 系読取の repo 正本 0 hit を grep 実測(実装時第3再列挙)
7. **FR-7**: 「Mirror Issue」語彙の repo 全域 grep(docs/ + knowledge + skill + 配布面)棚卸し → per-file 更新要否を code-summary.md に転記し、要更新の docs を同一変更で更新
8. **NFR-1 配布同期**: `bun scripts/package.ts` → `bun run promote:self` → `bun run dist:check` / `bun run promote:self:check` グリーン
9. **NFR-2 検証**: `bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci` グリーン+ローカル lcov で diff 追加行未カバー 0(spawn 盲点は in-process seam で回避 — cid:requirements-analysis:bun-coverage-spawn-blindspot)
10. **code-summary.md** 作成(変更ファイル一覧・検証コマンド実 exit code・FR 対応表・FR-7 棚卸し表)

## 制約(requirements より)

- lifecycle スタック(write 側)は無変更。新 verb・互換シム・二重表現の導入禁止
- 逸脱(要件・plan と実装が合わない発見)は実装せず停止して conductor へ報告(既存様式への準拠と判断する場合も停止対象)
- 検証はフォアグラウンド同期で完遂し、モニタ/バックグラウンド待ちでターンを終えない

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T17:00:32Z
- **Iteration:** 1
- **Scope decision:** none

FR-1〜7・NFR-1〜3 は実 diff・grep・テスト実行で全数検証でき、無申告逸脱・互換シム・検証劇場のいずれも検出しなかった。Minor 1件(code-summary の 52→53 tests 表記)は conductor が再実測のうえ是正済み。allowlist 再ピンは行シフト機械検算+全エントリの reason×現行行の直読一致を確認。

### Findings

- [Minor/是正済み] code-summary.md の「52 tests」は実測 53 tests(Ran 53 tests across 4 files)— conductor が集計コマンド出力転記で是正
