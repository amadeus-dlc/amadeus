# Unit of Work Story Map — Vertical Redo

## 上流入力とmapping規則

`requirements-analysis/requirements.md`の既存USR-01〜10、FR/NFR/CON、#2095/#2096/#2067の58 ACを正本とする。User Stories stageはSKIP済みなので新storyを作らない。

Unitのbehavior境界は`application-design/components.md`、公開contractは`component-methods.md`、production flowは`services.md`、module方向は`component-dependency.md`、decision rationaleは`decisions.md`へ追跡する。

各sliceはprimary Unitを一つ持つ。secondaryは同じrequirementの統合/verification先であり、primary behavior ownerを変えない。

## 利用者シナリオ

| Scenario | Primary Unit | Secondary | Behavior outcome |
|---|---|---|---|
| USR-01 対話を維持 | intent-autonomy-runtime | autonomy-review-observability | `none`でhuman gate/questionを維持する |
| USR-02 phase単位で自動進行 | quality-repair-runtime | intent-autonomy-runtime | `semi`でphase内を健全化しながら進む |
| USR-03 Intent終端まで自動進行 | intent-autonomy-runtime | five-harness-intent-completion | `full`でgrant範囲内を進み、証拠充足時だけ完了する |
| USR-04 team子Intentへ設定 | intent-autonomy-runtime | autonomy-review-observability | target Intent UUIDへmode/grantを設定する |
| USR-05 非生産修復から再開 | quality-repair-runtime | loop-monitor-runtime、intent-autonomy-runtime | stalledをparkし、evidence/retryで再開する |
| USR-06 自動裁定を後から確認 | autonomy-review-observability | intent-autonomy-runtime | active/completed decisionをaccept/flagする |
| USR-07 legacyから安全移行 | intent-autonomy-runtime | autonomy-review-observability | legacyを`none`へfail-closed診断する |
| USR-08 Plugin contribution保守 | quality-repair-runtime | loop-monitor-runtime | Core forkなしで品質behaviorを寄与する |
| USR-09 harness adapter追加 | five-harness-intent-completion | loop-monitor-runtime、quality-repair-runtime | single registryと共通contractへnative adapterを接続する |
| USR-10 外部runnerから再開 | intent-autonomy-runtime | five-harness-intent-completion | structured resultを既存通常起動で再開する |

## FR / NFR要求slice

| 要求slice | Primary Unit | Secondary / oracle |
|---|---|---|
| FR-LMC-001〜012 | loop-monitor-runtime | U2/U3/U5 integration and replay |
| FR-QRP-001〜013 | quality-repair-runtime | U1/U3/U5 integration and replay |
| FR-AUT-001〜010 | intent-autonomy-runtime | U4/U5 contract and UX |
| FR-GRT-001〜009 | intent-autonomy-runtime | U4/U5 replay and terminal |
| FR-DEC-001〜007 | intent-autonomy-runtime | autonomy-review-observability、five-harness-intent-completion |
| FR-STP-001〜007 | intent-autonomy-runtime | U1/U2 stop semantics、U4 status、U5 persistence |
| FR-OBS-001〜007 | autonomy-review-observability | intent-autonomy-runtime、five-harness-intent-completion |
| FR-HAR-001〜007 | five-harness-intent-completion | U1/U2/U3 issue-specific harness contracts |
| NFR-DET-001（Monitor照合 / route identity） | loop-monitor-runtime | quality-repair-runtime |
| NFR-DET-001（decision ID / result envelope） | intent-autonomy-runtime | autonomy-review-observability、five-harness-intent-completion |
| NFR-DET-002（Judge / latch event replay） | loop-monitor-runtime | quality-repair-runtime |
| NFR-DET-002（grant / decision side effect） | intent-autonomy-runtime | autonomy-review-observability |
| NFR-DET-002（live receipt / terminal effect） | five-harness-intent-completion | intent-autonomy-runtime |
| NFR-DET-003 | loop-monitor-runtime | U2〜U5 identity/replay contract suites |
| NFR-SAF-001（schema/route） | loop-monitor-runtime | quality-repair-runtime |
| NFR-SAF-001（Plugin） | quality-repair-runtime | loop-monitor-runtime |
| NFR-SAF-001（provenance/legacy/norm） | intent-autonomy-runtime | autonomy-review-observability |
| NFR-SAF-002〜004 | intent-autonomy-runtime | autonomy-review-observability、five-harness-intent-completion |
| NFR-REL-001（Monitor / Quality canonical state） | loop-monitor-runtime | quality-repair-runtime |
| NFR-REL-001（grant / decision / workflow state） | intent-autonomy-runtime | autonomy-review-observability、five-harness-intent-completion |
| NFR-REL-002（同一latch fingerprint短絡） | loop-monitor-runtime | quality-repair-runtime、intent-autonomy-runtime |
| NFR-REL-003（resume provenance / terminal persistence） | intent-autonomy-runtime | loop-monitor-runtime、quality-repair-runtime、five-harness-intent-completion |
| NFR-MNT-001〜002 | loop-monitor-runtime | quality-repair-runtime、intent-autonomy-runtime |
| NFR-MNT-003〜004 | five-harness-intent-completion | U1/U2/U3 harness/drift tests |
| NFR-UX-001〜003 | autonomy-review-observability | intent-autonomy-runtime |
| NFR-OBS-001 | autonomy-review-observability | U1〜U3 event producers、U5 terminal |
| NFR-PERF-001〜003 | loop-monitor-runtime | quality-repair-runtime、five-harness-intent-completion |
| NFR-PRV-001〜002 | autonomy-review-observability | intent-autonomy-runtime、five-harness-intent-completion |

CON-001〜008は全Unit guardrailである。Issue依存、PR非依存、runner/supervisor非導入、権限非拡張、budget非混同、Kiro非blocker、#2065/#1241/PR integration非blocker、Request Changesでgrant非停止を各Unitのreviewで確認する。

## 58 Issue AC primary割当

| Issue AC slice | 件数 | Primary Unit | Secondary / oracle |
|---|---:|---|---|
| 2095-AC01〜14 | 14 | loop-monitor-runtime | U2/U3/U5 integration、5harness/drift |
| 2096-AC01〜18 | 18 | quality-repair-runtime | U1/U3/U5 integration、5harness/replay |
| 2067-AC01〜13 | 13 | intent-autonomy-runtime | U4/U5 contract/replay |
| 2067-AC14 | 1 | quality-repair-runtime | intent-autonomy-runtime |
| 2067-AC15〜17 | 3 | intent-autonomy-runtime | loop-monitor-runtime、quality-repair-runtime、autonomy-review-observability |
| 2067-AC18〜21 | 4 | autonomy-review-observability | intent-autonomy-runtime、five-harness-intent-completion |
| 2067-AC22〜26 | 5 | five-harness-intent-completion | U1/U2/U3 contract、drift/replay |
| **合計** | **58** | **全5 Unit** | **重複なし** |

## Cross-cutting behavior

| Concern | Unit | Contract |
|---|---|---|
| Deterministic identity/replay | U1〜U5 | graph/audit/clock/evidenceを入力にし、表示文・編集回数・audit行数をidentityにしない |
| Production wiring | U1〜U5 | pure domain plan→M06 aggregate→M07 append→status/replay→M09 verificationをslice内で閉じる |
| Human provenance | U3〜U5 | real `HUMAN_TURN`、target Intent、protected appendを検証する |
| Harness portability | U1〜U3、U5 | U1でgeneric live authorizationを実配線し、U2〜U5が同じM08 registry/M09 runnerと認可経路を再利用する。native algorithmを複製しない |
| Completion boundary | U3〜U5 | grant completed、workflow null、5 receipt、WORKFLOW_COMPLETEDをatomicに束縛する |

## Story implementation order

本stageではUnit内を含む実装順を選ばない。上のprimary/secondary mappingと`unit-of-work-dependency.md`のUnit edgeだけを記録し、story sequence、Bolt grouping、critical path、価値/リスク優先順位はDelivery Planningへ委ねる。

## Coverage verification

- USR-01〜10は10/10 primary割当済み。
- FRはAUT 10、GRT 9、DEC 7、LMC 12、QRP 13、STP 7、OBS 7、HAR 7の全72件を割当済み。
- NFRはDET 3、SAF 4、REL 3、MNT 4、UX 3、OBS 1、PERF 3、PRV 2の全23件を割当済み。
- Issue ACは#2095 14、#2096 18、#2067 26の全58件をprimaryへ重複なく割当済み。
- 5 UnitすべてがUSR、FR/NFR、Issue ACのprimary ownerを持つ。
- scope外workを割り当てていない。
