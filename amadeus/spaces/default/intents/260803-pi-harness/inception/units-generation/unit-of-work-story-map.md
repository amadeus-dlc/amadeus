# Pi Coding Agent対応 — Scenario / Requirement to Unit Map

## Mapping方針と上流トレーサビリティ

`stories`はself-feature scopeで生成されていないため、`requirements`のSCN-001〜009をuser story相当として扱い、FR/NFRを受入条件としてUnitへ割り当てる。Unit境界は`components`、`component-methods`、`services`、`component-dependency`、`decisions`から導出している。

各scenarioは少なくとも1つの主担当Unitを持ち、cross-cutting scenarioは複数Unitへ割り当てる。以下の「Unit内step」はUnit内部のcontract実装順であり、Unit間のBolt sequenceを指定しない。

## Scenario mapping

| Scenario | Primary Unit | Supporting Units | Coverage |
|---|---|---|---|
| SCN-001 setup CLIで新規導入 | `pi-harness-foundation` | `setup-transaction-safety`、`pi-distribution-installation`、`pi-doctor-diagnostics` | trust後のdiscoveryとdoctor |
| SCN-002 Pi Package local/git導入 | `pi-distribution-installation` | `pi-harness-foundation`、`pi-conformance-evidence` | 同一resource/hash集合 |
| SCN-003 TUI gate回答 | `pi-lifecycle-gate-adapter` | `pi-conformance-evidence` | HUMAN_TURN=1、approve=1、continuation=1 |
| SCN-004 未回答session終了 | `pi-lifecycle-gate-adapter` | `pi-conformance-evidence` | awaiting維持、approve=0 |
| SCN-005 support/reviewer実行 | `pi-child-execution-driver` | `pi-conformance-evidence` | role/parent-child/terminal result |
| SCN-006 pool=4で複数Unit | `pi-child-execution-driver` | `pi-conformance-evidence` | concurrency上限、dependency、全terminal |
| SCN-007 extension/driver欠落 | `pi-doctor-diagnostics` | `pi-lifecycle-gate-adapter`、`pi-child-execution-driver` | mutationなし、status/doctor remediation |
| SCN-008 Pi 0.82.x | `pi-doctor-diagnostics` | `pi-harness-foundation` | formal workflow拒否 |
| SCN-009 native Windows | `pi-doctor-diagnostics` | `pi-user-maintainer-guides`、`pi-conformance-evidence` | unsupported明示、formal success=0 |

## Functional requirement coverage

| Requirement group | Owning Unit | Secondary verification Unit |
|---|---|---|
| FR-HAR-001 candidate tree | `pi-harness-foundation`（manifest/resource宣言・question annex） | `pi-lifecycle-gate-adapter`（extension実装）、`pi-child-execution-driver`（driver実装）、`pi-distribution-installation`（candidate assembly）、`pi-conformance-evidence` |
| FR-HAR-002〜003 discovery/stageEntry | `pi-harness-foundation` | `pi-distribution-installation`、`pi-conformance-evidence` |
| FR-LIF-001〜006 | `pi-lifecycle-gate-adapter` | `pi-conformance-evidence` |
| FR-GAT-001〜004 | `pi-lifecycle-gate-adapter` | `pi-conformance-evidence` |
| FR-SUB-001〜005 | `pi-child-execution-driver` | `pi-conformance-evidence` |
| FR-DOC-001〜003 | `pi-doctor-diagnostics` | `pi-conformance-evidence` |
| FR-DST-001 transaction safety | `setup-transaction-safety` | `pi-distribution-installation`、`pi-conformance-evidence` |
| FR-DST-001 Pi install/update wiring | `pi-distribution-installation` | `pi-conformance-evidence` |
| FR-DST-002〜005 | `pi-distribution-installation` | `pi-conformance-evidence` |
| FR-VAL-001〜002 | `pi-conformance-evidence` | lifecycle、driver、distribution、doctor Units |
| FR-VAL-003〜004 | `pi-user-maintainer-guides` | `pi-conformance-evidence` |

## Non-functional requirement coverage

| NFR | Owning Unit(s) | Evidence |
|---|---|---|
| NFR-REL-001 Determinism | `pi-distribution-installation` | consecutive regen + normalized sha256 |
| NFR-REL-002 Idempotency | lifecycle、transaction、distribution | duplicate event/install/continuation properties |
| NFR-REL-003 Failure transparency | lifecycle、driver、transaction、doctor | negative journeys、no-silent-drop |
| NFR-SEC-001 Trust | harness foundation、doctor | fresh untrusted fixture |
| NFR-SEC-002 Secrets | lifecycle、driver、doctor、conformance | redaction fixtures |
| NFR-SEC-003 Supply chain | distribution、guides | package behavior + mandatory documentation |
| NFR-PERF-001 Adapter overhead | lifecycle | Kimi baseline benchmark |
| NFR-SCL-001 Concurrency | child driver | pool stress 1/2/4 |
| NFR-CMP-001 Compatibility | harness foundation、doctor、guides | OS/version matrix |
| NFR-MNT-001 Maintainability | 全runtime/distribution Units | boundary/callsite review |
| NFR-TST-001 Testability | conformance | fixture inventory parity |
| NFR-USA-001 Diagnosability | doctor | structured snapshot matrix |

## Unit内implementation steps

### pi-harness-foundation

1. Harness manifest、`.pi` layout、canonical `stageEntry` contractを追加する。
2. Skill、extension、driverのresource pathとquestion annexを宣言する。
3. Harness identity/catalog consumerを配線し、manifest/discovery contract testを通す。

### pi-lifecycle-gate-adapter

1. Native event typeとcanonical mapping fixtureを固定する。
2. session/tool/compaction bridgeを実装する。
3. interactive-only presence、settled continuation、duplicate/failure contractを実装する。
4. gate negative journeyとadapter benchmarkを通す。

### pi-child-execution-driver

1. spawn前identityとrequest/result unionを固定する。
2. RPC handshake、task、terminal collectionを実装する。
3. cancel/timeout/kill/reapとaudit sequenceを実装する。
4. support/reviewer/swarmとpool stressを通す。

### setup-transaction-safety

1. transaction plan、journal、backup schemaを固定する。
2. stage/apply/commit/rollbackを実装する。
3. interruption recoveryとnew-transaction admission guardを実装する。
4. failure injectionとidempotent recoveryを通す。

### pi-distribution-installation

1. setup harness/layout/reporterとPi candidate payloadを配線する。
2. N→N+1 update/uninstallをtransaction contractへ接続する。
3. root Pi Package local/git viewを追加する。
4. hash parity、projection/catalog mutation、regen drift guardを通す。

### pi-doctor-diagnostics

1. check IDとstructured resultを固定する。
2. version/OS/Bun/trust/resource/driver probeを実装する。
3. blocked workflowのread-only pathとredactionを検証する。

### pi-user-maintainer-guides

1. 利用者向け日英guideを実装済みcontractに合わせる。
2. 保守者向けevent/driver/registry/testing inventoryを作る。
3. supply-chain、unsupported、update/uninstallを明記する。
4. section/link/catalog検査を通す。

### pi-conformance-evidence

1. 各実装Unitが所有するfixture/test inventoryのcoverageを照合する。
2. Cross-unit integration/E2Eと実Pi package/install journeyを通す。
3. opt-in RPC liveとmanual TUI dogfoodを実施する。
4. Pi version、OS、provider識別子、commit、canonical assertionを持つ正式green evidenceを記録する。

## Coverage verification

- SCN-001〜009: 9/9 assigned。
- FR: 30/30がownerとverification Unitを持つ。
- NFR: 12/12がownerとevidenceを持つ。
- Unit: 8/8が少なくとも1 scenarioまたはrequirement groupを持つ。
- Unassigned story: 0。独立`stories`成果物はscope上存在しない。
