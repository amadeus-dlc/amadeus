# Delivery Plan — Risk and Sequencing Rationale

## 上流入力

本判断は`requirements-analysis/requirements.md`、`application-design/components.md`、`units-generation/unit-of-work.md`、`units-generation/unit-of-work-dependency.md`、`units-generation/unit-of-work-story-map.md`に基づく。`stories.md`、`mockups`、`team-practices`は対応stageがSKIPのため存在せず、requirementsのUSR-01〜10と適用済みlayered rulesを利用する。

## Sequencing heuristic

**walking-skeleton-first + blocker-first + risk-first**を採用する。U1をWalking SkeletonとしてCore→production wiring→audit/status/replay→5harness検証の縦断seamを最初に成立させ、その上に#2096のrepair safety、#2067のgrant / decision、事後review、最終live completionを積む。

WSJFの数値scoreは使わない。business value、time criticality、cost of delayの実測値がなく、架空値は順序の根拠を強く見せるだけだからである。相対規模は実装量とintegration riskの把握にだけ使う。

## 選定順序の根拠

| 順位 | Bolt | 経済・risk理由 | DAG妥当性 |
|---:|---|---|---|
| 1 | U1 `loop-monitor-runtime` | #2095は#2096と#2067のsafe-loop blocker。最小end-to-end seamを先に実証する | dependencyなし |
| 2 | U2 `quality-repair-runtime` | NOT READYを健全化するbounded repairが、`semi/full`の継続安全性を先に閉じる | U1へ依存 |
| 3 | U3 `intent-autonomy-runtime` | grant / decision / atomic effectは最大の権限・整合性riskで、U1/U2がないと安全に成立しない | U1/U2へ依存 |
| 4 | U4 `autonomy-review-observability` | U3のcanonical decisionができてから、事後reviewとseal維持を閉じる | U3へ依存 |
| 5 | U5 `five-harness-intent-completion` | 最終revisionでだけ有効な5harness live evidenceを最後に収集し、terminal transactionを閉じる | U3/U4へ依存 |

`unit-of-work-dependency.md`のtopological orderと一致し、deviationはない。critical pathはU1→U2→U3→U4→U5の全長である。

## Risk register

| Risk | 可能性 | 影響 | 先行手当 / mitigation | 残余risk |
|---|---|---|---|---|
| Monitorがharness固有実装へ分岐する | 高 | 高 | U1でCore contract、single registry、5harness contractをWalking Skeletonとして固定する | native adapter capability差 |
| repair loopがchurnしIntentを止め続ける | 高 | 高 | U2でT/T+1、replan先行、fixed-point / churn / regression、`REPAIR_STALLED`を決定論的に検証する | 新しいevidence pattern |
| grant exerciseとeffectが部分commitになる | 中 | 致命的 | U3でreserve / replay / revalidateとatomic event bundleを実装し、crash boundaryを検証する | provider side effectの物理保証 |
| 自動裁定がcompleted sealを破る | 中 | 高 | U4で`AUTO_DECISION_REVIEWED`限定append、cross-Intent拒否、seal維持を検証する | UX上の誤読 |
| 中間live receiptが後続変更で陳腐化する | 高 | 高 | 中間liveは暫定扱いにし、U5で最終revision / package digestへ全件を再束縛する | live実行時間 |
| 5harness credential / native環境が揃わない | 中 | 致命的 | U1〜U4はcontractで進め、U5だけを`AWAITING_HUMAN`へparkする。skipをpassにしない | 外部準備待ち |
| owner module重複で並行branchが衝突する | 高 | 高 | dependency-free pairを宣言せず、5 Boltを直列化する | Bolt内の編集競合 |
| PR / runnerをCore completionへ混入する | 中 | 高 | PR/merge、外部runner/supervisorを明示的scope外とし、Coreはprotocol stateだけを所有する | 後続integrationとの接続設計 |

## 検討した代替案

| 代替 | 採用しない理由 |
|---|---|
| U1〜U3を最初のWalking Skeletonへ束ねる | blocker別の独立検証と小さいfailure localizationを失う |
| U1〜U5を単一Boltにする | Units Generationの5 vertical Unit境界と段階的confidence buildingを無効化する |
| 各Boltで5harness live receiptをhard gateにする | credential不在が中間進行を止め、後続変更のたびに陳腐化するliveを反復する |
| U5までliveを一切行わない | native adapter defectの早期検出を弱めるため、利用可能な中間liveは暫定実測する |
| DAG上の見かけ上の独立性で並行化する | 全UnitがM06/M07/M08/M09等を共有し、安全なdependency-free pairがない |

## Confidence ladder

1. U1で「harness-neutral Core seamが実在する」を検証する。
2. U2で「不健全状態をboundedに修復または停止できる」を検証する。
3. U3で「事前承認grant内だけを原子的に自動裁定できる」を検証する。
4. U4で「自律進行後も人間が追跡・評価できる」を検証する。
5. U5で「現行5harnessが最終revisionでIntent終端を実証した」を検証する。

## Functional Designへの持越し

- U5がU1のgeneric `LiveAuthorizationPort`を利用するときのproduction authorization pathを、parallel pathなしで明示する。
- Judge providerについて、Amadeusが保証するcanonical exactly-onceと外部provider side effectの物理的exactly-onceの境界を明示する。
