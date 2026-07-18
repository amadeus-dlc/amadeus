# Performance Design — fix-1170-retreat-guard(nfr-design)

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## 設計(P-1/P-2 の実現)

- performance-requirements.md P-1: ロック取得は withAuditLock 既定パラメータのまま(50×100ms — 新定数を導入しない)。呼び出しは handleSetStatus 本体を1回ラップするのみ(business-logic-model の中核ロジック)
- P-2: ロック内は readStateFile 1回+parseCheckboxes 1回+(前進時のみ)setField×6+setCheckbox+writeStateFile — ロック外にあった既存処理の移設のみで新規 I/O ゼロ

## 保証機構(層別 — 一枚岩の断定を避ける)

| モジュール | 保証 | 機構 |
|---|---|---|
| handleSetStatus | ロック保持時間の最小性 | ロック内に spawn・ネットワーク・追加ファイル I/O を置かない(diff 検分で担保) |
| withAuditLock | 待ちの有界性 | 既存リトライ上限 50×100ms(performance-requirements.md P-1 = amadeus-lib.ts:4275 — reviewer Finding 3 是正: 数値根拠は P-1 が正) |
