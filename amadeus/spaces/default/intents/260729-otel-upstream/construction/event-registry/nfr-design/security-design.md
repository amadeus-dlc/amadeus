# Security Design — U2: event-registry

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

security-requirements.md の要件（属性語彙の入口制限・分類の強制）に対する設計。本 Unit の役割は「機微キーが属性語彙に入らない入口を絞る」ことに限定し、redaction 実行は U4 の二層に委譲する。

## 属性語彙の入口制限

- EventDef の requiredAttributes 語彙に機微キー（prompt・argv・credential・無許可パス）を含めないことを Registry 登録時のレビュー観点として固定する。語彙の正本は `event-registry.ts` 一箇所で、別経路からの属性追加を型で排除する
- `command` 属性の safe-key 見直し（FR-DST-4）・`redactionOptIn` 限定キー許可（FR-DST-5）のポリシーを EventDef の属性定義へ反映し、argv 由来値の raw 保持を定義レベルで許さない
- Registry の属性定義を VER-2 credential-free 検査ゲートの検査可能な正本として機能させる（検査パターン語彙と Registry 語彙の同一源化は U4 の BR-16 と整合）

## 分類の強制設計

- EventDef に `durability`（canonical／telemetry）を必須属性として持たせ、`recordException()` の exception Span Event は telemetry 固定とする（FR-EVT-7）。durability 未指定の EventDef を型で作れなくする
- canonical 分類の event のみが AuditLogExporter の受理集合に機械導出される構造とし、手動の受理リストを持たない（誤分類の混入経路を排除、business-logic-model.md § drift guard）

## 検証設計

- 未登録名・誤分類・required attributes 不足の各拒否ケースを compile-time（型）・unit test・sensor の 3 層で固定する（VER-1）
- 拒否ケースのテストを実装に先行させる（VER-3 のテスト先行順序）
