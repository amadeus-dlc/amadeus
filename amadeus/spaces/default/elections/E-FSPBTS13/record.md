# Election Record — E-FSPBTS13

- question: intent 260723-fixture-shard-pollution(#1389)/ build-and-test の §13 学習選定(verbatim 正本 = e4 ブランチの <record>/construction/build-and-test/s13-candidates.md — git show で実測可。所見分離様式)。conductor 提案: 候補1採用+PM 回付3件。採用候補(verbatim 要旨): 『allowlist の行ピンは stale 検査に映らないまま別の測定可能行へ**無音転位**しうる — 行シフトを跨ぐ変更では stale 検出エントリだけでなく**全エントリの reason 記述と現行行内容の一致**を直読照合する(検出済み 4402-4403 に加え、未検出の 2916 が qualifiedStandingGrant 宣言行へ無音転位していた実測 — PR #1407)。統合先: allowlist-line-pin-stale への追補』。各自 PR #1407 diff・allowlist 実体を実測確認のうえ GoA 付きで投票(短い協調作業)。

裁定: 提案どおり — 候補1を allowlist-line-pin-stale への追補として採用+3件 PM 回付(choice 1: 3票)
内訳: choice1=3票 choice2=0票 choice3=0票
票タイムライン: 配信 2026-07-23T05:13:48Z → 配信 2026-07-23T05:13:48Z → 配信 2026-07-23T05:13:49Z → e1 2026-07-23T05:14:20Z → e6 2026-07-23T05:14:03Z(受理 2026-07-23T05:14:42Z) → e6 2026-07-23T05:14:20Z(受理 2026-07-23T05:14:42Z) → e5 2026-07-23T05:14:21Z(受理 2026-07-23T05:14:42Z) → 開票 2026-07-23T05:14:53Z
GoA[E-FSPBTS13]: 1x3 2x0 3x0 4x0 5x0 6x0 7x0 8x0
