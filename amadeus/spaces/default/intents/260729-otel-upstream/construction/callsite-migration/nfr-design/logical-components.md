# Logical Components — U7: callsite-migration

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

NFR 設計（performance/security/scalability/reliability 各 design）の決定がどの論理コンポーネントに適用されるかの対応表。新規ランタイム依存は追加しない（tech-stack-decisions.md）。

## コンポーネント目録

| コンポーネント | 責務 | 適用される NFR 設計 | 故障領域（blast radius） |
|---|---|---|---|
| 互換 Adapter（`migration-adapter.ts`） | 旧 `appendAuditEntry()` シグネチャ維持、registry 引き当て → `emitEvent` 委譲 | performance-design（O(1) 委譲）、reliability-design（失敗契約同一性）、security-design（redaction 不変） | 引き当て失敗は例外で当該 emit のみ失敗。旧 writer 迂回経路を持たないため dual-write 化しない |
| call-site guard（TypeScript スクリプト＋allowlist JSON） | 直接呼出し・旧 observe 利用の静的検出、ratchet 判定、残存可視化 | performance-design（lint 内包・線形走査）、security-design（改竄耐性）、scalability-design（単調性） | guard の誤作動は CI 拒否に限定。見逃し方向の故障を構造で排除（過検出側に倒す） |
| batch 変換手順 | 静的スキャン列挙 → batch 分割 → backup → 機械的書換え → allowlist 除去 | scalability-design（全量処理）、reliability-design（batch rollback） | batch 単位で revert 可能。中途状態の残存を許さない |
| shadow 比較ハーネス（U1 原型の本番化） | 新旧経路の出力採取・機械可読 report 生成 | reliability-design（移行正しさ）、performance-design（hot path 分離） | harness 障害は「比較未実施」として report に顕在化。暗黙の同等扱いなし |

## コンポーネント境界と分離方針

- Adapter は委譲のみで旧 writer 呼出し経路を持たず、canonical 経路の単一性を保つ（reliability-design § canonical 経路の単一性）
- shadow 比較のゲート判定は U8 の責務。本 Unit は harness と report 生成までで、判定ロジックを持たない（business-logic-model.md § shadow 比較ハーネス 3）
- audit CLI append verbs（FR-MIG-3）の公開互換方針は Phase 4 ADR 管轄であり、本 Unit のコンポーネントはその決定に依存しない
- Adapter・guard は `packages/framework/core/` 変更のため FR-DST-2 を適用: manifest マッピング登録、`bun scripts/package.ts` で全生成面（dist 7 面＋self-install 5 面）を再生成し `package.ts --check`／`promote:self:check` を通過する（VER-6）
