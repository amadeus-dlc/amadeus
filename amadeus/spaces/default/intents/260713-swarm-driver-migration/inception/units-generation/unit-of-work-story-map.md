# Swarm Driver Migration Unit Story Map

## 上流コンテキスト

本story mapは、Application Designの`components`、`component-methods`、`services`、`component-dependency`、`decisions`と、Requirements Analysisの`requirements`をUnit受入sliceへ対応付ける。`stories`は実行計画でSKIP済みのため、`requirements`に定義されたUSR-01〜USR-10をstory相当の利用者シナリオとして使用する。

U-06にも検証可能な利用者価値を割り当てるため、FR-24〜FR-26を言い換えたREL-01〜REL-02を追加する。これは新規scopeではない。

| ID | 要求から導出したrelease scenario |
|---|---|
| REL-01 | Amadeus maintainerとして、同じ5値とdriver契約を全harness、`dist`、self-install、文書へdriftなく配布し、macOS/Linuxのrelease matrixを確認したい |
| REL-02 | Amadeus maintainerとして、0.2.0で`AMADEUS_USE_SWARM`を完全削除する作業を、削除項目と全harness受入条件を持つGitHub Issueで追跡したい |

## User activity map

| Activity | 利用者の目的 | Scenario | 主実装Unit | 横断Unit |
|---|---|---|---|---|
| Driverを解決する | topologyとharnessに合う方式を決定的に選ぶ | USR-01〜USR-05 | U-01 | U-02、対応provider Unit |
| 不正・競合を拒否する | 意図しないdriverやside effectを開始前に止める | USR-06、USR-09 | U-01 | U-02 |
| loud fallback/legacyを実行する | 実際の方式と理由を表示・監査し、0.1.x意味を保つ | USR-07、USR-08 | U-01、U-02 | U-03〜U-05、U-06 |
| Native batchを実行する | provider固有の協調能力で複数Unitを処理する | USR-01、USR-02、USR-04、USR-05 | U-03、U-04、U-05 | U-01、U-02 |
| 収束・再開する | evidence、referee、mergeを相関し、crash後もfalse successを防ぐ | USR-10 | U-02 | active provider Unit |
| 契約をreleaseする | 全配布物・文書・platform検証を同じ契約で閉じる | REL-01 | U-06 | U-01〜U-05 |
| Legacy削除を追跡する | 0.2.0の削除scopeを漏れなく残す | REL-02 | U-06 | U-01、U-03〜U-05 |

## Scenario-to-Unit mapping

| Scenario | Primary Unit(s) | Supporting Unit(s) | 実装される受入結果 | Test / evidence |
|---|---|---|---|---|
| USR-01 Claude相互調整型`auto` | U-01、U-03 | U-02、U-06 | topologyをcoordinatedに分類し、interactive PTYのAgent Teamsを選択し、exact team/task state、TaskCreated / TaskCompleted / TeammateIdle、terminal後のnative証跡をreferee収束と相関する | selector fixture、fake PTY integration、macOS 2 teammate Agent Teams live、release evidence index |
| USR-02 Claude独立batch `auto` | U-01、U-03 | U-02、U-06 | independentを分類し、exact headless Ultra Code commandでWorkflow Unitを割り当て、snapshot・journal/stream・hookを相関する | selector fixture、fake workflow event、macOS Ultra Code live |
| USR-03 Claude topology不明 | U-01、U-03 | U-02、U-06 | `claude-ultracode`を選択し、`topology=unknown`とreasonを表示・監査する | unknown fixture、stderr/audit assertion、Claude integration |
| USR-04 Codexで`codex-ultra`明示 | U-04 | U-01、U-02、U-06 | Ultra受理と2 child以上を開始前/実行時に証明し、xhigh-onlyを拒否する | fake JSONL/hook、downgrade failure、macOS Codex Ultra live |
| USR-05 Kiroで5 Unit `auto` | U-05 | U-01、U-02、U-06 | `kiro-subagent`を選択し、3+2 waveで全Unitを処理する | selector fixture、wave property test、fake session、macOS Kiro live |
| USR-06 別harness driver明示 | U-01 | U-02、U-03〜U-05 | accepted valuesとdetected harnessを示し、worker/worktree 0件でhard errorにする | selector error fixture、no-side-effect integration |
| USR-07 `auto`候補利用不能 | U-01、U-02 | U-03〜U-06 | dispatch前だけ定義済みfloorへloud fallbackし、requested/selected/reasonを表示・監査する | provider probe failure fixture、floor plan integration、docs scan |
| USR-08 旧変数だけ設定 | U-01、U-02 | U-03〜U-06 | harness別0.1.x behaviorを維持し、解決試行ごとにdeprecation warningを出す | legacy全行fixture、harness integration、migration docs scan |
| USR-09 新旧変数を同時設定 | U-01 | U-02 | 優先順位を推測せず、attempt/worker/worktree作成前に競合として拒否する | env parse unit test、no-side-effect integration |
| USR-10 worker中のprocess停止 | U-02 | U-03〜U-05、U-06 | 同じexecutionへ新attemptを結び、probeから再開し、referee確定済みUnitだけを再利用する | crash/fencing failure injection、active provider fake E2E、release matrix |
| REL-01 全harness release | U-06 | U-01〜U-05 | registry、package、`dist`、self-install、docs、macOS/Linux matrixが同じ契約でdrift 0になる | package check、promote-self check、docs contract scan、CI result、live evidence index |
| REL-02 0.2.0削除追跡 | U-06 | U-01、U-03〜U-05 | 旧env read、compat branch、warning、legacy test、暫定文書の削除と全harness検証をIssueで追跡する | Issue本文の受入checklistとURL |

## Unit内の受入slice順

以下は各Unitの内部でtestable incrementを組み立てる順序であり、Unit間のimplementation order、経済的優先度、critical pathを示さない。

### U-01 `driver-contract-selection-policy`

| Slice | Scenario | Unit内の受入増分 |
|---:|---|---|
| 1 | USR-09、USR-06 | env conflict、不正値、別harness明示値をside effect前に拒否するclosed contract |
| 2 | USR-01〜USR-05 | topology分類と全harnessの明示/`auto`選択表 |
| 3 | USR-03 | unknownとcoordination-precedenceを含む決定的reason |
| 4 | USR-07 | dispatch前だけの列挙済みloud fallback plan |
| 5 | USR-08 | harness別legacy planとdeprecation metadata |

### U-02 `swarm-execution-lifecycle`

| Slice | Scenario | Unit内の受入増分 |
|---:|---|---|
| 1 | USR-01〜USR-05 | fake adapterでclosed transport/capture plan、capture-before-arm、binding、dispatch、PTY live control、terminal後のevidence、finalizeを閉じるhappy-path lifecycle |
| 2 | USR-06、USR-09 | hard error時にattempt/worker/worktreeを作らないside-effect boundary |
| 3 | USR-07、USR-08 | floor/legacy execution planのrecordとloud audit correlation |
| 4 | USR-10 | audit-first checkpoint、lease/fencing、resume/reconciliation |
| 5 | USR-01〜USR-10 | evidence/referee/merge failure injectionとatomic terminal state |

### U-03 `claude-native-driver`

| Slice | Scenario | Unit内の受入増分 |
|---:|---|---|
| 1 | USR-01 | 完成済みU-02 contract上のinteractive `claude` PTY、Agent Teams env/in-process mode、fixed initial binding、exact team/task/Unit evidence、`ready-for-graceful-exit`後のterminal evidence |
| 2 | USR-02 | exact headless Ultra Code command、event-bound capture、Dynamic Workflow snapshot・journal/stream・hook・task/agent evidence |
| 3 | USR-03 | unknown topologyのUltra Code routeとreason preservation |
| 4 | USR-07、USR-08 | Claude Task floorと0.1.x Dynamic Workflow compatibility seam |
| 5 | USR-10 | PTY/control/graceful-exit失敗、headless cleanup前snapshot欠落、capture join失敗、resume対応 |

### U-04 `codex-native-driver`

| Slice | Scenario | Unit内の受入増分 |
|---:|---|---|
| 1 | USR-04 | Ultra-capable model handshake、single coordinator、2 child以上のhook/JSONL evidence |
| 2 | USR-06、USR-07 | 別harness拒否と`auto`時だけの`codex-exec-floor` loud fallback |
| 3 | USR-08 | 0.1.x `codex exec` floorと`SWARM_DEGRADED`互換 |
| 4 | USR-10 | stdin close、process/hook partial failure、nonce付きresume evidence |

### U-05 `kiro-native-driver`

| Slice | Scenario | Unit内の受入増分 |
|---:|---|---|
| 1 | USR-05 | 2〜4 Unit balanced waveと5件3+2の決定的分割 |
| 2 | USR-05 | trust preflight、parent-child session、全Unit evidence |
| 3 | USR-06、USR-07 | 別harness拒否と`auto`時だけのKiro floor loud fallback |
| 4 | USR-08 | Kiro CLI/Kiro IDEの0.1.x subagent floor互換 |
| 5 | USR-10 | wave partial failure、次wave抑止、resume対応 |

### U-06 `release-migration-closure`

| Slice | Scenario | Unit内の受入増分 |
|---:|---|---|
| 1 | REL-01、USR-01〜USR-10 | U-02のclosed registryで全provider slotが実装済みかつmapping exhaustiveであることを検証し、全deterministic suiteとgenerated harnessを同期する |
| 2 | REL-01 | User/harness/developer/migration docsと環境変数例を5値・fallback・legacy・platform契約へ同期する |
| 3 | REL-01 | macOS/Linux release matrixと4 driver macOS live evidence indexを閉じる |
| 4 | REL-02、USR-08 | 0.2.0削除Issueを日本語で起票し、削除checklistと全harness受入条件を記録する |

## Cross-cutting scenarios

| Concern | Spanning scenarios | Units | 統合責任 |
|---|---|---|---|
| Selectionからnative successまで | USR-01〜USR-05 | U-01、U-02、対応U-03〜U-05 | U-01のplan IDをU-02 checkpointとprovider evidenceへ一貫して渡す |
| Hard error before side effect | USR-04、USR-06、USR-09 | U-01、U-02、対応provider | U-02がselector/probe failure後のprepare/dispatch 0件を保証する |
| Loud fallback | USR-07 | U-01〜U-06 | U-01がplan、providerがprobe、U-02がaudit、U-06がdocs/distributionを所有する |
| Legacy compatibility | USR-08、REL-02 | U-01〜U-06 | U-01が意味の正本、providerが現行execution、U-06が文書と削除追跡を所有する |
| Crash safety | USR-10 | U-02、active U-03〜U-05 | U-02のvariant付きcapture checkpointを正本にprovider process/evidenceを再束縛する |
| Transport/capture lifecycle | USR-01〜USR-05、USR-10 | U-02、U-03〜U-05 | U-02がclosed unionと順序を完成させ、providerはplan/binding/control/evidence projectionだけを返す。provider Unitはcommon runtimeを編集しない |
| Security/redaction | 全scenario | U-01〜U-06 | raw provider dataをadapter外へ出さず、U-02 schemaとU-06 docs/testで検証する |
| Release/platform | REL-01 | U-03〜U-06 | providerがmacOS live proof、U-06がLinux deterministic suiteと全体matrixを束ねる |

## Coverage verification

### Scenario coverage

| 対象 | 割当状況 |
|---|---|
| USR-01〜USR-10 | 10/10がPrimary Unitとtest/evidenceを持つ |
| REL-01〜REL-02 | 2/2がU-06の受入sliceを持つ |
| 複数Unitを跨ぐscenario | cross-cutting tableでintegration ownerを明示済み |
| 未割当scenario | 0 |

### Unit coverage

| Unit | 割当scenario | 判定 |
|---|---|---|
| U-01 | USR-01〜USR-09 | covered |
| U-02 | USR-01〜USR-10 | covered |
| U-03 | USR-01〜USR-03、USR-06〜USR-08、USR-10 | covered |
| U-04 | USR-04、USR-06〜USR-08、USR-10 | covered |
| U-05 | USR-05〜USR-08、USR-10 | covered |
| U-06 | USR-01〜USR-10、REL-01〜REL-02のrelease/migration concern | covered |

全Unitが少なくとも1つの検証可能scenarioを持ち、全USR/RELが少なくとも1つの主担当Unitを持つ。FR-01〜FR-26の完全な逆引きは`unit-of-work.md`の要求カバレッジ要約と各Unitの受入節に記録する。
