# Logical Components — U2: event-registry

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

NFR 設計（performance/security/scalability/reliability 各 design）の決定がどの論理コンポーネントに適用されるかの対応表。配置は tech-stack-decisions.md どおり `packages/framework/core/otel/`（U1 の配置決定に従う）。

## コンポーネント目録

| コンポーネント | 責務 | 適用される NFR 設計 | 故障領域（blast radius） |
|---|---|---|---|
| `event-registry.ts` | 78 event の EventDef 定義表（name・durability・requiredAttributes・schemaVersion・category）、`RegisteredEventName` union 型、`getEventDef` | performance-design（定数時間ルックアップ）、security-design（属性語彙の入口） | 定義誤りは compile-time 型エラーで検出。runtime 到達前に停止 |
| 実行時検証（Logger Provider 内の引当て） | `getEventDef` による定義引当て・required attributes 照合 | performance-design（照合コスト限定）、reliability-design（拒否経路） | 拒否は emit 呼出し側の例外に限定。fatal latch 対象の書込失敗とは区別 |
| drift guard 抽出器 | 4集合の機械抽出（静的 grep・Registry・codec 表） | performance-design（hot path 隔離）、reliability-design（4集合一致強制） | 抽出器の故障は CI ジョブの FAIL のみ。CLI 実行に影響なし |
| sensor manifest（`amadeus-event-registry-drift`） | `.kimi-code/sensors/` への追加、PostToolUse 発火 | reliability-design（3 層拒否の CI 配線） | sensor 未発火時は unit test 層が担保。二重化で単一障害点を回避 |
| 互換 Adapter の引当て | 旧 eventType → Registry 名の写像 | reliability-design（フォールバックなしの例外） | 引当て不能は例外で移行漏れを顕在化。silent な event 欠落を防ぐ |

## コンポーネント境界と分離方針

- Registry は定義の正本のみを持ち、永続化・dispatch・redaction 実行の責務を持たない。永続化は U3 codec、dispatch は U4 Exporter、redaction 実行は U1/U4 の二層へ委譲する一方向依存
- 4集合の完全な相等強制は U3/U4 着地後に有効化されるため、本 Unit のコンポーネントは部分集合での検証に対応できる抽出器設計とする（reliability-design § 段階的有効化）
- `packages/framework/core/` 変更のため FR-DST-2 を適用: manifest マッピング登録、`bun scripts/package.ts` で全生成面（dist 7 harness・self-install 5 面）を再生成し `package.ts --check`／`promote:self:check` を通過する
