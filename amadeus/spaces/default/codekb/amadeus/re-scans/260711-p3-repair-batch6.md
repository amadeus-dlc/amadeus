# Re-scan 記録 — 260711-p3-repair-batch6

> #707 契約(per-intent re-scan 記録)。差分ベース点の真実源はこのファイル(この intent 固有)。共有 `reverse-engineering-timestamp.md` は鮮度ポインタであってベース点ではない。

## スキャンメタデータ

- **base**: `d8de2362b24300c1f73d51392436141848bf8a6a`(前回 260710-p3-cleanup-batch5 の observed)
- **observed**: `37ad36a97fe850c4724bc45200eb4456c921d495`(実行時 origin/main、`git rev-parse` 実測)
- **date**: 2026-07-11
- **intent**: `260711-p3-repair-batch6`(P1-P2 バグ6件 — #841 / #842 / #836 / #840 / #847 / #848。うち5件は restart-loss regression)
- **scope**: bugfix
- **手法**: diff-refresh(cid:reverse-engineering:c1)。介在コミット13本、コア tools の変更は lib/state/swarm/utility の4ファイルのみ。フォーカス5ファイル(orchestrate/jump/sensor-linter/graph/stage-schema)は区間無変更 — 6欠陥は区間外の既存欠陥(restart-loss)と確定。E-L53 3点法(元修正 diff 実在・現行欠陥現存・区間内外切り分け)適用。
- **実施体制**: Developer(スキャン)→ Architect(合成)の 2 サブエージェント直列(cid:reverse-engineering:c3)

## focus(スキャンスコープ)

- `packages/framework/core/tools/amadeus-orchestrate.ts`(#841 tryEmitSwarm)
- `packages/framework/core/tools/amadeus-jump.ts`(#842 phase 境界イベント)
- `packages/framework/core/tools/amadeus-state.ts` / `amadeus-utility.ts`(#836 Phase Progress / #840 detectWorkspace / #848 免除経路)
- `packages/framework/core/tools/amadeus-sensor-linter.ts`(#847)

## 詳細

一次記録: `amadeus/spaces/default/intents/260711-p3-repair-batch6/inception/reverse-engineering/scan-notes.md`(6欠陥の現行 file:line・欠陥コード引用・元修正コミット対照)。
