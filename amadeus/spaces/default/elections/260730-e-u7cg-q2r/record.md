# Election Record — E-U7CG-Q2R

- question: U7 callsite-migration の Q2 裁定(E-U7CG-Q2: 第1弾実書換え batch = core/ 99 行を本 Bolt に含め ratchet 実効を同一 PR で実証)の前提不成立に伴う再裁定。builder の実測: (機構1) registerLoggerProvider を production で呼ぶのは amadeus-log.ts:78 と scripts/otel-phase1-measure.ts:65 のみで、他 tool/hook は bootstrap しないため call site を canonical 化すると emitEvent が "emit before registerLoggerProvider"(logger-provider.ts:36)で throw する — 移行は1行スワップでなく entrypoint ごとの bootstrap 追加を要する。(機構2) emitEvent は registry の requiredAttributes を強制するが v1 writer は強制しておらず、amadeus-jump.ts の 7 eventType 実測で 3 種(PHASE_VERIFIED/PHASE_SKIPPED/PHASE_STARTED)が属性不足で throw、残り約 75 event の requiredAttributes は実 call site と未突き合わせ(体系的乖離の可能性)。不足属性値の発明は audit 意味論の独断決定になる。bootstrap 済みの otel-phase1-measure.ts の 2 site は新旧比較計測の current 側で移行すると計測が無意味化(恒久例外候補)。→ 本 Bolt で安全に移行可能な call site はゼロ。ratchet の追加赤側と corpus 側(66件)は実証済み、実縮小 green は CLI テスト(allowlist 過大計上時に通る)で代替実証のみ。PR #1733 には Adapter(Q3A/Q3B 込み)・guard・shadow 比較が実装済みで検証全 green。各自 logger-provider.ts:36、registerLoggerProvider の production 呼出し実測、amadeus-jump.ts の emit 属性、event-registry の requiredAttributes を独立実測して投票せよ。

裁定: U7 Bolt は機構一式+前提不成立の実測報告をもって充足とし PR #1733 を完成扱いにする。前提解消(entrypoint bootstrap 方針+全 event の requiredAttributes 実 call site 突き合わせ)と実書換え batch は U8 前の追加 Bolt 群へ送る(既存 Task #1/#2 に統合)(choice 1: 2票)
内訳: choice1=2票 choice2=0票 choice3=0票
- 留保(subagent-1, GoA2): 追加 Bolt での requiredAttributes 突き合わせで不足属性値の決定が audit 意味論の変更(仕様変更)に及ぶ場合は、正準リスト(4)に従いユーザーエスカレーションへ倒すこと。
- 留保(subagent-2, GoA2): 前提解消 Bolt 群は本 intent 内 U8 前に必ず残し、requiredAttributes 突き合わせで不足属性値の決定が audit 意味論の仕様判断に及ぶ場合は builder 独断でなくユーザー/選挙裁定へ戻すこと。自案非採用時の受容度: 案2=6、エスカレーション=6。
票タイムライン: 配信 2026-07-30T10:34:26Z → 配信 2026-07-30T10:34:26Z → subagent-1 2026-07-30T10:36:52Z(受理 2026-07-30T10:37:12Z) → subagent-2 2026-07-30T10:37:13Z(受理 2026-07-30T10:38:01Z) → 開票 2026-07-30T10:38:16Z
GoA[E-U7CG-Q2R]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
