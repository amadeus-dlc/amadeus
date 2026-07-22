# Reliability Requirements — eligibility-report

## Reliability model

`business-logic-model.md` のEvaluationFailure / FinalDecision / TraceVerifier、`business-rules.md` のreproducibility / no raw mutation、`requirements.md` のNFR-1/NFR-4、`technology-stack.md` のcontent-addressed recordを前提とする。同一verified input / algorithm versionは同じdecision / report identityへ収束する。

## Evaluation and publish

structure verification failure、eligibility reasons、cost failure、Pareto relation、Alloy assessmentをclosed unionで保持する。missing / corruptionをINELIGIBLEへ、HARNESS_ERRORをNOT_DETECTEDへ、evaluation failureをBOTH_INELIGIBLEへ丸めない。

workerはreport modelをcanonical化し、trace verification成功後にprivate same-filesystem stagingへJSON / Markdown / trace manifestとverified staging manifestを書く。trusted publisherは全hash / proof / revision bindingを再検証し、file flush、directory sync、atomic rename、parent sync後だけpublish receiptをacknowledgeする。publisher phaseは30秒、command全体は390秒の残deadlineを強制する。response喪失はreport identity lookupで同じreceiptへ収束する。

## Recalculation and recovery

independent verifierはraw source identitiesからeligibility、Pareto、decision、Alloy、reversal mappings、trace row bijectionを再計算する。renderer出力の表示値を正本にしない。

claim / evaluation / render / trace、worker→publisher handoff、publisher rehash / flush / sync / rename / ack各境界へcrashを注入する。staging orphanはsuccess reportへ採用せず、same identity / different bytesをcorruptionとして停止する。

## Wiring and unresolved history

wiring verificationはclosed command setとtop-level binding setのexact equality、provider dependency graph、error / exit propagationを検査する。ただしFDで保持されたtop-level handler / internal dependencyとAlloy typed inputの残存findingをNFRだけで解消済みと主張せず、最終gateへ継承する。

## Acceptance

same input 100 replaysでdecision / JSON / Markdown / trace identities差0、raw mutation0、unverified publish0、missing reversal mapping0、invented condition0を要求する。
