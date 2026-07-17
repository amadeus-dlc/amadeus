# NFR Requirements — 明確化質問(U1 installer-enum-extension / Issue #1048)

> E-OC1 証跡(E-PM6 L1 様式): 選挙不要判定(0問)を 2026-07-16T15:18Z 頃に leader へ申告し、leader 承認 2026-07-16T15:19:33Z(agmsg 出典)。選挙対象の質問は存在しない。

上流入力(consumes 全数): `../functional-design/business-logic-model.md`(F-1〜F-4)、`../functional-design/business-rules.md`(BR-1〜6)、`../../../inception/requirements-analysis/requirements.md`(FR-1〜6・横断品質契約)、codekb の technology-stack.md(Bun/TS/ESM 台帳)。

## 既決照合(0問の根拠)

| NFR 面 | 既決の所在 |
|---|---|
| 性能 | 列挙 membership 判定のみ — 新規性能面なし。数値は強制メカニズム由来のみ引用(c3) |
| セキュリティ | 入力検証は既存 `HarnessName.parse` の保存 — 新規攻撃面・依存追加なし(build-and-test:c3 の比例選定) |
| スケーラビリティ | 7値目追加の将来条件 = FR-4 AC-4b 既決チェックリスト |
| 信頼性 | fail-fast(engine-layout.ts:15-20)+exit 2 経路の挙動保存 |
| 技術スタック | project.md 既決(Bun / TypeScript ^6 / Biome / tsc --noEmit、runtime dependency 追加禁止) |

## 選挙対象の質問

なし(0問)。
