# Tech Stack Decisions — U2: event-registry

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

`technology-stack.md` の現行スタック（Bun・TypeScript・Biome・bun test）に対する本 Unit の追加分。

## 決定

| 決定 | 内容 | 根拠 |
|---|---|---|
| 新規依存 | なし。Registry は TypeScript の型（文字列リテラル union）と Map による定義表で実装し、既存スタック内で完結する | FR-EVT-1、technology-stack.md |
| 型による排除 | `RegisteredEventName` union 型で未登録名を compile-time に排除し、runtime 検証は `getEventDef` の引当てで補完 | BR-2、U1 BR-9 の本番化 |
| drift guard | 3層（compile-time 型・unit test・sensor manifest `amadeus-event-registry-drift` を `.kimi-code/sensors/` へ追加） | VER-1 |
| 標準 NodeSDK 等 | 導入しない（U1 と同一方針） | FR-EXP-6 |

## 配置と配布（FR-DST-2）

- `event-registry.ts` は `packages/framework/core/otel/`（U1 の配置決定）に従い、state machine 参照の静的抽出対象は `packages/framework/core/tools/amadeus-state.ts` と hooks を正本とする
- `packages/framework/core/` への変更は manifest マッピングへの登録＋`bun scripts/package.ts` による全生成面（dist 7 harness・self-install 5 面）の再生成を必須とし、`bun scripts/package.ts --check`／`bun run promote:self:check` の drift guards を通過する（FR-DST-2）
- コメントは英語、1ファイル1責務、判別ユニオン Result＋不変条件例外（team-practices ## Code Style）に従う
- テストは同一コミットで red-green、VER-3 のテスト先行契約に従い drift guard 拒否ケースを先行させる
