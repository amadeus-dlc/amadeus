# Risk and Sequencing Rationale

## 計画入力

順序判断は `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md` を根拠とする。optional inputの`stories.md`と`mockups.md`は本scopeでは存在しない。DAGは一本道であるため、依存を破る経済的な順序変更は行わない。

## Selected Heuristic

walking-skeleton-firstとrisk-firstのhybridを採用する。Bolt 1でaudit ledgerからstate commitまでの最小end-to-end transactionを作り、最も重大なTOCTOU・audit atomicity・human-control risksを先に検証する。Bolt 2でharness投影と全回帰を収束させる。

数値WSJFは使わない。2 Bolt間にはhard dependencyがあり、value scoreで順序を逆転できないためである。これはWSJFを否定する判断ではなく、本intentではDAGと安全性が支配的という判断である。

## Risk Register

| Risk | Likelihood | Impact | Earliest mitigation | Owner Bolt |
|---|---|---|---|---|
| route後にgrantが失効・取消されてもstageが完了する | Medium | Critical | deterministic clock/revoke seamとlock内exact-ID revalidation | Bolt 1 |
| carrierまたは後発grantへ置換される | Medium | Critical | protected receiptのexact Route Id/Stage/Grant Id照合 | Bolt 1 |
| fallbackがERROR_LOGGEDやcompletion auditを残す | Medium | High | typed `await-approval` wireとbefore/after audit delta fixture | Bolt 1 |
| walking-skeleton/phase-boundary/per-unit gateを誤認可する | Medium | High | shared classifierとpolicy matrix fixture | Bolt 1 |
| team leader/delegation経路を変更する | Low | Critical | team finderを分離しgolden/integration regressionを固定 | Bolt 2 |
| harnessごとにconductor意味論がdriftする | Medium | High | canonical sourceから6 harness再生成とdist check | Bolt 2 |
|巨大core fileへ条件分岐が拡散する | Medium | Medium | domain query、directive、orchestration、state transactionの既承認ownershipを維持 | Bolt 1 |

## Dependency Validation

- Bolt 1内では`grant-authorization-domain`を`solo-gate-transaction`が利用する。
- Bolt 2の`harness-contract-and-regression`はBolt 1のdirective/wire/audit contractに依存する。
- Bolt 2をBolt 1より前または並行に実行する案は、未確定contractの投影を生むため不採用。
- Bolt 1をU1だけにする案はend-to-end Walking Skeletonにならないため不採用。
- 3 Unitを1 Boltにまとめる案は安全coreと配布回帰のfeedback boundaryを失うため不採用。

## Confidence Progression

Bolt 1完了で「solo grant authorizationが安全なtransactionとして成立する」という技術的信頼を得る。Bolt 2完了で「全harnessへ同じ意味で配布でき、team/human経路を壊さない」という互換性とrelease readinessの信頼を得る。
