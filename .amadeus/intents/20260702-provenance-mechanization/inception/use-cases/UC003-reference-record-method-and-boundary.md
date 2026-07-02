# UC003 記録方法と検査責務境界を参照して判断する

## ユースケース

Maintainer が記録方法（policies.md、development.md）と検査責務境界（decisions）を参照して、記録の生成手順と検査の所在を判断する。

## アクター

- ACT001 Maintainer

## 外部システム

- なし

## 事前条件

- policies.md の provenance 記録方法が生成スクリプト前提の記述へ更新されている。
- development.md の stage と workspace 対応記録の表が新しい記録先と矛盾しない。
- 検査責務境界（validator、provenance:check、evaluator）が decisions に記録されている。

## 基本フロー

1. Maintainer は、PR やレビューの場面で provenance 記録の生成手順を確認する必要が生じる。
2. Maintainer は、policies.md の provenance 記録方法と development.md の stage と workspace 対応記録の表を参照する。
3. Maintainer は、検査（成果物構造の検証、実測値の照合、意味と接続性の評価）がどこで行われるかを判断する必要が生じた場合、decisions の検査責務境界の記録を参照する。
4. Maintainer は、参照した内容をもとに変更範囲、検証結果、次回 stage0 採用可否を判断する。

## 代替フロー

| 条件 | 扱い |
|---|---|
| policies.md と development.md の記述が矛盾している。 | 記述整合の不足として報告し、B003 の完了条件に照らして補修する。 |
| 検査責務境界が decisions から追跡できない。 | 親 Issue #315 の受け入れ条件を満たしていないとして報告する。 |

## 対応要求

- R004
- R005

## 未確認事項

- なし。
