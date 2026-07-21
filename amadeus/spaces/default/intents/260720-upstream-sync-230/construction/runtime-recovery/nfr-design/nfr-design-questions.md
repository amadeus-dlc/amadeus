# NFR Design Questions — runtime-recovery

> 上流入力(consumes 全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。
>
> 対象: engine順U10 / 正本Unit U02 `runtime-recovery`。承認済みNFRと正準2 public seamを既存orchestrate/state/audit-lock/package/test境界へ機械配置する。
>
> E-OC1 判定: **質問0問**。E-USSU10ND1 recorded裁定 `2026-07-21T02:36:05Z`。

## 質問不要の根拠

- DAG recovery: `recoverBoltDag`はcanonical dependency artifact、runtime cache、none/ok/malformed closed result、3 consumer共通Unit集合、read-side mutation 0へ固定済みである。
- Gate revision: `recoverGateRevision`は関連6 event、Timestamp+buffer position、organic anchor/human pivot/declared-produces write/reject absenceのclosed predicateだけを使う。
- Atomicity: Recovered 3 + normal 2の5 blockをmemory生成・全数検証し、既存lock内で単一atomic commit後に最終stateを1回writeする。failure時双方bytes不変、commit後state failureは完全batch再利用で収束する。
- Scalability: 3 consumer、6 harness、4 self-installの既決closed inventoryをgenerator/fixtureで全数検査する。
- Logical components: DAG source parser/resolver、runtime consumer adapters、audit evidence normalizer、revision predicate、batch builder/validator、既存audit-lock commit/state writer、package/test境界へ閉じる。

新public API、transaction identity、recovery/failure policy、event type、consumer、layout、cache/store、SLO、service、network、databaseを選ぶ余地はない。成果物化中に新判断が必要になった場合は確定前にleaderへ再付議する。

## [Answer]

[Answer]: 質問0問で可 — 既決契約からの機械導出。E-USSU10ND1はchoice 1を3票、choice 2/3を0票、GoA 1を3票で裁定した（開票 `2026-07-21T02:36:05Z`）。承認範囲は正準2 seam、canonical dependency artifact優先、read-side mutation 0、none/ok/malformed closed result、3 consumer共通Unit集合、関連6 event正規化、5 block事前生成・全数検証・既存lock内単一atomic commit・最終state 1回write、failure時audit/state bytes不変、commit後state failureの完全batch再利用とaudit重複0収束を既決境界から機械導出する範囲に限定する。新public API、新transaction identity、新recovery/failure policy、新event/consumer/layout/cache/store/SLO/service/network/databaseは追加しない。
