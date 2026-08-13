# Requirements Analysis — 質問(intent 260813-advisory-requestion-fix)

Intent autonomy: `full`(grant `intent-grant-78ba2e85390af36885925d7a89232404`)。本ファイルの質問は人間へ直接提示せず、`amadeus-bolt decide-question` の autonomy ladder で裁定する(project.md cid:scope-definition:c1-semi-ladder-routing)。fail-closed の結果のみ人間へ回す。

承認: full autonomy ladder による AUTO_DECIDED 3件(Q1 `auto-decision-346b7914ac168eda07126490ee398b3a` 2026-08-13T13:09:11Z / Q2 `auto-decision-924ccbbc7eddf8a6936be0e4009555e7` 2026-08-13T13:09:13Z / Q3 `auto-decision-3566bbaa4788aed9f0d21a7a6fb1ecc4` 2026-08-13T13:09:18Z、audit `amadeus.intent_autonomy.transaction.committed` 行より転記)。

質問の由来: Issue #2967 の完了条件と、クロスレビュー2名(run `xrev-2967-20260813`、いずれも CONFIRMED_WITH_REFINEMENTS)の refinement。Issue と承認済み成果物にある決定は再質問しない(cid:requirements-analysis:c5)— 質問は実装を阻む要件欠落(修正方式の選択)に限定。

## Q1. run-now receipt 済み advisory の実行 route の修正方式

Issue 完了条件3は「実行・handoff route を directive または同等の明示的な型付き契約で保持」と要求するが、方式が未確定。クロスレビューは、現行 schema に後継 route(`handoff_stage`、PR #2779 由来、`amadeus-directive.ts:212`)が実在し、どのハーネスも未消費である(双方向 drift)ことを実測した。また既存テスト4箇所(t458:200-206 / t528:134 / t526:100 / boundaries:674)が「run-now は hold を解除しない(解除は plugin evaluator の no-hold のみ)」を pin している。

A. **宣言駆動 `handoff_stage` へ一本化** — receipt 済み(run-now)advisory の hold は ladder・人間へ再提示せず、engine が handoff 実行を指示する型付き contract(既存 `handoff_stage` の消費)として emit する。skill 正本8面の `run_required`/`formal_checks` 記述を現行 `handoff_stage` 契約へ置換。「run-now は hold を解除しない」既存契約は維持。
B. PR #2890 以前の `run_required`/`formal_checks` 型付き route を復活する(削除された型と写像を戻す)。
C. receipt 済み hold を guard 段で `allow` にする(hold 自体を解除)。
D. 再提示だけを止める(receipt 済みなら await-advisory-choice を出さず元 directive を返す)— 実行 route は設けない。
X. Other (please specify)

[Answer]: A — AUTO_DECIDED(ladder, decisionId auto-decision-346b7914ac168eda07126490ee398b3a; recommendation 採用、loud degradation 記録)。根拠: B は要求されない旧 API の復活(org.md Forbidden: 不要な後方互換の再導入)で #2890 の宣言駆動設計へ逆行。C は pin 済み既存契約(run-now は hold を解除しない)の変更 = 仕様変更でユーザー専権。D は unattended run が formal check を実行しないまま前進し #2318 の意図(advisory を実行して解消)を満たさない。A のみ既存契約を保ちつつ AC1-4/7 を同時に満たす。

## Q2. 再提示禁止の回帰テスト範囲

Issue 完了条件5-6 は full/semi の統合テストと再提示禁止の回帰固定を要求。クロスレビュー(reviewer-2)は、機序の発現範囲が autonomy モード非依存(human-turn provenance の run-now receipt でも同じ再提示が起きる)であることを指摘した。

A. **AC どおり full/semi 統合テスト + guard 段の再提示禁止はモード非依存で固定**(human-turn receipt の gated 経路も回帰に含める)。
B. full/semi の2モードのみに閉じる(AC の字義どおり)。
X. Other (please specify)

[Answer]: A — AUTO_DECIDED(ladder, decisionId auto-decision-924ccbbc7eddf8a6936be0e4009555e7; recommendation 採用、loud degradation 記録)。根拠: 患部(`applyPendingAdvisoryGuard` → `resolveRunRequiredHold`)はモードを見ない単一経路であり、gated 経路を除外すると同一欠陥の半面が未固定のまま残る(cid:build-and-test:no-silent-scope-narrowing の精神)。

## Q3. ハーネス契約 drift の機械検査(恒久ガード)を本 intent に含めるか

クロスレビュー(reviewer-2)は `git grep 'run_required|formal_checks' -- tests/ docs/` = 0 hit(exit 1)を実測し、「engine が emit しないフィールドを skill 正本が消費していないこと」の機械検査が存在しないため、完了条件7を満たしても同種 drift の再発を止められないと指摘した。

A. **本 intent では含めない** — AC7(今回の不整合の解消)までを本 intent で行い、恒久ガードは別 Issue として起票して follow-up する。
B. 本 intent に機械検査(テスト or CI ゲート)まで含める。
X. Other (please specify)

[Answer]: A — AUTO_DECIDED(ladder, decisionId auto-decision-3566bbaa4788aed9f0d21a7a6fb1ecc4; recommendation 採用、loud degradation 記録)。根拠: self-fix スコープは「限定的な是正」(project.md Scope Overrides)であり、汎用 drift ガードの新設は新機構の導入(inception.md: 新規機構は既存で代替できない根拠がある場合のみ)＋検査述語の設計判断を伴うスコープ拡張。別 Issue 起票で P2 相当の follow-up とする。ただし本 intent の回帰テストは「skill 正本8面に `run_required`/`formal_checks` が残存しないこと」を今回の患部に限って固定してよい(AC7 の検証)。
