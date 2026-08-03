# Code Generation Plan — advisory-human-choice

## 入力とスコープ

- 対象intent: `260803-advisory-human-choice`
- scope: `self-fix`
- Test Strategy: `Comprehensive`
- 要件正本: `amadeus/spaces/default/intents/260803-advisory-human-choice/inception/requirements-analysis/requirements.md`
- Brownfield補助入力:
  - `amadeus/spaces/default/codekb/amadeus/business-overview.md`
  - `amadeus/spaces/default/codekb/amadeus/architecture.md`
  - `amadeus/spaces/default/codekb/amadeus/code-structure.md`

`self-fix`ではUser Stories、Application Design、Units Generation、Functional Design、NFR DesignをSKIPしている。そのため、本UnitはIssue #2129と承認済み要件のFR-1〜FR-6、NFR-1〜NFR-4、受け入れ基準1〜17から直接スコープする。欠落成果物の内容は推測しない。

## 実装方針

現在の`directive.advisories`はstage bodyを許可するnudgeであり、要件のfail-closed holdを表現できない。修正では、未解決advisoryがある間は`run-stage` / `dispatch-subagent`を返さず、専用のadvisory-choice待機directiveを返す。

人間choiceはLLMが渡す一般`--user-input`から生成しない。各harnessのUserPromptSubmit境界が、開いているadvisory instanceと実際のpromptを照合し、列挙済みchoiceだけを永続receiptへ変換する。engineはreceiptを検証して次のmoveを決める。

- `defer-with-risk`: 当該checkpoint instanceだけを解決し、元のstage directiveを再発行する。
- `run-now`: Formal Model Checkの明示実行へrouteし、現在のtarget/spec identityに相関した検証済み`NOT_DETECTED`だけでholdを解除する。
- `DETECTED` / `HARNESS_ERROR` / partial / incomplete / provenance不成立: holdを維持し、結果と再実行またはリスク付き延期の選択を人間へ戻す。

## 実装手順

### Step 1: directiveとdomain contractの失敗先行テスト

- [x] `tests/unit/t-advisory-human-choice-domain.test.ts`を追加し、instance identity、choice列挙、receipt parse、相関不一致、stale receipt、複数advisory全件解決をRedで固定する。
- [x] `tests/unit/t113.test.ts`へadvisory-choice待機directiveのvalid/invalid shapeを追加し、従来の`run-stage.advisories`だけではholdにならないことを明示する。
- [x] Review Iteration 1で、正準`renderAdvisoryChoiceQuestion`が複数messageを逐語・配列順でrenderするunit testをRedから追加する。
- [x] 受け入れ基準1〜4、9〜10、14〜15をこのStepへ対応付ける。

### Step 2: advisory instance・choice receiptの正準domainを実装

- [x] `packages/framework/core/tools/amadeus-advisory-choice.ts`を追加し、pending instance、target/spec/checkpoint/intent identity、choice receipt、human-turn provenanceをParse, Don't Validateで表現する。
- [x] instanceは同一pending checkpointの`next`、resume、compaction、session再開で保持し、解決後の再発火・別stage・別run・別spec/targetでは再発番する。
- [x] 書き込みはaudit lock下のatomic writeとし、破損・欠落・相関不一致はdenyへ倒す。
- [x] receipt writerをmodule内の保護境界に限定し、一般CLI・任意audit入力からの生成APIを公開しない。
- [x] 受け入れ基準3〜4、8〜10、14〜15をこのStepへ対応付ける。

### Step 3: engineをstage開始前のfail-closed holdへ変更

- [x] `packages/framework/core/tools/amadeus-directive.ts`に専用のadvisory-choice待機directiveとruntime validationを追加する。
- [x] `packages/framework/core/tools/amadeus-orchestrate.ts`で、`requirements-analysis`、`functional-design`、`build-and-test`のadvisory発火時にpending instanceを生成・再利用し、未解決ならstage directiveをemitしない。
- [x] main、`--single`、per-unitの`gate:false`初回directiveで同じ共通guardを通す。
- [x] advisoryなし、`current`、`not-composed`では既存directive bytesと進行を維持する。
- [x] 現行の`(plugin, code)` run latchを人間choice receiptの代用にせず、必要なら提示重複抑止だけへ責務を縮小する。
- [x] 受け入れ基準1〜2、11〜14、16〜17をこのStepへ対応付ける。

### Step 4: 実HUMAN_TURNからexact choiceを保護記録

- [x] `packages/framework/core/hooks/amadeus-mint-presence.ts`と共通presence seamを拡張し、pending advisoryがある場合だけ実promptを正準choiceへ変換してreceiptをmintする。
- [x] `1` / 正式option labelなど明示的に列挙した入力だけを受理し、曖昧入力・機械注入turn・別instance向け入力はreceipt化しない。
- [x] raw prompt本文は永続化せず、正準choice、instance identity、HUMAN_TURN timestamp/shard、event identityだけを記録する。
- [x] Codex、Claude、Kiro、Kimi、OpenCodeの各harness adapterが同じ共通seamを利用することを投影テストで固定する。stable session identityがないharnessは共有workspace key等へfail-openせず、利用可能な実prompt provenanceでのみ処理する。
- [x] 受け入れ基準2〜4、8〜10、14〜15をこのStepへ対応付ける。

### Step 5: run-nowの形式検査結果を検証してholdへ反映

- [x] Formal Model Check実行成果物のmanifest、completion marker、`complete`、`partial`、verdict、target/spec identity、provenanceを読み取る共有verifierを正準側へ追加する。
- [x] engineは`run-now` receipt後に明示実行をrouteし、検証済み`NOT_DETECTED`だけでpending instanceを解決する。
- [x] `DETECTED`は反例identityを提示してholdを維持し、修正後再実行または明示的なリスク付き延期を要求する。
- [x] `HARNESS_ERROR`、partial/incomplete、manifest欠落・破損、target/spec不一致はholdを維持する。
- [x] `DETECTED → fresh run-now → retry NOT_DETECTED`と`HARNESS_ERROR → fresh defer`を、同一instance・異なるHUMAN_TURN event identity・永続receiptまで連続遷移testで検証する。
- [x] 後段`formal-model-check`予定や古いSpecHashStateだけでは早期checkpointを解除しない。
- [x] 受け入れ基準5〜7、13、17をこのStepへ対応付ける。

### Step 6: audit eventと診断を同期

- [x] advisory instance生成、choice receipt、hold拒否、形式検査結果、hold解除を追跡できる永続side-ledgerを追加する。
- [x] audit vocabularyとknowledge docsを正本から同期し、既存event registryに未使用eventを増やさずdrift 0件を維持する。
- [x] choice receiptとhold解除を同じlock/atomic-write境界で検証し、stateだけ・traceだけの先行成功を残さない。
- [x] 診断にはplugin、code、checkpoint、instance、必要な次の人間choiceを含める。
- [x] FR-6、NFR-1、NFR-4、受け入れ基準15をこのStepへ対応付ける。

### Step 7: checkpoint・経路対称性のintegration test

- [x] 既存の`tests/integration/t381-advisory-checkpoints-latch.integration.test.ts`を拡張し、3 checkpoint × main / `--single` / per-unitのstage-body開始前拒否を検証する。
- [x] run-now `NOT_DETECTED`、`DETECTED`、`HARNESS_ERROR`、partial/incomplete、provenance不成立、risk deferを検証する。
- [x] 同一instanceの再利用、解決後再発火、別checkpoint、別spec/target、複数advisoryを検証する。
- [x] advisoryなし、`current`、`not-composed`の既存回帰を検証する。
- [x] 受け入れ基準1〜17のtraceability tableを`code-summary.md`でテスト名と対応付ける。

### Step 8: harness projectionとユーザー向けprotocolを同期

- [x] 正本`packages/framework/core/amadeus-common/protocols/stage-protocol.md`の「nudge, not a gate」を、人間choice必須のfail-closed checkpoint契約へ更新する。`.codex`等は生成投影としてのみ同期する。
- [x] 各harnessのquestion/directive renderingに、全advisory messageの同一内容提示と2択表示を追加する。
- [x] rendering ownerを`packages/framework/core/tools/amadeus-directive.ts#renderAdvisoryChoiceQuestion`へ一本化し、engine integrationで`question`の逐語値を検証する。
- [x] `tests/e2e/t-advisory-human-choice-rendering.e2e.test.ts`で7 harnessの配布projectionを別Bun processから実行し、複数messageの逐語提示を検証する。
- [x] 正本のみを編集し、`bun scripts/package.ts`で`.claude`、`.codex`、各`dist/`、self-install投影を再生成する。生成物を直接編集しない。
- [x] `bun scripts/package.ts --check`と`bun run promote:self:check`でdrift 0件を確認する。
- [x] FR-1〜FR-5、NFR-2、受け入れ基準2、11〜17をこのStepへ対応付ける。

### Step 9: Comprehensive検証と落ちる実証

- [x] 各vertical sliceで、対象testを先に失敗させたRed証拠を記録し、最小実装でGreenにする。
- [x] focused unit/integration/E2E testを実行する。Comprehensiveの3層はunit=`t113`/`t203`、integration=`t378`/`t381`、E2E=`t-advisory-human-choice-rendering.e2e`で構成する。
- [x] `bun run lint`、`bun run typecheck`、`bun run test:ci`を実行した。`typecheck`は成功、`lint`は未変更の既存fileで失敗、`test:ci`の4 timeout候補は120秒・直列再実行で全件成功した。
- [x] receiptなしでdirect reportを拒否するfailure-injection相当の回帰testを追加し、guardを外すと進行できる境界を固定する。
- [x] event-registry drift、self-scope consistency、package/promote driftを確認する。patch coverageは専用閾値を追加せずfocused testで変更経路を網羅した。
- [x] `lint`失敗元が未変更の`packages/framework/core/tools/amadeus-audit.ts`であることを`git diff --quiet`で確認した。

### Step 10: code summaryと計画差分を記録

- [x] 本planの各checkboxを実測結果に基づいて更新する。
- [x] `code-summary.md`へ変更file、主要判断、Red→Green証拠、テスト結果、要件traceability、plan逸脱を記録する。
- [x] local Formal Model Check証拠契約の不足を検出した時点で停止し、承認されたスコープ例外だけを反映した。

## Test configuration

既存のBun test設定と`package.json` scriptを利用し、新しいtest runner設定は追加しない。新規設定が必要だと実測で判明した場合は、理由と影響をplan変更として承認前に提示する。

## 非スコープ

- Issue #2139のlocal runner `SOURCE_IDENTITY`修正
- TLA+ model/invariant/toolchain自体の変更
- Formal Model Checkの全workflow自動実行
- advisoryと無関係なstage approval、standing grant、delegationの再設計

## 承認済みスコープ例外

`2026-08-03T12:18:04Z`に、Step 5で実測した証拠契約の欠落を解消する選択肢1がユーザー承認された。local Formal Model Check成果物manifestへのtarget、spec identity、source provenance追加と、advisory専用の決定的出力先は本planの実装範囲に含める。TLA+ model、invariant、TLC探索処理、CI runtime receiptは引き続き変更しない。

## 実装時の計画具体化

Step 6の「最小event集合」は、新しいregistry eventを追加せず、既存の物理`HUMAN_TURN` eventとaudit lock下でatomic writeする`<record>/.amadeus-advisory-choice.json`を組み合わせたauthoritative side-ledgerとして実装した。要件FR-6が許容する「auditまたは同等の永続trace」を満たし、同一状態遷移をeventとstateへ二重書きして不整合面を増やさないためである。knowledge docsへ正準契約を記載し、event-registry driftは0件を維持した。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T13:07:25Z
- **Iteration:** 1
- **Scope decision:** none

人間への逐語提示とComprehensiveテスト戦略の受入証拠が明示契約を満たしておらず、検出・失敗後の再選択ライフサイクルにも追跡可能性が不足している。

### Findings

- BLOCKER | FR-1.1、NFR-3、受け入れ基準2は全advisory messageが同一内容で人間へ提示されることを要求するが、code-summaryの証拠は`t113`のdirective schemaとdomainの全件解決だけである。Step 8を完了扱いしている一方、変更正本一覧にharness renderingのowner/sourceがなく、提示内容を検証するprojectionまたはE2E testもトレーサビリティにないため、directive内の保持から実際の人間提示までの境界を検証できない。
- BLOCKER | code-generation-planはTest Strategyを`Comprehensive`と宣言しているが、stage定義が必須とするunit＋integration＋E2Eのうち、計画・code-summaryともE2E test fileまたは既存integration testをE2E相当とする根拠を示していない。明示されたCode Generationのテスト計画契約に違反している。
- BLOCKER | FR-2.5〜2.6、NFR-3、受け入れ基準6〜7は`DETECTED`または実行失敗後に、freshな人間choiceで再実行またはリスク付き延期へ遷移できることを要求する。code-summaryはhold維持テストと`<instance>-retry-N`出力先だけを示し、`DETECTED/error → 再提示 → 新しいHUMAN_TURN receipt → retry成功またはdefer`の連続遷移を検証するテストを対応付けていないため、receiptの一回限り消費と同一instance再選択が両立するか実装・受入判定できない。
- FOLLOW-UP | `bun run lint`は既存・未変更箇所が原因と記録されているものの最終検証は失敗状態である。変更起因でない証拠は示されているため本件単独ではBLOCKERにしないが、クリーンな品質ゲートを回復する別対応が必要である。
- NIT | plan Step 8は生成投影である`.codex/amadeus-common/protocols/stage-protocol.md`を編集対象として記す一方、code-summaryでは正本`packages/framework/core/amadeus-common/protocols/stage-protocol.md`を編集したとしている。実施内容は正本編集方針に適合するが、この計画具体化をplan差分として明記すると境界が明確になる。

## Review Iteration 1 修正結果

- [x] BLOCKER 1: 正準renderer ownerを追加し、unit、engine integration、7 harness projection E2Eで全messageの逐語・配列順提示を検証した。
- [x] BLOCKER 2: Comprehensiveをunit＋integration＋E2Eの3層へ具体化し、実ファイル`tests/e2e/t-advisory-human-choice-rendering.e2e.test.ts`を追加・実行した。
- [x] BLOCKER 3: DETECTED後のfresh retry成功とHARNESS_ERROR後のfresh deferを、同一instance、異なるHUMAN_TURN event identity、永続receiptを含む連続遷移として検証した。
- [x] NIT: stage protocolの正本と生成投影をStep 8で明確に区別した。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T13:16:40Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の3 BLOCKERは、正準rendererと7 harness projection E2E、Comprehensiveの3層テスト、失敗後のfresh receipt連続遷移によって解消された。

### Findings

- FOLLOW-UP | `bun run lint`は今回未変更の既存unused symbolにより引き続き失敗している。変更起因でないことが記録されているためREADYを妨げないが、品質ゲートを完全にGreenへ戻す別対応が必要である。
- NIT | rendering E2Eは配布済みrendererを別Bun processで実行するprojection境界を検証しており、対話型harness UIそのもののcaptureではない。ただし正準rendererのunit、engine `question`完全一致integration、conductorの非改変protocol契約と組み合わされ、現在のfail-closed設計では要件を満たす。将来harness UIを決定的にcaptureできる場合は追加すると証拠がさらに強くなる。
