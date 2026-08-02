# Code Generation Plan — fix-2033-face-sync

上流入力(consumes 全数): requirements.md(FR-1〜FR-7。functional-design / nfr-design / infrastructure-design は self-fix スコープで SKIP のため consumes_absent expected — 設計判断は requirements の AC と RE の挿入点表で代替)

実装ブランチ: `fix/2033-self-scope-grid-face-sync`(base origin/main 47574fbab)。既存 WIP @ 0009e5fff = Step 1-2 完了済み(t413 Red 実測 → grid 4セル同期)。実装は専用 worktree で行う(solo-bolt-worktree-required)。

## Steps

- [x] Step 1: t413 parity テスト作成+止血前 Red 実測(FR-3 — cell 乖離4件+prose 12ファイル検出済み、コミット 0009e5fff)
- [x] Step 2: grid 止血 — 4面の self-feature 4セルを SKIP へ(FR-1、formal-model-check 非追加、コミット 0009e5fff)
- [ ] Step 3: prose 止血 — amadeus-self-{feature,document,refactor}.md を .claude 版で4面へ同期(FR-2)。t413 全面 green を確認
- [ ] Step 4: センサーテストの Red 先行(FR-6/TDD) — 既存 fixture `seedHarness` を実値 seed へ更新し、片面セル注入で `cell-mismatch`・片面 prose 注入で `body-mismatch` を expect する新テスト2件を追加 → 現行実装で Red を実測
- [ ] Step 5: センサー値比較拡張(FR-4) — 正本 amadeus-sensor-self-scope-consistency.ts: readGridScopes で stages retain、inspectScopeFile で本文 retain、evaluateSelfScopeConsistency の flatMap 後に cross-face 比較新設(共有キー交差、期待値定数なし)、Finding 型へ cell-mismatch/body-mismatch+stage/expected/actual 追加 → Step 4 のテストが Green
- [ ] Step 6: corpus sweep テスト(FR-6) — 実リポジトリ5面へセンサー適用で findings 0 / pass true
- [ ] Step 7: manifest 是正(FR-5) — output_schema 更新+:37-38 の blocking 記述を t413 へ是正
- [ ] Step 8: 投影同期(FR-7) — `bun scripts/package.ts` → `bun run promote:self` → dist:check / promote:self:check green
- [ ] Step 9: 検証一式 — typecheck / lint / 対象テスト(t413・センサーテスト・t89・t93・t370)/ `bash tests/run-tests.sh --ci` 相当の関連層 / push 前 lcov で diff 追加行の未カバー 0 実測(local-lcov-pre-push)
- [ ] Step 10: bolt ブランチへコミット(英語メッセージ)・報告

## Test files(Minimal strategy — requirement-driven)

- `tests/integration/t413-self-scope-face-parity.test.ts`(FR-3、既存 WIP)
- `tests/integration/t-self-scope-consistency-sensor.test.ts`(FR-6 — fixture 実値化+cell-mismatch/body-mismatch/corpus sweep 追加)

## 逸脱時の扱い

要件・既存様式からの逸脱に気づいたら実装前に停止して conductor へ報告する(既存様式準拠と判断する場合も停止対象 — deviation-applicability-not-solo)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T11:44:25Z
- **Iteration:** 1
- **Scope decision:** none

FR-1〜FR-7 は plan Step 1〜10 と code-summary の実測表で過不足なく突合。落ちる実証(FR-6 Red→Green)と閉包実証(pre-fix 断面 findings 28 vs 旧 0)は実行結果由来、patch-gate 107/107・各 gate の exit code は実測転記。設計選択2件は FR-4 の第2正本禁止に抵触しない。

### Findings

- [Minor] body-mismatch の expected/actual 未充填 — optional 様式・出力肥大回避の理由と conductor 受理記載あり、FR-4 AC は充足のため非ブロッキング
- [Minor] t89/t93 の個別 pass 件数が集計値からの間接確認 — 是正済み: conductor が直接実行し 35 pass / 0 fail を code-summary へ転記
