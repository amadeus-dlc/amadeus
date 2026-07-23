# Reliability Design — status-registry

`performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`のatomic old/new・idempotence契約を設計する。

## Commit protocol

1. 元registry bytesを保持し、legacy readerでdecodeする。
2. target count、raw status、対象外statusをwrite前に検査する。
3. target status token spanだけを`"archived"`へ置換してintended bytesを生成する。
4. intended bytesをstrict parseし、target外slice一致と4値statusを検証する。
5. 同一directoryへ一意なoperation suffixを持つtemp fileをexclusive createし、全bytesを書き、temp file descriptorをfsyncしてcloseする。
6. tempをtargetへatomic renameし、target fileをopenしてfsync/closeした後、parent directoryをfsyncしてrenameをdurable化する。
7. commit後にbytesをread-backし、intended bytesとの完全一致を確認する。

## Failure handling

- validation、target欠落・重複、unexpected status、temp write失敗ではold bytesを維持する。
- temp write/fsync/close失敗はold targetを維持し、tempをbest-effort削除する。削除失敗時も一意suffixにより次回操作と衝突せず、残存pathをfatal diagnosticへ示す。
- rename前失敗ではold、rename後のtarget/directory fsync失敗ではprocess再開後にoldまたは完全なintended bytesを許容する。partial JSONは許さない。この保証を`AtomicRegistryPort`の明示contractとし、既存atomic writerが満たすことをfailure injectionで固定する。
- commit後read-back mismatchはfatalとして成功扱いせず、元へ書き戻す補償処理は行わない。自動再実行可能と診断できるのは、read-backがstrict parse成功、target一意、target status=`archived`、対象外statusも全てvalidの場合だけである。それ以外は手動復旧を要求し、no-op収束を主張しない。

## Idempotence and recovery

- 初回成功後に同じmigrationを100回実行し、すべてsuccess/no-op、bytes完全一致、temp/backup/marker残存0件を要求する。各write/fsync/rename failure injection後も、削除成功または一意な孤立tempとして識別可能で次回操作と衝突しないことを確認する。
- 常駐health check、circuit breaker、remote failover、backup service、pagingはN/A。version control、atomic writer、loud diagnostic、idempotent rerunが復旧面である。
