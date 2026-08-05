# Reliability Design — autonomy-review-observability

## 入力とimmutability原則

本設計は`functional-design/business-logic-model.md`を正本とする。`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`はexpected absenceである。

reviewはimmutable decision / effectを変更せず、terminal review projectionだけをappendする。accept / flagでeffect再実行、rollback、Intent reopen、grant変更、artifact変更を行わない。

## Active review transaction

M07はauthorization sourceを再読し、target decisionがeligible / unreviewed、expected target revision一致をappend lock内で検証する。`AUTO_DECISION_REVIEWED` payload、event identity、transaction identity、receipt projection revisionを同一planから生成してcommitする。

same review ID / same choiceはcanonical eventから同じ`DecisionReviewReceipt`を再構築する。異choiceまたは異payloadは`CONFLICT`とし、既存reviewを上書きしない。append前crashは未review、append後crashはterminal reviewとして再生する。

## Completed extension transaction

completed reviewはexpected seal、target revision、current extension headをCASし、review eventと`PostSealReviewExtension` successorを1 transactionでcommitする。extension IDはseal、previous head、review event / payload digest、transaction、revisionへ束縛する。

review eventだけ成功、extensionだけ成功、headだけ更新という部分状態を可視化しない。replayはoriginal sealed historyとvalid extension chainだけを合成し、invalid / forked / digest mismatch extensionをcompletion truthへ入れない。

## Cross-Intent authorization recovery

completed targetではsource human turnが先にcommitされる。source commit後・target append前のcrashはtarget stateを変えず、same source referenceでtarget transactionを再試行する。target terminal review後はreceipt再利用を拒否する。

source lifecycle、human event、binding digest、commit receipt、source revisionがdriftした場合はtarget appendを拒否する。cross-Intent原子性を偽装せず、source evidenceとtarget effectの責務を分離する。

## Canonical encodingとreload

identityはlength-prefixed `canonical-tuple-v1`、contract valueはclosed-schema `canonical-value-v1`を使う。field順、explicit null、array order、integer range、NFC / newlineを固定し、native JSON stringifyへ依存しない。

DecisionCursorはtarget audit revision、nullable extension head、projection event-set digestを含むread snapshot identityへ束縛する。event-set digestはtarget Intent内のvalid `AUTO_DECIDED / AUTO_DECISION_REVIEWED`だけをclosed entryへ変換し、event type / event ID順にsort、exact duplicateをdedupeした`amadeus.decision-projection-event-set.v1` tupleから生成する。同一event IDの内容衝突は`CONFLICT(projectionEventSet)`、対象eventのschema / Intent不正は`MALFORMED(projectionEventSet)`とし、cursorを生成しない。page間でdecision / review event、clone merge、extension headが変わった場合は旧cursorを`CONFLICT(cursorSnapshot)`として拒否し、mutable projection上で継続しない。したがって成功したmulti-page traversalはexactly one snapshotだけを観測する。

session / process / compaction / clone reload後にcanonical revisions、extension head、queue、terminal receiptsを比較する。reload結果の一部欠落をpassにせずexact `ContractError`へ閉じる。

## Failure injection

source turn、authorization、active append、completed seal/head CAS、review event / extension commit、page間decision / review / clone mutation、redaction、Registry / OTel、各reload境界へcrash / driftを注入する。duplicate terminal review 0、partial extension 0、completion seal / artifact digest差分0、raw fallback 0、same review receipt差分0、stale cursor成功0を要求する。
