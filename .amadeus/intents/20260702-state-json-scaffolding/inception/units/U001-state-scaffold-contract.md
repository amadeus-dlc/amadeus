# U001 state.json 雛形生成契約

## ユニット

phase 遷移の `state.json` 雛形生成を、`amadeus-validator` の同梱スクリプトと phase skill の手順参照の契約として成立させる Unit である。

## 対象要求

- R001
- R002
- R003
- R004
- R005
- R006

## 価値境界

この Unit は、6 遷移の雛形生成と既存値保持の契約、スクリプトの同梱配置と配布先実行、phase skill の手順からの参照、eval 先行の検証、promote 同期を扱う。

成果物 Markdown の自動生成、validator の要求構造そのものの変更、repo root の dev-scripts への配置は扱わない。

## 検証観点

- 6 遷移それぞれで、生成直後の `state.json` に対して validator が構造 fail を出さない。
- 同じ遷移で再実行しても結果が変わらず、既存の値と前 phase のブロックが保持される。
- スクリプトの eval が実装前に失敗した記録があり、repo の標準検証から実行される。
- 配布先ユーザー環境相当で `bun` から実行できる。
- 対象 phase skill の手順からスクリプトの利用が読める。
- source と昇格先が promote 手順で同期され、`npm run test:it:promote-skill` が pass する。

## 未確認事項

- スクリプトの引数体系と、参照を追加する手順の正確な範囲は Construction で確定する。

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `skills/amadeus-validator/scripts/`（新設）, `.agents/skills/amadeus-validator/scripts/` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `skills/amadeus-validator/evals/` または `dev-scripts/evals/` 配下の eval | 未確認 | なし | 未確認 |
| IT003 | amadeus-dlc/amadeus | state 更新手順を持つ phase skill の SKILL.md（intent-capture、inception、functional-design、bolt-preparation、construction traceability-finalization）と各昇格先 | 未確認 | なし | 未確認 |
| IT004 | amadeus-dlc/amadeus | `package.json`（eval の実行入口） | 未確認 | なし | 未確認 |

## 関連成果物

- [design.md](U001-state-scaffold-contract/design.md)
