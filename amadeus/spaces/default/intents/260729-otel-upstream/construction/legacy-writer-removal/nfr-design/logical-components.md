# Logical Components — U8: legacy-writer-removal

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

NFR 設計（performance/security/scalability/reliability 各 design）の決定がどの論理コンポーネントに適用されるかの対応表。実現先は CI／テスト基盤であり、新規ランタイム API を追加しない（business-logic-model.md 冒頭）。

## コンポーネント目録

| コンポーネント | 責務 | 適用される NFR 設計 | 故障領域（blast radius） |
|---|---|---|---|
| 六 checker（条件 a〜f の判定器） | 各条件の独立判定、`ConditionResult { condition, verdict, evidence, detail }` 返却 | reliability-design（双方向検証・再現性）、scalability-design（独立性） | 1 checker の故障は当該条件の UNKNOWN/FAIL に限定され `overall = "BLOCKED"` で fail-closed |
| ゲート評価器 | 六 `ConditionResult` の集約、`GateEvaluationReport`（JSON）生成 | security-design（人手バイパス排除）、reliability-design（false-green 排除） | 評価器の故障は report 生成失敗＝削除手続き中断。誤った GREEN を出さない構造 |
| `GateEvaluationReport` | CI artifact 永続化、削除 commit からの参照 | security-design（証跡の強制・evidence 非機微化） | report 欠損は削除フロー中断で顕在化 |
| 削除手続き（旧 writer・`migration-adapter.ts` 互換層の削除） | GREEN 確認 → backup → 削除 → 削除後検証 → rollback 判定 | reliability-design（削除後検証・rollback）、security-design（安全境界） | 削除後検証 FAIL は git revert で完全復元。部分適用を残さない |
| retention 判定器 | 既存 Intent の retention 条件の機械判定 | reliability-design（機械再現性）、scalability-design（単純走査） | 判定不能は v1 reader 維持側に倒れる（fail-closed） |
| v1 reader 削除手続き | retention 達成確認 → 参照経路検査 → v1 reader 削除 → v2-only 検証 | reliability-design（出口不変条件） | 参照残存の検出で削除中止。v1 reader を維持 |

## コンポーネント境界と分離方針

- 条件 (d)(e) の評価は U11 の shadow report・Relay 非生成証明の成果物が存在してから行う（business-logic-model.md § 削除ゲート注記）。依存 Unit の成果物未到達は UNKNOWN で BLOCKED とし、判定不能を成功扱いしない
- ゲート判定は CI の機械評価のみを受理し、判定器は純粋な静的検査・fixture 検査で外部ライブラリを要さない（tech-stack-decisions.md § 新規依存なし）
- `packages/framework/core/` 配下の旧 writer・互換層・v1 reader の削除に伴い、各 harness manifest マッピングから当該エントリを除去し、`bun scripts/package.ts` で全生成面を再生成、`package.ts --check`／`promote:self:check` を通過する（FR-DST-2。ゲート条件 f はこの検証そのもの）
