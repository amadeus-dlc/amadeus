# Requirements Analysis Questions — Intent-scoped Autonomy

## 回答方法

- 選択: Chatで一問ずつ進める
- 方針: [#2067](https://github.com/amadeus-dlc/amadeus/issues/2067)、[#2095](https://github.com/amadeus-dlc/amadeus/issues/2095)、[#2096](https://github.com/amadeus-dlc/amadeus/issues/2096)に明記済みの事項は再裁定しない。Issue間または既存contractとの抜け漏れ・矛盾だけを回答対象とする。

## 上流根拠

- `intent-statement`: Intentの目的、Issue Fidelity Rule、GAP-01〜09を引き継ぐ。
- `scope-document`: In Scope / Out of Scope、依存順、GAP-01〜13を引き継ぐ。
- `business-overview`: 現行の利用者、価値、5harness境界を引き継ぐ。
- `architecture`: 現行のmode、grant、reviewer、sensor、audit、harness責務の接続点を引き継ぐ。
- `code-structure`: 実装面とテスト面の配置、および将来harness追加時の変更面を引き継ぐ。
- Reverse Engineeringの差分refreshで追加確認したGAP-14〜21を含める。

## 質問

### Q1. grantの認可状態・実行状態・mode移行をどのcontractに統一しますか？

対象: GAP-01、GAP-12、GAP-13、GAP-19。Issueは`full`だけがgrantで自動裁定し、`semi`はphase境界と質問を人間が裁定すると定めています。一方、現行実装には`unset / autonomous / gated`、4時間TTL grant、Walking Skeleton常時gateが残っています。

A. 認可ライフサイクルと実行可否を直交させる。grantは`active / revoked / completed`、実行可否は`running / suspended`とし、`semi`はgrantを発行しない。旧`unset / gated / autonomous`はすべて安全側の`none`へ移行し、人間の明示操作なしに`full` grantを作らない（推奨）
B. 単一のgrant stateへ`active / suspended / revoked / completed`を保持し、`semi`にもgrantを発行する
C. 単一のgrant stateを使うが、`semi`にはgrantを発行せず、旧`autonomous`だけを`full`へ自動移行する
D. 現行`autonomous / gated`を互換層として恒久維持し、新modeと併存させる
E. mode移行時は既存active Intentをすべてhard failureにし、手動変換を必須にする
X. Other (please specify)

[Answer]: A — 認可ライフサイクルと実行可否を直交させる。grantは`active / revoked / completed`、実行可否は`running / suspended`とし、`semi`はgrantを発行しない。旧`unset / gated / autonomous`はすべて安全側の`none`へ移行し、人間の明示操作なしに`full` grantを作らない。

### Q1a. 既存の常任委任グラントを新しい自律レベルへどう移行しますか？

対象: GAP-22。既存の[#1125](https://github.com/amadeus-dlc/amadeus/issues/1125)と[#1466](https://github.com/amadeus-dlc/amadeus/issues/1466)は、実在する人間の入力に基づく期限付き`stage-gates`権限を使い、teamの`delegate-approval`とsoloの通常gate承認を省略します。既定TTLは4時間ですがCLIで変更でき、phase境界は明示opt-in、Walking Skeletonは対象外です。`semi`は通常のphase内gateを自動承認するため主要用途を包含し、`full`はphase境界・Walking Skeleton・質問までIntent-scopedに扱います。一方、現行grantのspace横断team委任は、対象Intentごとのmode/grant指定へ置き換えないと[#1125](https://github.com/amadeus-dlc/amadeus/issues/1125)の停滞が再発します。

A. 現行常任グラントを廃止し、`semi` / `full`へ統合する。teamの子Intentにも実在する人間が対象Intentを指定してmode変更または`full` grant発行できるようにし、space横断の一括権限は作らない。既存recordはaudit/replay用に保持するが認可へ自動変換せず、移行後はfail-closedな診断を出して使用しない（推奨）
B. 新規発行を廃止し、既発行grantだけTTL切れまで現行挙動を維持した後、`semi` / `full`へ統合する
C. solo用途だけ`semi`へ統合し、team間`standing-delegation`は別domainとして維持する
D. 既存常任グラントをsolo/teamとも現状のまま維持し、新しいgrantと併存させる
E. 既存常任グラントを新しい`full` grantへ自動変換し、TTLを除去する
X. Other (please specify)

[Answer]: A — 現行常任グラントを廃止し、`semi` / `full`へ統合する。teamの子Intentにも実在する人間が対象Intentを指定してmode変更または`full` grant発行できるようにし、space横断の一括権限は作らない。既存recordはaudit/replay用に保持するが認可へ自動変換せず、移行後はfail-closedな診断を出して使用しない。

### Q2. 停止理由と`retryable`をどう閉じますか？

対象: GAP-02、GAP-09。Issueに列挙済みのreason codeを増やさず、新規権限、不可逆操作、scope外操作、waiver要求を表現する必要があります。

A. これらはすべて`AWAITING_HUMAN`とし、具体条件は`resume_condition`へ構造化する。`retryable`は「同じIntentを安全に再開可能」を意味し、`parked`はtrue、`completed`とterminal `failed`はfalseとする（推奨）
B. 権限・不可逆・scope・waiverごとに新しいreason codeを追加し、`retryable`は常にtrueとする
C. すべて`NORM_CONFLICT`へ畳み、`retryable`は常にtrueとする
D. reason codeは自由文字列にし、runnerが解釈する
E. `retryable`をresult envelopeから削除する
X. Other (please specify)

[Answer]: A — 新規権限昇格、未承認の不可逆操作、scope外操作、waiver要求はすべて`AWAITING_HUMAN`とし、具体条件は`resume_condition`へ構造化する。`retryable`は「同じIntentを安全に再開可能」を意味し、`parked`はtrue、`completed`とterminal `failed`はfalseとする。

### Q3. 品質obligationとPlugin必須出力の境界をどう定義しますか？

対象: GAP-03、GAP-04、GAP-07、GAP-17、GAP-18。現行sensorはadvisoryで、script errorでも`SENSOR_PASSED`になり得ます。reviewer wireは`NOT-READY`ですがIssue表記は`NOT READY`です。

A. Engineが宣言済みのreviewer・sensor・produces・verification/completion conditionだけを正規化し、Pluginは判定routeだけを返す。advisory sensorは明示的にblocking指定された場合だけobligation化し、script error/incompleteは成功扱いしない。reviewer verdictはwire上`NOT-READY`へ正規化する。Pluginの`required_outputs[]`は安定ID・stage selector・verifierを持つ宣言とし、初期PluginはIssueにない新規成果物を必須化しない（推奨）
B. 全sensorを自動的にblocking obligationへ昇格し、Pluginが自由に必須成果物を追加する
C. reviewerだけを対象にし、sensor・produces・completion conditionは対象外にする
D. Pluginが自然言語から都度obligationを推定する
E. 現行sensor成功eventを信頼し、script errorの扱いは変更しない
X. Other (please specify)

[Answer]: A — Engineが宣言済みのreviewer・blocking sensor・produces・verification/completion conditionだけを正規化し、Pluginは閉じた判定routeだけを返す。advisory sensorは明示的にblocking指定された場合だけobligation化し、script error/incompleteは成功扱いしない。reviewer verdictはwire上`NOT-READY`へ正規化する。Pluginの`required_outputs[]`は安定ID・stage selector・verifierを持つ宣言とし、初期PluginはIssueにない新規成果物を必須化しない。

### Q4. 既存の固定上限と無上限の品質修復をどう接続しますか？

対象: GAP-05、GAP-06、GAP-20。現行reviewerには`reviewer_max_iterations`があり、Stop/swarmには別の収束budgetがありますが、Quality Repairは通常経路に固定retry上限を置きません。

A. 各既存上限はその局所loopだけに維持する。reviewer上限到達で未解消obligationをPluginへ渡し、品質cycle全体には固定上限を置かない。`replan`も同じMonitor identityとevidence履歴に含め、進捗しない再計画は`repair-stalled`へ収束させる（推奨）
B. `reviewer_max_iterations`を削除し、すべての反復を単一無上限loopへ統合する
C. Quality Repairにも一律の固定回数上限を設ける
D. Stop/swarm budgetをQuality Repairへ流用する
E. `replan`はLoop Monitorの対象外にする
X. Other (please specify)

[Answer]: A — 各既存上限はその局所loopだけに維持する。reviewer上限到達で未解消obligationをPluginへ渡し、品質cycle全体には固定上限を置かない。`replan`も同じMonitor identityとevidence履歴に含め、進捗しない再計画は`repair-stalled`へ収束させる。Stop/swarmのbudgetは各loopだけに適用する。

### Q5. 過去裁定・自動裁定ID・完了後review auditをどう束縛しますか？

対象: GAP-08、GAP-14、GAP-15。

A. 過去裁定はquestion selector、scope lineage、適用norm fingerprintが一致し、回答が一意な場合だけ利用する。競合時はfall throughし、norm競合だけは`NORM_CONFLICT`とする。自動裁定IDはIntent UUID・安定question identity・occurrence/idempotency identity・graph revisionから決定的に導出する。完了後の`AUTO_DECISION_REVIEWED`だけをsealed Intent auditへの限定追記として許可し、成果物やlifecycleは変更しない（推奨）
B. 同じ質問文なら過去裁定を無期限に再利用し、完了後reviewは別のグローバル台帳へ書く
C. 過去裁定は利用せず、自動裁定IDはランダム生成する
D. 完了済みIntentのsealを全面解除してreview eventを書けるようにする
E. 完了済みIntentではaccept/flagを監査しない
X. Other (please specify)

[Answer]: A — 過去裁定はquestion selector、scope lineage、適用norm fingerprintが一致し、回答が一意な場合だけ利用する。競合時はfall throughし、norm競合だけは`NORM_CONFLICT`とする。自動裁定IDはIntent UUID・安定question identity・occurrence/idempotency identity・graph revisionから決定的に導出する。完了後の`AUTO_DECISION_REVIEWED`だけをsealed Intent auditへの限定追記として許可し、成果物やlifecycleは変更しない。

### Q6. `graph revision`の正本を何にしますか？

対象: GAP-16。現行の`Revision Count`は人間のgate rejection回数であり、#2095の履歴束縛に使えるgraph revisionではありません。

A. compile済みruntime graphのcontrol-flow、Monitor定義、Plugin contributionをcanonical化したcontent digestをgraph revisionとする。volatile metadataを除外し、同じ入力は同じrevision、挙動に影響する変更は別revisionにする（推奨）
B. 現行の`Revision Count`をそのままgraph revisionとして再利用する
C. compileのたびに連番を増やす
D. Git commit SHAだけをgraph revisionにする
E. graph revision束縛を削除し、Intent UUIDだけで履歴を共有する
X. Other (please specify)

[Answer]: A — compile済みruntime graphのcontrol-flow、Monitor定義、Plugin contributionをcanonical化したcontent digestをgraph revisionとする。volatile metadataを除外し、同じ入力と挙動は同じrevision、挙動に影響する変更は別revisionにする。

### Q7. `none`でのopt-in、5harness完了境界、将来adapter境界をどう固定しますか？

対象: GAP-10、GAP-11、GAP-21。

A. `none`のQuality Repair opt-inはIntent設定として既定off・人間の明示操作・audit provenanceを要求し、gate/question裁定権は拡張しない。5harness完了は共通contract suite、各opt-in live smoke、solo electionまたはloud degradation、再開永続性で判定する。harness集合は単一descriptor registryからCore/setup/package面を生成し、「adapter追加だけ」はLoop Monitor/Autonomyのalgorithm fork不要という意味に固定する（推奨）
B. `none`でもPluginを既定onにし、5harnessのunit testだけで完了とする
C. opt-inをproject-global設定にし、live smokeはClaude Codeだけ実施する
D. 現行の分散closed unionを維持し、将来harnessごとにCore分岐を追加する
E. #1717全体とKiro対応の完了まで本Intentをblockする
X. Other (please specify)

[Answer]: A — `none`のQuality Repair opt-inはIntent設定として既定off・人間の明示操作・audit provenanceを要求し、gate/question裁定権は拡張しない。5harness完了は共通contract suite、各opt-in live smoke、solo electionまたはloud degradation、再開永続性で判定する。harness集合は単一descriptor registryからCore/setup/package面を生成し、「adapter追加だけ」はLoop Monitor/Autonomyのalgorithm fork不要という意味に固定する。

## 回答分析

- 空欄: なし
- 曖昧語: なし
- 回答間の矛盾: なし
- 統合follow-up: Q1回答後に、現行standing delegation grantと新しい自律レベルの重複をGAP-22 / Q1aとして追加し、解消済み
- 残存する要求判断: なし。実装データ構造、正確なEvent名、CLI表現は承認済み要件を変えない範囲でApplication Designへ送る

## 回答完了記録

- 承認日時: 2026-08-03T06:14:22Z
- 未回答数: 0
