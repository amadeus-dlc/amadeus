# Build & Test Results — answer-tag-vocab-fix(Issue #1127)

> 上流入力(consumes 全数): `../answer-tag-vocab-fix/code-generation/code-generation-plan.md`、`../answer-tag-vocab-fix/code-generation/code-summary.md`。測定 ref: bolt head 66f8c885b。2026-07-17。

## ビルド検証(4コマンド・fresh)

typecheck=0 / lint=0 / dist:check=0 / promote:self:check=0(B&T 段で再実行)

## テストスイート

`bash tests/run-tests.sh --ci`(CG 段実測、bolt head): **exit 0 / RESULT: PASS** — Test files **372** / Failed files **0** / Failed assertions **0**(集計コマンド: grep 転記)。追加3テスト込みの対象2ファイル単独: 39 tests / 0 fail。

## 落ちる実証・sweep(CG 段実測の要約)

赤側 2 fail(pre-fix dist)→ 復元 green / corpus sweep 111ファイル verdict 不変 / lcov 変更行 :1151 = 39 hits

## CI(PR #1153)

typecheck-lint-drift-tests **pass 5m32s**(gh checks 実測)。Coverage Report は完走待ち — マージ承認前に leader が green を確認する前提。e1 レビュー READY(GoA 1・閉包実証)

## 判定

**PASS**(bolt head 実測)。PR 着地後の main 面は squash 同一内容につき、着地時に leader のマージ後 CI 監視で確認
