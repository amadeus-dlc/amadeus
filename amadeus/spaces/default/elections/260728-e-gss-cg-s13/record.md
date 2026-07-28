# Election Record — E-GSS-CG-S13

- question: intent 260728-gated-swarm-serializatio の code-generation ステージ §13 学習選定。候補1件+0件案。候補 C1: 『coverage-patch-allowlist の行ピンは、行シフトを跨ぐ変更では base→head の行マップ(difflib 等の equal opcode)から全エントリを機械 remap し、remap 後に各エントリの対象行が無変更であることを確認する — stale 検査に映る少数の是正だけでは無音転位(8/11 件が検査に映らなかった実測)を残す』。実測根拠: builder が本 CG で allowlist 11 エントリの全件ずれを検出、stale 検査に映ったのは3件のみ、残り8件は別の測定可能行へ無音転位 → difflib 行マップで機械 remap し patch gate PASS(66/66)。既存 cid:code-generation:allowlist-line-pin-stale の E-FSPBTS13 追補は『全エントリの reason と現行行内容の直読照合』を定めるが、機械 remap 手順そのものは未規定 — C1 はその手順面の追補に相当。留意: 追補として既存 cid へ統合するか、違反実例の記録のみで足りるかも判断対象。

裁定: C1 を採用し、既存 cid:code-generation:allowlist-line-pin-stale への追補として persist する(機械 remap 手順の追加)(choice 1: 2票)
内訳: choice1=2票 choice2=0票
- 留保(subagent-1, GoA2): persist 前に件数を機械再計算で確定すること — 私の独立再集計では bolt-1612 の allowlist diff の行ピン変更は12件(全て amadeus-orchestrate.ts)で候補文の11件と不一致(ledger-count-mechanical-recalc 準拠)。
- 留保(subagent-2, GoA2): 追補文に、機械 remap は E-FSPBTS13 既定の直読照合(reason vs 現行行内容)を代替せず、remap 後の対象行不変確認と併用する旨を明記すること。
票タイムライン: 配信 2026-07-28T09:02:34Z → 配信 2026-07-28T09:02:34Z → subagent-1 2026-07-28T09:04:10Z(受理 2026-07-28T09:04:31Z) → subagent-2 2026-07-28T09:04:22Z(受理 2026-07-28T09:04:43Z) → 開票 2026-07-28T09:05:16Z
GoA[E-GSS-CG-S13]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
