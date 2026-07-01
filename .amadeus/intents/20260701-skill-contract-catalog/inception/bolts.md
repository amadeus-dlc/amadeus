# ボルト

## 一覧

| 識別子 | 概要 | ユニット | 要求 | 設計 | 依存 | 詳細 |
|---|---|---|---|---|---|---|
| B001 | Skill Contract 型、catalog、代表 skill 契約を追加する。 | U001 | R001, R002 | [design.md](units/U001-skill-contract-catalog-model/design.md) | なし | [B001-skill-contract-catalog-model.md](bolts/B001-skill-contract-catalog-model.md) |
| B002 | Skill Contract 生成物と `contracts:check` のずれ検出を追加する。 | U002 | R003, R004 | [design.md](units/U002-skill-contract-generation-and-drift/design.md) | B001 | [B002-skill-contract-generation-and-drift.md](bolts/B002-skill-contract-generation-and-drift.md) |
| B003 | validator、evaluator、decision review、learning review の Skill Contract 参照入口を追加する。 | U003 | R005 | [design.md](units/U003-skill-contract-consumer-integration/design.md) | B001, B002 | [B003-skill-contract-consumer-integration.md](bolts/B003-skill-contract-consumer-integration.md) |

## 依存関係

| ボルト | 依存 | 理由 |
|---|---|---|
| B001 | なし | Skill Contract catalog が後続作業の入力であるため。 |
| B002 | B001 | 生成とずれ検出は catalog を入力にするため。 |
| B003 | B001, B002 | consumer 参照入口は catalog と生成物を前提にするため。 |

## 未確認事項

- なし。
