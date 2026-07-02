# U001 共有インデックス生成契約

## ユニット

`intents.md` と `discoveries.md` の生成物化を、定義元の移設、再生成スクリプト、validator の不整合検査、writer skill の手順更新、既存データの適合の契約として成立させる Unit である。

## 対象要求

- R001
- R002
- R003
- R004
- R005
- R006
- R007

## 価値境界

この Unit は、インデックス専有情報のモジュールファイルへの移設、配下モジュールからの決定論的な再生成、生成マーカー、validator の不整合検査、writer skill 手順とテンプレートの更新、workspace と examples の migration を扱う。

`glossary.md`、`domain-map.md`、`context-map.md` の生成物化、repo 開発用 `CONTEXT.md`、並行実行の他候補は扱わない。

## 検証観点

- 同じ配下モジュールから常に同じインデックスが生成される（決定論性）。
- 並行する 2 つのモジュール追加を統合して再生成すると、両方の行を含むインデックスが得られる。
- 不整合（行の過不足、内容不一致、マーカー欠落）を validator が fail にする。
- 検証が実装前に失敗した記録があり、repo の標準検証から実行される。
- 配布先ユーザー環境相当で `bun` から実行できる。
- writer skill の手順から再生成の利用が読める。
- workspace と examples の 4 snapshot が新契約の下で validator pass を維持する。

## 未確認事項

- 行の並び順規則と検査の実装方式は Construction Functional Design で確定する。
- モジュールファイルへ追加する見出しの名前と位置は Construction Functional Design で確定する。

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `skills/amadeus-validator/scripts/`（再生成スクリプト新設）と `.agents/skills/amadeus-validator/scripts/` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `skills/amadeus-validator/validator/AmadeusValidator.ts`（不整合検査とマーカー検査）と昇格先 | 未確認 | なし | 未確認 |
| IT003 | amadeus-dlc/amadeus | `skills/amadeus-ideation-intent-capture/SKILL.md`、`skills/amadeus-discovery/SKILL.md`、`skills/amadeus-steering/templates/steering/` と各昇格先 | 未確認 | なし | 未確認 |
| IT004 | amadeus-dlc/amadeus | `.amadeus/intents/*.md`、`.amadeus/intents.md`、`.amadeus/discoveries.md`、`examples/*/.amadeus/`（migration） | 未確認 | なし | 未確認 |
| IT005 | amadeus-dlc/amadeus | `skills/amadeus-validator/evals/` または `dev-scripts/evals/` 配下の検証 | 未確認 | なし | 未確認 |

## 関連成果物

- [design.md](U001-shared-index-generation-contract/design.md)
