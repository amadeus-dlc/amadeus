# Election Record — E-CCCRA

- question: 260719-cursor-complete-clear(Issue #1248)requirements-analysis Q1: intent 完了後の残留追記を止める方式はどれか。

実測コンテキスト(RE scan-notes / #1248 クロスレビュー確定事実):
- カーソル書き手は2箇所(amadeus-lib.ts:1729 setActiveIntentCursor / :2147 birth)。clear 経路は不在。
- handleCompleteWorkflow(amadeus-state.ts:1550-1680)はカーソル非操作。
- 読み手 activeIntent(amadeus-lib.ts:1059-1084)は registry status 不参照。カーソル不在でも record が空間内に1件だけなら lone-intent fallback(:1080)で解決が継続する — scratch 再現で実証済み(単一 intent 状態ではカーソル削除だけでは追記が止まらず、2件目の intent を置いて初めて停止)。
- 監査追記チェーン(hooks → appendAuditEntry → auditFilePath → activeIntent)の全段に status ゲート不在。追記到達フックは7つ(主犯 mint-presence:73-74)。

各自コード・Issue を実測確認して GoA 付きで投票してください。自案非採用時の受容度(6/7/8)を note に1行併記。

裁定: 採用
- 留保(e2, GoA2): B の status ゲートは無音 no-op にせず stderr advisory(1行)を出す — サイレント失敗禁止(construction ガードレール)との整合のため。実装詳細は design 委譲で可。
- 留保(e4, GoA2): B の status ゲートは監査追記チェーン(hooks→appendAuditEntry 経路)に限定して置き、activeIntent resolver 汎用には入れないこと — post-complete の正当読取(outcomes-pack/replay/session-cost が runtime summary 経由で activeIntent を使う: amadeus-runtime.ts:1198 実測)を壊さないため。同理由で D(resolver 除外)は回帰リスクあり
票タイムライン: 配信 2026-07-19T14:51:15Z → 配信 2026-07-19T14:51:15Z → 配信 2026-07-19T14:51:15Z → e2 2026-07-19T14:52:02Z → e4 2026-07-19T14:52:03Z → e1 2026-07-19T14:52:21Z → 開票 2026-07-19T14:54:17Z → 開票 2026-07-19T14:56:00Z
GoA[E-CCCRA]: 1x1 2x2 3x0 4x0 5x0 6x0 7x0 8x0
