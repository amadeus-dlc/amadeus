# Units Generation Questions — Codex Duration Bounds

<!-- E-OC1 判定証跡:
判定: 全3問はユーザー判断を要するUnit分解選択。
leader 承認: 2026-08-02T04:16:55Z
[Answer] 記入はユーザー回答受領後にのみ行う。 -->

**Mode:** Guide me

## Upstream Context

`components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md`、`requirements.md` を入力とする。承認済みのdelivery制約は「1 Issue = 1 Bolt = 1 PR」、実行順は `#1602 → #1998 → #1999 → #1919`、`in-progress` は着手中の1 Issueのみである。

## Q1. Unitの粒度とIssue境界

4 Issueを4 Boltで個別に着地させるとき、ConstructionのUnitをどの粒度にしますか？

A. 1 Issue = 1 Unit = 1 Bolt = 1 PRの4 Unitとする。各UnitはIssueのcore差分、影響adapter、決定的test、package/self-install同期をまとめて完了する（推奨）
B. #1602だけをbaseline、contract、adapter、projectionの複数Unitに分け、1 Boltでまとめる
C. 4 Issueをさらに微細なcomponent別Unitへ分け、複数Bolt/PRに広げる
D. 4 Issueすべてを1つの巨大Unit/Bolt/PRにまとめる
X. Other (please specify)

[Answer]: A. 1 Issue = 1 Unit = 1 Bolt = 1 PRの4 Unitとする。各UnitはIssueのcore差分、影響adapter、決定的test、package/self-install同期をまとめて完了する。回答受領: 2026-08-02T04:14:50Z

## Q2. 技術依存DAGとdelivery順の分離

#1999のInteraction Budget Adapterと#1919のBounded Unit Poolはどちらも#1998の共有reserve/policyを使いますが、#1919は#1999のadapterを直接利用しません。Unit DAGにどう表現しますか？

A. 技術DAGは `#1602 → #1998 → {#1999, #1919}` とし、#1999と#1919を独立と表現する。ただし承認済みdelivery順 `#1602 → #1998 → #1999 → #1919` はStage 2.8で別契約として固定する（推奨）
B. delivery順をそのまま技術DAGにし、`#1602 → #1998 → #1999 → #1919` の直列依存とする
C. 4 Unitを技術的に全て独立とし、共有contract依存を記録しない
X. Other (please specify)

[Answer]: A. 技術DAGは `#1602 → #1998 → {#1999, #1919}` とし、#1999と#1919を独立と表現する。ただし承認済みdelivery順 `#1602 → #1998 → #1999 → #1919` はStage 2.8で別契約として固定する。回答受領: 2026-08-02T04:15:13Z

## Q3. Unit横断のintegrationとdeployment契約

共有core、7 package面、5 self-install面、documentation、conformanceをUnit間でどう所有しますか？

A. 各Unitが自分のIssueで変更した正本core/adapterと、その影響が及ぶpackage・self-install・docs・testを同じ1 PRで完了する。独立の「最終同期Unit」は作らない（推奨）
B. core実装だけを各Issue Unitに入れ、全4 Issue後にdistribution同期専用の第5 Unit/PRを実行する
C. harness別にUnit/PRを分け、各adapter ownerが独立に実装・配布する
D. `dist/` とself-install treeを直接編集し、package正本との同期は最後に判定する
X. Other (please specify)

[Answer]: A. 各Unitが自分のIssueで変更した正本core/adapterと、その影響が及ぶpackage・self-install・docs・testを同じ1 PRで完了する。独立の「最終同期Unit」は作らない。回答受領: 2026-08-02T04:16:20Z

## Consolidated Confirmation

Q1〜Q3の統合結果に矛盾がなく、この判断を用いてUnit分解計画を確定してよいですか？

A. Confirm — 4 Unitと技術DAGをこの判断で確定する（推奨）
B. Revise — 回答を修正する
X. Other (please specify)

[Answer]: A. Confirm — 4 Unitと技術DAGをこの判断で確定する。回答受領: 2026-08-02T04:16:55Z

## Decomposition Plan

| Unit | Issue | 主境界 | 直接技術依存 | 相対複雑度 |
|---|---:|---|---|---|
| `execution-observability-baseline` | #1602 | Execution Contract、Lifecycle Coordinator、projection、adapter capability、baseline | なし | XL |
| `convergence-budgets` | #1998 | Stop/retry hard budget、retry allowlist、termination | `execution-observability-baseline` | L |
| `interaction-budgets` | #1999 | question/follow-up/review budget adapter | `convergence-budgets` | M |
| `bounded-unit-pool` | #1919 | FIFO queue、active slot、Unit attempt、dependency-aware continuation | `convergence-budgets` | L |

各Unitは自分のIssueに必要なcore、影響adapter、決定的test、package/self-install、documentationを同じ1 PRで完了する。技術DAGでは後半2 Unitが並列可能だが、承認済みdelivery契約により実着手は `#1602 → #1998 → #1999 → #1919` とする。

## Plan Approval

この4 Unitの境界と技術依存による分解計画で成果物を生成してよいですか？

A. Approve Plan — この分解計画で生成する（推奨）
B. Revise Plan — Unit境界または依存を修正する
X. Other (please specify)

[Answer]: A. Approve Plan — この分解計画で生成する。回答受領: 2026-08-02T04:17:56Z
