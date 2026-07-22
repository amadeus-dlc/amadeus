# Reliability Requirements — plugin-composition

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。availability SLO/RTO/RPOは追加せず、no-clobber、三面atomicity、crash recovery、drop correctnessを信頼性境界とする。

## Correctness scenarios

| ID | Scenario | Required behavior |
|---|---|---|
| REL-U10-01 | inspect errorが1件以上 | rejected+全error、plan/write 0。 |
| REL-U10-02 | temp apply/compile/sensor/doctor failure | canonical host/record/audit bytes不変。 |
| REL-U10-03 | valid compose/drop | 全三面完了後だけ`COMMITTED`、record/audit once。 |
| REL-U10-04 | handled commit failure | return前に全preimageを即時・冪等復元する。 |
| REL-U10-05 | 未完了`PREPARED`中のcrash | 次操作前に同じlock下でpre-stateへ冪等回復し、回復完了まで新規操作を禁止する。 |
| REL-U10-06 | durable `COMMITTED`後のcrash | post-state、record、audit onceを維持し、pre-state recoveryを行わない。 |
| REL-U10-07 | recovery drift/corruption | 追加mutationなしでloud停止する。 |
| REL-U10-08 | shared contribution drop | current一致後、対象寄与だけを除き残存寄与から決定的再構築する。 |
| REL-U10-09 | record外path/user edit | 削除・推測復元せず三面不変で拒否する。 |

## Crash/failure fixture matrix

`PREPARED`直後、host各write後、record write後、audit write前後、`COMMITTED`直前の未完了phaseへfailure/crashを注入し、次操作前のpre-state回復、二重record/audit 0、未回復中の新規compose/drop 0を確認する。durable `COMMITTED`直後のcrash fixtureはpost-state、record、audit onceの維持とpre-state recovery 0を確認する。journal/preimage driftとcorruptionは追加mutation 0を確認する。

## Determinism・observability

- 同一plugin/host snapshotから同一plan、同一base/contribution順から同一post-stateを得る。
- doctorはrecord、owned path、compile観測をread-onlyで既存diagnosticへ写像する。
- 新audit event、metrics backend、retention、retry、failure/recovery分類を追加しない。

## Verification gate

targeted failure/crash/ownership fixturesと全repository gateを同一最終SHAで通す。`bash tests/run-tests.sh --ci`未実施/stale結果をgreenへ読み替えず、local lcov patch追加行未カバー0と既決spawn/waiver条件を満たす。

## トレーサビリティ

REL-U10-01〜09は`business-rules.md`のBR-U10-01〜22、`business-logic-model.md`のVerification scenarios、`requirements.md`のNFR-1〜6、`technology-stack.md`に対応する。
