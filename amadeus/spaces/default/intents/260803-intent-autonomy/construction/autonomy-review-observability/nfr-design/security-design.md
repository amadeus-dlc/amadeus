# Security Design — autonomy-review-observability

## 入力とtrust boundary

本設計は`functional-design/business-logic-model.md`を正本とする。`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`はexpected absenceである。

trust boundaryはactive source human turn、target decision lookup、completed-only append validator、redaction、Event Registry / OTel projectionである。caller提供audit、receipt、principal、actor、lifecycleをauthorityとして信用しない。

## Human review authorization

`CanonicalReviewSourceReader`はM07内部でsource Intentのcanonical audit、commit receipt、audit revisionを同じsnapshotから読む。`authorizeHumanReview`はsource lifecycle=active、real `HUMAN_TURN`、`review_command_v1` binding、target / decision / choice / classification / safe note digest、principalをexact matchする。

active targetではsource=target、completed targetではexplicit active source Intentを要求する。sourceがなければ`PROVENANCE_REQUIRED`で状態を変えない。source turnからtargetを推測せず、別targetへreceiptをbearer tokenとして再利用しない。

review principalとactorはreal human principalへ一致させる。decision principal / actorはcanonical `AUTO_DECIDED.subject_v1`だけから投影し、legacy eventではnull / withheldにして推測しない。

## Completed seal protection

`CompletedDecisionReviewValidator`だけがcompleted targetへexactly `AUTO_DECISION_REVIEWED`をappendできる。transactionにlifecycle、artifact、grant、workflow、decision mutationが含まれた場合は全体を拒否する。

expected completion seal digest、current extension head、target audit revisionをappend lock内で再検証する。original sealとartifact digestは不変で、review eventは別hash chainにだけ追加する。このAPIを一般的なpost-seal appendへ公開しない。

## Privacyとredaction

public list / detail、status、Registry、OTelは共通safe projectionだけを使う。credential、raw prompt、host / tool payload、raw evidence、未redact noteを返さない。redaction失敗時は値とdigestをnull、status=`withheld`にし、raw fallbackを禁止する。

OTelはstable ID / closed enum / safe digestだけを属性にする。grant IDやpseudonymous subject refは既存access / retention policyに従い、別telemetry storeを作らない。

## Security verification

synthetic human、caller-forged audit、cross-Intent receipt、binding tamper、terminal choice conflict、seal / head drift、mutation event混入、redaction failure、raw telemetry leakageをred fixtureにする。すべてでtarget review mutationまたはsecret出力を0件にする。

