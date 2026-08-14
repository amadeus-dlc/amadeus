# Logical Components — plugin-settings-core

上流入力: `functional-design/business-logic-model.md`(ワークフロー 1〜3)、`functional-design/domain-entities.md`(型)。

## 論理コンポーネント配置

| 論理コンポーネント | 物理配置 | 責務 |
|---|---|---|
| SettingsDeclarationParser | `packages/framework/core/tools/amadeus-plugin-compose.ts` 内の `parseSettings`(+ 綴り誤り検査) | 宣言の fail-closed parse(ワークフロー 1) |
| PluginSettingsConfigParser | `packages/framework/core/tools/amadeus-config.ts` 内の `parsePluginSettings` + registry エントリ | override の字句検証・層マージ(ワークフロー 2) |
| SettingsResolver | `packages/framework/core/tools/amadeus-sensor.ts` 内の `resolvePluginSettingsForSensor` | 宣言×override の突合・argv 付与(ワークフロー 3) |

## 配置原則

- 3 コンポーネントとも既存ファイルへの追加(新規ファイルなし)— 変更理由がそれぞれのファイルの既存責務(manifest parse / config parse / sensor dispatch)に凝集するため。ファイル間の新規依存は追加しない(sensor.ts は既に config/composition を読む)。
- テストは各コンポーネントの既存テスト系列(unit)+ 結合(integration)に配置し、source と test の ownership を U2 境界に揃える(cid:units-generation:c1)。
- 性能・スケーラビリティ・信頼性設計: kind=library(常駐なし・純関数中心)につき produces_kinds 対象外(1 行理由 — parse/resolve は同期・小データで性能予算の対象外。NFR-1 の対象は U3 の fetch)。
