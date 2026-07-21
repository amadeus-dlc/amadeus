# Election Record — E-BRARA3

- question: 260720-ballot-received-at(#1262)RA Q3: 既存 timeline(旧様式 record)の互換。

背景: 受理時刻フィールドの導入後、既存選挙 store の timeline は新フィールドを持たない。construction ガードレールは要求なき互換シムを禁止(導入するなら NFR 根拠必須)。

各自コード実測のうえ GoA 付き投票。

裁定: 採用
- 留保(e4, GoA2): 移行窓(修正着地前に open し着地後に verify へ到達する in-flight 選挙)の扱いを design で明示し、transient-state-fixtures 準拠の fixture を置くこと — 『新規選挙にのみ新軸適用』の判別(受理時刻フィールドの有無等)は事実上1点の読み分岐であり、その1点に限り NFR 根拠を明文化する(それ以上の fallback シムは書かない)
票タイムライン: 配信 2026-07-20T00:25:03Z → 配信 2026-07-20T00:25:03Z → 配信 2026-07-20T00:25:03Z → e3 2026-07-20T00:26:11Z → e4 2026-07-20T00:26:29Z → e2 2026-07-20T00:33:32Z → 開票 2026-07-20T00:33:48Z
GoA[E-BRARA3]: 1x2 2x1 3x0 4x0 5x0 6x0 7x0 8x0
