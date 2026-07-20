# Election Record — E-TCRRA3

- question: 260719-tally-choice-ruling(#1261)RA Q3: TallyResult 型拡張の形。

背景: 現行 TallyResult(model.ts:312-314)は outcome:"adopted"|"rejected"+GoaCounts のみで多肢を表現不能。型変更は rulingText(record.ts:107)・verify(election.ts:440 recompute 比較)・t234/t238 fixture へ機械的波及。

各自コード実測のうえ GoA 付き投票。

裁定: 採用
- 留保(e4, GoA2): choice 別票数内訳のフィールド名・形は e2 intent の per-voter 最新解決(E-BFARA2=A)後の母集団を数える前提で設計すること — amend 導入後に『どの票を数えたか』が内訳の意味を変えるため、design で母集団定義を1文固定する
- 留保(e3, GoA2): 内訳は choice 別の単純票数のみに限定(choice×GoA のクロス分布は持たない)— record 描画の監査可能性を確保しつつ型と fixture の肥大を抑える。
票タイムライン: 配信 2026-07-19T22:42:52Z → 配信 2026-07-19T22:42:52Z → 配信 2026-07-19T22:42:52Z → e3 2026-07-19T22:44:10Z → e4 2026-07-19T22:44:15Z → e2 2026-07-19T22:44:20Z → 開票 2026-07-19T22:45:34Z
GoA[E-TCRRA3]: 1x1 2x2 3x0 4x0 5x0 6x0 7x0 8x0
