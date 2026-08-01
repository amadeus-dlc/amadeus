# Election Record — E-OBB5-BTS13

- question: 260801-open-bug-batch-5 build-and-test の §13 学習選定。候補: c1(full baseline green・AC-2c 実環境閉包・FR-10 追加編入着地)は既存 cid(bt-20260730-1 の Comprehensive 執行形・verdict-names-unverified-facets)の実例、c2(stash 誤適用の申告 — 実害なし・自己捕捉/CodeRabbit 反証)は既存 cid(stash-discipline / falling-proof-no-stash)の違反実例記録。いずれも新規規則を導かないため 0 件を提案する。反対材料があれば record(BT diary・build-test-results.md・PR #1895)を実測して投票。

裁定: 0件(両候補とも既存 cid の実例扱い)(choice 1: 2票)
内訳: choice1=2票 choice2=0票
- 留保(subagent-2, GoA2): 留保1点(監視条件付きの 0 件): 候補外だが本 BT 断面には既存 cid に正面から当たらない事象が1件ある — PR #1895 の CodeRabbit Major(intentDir の末尾セグメント抽出要求)は根拠が t280:82 の *テスト fixture 値* であり、production 供給経路(resolveMirrorRecordIdentity / recordDirMatches, amadeus-lib.ts:1846-1851 がネストパスを構造的に受理しない)を実測して反証・不採用とした。memory/ を fixture で grep した限り、corpus-sweep-for-new-guards(team.md:239)・transient-state-fixtures(:262)・golden-regen-from-shipped-surface(:249)・fixture-propagation-grep(project.md:152)はいずれも『自分が書くテスト側の fixture 設計』を縛るのみで、『外部レビュー指摘が fixture 値に接地している場合の供給経路実測による反証』面は未被覆。今回 0 件に賛成する理由は、(a) 反証が1往復で成立し iteration も実害も消費していない (b) 判断自体は org.md Forbidden(要求外の過剰防御・投機的一般化の禁止)+ P2(実測事実のみを根拠)+ deslop-in-workflow から一意に導出可能 — の2点に尽きる。したがって『新規 cid には未達だが、同型が再発したら(特に fixture 接地の外部指摘を実測せず受け入れて投機的一般化を再導入した場合)昇格候補』として次回の週次蒸留ラウンドへ回付すること。
票タイムライン: 配信 2026-08-01T05:39:38Z → 配信 2026-08-01T05:39:38Z → subagent-1 2026-08-01T05:47:00Z(受理 2026-08-01T05:40:58Z) → subagent-2 2026-08-01T06:05:00Z(受理 2026-08-01T05:41:44Z) → 開票 2026-08-01T05:42:07Z
GoA[E-OBB5-BTS13]: 1x1 2x1 3x0 4x0 5x0 6x0 7x0 8x0
