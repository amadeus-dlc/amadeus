# Performance Requirements — harness-hook-correctness

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。本Unitはローカルhook adapterと生成projectionの是正であり、network serviceや対話APIではない。このため根拠のないp95/p99応答時間やthroughput SLOを新設せず、既存実行経路の待機・I/O・終了契約を検証する。

## 実行時間と待機契約

| ID | 品質要件 | 検証可能な合格条件 |
|---|---|---|
| PERF-U07-01 | `spawnHookWithRuntime`はadapter自身を起動したBun runtimeを`process.execPath`で直接起動し、PATH探索を行わない。 | PATHからBunを除いたfixtureで対象childが起動し、bare `bun` runtime起動siteが対象inventoryに0件。 |
| PERF-U07-02 | Kiro IDE payload分類は`USER_PROMPT`を同期的に処理し、stdinの到着を待つ固定raceを持たない。 | 対象adapter内の2秒`setTimeout` raceが0件で、stdinをcloseしないfixtureでも分類処理が完了する。 |
| PERF-U07-03 | runtime置換の前後でchildのstdin、stdout、stderr、cwd、exit codeを保存する。 | 同一fixtureの各channelとexit codeが期待値に一致し、余分なstdout bytesが0。 |
| PERF-U07-04 | debug無効の既定経路は追加log I/Oを行わない。 | debug-off fixtureのstdoutがbaselineとbyte-identicalで、debug file生成が0件。 |

U07は既存のhook invocationごとに1 childを起動する構造を変えず、daemon、polling loop、retry loop、network callを追加しない。応答時間の絶対値はhostと端末負荷に依存するため、本Unitでは新しい時間閾値を契約化しない。

## Throughput・resource境界

- 同一入力から重複したcanonical success eventを生成せず、failed/unknown eventからartifact成功eventを生成しない。
- payload-free runtime/state eventはaudit tailでforward-only判定を行い、過去eventの無制限scanや無制限再試行を追加しない。
- sourceから6 harness projectionを一括生成し、承認済み11 Claude hook commandを全数検査する。件数増加や動的fan-outは本Unitの対象外とする。
- 新runtime dependency、常駐process、database、cache、network resourceを追加しない。

## Benchmarkと検証

targeted integration testは、PATH除去、stdin未close、positive/negative Kiro payload、空白入りworkspace、11 command列挙を実ファイル・実child境界で検査する。最終gateではtargeted testsに加え、`bun run typecheck`、`bun run lint:check`、`bun run dist:check`、`bun run promote:self:check`、`bash tests/run-tests.sh --ci`をexit 0とする。RE時に未実施だったfull testsや別SHAの結果を成功証拠へ流用しない。

push前にlocal lcovを生成し、patch追加行の未カバーを0とする。spawn経由でcoverage計測できない行は、対象moduleの実測後に既存の計測済みmoduleへin-process seamを置いて検証する。waiverは既決の二段判定と公式証拠条件を満たす残余行だけに限定し、genericなcoverage成功で代替しない。performance regressionの証拠は固定時間値ではなく、2秒race 0件、余分なI/O 0件、件数不変、生成bytes一致で残す。

## トレーサビリティ

PERF-U07-01〜04は`business-rules.md`のBR-U07-01〜04、09、`business-logic-model.md`のFlow A/B、`requirements.md`のFR-4とNFR-3〜8、`technology-stack.md`のBun/TypeScript実行基盤に対応する。

## Review — Iteration 1

- Reviewer: `amadeus-architecture-reviewer-agent`
- Reviewed at (UTC): `2026-07-20T15:19:55Z`
- Verdict: **NOT-READY**

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Major | `performance-requirements.md:25`, `reliability-requirements.md:39` | `requirements.md` NFR-5は targeted testsと4コマンドに加えて `bash tests/run-tests.sh --ci` のexit 0を必須にし、RE時の未実施full testsを成功証拠に流用しないと固定している。両方のverification gateはfull CIを合格条件から外し、Issue #1313の後続再確認だけに置き換えているため、NFR-5を満たしたと実装者が判定できない。 | 現時点で成功を主張せず、後続full-CI gateで `bash tests/run-tests.sh --ci` exit 0を必須とし、#1313未解消時は停止することをNFR-5の合格条件として明記する。 |
| 2 | Major | `reliability-requirements.md:37-43` | トレーサビリティはNFR-1〜6対応を主張するが、NFR-6の「push前local lcovでpatch追加行の未カバー0」、spawn blind spotのin-process seam検証、既決waiver条件のいずれも合格条件・evidenceに存在しない。 | 新しいwaiverを設計せず、`requirements.md` NFR-6の3条件をverification gateとtest ownershipに機械転記する。 |
| 3 | Major | `performance-requirements.md:18-19` | Functional Designはpayloadの1回parseとaudit-tail/forward-only経路を固定するが、audit tail評価を正確に1回とすること、および1入力eventあたり分類・audit・sensor経路を最大1回とする数量制約はconsumesにない。E-OC1承認は新規NFR閾値を禁止しており、実装方式や将来の正当な内部評価を不要に縛る未承認具体化である。 | 「同一入力から重複したcanonical success eventを生成しない」と「無制限scan/retryを追加しない」の既決不変条件に閉じ、正確な回数制約を撤回する。回数を契約化する必要があるなら再付議する。 |

### Confirmed checks

- `process.execPath`、stdin/stdout/stderr/cwd/exit保存、2秒stdin race撤回、unknown/failed payloadのfail-closed分類とvisible dropはBR-U07-01〜09と整合する。
- 6 harness、承認済み11 Claude hook command、4 self-install非拡張、statusline/permission bytes不変の境界はFunctional DesignおよびRequirements Analysisと整合する。
- 未根拠のp95/p99、availability、RTO/RPO、retention、alert thresholdを設けず、Bun/TypeScript/既存packaging/test stackを維持し、新runtime dependency・network・credential・database・infrastructure・public APIを追加していない。
- questionsの質問0件とE-OC1承認範囲は5成果物に明示され、consumes 4件への参照は解決する。

### Sensor results

| Sensor | Result | Interpretation |
|---|---|---|
| `required-sections` | PASS | 5成果物は必須文書形状を満たす。 |
| `upstream-coverage` | PASS | 5成果物は宣言consumesを参照する。ただしNFR-5/6の意味的脱落はFinding 1/2として残る。 |
| `answer-evidence` | PASS | questionsの承認回答が存在する。 |
| `linter` | N/A | Markdown filter非該当。 |
| `type-check` | N/A | Markdown filter非該当。 |

### Summary

主要なruntime・classification・projection境界は実装可能である。しかし、既決のNFR-5/6 verificationが合格条件から欠落し、同時に未承認の回数制約が追加されているため、現状は実装・gate判定に解釈を要し **NOT-READY** とする。

## Review — Iteration 2

- Reviewer: `amadeus-architecture-reviewer-agent`
- Reviewed at (UTC): `2026-07-20T15:22:55Z`
- Verdict: **READY**
- Finding severity: **CRITICAL 0 / MAJOR 0 / MINOR 0**

### Iteration 1 findings再評価

1. **RESOLVED — NFR-5 full CI。** PerformanceとReliabilityのverification gateはtargeted tests、4既存check、`bash tests/run-tests.sh --ci`を同一最終SHAでexit 0とする条件へ復帰した。RE時の未実施結果やstale結果の流用を禁止し、Issue #1313未解消でfull-CI-required gateに到達した場合の停止条件も明示されている。
2. **RESOLVED — NFR-6 coverage。** Performance、Reliability、Tech Stackはpush前local lcovでpatch追加行の未カバー0、対象module実測後のin-process seam、既決の二段判定と権威あるpatch/CI lcov証拠に限定したwaiverを、合格条件とtest ownershipに転記した。新しいwaiver policyは追加していない。
3. **RESOLVED — 未承認回数制約。** 「1入力eventあたり最大1回」および「audit tail評価1回」は撤回された。現在の契約は、同一入力から重複canonical successを生成しないこと、無制限scan/retryを追加しないことに閉じており、Functional Designの決定性・forward-only境界と整合する。Scalabilityのfixtureもexact event countから重複success/false successの禁止へ縮退している。

### Confirmed checks

- `process.execPath`によるruntime起動とI/O/cwd/exit保存、2秒stdin race撤回、unknown/failed payloadのfail-closed分類、visible drop、audit-first/forward-only/advisory fail-openは既決のBR-U07-01〜13に収まる。
- 6 harness、11 Claude hook command、4 self-install非拡張、statusline/permission bytes不変、`packages/framework/`正本と生成projectionの同一commit同期は機械検証可能である。
- 新しいSLO、failure classification、ownership、public API、runtime dependency、network、credential、database、infrastructureは追加されていない。
- 修正はNFR-5/6とE-OC1承認範囲の機械転記に限定され、修正由来の新規矛盾はない。

### Sensor results

| Sensor | Result | Interpretation |
|---|---|---|
| `required-sections` | PASS | 影響成果物の必須文書形状を再確認。 |
| `upstream-coverage` | PASS | 影響成果物のconsumes参照とNFR-5/6の意味的対応を再確認。 |
| `answer-evidence` | PASS | questionsの承認範囲と成果物の映射が一致。 |
| `linter` | N/A | Markdown filter非該当。 |
| `type-check` | N/A | Markdown filter非該当。 |

### Summary

Iteration 1の3件はすべて解消し、NFR-5/6の必須gateと未承認回数制約の境界が実装者に対して一意になった。後続full-CI-required gateの#1313停止条件を含め、現成果物は **READY** である。
