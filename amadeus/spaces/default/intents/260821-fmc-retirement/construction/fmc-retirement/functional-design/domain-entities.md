# Domain Entities — U1 fmc-retirement

上流入力: `inception/application-design/component-methods.md` §2(fixture 形状。O-5 の 3 unit 被覆表も同 §3 — 本書は参照のみで数値を二重管理しない)・`components.md`・`services.md`、`inception/units-generation/unit-of-work.md`・`unit-of-work-story-map.md`、`inception/requirements-analysis/requirements.md`(FR-TEST-2/3)、`business-rules.md` BR-7。

## 合成 fixture プラグイン(唯一の新設エンティティ)

`tests/fixtures/conformance-fixture-plugin/`:

| 要素 | 内容 | 消費者 |
|---|---|---|
| `plugin.json` | name: `conformance-fixture`、version、stages[1]、sensors[1]、tools[1]、advisories[1](スキーマ適合の完全形) | t341・B1 16・plugin 系検査 |
| `stages/conformance-fixture-stage.md` | frontmatter スキーマ適合の最小ステージ(scopes: []、mode: inline、produces: []) | graph compile・runner-gen・conformance |
| `sensors/amadeus-conformance-fixture.md` | 最小 sensor manifest | sensor 投影検査 |
| `tools/conformance-fixture-tool.ts` | no-op CLI(exit 0、数行) | tools 投影・t3078 系 |
| advisories 宣言(plugin.json 内) | 最小 advisory 1 本(handoff_stages = 自 stage) | A2 温存 4(t2967/t378/t381)+ `tests/harness/` 改修ヘルパ |

不変条件: fixture は**データ**であり本番挙動を持たない(construction.md テストダブル原則)。plugins/ 配下に置かない。名称・散文に禁止語彙を含まない(BR-7)。

## 変更エンティティ(削除対象の実体一覧)

削除・編集対象の全数は `unit-of-work.md` write scope 2 面と census(re-scans §2〜§4)が正本 — 本書では重複列挙しない(数値の二重管理を避ける)。

## frontend 該当なし

UI エンティティなし(frontend-components.md 参照)。
