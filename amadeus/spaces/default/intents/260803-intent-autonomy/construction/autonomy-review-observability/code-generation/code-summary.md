# Code Summary — autonomy-review-observability

## 実装結果

U4 `autonomy-review-observability`（Issue #2067）を、U3 immutable autonomy projectionを消費する harness-neutral Core として実装した。active / completed Intent の自動判断を同じread modelで一覧・詳細表示し、未レビューqueue、real-human accept / flag、completed sealを保持する限定review extension、status / telemetry、永続snapshot reloadを追加した。実装commitは `6cdfcae8005c9d33d825f53ff506fa80a9f4fdc9`（`feat(autonomy): add decision review observability`）である。

## 主な変更

- `packages/framework/core/tools/amadeus-autonomy-review.ts`
  - decision list / detail、redaction、review eligibility、snapshot-bound cursorを実装した。
  - canonical human turnをsource Intentから再検証し、active targetの同一Intent reviewとcompleted targetのactive-source reviewを認可する。
  - accept / flagのterminal append、same-choice idempotency、different-choice conflictを実装した。
  - completed completion sealを変更せず、review eventだけを別extension chainへappendする。
  - snapshot export / reload時にpayload digest、event identity、projection revision、extension headを検証し、改変を拒否する。
  - human / machine status、safe Event Registry fields、safe OTel attributes、5 harness共通contractを公開する。
- `packages/framework/core/tools/amadeus-audit.ts`、`packages/framework/core/otel/event-registry.ts`、`packages/framework/core/knowledge/amadeus-shared/audit-format.md`
  - `AUTO_DECISION_REVIEWED` を canonical 85件目のaudit eventとして追加し、event name、required / optional attributes、audit formatを同期した。
- `tests/unit/t433-autonomy-review-observability.test.ts`
  - active / completed queue、cursor drift、redacted detail、real-human provenance、completed seal保持、tamper reject、synthetic reject、idempotency / conflict、completed status、safe telemetry、exact 5 harness cohortを検証した。
- package generatorにより Claude Code、Codex、Cursor、OpenCode、Kimi Code、Kiro、Kiro IDE の全7生成treeを同期し、現行5 self-install harnessへ共通Coreをpromoteした。

## 安全境界と非目標

- flagは `self-fix` / `self-feature` の提案だけを返し、rollback、選択effectの再実行、grant変更、新規Intent生成を行わない。`createdIntentCount` は常に0である。
- completed review後もworkflowはcompleted / terminalのままであり、completion sealを再計算しない。
- review queueは観測・事後レビュー用であり、既存autonomy flowへ新しいmid-flow gateを追加しない。
- PR / merge / GitHub semantics、外部runner / supervisor、U5 terminal live completionはCoreへ含めていない。
- U3のdecision projectionを入力正本とし、U4に別のdecision authorityを作っていない。

## 検証結果

- focused U4 test: 10 tests / 29 expects、全件pass。
- Event Registry driftを含むfocused suite: 36 tests / 579 expects、全件pass。
- focused coverage: 新規 `amadeus-autonomy-review.ts` は Functions 91.18%、Lines 87.24%。依存するU3 moduleを含む合算値ではなく、新規U4 module単体の値である。
- `bun run typecheck`: pass。
- 新規source / testへのtargeted Biome check: warning / errorともに0。
- `bun run lint`: exit 0。repository既存baselineとして398 warnings / 23 infosが出たが、新規U4 fileにはwarningなし。
- `bun scripts/package.ts --check`: Claude / Codex / Cursor / Kimi / Kiro / Kiro IDE / OpenCode の全7生成treeでpass。
- `bun run promote:self:check`: Claude Code / Codex / Cursor / OpenCode / Kimi Code の現行5 self-install harnessでpass。
- `git diff --check`: pass。

## 全体CIとdefault timeoutの切り分け

`bun run test:ci` は765 test filesを完走したが、default timeout / wall-clock driftとして次の5ファイル、合計7 assertionsが失敗した。

- `tests/integration/t-codex-hooks-migration.test.ts`
- `tests/integration/t-solo-standing-grant-opencode-mint.test.ts`
- `tests/integration/t225-upstream-v2-migration-preflight.test.ts`
- `tests/smoke/t05-run-tests-parallel.test.ts`
- `tests/unit/t17.test.ts`

この5ファイルを `bun test --timeout 120000` でまとめて再実行した結果は 212 pass / 1 skip / 0 fail、2,302 expects だった。skipはinvalid UTF-8 path bytesを扱う環境依存caseである。したがってdefault runの5件はU4 behaviorの回帰ではなく、既知の重いsuiteの時間制約として切り分けた。AWS credentials無効時のlive SDK / substrate testもrunner規則どおりskipされた。

## 親再検証で判明した追補修正

U4実装commitでは `t81` のaudit event count説明を85へ更新した一方、実assertion `expect(count).toBe(84)` の更新が漏れていた。親の再検証がこの不整合を検出し、親統合commit `5a1851593ed297f0942b63affac81a4be8bc8903`（`fix(autonomy-review): update audit count assertion`）で `expect(count).toBe(85)` へ修正済みである。本Boltでは親commitを取り込まず、コードを追加変更せず、収束事実だけを記録する。

## 残作業

U4の実装残はない。後続のU5はU4のreview / status projectionを消費するため、U4統合後に開始する。U5のterminal completion実装や検証はこの成果物の対象外である。
