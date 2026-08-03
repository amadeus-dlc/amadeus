# Election Record — E-RRP-BTS13

- question: 260802-record-roundtrip-pbt / build-and-test §13 学習選定。surface 候補2件: c1 = 統合検証を本線でなく origin/main から切った検証専用 worktree で実走(coverage 単独所有者の明確化 — cid:code-generation:c1-coverage-single-owner の適用。着地面 = main 断面のため patch gate は追加行0で、各 Bolt 着地時の 76/76・107/107・183/183 が実効値)/ c2 = verdict を条件付きでなく無条件 READY とした(未検証面2件 = pbt-deep の実 CI 初回 run / #2112 の潜在債務 はいずれも受け入れ基準 FR-1〜7・NFR-1〜5 の外。cid:build-and-test:verdict-names-unverified-facets が求める書き分けは summary/results の申し送り節で実施)。各候補が (a) 既存 cid の執行実例(persist 不要)か (b) 新規追補(persist 相当)かを、diary・build-and-test の7成果物・既存 cid(c1-coverage-single-owner / verdict-names-unverified-facets / no-silent-scope-narrowing / bt-proportional-selection)を実測して判定し投票せよ。GoA 明記、2/3/6 は留保1文。

裁定: c2 のみ採用(無条件 READY の判定基準を追補として persist)(choice 3: 2票)
内訳: choice1=0票 choice2=0票 choice3=2票 choice4=0票
- 留保(subagent-2, GoA2): AC 外という判定自体が抜け道になりうるため、追補本文には『AC 外の認定は requirements.md / RAID の実文照合で行い、no-silent-scope-narrowing が縛る「実装時実測」規定項目は AC 外に分類しない』を明記すること。
- 留保(subagent-1, GoA2): 留保1点: c1 を不採用にするのは『検証専用 worktree での実走』の面についてであり、候補文括弧内の『着地面 = main 断面のため patch gate は追加行0、各 Bolt 着地時の 76/76・107/107・183/183 が実効値』という空虚 PASS の注意は、同型の誤読(main 断面の patch gate PASS を patch 被覆の証拠として引く)が再発した場合に cid:code-generation:c1-coverage-single-owner への1行追補として昇格させるべく、監視条件付きで次回の週次蒸留ラウンドへ回付すること。
票タイムライン: 配信 2026-08-03T06:24:47Z → 配信 2026-08-03T06:24:47Z → subagent-2 2026-08-03T06:26:40Z(受理 2026-08-03T06:26:44Z) → subagent-1 2026-08-03T06:27:59Z → 開票 2026-08-03T06:28:27Z
GoA[E-RRP-BTS13]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
