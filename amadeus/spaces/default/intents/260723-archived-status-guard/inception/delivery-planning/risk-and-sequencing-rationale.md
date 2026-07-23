# Risk and Sequencing Rationale — archived intent lifecycle

判断入力は `requirements`、`components`、`unit-of-work`、`unit-of-work-dependency`、`unit-of-work-story-map`、`team-practices`。`stories`と`mockups`はSKIPされている。

## Chosen heuristic

dependency-firstとrisk-firstのhybridを採用する。WSJFは使わない。DAGが完全な直列であり、仮の価値点や時間切迫度を付けても実行順序を変えず、精度のない数値が判断根拠を装うためである。Walking Skeletonも追加しない。brownfieldの既存CLI・registry・audit境界を変更するため、Unit境界を横断した先行sliceよりdependency-completeな小さいBoltを優先する。

## Sequence rationale

1. `status-registry`: 後続が消費する4値型、strict validator、限定transition、legacy migrationを確定する。中程度の規模で依存元がなく、後続の入力契約を最小コストで固定できる。
2. `lifecycle-transaction`: 最大リスクである原子性、永続journal、recovery、監査冪等性、HUMAN_TURN一回性を検証する。最初に置けないのはstatus contractへ直接依存するためであり、Bolt 1直後に置くことで可能な限り早く不確実性を解消する。
3. `guard-integration`: 確定済みstatusとlifecycle verbを利用者入口へ配線し、selector・`next`・`unpark`のfalling proofと配布同期で全体を閉じる。

DAGからの逸脱はない。critical pathは3 Bolt全体だが、これはtopologyの結果であり、並行可能な代替経路は存在しない。

## Risk register

| Risk | Likelihood | Impact | Earliest mitigation |
|---|---|---|---|
| journal途中障害で監査重複または状態不整合 | Medium | Critical | Bolt 2で7 failure injectionとoperationId一件性 |
| strict validatorがlegacy `closed`をmigration前に拒否 | Medium | High | Bolt 1で専用raw decoderとdecision table |
| HUMAN_TURNが別protected verbと二重消費 | Medium | High | Bolt 2で横断resolution event検査 |
| selector以外のcallerがarchived guardを迂回 | Medium | High | Bolt 3でcorpus caller列挙とfalling proof |
| core・6 harness・self-installのdrift | Medium | High | 各Boltで同期、Bolt 3で最終dist check |
| 共有ファイルの差分衝突 | Low | Medium | Bolt間直列とhelper/handler単位の所有境界 |

## Release rationale

各Boltはreview可能な独立PRだが、利用者向けreleaseは3 Boltを同一framework releaseへ統合してから行う。中間Boltを単独配布せず、adapterや外部契約だけの先行着地を避ける。
