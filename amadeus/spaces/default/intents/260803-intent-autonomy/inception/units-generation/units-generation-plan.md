# Units Generation 分解計画 — Redo

## 状態と方針

- **状態:** Redo計画承認済み
- **方式:** vertical end-to-end behavior slice
- **Unit数:** 5。上流behaviorと独立した合否判定から再導出し、以前の6 Unit決定は引き継がない
- **上流正本:** `application-design/components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md`、`requirements-analysis/requirements.md`
- **story source:** `requirements.md`のUSR-01〜10、FR/NFR、58 Issue AC。User Stories stageはSKIP済みで、新storyは作らない

UnitはファイルやM00〜M09を排他的に所有しない。M00〜M09のcomponent ownershipはApplication Designどおり維持し、各Unitは一つの利用可能なbehavior sliceを成立させるために必要なowner moduleへ変更を加える。新しいport / flag / adapterは、そのslice内のproduction consumer、配線、contract testと同居させる。

## Vertical Unit

| ID | Unit slug | 完結させるbehavior | 主なIssue | 相対規模 | 手書きsource + tests見積り |
|---|---|---|---|---|---|
| U1 | `loop-monitor-runtime` | manifest compileからproduction event delivery、Judge/latch/replay、5harness contract/liveまで | #2095 | L | 2,200〜3,400行 |
| U2 | `quality-repair-runtime` | Plugin activationからevidence収束、replan/stalled、status/replay、5harnessまで | #2096 | L | 1,500〜2,400行 |
| U3 | `intent-autonomy-runtime` | mode/grant/decision、atomic exercise、stop/resume、legacy migration、harness contractまで | #2067 core | XL | 3,000〜4,800行 |
| U4 | `autonomy-review-observability` | active/completed decision view、accept/flag、status、Event Registry/OTel、UXまで | #2067 observability | M | 900〜1,500行 |
| U5 | `five-harness-intent-completion` | credential-attested live receipt、5harness完了判定、atomic Intent completion、persistenceまで | #2067 completion | L | 1,700〜2,700行 |

合計9,300〜14,800行、確度medium。生成・promote mirrorを除く。これはbudgetではなく肥大検知用のplanning evidenceである。

## 依存トポロジー

| Unit | 直接依存 | behavior上の理由 |
|---|---|---|
| U1 | なし | #2095のgeneric Monitor verticalを最初の利用可能sliceとして閉じる |
| U2 | U1 | #2096はU1のMonitor contribution / Judge contractを使う |
| U3 | U1、U2 | #2067はMonitorとQuality Repairの安全停止/健全化を利用する |
| U4 | U3 | review/status対象となるauto decision / grant projectionを利用する |
| U5 | U3、U4 | terminal completionとcompleted review/statusの整合を同じfinal stateで検証する |

このDAGはtopologyだけを表し、実装順、critical path、Bolt grouping、価値/リスク優先順位はDelivery Planningへ委ねる。独立な並行集合は宣言しない。

## Vertical sliceの完結条件

- Core pure behaviorだけで終わらず、M06 production orchestration、M07 canonical event/status/replay、必要なM08 registry/native facts、M09 contract/live fixtureまで同じUnitへ含める。
- 既存moduleのownerを移動しない。Unitがmoduleへ新しいinterfaceを足す場合は、同じUnit内にproduction call siteとfail-closed testを持つ。
- Harness registry/driverの変更は、そのUnitで有効になるbehaviorだけを宣言し、flag・adapter・配線・testを同時に変更する。
- Generic live authorizationは最初にlive smokeを必要とするU1で実装・配線し、U2〜U5は同じcommitted authorization contractを再利用する。U5は認可経路を新設せず、5harness集合とterminal completionだけを追加する。
- Unit単体の完了時に、少なくとも一つのend-to-end scenarioが既存Bun CLIから実行可能である。

## 配布と再利用

- 既存Bun短命CLI、audit lock/shard、runtime graph、Plugin composition、reviewer/sensor evidence、Event Registry/OTel、package/setup/promote、Bun test/harness runnerを再利用する。
- 新DB、常駐supervisor、外部runner、harness固有algorithm、別telemetry schema、新CI frameworkを作らない。
- `dist/`とpromoted suffixは正本から生成し、手編集しない。

## 回答・矛盾分析

- ユーザーはReviewer上限後にvertical end-to-end sliceでRedoし、Unit数も再導出する方針を選択した。
- 5 UnitはM05/M06→M08のmodule依存をUnit edgeへ直接写像しない。各vertical内で既存owner moduleを共同変更するため、component依存とUnit依存を混同しない。
- M08/M09の未設計extension APIは前提にしない。各verticalは既存registry authoring sourceとadapter入力を、実装・配線・testと同時に変更する。
- User Stories stageのSKIPと`requirements.md`内USR-01〜10は矛盾しない。既存scenarioだけをmapする。
- 未解決のmaterial ambiguityはない。
