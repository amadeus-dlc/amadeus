# Delivery Planning 質問 — 260722-tla-plugin

> E-OC1 証跡: ソロモード・選挙不要判定(根拠種別: ユーザー本人の HUMAN_TURN 直接回答 — Guide me)。ユーザー承認タイムスタンプ: 2026-07-22T13:22:07Z(Q1=A)
> モード: Guide me
> 上流入力(consumes 全数): requirements、components、unit-of-work、unit-of-work-dependency、unit-of-work-story-map、team-practices(すべて読了)

## Q1. Bolt 編成と walking skeleton の範囲

事実: UG レビューで U2(plugin-skeleton)は U3+U5 の両方に依存すると確定(sensors 宣言の compile 検証)。当初 scope-document の skeleton 想定(P1+P2)は依存上そのままでは最初の Bolt にできない。DAG: U1 → {U3, U5} → U2、U3 → U4。

- A. 4 Bolt 編成(推奨): Bolt 1(walking skeleton・ゲート付き)= U1+U3 — 最薄の E2E(外部化モデルの完全探索1回、R4 潰し)。Bolt 2 = U5(U1着地後、並行余地あり)。Bolt 3 = U2(plugin E2E、R3 潰し)。Bolt 4 = U4(CI 統合)。依存を尊重しつつ各 Bolt が独立に検証可能
- B. 3 Bolt 編成: Bolt 1 = U1+U3+U5(skeleton 大きめ)、Bolt 2 = U2、Bolt 3 = U4
- X. Other (please specify)

[Answer]: A — 4 Bolt 編成(Bolt 1 = U1+U3 walking skeleton・ゲート付き / Bolt 2 = U5 / Bolt 3 = U2 / Bolt 4 = U4)(2026-07-22T13:22:07Z, Guide me)

## 回答分析(contradiction analysis)

1問・回答済み。scope-document の skeleton 想定(P1+P2)との差(U2 を skeleton から外す)は、UG レビューで確定した真の依存(U2←U3+U5)に基づく sequencing の経済判断であり、risk-first 裁定(2大リスクの早期潰し: R4 は Bolt 1、R3 は Bolt 3)は維持される。矛盾なし。
