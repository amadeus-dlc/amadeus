# Code Summary — fix-2913-proof-receipt

上流入力(consumes 全数): requirements.md(FR-1〜7 の逐語 AC)。code-generation-plan.md の Step 1〜7 を TDD で実施した。

- unit: `fix-2913-proof-receipt` / branch: `fix/2913-tla-authoring-proof-receipt`(base = origin/main `854692fd7`)
- 実装者: amadeus-builder-agent(worktree 直実装)/ conductor 検分・再検証済み
- 一次レポート: scratch `cg2913-builder-report.md`(builder 実測の逐語)

## 変更面(git diff --stat 854692fd7..e05698c5e)

- `plugins/formal-model-check/tools/tla-model-receipt.ts` +124/-: 第3の receipt 種別 `RefereeTlaModelReceipt`(schema `amadeus.referee-tla-model-receipt.v1`)を判別 union へ追加。self-contained 検証枝(model-map 非参照、byte identities+vocabulary の exact shape 検証)
- `plugins/formal-model-check/tools/tla-referee-toolchain.ts` +70/-: identity 計算を decoded string 形へ統一(D2/FR-2)、referee receipt 構築子(この面のみ — FR-4 非漏出)、model name 不一致の準備段 fail-closed 追加
- `plugins/formal-model-check/tools/fs-tlc-toolchain.ts` +26/-: 準備段の受理分岐(`verifyPlannedModelSources` の明示分岐 — bytes を持たないメンバは型から落とす)
- `plugins/formal-model-check/tools/tlc-toolchain.ts` +8/-: 出力解析段の受理(FR-6 — 判別サイト6箇所を `isSourceBoundTlaModelReceipt` へ切替、verified 受理集合は不変)
- テスト: `tests/unit/t534-tla-referee-receipt-identity.test.ts`(FR-2)、`tests/integration/t535-tla-referee-model-receipt.integration.test.ts`(FR-1/4/5/6 の TLC 非依存面 — 日常 CI 対象)、`tests/formal-verif/tla-referee-real-toolchain.test.ts`(実TLC 統合 — 専用実行面、Q1=A)

## コミット

1. `1c1f0de90` fix: hash referee source identities as decoded text(FR-2、Red→Green)
2. `1060b2a80` test: pin the referee receipt contract before it exists(FR-7 対角の red 先行コミット)
3. `ca79e7a45` fix: give the referee a self-contained model receipt(FR-1/4/5/6)
4. `e05698c5e` docs: name the receipt the referee now hands the toolchain

## FR 充足(builder 実測 → conductor 再実測)

- FR-1 ✅ 未登録 Counter の baseline/falling/vacuity 全 run が TLC 完走(`MODEL_RECEIPT` 消滅)
- FR-2 ✅ decoded string 形へ統一、互換分岐なし(t534)
- FR-3 ✅ 登録済み MirrorLifecycle(+Core 補助)が referee 経路を通過 — D2 修正の陽性対照
- FR-4 ✅ `validateVerifiedTlaModelReceipt` 無変更、既存ピン 90 pass 維持、t535 が構築子非公開を plugin tools 全走査で機械検査
- FR-5 ✅ byte 照合維持+name 不一致 fail-closed。落ちる実証3系(I1 identity 比較無効化 → 3 fail / I2 name 検査無効化 → 1 fail / I3 aux guard 無効化 → 1 fail)、復元後残渣0(porcelain 空・diff 空・マーカー grep 0)
- FR-6 ✅ 準備段+出力解析段の両受理(片側修正の失敗段移動なし)
- FR-7 ✅ 対角実測: 修正前(854692fd7)= exit 1・逐語 `PreparationError/MODEL_RECEIPT: verified model is unavailable: Counter` ×3 run / 修正後 = MODEL_RECEIPT 消滅、新規 formal-verif テスト exit 0(7 pass)

## 検証(exit code 実測)

| コマンド | builder | conductor 再実測 |
|---|---|---|
| `bun run typecheck` | 0 | 0 |
| `bun run lint` | 0 | 0 |
| t534+t535 | 0(16 pass) | 0(16 pass) |
| 影響34ファイル(述語: grep -rl "tla-model-receipt\|fs-tlc-toolchain\|tlc-toolchain\|tla-referee\|run-model-check" tests/{unit,integration,e2e,smoke} +t403) | 0(359 pass/3 skip/0 fail) | — |
| `mise x java@temurin-26.0.1+8 -- bun test tests/formal-verif/tla-referee-real-toolchain.test.ts` | 0(7 pass) | — |
| フルスイート `tests/run-tests.sh --ci` | — | conductor 実行(結果は build-and-test 記録へ) |

## 申告済み逸脱・オープンポイント

1. **trace パーサの既存制約2件(#2913 と独立、未修正 — 別 Issue 起票対象)**: (a) 単一変数モデルは TLC 出力形(`ticks = 0`、先頭 `/\` なし)により parseTrace(`tlc-toolchain.ts:539`)が counterexample を必ず GRAMMAR にする (b) TLC はアルファベット順印字だが referee の `traceStateVariablesOf` は VARIABLES 宣言順を返し位置一致要求と衝突。修正後に初めて出力解析へ到達して顕在化した独立欠陥。
2. 既存 probe `tla-referee-real-toolchain-probe.ts` は単一変数モデルのため exit 1 のまま(スコープ外、新規テストが同経路をカバー)。
3. 判別サイトの guard 切替(`fs-tlc-toolchain.ts` 内6箇所: :1579/:1608/:1646/:1665/:1688/:1689、`tlc-toolchain.ts` 内3箇所: :253/:298/:598)は FR-6 充足に必須の波及対応として実施(verified 受理集合不変を既存 90 pass で確認)— 申告済み。件数の測定 ref = merge commit `71523ecaf`、述語 = `grep -n isSourceBoundTlaModelReceipt <両ファイル>` の非定義行。
4. `ModelCheckReceiptBundle` に bytes を持たないメンバを追加(null 埋めでなく型から落とし明示分岐)— parse-don't-validate 準拠の設計判断、申告済み。
