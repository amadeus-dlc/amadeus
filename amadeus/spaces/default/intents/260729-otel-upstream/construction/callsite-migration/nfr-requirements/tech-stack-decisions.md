# Tech Stack Decisions — U7: callsite-migration

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

`technology-stack.md` の現行スタック（Bun 1.3.13・TypeScript 6.0.3・Biome・bun test・GitHub Actions）に対する本 Unit の追加分。

## 決定

| 決定 | 内容 | 根拠 |
|---|---|---|
| 新規ランタイム依存 | 追加しない。guard 走査・batch 変換・shadow 比較はすべて既存の TypeScript/Bun＋標準ライブラリ（正規表現走査・fs）で実装する | technology-stack.md の既習様式、FR-DST-1（bundle 自己完結の維持） |
| call-site guard の実装形態 | TypeScript スクリプト＋committed allowlist JSON（ratchet 判定付き）。CI では通常 lint ジョブ内の 1 ステップとして実行し、専用ジョブに分離しない | VER-4、NFR 本書 performance-requirements.md |
| 互換 Adapter の配置 | `packages/framework/core/` 配下（`component-methods.md` の migration-adapter.ts どおり）。旧 `appendAuditEntry()` シグネチャを維持し registry 引き当て → `emitEvent` へ委譲 | FR-MIG-1、BR-2 |
| shadow 比較ハーネス | U1（otel-walking-skeleton）の原型を本番化する。新規自作はしない | FR-MIG-2・VER-5、business-logic-model.md |
| 配布（FR-DST-2） | Adapter・guard が `packages/framework/core/` を変更するため、各 harness の manifest マッピングへ登録し、`bun scripts/package.ts` で全生成面（dist 7 面＋self-install 5 面）を再生成、`package.ts --check`／`promote:self:check` の drift guard を通過する | FR-DST-2、VER-6 |

## 既存スタックとの整合

- コメントは英語、判別ユニオン Result＋不変条件例外（team-practices ## Code Style）。テストは同一コミットの red-green で、順序は Adapter 委譲 → guard → shadow 比較（business-logic-model.md 検証フローどおり、VER-3 準拠）
- guard の allowlist JSON は既存の「committed baseline JSON＋--check 単調非減少」テンプレート（coverage ratchet・CCN baseline と同型）を踏襲し、新機構を持ち込まない
