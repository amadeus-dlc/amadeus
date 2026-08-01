# Code Summary — docs-sync(U4、Bolt 4)

上流入力(consumes 全数): code-generation-plan.md、business-rules.md、requirements.md

- 着地: conductor ブランチへ --no-ff マージ(`c02a85cfb`、6 files +74)。finalize verdict: converged 1 / failed 0(c2 回収、衝突なし)。

## 変更(docs のみ、en/ja 対 — BR-U4-2)

| 面 | 内容 |
|---|---|
| docs/reference/12-state-machine{,.ja}.md | 新節「Plan-integrity guards (issue #1892)」— 3部メッセージ表(マーカーはコード verbatim: "Observed: " / "Why this matters: " / "Approved exit: ")、発行 verdict 表(ok/redirect/violation)、approve 側 SWARM 突合、出口2種、absence/defect の判別 |
| docs/harness-engineering/08-construction-and-swarm{,.ja}.md | Bolt-DAG 節末尾に「計画は拘束的」段落 — 両ガード面の要約+12-state-machine への参照 |
| docs/guide/04-phases-and-stages{,.ja}.md | Construction 節の key-behaviour — 直列降格せずラダー再質問、計画訂正出口(依存記録修正 → compile → 再実行) |

## 検収(U4-AC)

- U4-AC-1: ガード3種の発動条件・3部様式・出口が reference から辿れる — 12-state-machine 新節で充足。
- U4-AC-2: en/ja 対の diff が同一変更に存在(6面)。
- U4-AC-3: 語彙 grep 棚卸しを PR 本文へ記載(FD 表の暫定リストは BR-U4-4 の実装時 grep が正 — 08-rule-system 系は非該当、実対象は 08-construction-and-swarm。FD からの逸脱ではなく BR が予定した上書き)(bolt_dag_absence 8面 / invoke-swarm 12面ほか)。FD 表の 01-architecture.md は「該当時」条件が grep 実測で非該当(runtime-graph 契約節が存在せず、追加は 13-runtime-graph の canonical と重複)— 無音省略でなく理由記録つき非実施。
- BR-U4-3: 硬数値は隣接列挙のある箇所のみ(count-free 検査済み)。
- BR-U4-5: docs は dist 外(dist:check 0)。paths-ignore 盲点は pull_request トリガーに path filter なしを実測し非該当。

## 検証(全 exit 0)

t132 / t174 / docs 系スイート(6 files 0 fail)/ typecheck / lint / dist:check。逸脱 0。
