# Reliability Requirements — tla-invalid-timestamp-skeleton

## Reliability model

`business-logic-model.md` のstate machine / transaction lookup、`business-rules.md` のdeterminism / stop receipt、`requirements.md` のFR-8/NFR-1、`technology-stack.md` のGit / CI境界を前提とする。passはlocal / CIの完全traceと決定論性が揃う場合だけmintする。

## Composition and execution recovery

CompositionHead作成はbase / Arm T overlay / injection overlay / resulting tree / commitを段階ごとにhashし、専用branchのcommit後にHEAD / tree / cleanを再読する。crash後はCompositionHead identityでlookupし、全overlay / tree / commit一致時だけresumeする。

local attemptはU3 transaction receiptを正本とし、response喪失時はattempt key / transaction lookupで同じbundleへ収束する。attempt 1成功後crashは同じrevisionのattempt 2からresumeし、attempt 1を別bundleで再実行しない。

CI artifact取得 / verificationが不明ならprovider metadataとartifact hashを再取得し、同じrun / artifact identityだけ同じproofへ収束する。別runへのsilent retryは新revisionとする。

CI wait / metadata / artifact transportはperformance要件のpoll / deadline / same-run retry上限に従う。attempt上限後はterminal CI failureとして保存し、別runを自動dispatchしない。

## State commit and failure

pass / fail eventはexpected headとdeterministic transaction IDでatomic appendする。response喪失はlookup後だけretryし、pass/fail二重commitを禁止する。transport / head / lookup / corruptionはdomain failure eventを作らず`SkeletonCommitError`とする。

capacity reservationはappend-only `ACTIVE -> CLOSED | ABORTED` transactionとしてdurable publishする。claim / close中crashはreservation ID lookupへ収束し、ACTIVEはsame revision resumeだけを許す。verified stale ownerの明示abort以外でlockを自動解放しない。

failure後はledger suffixを検査したStopReceiptでArm S start / manifest promotion / benchmark command 0件を証明する。

## Tests and traceability

composition各overlay、reservation claim / close / abort、attempt 1/2 publish、CI poll / metadata / archive stream extract / verify、pass transaction各境界へcrashを注入する。合否はduplicate attempt0、二重reservation0、pass/fail二重event0、failure後command0、同一revisionの異counterexample0である。

freeze、reveal / materialization、CompositionHead、local bundles、CI run / artifact rows、summary、pass/fail eventを双方向identity chainで結ぶ。
