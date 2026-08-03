# Scalability Requirements — mirror-persistence-propagation

## 適用範囲と上流トレーサビリティ

本書は `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md` を入力とする。対象は単一CLI invocation内のローカルstate／audit／outbox処理であり、水平スケール、multi-region、load balancer、database shardingは非適用である。

スケールの主軸は同時ユーザー数ではなく、audit件数、state bytes、failure injection数、harness投影数である。公開挙動とbyte parityを維持したまま、入力増加に対して無制限retryや重複appendを生じさせないことを要求する。

## 容量と増加率の要件

| ID | 次元 | 要求 | 合格条件 |
|---|---|---|---|
| SCALE-MPP-01 | invocation | current transitionをinvocationあたり最大1回評価する | call counterが0または1 |
| SCALE-MPP-02 | audit | transaction identityごとの新規audit appendを最大1件にする | repeated drain後も重複0件 |
| SCALE-MPP-03 | outbox | pending transactionを単一の完全なoutboxとして保持する | append／clear失敗後も次回parse可能な1件 |
| SCALE-MPP-04 | state size | parse／render／digest計算は入力bytesに対して線形処理を維持する | 新規の全件二重scan、二重serialization、再帰処理なし |
| SCALE-MPP-05 | distribution | canonical sourceの変更を既存packagerで全harnessへ投影する | package／promotion drift guardがgreen、手編集0件 |

## 負荷時の劣化方針

入力が大きい、auditが増えている、またはfilesystemが遅い場合でも、タイムアウトを成功へ丸めない。既存の上限・OS errorをtyped failureとして呼出元へ返し、state、audit、outboxの正しさを優先する。

prior outboxがある場合はmaintenance-only invocationとして終端する。この分離により、audit量やI/O遅延が増えても、prior transactionの収束とcurrent transitionが同一invocation内で連鎖して処理量を増幅しない。

## 採用しないスケーリング機構

次の機構は `requirements.md` と `business-rules.md` の境界外であり、導入しない。

- キャッシュ：強整合なstate／audit判定を古い値で置換する危険がある
- 非同期queue／daemon：新しい常駐runtimeと障害面を追加する
- horizontal scaling／sharding：単一ローカルstateの排他更新契約と不整合
- circuit breaker：外部dependencyが存在しない
- 自動retry：FR-10の呼出前bytes baselineと明示的な後続invocation境界を壊す

## 容量検証

Build and Testでは、既存代表stateと拡大fixtureを用いて処理回数、audit重複、outbox件数、serialization回数を計測する。性能値そのものより、入力増加で構造的上限が破れないことをassertする。

全体の no-silent-drop corpus走査、baseline規模、15秒cold／warm制約は別Unitが所有する。本Unitはそれらのscanner容量要件を重複実装せず、`mirror-persistence-propagation` の局所境界だけを検証する。
