# Driver Contract & Selection Policy Scalability Requirements

## 上流と適用範囲

本成果物はU-01の`business-logic-model.md`、`business-rules.md`、`requirements.md`、brownfield `technology-stack.md`を消費する。U-01はlocal pure policyであり、service replica、database、queue、network load balancerを持たない。

## Capacity dimensions

| Dimension | Symbol | Current contract | Target behavior |
|---|---:|---|---|
| public requested values | Dpub | 5 | exact fixed set、動的増加なし |
| native drivers | Dnat | 4 | exact fixed set、各最大1評価 |
| harnesses | H | 4 | exact fixed set |
| Unit/topology signals | n | 既存swarm許容範囲 | time `O(n log n)`、memory `O(n)` |
| capability detail rows | c | candidate chain由来 | `O(c)` canonical projection |

## Scalability requirements

| ID | Requirement | Verification |
|---|---|---|
| U01-SCALE-01 | `n`増加でUnit/signalsをdrop/duplicateせずcanonicalizeする | property: output input-set一致 |
| U01-SCALE-02 | topology normalizationは`O(n log n)`以下、quadratic pair scanを使わない | operation count test |
| U01-SCALE-03 | additional memoryは`O(n)`以下で、cross-run cacheを持たない | heap/object count fixture |
| U01-SCALE-04 | fixed Dnat/Hの追加runtime discoveryを行わない | static dependency/registration test |
| U01-SCALE-05 | 既存swarm input上限を超える値はcaller contractで拒否し、U-01が暗黙に上限を拡張しない | boundary fixture |
| U01-SCALE-06 | concurrent caller間でshared mutable stateを持たず、同一入力が相互干渉しない | parallel pure-call test |

## Growth and change policy

driver/harness追加はhorizontal scalingではなくschema変更である。公開値、provider ownership、auto表、docs、distribution、testを同時に更新する別Intentとcontract version reviewを必須とし、plugin/dynamic discoveryで現在のclosed setを迂回しない。

Unit数のprovider固有分割はU-05などadapter ownerが扱う。U-01は順序と集合を保持するだけで、wave、worker pool、process concurrencyを持たない。

## Degradation policy

capacity pressureで入力をsample/dropしたり、unknown topologyを推測しない。不正/過大inputはtyped error、valid inputは完全評価する。cache miss、replica不足、queue overflowは構成要素がないためN/Aである。

