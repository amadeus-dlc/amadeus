# R004 記録方法の文書整合

## 要求

`.amadeus/steering/policies.md` の provenance 記録方法が生成スクリプト前提の記述へ更新され、`.amadeus/development.md` の stage と workspace 対応記録の表が新しい記録先と矛盾しない。

## 背景

現在の policies.md「provenance の最低記録項目」と development.md「stage と workspace 対応記録」は、手書き Markdown（traceability、decisions、PR 説明）を記録先として想定した記述になっている。記録手段が生成スクリプトに変わるため、記述が実態と食い違ったままだと、エージェントが手書きに戻ってしまう。

## 受け入れ条件

- policies.md の provenance 記録方法の記述が、`provenance:generate` による生成を前提にした記述へ更新される。
- development.md の「stage と workspace 対応記録」の表の記録先が、`provenance/` を記録先の選択肢として矛盾なく含む。

## 依存

- R001
- R002

## 対応する対象境界

- SC-IN-004
- SC-IN-005

## 未確認事項

- なし。
