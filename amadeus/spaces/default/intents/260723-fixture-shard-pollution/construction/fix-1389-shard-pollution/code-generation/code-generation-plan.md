# Code Generation Plan — fix-1389-shard-pollution

上流入力(consumes 全数): requirements.md(FR-1〜4/NFR-1〜4)、architecture、code-structure。

## 修正対象(FR-1 = E-FSPRA1 裁定 A: 根+増幅)

1. **根**: `packages/framework/core/tools/amadeus-orchestrate.ts` — `recordEngineError(message, projectDir?)` に projectDir 引数を追加し、argv 再抽出は引数未指定時のフォールバックへ降格。`emit()` に optional projectDir を通し、error directive を発行する各ハンドラが手持ちの pd を渡す(emitError :5879 との symmetric-pair 回復)
2. **増幅**: `packages/framework/core/tools/amadeus-lib.ts` — `_cloneId` 単一値メモ化を projectDir キーの Map へ。`_resetCloneIdForTests` は全キー clear に対称更新
3. **テスト隔離(FR-2 = 裁定 A)**: `tests/integration/t248-stage-contract-routing.test.ts` の犯人テストへ `CLAUDE_PROJECT_DIR: project` を明示(advanceInProcess :420-431 既習様式)
4. **回帰テスト(FR-3)**: `tests/integration/` に新設 — ambient fake project(state+cursor 実在)を立て、in-process error 駆動後に ambient の audit へシャードが**生成されないこと**を直接 assert。落ちる実証は fix コミット後に pre-fix 面へ checkout 限定切替で赤を実測(falling-proof-no-stash)
5. **同型サイト実測(FR-2 後段)**: t118:378 / t211(unit swarm-batch-progress):177 / t251:80,222 / t212:630 の実汚染有無を実測し、実在分を Issue 起票(修正はしない)

## 検証(NFR)

typecheck / lint / dist regen(package.ts+promote:self)/ dist:check / promote:self:check / run-tests.sh --ci / ローカル lcov diff 未カバー0 / 落ちる実証(両側: FR-1(b) は e1/e6 留保どおり単一 projectDir 挙動不変も固定)

## 留保の実装反映

- [e1/e6] _cloneId キー化の両側テスト(汚染ケース赤+単一 projectDir 経路の挙動不変 green)を FR-3 回帰テストへ含める

## 裁定追記(E-FSPCG1、2026-07-23T04:13Z 成立)

projectDir 配送は **module-scoped `_handlerProjectDir` 方式**で確定(A 承認 3-0 — emit() 引数貫通案は未到達56行超が NFR-4 patch gate と非両立の lcov 実測により不採用)。留保転記: [e1 GoA2] 実装後申告は deviation-stop-before-implement の違反実例として PM 回付(記帳済み)— builder ディスパッチ文言の停止指示を CG summary にも残す。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T04:16:36Z
- **Iteration:** 1
- **Scope decision:** none

FR-1〜4/NFR-1〜4を実測突合、3必須検証コマンドを自分でexit code再取得し全green、実装はplan/summaryと完全一致

### Findings

- None
