# Business Rules — plugin-composition

> 上流入力(consumes全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## Inspection and planning rules

| ID | Rule | Failure behavior |
|---|---|---|
| BR-U10-01 | public seamはunit-of-workの6関数、`discoverPlugins`は内部helperである。 | public面追加を拒否 |
| BR-U10-02 | 全signatureは`component-methods.md`へ完全一致する。 | 未承認型具体化を拒否 |
| BR-U10-03 | same-name、malformed、unknown seam、clobberを全数収集してからready/rejectedを返す。 | first-errorだけのsilent omissionを拒否 |
| BR-U10-04 | errorが一件でもあればplan/writeへ進まない。 | partial planning/mutationを拒否 |
| BR-U10-05 | merge対象は`produces`/`consumes`/`sensors`/`required_sections`と宣言fragmentだけである。 | 暗黙seamを拒否 |

## Apply and drop rules

| ID | Rule | Failure behavior |
|---|---|---|
| BR-U10-06 | canonical hostへ直接逐次writeせずtemp treeへ適用する。 | atomicity違反 |
| BR-U10-07 | composeはC1/C2 compileとsensor成功後だけcommitする。 | 未検証commitを拒否 |
| BR-U10-08 | dropはrecord-owned pathだけを対象にし、user pathを推測削除しない。 | ownership違反 |
| BR-U10-09 | dropもtemp treeでcompile/doctor後だけcommitする。 | 未検証dropを拒否 |
| BR-U10-10 | 失敗時はhost bytes、record、auditをすべて不変にする。 | byte comparison failure |
| BR-U10-11 | 成功時のrecord/auditは一度だけ発行する。 | duplicate evidenceを拒否 |

## Shared ownership and journal rules

| ID | Rule | Failure behavior |
|---|---|---|
| BR-U10-16 | shared file全体をplugin ownershipにせず、base/precondition、plugin contribution、適用順、期待post-stateだけをrecordする。 | whole-file ownershipを拒否 |
| BR-U10-17 | dropは全current期待post-state一致をmutation前に確認し、対象寄与を除いた残存寄与を決定的に再構築する。 | 推測復元を拒否 |
| BR-U10-18 | user drift/identity不一致は三面不変でloud rejectする。 | silent clobberを拒否 |
| BR-U10-19 | journalはworkspace lock下で全三面write-set/preimageを持ち、最初のmutation前にPREPAREDをdurable化する。 | journal後追いを拒否 |
| BR-U10-20 | 三面完了後だけCOMMITTEDへ進む。handled failureはreturn前に全preimageを復元する。 | partial commitを拒否 |
| BR-U10-21 | crash後は次操作前に未完了journalを同じlock下で冪等回復し、回復中の新規操作を禁止する。 | dirty-state continuationを拒否 |
| BR-U10-22 | recovery drift/corruptionは追加mutationなしでloud停止する。 | 不確実な回復継続を拒否 |

## Scope and ownership rules

| ID | Rule | Failure behavior |
|---|---|---|
| BR-U10-12 | U01 schema、U02/C2 compile、U09 bundleを再利用し第二ownerを作らない。 | ownership重複を拒否 |
| BR-U10-13 | U11 reference/guide、U12 ledger closureをU10へ持ち込まない。 | Unit越境を拒否 |
| BR-U10-14 | deferred plugin面、marketplace、lockfile、network dependencyを追加しない。 | scope/供給網違反 |
| BR-U10-15 | doctorはread-only projectionで、failureを成功advisoryへ丸めない。 | false successを拒否 |

## Traceability and verification

- BR-U10-01〜05はFR-6 item 20、6 public seam、`PluginPlanResult`へtraceする。
- BR-U10-06〜11はNFR-1/2、temp verify、record-owned drop、3 surface不変へtraceする。
- BR-U10-12〜15はC4 ownership、U09/U11/U12境界、deferred面へtraceする。
- BR-U10-16〜18はE-USSU10FD1、BR-U10-19〜22はE-USSU10FD2へtraceする。

| Input | Ruleへの実質利用 |
|---|---|
| `unit-of-work.md` | 6 public seam、transaction/record、failure不変、U11委譲 |
| `unit-of-work-story-map.md` | item 20 primary U10、U01/U09/U11 consumer、U12集約 |
| `requirements.md` | no-clobber、4 seam、fragment、compile/doctor、loud failure |
| `components.md` | C4 union/CLI、既存C1/C2再利用、deferred除外 |
| `component-methods.md` | 正準signature、全error収集、temp verify、owned drop |
| `services.md` | inspect→plan→stage→verify→atomic commit、既存lock/audit |
