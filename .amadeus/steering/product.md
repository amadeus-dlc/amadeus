# プロダクト概要

この文書は、複数 Intent で共有する Amadeus の能力、利用場面、価値仮説を扱う。

網羅的な機能一覧ではなく、後続の判断を導くパターンだけを記録する。

## コア能力

- Amadeus DLC の phase、成果物、gate、validator、traceability を skill と workspace 成果物として運用する。
- GitHub Issue と Intent 成果物を接続し、設計判断と PR 準備を追跡できるようにする。
- build workspace、host environment、target workspace、target artifacts を分け、自己開発で成果物の出自を記録する。

## 主要ユースケース

- Amadeus 本体の skill 変更を Intent として管理する。
- validator 変更を Intent として管理する。
- example snapshot 更新を、使った source skill の provenance とともに管理する。
- docs 更新を、対応 Issue と Intent の判断記録から追跡する。

## 価値仮説

- 自己開発用 steering layer があると、実装前の判断、検証方針、PR 準備の抜け漏れを減らせる。
- target workspace を明示すると、実行する側の skill と変更対象の成果物を混同しにくくなる。
- stage 判定を記録すると、次回作業でどの成果物を stage0 として扱えるかを人間が判断しやすくなる。
