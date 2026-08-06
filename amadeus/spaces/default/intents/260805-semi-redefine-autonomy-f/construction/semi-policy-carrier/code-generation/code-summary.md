# Code Summary — `semi-policy-carrier`(#2253、swarm batch 2 事後作成)

上流入力(consumes 全数): business-logic-model.md, business-rules.md, domain-entities.md, security-design.md, logical-components.md

## 着地

- ブランチ: `bolt-semi-policy-carrier`(builder worktree ブランチから ff 採用、最終 HEAD `a627277fd`)。conductor ブランチへ --no-ff 回収マージ済み(`eca5b961f`、ls-files -u 0)。
- コミット: `0316c346b` feat(autonomy): carry decision policies on the semi mode commands / `d8824b0f6` test / `9b84b4c45`・`fa07be9df` chore(tests) / `a627277fd` style(bolt)。

## 変更ファイル

`packages/framework/core/tools/amadeus-intent-autonomy-production.ts` ほか autonomy 系正本(C8 policies 搬送・C9 digest 1 定義・C10 loud ガード・C15 policyCount)/ `tests/unit/t454-semi-policy-carrier.test.ts`・`tests/integration/t455-semi-policy-cli.integration.test.ts`(新規)/ coverage 台帳(registry・allowlist selector)。

## 検証(builder 実測 exit code + conductor 統合再実測)

builder(worktree): build 0(drift なし)/ typecheck 0 / lint 0 / t454・t455 0 / complexity 0 / registry 0 / source-only 0 / full `bash tests/run-tests.sh --ci` PASS(853 files)。
conductor(マージ後統合): referee `amadeus-swarm check` converged=true / tampered=false、finalize(batch 3)converged。統合 typecheck 0 / lint 0 / full --ci は本 backfill と並行実行(結果は stage diary へ記録)。

## 申告(diary 記録済み — レビュー観点として引き継ぎ)

- `SEMI_POLICY_SCOPE_ID = "intent"` の導出(FD に明示逐語なし — 実装時導出)。
- `policies: []` の 6 呼び出し面への追加(既存呼び出し互換のためのシグネチャ伝播)。
- t455 の Red 非先行(実装後固定 — TDD 逸脱の申告)。
