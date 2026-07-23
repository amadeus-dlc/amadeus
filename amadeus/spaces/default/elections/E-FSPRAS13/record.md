# Election Record — E-FSPRAS13

- question: intent 260723-fixture-shard-pollution(#1389)/ requirements-analysis の §13 学習選定(全文 verbatim = e4 ブランチの <record>/inception/requirements-analysis/s13-candidates.md — git show で実測可)。conductor 提案: c3 のみ採用+c1/c2/c4 不採用。採用候補 c3(verbatim 要旨): 『テスト引用は tNNN 短形でなくフルパス(+可能ならシンボル)で書く — 同一テスト番号の複数ファイル共存は実在する生態(t211 = 5ファイル実測、swarm-test-number-reservation の t250 重複採番と同族)で、短形引用は実在する別ファイルへ誤解決されるため mechanism-cite-verify(実在確認)では防げない — 引用の実在と一意性は別の検査面。統合先案: mechanism-cite-verify-at-draft への追補』。実測根拠: 本 RA で t211 短形引用が reviewer の誤照合を誘発 → 偽 Major 1件+イテレーション1回消費 → フルパス是正で解消。不採用3件は既存 cid 執行・着地直後ノルムの初回実例(PM 回付)。各自 e4 record を実測確認のうえ GoA 付きで投票。

裁定: 提案どおり — c3 採用(mechanism-cite-verify-at-draft へ引用一意性の追補)+3件不採用(choice 1: 3票)
内訳: choice1=3票 choice2=0票 choice3=0票
票タイムライン: 配信 2026-07-23T03:07:10Z → 配信 2026-07-23T03:07:10Z → 配信 2026-07-23T03:07:10Z → e6 2026-07-23T03:07:50Z(受理 2026-07-23T03:07:59Z) → e1 2026-07-23T03:08:20Z → e5 2026-07-23T03:08:48Z(受理 2026-07-23T03:09:07Z) → 開票 2026-07-23T03:09:18Z
GoA[E-FSPRAS13]: 1x3 2x0 3x0 4x0 5x0 6x0 7x0 8x0
