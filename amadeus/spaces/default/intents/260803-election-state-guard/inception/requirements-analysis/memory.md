<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

## Interpretations
- 2026-08-03T12:15:18Z — 質問は10問(Q1〜Q6 起草時 + Q7〜Q10 は「Issue に書いてない矛盾・抜け漏れを問え」とのユーザー指示で実測から追加)。全問ユーザー専権と判定し選挙は行わず(Q1〜Q4 = 正準リスト(4)仕様変更、Q5〜Q6 = issue-selection-user-decides)、guided モードで裁定を受領。承認 TS を questions ヘッダへ記載。
- 2026-08-03T12:15:18Z — 実測で確定した Issue #2125 の記述誤り2件: (i) `materialize` は `ledger.ballots` のみ固定し `late` を集計に入れない(`amadeus-election-store.ts:707`)ため、late 迂回の真の影響は「再審査トレイルが消える」でなく「本来除外される票が算入され集計結果が実際に変わる」 (ii) (c) の kind 順序検査は timeline 単独では実現不能 — hold から collecting へ戻る解決値3種(block:reopen / quorum-short:resume-collecting / discussion-needed:discussed)の後の再 tally は正当な2件目の tallied を生むが、timeline の kind は4種のみで state 遷移も reopen も記録されない(`amadeus-election-model.ts:175`)。裁定 Q7=A で tally.json の resolutions を verifySelf へ渡す方式に決した。
- 2026-08-03T12:15:18Z — 全選挙記録を verify する CI の不在を反証確認(A-2)。tests/ の election 系はいずれも一時ディレクトリ fixture を使い、実 `amadeus/spaces/default/elections/` を走査するのは elections.json の実在確認のみ。

## Deviations
- 2026-08-03T12:15:18Z — **reviewer 予算(上限2)消費後の残余是正を conductor 検証で受理した**。iteration 2 の Major(FR-3d の 7→9 是正が OS-5・A-2 へ未伝播)は数値の伝播漏れであり、`cid:requirements-analysis:delegated-review-analysis-with-owned-verdict` 追補(E-LSSADS13)が定める**機械検証可能クラス**(assert/機械再計算で閉包可能)に当たるため、追加イテレーションでなく conductor の実測固定で閉じた。閉包の機械確認: (1) requirements.md 内の旧件数残存 = 1件(測定 ref の差を説明する意図的な引用のみ) (2) 台帳件数の三者一致 = 散文「9選挙」1・表9行・受け入れ基準「9選挙」1 (3) 必須7節 = 7 (4) センサー再発火 = PASSED 2件・FAILED 0件。
- 2026-08-03T12:15:18Z — 是正時に record 全域 grep(`cid:nfr-design:cite-fix-sweeps-whole-record`)を実施し、codekb 側の「破損記録7件」は observed `498c3034a`(2026-08-03T16:10:27+09:00)断面の値で、`260803-e-esg-res13`(作成 2026-08-03T20:11:06+09:00)がまだ存在しない当該断面では正しいと確認。両者は測定 ref の違いによるもので矛盾しないため codekb は改変せず、requirements.md 側に ref 差の説明を追記した。

## §12a レビュー
- 2026-08-03T12:15:18Z — iteration 1(invocation 339fb991)NOT-READY: Major 2件(FR-3d の件数自己矛盾 / FR-3c が第3パターン「tallied の後に ballot」を無根拠に除外)+ Minor 2件(consumes 外の component-inventory.md 引用 / Q5 非採用候補の未転記)。全件是正。
- 2026-08-03T12:15:18Z — iteration 2(invocation 4caf977a)NOT-READY: iteration 1 の4指摘は閉包確認、新規 Major 1件(是正の伝播漏れ)。上記 Deviations のとおり conductor 検証で閉包。

## §13 学習選定
- 2026-08-03T12:25:57Z — E-ESG-RAS13(auto-solo、subagent transport)採用 **0件** 2-0。GoA[E-ESG-RAS13]: 2x2。両票の留保: (subagent-1)c5 の被覆は historical-section-cite-check-at-observed を「file:line/履歴節」から「件数/observed 宣言つき現在節」へ一段一般化することに依存するため、将来この一般化が争点化したら cite-fix-sweeps-whole-record への1行追補で閉じることに反対しない /(subagent-2)c5 の「ref 拘束値は伝播させない」は cite-fix-sweeps-whole-record と measurement-ref-in-artifacts の合成から導出可能だが明文ではないため、codekb 側に ref 注記が無い断面では過剰伝播が起きうる — 次回 PM で cite-fix 側への1行参照追記を検討する余地は残す。
- 2026-08-03T12:25:57Z — **conductor の推奨(c5 のみ採用)は投票者の実測で覆された**。両者が独立に指摘した決め手は `architecture.md:2965`「本節の file:line はすべて observed `498c3034a` 時点」の宣言と `project.md:228` の historical-section-cite-check-at-observed — observed 宣言を持つ節はその ref で照合するため、宣言 ref 下で正しい値は cite-fix-sweeps-whole-record(射程 = **誤引用**の全域伝播)の伝播対象に初めから入らない。よって非伝播は既存2 cid の合成で導かれ、新規追補に当たらない。
- 2026-08-03T12:25:57Z — 本選挙は指令ループのみで駆動し、結果確認は tally.json の**読み取り**で行った(前回 E-ESG-RES13 では開票結果を表示するため tally verb を単独実行して #2125 を自ら再現させた)。timeline は `ballot, ballot, distributed, distributed, tallied` で `tallied` は1件のみ — 再発なしを実測確認。
