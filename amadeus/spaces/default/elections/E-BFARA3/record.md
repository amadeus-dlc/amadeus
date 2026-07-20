# Election Record — E-BFARA3

- question: 260719-ballot-failclosed-amend(#1253)RA Q3: amend の ref 検証の深さ(FR-3 の確定条件)。

実測コンテキスト: BallotRef = { electionId, voter, submittedAt }(model.ts:102)。store の受理(appendBallot)は amend を dup 判定から除外するのみで ref の実在は見ない(store.ts:131-133)。

各自コード実測のうえ GoA 付き投票。自案非採用時の受容度(6/7/8)を note に併記。

裁定: 採用
票タイムライン: 配信 2026-07-19T22:09:26Z → 配信 2026-07-19T22:09:26Z → 配信 2026-07-19T22:09:26Z → e1 2026-07-19T22:10:03Z → e3 2026-07-19T22:10:29Z → e4 2026-07-19T22:10:42Z → 開票 2026-07-19T22:17:21Z
GoA[E-BFARA3]: 1x3 2x0 3x0 4x0 5x0 6x0 7x0 8x0
