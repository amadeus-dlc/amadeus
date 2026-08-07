# Election Record — E-STG-S13G

- question: intent 260805-subagent-type-guard / ステージ delivery-planning の §13 学習選定。diary 候補2件。候補要旨: c1=0問様式の質問票採用と walking-skeleton/ラダーの Construction 予約(既決の適用実例) / c2=autonomy full 発効中でも walking-skeleton ゲートは実人間承認で止まる設計を bolt-plan に明記した(project.md Forbidden の適用実例)。いずれも既存ノルムの適用に見えるが、採用すべき一般化可能な新規学習があるか。

裁定: 0件(採用なし)(choice 1: 2票)
内訳: choice1=2票 choice2=0票
- 留保(subagent-2, GoA2): 0件は「c2 の発見を捨てる」ことを意味しない。c2 が依拠する主張はノルムと実装の乖離であり、cid:requirements-analysis:issue-first-capture により Issue-first で起票し、bolt-plan.md:15 の断定は引用の接地または訂正を要する。
- 留保(subagent-1, GoA2): c2 の前提が実装と矛盾する点を conductor へ escalate すること。実測: packages/framework/core/tools/amadeus-orchestrate.ts:1774-1777 のコメント逐語『Intent autonomy decides who resolves that gate: `full` may auto-decide it within the confirmed grant, while `none` and `semi` require a human.』、同 :3139-3140『the gate still exists and the Intent autonomy coordinator determines whether `full` may auto-decide it』、amadeus-intent-autonomy-production.ts:62-67 の ALL_INTERACTIONS が "walking-skeleton" を含み :275 で grant scope の allowedInteractionKinds へそのまま渡る、amadeus-intent-autonomy.ts:498 が `grant.scope.allowedInteractionKinds.includes(occurrence.kind)` で full-grant 適用を判定。よって walking-skeleton gate は既定スコープの full grant 下で auto-approve 対象であり、bolt-plan.md:15 の『この1点は autonomy full の対象外』は engine の設計と一致しない。project.md Forbidden が禁じるのは retired な standing grant(docs/reference/12-state-machine.md § Legacy standing delegation grants (#1125): 『Standing delegation grants are retired as an authorisation mechanism』『never converted into a `full` grant』)であり、intent-scoped full grant とは別機構。bolt-plan の記述が誤りか engine 側が Forbidden の趣旨に反するかは仕様判断であり、正準リスト(4)によりユーザー裁定事項。
票タイムライン: 配信 2026-08-05T21:49:49Z → 配信 2026-08-05T21:49:49Z → subagent-2 2026-08-05T21:51:33Z(受理 2026-08-05T21:52:27Z) → subagent-1 2026-08-05T21:52:02Z(受理 2026-08-05T21:52:33Z) → 開票 2026-08-05T21:52:52Z
GoA[E-STG-S13G]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
