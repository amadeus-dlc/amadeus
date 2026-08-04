# Risk and Sequencing Rationale — live E2E Phase 2

## 入力と採用heuristic

判断根拠は [requirements.md](../requirements-analysis/requirements.md)、[components.md](../application-design/components.md)、[unit-of-work.md](../units-generation/unit-of-work.md)、[unit-of-work-dependency.md](../units-generation/unit-of-work-dependency.md)、[unit-of-work-story-map.md](../units-generation/unit-of-work-story-map.md) である。

採用方式はqualitative hybridで、Bolt 1はteam.mdのWalking Skeleton＋risk-first、Bolt 2〜3はrisk reductionから確実なvalue realizationへ収束し、Bolt 4はDAG必須のevidence closureとする。数値WSJFは、live CLIのdirect/follow-up分岐前にjob sizeを単一値へ潰すと精度を装うため使わない。代わりにbusiness value、time criticality、risk reduction、size rangeを明示する。

## Qualitative scorecard

| Unit | Value | Time criticality | Risk reduction | Size | 順序理由 |
|---|---|---|---|---|---|
| Kiro TUI | 中 | 高 | **最大** — tmux、interactive state、cleanup | L / branch差大 | 最大不確実性をWalking Skeletonで先に裁定 |
| Kiro ACP | 中 | 高 | 高 — JSON-RPC、cancel、descendant reap | L / branch差大 | TUIで共通outcomeを確認後、独立structured transportを閉じる |
| Kimi Print | 高 | 中 | 中 — 既存driverと認証mechanicsあり | M | 成立可能性が高い直接価値を、Kiro未知を除去した後に確実化 |
| Evidence | 高 | 最終 | 横断risk closure | S | 3 transportすべての結果がなければ開始不能 |

## DAG and delivery constraints

Unit生成時点ではTUI、ACP、Kimiがcode-level rootで、採用順序はDAGから導出せずユーザーが経済判断した。Construction開始時、runtime graphが同じDAGを実行順正本にすることを確認したため、承認済み順をdelivery admission edgeとして反映した。Evidenceは3 transportすべてに依存する。

code-level独立性とdelivery上の安全な並行性は分ける。3 transportはregistry、projector、journey test、capability matrixを共有しうるため、runtime DAGは直列である。各Bolt後の実diffと後続file目録が非交差でも、並行化するには先に人間裁定、DAG更新、runtime再compileを行う。

## Risk responses

| Risk | Early signal | Response | Closure evidence |
|---|---|---|---|
| Kiro TUIを安全に隔離できない | private tmux、scratch home、deterministic anchorのいずれか不成立 | directを強行せずqualified follow-upへ切替 | sanitized evidence＋Issue URL＋registry link |
| Kiro ACPの子孫processが残る | abort/cancel後のreap test失敗 | process tree seamを設計、解消不能ならfollow-up | bounded diagnostic＋Issueまたはgreen cleanup receipt |
| Kimi credential/configが漏れる | fake child envまたはdiagnosticにsource path/key出現 | Red固定後にallowlist/bindingを最小修正 | env leak test＋local green receipt |
| 実行失敗とcleanup失敗が競合 | canonical outcomeがadapter間で不一致 | Functional/NFR Designでprimary/secondary分類を固定 | contract test＋ledger projection test |
| retryでresource/receiptが重複 | retryable load error時に二重登録・二重receipt | closed分類とattempt間resource barrierを固定 | injected failure test＋単一final receipt |
| live providerが一時利用不能 | preflight/実行が外部要因で失敗 | skipとfailureを混同せず、証拠をsanitizedに保持 | canonical code、phase、bounded diagnostic |

## Decision record

- 2026-08-04: ユーザーは選択肢A `Kiro TUI risk-first` を選択した。
- 非採用B `Kimi value-first` は早期greenの価値があるが、最大不確実性を後段へ送る。
- 非採用C `Kiro ACP balanced-risk-first` は成立可能性とriskの均衡が良いが、TUI固有のinteractive cleanup riskを最初に反証しない。
