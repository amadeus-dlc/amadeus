# Reliability Requirements — harness-hook-correctness

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。常駐serviceではないため、未根拠なavailability percentage、RTO、RPOを設定しない。信頼性はevent分類、状態遷移、advisory degradation、生成物durabilityの不変条件で定義する。

## Correctnessとfault tolerance

| ID | Failure scenario | Required behavior | Evidence |
|---|---|---|---|
| REL-U07-01 | PATHにBunがない | `process.execPath`で同一runtimeを起動し、既存I/O/cwd/exit契約を保存する。 | PATH除去integration fixture。 |
| REL-U07-02 | failed tool / unknown result | 成功eventを生成せず、既決のvisible hook-dropまたはno-opとする。 | positive/negative対照fixture。 |
| REL-U07-03 | empty/malformed `USER_PROMPT` | payload依存分類はadvisory no-op、payload-free runtime/state targetはaudit-tail self-gateへ進む。 | 両classのfixtureで分岐を固定。 |
| REL-U07-04 | stale audit history | completed/skipped/parked stateを過去の`STAGE_STARTED`へ巻き戻さない。 | forward-only state fixture。 |
| REL-U07-05 | debug output failure | 通常hook処理を失敗させず、debug-offのstdout bytesを変えない。 | debug on/offとwrite failure fixture。 |
| REL-U07-06 | projection drift | authored sourceを正とし、generator checkを非0で失敗させる。dist手編集を受理しない。 | 6面drift fixtureとpackage check。 |

処理途中の一方の成功を全体成功へ読み替えない。audit-and-sensorsはaudit firstで実行し、各advisory failureを既存contractどおり可視化する。新しいretry、recovery journal、failure classificationは追加しない。

## Determinismとdurability

- 同一source、payload、workspace、audit stateから同一classification、command、projection bytesを得る。
- unknown inputを推測で既知inputへ昇格せず、既知result wordingだけをpath抽出対象にする。
- sourceと6 harness projectionを同一commitで同期し、11 Claude hook commandの件数・順序・解決先を安定させる。
- statusline、permission glob、debug-off stdout、既定runtime path以外の公開bytesを変更しない。
- database、backup、disaster recovery infrastructureは存在せず、新設しない。version controlと既存generator checkが配布物の再構築境界である。

## Observability

| Signal | Requirement | Prohibited expansion |
|---|---|---|
| audit | 既存event順序を維持し、artifact/sensorより先に記録する。 | 新event type、payload全量dump、保持期間の独自設定。 |
| visible drop | failed/unknown/malformed分類の理由を反証可能に残す。 | dropを成功扱いすること、推測pathを記録すること。 |
| debug | 明示opt-inだけでhost adapter診断を出し、通常stdoutから分離する。 | debug常時有効、debug失敗によるhook停止。 |
| test evidence | PATH除去、stdin未close、failed tool、unknown wording、identity、空白path、projection driftをfixture化する。 | 手動観察だけで合格とすること。 |

本Unitはmetrics backend、trace collector、alerting serviceを追加しない。運用retentionやalert thresholdは既存要件に根拠がないため定義しない。

## Verification gate

REL-U07-01〜06のtargeted tests、11 command/6 projectionの全数検査、statusline/permission bytes不変を通したうえで、`bun run typecheck`、`bun run lint:check`、`bun run dist:check`、`bun run promote:self:check`、`bash tests/run-tests.sh --ci`を同一最終SHAでexit 0とする。RE時の未実施full testsやstale結果をgreenへ読み替えない。Issue #1313が未解消のままfull-CI-required gateへ到達した場合は停止し、成功を先取りしない。

push前local lcovでpatch追加行の未カバー0を実測する。spawn blind spotは対象moduleの計測状況を実測してからin-process seamで検証し、seamは既存の計測済みmoduleへ置く。waiverは既決の二段判定と、Codecovの権威あるpatch集計およびCI `lcov.info`による明示証拠を満たす残余行だけに限定する。

## トレーサビリティ

REL-U07-01〜06は`business-rules.md`のBR-U07-01〜11、`business-logic-model.md`のFailure decisionsと検証シナリオ、`requirements.md`のFR-4、NFR-1〜6、`technology-stack.md`のgenerator/test境界に対応する。
