# Pi Coding Agent対応 — Unit of Work定義

## 分解方針と上流トレーサビリティ

Unit境界は、`components`の所有権、`component-methods`のtyped contract、`services`の短命process lifecycle、`component-dependency`の一方向依存、`decisions`のADR-001〜008、`requirements`のM1〜M10を基準にした。`stories`はself-feature scopeで生成されていないため、`requirements`のSCN-001〜009とFR/NFRをstory代替の利用者価値単位として扱う。

各Unitは単独で責務と検証境界を持つが、delivery順・Bolt grouping・critical pathは定めない。それらはDelivery Planningが本Unit集合と依存DAGから選ぶ。

## Unit一覧

| Unit | Kind | 概要 | Deployment model | Complexity |
|---|---|---|---|---|
| `pi-harness-foundation` | `packaging` | Pi native manifest、resource宣言、stage discoveryを所有するproject-local harness foundation | project-local shared payload | L |
| `pi-lifecycle-gate-adapter` | `library` | Pi event正規化、interactive-only presence、settled continuation、tool/compaction lifecycle | embedded extension library | XL |
| `pi-child-execution-driver` | `library` | support/reviewer/swarm共通RPC child process driver | embedded CLI library | XL |
| `setup-transaction-safety` | `library` | setupのjournal、staging、backup、commit、rollback、interruption recovery | embedded setup library | XL |
| `pi-distribution-installation` | `packaging` | setup fresh/updateとPi Package local/gitの同一resource projection | project-local package payload | XL |
| `pi-doctor-diagnostics` | `library` | Pi-only version/platform/trust/resource/driver診断 | embedded core/overlay library | M |
| `pi-user-maintainer-guides` | `spec` | 利用者・保守者向け日英guide、porting registry、supply-chain説明 | consumed in place | M |
| `pi-conformance-evidence` | `library` | captured fixture、parity、RPC live、TUI dogfood、正式green evidence | test-time executable library | XL |

## 数値規模見積りと再利用棚卸し

見積りはauthored source、test、guideの追加・変更行数であり、`dist/`などの生成物とIntent record自身は含めない。Constructionで設計を具体化した時点で再見積りするが、定性的なComplexityだけを完了判定には使わない。

| Unit | 推定規模 | 再利用する既存機構 |
|---|---:|---|
| `pi-harness-foundation` | 600〜900 LOC | `HarnessManifest`、`stageEntry`、既存harness projection、`scripts/package.ts` |
| `pi-lifecycle-gate-adapter` | 900〜1,400 LOC | 共通hook/state/audit contract、presence bridge、continuation contract |
| `pi-child-execution-driver` | 900〜1,400 LOC | core swarm / fixed-width Unit pool、既存child resultとaudit contract |
| `setup-transaction-safety` | 700〜1,100 LOC | setup `Plan` / `Applier` / `ApplyWrite`、install manifest、既存filesystem seam |
| `pi-distribution-installation` | 900〜1,400 LOC | setup harness/layout、package projection、generated drift guard |
| `pi-doctor-diagnostics` | 450〜750 LOC | utility doctor dispatch、harness identity、structured check result |
| `pi-user-maintainer-guides` | 500〜800 LOC | 既存harness guide構成、link check、manifest catalog |
| `pi-conformance-evidence` | 1,200〜1,800 LOC | 既存harness live driver、parity/E2E test runner、formal evidence形式 |
| **合計** | **6,150〜9,550 LOC** | 既存Bun test/CIを継続利用 |

新しい常駐service、database、専用CI workflow、独立test runnerは導入しない。既存機構で代替不能な場合だけ、該当Boltの設計で根拠と規模差分を明示して承認対象にする。adapter、登録slot、manifest declarationは同じIntent内で実装・配線・適合検証まで完結させ、dormant surfaceを残さない。

## Unit詳細

### pi-harness-foundation

- **Kind:** `packaging`
- **Owns:** `packages/framework/harness/pi/manifest.ts`、`.pi/skills` / `.pi/extensions` / driver resourceの宣言、Pi question-rendering annex、canonical `stageEntry`、Pi harness identityとdiscovered manifest catalogへの登録、`dist/pi`生成入口、walking skeletonに必要な最小skill・extension bootstrap・fresh-only setup registration。
- **Delivers:** manifest schema、resource declaration、skill/stage discovery、question annexに加え、空の対象projectへPi candidateを導入し、Pi TUIからread-only statusを実行できる最小end-to-end slice。
- **Boundaries:** extensionの完全なlifecycle/gate処理、child driver実装、transactional update/rollback、Pi Package local/git parity、詳細doctorは独立Unitの責務。walking skeletonは既存setup/package/core seamだけを使うfresh-only pathに限定し、後続Unitはそのpublic contractを拡張する。未配線のregistry slotだけを最終着地させない責務はdistribution/conformanceと共有する。
- **Constraints:** `dist/`を直接編集しない。Pi 0.83.0以上、macOS/Linux。native Windowsはtyped unsupported。
- **Verification:** manifest schema、resource declaration、stage runner discoveryのUnit-local contract testに加え、空fixtureへのfresh installと実Pi TUIでのread-only status smoke。更新・rollback・local/git parityを含むcross-unit package/install smokeはconformance Unitが所有する。

### pi-lifecycle-gate-adapter

- **Kind:** `library`
- **Owns:** `PiLifecycleExtension`、`PiPresenceContinuationBridge`、version付きevent mapping、session identity、tool/sensor bridge、compaction recovery。
- **Delivers:** `input.source = interactive`だけのHUMAN_TURN一回mint、RPC/extension入力のpresence除外、`agent_settled`後一回continuation、必須capability欠落時のtyped fail-closed。
- **Boundaries:** state transition、gate判定、audit schemaはcore所有。Pi private APIへ依存しない。
- **Constraints:** duplicate native deliveryでmutation高々1回。read-only status/doctorをblocked workflowから分離。
- **Verification:** Pi 0.83.0 captured fixtureとevent mapping/gate/compaction/benchmarkのUnit-local testを所有する。cross-unit live journeyはconformance Unitが参照する。

### pi-child-execution-driver

- **Kind:** `library`
- **Owns:** `PiChildAdmissionFailure` / `PiChildExecutionResponse`、内部`PiChildRequest` / `PiChildResult`、spawn前identity、pending-terminal reconciliation、RPC handshake、AbortSignal、deadline、shutdown、kill/reap、parent-child audit fact。
- **Delivers:** support/reviewer/Construction roleを同じ`pi --mode rpc --no-session` driverで実行し、success/failure/timeout/cancelをtyped terminal resultとして返す。
- **Boundaries:** fixed-width poolのqueue、dependency、attempt、retry admissionはcore所有。driverはnative acceptanceとterminal factだけを報告。
- **Constraints:** provider secret、prompt本文、home絶対pathをauditへ出さない。handshake前だけsession identityをnullableにする。
- **Verification:** role/terminal/process fixtureとdriver/pool contractのUnit-local testを所有する。end-to-end support/reviewer/swarm journeyはconformance Unitが所有する。

### setup-transaction-safety

- **Kind:** `library`
- **Owns:** `SetupTransactionCoordinator`、全競合のpreflight、target-local staging、write-ahead journal、backup、apply、install manifest commit、逆順rollback、次回起動時recovery。
- **Delivers:** 複数file install/updateが成功時に全適用、失敗・中断時に元状態へ回復し、部分適用を成功扱いしないgeneric setup contract。
- **Boundaries:** Pi payload内容とharness pathは所有せず、既存`Plan`からtransaction planを作る。
- **Constraints:** conflictはwrite 0で拒否。未完了journalのrecovery完了前に新transactionを開始しない。
- **Verification:** injected write/delete/rename failure、process interruption recovery、N→N+1 rollback、idempotent replay。

### pi-distribution-installation

- **Kind:** `packaging`
- **Owns:** setup `HarnessName = pi`、`.pi` engine layout、fresh/update/uninstall、root Pi Package metadata、local/git resource view、normalized path/sha256 parity、projection consumer registry。
- **Delivers:** setup CLIと`pi install -l` local/gitが同じcandidate contentをproject-local導入し、利用者管理fileを保持する。
- **Boundaries:** transaction algorithmは`setup-transaction-safety`、runtime lifecycleは`pi-lifecycle-gate-adapter`が所有。
- **Constraints:** `dist/pi/package.json`を対象projectへコピーしない。npm publishはscope外。generated surfaceはauthored sourceからのみ再生成。
- **Verification:** fresh、N→N+1、conflict rollback、same-version diff=0、local/git resource parity、registry mutation、regen driftのdistribution-local testを所有する。実Pi installを含む横断journeyはconformance Unitが所有する。

### pi-doctor-diagnostics

- **Kind:** `library`
- **Owns:** Pi doctor dispatch、check ID、observed/expected/remediation、version/OS/Bun/trust/skills/extensions/package resource/driver probe。
- **Delivers:** healthy Pi-only fixtureの全passと、各欠落fixtureの局所failure。blocked workflowでもread-only診断を完走する。
- **Boundaries:** trust承認、file修復、provider設定変更を自動化しない。Codex/Claude固有configを要求しない。
- **Constraints:** 0.82.x/native Windowsをformal successとして報告しない。secretとhome pathをredact。
- **Verification:** positive/negative matrix、snapshot、no-silent-drop、redaction。

### pi-user-maintainer-guides

- **Kind:** `spec`
- **Owns:** 日英利用者guide、trust、setup/Pi Package二重導入、起動、gate制約、failure、doctor、update、uninstall、対象外、supply-chain、保守者porting checklistとevent/driver/test/generated inventory。
- **Delivers:** 利用者が安全に導入・診断・削除でき、保守者が全registration pointをmanifest catalogと照合できる文書契約。
- **Boundaries:** 実装状態を固定件数や未検証claimで記述しない。正式green evidenceそのものはconformance Unitが所有。
- **Constraints:** 日本語/英語guideを同一変更で同期し、Pi Packageの任意code実行性を明示する。
- **Verification:** 必須section、link、catalog集合、generated inventory検査。

### pi-conformance-evidence

- **Kind:** `library`
- **Owns:** 各Unitが公開するfixture/test inventoryのcoverage検査、cross-unit integration/E2E、RPC live driver、TUI dogfood checklist、formal green evidence schema。captured fixture、adapter benchmark、局所parity test自体は対応する実装Unitが所有する。
- **Delivers:** 日常CIのdeterministic greenと、対応環境でPi 0.83.0以上・provider/auth・検証commitを持つskip不可の実機green記録。
- **Boundaries:** provider credentialを配布せず、日常CIの理由付きskipを正式完了証拠へ昇格させない。
- **Constraints:** RPC自動入力はHUMAN_TURN=0 / GATE_APPROVED=0をassertし、actual human gateはTUI dogfoodで確認する。
- **Verification:** M1〜M10 trace matrix、全FR/NFR coverage、macOS/Linux evidence、native Windows negative。

## Test asset ownership

| Asset | Owner | Conformance Unitの扱い |
|---|---|---|
| Pi lifecycle captured fixtures、mapping、benchmark | `pi-lifecycle-gate-adapter` | inventory/結果を参照し、cross-unit journeyへ接続 |
| Child RPC terminal/pool fixtures | `pi-child-execution-driver` | support/reviewer/swarmのE2Eを追加 |
| Transaction failure/recovery fixtures | `setup-transaction-safety` | setup install journeyで結果を消費 |
| Package/resource parityとregistry mutation tests | `pi-distribution-installation` | 実Pi local/git installの横断assertを追加 |
| Doctor check snapshots | `pi-doctor-diagnostics` | live/negative journeyから実checkを呼ぶ |
| Guide section/link checks | `pi-user-maintainer-guides` | formal evidence packへ結果を収録 |

## Construction適用方針

`packaging` Unitは生成・配布tree、installer、parityを中心に設計・実装する。`library` Unitは公開typed contract、failure、concurrency、test seamを中心にする。`spec` Unitは文書schema、catalog整合、link/section検査を中心にし、独立runtimeを作らない。いずれのUnitもInfrastructure Designや常駐serviceを必要としない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T11:27:11Z
- **Iteration:** 1
- **Scope decision:** none

8 Unitのkind、3成果物、YAML DAG、SCN 9/9・FR 30/30・NFR 12/12の表面上のcoverageは揃い、DAGにもcycleはない。一方、Application Designに存在しない依存を追加し、walking-skeleton-firstの経済順序をtopologyとして固定している。

### Findings

- BLOCKER | unit-of-work-dependency.mdはpi-lifecycle-gate-adapterとpi-child-execution-driverをpi-harness-foundationへ依存させ、walking sliceが利用可能になった後と実装順を固定している。しかし承認済みcomponent-dependency.mdではPi ExtensionはCore/Presence Bridge、Pi DriverはCore Contractsだけに依存し、Pi Manifestへの依存はない。unit-of-work.mdもharness foundation以外を後続Unitと表現しているため、技術的根拠のないwalking-skeleton-first戦略をDAGへ埋め込み、Delivery Planningの経済順序を先取りしている。manifest/packageへの真の依存だけを残し、独立開発可能なlifecycle/driverをrootまたは既存core contract依存として表現する必要がある。
- FOLLOW-UP | 各実装Unitがcaptured fixture、negative journey、benchmark、parity test等をVerificationとして持つ一方、pi-conformance-evidenceも同じfixture、contract/integration/E2E、benchmark、parityをOwnsとしている。並列Boltが同じ検証資産を編集しないよう、各Unitが所有するcontract testとconformance Unitが所有する横断journey/evidenceの境界を明示すべきである。
- FOLLOW-UP | FR-HAR-001〜003はpi-harness-foundation単独所有とされるが、FR-HAR-001のcandidate treeにはdriverとquestion annexも必須であり、harness foundationはchild executionを境界外としている。driver resourceの宣言と実装の分担、question annexのownerをmappingへ明記すべきである。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T11:29:16Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1のBLOCKERは解消された。lifecycle adapterとchild driverはApplication Designどおり独立root Unitとなり、旧walking sliceは中立的なharness foundationへ再定義された。残る依存はresource assembly、診断、横断検証に必要な技術依存として説明され、経済的なBolt順序を固定していない。

### Findings

- None
