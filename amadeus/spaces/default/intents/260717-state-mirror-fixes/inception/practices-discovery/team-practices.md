# Team Practices — 260717-state-mirror-fixes(差分確認)

上流入力(consumes 全数): code-structure.md、technology-stack.md、dependencies.md、code-quality-assessment.md、architecture.md、business-overview.md(codekb — 証跡スキャンは同日 RE の diff-refresh を代用、practices-discovery:c1)

## 確認結果(practices-discovery:c1 — RE codekb 代用)

affirm 済みの `amadeus/spaces/default/memory/team.md` / `project.md` は本 intent の作業面(packages/framework/core/tools の canonical 編集+dist 6ツリー再生成+promote:self、scripts/amadeus-mirror.ts の既存配線、tests/ の Bun ランナー4層)を全面カバーしており、**変更セクションなし(部分ドラフトなし、practices-discovery:c2 の live 温存)**。

- Way of Working / Walking Skeleton / Testing Posture / Deployment / Code Style: 変更なし — 両修正とも既存の正本編集→再生成→drift guard の確立フローに収まる(code-structure.md / architecture.md の core 中立層・表層境界、technology-stack.md の Bun/TS 前提は RE で不変を実測)
- 新規外部依存なし・新規パッケージなし(dependencies.md で不変を実測)— ギャップ質問 0 問

## 適用プラクティス(本 intent への写像)

- **#1170 修正面**: `packages/framework/core/tools/`(handleSetStatus)+ `.claude/hooks` 正本を編集元とし、`bun scripts/package.ts` で dist 6ツリー再生成+`bun run promote:self`(project.md Mandated)。ロック参加は既存 `withAuditLock` ドメイン(amadeus-state.ts:251-266 の C2b 様式)に倣う
- **#1172 修正面**: `scripts/amadeus-mirror.ts` は biome.json:41 / tsconfig.json:19 の既存配線に収容済み。リグレッションは code-quality-assessment.md で確定した偽 green fixture(t232 の捏造 `[S]` 様式)を実 state 由来 fixture(`[ ] <stage> — SKIP`)へ是正
- **テスト姿勢**: 対象バグへのリグレッションテストを第一級成果物とし(org.md の bug 系デフォルト+business-overview.md の品質契約)、既存スイート green 維持。#1170 は t145 様式の並列 spawn 拡張、#1172 は 18/18 assert
