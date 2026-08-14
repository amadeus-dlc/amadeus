# Code Generation Plan — unit t99-copytree-race

**Depth**: Minimal / **Test strategy**: Comprehensive(self-fix 既定)/ **Unit**: t99-copytree-race(単一 unit、units-generation は scope SKIP — requirements.md FR-1〜7 から直接スコープ)

対象: `tests/harness/fixtures.ts`(helper 本体)と `tests/integration/t-fixtures-copy-tree-retry.integration.test.ts` のみ(FR-5)。プロダクトコード非変更。

## Traceability(step → FR)

- Step 1 → FR-4(Red)/ Step 2 → FR-1, FR-2, FR-3, NFR-1, NFR-3 / Step 3 → FR-4(Green), NFR-2 / Step 4 → FR-7 / Step 5 → FR-6

## Steps

- [x] **Step 1: Red の確定(TDD)** — `t-fixtures-copy-tree-retry.integration.test.ts` へ dest>src 方向の count 注入テストを追加(opsRecorder シームで `count: src=10 / dest=11`、dest クリア後の attempt 2 で収束を期待する形)し、現行実装で赤(3/3 失敗)を実測する。
- [x] **Step 2: 実装** — (a) `CopyTreeOps` へ `remove(path): void` を追加(default = 既存の削除機構に合わせた冪等除去 — 非存在パスで例外を出さない。reviewer NIT 引き継ぎ) (b) `copyTreeWithRetry` の各 attempt でコピー前に `ops.remove(dest)` (c) dest-fresh 契約を doc comment に明文化(契約文言の内容照合まで行う — reviewer FOLLOW-UP) (d) count mismatch 診断へ src/dest のファイル集合差(上限件数つき)を追加。設計意図コメント(:614-616 / :716-718)は不変。timing 系語彙の新設定数なし(NFR-3)。
- [x] **Step 3: Green + 回帰確認** — Step 1 のテストが緑、既存 dest<src ケース(:107-127)が赤のまま(回帰ガード)、t-fixtures-copy-tree-retry 全体緑、t99 単独 17/17 緑。新設分岐は注入 driver で patch coverage を通す(NFR-2、allowlist 追加なし)。
- [x] **Step 4: 横断検証** — `bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci` フルスイート(テストファイル変更のため絞り込みで完了としない)。
- [x] **Step 5: follow-up 起票** — fixtures.ts:784 姉妹面・未ガード素 cpSync 面・CopyTreeOps.exists 未消費を 1 件の Issue として §14 経路で起票(FR-6)。

## 備考

- degraded input の明記: units-generation / functional-design 等は self-fix scope により SKIP — 本 plan は requirements.md と captured intent から直接スコープした。
- 実装は本 intent 専用 worktree(branch `fix-3003-t99-copytree`、origin/main 起点)で行う。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-14T05:46:22Z
- **Iteration:** 1
- **Scope decision:** none

FR-1〜FR-7・NFR-1〜3 の全項目に code-summary の検証実測が対応し、diff は対象2ファイルに閉じ、後方互換シム・無申告フォールバックの混入なし。申告済み逸脱1件は理由と受け入れ基準への非影響が明記されており妥当。

### Findings

- FOLLOW-UP | amadeus/spaces/default/intents/260814-t99-copytree-race/construction/t99-copytree-race/code-generation/code-summary.md: NFR-1 の isRetryableCopyError 分類・エラーメッセージ既存 assert 不変の直接実測記載がない — 次回検証段(build-and-test)で明示すること
- NIT | amadeus/spaces/default/intents/260814-t99-copytree-race/construction/t99-copytree-race/code-generation/code-summary.md: FR-3 の用語(ファイル集合差 vs 全 entry 名)の requirements 側更新が望ましい
