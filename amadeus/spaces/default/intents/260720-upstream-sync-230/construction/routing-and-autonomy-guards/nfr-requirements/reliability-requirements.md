# Reliability Requirements — routing-and-autonomy-guards

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。availability percentage、RTO、RPOは新設せず、決定表・mutation atomicity・graceful advisoryを信頼性境界とする。

## Correctnessとfault containment

| ID | Scenario | Required behavior | Evidence |
|---|---|---|---|
| REL-U04-01 | age = 24h | fresh、non-autonomousのみallow-stop。 | fake clock境界fixture。 |
| REL-U04-02 | age = 24h + 1ms | stale、continue-enforcement。 | stale fixture。 |
| REL-U04-03 | future mtime | age 0へ丸めfresh。 | clock skew fixture。 |
| REL-U04-04 | non-autonomous stale unlink成功/失敗 | deleted/delete-failedを区別し、block判断は同一。 | paired unlink fixture。 |
| REL-U04-05 | autonomous Construction | marker未読、janitor N/A、marker保持、continue-enforcement。 | stat/unlink未呼出fixture。 |
| REL-U04-06 | doctor probe failure | 他doctor checksを継続し、markerを変更しない。 | read-only failure fixture。 |
| REL-U04-07 | autonomous recompose | 全mutation前に拒否し、state/plan/graph/audit bytesを保存する。 | before/after byte comparison。 |

fresh markerをjanitorが削除せず、stale削除をcarve-out拒否の条件や成功証拠にしない。gated/unset autonomyは既存strict validationへ渡し、成功条件を緩和しない。

## Determinism・observability

- 同一tokensから3入口で同一help routingを得る。
- 同一stat/nowMs/TTLからabsent/fresh/stale/unreadableを同一順序で分類する。
- Stop hook diagnosticはcarve-out decisionとjanitor outcomeを区別する。doctorはabsent行なし、fresh advisory PASS、stale FAIL+remediationを投影する。
- new audit event、metrics backend、trace collector、retention、alert thresholdを追加しない。

## Verification gate

targeted routing/marker/recompose testsと6 harness projection checkを通し、`bun run typecheck`、`bun run lint:check`、`bun run dist:check`、`bun run promote:self:check`、`bash tests/run-tests.sh --ci`を同一最終SHAでexit 0とする。未実施・stale結果をgreenへ読み替えず、full-CI-required gateではIssue #1313未解消なら停止する。

push前local lcovでpatch追加行の未カバー0を実測する。spawn blind spotは対象moduleの計測状況を実測後、計測済みmoduleへのin-process seamで検証する。waiverは既決の二段判定と権威あるpatch/CI lcov証拠を満たす残余行だけに限定する。

## トレーサビリティ

REL-U04-01〜07は`business-rules.md`のBR-U04-08〜25、`business-logic-model.md`のFreshness/Janitor/Doctor/Recompose、`requirements.md`のFR-1、NFR-1〜6、`technology-stack.md`のtest/generator境界に対応する。
