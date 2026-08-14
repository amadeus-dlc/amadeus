# Code Generation Plan — unit copytree-guard-boundary

**Depth**: Minimal / **Test strategy**: Comprehensive / **Unit**: copytree-guard-boundary(単一 unit、units-generation SKIP — requirements FR-1〜7 から直接スコープ)

対象: `tests/harness/tui-fixtures.ts`(5 サイト置換)+ `tests/harness/fixtures.ts`(doc コメントのみ)+ `tests/integration/t-fixtures-copy-tree-retry.integration.test.ts`(exists スタブ削除)+ 経路検証テストの追加先(既存様式に合わせ新規 or 同ファイル)。プロダクトコード非変更。

## Traceability(step → FR)

- Step 1 → FR-4(Red)/ Step 2 → FR-1, FR-2, FR-3, NFR-1 / Step 3 → FR-4(Green), NFR-2 / Step 4 → FR-7 / Step 5 → FR-6

## Steps

- [x] **Step 1: Red の確定(TDD)** — 「setupTuiProject の kiro / kiro-ide / claude-memory 系 5 コピーが copyTreeWithRetry を経由する」ことを公開 seam(モジュール spy/mock)で assert する失敗テストを追加し、現行コード(素 cpSync)で赤を実測。エラーパス伝播 1 ケース(guard throw が呼出サイトから伝播)も含める。
- [x] **Step 2: 実装** — (a) tui-fixtures.ts:170/172/177/179/188 を copyTreeWithRetry へ置換(memory 3 面は `if (existsSync(X)) copyTreeWithRetry(X, dest)` 合成形) (b) 除外 3 面(tui-fixtures :171/:178 = ENOTDIR 非リトライ、fixtures.ts :867 = seed 済み dest への merge 依存)へ帰属理由の英語 doc コメント (c) CopyTreeOps.exists(fixtures :648)・realCopyTreeOps.exists(:657)・opsRecorder の exists スタブ(テスト :29-32)を削除。
- [x] **Step 3: Green + 回帰** — Step 1 テスト緑、t-fixtures-copy-tree-retry 全緑、tui-fixtures 消費テスト(kiro/kiro-ide 系)前後緑、`git grep "ops\.exists" -- tests/harness/fixtures.ts` が :600 のみ、typecheck/lint 緑。
- [x] **Step 4: 横断検証** — `bash tests/run-tests.sh --ci` フルスイート(conductor 単独所有)。
- [x] **Step 5: (b) の enhancement Issue 起票**(FR-6)。

## 備考

- degraded input 明記: units-generation 等 SKIP — requirements と captured intent から直接スコープ。実装は本 intent 専用 worktree(branch fix-3014-copytree-guard、origin/main 起点)。
