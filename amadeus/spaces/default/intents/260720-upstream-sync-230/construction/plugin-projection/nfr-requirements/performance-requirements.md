# Performance Requirements — plugin-projection

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。build-time local projectionであり、runtime serviceのlatency/throughput SLOは追加しない。

## 有界batch要件

| ID | 要件 | 合格条件 |
|---|---|---|
| PERF-U09-01 | plugin discoveryはrepository rootの`plugins/<name>/`だけを列挙し、name順へcanonical sortする。 | generated distや他treeをsourceにしない。 |
| PERF-U09-02 | 全pluginをC1でvalidateしてからprojection writeを開始する。 | invalid fixtureのdist/self-install write 0。 |
| PERF-U09-03 | plugin、artifact、harness、driftをcanonical sortし、filesystem順へ依存しない。 | input enumerationを反転してもbytes/diagnostic一致。 |
| PERF-U09-04 | 6 harness treeをtemp rootへ全生成し、成功harnessだけの部分commitをしない。 | 1面failure時の全generated tree bytes不変。 |
| PERF-U09-05 | plugin 0件では既存build path・serializationを使い、空index/directory/keyを追加しない。 | 既存6 harness file set/content/order/CLI result byte差分0。 |

新daemon、network fetch、persistent cache、parallelism policy、retry loopを追加しない。絶対build time thresholdは設定しない。

## Verification gate

targeted discovery/projection/drift/zero-plugin testsと、`bun run typecheck`、`bun run lint:check`、`bun run dist:check`、`bun run promote:self:check`、`bash tests/run-tests.sh --ci`を同一最終SHAでexit 0とする。未実施/stale結果をgreenへ読み替えない。

push前local lcovでpatch追加行未カバー0を確認し、spawn blind spotは実測後の計測済みmoduleへのin-process seam、waiverは既決証拠条件を満たす残余行だけに限定する。

## トレーサビリティ

PERF-U09-01〜05は`business-rules.md`のBR-U09-01〜20、`business-logic-model.md`のProjection pipeline、`requirements.md`のNFR-1〜8、`technology-stack.md`に対応する。

## Review — Iteration 1

- Reviewer identity: `amadeus-architecture-reviewer-agent`
- Reviewed at (UTC): `2026-07-20T23:34:45Z`
- Verdict: **READY**
- Scope decision: **none**

### Findings

| Severity | Finding |
|---|---|
| CRITICAL | 0件 |
| MAJOR | 0件 |
| MINOR | 0件 |

### Confirmed checks

- E-OC1再裁定AとBR-U09-01〜21に従い、public seamは`discoverPluginSources`、`buildPluginProjection`、`buildHarnessTree`、`checkHarnessTree`の正準4関数だけである。`buildSelfInstallProjection`はC5内部helperに閉じ、引数型変更や第五APIを追加していない。
- package対象はclaude/codex/cursor/kiro/kiro-ide/opencodeの6面、self-install対象はclaude/codex/cursor/opencodeのclosed 4面である。両matrixを独立検証し、kiro系のproject-local promotionを拒否する境界が一貫している。
- repository rootの`plugins/<name>/`だけをsourceとし、C1による全件validation、duplicate identity・unsafe path・output collision検査をbuild/write前に完了する。plugin専用の第二schema/parserやgenerated treeのsource化はない。
- harness、plugin、artifact、manifest field、driftをcanonical sortし、同一source snapshotと既存`HarnessManifest`から6面を決定的に投影する。`MISSING`、`DIFFERS`、`ORPHAN`、`UNREFERENCED`は全件集合比較/read-setから導出され、check modeはwrite 0である。
- plugin 0件では既存build path・serializationを再利用し、empty index/directory/keyを追加せず、既存6 harnessのfile set・content・order・CLI resultをbyte-identicalに保つ。
- 6 harness treeはtemp rootへ全生成してからgenerator ownership内でcommitし、validation/build/collision failure時に成功面だけを更新しない。self-installは既存promoterの4面境界に残し、未承認のcross-surface atomicity policyを追加していない。
- NFR-5のtargeted testsと同一最終SHAのfull verification、NFR-6のpatch追加行未カバー0・in-process seam・既決waiver条件が明記され、未実施・stale結果をgreenへ読み替えない。
- U09はprojection/driftだけを所有し、compose/doctor/drop、reference plugin/E2E/guide、ledger closureへ越境しない。新ownership、error policy、dependency、network、credential、database、service、UI、retention、SLO、audit event、public APIは追加されていない。

### Sensor results

- Applicable sensor results: **11/11 PASS**。
- `required-sections`、`upstream-coverage`、`answer-evidence`: **PASS**。
- `linter`、`type-check`: Markdown成果物のため非該当。

### Summary

5成果物は承認済みC5 projection/drift契約を測定可能なNFRとfailure fixtureへ機械導出している。追加のarchitecture judgmentなしで実装できる。
