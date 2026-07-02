# Inception 判断

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| D001 | 検査責務境界を採用する（validator = 成果物構造の検証、provenance:check = 実測値の照合、evaluator = 意味と接続性の評価）。 | accepted | なし | [D001-inspection-boundary-adoption.md](decisions/D001-inspection-boundary-adoption.md) |
| D002 | 検査対象境界を採用する（既存 Intent へ遡及適用しない。`provenance/` 存在 Intent だけを検査する）。 | accepted | D001 | [D002-inspection-scope-boundary.md](decisions/D002-inspection-scope-boundary.md) |
| D003 | `examples/skill-provenance.json` とは並立させ、統合しない。 | accepted | D001 | [D003-skill-provenance-json-coexistence.md](decisions/D003-skill-provenance-json-coexistence.md) |
| D004 | JSON スキーマの項目構成を policies.md の最低記録項目 9 項目と 1:1 対応させる。 | accepted | なし | [D004-json-schema-item-composition.md](decisions/D004-json-schema-item-composition.md) |
| D005 | Intent:Unit 1:1 を例外として認め、Inception を完了する。 | accepted | D001, D002, D003, D004 | [D005-unit-1to1-exception-and-inception-completion.md](decisions/D005-unit-1to1-exception-and-inception-completion.md) |

## 依存関係

| 判断 | 依存 | 理由 |
|---|---|---|
| D001 | なし | 検査責務境界は grilling の確定判断（GD003）から独立に固定できるため。 |
| D002 | D001 | 検査対象境界は、検査責務境界が決まってから、`provenance:check` の責務範囲として確定するため。 |
| D003 | D001 | 既存契約との関係整理は、検査責務境界が決まってから判断するため。 |
| D004 | なし | JSON スキーマの項目構成は、受け入れ条件から一意に導けるため、他の判断と独立に確定できる。 |
| D005 | D001, D002, D003, D004 | Unit 分割の例外理由と Inception 完了判断は、他の判断がすべて確定してから記録するため。 |
