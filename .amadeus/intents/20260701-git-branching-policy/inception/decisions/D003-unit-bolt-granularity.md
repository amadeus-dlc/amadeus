# D003: Unit と Bolt の粒度

## 背景

- Issue #254 は、policy 配置、branch lifecycle、traceability と acceptance からの参照、validator または evaluator での検出候補を含む。
- これらは同じ Git ブランチ戦略に属するが、Construction では文書配置、具体ルール、参照と検出境界を別々に確認する必要がある。

## 判断

- Unit は U001 Git ブランチ戦略 policy と U002 policy 参照・検出境界に分ける。
- Bolt は B001 policy 配置、B002 branch lifecycle ルール、B003 policy 参照と検出境界に分ける。

## 理由

- policy 配置と branch lifecycle は同じ文書群を扱うが、概要導線と具体ルールで完了条件が異なる。
- 参照と検出境界は、policy 本文の存在を前提にし、validator または evaluator と人間判断の境界を扱うため別 Unit に分ける。

## 影響

- Construction では B001 から B003 の順で Task Generation できる。
- B003 は B001 と B002 の成果に依存する。
