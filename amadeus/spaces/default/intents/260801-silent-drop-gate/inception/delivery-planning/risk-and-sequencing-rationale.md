# Risk and Sequencing Rationale — no-silent-drop

## 上流入力と採用heuristic

本判断は `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md`、承認済み `delivery-planning-questions.md` を入力とする。採用方式は Cockburn の walking skeleton を最優先し、その後を Reinertsen／SAFe型の lightweight WSJF と risk-first で比較する hybrid である。

WSJF score は `(利用者・事業価値 + 時間的緊急性 + リスク低減価値) ÷ job size`。各分子を1〜5、job sizeを S=1／M=2／L=4 とし、同点はfailure impactが高い方を優先する。これは相対的な順序説明であり、要件や見積りを変更しない。

## WSJF assessment

| Unit | 価値 | 緊急性 | リスク低減 | Size | Score | 制約／判断 |
|---|---:|---:|---:|---:|---:|---|
| U1 static-gate-engine | 5 | 5 | 5 | 4 | 3.75 | walking skeleton overrideで最初 |
| U3 mirror-persistence-propagation | 4 | 4 | 5 | 2 | 6.50 | U2と並列。failure impactでBolt 2表記 |
| U2 text-mutation-loud-failure | 4 | 4 | 4 | 2 | 6.00 | U3と並列 |
| U4 repository-adoption | 5 | 5 | 4 | 4 | 3.50 | U1／U2／U3依存により最後 |

純WSJFならU3／U2が先になるが、`team-practices.md` と `requirements.md` は新しい検証経路のwalking skeletonを最初に要求する。そのためU1を先行し、全integration seamをcontract fixtureで通してから後続を開始する。U2／U3は相互非依存なのでscore順を直列化理由にせずparallel batchとし、U4はDAGにより最後へ固定する。

## Risk register

| ID | Risk | Likelihood | Impact | Earliest control | Owner／Bolt |
|---|---|---|---|---|---|
| R1 | partial scan／semantic unresolved がgreenになる | Medium | Critical | immutable snapshot、receipt、closed Error、falling proof | U1／Bolt 1 |
| R2 | source違反とledger追加の同時変更でratchetを迂回する | Medium | Critical | trusted previous set、replacement fixture | U1／Bolt 1、U4／Bolt 4 |
| R3 | ast-grep＋TypeScript解析が15秒を超える | Medium | High | fixture timing、後段でcold／warm各5試行 | U1／Bolt 1、U4／Bolt 4 |
| R4 | commit境界failureを偽successへ畳む | Medium | High | failure injection、typed effect、outbox収束 | U3／Bolt 2 |
| R5 | text mutation対象不在が成功扱いになる | Medium | High | exhaustive caller migration、bytes invariance | U2／Bolt 3 |
| R6 | CI／generated projectionがlocal契約とdriftする | Medium | High | blocking step、package／promotion guards | U4／Bolt 4 |
| R7 | evidence classification／approvalがraw censusとずれる | Low | High | identity全単射、digest chain、new-output-only | U1／Bolt 1、U4／Bolt 4 |

## Sequence validity

- Batch 1: U1 は依存0件で、最大リスクR1／R2／R3を最初に検証する。
- Batch 2: U2／U3 は依存0件、source ownerも異なり並列可能である。
- Batch 3: U4 は U1／U2／U3 の修正後sourceとpublic contractを必要とするため、3者完了後だけ開始する。
- cycle、self dependency、未宣言Unit、orphan Boltは0件である。

## Alternatives not selected

| Alternative | 不採用理由 |
|---|---|
| 純WSJF | walking skeleton の既決ノルムを無視し、検証architecture確認前にruntime修正へ投資する |
| 全直列 | U2／U3 の非依存性を捨て、経過時間だけを増やす |
| U1／U2／U3を初手並列 | walking-skeleton gate前に後続投資を開始する |
| U2／U3を1 Boltへ束ねる | 複数Unit非束縛ノルム、単一writer、独立acceptanceを弱める |
| U4を前倒し | 3本の直接依存を満たさず、正本baseline／evidenceを確定できない |
