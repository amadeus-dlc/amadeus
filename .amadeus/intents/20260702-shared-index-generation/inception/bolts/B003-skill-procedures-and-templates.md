# B003 writer skill 手順とテンプレートの更新

## 概要

共有インデックスを更新する skill の手順を「行の手書き追加」から「モジュールファイルへの記述 + 再生成の実行」へ更新し、steering テンプレートの index 雛形を生成マーカー付きの形へ差し替え、promote で昇格先を同期する。

## 対象ユニット

- U001

## 設計

- [design.md](../units/U001-shared-index-generation-contract/design.md)

## 完了条件

- `amadeus-ideation-intent-capture` と `amadeus-discovery` の手順から、再生成スクリプトの利用が読める。
- steering テンプレートの `intents.md` と `discoveries.md` の雛形が生成マーカー付きの形になっている。
- source skill と昇格先が promote 手順で同期され、`npm run test:it:promote-skill` が pass する。
- skill 変更 PR がレビュー支援契約（挙動差分要約、skill-forge 確認、粒度制約）に従っている。

## 依存

- B001

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `skills/amadeus-ideation-intent-capture/SKILL.md`、`skills/amadeus-discovery/SKILL.md` と各昇格先 | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `skills/amadeus-steering/templates/steering/intents.md`、`discoveries.md` と昇格先 | 未確認 | なし | 未確認 |

## 未確認事項

- 手順を更新する skill の全リスト（intent-capture、discovery 以外に index を書く手順を持つ skill の有無）は Task Generation の前に洗い出して確定する。
