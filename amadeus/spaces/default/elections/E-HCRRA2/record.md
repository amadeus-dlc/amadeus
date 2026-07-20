# Election Record — E-HCRRA2

- question: 260720-hold-choice-resolution(#1267)RA Q2: choice 指定の CLI 構文はどれか?

実測コンテキスト: 受理面は handleHoldResolved(election.ts:190-226)で、resolution は既存 --resolution フラグの文字列(FLAG_FIELDS :505)。検証は HOLD_RESOLUTIONS テーブル引き(:201-207、未知値 fail-closed)。tie の choice は election.json の choices[].internalNo(数値)で識別される。

各自実測確認のうえ GoA 付き投票。

裁定: 採用
票タイムライン: 配信 2026-07-20T03:41:44Z → 配信 2026-07-20T03:41:44Z → 配信 2026-07-20T03:41:44Z → e3 2026-07-20T03:42:49Z → e1 2026-07-20T03:43:13Z → e4 2026-07-20T03:46:28Z → 開票 2026-07-20T03:46:55Z
GoA[E-HCRRA2]: 1x3 2x0 3x0 4x0 5x0 6x0 7x0 8x0
