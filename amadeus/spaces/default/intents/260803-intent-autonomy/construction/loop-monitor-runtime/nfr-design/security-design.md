# Security Design — loop-monitor-runtime

## 入力とtrust boundary

本設計は`functional-design/business-logic-model.md`を正本とする。`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`はexpected absenceであり、外部認証基盤やクラウドサービスを追加しない。

trust boundaryは、M01のmanifest / Plugin contribution取込、M06のEvidence / Judge adapter呼出し、M07のcanonical audit commit、M08のlive authorization、M09のlive receipt検証である。M02はpure reducerとしてfilesystem、credential、provider、LLMへ直接アクセスしない。

## ManifestとPlugin contribution

M01はunknown field、duplicate ID、dangling provider / instruction / route、schema digest不一致、unknown dispositionをcompile全体のtyped failureにする。`MonitorManifest.evidenceProviderId`と`judgeInstructionId`は同じnormalized contribution内へexact lookupし、1 Monitorにつきproviderをexactly oneへ閉じる。

plugin content、descriptor、route bindingはcanonical digestへ含める。表示文、読込順、ファイルmtimeをauthorityにしない。部分的なMonitor setや古いruntime graphを成功として公開しない。

## Evidenceとcredential境界

`EvidenceSnapshot`はprovider ID、Intent / Monitor / stage / graph revision、schema version、redaction policy ID、canonical summary digestだけを持つ。raw prompt、credential、secret、個人情報、provider response本文をprojection、status、diagnostic、auditへ格納しない。

M08の`LiveAuthorizationPort`はissuer、environment、revision、trace、attestationのsafe metadataだけを返す。credential自体はCoreへ渡さない。M09は`LIVE_SMOKE_AUTHORIZED`を含むcommit receiptから昇格した`CommittedLiveExecutionAuthorization`なしにlive Judgeを起動しない。

## Least authorityとhuman provenance

Judge requestはcompiled Monitorのroute subset、instruction digest、evidence fingerprintへ束縛する。providerが未宣言route、異なるinvocation、異なるtrace / spanを返した場合は適用せず`CONFLICT`とする。

`human-retry`はreal `VerifiedHumanTurn`とlatch condition identityの一致を必要とする。会話文、standing grant、autonomy modeをhuman turnへ偽装しない。latch clearとworkflow unparkは同一M07 transactionでcommitし、片側だけを可視化しない。

## Security verification

red fixtureはunknown manifest field、duplicate / dangling descriptor、cross-Monitor provider流用、schema mismatch、credential metadata逸脱、raw evidence混入、authorization commit前live実行、trace mismatch、undeclared route、偽human retryを含む。すべてでJudge result適用とworkflow advanceを0件にし、秘密値を含まないtyped diagnosticだけを残す。
