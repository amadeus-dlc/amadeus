# Code Generation Plan — fix-2352-projectdir-marker

上流入力(consumes 全数): requirements（`inception/requirements-analysis/requirements.md` — 本 unit の唯一の設計正本。self-fix scope は units-generation / functional-design 系を SKIP するため、要件から直接スコープする。unit-of-work.md の不在は scope 設計どおり = consumes_absent expected:true）

- Unit: fix-2352-projectdir-marker（degrade 単一 unit — Issue #2352）
- Test Strategy: Comprehensive（要件・リスク駆動。対象は単一関数の梯子変更 — FR-2 が定めるテスト集合が上限）
- トレーサビリティ: 全ステップは captured intent（#2352）と requirements.md FR-1/FR-2/FR-3 へ遡る（user stories は scope SKIP のため intent 直結 — この注記を code-summary.md にも引き継ぐ）

## 実装ステップ（TDD 順序）

- [x] Step 1: 新規 unit テストを作成し **Red を実測**する — `tests/unit/tNNN-resolve-project-dir-worktree-marker.test.ts`（tNNN は作成時点の tests/ 実測で採番し、PR 発行前の再接地時に再確認 — FR-2c）。正本 `packages/framework/core/tools/amadeus-lib.ts` を in-process 直 import し、repo 外 temp fixture（`mkdtempSync(TMPDIR)`、`amadeus/` + `.claude/tools/` の2ディレクトリで marker 成立）で5系を固定:
  - ケース B: cwd = worktree（marker 保有）× env UNSET → `resolveProjectDir()` が worktree root を返す（AC-1a — 実装前は main 相当を返して **FAIL することを実測**）
  - ケース C+env: cwd = worktree（marker 保有）・`CLAUDE_PROJECT_DIR`=main → worktree root（AC-1b — 実装前 FAIL 実測）
  - ケース A / C: 従来どおり（AC-1c — 実装前後とも PASS）
  - marker なし cwd: 既存4段の解決値・順序不変（AC-1d — 実装前後とも PASS）
  - explicit 引数最優先: `resolveProjectDir(explicitDir)` が marker より勝つ（AC-1f — 実装前後とも PASS）
  - 環境操作は `process.env` の save/restore で行い、`process.chdir` 使用時は afterEach で復元
- [x] Step 2: Red 実測の記録（失敗テスト名・assertion 実文・exit code を code-summary へ転記する材料として保存）
- [x] Step 3: `resolveProjectDir()`（amadeus-lib.ts:226-250）へ workspace-marker 段を実装 — 位置は explicit 段（:228）の直後・env 段（:231）の上。述語は既存 `findWorkspaceMarkerAncestor(process.cwd())`（:329-330 で hook が使う同一 canonical）を再利用。重複定義禁止。実装コメントは「env は launch dir に pin され worktree に追従しない」制約を1行（FR-1）
- [x] Step 4: Step 1 のテストが **全系 Green** になることを実測（AC-1a/1b の閉包 — ruling-premise-closure-verification）
- [x] Step 5: `tests/integration/t144-harness-seam.cli.test.ts` を新段順（explicit → cwd-marker → env → script-path → cwd harness dir）の pin へ更新（FR-2b）。既存 test 5（:134-146 の `.codex` 段4テスト）の題名・アサーションを新段構成と整合させる。`bun run build` 後に `bun test tests/integration/t144-...` で Green 実測
- [x] Step 6: stale comment 是正 — amadeus-lib.ts:6673 の `AMADEUS_PROJECT_DIR` 参照を `CLAUDE_PROJECT_DIR` の正記へ1行 reword（FR-3）。`grep -n "AMADEUS_PROJECT_DIR" packages/framework/core/tools/amadeus-lib.ts` = 0 件を実測
- [x] Step 7: hook 側不変の確認 — `bun test tests/unit/t202-... tests/integration/t296-... tests/integration/t230-...` が無改変 Green（AC-1e）
- [x] Step 8: `bun run build` で dist/self-install 再生成 → `git status` で tracked ファイル不変を確認（NFR-4）
- [x] Step 9: 検証コマンド一式 — `bun run typecheck` / `bun run lint` / 対象テスト集合（Step 1・5・7）の exit code 記録（NFR-2 のローカル面。フル CI は build-and-test 段と PR CI が担う）
- [x] Step 10: テスト設定 — 既存ランナー（tests/run-tests.sh 4層）に乗るため新規設定ファイル不要（unit 層は自動発見）。test-size 分類: 実 FS（mkdtemp）を使うため新テストの配置層を確認 — `cid:code-generation:fs-tests-integration-first` により実 FS を触るテストは integration 層が既定。**Step 1 の配置は tests/integration/ とし、in-process 直 import（lcov 有効）を維持**（in-process と層は独立の2軸）
- [x] Step 11: ドキュメント — コード内コメントのみ（FR-1 の制約1行 + FR-3 reword）。外部 docs 対象なし（Out of scope 判定済み）

## 逸脱規律

- 逸脱（既存様式への準拠と判断する場合を含む）は実装前に停止して conductor へ報告（deviation-stop-before-implement / deviation-applicability-not-solo）
- 検証は同期（フォアグラウンド）で完遂し、モニタ/バックグラウンド待ちでターンを終了しない（builder-prompt-sync-completion）
- 割当 worktree（2352-project-dir-fix）外での git 操作禁止

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T12:05:30Z
- **Iteration:** 1
- **Scope decision:** none

改訂後要件と実装記録が整合し、2件の逸脱裁定（E-PWF-CGDEV / E-PWF-CGDEV2）の系譜と全留保が code-summary に転記済み。Red/Green 実測は assertion 実文と exit code まで具体的、汚染ベクタ消滅の閉包実証は実測基盤、pr-convergence-report は converged:true/CLEAN、plan 全完了、無申告逸脱・不要な互換レイヤーなし。

### Findings

- FOLLOW-UP | code-generation-plan の「5系」と code-summary の「7ケース」の内訳対応が明記されていない — 対応表の一言があると読み手の照合が1手で済む
- FOLLOW-UP | 宣言センサーの手動発火記録はレビュースコープ外で検証不能 — conductor 側の audit 実測（SENSOR_PASSED）で担保されている前提を記録
