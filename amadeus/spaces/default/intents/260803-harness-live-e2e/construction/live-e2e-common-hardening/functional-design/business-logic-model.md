# Business Logic Model — live-e2e-common-hardening

入力参照: `unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`。U02はU01のC1〜C4/C7〜C9 production contractを変更せず、FR-1/FR-2/FR-4〜FR-6、FR-10/FR-11とNFR-1〜NFR-5をtransport非依存のadversarial verificationで固定する。FR-3のproduction実装ownerはU01とU03〜U11であり、U02はそのpreflight contractを具体adapterへ再利用できるtest-kitとして検証するだけである。

## Scope and Boundary

- 所有するのは`tests/harness/live-e2e/testing/`のfake adapter、fake journey、fault fixture、oracle、property generator、evidence helperである。
- U01のexported production function、type、code taxonomy、ledger schema、matrix schemaは追加・変更しない。
- CLI/SDK/TUI/ACP/CDP固有のcommand、prompt、anchorは扱わない。U03〜U11が同じtest kitへadapterを渡す。
- U01実装の内部差し替えが必要な場合、既存のdependency portまたはtest-process側module substitutionだけを使う。production branchへtest-only flagを追加しない。
- `unit-of-work`のFR-1〜FR-6はcross-cutting verification範囲、`unit-of-work-story-map`のimplementing unitsはproduction実装ownerとして読む。したがってU02はFR-3用reusable oracleを所有するが、binary/version/auth/capability probe本体は実装しない。

## Contract Case Workflow

| Step | Action | Output | Failure meaning |
|---|---|---|---|
| 1 | `ContractCase`をschema検証し、seedと単一`FaultPoint`を固定 | `ValidatedCase` | test-definition failure |
| 2 | fresh fixture root、canary corpus、fake clock/abort、fake adapter/journeyを生成 | `FixtureContext` | fixture failure |
| 3 | production C2/C4/C8/C9 entry pointへfixtureを接続 | `ObservedTrace` | unexpected throwを捕捉 |
| 4 | outcome、probe/spawn回数、env/cwd、resource events、ledger bytes、matrix bytesをsnapshot | `Observation` | missing observationはtest failure |
| 5 | `ContractOracle`が期待code、順序、秘密非流出、永続性を判定 | `OracleResult` | violationを具体的に列挙 |
| 6 | baselineはgreen、mutant/fault caseは指定assertionがredになることを確認 | `RedGreenEvidence` | false positive/false negative |
| 7 | fixture rootとmodule substitutionを`finally`で復元し、残留をscan | `FixtureCleanupReceipt` | suite failure |

caseはserialに実行し、ambient machine auth、実CLI、実model、実networkを使わない。seed、clock、PID役、filesystem layout、fake process scriptはcaseへ明示する。

## Policy and Classification Verification

### Strict Opt-in Property

`"1"`だけをallow値とし、未設定、空、`"0"`、`"true"`、前後空白、大小文字差、任意Unicode文字列をdeny集合として生成する。deny caseはprobe、credential lease、scratch allocation、spawn、ledger appendがすべて0回で、`OPT_IN_REQUIRED`を返す。

### GitHub Actions Precedence

`GITHUB_ACTIONS=true`ではopt-in値や他の不足条件にかかわらず`CI_FORBIDDEN`を主codeとし、外部境界callを0回にする。mutantはCI branchを無効化するtest doubleであり、production sourceを書き換えない。

### Closed Taxonomy

全canonical codeをtable-drivenに生成し、status/code整合とpriorityを検証する。unknown code、skipをsuccessへ正規化するadapter、assertion本文を破壊するnormalizerはoracleでredにする。

## Environment and Secret Isolation

1. ambient envへallow-listed key、宣言外sensitive key、benign keyを別canaryで配置する。
2. source auth/config/hooksを表す絶対path canaryを用意するが、production fixtureから読ませない。
3. fake processは受け取ったkey名、cwd、argv、存在確認結果だけをsanitized observationへ返し、値を返さない。
4. child env、scratch tree、diagnostic、receipt、ledger、matrixをcanary ID/hashでscanする。
5. 許可された短命`CredentialBinding`はchild境界だけに現れ、resource cleanup後はscan対象すべてから消えることを確認する。

raw secretを失敗messageやsnapshotへ保存しない。leak corpusは固定の非秘密canaryだけを用いる。

## Lifecycle Fault Matrix

| Fault point | Injection | Required terminal behavior |
|---|---|---|
| scratch partial allocation | allocatorが1 resource作成後にthrow | registrar snapshotからcleanup、spawn 0 |
| prepare before return | fake adapterがplanned/created resource後にthrow | partial resource cleanup、execution failure |
| execute non-zero/throw | fake process result | cleanup+leak scan、execution failure |
| timeout | fake processがabortまでblock | abort→reap→cleanup、journey timeout |
| assertion mismatch | fake journey oracle | cleanup後にassertion failure、原文保持 |
| cleanup failure | cleanup fakeがtyped failure | primary execution failure、元結果はsecondary |
| leak finding | canaryをscratchへ残す | primary execution failure、green ledgerなし |
| ledger append failure | write/fsync/rename/revalidate fault | `ledger-write-failed`、green返却なし |

各caseはfaultを1つだけ注入する。cleanupとleakの複合caseだけは両診断集約を検証するため明示的に2 faultを許可する。

## Ledger Crash and Lock Workflow

### Deterministic Crash Fixture

- parent testはchild workerにpublic `appendRunReceipt(path, receipt)`または`recoverRunReceipt`を実行させる。
- lock stampとrename後final bytesはon-disk stateで観測する。write/fsync/renameの完了位置はchildへpreloadしたtest-side `ScopedIoSubstitution`がoperation前後にIPC barrierを通知し、parentはbarrier acknowledgement後だけkillする。sleep時間やfsyncの外部観測で位置を推測しない。
- fsync/write/rename failureはchild test processのscoped module substitutionで該当operationだけを失敗させ、case終了時に必ずrestoreする。production APIとproduction conditional branchは増やさない。
- crash後は別processでrecoveryし、owner token、final record、duplicate countを検証する。

### Required Cases

1. malformed existing lineはbyteを変更せずfail-closed。
2. 同一ID・同一内容は1行のまま`already-present`、異内容はconflict。
3. live/unknown owner lockは回収せずtimeout、dead ownerだけCAS回収。
4. rename前crashはpartial final lineを露出せず、orphan tempを自動採用しない。
5. rename後directory fsync failureは`ledger-write-failed`でgreenを返さず、writer lockを解放する。
6. 同じreceipt IDでfresh lock下のrecoveryを実行し、final record一致を再検証して重複なしに`already-present`を返す。不明なdurabilityを成功と主張しない。
7. concurrent writerは直列化され、全行がschema-validである。

## Matrix Drift and Evidence

registryとvalidated ledger fixtureからexpected blockをrenderし、adapter順とbyte determinismをproperty testする。current blockの手編集、generated marker欠落、malformed receipt、unknown adapter、必須column欠落は独立`check`でredにする。`update`だけがgenerated blockを変更し、runnerはdocsを変更しない。

`RedGreenEvidence`はcase ID、seed、対象contract、baseline pass、注入違反時のfailed assertion名だけを保持する。環境値、secret、絶対home pathは保持しない。U02 terminal evidenceはoffline suite greenと各guardの注入red証拠であり、live receiptではない。

## Verification Matrix

| Requirement | Verification family |
|---|---|
| FR-1 / FR-2 | opt-in property、GHA precedence、closed taxonomy |
| FR-3 | reusable preflight oracleとfake capability declaration。production probe実装はU01/U03〜U11 |
| FR-4 / NFR-1 | env allow-list、source-pointer/secret canary scan |
| FR-5 / FR-6 | lifecycle fault matrix、abort/reap、serial/retry |
| FR-10 | baseline green + violation-injection red evidence |
| FR-11 / NFR-2 | ledger crash/stale-lock/idempotent recovery、matrix drift |
| NFR-5 | fake-only offline execution、deterministic seed、packaging-safe path |

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T14:29:01Z
- **Iteration:** 1
- **Scope decision:** none

循環やtransportへの逆依存は認められないが、U01に存在しないpending protocol、外部観測不能なfsync checkpoint、ledger faultの期待結果型不整合、FR-3 ownership/trace矛盾の4件が実装を阻害する。

### Findings

- BLOCKER | U02はpending markerを前提に、rename後directory fsync失敗時のdurable pending、pending除去を伴うrecovery、projectorによるpending receipt除外を要求する。しかしU01のC8契約はwrite→file fsync→rename→directory fsync→final revalidationと同一receipt IDによる回復だけを定義し、pending markerを持たない。U02のsuiteは存在しない状態を待って失敗するか、禁止されているU01 production protocol変更を必要とする。
- BLOCKER | CrashCheckpointのtemp-fsyncedとdirectory-fsyncedをon-disk observable stateとしてbounded pollする設計は決定的に実装できない。別processからfsync完了を識別するobservable stateはU01契約にないため、kill位置を保証できずBR-D01に違反する。
- BLOCKER | ContractCaseは期待するLiveCodeを必須とし、そのFaultPoint集合にledger write/fsync/rename/revalidate failureを含めるが、U01契約ではこれらはLiveCodeではなくLiveRunError kind ledger-write-failedである。ledger fault caseの期待終端を型として表現できない。
- BLOCKER | unit-of-work.mdはU02をFR-1〜FR-6へ割り当て、Functional Design冒頭も同範囲を主張する一方、unit-of-work-story-map.mdはFR-3からU02を除外し、Functional DesignのVerification/Coverage MatrixにもFR-3がない。preflight/capability検証のownerとrequirement traceが一意でない。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T14:31:15Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の4 BLOCKERはすべて解消された。pending依存の除去、IPC barrierによる決定的crash injection、ExpectedTerminalによる結果型分離、FR-3のproduction/test-kit ownership明確化を確認し、U01 public contract不変条件も維持されている。

### Findings

- None
