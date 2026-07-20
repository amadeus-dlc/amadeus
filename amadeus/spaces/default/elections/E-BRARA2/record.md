# Election Record — E-BRARA2

- question: 260720-ballot-received-at(#1262)RA Q2: classifyLate の時刻軸。

背景: classifyLate(model.ts:296-297)は ballot.submittedAt <= tallyTime で late を判定 — 中継遅延票は「申告は tally 前・受理は tally 後」がありうる。e2 の per-voter 最新解決(E-BFARA2)は submittedAt 軸を使う(交差)。

各自コード実測のうえ GoA 付き投票。

裁定: 採用
- 留保(e4, GoA2): store.ts:146-150 の null-fallback(state 到着で classifyLate が null でも late 扱いする既存分岐 — 実読済み)は受理軸移行後に意味が変わる: 受理が tally 後なら受理軸 classifyLate は常に late を返し fallback が死码化しうる。design で机上トレースし、死码化する場合はコメント化でなく削除まで含めて裁定すること(消費されない分岐の残置は検証劇場 Forbidden の隣接クラス)
票タイムライン: 配信 2026-07-20T00:25:03Z → 配信 2026-07-20T00:25:03Z → 配信 2026-07-20T00:25:03Z → e3 2026-07-20T00:26:11Z → e4 2026-07-20T00:26:29Z → e2 2026-07-20T00:33:32Z → 開票 2026-07-20T00:33:48Z
GoA[E-BRARA2]: 1x2 2x1 3x0 4x0 5x0 6x0 7x0 8x0
