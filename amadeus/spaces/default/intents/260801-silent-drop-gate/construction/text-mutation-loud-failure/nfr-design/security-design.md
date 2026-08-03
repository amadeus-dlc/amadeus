# Security Design — text-mutation-loud-failure

## 上流入力

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。保護対象はcanonical state bytes、全永続workflow audit bytes、target identity、既存CLIのfailure boundaryである。

## Validation boundary

raw contentは `validateStageState` だけが受け取り、grammar全体、canonical stage section、checkbox、suffix、一意slugを検証してopaque `ValidatedStageState` を返す。setterの公開signatureはopaque valueを必須とし、raw stringやfilesystem pathを受け取らない。

targetはsetter前に `validateMutationTarget` でASCII `^[a-z][a-z0-9-]{0,63}$`、1〜64 code units、正規化なしを検証する。文法外は `InvalidMutationTarget`、文法内でindexに0件だけを `not-found(target)` とし、診断注入と不存在を混同しない。checkbox／suffix valueも閉じたunionとする。

## Mutation integrity

- validated indexでtargetがちょうど1件であることをmutation前後に確認する。
- candidateは対象rangeだけを置換し、非対象stageのidentity＋bytes projectionをbeforeと比較する。
- setter内reparseでtarget postcondition、一意性、grammar、非対象不変を検証する。
- failureは `reparse-failed | postcondition-failed | non-target-changed` の `StateMutationInvariantError` だけへ閉じ、raw contentをmessageへ含めない。
- bulkは全target keyの重複を同値／相反とも適用前に拒否し、部分mutationを外部へ返さない。

## Diagnosticと副作用分離

validation、invalid target、not-found、duplicate target、invariantのdiagnosticはcaller-local `process.stderr.write(JSON.stringify({ error: message }) + "\n")` だけを使う。永続auditを伴う `emitError`／`die` をこれらのpre-commit failure pathで呼ばない。stdout、state、全永続audit、success emitter、retry、resyncは0件とする。

error JSONはtargetと固定messageだけを含み、state全文、audit全文、absolute path、environmentを含めない。改行、quote、backslash、Unicode separator、uppercase、過長targetはvalidatorで拒否され、JSONは文字列連結で組み立てない。

## Persistence権限

pure parser／setter／transactionはfilesystem、console、process、audit capabilityを持たない。caller adapterだけが既存 `writeStateFile` capabilityを持ち、`MutationTransaction.ready(candidate)` のbytes差分がある場合に1回だけ呼ぶ。

success／mutation audit capabilityは `CallerMutationAdapter.run` のmodule-private closureだけが所有し、transaction、writer、presenter、caller外部へ渡さない。adapterのexhaustive内部branchは、全setter内reparseとcaller final reparseが成功してfinal bytesがoriginalと同一の `verified-no-write`、または同じpostconditionに加えてrenameとdirectory fsyncが成功した `committed-write` の場合だけprivate emitterを呼ぶ。公開token、constructor、success callbackを設けないため、別transactionからの偽造・再利用経路は存在しない。

本Unitは既存state path認可、single-writer、atomic writerを維持し、shell、child process、network、external package、dynamic evaluation、new telemetry sinkを追加しない。#1906のmulti-writer競合は非適用である。

## Security verification

- malformed grammar、duplicate／decoy line、unknown suffixをsetter前に拒否する。
- invalid targetとvalid not-foundを別のtyped failureとして検証し、stderr JSON以外の副作用0を確認する。
- renderer／parser seamで非対象変更とpostcondition破損を注入し、`StateMutationInvariantError` へ閉じる。
- 全callerでpre-commit failure時に `emitError`／`die`／audit writerが呼ばれないことをspyで固定する。
- dependency／lockfile diff、child／network call countから追加runtime面0件を証明する。

HTTP、database、cloud IAM、credential、規制対象dataは扱わないため、それらのsecurity controlは非適用である。
