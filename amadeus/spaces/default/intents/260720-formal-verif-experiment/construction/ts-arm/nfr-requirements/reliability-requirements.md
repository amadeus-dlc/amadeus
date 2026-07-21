# Reliability Requirements — ts-arm

## Reliability model

`business-logic-model.md` のoracle / universe / PBT normalization、`business-rules.md` のdeterminism / verdict、`requirements.md` のNFR-1、`technology-stack.md` のBun test stackを前提とする。同一frozen inputは同じcoverage receipt、verdict、counterexample identityへ収束する。

## Deterministic execution

universe identity、canonical case order、predicate version、Bun distribution、lockfile / fast-check tree、seed、numRuns、PBT pathをrun manifestへ固定する。PBT greenは100 completed receipt、failureはfirst run index、完全shrink path、shrunk counterexample canonical bytesを保存し、replayが同じfailure identityを返すことを要求する。

core / identity coverageはexpected key setとのbijection、per-predicate pass / fail count、first failing keyを持つ。missing / duplicate、timeout、runtime / dependency driftをHARNESS_ERRORとし、NOT_DETECTEDへ丸めない。

## Failure and recovery

U3 cell transactionを正本とし、response喪失はrun identity / transaction lookup後だけ同じbundleへ収束する。partial runはcounts / last completed key / raw stream identityを保存するがsuccess coverage receiptをmintしない。retryは新run keyまたは新revisionとして全域を再実行する。

execution claimは`ACTIVE -> RESUMED* -> CLOSED | ABORTED`のappend-only transactionで、claim / transfer / close中crashはexpected headとclaim identity lookupへ収束する。live owner中の二重runを許さない。

## Tests and traceability

runtime preparation、claim / ownership transfer、case generation / predicate / PBT shrink / bundle publish各境界へtimeout / crash / driftを注入する。chunk / process schedulingが違ってもcanonical resultsを維持する。合否はsame manifest 100 replayでcoverage / verdict / counterexample identity差0、partial success0である。

run manifest、coverage receipt、PBT replay tuple、CellResult、U3 bundleをidentity chainで双方向に結ぶ。
