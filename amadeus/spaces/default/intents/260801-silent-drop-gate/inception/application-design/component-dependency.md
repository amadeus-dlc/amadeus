# Component Dependency — no-silent-drop

## 設計入力

依存関係は `requirements.md` の fail-closed／determinism、`architecture.md` の6責務分離、`component-inventory.md` の既存 gate／runtime ownership、`team-practices.md` の Walking Skeleton を正本とする。依存は同一 repository 内の TypeScript import と1つの child process に限定する。

## Dependency matrix

`→` は行 component が列 component を利用することを示す。

| From ＼ To | C1 Contract | C2 Scanner | C3 ast-grep | C4 Census | C5 Policy | C6 Command | R1 Mutation | R2 Callers | R3 Executor | R4 Store | I1 CI |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C1 Contract | — |  |  |  |  |  |  |  |  |  |  |
| C2 Scanner | → | — |  |  |  |  |  |  |  |  |  |
| C3 ast-grep | → | → | — |  |  |  |  |  |  |  |  |
| C4 Census | → | → | → | — |  |  |  |  |  |  |  |
| C5 Policy | → |  |  | → | — |  |  |  |  |  |  |
| C6 Command | → | → | → | → | → | — |  |  |  |  |  |
| R1 Mutation |  |  |  |  |  |  | — |  |  |  |  |
| R2 Callers |  |  |  |  |  |  | → | — |  |  |  |
| R3 Executor |  |  |  |  |  |  |  |  | — | → |  |
| R4 Store |  |  |  |  |  |  |  |  |  | — |  |
| I1 CI |  |  |  |  |  | → |  |  |  |  | — |

禁止 edge は C1〜C6 → R1〜R4、R1〜R4 → C1〜C6、C1／C2／C4／C5 → process I/O、R4 → R3 である。C3 だけが ast-grep process、C2 だけが source／mirror filesystem、C4 だけが snapshot-backed TypeScript compiler port を扱う。これにより静的 gate と runtime fixes は code dependency を持たず、CI だけが両者の test suite を同じ job で検証する。

## Gate data flow

```text
I1 CI
  -> C6 Gate Command
      -> C1 validated contract + trusted base revision
      -> C1 GitReadPort -> previous baseline/exemption bytes
      -> C5 previous/current ledger ratchets
      -> C2 expected manifest + source snapshot + read-only mirror
      -> C3 raw candidates + coverage-sentinel receipts
      -> C2 receipt equality + snapshot/mirror/source stability
      -> C4 TypeScript semantic projection(program + catalog + dependency receipt) + identity-sorted raw census
      -> C5 exemption application -> effective finding set
      -> C5 baseline verdict over effective finding set
      -> C6 Pass | Violations | Error + exit 0 | 1 | 2
```

テキスト上の矢印が正準であり、DAG は `I1 → C6 → {C1,C2,C3,C4,C5}`、`C5 → {C1,C4}`、`C4 → {C1,C2,C3}`、`C3 → {C1,C2}`、`C2 → C1` で閉じる。循環 import は認めない。C6 は composition root として下位 component を知るが、下位 component は C6 を知らない。

## Baseline bootstrap data flow

```text
pre-fix revision
  -> C6 census-evidence(no baseline read)
  -> C_pre-raw(raw/exempted/effective + manifest/rule/semantic digests)
  -> classification-pre(all identities TP/FP + reason + reviewer)
  -> reviewer + human approval-receipt(classification digest + audit event)
  -> C6 approve-evidence -> C_pre-approved
  -> B_pre(effective TP identities, approved evidence only)

post-fix revision
  -> C6 census-evidence(no baseline read)
  -> C_post-raw -> classification-post + approval-receipt
  -> C6 approve-evidence -> C_post-approved
  -> C6 baseline-candidate(C_pre-approved, C_post-approved, issue identity contract)
  -> candidate B0 + initial exemption set/digest + bootstrap provenance iff strict-subset/deletion/addition checks pass
  -> human-reviewed repository change promotes candidate to baseline.json
  -> I1 CI invokes check(baseline required)
```

`census-evidence`、`approve-evidence`、`baseline-candidate` は既存 path の上書きを拒否し、CI は呼ばない。この一方向 flow により baseline 欠落を green にせず、分類を未検証のまま B_pre／B0 に混ぜず、最初の baseline 生成も循環しない。

通常 CI は current tree の baseline／exemption だけを trust しない。PR は `pull_request.base.sha`、push は event の before SHA を `--base-revision` に渡し、C1 は base object の ledger bytes を読む。C5 は previous/current identity set を比較して ledger 自体の追加と同数置換を source scan より前に拒否するため、finding と ledger の同時追加で回避できない。base object 不明は fail-closed とする。

## Runtime data flow — #1874

```text
R2 jump / utility / state caller
  -> R1 validateStageState
      -> duplicate/malformed: existing typed validation failure
  -> R1 setCheckbox or setStageSuffix on ValidatedStageState
      -> changed(content) | not-found(target)
  -> changed: postcondition re-parse済み。既に期待値なら同一bytesのidempotent success
  -> not-found: caller enters existing typed error boundary before any write
```

- callsite retry 上限は0。
- `not-found` から自動 resync、warning success、unchanged bytes success への edge はない。
- merge caller も同じ union を検査し、fragment merge の一部だけを commit しない。

## Runtime data flow — #1878

```text
R3 persistBlocked
  -> R4 applyTransition / mutateMirrorStateAtomic
      -> ok(snapshot, clean|outbox-pending): existing business safety-blocked outcome
      -> failed(pre-commit, summary): stateFailure warning.effect=not-started、bytes不変
      -> failed(durability-unknown, summary): stateFailure warning.effect=outcome-unknown、次回reconcile必須
```

R4 内部の commit-state-machine は次の依存順を維持する。

```text
lock -> read/parse -> reduce -> temp write -> rename -> directory fsync
     -> audit append from outbox -> outbox clear -> unlock
```

- rename 前 failure: store `io-failure` → internal `failed(pre-commit)` → `stateFailure(classification=state-write, effect=not-started)`。state／audit／outbox bytes 不変。
- directory fsync failure: store `io-failure` の `durability-unknown:` prefix → internal `failed(durability-unknown)` → `stateFailure(classification=state-write, effect=outcome-unknown)`。caller は既存fieldで判別し、次回read／recoveryで整合。
- rename 後 audit failure: store `written(snapshot.auditOutbox != null)` → internal `ok(outbox-pending)`。business state committed、後続 drain。
- audit 後 clear failure: store `written(snapshot.auditOutbox != null)` → internal `ok(outbox-pending)`。audit committed、stale outbox を transaction ID で冪等 drain。

R3 はこの state-machine を再実装せず `StateResult` だけを消費する。

## Shared resources

| Resource | Readers | Writers | Coordination |
|---|---|---|---|
| `package.json`／`bun.lock` | C3、CI | dependency update | exact version＋frozen install |
| gate config／catalog／rules | C1、C3 | contributor | schema validation、code review |
| baseline JSON | C1、C5 | approved change only | identity subset ratchet |
| exemption JSON | C1、C5 | approved change only | separate schema＋subset ratchet |
| authored source roots | C2 | repository contributors | pre/post SHA-256 manifest、C3／C4 は snapshot／mirrorだけを読む |
| compiler／external declarations | C4 | frozen dependency install | version＋semantic dependency digest |
| workflow state／audit／outbox | R4 | R4 only | existing lock＋atomic store |
| CI lint job | I1 | workflow definition | independent blocking step |

## Dependency risk

| Risk | Boundary | Control |
|---|---|---|
| ast-grep output schema drift | C3 | exact pin、strict decoder、Error exit 2 |
| scan root omission／partial parse | C2／C3 | expected/coverage-sentinel receipt equality、root-missing failure |
| syntax candidate の型／path 誤分類 | C1／C4 | symbol／union／path catalog、解決不能は `RULE_INVALID` |
| baseline same-count replacement | C5 | identity set difference、count-only comparison禁止 |
| finding と ledger の同時追加 | C1／C5／C6 | CI base revision の trusted previous set と current ledger の先行比較 |
| baseline bootstrap 循環／暗黙更新 | C5／C6 | baseline 非依存 evidence modes、明示新規 output、人間昇格 |
| 人間分類の欠落／取り違え | C5／C6 | identity 全単射、manifest／rule／semantic／classification digest、approval receipt |
| exemption 解除時の債務隠蔽 | C5 | effective finding set を baseline の唯一の入力にする |
| gate component circularity | C1〜C6 | import DAG test／review、C6-only composition root |
| runtime public behavior drift | R1〜R4 | all-callsite compile failure、focused regression、既存 outcome 維持 |
| generated copy divergence | R1〜R4／I1 | canonical core edit後に package／promotion drift guard |

## Test boundary mapping

| Boundary | Test style |
|---|---|
| C1、C4、C5 | table-driven pure unit＋property tests、semantic unresolved／全 path fixture |
| C2 | temporary filesystem integration、symlink／unreadable／mirror mutation／mid-scan change injection |
| C3 | fake ProcessPort unit＋real pinned binary integration、sentinel missing／duplicate fixture |
| C6／I1 | CLI round trip＋CI workflow contract |
| R1／R2 | helper unit＋全 callsite not-found integration |
| R3／R4 | failure-injection unit／integration、state-audit-outbox byte comparison |
| Distribution | package check、promotion check、既存 harness parity |
