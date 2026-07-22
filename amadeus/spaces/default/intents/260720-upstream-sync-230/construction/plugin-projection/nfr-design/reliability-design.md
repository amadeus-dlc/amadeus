# Reliability Design — plugin-projection

> 上流入力(consumes全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Failure containment

信頼性境界はavailability SLOではなく、同一入力からの決定生成、failure時のwrite 0、driftの完全検出、plugin 0件互換である。全sourceをC1でvalidateし、全6 harnessをtemp rootへ生成し、collisionとserializationを完了してからgenerator ownership内へcommitする。途中failureで成功面だけを更新しない。

新しいretry、backoff、circuit breaker、health endpoint、failover、replication、backupはbuild-time local batchには導入しない。failureは握り潰さず既存CLI failureとして返し、未実行、部分成功、stale verificationをgreenへ変換しない。

## Determinismとdrift recovery

同一source bytes、C1 normalized manifest、`HarnessManifest`、packager versionから同一bytesを生成する。checkはcommitted treeを変更せず、全driftをcanonical sortして返す。`MISSING`と`DIFFERS`は期待treeとの差、`ORPHAN`はgenerator ownership内の余剰、`UNREFERENCED`はdiscovered sourceとread-setとの差から導出する。

write modeの回復は、sourceを再validateしてtemp treeを全再生成し、成功後にgenerator ownership内を置換する既存経路だけとする。sourceやownership外pathは削除しない。plugin 0件では回復用の空surfaceを生成せず、既存baseline bytesを維持する。

## Verification matrix

| Scenario | Expected result |
|---|---|
| plugin directoryなし/0件 | 既存6 harnessとCLI bytes不変 |
| valid plugin | 6 package面と4 self-install面を同一sourceから決定生成 |
| invalid/duplicate/unsafe/collision | loud failure、dist/self-install不変 |
| missing/different/orphan/unreferenced | closed drift分類を全件返し、check write 0 |
| kiro系self-install | closed-union failure、project-local bytes不変 |

## トレーサビリティ

本設計は`reliability-requirements.md`のREL-U09-01〜07を中心に、`performance-requirements.md`の同一最終SHA gate、`security-requirements.md`のvalidation-before-write、`scalability-requirements.md`の6×4 matrix、`tech-stack-decisions.md`のtemp filesystem integration、`business-logic-model.md`のFailure tableへ対応する。
