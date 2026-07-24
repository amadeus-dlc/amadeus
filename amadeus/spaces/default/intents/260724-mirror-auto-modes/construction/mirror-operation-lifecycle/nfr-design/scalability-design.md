# Scalability Design — mirror-operation-lifecycle

> 上流入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`

## Capacity

completion 3、state 2 MiB／receipt 1,000／warning 1,000、pending 1,000、same-event caller 32、active prompt 1を上限とする。1 boundaryは最古eligible pendingを1件だけ処理する。

## Isolation

active／explicit Intent以外をscanせず、queue、daemon、parallel mutationを追加しない。capacity超過は`state-capacity` warningを保存しremote 0件でworkflowを継続する。

warning storageは通常999 slot＋key=`state-capacity`の予約singleton 1 slotである。通常枯渇時はsingletonを最新blocked operationへ置換し、旧singleton proofを同じstate transactionのaudit outboxへ退避する。state 2 MiB自体を超えてsingletonもcommitできない場合はtyped local capacity failureを返し、remote 0件、engine workflow継続、手動state修復案内とする。

## Verification

32 callerでmutation最大1、pending 1,000で処理1件、status p95 250 ms／RSS 128 MiBを検証する。
