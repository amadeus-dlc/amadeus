# Business Rules — unit-iteration-and-scope-preview

> 上流入力(consumes全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## Iteration rules

| ID | Rule | Failure condition |
|---|---|---|
| BR-U05-01 | `unit-major`は明示state verbによるopt-inである。 | 暗黙activationを拒否 |
| BR-U05-02 | 未指定時は既存stage-major順と生成bytesを変更しない。 | golden byte failure |
| BR-U05-03 | unit-majorは既存Unit順を外側、compiled stage順を内側にする。 | 独自sort/tie-breakを拒否 |
| BR-U05-04 | scope、stage eligibility、Unit kind、coverageは既存graph判定を再利用する。 | 第二判定式を拒否 |
| BR-U05-05 | 不正iterationはstate/plan/graph/auditの全mutation前に拒否する。 | partial writeをbyte比較で拒否 |
| BR-U05-06 | `nextConstructionStep`はpure decisionで、stateを書かない。 | C2 transaction境界違反 |

## Scope preview rules

| ID | Rule | Failure condition |
|---|---|---|
| BR-U05-07 | stage数とgate数は`CompiledGrid`の同じeffective in-scope集合から導出する。 | source/hardcoded countを拒否 |
| BR-U05-08 | scope confirmation、intent birth、scope-change、validate-gridは同じ`ScopeSummary`を投影する。 | consumer別再集計を拒否 |
| BR-U05-09 | 同じscope/gridはconsumerによらず同じstage/gate countを返す。 | count driftを拒否 |
| BR-U05-10 | JSON `summary`はadditiveで、既存field/value/順序を変更しない。 | compatibility snapshot failure |
| BR-U05-11 | human表示とJSON summaryは同じvalueを使用する。 | projector間不一致を拒否 |

## Ownership and compatibility rules

| ID | Rule | Failure condition |
|---|---|---|
| BR-U05-12 | public signatureは`component-methods.md`の2関数から変更しない。 | 未承認signatureを拒否 |
| BR-U05-13 | U01のUnit kind、U03のbatch/next、U12のledgerをU05へ移さない。 | Unit ownership越境 |
| BR-U05-14 | state mutationは既存lock/audit transaction内だけで行う。 | 部分mutationを拒否 |
| BR-U05-15 | 新規service、DB、network、UI、runtime dependency、一般refactorを追加しない。 | scope/保守性違反 |

## Traceability and verification

- BR-U05-01〜06はFR-2 item 8、`nextConstructionStep`、NFR-1/3へtraceする。
- BR-U05-07〜11はFR-2 item 9、`previewScopeCost`、4 consumer共通summaryへtraceする。
- BR-U05-12〜15はC2 ownership、既存transaction、U05/U12責務分離へtraceする。

| Input | Ruleへの実質利用 |
|---|---|
| `unit-of-work.md` | 2公開seam、opt-in/default不変、4 consumer共通summary |
| `unit-of-work-story-map.md` | items 8–9のU05 ownerとU01/U12境界 |
| `requirements.md` | iteration順、不正値拒否、stage/gate count、additive JSON |
| `components.md` | pure decision seam、既存C2再利用、一般refactor禁止 |
| `component-methods.md` | 正準signatureとfailed result非mutation |
| `services.md` | invocation-local同期処理、既存lock/audit、DB/networkなし |

