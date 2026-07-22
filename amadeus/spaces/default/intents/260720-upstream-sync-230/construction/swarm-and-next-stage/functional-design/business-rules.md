# Business Rules — swarm-and-next-stage

> 上流入力(consumes全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## Swarm batch rules

| ID | Rule | Failure condition |
|---|---|---|
| BR-U03-01 | batch評価順は`BoltDag`の記録順であり、別tie-breakを追加しない。 | 後続batchの先取りを拒否 |
| BR-U03-02 | `currentRun`のconverged evidenceだけを当該選択の完了根拠にする。 | stale/別run claimによるadvanceを拒否 |
| BR-U03-03 | merge failureがあるunitはconvergedへ数えない。 | false convergenceとしてtest failure |
| BR-U03-04 | 最初の未完了batchだけを選び、そのbatchの未完了unitだけを返す。 | batch跨ぎdispatchを拒否 |
| BR-U03-05 | selection seamはstate、audit、workspaceを変更しない。 | pure decision境界違反 |

## Next-stage rules

| ID | Rule | Failure condition |
|---|---|---|
| BR-U03-06 | 次stageは`CompiledGrid`のcurrent後方に実在するin-scope stageから解決する。 | 架空slugを拒否 |
| BR-U03-07 | effective SKIP stageは`next_stage`候補にしない。 | gateへのSKIP名出力を拒否 |
| BR-U03-08 | 候補が複数ならcompiled orderで最初のstageを返し、独自tie-breakを持たない。 | graph順序との不一致を拒否 |
| BR-U03-09 | in-scope successorがない終端は`null`である。 | `none`等をdomain slugとして返す実装を拒否 |
| BR-U03-10 | gate projectorとengine nextは同じresolver結果を使用する。 | 表示と実directiveの不一致を拒否 |

## Compatibility and ownership rules

| ID | Rule | Failure condition |
|---|---|---|
| BR-U03-11 | public signatureは`component-methods.md`の2関数から変更しない。 | 新規引数/返却型を承認なしで追加しない |
| BR-U03-12 | FR-0 characterizationがEQUIVALENTならproduction挙動差分を作らない。 | 不要なrewriteを差戻し |
| BR-U03-13 | 非同等なら観測された不足だけを既存C2 choke pointへADAPTする。 | 一般refactorや仕様拡張を拒否 |
| BR-U03-14 | U03はitems 3/10のtargeted test/evidenceを所有し、全体ledger集約はU12へ残す。 | ledger ownership越境を拒否 |
| BR-U03-15 | U02 recovery、U05 iteration/preview、worker merge実行をU03へ移さない。 | Unit境界違反 |
| BR-U03-16 | 新規service、database、network、UI、runtime dependencyを追加しない。 | scope/供給網違反 |

## Traceability and verification

- BR-U03-01〜05はFR-1 item 3、`selectNextSwarmBatch`、U03のcurrent-run/merge-failure制約へtraceする。
- BR-U03-06〜10はFR-2 item 10、`resolveNextInScopeStage`、gateとengine directiveの一致へtraceする。
- BR-U03-11〜16はFR-0、NFR-1/3/7、C2 ownership、U03/U12責務分離へtraceする。

| Input | Ruleへの実質利用 |
|---|---|
| `unit-of-work.md` | BR-U03-01〜05、06〜11の2公開seamとUnit境界 |
| `unit-of-work-story-map.md` | U03がitems 3/10、U12が集約を担う責務分離 |
| `requirements.md` | current-run convergence、merge failure、SKIP除外、terminal null、FR-0 |
| `components.md` | pure decision seam、既存C2 choke point、一般refactor禁止 |
| `component-methods.md` | BR-U03-11の正準signatureと既存failed-result非mutation |
| `services.md` | invocation-local同期処理、既存lock/audit、DB/networkなし |

