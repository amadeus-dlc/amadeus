# Reliability Requirements — status-registry

`business-logic-model`、`business-rules`、`requirements`、`technology-stack`に基づき、local registryのdurabilityとmigration idempotenceを規定する。

## Durability invariants

- validation完了前に永続writeを行わない。
- atomic write interruption後に観測可能なfileは、呼出前bytesまたは完全なintended bytesのどちらかだけ。
- partial JSON、target status tokenの途中切断、対象外span変更を許容しない。
- migration成功後、通常strict readerで全entryが4値として読める。
- target status token span以外のbytesは完全一致する。

## Idempotence target

一度成功したregistryへ同じversioned migrationを100回連続実行し、各回がsuccess/no-op、file bytesが初回成功直後と完全一致すること。operation間でtemp file、backup、markerを残さない。

## Fault validation

| Fault | Expected outcome |
|---|---|
| malformed input | old bytes、不正診断 |
| target missing/duplicate/unexpected status | old bytes、fail-closed |
| temp write failure | old bytes |
| fsync/rename failure | oldまたはintended bytes、partial禁止 |
| post-write read-back mismatch | fatal diagnostic、成功扱いしない |
| rerun after committed write | byte-identical no-op |

## Availability and recovery

常駐service availability SLO、RTO/RPO、backup service、pagingはN/A。CLI operationのrecovery contractは、atomic old/new outcome、loud diagnostic、idempotent rerunである。恒久backup fileは作らず、version controlを既存の復旧面として維持する。
