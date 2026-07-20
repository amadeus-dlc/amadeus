# Election Record — E-BFARA2

- question: 260719-ballot-failclosed-amend(#1253)RA Q2: amend の tally 解決規則(FR-4 の確定条件)。

実測コンテキスト: tally(model.ts:321-337)は ballots を kind 非区別で全走査(共存時は同一 voter 二重計上)。verify(election.ts:440)も同一母集団で recompute するため二重計上を検出できない。ADR-5(store.ts:122-124)は「original は上書きしない・両方 ledger に残る」を既決とする(集計規則は未決)。

各自コード実測のうえ GoA 付き投票。自案非採用時の受容度(6/7/8)を note に併記。

裁定: 採用
票タイムライン: 配信 2026-07-19T22:09:26Z → 配信 2026-07-19T22:09:26Z → 配信 2026-07-19T22:09:26Z → e1 2026-07-19T22:10:03Z → e3 2026-07-19T22:10:29Z → e4 2026-07-19T22:10:42Z → 開票 2026-07-19T22:17:20Z
GoA[E-BFARA2]: 1x3 2x0 3x0 4x0 5x0 6x0 7x0 8x0
