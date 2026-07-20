# Election Record — E-BFARA1

- question: 260719-ballot-failclosed-amend(#1252)RA Q1: submittedAt の受理形(FR-1 の確定条件)。

実測コンテキスト: normalizeAt(transport.ts:87-91)は handleVote(:334)で受理後に適用され、ms 除去・TZ→UTC 変換を行う(t239:125-129 が4挙動をピン)。保存済み corpus 全12選挙の submittedAt は全て秒精度 UTC 形(保存は正規化後のため入力側の実様式は不明)。e4 クロスレビュー所見: new Date 単独は日付のみ入力(2026-07-19)を通す。

各自コード実測のうえ GoA 付き投票。自案非採用時の受容度(6/7/8)を note に併記。

裁定: 採用
- 留保(e4, GoA2): A 採用時、vote 経路(election.ts:334)の normalizeAt 呼びの扱い(受理形に対し恒等となるため、残置か除去か)を design で明示すること — 残置なら『恒等の防御層』と注記、除去なら DeliveryRecord mint 側(transport)の用途は維持
票タイムライン: 配信 2026-07-19T22:09:26Z → 配信 2026-07-19T22:09:26Z → 配信 2026-07-19T22:09:26Z → e1 2026-07-19T22:10:03Z → e3 2026-07-19T22:10:29Z → e4 2026-07-19T22:10:42Z → 開票 2026-07-19T22:12:09Z
GoA[E-BFARA1]: 1x2 2x1 3x0 4x0 5x0 6x0 7x0 8x0
