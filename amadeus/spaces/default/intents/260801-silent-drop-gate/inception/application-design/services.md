# Services — no-silent-drop

## 設計入力と結論

`requirements.md` は常駐 service、HTTP、DB、AWS resource を除外する。`architecture.md`／`component-inventory.md` は contributor-side CLI と既存 runtime module の局所修正を示し、`team-practices.md` は最初の Construction Bolt で最大リスクを端から端まで通すことを要求する。

したがって deployable service は **0件**である。新しい daemon、API server、worker、queue、database、AWS service、UI service は作らない。「service」は設計上の実行境界を説明する語としてのみ使い、配備単位を増やさない。

## 実行境界

| 実行境界 | Lifecycle | Trigger | State ownership | Scaling |
|---|---|---|---|---|
| NoSilentDrop Command | 1 CI step／1 local command の短命 Bun process | `bun run no-silent-drop` | process memoryのみ。versioned config／台帳はread-only | 水平 scaling なし。対象 file を immutable snapshot として1回走査 |
| ast-grep Child Process | NoSilentDrop Command 配下の短命 child | C3 adapter の単一 rule-bundle invocation | 永続 state なし。C2 の read-only mirror だけを読む | 単一 process。candidate rules と coverage sentinel を同時実行 |
| TypeScript Semantic Projector | NoSilentDrop Command 内の in-process boundary | C4 classifier | target authored source は C2 snapshot、compiler／external declarations は frozen install と tsconfig から解決し digest receipt を持つ | 並列化なし。ast-grep candidate に限定して型／path を評価 |
| Existing Amadeus Runtime Commands | 既存 CLI invocation | jump／utility／state／mirror operation | 既存 state、audit、transactional outbox | 現行 lifecycle を変更しない |
| GitHub Actions lint job | CI job | push／pull request | artifact uploadを追加せず job log と exit status | GitHub runner 1台。新規 remote dependency なし |

## Orchestration pattern

NoSilentDrop Command が C1〜C5 を明示順序で同期 orchestration する。choreography、event bus、background retry は使わない。

1. `check` Gate Contract、CI event の trusted base revision、current committed ledgers を検証する。
2. `git show <base>:<ledger>` から得た previous baseline／exemption set と current ledgers を比較し、追加・同数置換を拒否する。
3. expected source manifest、bytes snapshot、isolated read-only mirror を構築する。
4. pinned ast-grep child process で candidate rules と coverage sentinel を同時実行する。
5. sentinel receipt、snapshot／mirror digest、元 source の走査後 stability を検証する。
6. 同じ snapshot を overlay した TypeScript Program、semantic catalog、dependency receipt を必須入力として candidate の symbol／union／全 pathを分類し、censusを正規化する。
7. exemption を適用して `effectiveFindings = rawFindings - valid NSD002 exemptions` を作る。
8. committed baseline を effective finding set に対して評価する。
9. `GateResult` を stdout／stderr／exit code へ1回だけ投影する。

途中 Error は後続処理を停止する。違反と infrastructure error を同じ exit code に畳まず、`1` と `2` を維持する。

## Communication contract

| Caller → Callee | Pattern | Contract | Failure transport |
|---|---|---|---|
| package script／CI → NoSilentDrop Command | sync process | stdout 単一 JSON、stderr 人間要約、exit 0／1／2、CI は full base revision を明示 | process exit＋`GateResult` |
| C6 → GitReadPort | sync child process | `git show <full-base-object>:<literal-ledger-path>`、shellなし | trusted previous ledger bytes／typed failure |
| C6 → C1／C2／C4／C5 | sync in-process | TypeScript discriminated result | return value |
| C6 → C3 → ast-grep | sync child process | exact binary、argv array、JSON stdout | typed adapter result |
| C6 → C4 → TypeScript | sync in-process | snapshot overlay、semantic catalog、path evaluator | unresolvable は `RULE_INVALID` |
| Runtime caller → R1 | sync in-process | `TextMutationResult` | `not-found` variant |
| R3 → R4 | sync in-process under existing lock | `OperationPreparationResult` → current-transition `StateResult`／transactional outbox | maintenanceはinvocation終端、`failed` → existing `stateFailure` |

shell interpolation、stderr text classifier、network call、global mutable singleton は通信契約に含めない。

## Data ownership

| Data | Owner | Writer | Reader |
|---|---|---|---|
| gate config／catalog／rules | C1 source files | contributor review | C1／C3 |
| expected manifest／source snapshot | C2 | current process only | C3／C4／C6 |
| normalized census | C4 | current process／evidence command | C5／C6 |
| effective finding set | C5 | current process only | baseline evaluator／C6 |
| candidate `B_pre` evidence | C5 evidence workflow | Construction test/evidence step | reviewer／human gate |
| committed `B0` baseline | C5 baseline JSON | approved repository change | C5／CI |
| exemption ledger | C5 exemption JSON | approved repository change | C5／CI |
| workflow state／audit／outbox | existing R4 | existing atomic store | existing mirror runtime |

baseline と exemption に同じ writer API を与えても file と schema は分離する。CLI の通常 `check` は台帳を更新せず read-only とする。bootstrap 用の `census-evidence` と `baseline-candidate` も既存 file を上書きせず、存在しない明示 output path だけへ生成する。

## Baseline bootstrap workflow

初回 `baseline.json` がない状態は、CI の `check` では常に `BASELINE_MISSING` である。次の evidence workflow だけが baseline を要求せず、正常運用との循環を作らない。

1. 修正前 revision と manifest digest を固定し、`census-evidence --output C_pre-raw.json` で未分類の raw／exempted／effective finding を得る。
2. 人間が全 identity の TP／FP、理由、reviewer を `classification-pre.json` に記録する。FPが1件でもあればclassifier／catalog／fixtureを修正してraw censusから再実行し、FP=0になったclassificationにだけquality review／human gateがclassification digest、approval timestamp、audit event ID を持つ `approval-pre.json` を発行する。
3. `approve-evidence --census C_pre-raw --classification classification-pre --approval approval-pre --output C_pre-approved.json` が全 identity の全単射と全 digest を検証し、`B_pre` を確定する。
4. #1878／#1874 修正後に同じ3段階で `C_post-approved` と effective TP set を得る。
5. `baseline-candidate --pre C_pre-approved --post C_post-approved --output candidate-B0.json` が `B0 ⊂ B_pre`、削除 identity の issue 対応、追加0件を検証し、candidate と初期 exemption set／digest を含む bootstrap provenance を出す。
6. 人間レビュー済み candidate を通常の repository change として `baseline.json` へ追加する。初回 CI は base baseline 欠落時に限り bootstrap provenance を trusted previous-set として検証する。以後は CI base revision の ledger が唯一の previous-set である。

raw evidence output は revision、manifest digest、rule bundle digest、semantic dependency digest、全 identityを持つ。approved evidence はこれにclassification digest、全TP／FP理由、reviewer、approval receiptを結合する。CLIはclassificationを推測せず、正本baseline／exemptionを暗黙更新しない。

## Reliability と performance

- C3 child process は timeout と nonzero exit を `Error` にし、retry は0回。単一 invocation の coverage sentinel が全 expected path の receipt を返す。
- C2 は snapshot bytes から read-only mirror を作り、C3／C4 が元 source を再読しないようにする。走査後は mirror と元 source の両方を再 hash し、finding の由来 bytes と scan receipt を固定する。watch mode は作らない。
- cold／warm 各5試行の最大値15秒を NFR-01 の合否とする。単一 ast-grep invocation と candidate 限定 semantic evaluation を先に採用し、超過しても完全性を緩めない。
- CI cache miss でも frozen install 後の local binary を使い、registry access を実行時に要求しない。
- Runtime R3／R4 は既存 lock、atomic rename、directory fsync、outbox drain の意味を維持する。prior outboxを処理したinvocationはmaintenance-onlyで終端し、今回transitionはcallerが明示した後続invocationだけで開始する。

## AWS／UX 観点

- AWS Platform: resource mapping は非適用。GitHub-hosted runner を新しい cloud architecture とみなさず、repository CI の既存 execution environment として扱う。
- Cost: 新規常駐 cost は0。追加 cost は lint job の実行秒だけで、15秒上限により制約する。
- Security: credential、secret、network permission を追加しない。child process は repository-local binary と literal argv だけを受ける。
- UX: GUI はない。開発者が復旧できるよう stderr は code、path、理由、次の修正対象を短く示し、機械側は stdout schema を利用する。

## Walking Skeleton への引き渡し

最初の Bolt は、fixture の `NSD002` 1件を snapshot → read-only mirror → pinned ast-grep＋sentinel receipt → TypeScript symbol／Result 消費判定 → effective finding → baseline policy → JSON／exit 1 → lint step まで通し、同時に #1878 の `applyTransition failed(pre-commit)` → `stateFailure` を failure injection で証明する。この slice は静的 gate と最大リスクの runtime failure propagation を端から端まで検証し、人間 gate 後に evidence bootstrap、NSD001／NSD003、全 failure phase、#1874、配布へ広げる。
