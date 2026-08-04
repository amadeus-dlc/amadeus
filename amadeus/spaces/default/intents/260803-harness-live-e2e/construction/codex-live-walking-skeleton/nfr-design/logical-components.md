# Logical Components — codex-live-walking-skeleton

## 上流入力と境界

本設計は`business-logic-model`を入力とし、U01が所有するC1〜C9をBun test processへembeddedされるlibrary componentとして分解する。新しいservice、database、queue、cloud resource、long-running daemonは追加しない。

## Component Inventory

| ID | Component | Responsibility | Owns no |
|---|---|---|---|
| LC-LIVE-01 | `LiveContract` (C1) | closed outcome/error/receipt/value objects | env、filesystem、spawn |
| LC-LIVE-02 | `LivePolicy` (C2) | GHA deny、strict opt-in、gate precedence | binary/auth probe |
| LC-LIVE-03 | `LiveAdapter` port (C3) | transport lifecycle interface | concrete CLI details |
| LC-LIVE-04 | `LiveLifecycleRunner` (C4) | registrar、scratch、supervisor capability、OS process handle、deadline、cleanup、ledger orchestration | transport argv/auth semantics |
| LC-LIVE-05 | `CodexExecAdapter` (C5) | Codex preflight、credential projection、closed SpawnSpec、transport normalization | OS process ownership、common gate/ledger |
| LC-LIVE-06 | `CodexStatusJourney` (C6) | literal prompt、deadline、structured anchors | process cleanup |
| LC-LIVE-07 | `CapabilityRegistry` (C7) | typed adapter declarationとsupport state | run history |
| LC-LIVE-08 | `RunLedger` (C8) | sanitized receiptのatomic/idempotent append | matrix rendering |
| LC-LIVE-09 | `CapabilityProjector` (C9) | registry+ledgerからmatrix/runbookを生成 | handwritten status |
| LC-LIVE-10 | `ResourceRegistrar` | planned/created/cleaned resource snapshot | adapter policy |
| LC-LIVE-11 | `CredentialLeasePort` | opaque availability/lease/destroy capability | source path公開 |
| LC-LIVE-12 | `ProcessOwnerGuard` | PID/start identity/PGID再検証、reap receipt | result taxonomy |
| LC-LIVE-13 | `RunOwnedSupervisor` | credentialなしのgroup leader、closed SpawnSpec実行、descendant残存0まで生存、未reap PGID lease | journey assertion、argv構築 |
| LC-LIVE-14 | `BoundedOutputCollector` | stdout/stderr連続drain、byte上限、incremental digest、bounded parse | raw output永続化 |

## Interfaces and Dependency Direction

```text
LivePolicy.evaluate(snapshot) -> allow | canonical skip
LiveLifecycleRunner.run(context, adapter, journey)
  -> ResourceRegistrar
  -> adapter.preflight / prepare / spawn / normalize / cleanup
  -> SupervisorPort.open() -> SupervisorCapability + ProcessGroupLease
  -> adapter.createSpawnSpec(prepared) -> closed SpawnSpec
  -> SupervisorCapability.spawn(SpawnSpec) -> owned TransportSession + borrowed AdapterExecutionView
  -> BoundedOutputCollector -> digest/count/bounded structured value
  -> journey.assert
  -> RunLedger.append(receipt)

CodexExecAdapter -> LiveAdapter
CodexStatusJourney -> LiveJourney
CapabilityRegistry -> declarations only
CapabilityProjector -> CapabilityRegistry + RunLedger (read-only)
```

依存方向はC1 contractを中心に、C2/C3/C6がpure、C5がtransport capability、C4がlifecycle capability、C8がsingle writer、C9がread-only projectionとなる。C5はC8/C9をimportせず、C9はchild processやcredential portをimportしない。

## Execution Sequence

1. C2がgateを評価し、denyならclosed skipを返して終了する。
2. C4がregistrarを生成し、C5 preflightを呼ぶ。
3. C4がgeneric scratchをplanned/created登録し、C5へ`PrepareContext`を渡す。
4. C4がcredentialなしsupervisorを生成・owner検証し、opaque `SupervisorCapability`をC5へ貸与する。C5はCodex argv/env/cwdとcredential bindingをclosed `SpawnSpec`へ構成し、capabilityの`spawn`を要求する。capabilityだけがOS spawnを実行し、underlying `TransportSession`/process handle/`ProcessGroupLease`はC4が所有、C5はread-only `AdapterExecutionView`だけを借用する。
5. C4がdeadline、abort、stream別/合計byte上限を所有し、bounded collectorが継続drainしたdigest/count/structured valueをC5がcanonical resultへnormalizeする。C5 cleanupはtransport固有resourceだけ、C4 cleanupはprocess group/supervisor reapを所有する。
6. C6がcurrent-run structured anchorsを判定する。
7. C4が全resourceをreverse-order cleanupし、残存/leakを検査する。
8. C8がsanitized receiptをatomic appendし、C9がregistry+ledgerからprojectionを生成する。

## Failure Domains and Blast Radius

| Failure domain | Blast radius | Boundary response |
|---|---|---|
| Gate/policy | current invocation | side effect 0、canonical skip |
| Preflight | current adapter | canonical skip、scratch/ledgerなし |
| Prepare/credential | current run scratch | registrar snapshotからcleanup |
| Codex process | supervisor-owned process group | leader先行終了でもtimeout/cancel/reap/descendant zero、他session非干渉 |
| Output flood | current process group | bounded drain、limit超過停止、raw破棄 |
| Assertion | current receipt | non-green receipt、supported更新なし |
| Cleanup/leak | current run + secret boundary | result failureへ昇格、debug保持制限 |
| Ledger durability | capability evidence | hard error、projection更新禁止 |
| Projection | generated docs only | typed source不変、再生成可能 |

## Resource Ownership

- C4 owns scratch root、deadline/abort、registrar、run-owned supervisor、underlying process handle/lease、bounded output collector、cleanup ordering。
- C5 owns Codex credential binding、closed child env/argv/cwd `SpawnSpec`、borrowed execution view、transport-specific temporary files。OS spawn/kill/reap capabilityは所有しない。
- C6 owns immutable journey specificationとanchor evaluatorだけ。
- C8 owns ledger lock/temp/rename/fsync resource。
- C9 owns generated matrix/runbook write transaction。
- U02 owns fake adapters、fault injectors、mutant fixturesであり、production componentを所有しない。

## Logical Isolation and Scaling

各live runは独立scratch、run ID、credential lease、process groupを持つ。ただしcost/rate-limit/ledger orderingを守るためproduction live schedulerはserial laneを使用し、水平並列化しない。通常unit/integration testsはfake adapterを使って並列可能で、real model callと同じledgerへ書かない。

cache、connection pool、queue、load balancerは不要である。大量データ処理ではなく短命CLI検証であり、性能境界はbounded deadline、stdout 1,048,576 bytes、stderr 262,144 bytes、合計1,310,720 bytes、serial実行、cleanup budgetとしてC4/C6へ閉じる。collectorはincremental digestとbounded structured bufferだけを保持し、上限超過後もreapまでdrainする。

## Handoff

後続NFR Design UnitはLC-LIVE-01〜14を再定義せず必須利用し、transport固有C5/C6だけを追加する。全C5はLC-LIVE-13へclosed `SpawnSpec`を渡し、LC-LIVE-14のbounded output viewだけをnormalizeする。Code Generationはproduction kernelを小さい`tests/harness/live-e2e/` module群へ配置し、既存driverをadapter behind portとして段階移行する。Build and TestはU02 contract kitで全adapterへ同一security/lifecycle assertionsを適用する。

## Supervisor Crash Protocol

`ProcessGroupLease`はrunnerのdirect childであるsupervisor PID、start identity、`PGID == PID`、run nonceを持つ。supervisorの正常/異常終了通知後もrunnerは`waitpid`でreapせずzombieを保持するため、そのPID/PGIDはOSに再利用されない。runnerはrecorded negative PGIDをTERM→KILLし、`kill(-pgid, 0) == ESRCH`でgroup空を確認してからsupervisorをreapしleaseを閉じる。reap済み、direct-childでない、PID/PGID不一致のleaseはsignal不可であり、credential handoff前のcapability failureとなる。
