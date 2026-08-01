# Election Record — E-OTELWD-C

- question: 260729-otel-upstream writer-deletion Bolt: 削除ゲート条件 (c)(zero direct legacy call sites、checkCallsitesZero は total===0 のみ PASS — tests/deletion-gate.ts:161-176)は、残 3 call site のうち scripts/otel-phase1-measure.ts の 2 site が『設計上の恒久例外として allowlist 残置が正しい』(construction/callsite-migration/code-generation/code-summary.md:68・:134)と既決判断されており、契約と正面矛盾している。残る 1 site は amadeus-audit.ts:417 の自己参照(writer ペア削除で同時に消える)。前提裁定(2026-07-31 ユーザー): 条件 (d) は再定義縮退が確定し、shadow 比較ハーネスの旧経路計測(phase1-measure が担う『current 側』比較)は存在理由を失った。解消方式を選べ。各自、tests/deletion-gate.ts / tests/callsite-guard.ts / scripts/otel-phase1-measure.ts / tests/integration/t385-emitter-registry-admission.test.ts:36-57 / callsite-migration code-summary.md:68 を独立実測してから投票すること。

裁定: C-1: scripts/otel-phase1-measure.ts を削除(choice 1: 2票)
内訳: choice1=2票 choice2=0票
- 留保(subagent-2, GoA2): 削除コミットには Phase 1 計測値の provenance(cold 現行 2.01ms/新 0.92ms、warm p95 現行 0.92ms/新 0.99ms、bundle 237,933 bytes — otel-walking-skeleton/code-generation/code-summary.md:30、ADR-11 で NFR-1 予算確定)を明記し、ハーネス削除が NFR-1 予算の導出根拠を孤児化しないようにすること。あわせて callsite-migration/code-summary.md:68・:134 の『設計上の恒久例外として allowlist 残置が正しい』という既決記述は本裁定で失効するため、record 側に失効の申告(本選挙 E-OTELWD-C と (d) 再定義の前提裁定への参照)を残し、後続が旧記述を現行契約と誤読しないようにすること。
票タイムライン: 配信 2026-07-31T09:58:31Z → 配信 2026-07-31T09:58:31Z → subagent-1 2026-07-31T10:00:07Z → subagent-2 2026-07-31T10:00:13Z → 開票 2026-07-31T10:15:02Z
GoA[E-OTELWD-C]: 1x1 2x1 3x0 4x0 5x0 6x0 7x0 8x0
