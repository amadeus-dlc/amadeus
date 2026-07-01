# U001: README skill 役割整合

## ユニット

README の skill 分類と実在する `amadeus-*` skill の役割をそろえる。

## 対象要求

- R001
- R004
- R005

## 価値境界

- README が公開入口を案内する文書なのか、内部 skill 一覧も扱う文書なのかを判断できることを扱う。
- README に載せる Phase Skills、Cross-Cutting Support Skills、Internal Skills の分類基準を扱う。
- 互換性維持対象がない場合に、旧入口や別名を追加しない判断を扱う。
- skill 本文そのものの詳細 review は U002 で扱う。

## 検証観点

- README の skill 分類と実在する `amadeus-*` skill 一覧を照合している。
- 公開入口 skill と内部 skill の扱いを説明できる。
- 互換性維持対象の有無を確認している。
- README 変更が必要な場合の検証条件を後続へ渡している。

## 未確認事項

- README に内部 skill を全列挙するか、分類方針だけを明確にするかは Construction で確定する。

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `README.md` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `README.ja.md` | 未確認 | なし | 未確認 |
| IT003 | amadeus-dlc/amadeus | `docs/backward-compatibility.md` | 未確認 | なし | 未確認 |

## 関連成果物

- [design.md](U001-readme-skill-role-alignment/design.md)
