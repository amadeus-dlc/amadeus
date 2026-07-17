# Functional Design — 明確化質問(U1 installer-enum-extension / Issue #1048)

> E-OC1 証跡(E-PM6 L1 様式): 選挙不要判定(0問)を 2026-07-16T14:37Z 頃に leader へ申告し、leader 承認 2026-07-16T14:39:27Z(agmsg 出典)。選挙対象の質問は存在しない。

上流入力(consumes 全数): `../../../inception/units-generation/unit-of-work.md`(U1・embedded)、`../../../inception/units-generation/unit-of-work-story-map.md`(全 US→U1)、`../../../inception/requirements-analysis/requirements.md`(FR-1〜6)、`../../../inception/application-design/components.md`(C1〜C7)、`../../../inception/application-design/component-methods.md`、`../../../inception/application-design/services.md`。

## 既決照合(0問の根拠)

| 論点 | 既決の所在 |
|---|---|
| ビジネスロジック | 閉じ列挙の parse/列挙のみ — HarnessName brand 型+コンパニオン(harness.ts:9/:18-24)の値追加。FR-1 AC-1e で追加ロジック禁止が既決 |
| ドメインモデル | AD C1〜C7 既決(union 型・frozen 配列・ENGINE_DIR_BY_HARNESS map) |
| エラー処理 | 既存 parse 経路の挙動保存(exit 2+6値列挙 — FR-3 AC-3c、reporter.ts :137) |
| frontend / 出力 | CLI 出力契約は refined-mockups で文字列確定済み(usage 2本+invalid) |

## 選挙対象の質問

なし(0問)。
