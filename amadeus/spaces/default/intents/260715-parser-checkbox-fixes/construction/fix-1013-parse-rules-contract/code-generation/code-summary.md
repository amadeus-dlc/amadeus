# Code Summary — fix-1013-parse-rules-contract

- PR: https://github.com/amadeus-dlc/amadeus/pull/1037(bolt/fix-1013-parse-rules-contract、Refs #1013)
- 逸脱: なし(FR-1/2/5/6 準拠、builder 申告+conductor 検分)

## 変更(13 files)

- 正本 `packages/framework/core/tools/amadeus-state.ts`: ローカル parseRules → exported 純関数 `parseRuleLines` / `validateRuleLines` / `parseRuleSectionsOrFail`。契約検証は write 前(アトミック)、違反時は既存 `fail()`(PRACTICES_OVERRIDE emit+exit 非0)再利用、全違反収集。
- self-install(.claude/.codex)+ dist 5ツリー同期(opencode 含む)。
- テスト: unit seam(純関数全分岐)+ integration(spawn exit code/無書き込み+in-process 配線)。coverage registry 再生成+EXPECTED_NONE_TO_CLI 追記。

## 落ちる実証(実測記録)

修正前実装に対し integration falling test 先行実行 → 散文行(F)・節不一致(G)が `Expected: not 0 / Received: 0` で **RED**(1 pass 2 fail)。修正後 GREEN。バレット受理(H)は両状態 pass(対照)。

## 検証(全 exit 0)

typecheck / lint / dist:check / promote:self:check / complexity-gate(CCN 26 維持)/ coverage-registry --check / 関連テスト110件。push 前 lcov: 追加行 DA:0 ゼロ。

## 実装中の是正2件(fix-diff-independent-reverify 実践)

1. TDZ: キーワード表のモジュール定数が `if (import.meta.main) main()`(:453)より後方宣言(:2451)で CLI 起動時 TDZ エラー → validateRuleLines 内ローカル定数へ移動(実測検知→是正→再検証)。
2. base advance: 着手中に main 前進(d6b489772→5aee0328e、opencode 追加)→ rebase+全ツリー再生成+全ゲート再実行で green 再確認(base-advance-regrounding)。

## 要判断(PR 本文に明記、Issue #1039 起票済み)

`dist/opencode/.opencode/tools/amadeus-settings.ts` の既存ドリフト(#1030×#1032 クロスマージ、main dist:check 赤)を全ツリー再生成が機械是正として同梱 — (a) 同梱のまま / (b) 別 PR 先行、は E-PB4 で裁定。
