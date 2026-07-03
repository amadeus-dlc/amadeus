# D002：skill 一覧の処遇

## 判断

独自 skill は amadeus-grilling、amadeus-domain-modeling、amadeus-validator の 3 個だけ残す。
amadeus-learning-review、amadeus-decision-review、amadeus-history-review、amadeus-domain-grilling、amadeus-event-storming は削除する。
amadeus-steering は独立入口を退役し、Space bootstrap を 0.1 に、memory 昇格を 2.2 に畳み込む。
対応漏れ 15 skill（init 相当、utility 3 個、scope 系 4 個、Operation 系 7 個）を追加する。

## 根拠

- 判断基準「重複系は削除し、v2 に対応概念がなく優位性がある独自物は残す」。
- grilling の対話プロトコル、domain-modeling、validator の横断検査は v2 に対応概念がない優位機能である。
- メタレビュー系は v2 の Learnings Ritual（エンジン + gate 内儀式）が担う。
- 人間の指示（Intake での確定）。

## 影響

- AMADEUS.md の補助入口 6 個の記載を 3 個へ改定する。
- 削除 skill の契約参照（sensor-learn-mapping の learnings 写像など）を書き換える。

## 由来

G001 の GD003。
