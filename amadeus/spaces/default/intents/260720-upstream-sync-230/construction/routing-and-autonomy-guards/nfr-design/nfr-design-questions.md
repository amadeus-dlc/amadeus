# NFR Design Questions — routing-and-autonomy-guards

> 上流入力(consumes 全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。
>
> 対象: engine順U09 / 正本Unit U04 `routing-and-autonomy-guards`。承認済みNFRと正準3 public seamを既存CLI、Stop hook、doctor、recompose、package/test境界へ機械配置する。
>
> E-OC1 判定: **質問0問**。E-USSU09ND1 recorded裁定 `2026-07-21T02:17:53Z`。

## 質問不要の根拠

- Performance: `classifyHelpIntent`は共有decision tableの有界token走査、`inspectComposeMarker`は単一stat/注入clock/単一定義24時間TTL、`assertRecomposeAllowed`はmutation前のpure guardへ閉じる。新SLO、cache、queue、pollingはない。
- Security: help namespaceとreserved slug、unknown switch、marker freshness、autonomous recomposeの拒否条件が既決である。新permission、credential、network、database、serviceを追加しない。
- Reliability: age=24h fresh、24h+1ms stale、future mtime age0、non-autonomous staleのbest-effort unlink、autonomous時marker未読/janitor N/A、doctor read-only、recompose denied時の全bytes不変が閉じている。
- Scalability: help 3入口、marker単一path/TTL、現行6 harness projection、4 self-install closed listを既存generatorとtable-driven fixtureで全数検査する。
- Logical components: shared help classifier、namespace guard adapters、marker inspector、Stop hook/doctor adapters、recompose guard、既存audit-lock transaction、package/self-install projector、fixturesへ閉じ、新componentやstoreを作らない。

新public API、TTL、fresh/stale境界、autonomous marker policy、janitor failure policy、doctor mutation、recompose remediation、projection scope、failure classification、runtime dependency、SLO、service、AWS infrastructureを選ぶ余地はない。成果物化中にこれらの新判断が必要になった場合は確定前に停止し、再付議する。

## [Answer]

[Answer]: 質問0問で可 — 既決契約からの機械導出。E-USSU09ND1はchoice 1を3票、choice 2/3を0票、GoA 1を3票で裁定した（開票 `2026-07-21T02:17:53Z`）。承認範囲は正準3 seam、help decision table、単一定義24時間TTL、non-autonomous staleのみbest-effort unlink、autonomous時marker未読、doctor read-only、全mutation前のrecompose拒否、denied時のstate/plan/graph/audit bytes不変を既決契約から機械導出する範囲に限定する。新public API、新TTL・境界・autonomy policy・failure policy・remediation・projection scope・failure分類・runtime dependency・SLO・service・AWS infrastructureは追加しない。
