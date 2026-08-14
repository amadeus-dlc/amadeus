# Requirements Analysis — 質問(260814-t528-ambient-isolation)

> Issue #2981 と xrev-260814-2981(2名 CONFIRMED_WITH_REFINEMENTS)、および RE(機序 A/B の特定)で大半の決定は確定済み。既決事項は再質問しない(cid:requirements-analysis:c5)。以下は実装方式を左右する材料質問のみ。Intent autonomy = full のため、回答は `amadeus-bolt decide-question` 梯子で裁定する(cid:scope-definition:c1-semi-ladder-routing)。

> 承認: Intent autonomy `full` グラント(intent-grant-9edfd984e4d57bd3cbf95b6de7a2d440、実 HUMAN_TURN 由来、2026-08-14T00:24:42Z 付与コミット)に基づく AUTO_DECIDED 裁定。Q1 = auto-decision-0f514a0d3927d145b0458c66781d1077、Q2 = auto-decision-a648e2b42cf2aa555925f874a721d99b。

## Q1: 修正スコープ — 新発見の監査汚染経路(E2)を本 intent で修正するか

RE §3.4 で、`recordEngineError` が `projectDir === undefined` のとき ambient へフォールバックし、実 intent record の監査シャードへ `ERROR_LOGGED` 行を書く経路が実測確認された(t528 #3 の現行形が踏む)。ただし Issue #2981 の完了条件はテストの決定性(隔離修復)とメッセージ追随のみで、この production 経路の是正は含まれない。テスト側を explicit projectDir 化すれば t528 からの汚染は止まる。

- A. テスト側のみ修正し、E2(production の ambient 監査汚染経路)は実測を添えて別 Issue として起票する(推奨 — surgical / P5、Issue 完了条件に忠実、潜在バグは修正せず実測起票の既存則に整合)
- B. 本 intent で production 側(`recordEngineError` の ambient 段 fail-closed 化等)も修正する(スコープ拡大、#2981 完了条件外)
- C. テスト側のみ修正し、E2 は起票もしない
- X. Other (please specify)

[Answer]: A(AUTO_DECIDED auto-decision-0f514a0d3927d145b0458c66781d1077)

## Q2: 機序 B(dist/ 未ビルド worktree での #4/#5 赤)の扱い

既存ノルム(cid:code-generation:solo-bolt-worktree-required)が新規 worktree での `bun run build` を定型手順として既に義務化している。現行の失敗は ENOENT + パスで loud だが、是正手順(`bun run build`)を名指さない。

- A. t528 の beforeEach に STOCK_GRAPH 実在の前提検査を追加し、不在時は `bun run build` を名指す明示メッセージで fail させる。Issue #2981 へ機序 B の実測を追記する(推奨 — 完了条件1「決定的に green / red」を満たしつつ最小変更)
- B. Issue への実測追記のみ(コード変更なし)
- C. テスト基盤全体(AMADEUS_SRC / AMADEUS_MEMORY_SRC を使う setupIntegrationProject クラス全体)へ前提検査を広げる(スコープ拡大)
- X. Other (please specify)

[Answer]: A(AUTO_DECIDED auto-decision-a648e2b42cf2aa555925f874a721d99b)
