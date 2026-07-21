# Reliability Requirements — full-matrix-suite

## Reliability model

`business-logic-model.md` のschedule ledger / matrix validation、`business-rules.md` のrepeat agreement / incomplete preservation、`requirements.md` のNFR-1/NFR-2、`technology-stack.md` のU3 evidence storeを前提とする。complete比較は全key、chain、identity、repeat consistencyが揃う場合だけ成立する。

## Schedule and resume

`MeasurementSchedule`はInputSetIdentity、12 entries、global ordinal、arm / sample / positionをcontent-addressする。各SuiteStartReceiptはschedule identity、ordinal、entry、previous terminal receiptをbindする。各entryは、まずU3 Evidence Storeへcells / missing keys / causeを束ねたdurable `SuiteResultManifest = COMPLETE | INCOMPLETE`をcommitし、次にU7 BenchmarkControlStoreへそのmanifest identityを参照する`SuiteTerminalReceipt`をexactly one commitする。次ordinalは両storeからmanifest / terminalを再読し、identity / kind一致を確認した後だけ開始する。

start後crashはcommitted cell transactionsをlookupし、未起動 / 不明keysとcrash causeを持つU3 INCOMPLETE result manifestへ収束してからU7 terminalをcommitする。U3 result後 / U7 terminal前のcrashはresult identityをlookupしてterminal commitを再開する。terminalだけ存在してresultが欠損・不一致ならcorruptionとして停止する。同じentryのcellを別bundleで再実行せず、両store再読成功なしで次ordinalへ進まない。

`IncompleteSuite`はschedule / entry identity、global ordinal、start receipt、verified partial bundles、missing keys、causeを必須とする。timeout / missingをNOT_DETECTEDやcomplete durationへ丸めない。

## Matrix and cost recovery

U3 transaction lookupでcell publish response喪失を解消し、same key / different bundleを拒否する。matrix validatorはexpected / actual key bijection、runner / input / freeze identity、5 measured verdict agreementを再計算する。

LOC / elapsed / timing aggregateはsource receiptsとalgorithm versionを持つ。derived artifactは再計算identityが一致する場合だけ採用し、raw evidenceを変更しない。

## Tests and traceability

schedule claim / start、U3 result manifest、U7 terminal receipt、各suite / cell、matrix / cost aggregate各境界へcrash / corruptionを注入する。合否はduplicate suite/cell0、resultなしterminal0、両store再読なしsuccessor0、ordinal / predecessor gap0、不完全median0、same raw inputのderived identity差0である。

schedule、suite、cell bundle、matrix、LOC / elapsed / timingをcommand / CI / artifact refsへ双方向に結ぶ。
