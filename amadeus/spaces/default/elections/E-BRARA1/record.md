# Election Record — E-BRARA1

- question: 260720-ballot-received-at(#1262)RA Q1: 時刻軸の修正方式(#1262 の核心)。

背景(RE 実測): timeline の ballot/late イベントだけが at: ballot.submittedAt(store.ts:156/:166)で、distributed(election.ts:304)/tallied(store.ts:228)は機械時刻 — 非対称。verifySelf(record.ts:179-183)の隣接 at 単調検査が中継遅延票の混在で構造的に fail(E-BFARA1 実測: 受理順 [e1@22:10:03, e4@22:10:42, e3@22:10:29])。

各自コード実測のうえ GoA 付き投票。自案非採用時の受容度(6/7/8)を note に併記。

裁定: 採用
- 留保(e3, GoA2): 受理時刻フィールドの追加は canonical 1定義(TimelineEvent — E-ETF-BT で canonical lift 済み)への追加1点から導出し、描画側は単調性検査と遅延可視化に必要な面のみ更新する(不要な renderer への一律表示展開はしない — 波及最小化)。
票タイムライン: 配信 2026-07-20T00:25:03Z → 配信 2026-07-20T00:25:03Z → 配信 2026-07-20T00:25:03Z → e3 2026-07-20T00:26:11Z → e4 2026-07-20T00:26:29Z → e2 2026-07-20T00:33:32Z → 開票 2026-07-20T00:33:48Z
GoA[E-BRARA1]: 1x2 2x1 3x0 4x0 5x0 6x0 7x0 8x0
