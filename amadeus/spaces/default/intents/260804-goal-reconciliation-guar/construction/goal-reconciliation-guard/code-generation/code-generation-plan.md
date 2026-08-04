# Goal Reconciliation Guard コード生成計画

## 計画の前提

- 対象は `self-fix` / Brownfield の単一 Unit `goal-reconciliation-guard` である。`units-generation`、`functional-design`、`application-design`、`user-stories` はスコープにより SKIP されているため、承認済み `requirements.md` と CodeKB を正本としてスコープする。
- Goal は人間所有とし、AI の権限は差分検出、候補 verdict、change proposal の作成までに限定する。通常の stage 承認、一括委任、standing delegation、LLM 自己判定は Goal revision を有効化できない。
- 実装正本は `packages/framework/core/` とする。`dist/` と root の self-install 面は直接編集・Git 追跡せず、build 時に `bun scripts/package.ts` と `bun run promote:self` で一時生成して parity を検証する。検証後も source-only 境界を維持する。
- Test Strategy は **Comprehensive** である。unit、integration、E2E、failure injection、全 harness 配布 parity を要求・リスク・NFR に応じて実施する。UI、DB、常駐 service、IaC は存在しないため、フロントエンド、migration、deployment artifact は対象外とする。
- Goal の意味を自動判定する汎用 AI 基盤は作らない。機械検証可能な evidence と、専用の人間操作で拘束した semantic ruling を receipt に集約する。

## テスト設定の確認結果

- テストランナーは Bun 標準の `bun test` を `tests/run-tests.ts` / `tests/run-tests.sh` から駆動する。Vitest/Jest 設定はなく、既存の equivalent configuration は `bunfig.toml`、`tests/run-tests.ts`、`tests/lib/run-tests-args.ts`、`tsconfig.tests.json` である。
- lint は `biome.json`、型検査は `tsconfig.json` と `tsconfig.tests.json`、標準検証入口は `package.json` の `test:ci`、`coverage:ci`、`typecheck`、`lint`、`dist:check`、`promote:self:check`、`distribution:check` である。
- 新規テストは既存 tier 規約に従って `tests/unit/`、`tests/integration/`、`tests/e2e/` に置く。実 FS / process / crash injection は unit allowlist に入れず integration 以上へ置く。実装着手時に最新の `tNNN` 使用状況を再確認し、以下の `t417` 以降の候補番号が衝突していれば未使用番号へ機械的に変更する。
- 新しい runner tier や外部依存は追加しない。既存設定で表現できないことが実証された場合だけ、同じ変更内で設定、runner 契約、対応テストを更新する。

## 実装ステップ

- [x] **Step 1: 変更面とテスト設定のベースラインを固定する。** `amadeus-utility.ts` の `intent-birth`、`amadeus-orchestrate.ts` の gated / non-gated `report` と already-completed 分岐、`amadeus-state.ts` の `approve` / `complete-workflow` / terminal `finalize` / targeted recovery、`amadeus-workflow-completion.ts` の prepared completion、Intent registry / active cursor、mirror completion の実呼出し鎖を再走査する。あわせて `bunfig.toml`、`tests/run-tests.ts`、`tests/lib/run-tests-args.ts`、`tsconfig*.json`、`biome.json`、`package.json` が新規テストを既に包含することを確認し、変更前の関連テストを実行して baseline を保存する。**Trace:** FR-5、FR-9、FR-10、NFR-2〜NFR-4、受け入れ「Terminal path」「Harness」。

- [x] **Step 2: まず全要求を反証する落ちるテストを追加する。** 新規候補 `tests/unit/t417-goal-reconciliation-codec.test.ts` で unknown verdict、digest mismatch、stale revision、他 Intent receipt、改ざんを拒否する codec 契約を置く。新規候補 `tests/integration/t417-goal-reconciliation-completion.integration.test.ts` で明示 success metric を未達にした repo 外 fixture を使い、gated / non-gated report、direct `complete-workflow`、terminal `finalize`、targeted recovery、already-completed recovery の各経路が receipt 不在・`DEVIATED`・`UNVERIFIED` で赤になることを先に実証する。新規候補 `tests/integration/t418-goal-revision-authority.integration.test.ts` で stage 承認、standing delegation、LLM 単独、artifact 書換えが revision を進められないことを固定する。既存 artifact / phase-check bypass を有効にしても Goal guard が赤のままであるケースを含める。**Trace:** FR-2〜FR-6、FR-10、NFR-1〜NFR-3、受け入れ「Verdict」「Goal identity」「Human authority」「Terminal path」「Phase check」「Bypass」。

- [x] **Step 3: Initial Goal と不変 lineage の最小モデルを実装する。** 新規候補 `packages/framework/core/tools/amadeus-goal-reconciliation.ts` に、class-free な判別 union / smart constructor で `GoalId`、`GoalRevision`、`GoalChangeProposal`、`GoalVerdict`、`EvidenceReference`、`GoalReconciliationReceipt` の厳格 codec と canonical digest を実装する。`amadeus-lib.ts` / `amadeus-utility.ts` の `intent-birth` から、人間が開始した原入力、Intent UUID、scope を revision 0 に一度だけ拘束し、`<record>/goal/goal-lineage.json`（新規 schema artifact 候補）へ temp-write + rename で保存する。`amadeus-state.md` と `knowledge/amadeus-shared/state-template.md` には Goal ID、current revision、digest の参照だけを投影し、承認済み本文を二重保持しない。Intent Capture 実行 / SKIP の両 fixture を追加する。**Trace:** FR-1、FR-4、NFR-1、受け入れ「Goal identity」「Scope」。

- [x] **Step 4: Change proposal と人間専用 Goal revision 操作を最小実装する。** 新規 CLI artifact 候補 `packages/framework/core/tools/amadeus-goal.ts` に `propose`、`gate-start`、`approve-revision` を限定語彙として実装し、proposal は before / after、理由、影響 metric、現 Goal の未達、evidence digest を `<record>/goal/proposals/<proposal-id>.json` に拘束する。`approve-revision` は対象 Intent、proposal digest、parent revision、専用 gate 後の直接 HUMAN_TURN / presence reservation を同時検証し、standing grant・stage approval・delegate approval を明示拒否する。承認時だけ immutable revision を追記し current pointer を切り替え、同じ proposal の再実行は idempotent、別 session / Intent / revision への replay は失敗させる。通常 requirements 承認はこの CLI を呼ばず revision 0 を維持する。CLI を `amadeus-utility.ts` に無理に混在させるより責務を分離するが、共通の認可 primitive は既存 human-presence 実装を再利用する。**Trace:** FR-1、FR-2、FR-6、NFR-1、受け入れ「Human authority」「Goal identity」。

- [x] **Step 5: 項目別 reconciliation と durable receipt を実装する。** `amadeus-goal-reconciliation.ts` に current approved revision、実行時 scope / final in-scope stage / stage graph digest、承認済み requirements の trace、aggregate evidence を入力する純粋 evaluator を置く。機械判定可能な metric は決定的 check result から、意味判定項目は evidence 付き専用 human ruling からのみ `ACHIEVED` にする。全必須項目が `ACHIEVED` の場合だけ全体を `ACHIEVED` とし、artifact、phase-check、test green、mirror receipt 単独は evidence reference にはなっても verdict の代替にしない。`<record>/goal/reconciliation-receipts/<completion-instance>.json` に Intent / Goal / scope / graph / evidence digest、人間裁定参照、completion instance、時刻を atomic 保存し、検証 CLI `amadeus-goal.ts reconcile` は不足 evidence と必要な裁定を構造化表示する。**Trace:** FR-3、FR-4、FR-6、FR-9、NFR-1〜NFR-3、受け入れ「Verdict」「Goal identity」「Phase check」。

- [x] **Step 6: 有効な `ACHIEVED` receipt を単一 completion authority の共通 precondition にする。** `amadeus-workflow-completion.ts` に、選択 Intent、current Goal revision / digest、completion instance、実行時 scope の final in-scope stage、receipt verdict / digest を同一 snapshot で検証する `authorizeWorkflowCompletion`（名称候補）を追加する。`amadeus-state.ts` の `completeWorkflowForTarget` は state / audit / registry / cursor のいずれにも触れる前にこの authority を呼び、receipt 不在・stale・`DEVIATED`・`UNVERIFIED`・非 final slug を typed error で停止する。`AMADEUS_SKIP_ARTIFACT_GUARD` を含む既存 bypass と独立させ、Goal guard 用 environment bypass は作らない。**Trace:** FR-3〜FR-6、FR-10、NFR-1〜NFR-2、受け入れ「Verdict」「Terminal path」「Bypass」。

- [x] **Step 7: recovery と completion atomicity を failure injection で閉じる。** 新規候補 `tests/integration/t419-goal-reconciliation-recovery.integration.test.ts` と既存 `t47-failure-injection.test.ts` / `t145-state-lock-concurrency.test.ts` を用い、receipt persist、completion audit commit、state rename、registry update、cursor release の各境界で crash を注入する。再開 / retry / duplicate call は同じ completion instance と receipt を再検証し、Goal revision・stage graph・evidence が変われば `UNVERIFIED` に戻す。拒否時は stage artifact、audit、worktree、既存 receipt を保持し、成功時は二重 `WORKFLOW_COMPLETED`、二重 human ruling、部分 `Completed` を作らない。既存の逐次 replay-safe completion を維持するか、audit event set の atomic commit primitive を再利用して強めるかを実コードの failure proof で決め、別の汎用 transaction frameworkは作らない。**Trace:** FR-4、FR-6、FR-8、NFR-2〜NFR-3、受け入れ「Recovery」「Audit」。

- [x] **Step 8: Legacy Completed Intent を無変更で保持し、再確定だけを fail-closed にする。** legacy fixture の読み取り / status 表示は現状の bytes と履歴を維持する一方、`next` / `report` / `complete-workflow` / terminal `finalize` が再確定しようとした場合は receipt 不在を `UNVERIFIED` とする。`amadeus-goal.ts legacy-propose` / `approve-legacy-migration`（CLI候補）で immutable 原入力、当時の承認済み requirements、completion audit から不明・競合を残した proposal を再構成し、専用 HUMAN_TURN gate が Goal identity / revision / digest と metric 別 ruling を明示承認した場合だけ migration receipt を発行する。artifact / phase-check / 過去の `Completed` から `ACHIEVED` を推定せず、一括 backfill や既存 record rewrite をしない。**Trace:** FR-7、NFR-1〜NFR-3、受け入れ「Legacy」。

- [x] **Step 9: 全 terminal writer / recovery を共通 authority へ統合する。** `amadeus-orchestrate.ts` の gated final approve、non-gated final report、already-completed early `done`、mirror deferred completion、`amadeus-state.ts` の direct `complete-workflow`、terminal `handleFinalize`、`recoverCompletedTargetedApproval` を全数棚卸しする。terminal `finalize` は state を直接 `Completed` にせず共通 completion transaction を呼ぶ adapter にする。Operation 実行 / SKIP、Intent Capture 実行 / SKIP の scope fixture を組み合わせ、すべてが同じ receipt 判定と同じ error shape を返すことを table-driven integration test で証明する。非終端 `finalize` / `advance` の挙動は変更しない。**Trace:** FR-5、FR-7、FR-10、NFR-2〜NFR-3、受け入れ「Terminal path」「Scope」「Legacy」。

- [x] **Step 10: audit、Intent registry、state、cursor を同じ completion 契約へ接続する。** `amadeus-state.ts` の completion audit fields に Goal ID / revision / digest、receipt identity / digest、overall verdict、evidence / human ruling 参照を追加し、`WORKFLOW_COMPLETED` から receipt へ一意に辿れるようにする。必要最小限の Goal lifecycle event（候補: `GOAL_CHANGE_PROPOSED`、`GOAL_REVISION_APPROVED`、`GOAL_RECONCILED`、`LEGACY_GOAL_MIGRATED`）だけを `amadeus-audit.ts`、`otel/event-registry.ts`、`knowledge/amadeus-shared/audit-format.md` の canonical vocabularyへ同期し、cardinality / emitter parity / redaction safe-key drift testを更新する。`Status: Completed`、registry `complete`、active cursor 解放は valid receipt と completion audit の後だけ確定し、どの write が失敗しても recovery が同じ receipt へ収束することを byte比較する。**Trace:** FR-4、FR-5、FR-8、NFR-1〜NFR-2、受け入れ「Audit」「Recovery」。

- [x] **Step 11: mirror ordering と既存 guard 非退行を検証する。** `amadeus-orchestrate.ts` / `amadeus-mirror-lifecycle.ts` / `amadeus-workflow-completion.ts` の順序を、Goal authorization → 必要な local guard → mirror completion settlement → completion commit に固定し、valid `ACHIEVED` receipt 前に Issue close 等の外部作用へ進まないことを fake executor で確認する。mirror failure は Goal verdict / receipt を変更せず pending 配送として再試行し、artifact guard、phase-check guard、human-presence guard、mirror ownership guard の既存テストを維持する。既存 `tests/integration/t361-amadeus-mirror-lifecycle-completion.integration.test.ts` と `tests/unit/t347-amadeus-mirror-completion-gate.test.ts` を拡張する。**Trace:** FR-5、FR-6、FR-9、FR-10、NFR-2、受け入れ「Terminal path」「Bypass」。

- [x] **Step 12: Comprehensive の横断 test matrix と coverage を完遂する。** codec / digest / verdict の unit、birth / revision authority / receipt /全 terminal path / legacy / crash の integration、投影済み各 harness の同一fixture判定を確認する E2E 候補 `tests/e2e/t417-goal-reconciliation-harness-parity.test.ts` を実行する。正常系は (a) current Goalを機械 evidence で達成、(b) evidence付き直接 human ruling、(c) 専用 gate で承認した Goal revision 後の再 reconciliation、(d) 検証済み legacy migration receipt を独立に置く。異常系は unknown / tampered / missing / stale / cross-Intent / cross-session / partial write を含める。CLI spawnだけでなく codec と authority を in-process importして coverage対象にし、`bun tests/run-tests.ts --ci --coverage --coverage-dir coverage` で追加行の未到達分岐を確認する。**Trace:** FR-1〜FR-10、NFR-1〜NFR-4、受け入れテストマトリクス全軸。

- [x] **Step 13: canonical source から全配布面を build し、parity と source-only guard を通す。** 実装と focused test が green の後に `bun scripts/package.ts`、`bun run promote:self` を実行し、全 8 harness の `dist/` と root self-install 面を一時生成して Goal schema、CLI、completion precondition、audit vocabulary の parity を機械検証する。生成物は Git 追跡・コミット対象にせず、`bun run source-only:check` が clean であることを必須とする。`bun run typecheck`、`bun run lint`、focused unit / integration / E2E、`bun run test:ci`、`bun run promote:self:check`、`bun run distribution:check`、`bun run source-only:check` を順に実行する。重い integration の cold timeout は対象ファイルを `bun test --timeout 120000 <file>` で再実行して assertion 実文まで確認し、変更前と同一の既存失敗だけを分離する。**Trace:** FR-10、NFR-2〜NFR-4、受け入れ「Harness」。

## Step 13 の検証実績

- `bun scripts/package.ts` と `bun run promote:self` で全8 harnessおよびroot self-install面を一時生成し、配布 parity を確認した。生成物はGit追跡対象に追加していない。
- focused Goal / terminal / mirrorテストは240件、追加のcompletion / audit seamは63件、変更・新規テストのプロセス分離実行は全件成功した。
- `bun run typecheck`、`bun run lint`、`bun run distribution:check`、`bun scripts/promote-self.ts --check` は成功した。lintはerror 0件で、既存を含むwarning 405件、info 12件だった。
- `bun run source-only:check` はcleanであり、canonical source以外の生成物をGit追跡していない。
- 前回の`test:ci`で失敗した5件はすべて特定した。complexity baseline、mechanism honesty ratchet、terminal recovery fixture、audit event count、test-size annotationを修正し、各対象テストは単独で成功した。
- 最終`test:ci`は809 files、10,765 assertionsがすべて成功した。Failed filesとFailed assertionsはいずれも0で、最終結果は`PASS`だった。

## 主要な変更候補

| 区分 | 候補 | 責務 |
| --- | --- | --- |
| 新規 core module | `packages/framework/core/tools/amadeus-goal-reconciliation.ts` | Goal / proposal / evidence / receipt の厳格 codec、digest、項目別 reconciliation、receipt 検証 |
| 新規 CLI | `packages/framework/core/tools/amadeus-goal.ts` | proposal、専用 revision gate、reconcile、legacy migration。人間専用操作と AI proposal を分離 |
| completion authority | `packages/framework/core/tools/amadeus-workflow-completion.ts` | finality と current revision に一致する `ACHIEVED` receipt の共通 precondition |
| terminal transaction | `packages/framework/core/tools/amadeus-state.ts` | direct / approve / finalize / targeted recovery を単一完了契約へ集約し、audit / state / registry / cursor を replay-safe に確定 |
| routing / recovery | `packages/framework/core/tools/amadeus-orchestrate.ts` | already-completed、gated / non-gated report、mirror deferred completion を共通 authorityへ配送 |
| birth / identity | `packages/framework/core/tools/amadeus-utility.ts`、`packages/framework/core/tools/amadeus-lib.ts` | Intent birth 時の revision 0 作成、Intent UUID / scope / 原入力の拘束 |
| state schema | `packages/framework/core/knowledge/amadeus-shared/state-template.md` | Goal pointer と reconciliation / completion 参照の canonical state shape |
| audit registry | `packages/framework/core/tools/amadeus-audit.ts`、`packages/framework/core/otel/event-registry.ts`、`packages/framework/core/knowledge/amadeus-shared/audit-format.md` | Goal lineage と completion trace の閉じた vocabulary、属性、cardinality |
| 既存テスト | `tests/integration/t51.test.ts`、`t47-failure-injection.test.ts`、`t145-state-lock-concurrency.test.ts`、`t165-intent-birth-p4.test.ts`、`t361-amadeus-mirror-lifecycle-completion.integration.test.ts`、`event-registry-drift.test.ts` | 既存 lifecycle / birth / mirror / atomicity / registry 契約の改訂と非退行 |
| 新規テスト候補 | `tests/unit/t417-goal-reconciliation-codec.test.ts`、`tests/integration/t417-goal-reconciliation-completion.integration.test.ts`、`t418-goal-revision-authority.integration.test.ts`、`t419-goal-reconciliation-recovery.integration.test.ts`、`tests/e2e/t417-goal-reconciliation-harness-parity.test.ts` | Comprehensive 戦略の falling proof、正常系、回復、全終端、cross-harness parity |

## 新規 record artifact / schema 候補

- `<record>/goal/goal-lineage.json`: immutable revision 列と current approved revision pointer。revision 0 は Intent birth 原入力から作り、通常の requirements 承認では変更しない。
- `<record>/goal/proposals/<proposal-id>.json`: 承認前の change proposal。Goal として扱わない。
- `<record>/goal/reconciliation-receipts/<completion-instance>.json`: Goal / scope / graph / evidence / human ruling / verdict を拘束する durable receipt。
- JSON schemaを別ファイルで重複管理せず、TypeScript codec を正本として parse / serialize / digest を共有する。将来の汎用 semantic evaluator、DB、daemon、外部裁定 service は追加しない。

## 完了条件と承認

PART 1 Planning で上記13ステップ、変更候補、テスト範囲を確定した後、PART 2 Generation を実施した。現在は全ステップの実装と検証が完了している。計画から生じた具体的な逸脱とその理由は `code-summary.md` の「計画からの逸脱」に記録し、要求強度を弱める変更は行っていない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-04T06:14:19Z
- **Iteration:** 1
- **Scope decision:** none

成果物が自己矛盾しており、stage必須の変更ファイル一覧・計画逸脱記録も欠落している。また、許可資料だけでは単一completion authorityの中心契約を検証できない。

### Findings

- BLOCKER | code-generation-plan.mdは全13ステップを完了済みとして検証実績まで記録する一方、「PART 1 Planningのみ」「まだコード生成を開始しない」と明記しており、計画承認と生成実行の状態が矛盾している。成果物からstage契約どおりPlan Approval後にGenerationしたことを一意に判定できない。
- BLOCKER | code-summary.mdはstage契約が必須とする「Files created/modified」と「Any deviations from the plan」を記録していない。特に計画に存在しない修正（complexity/mechanism ratchet、terminal recovery fixture、audit count、test-size annotation）が報告されているため、変更範囲と逸脱理由を開発者・運用者が再現できない。
- BLOCKER | FR-5/FR-8の中核である単一completion authorityについて、code-summary.mdは各終端経路が同じpreconditionを通ると主張するだけで、許可資料には呼出し形、失敗時の書込み順序、部分完了の封じ込めを検証できる証拠がない。このため品質目標、blast radius、循環依存の有無を確認できない。
- FOLLOW-UP | code-summary.mdに要求別の実装ファイル・テストファイル対応表、計画からの逸脱、未実施検証の有無を追加すると、FR-1〜FR-10と実装証拠を追跡できる。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-04T06:15:15Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の3件のBLOCKERは解消された。planはPlanning後にGenerationと検証を完了した状態へ修正され、code-summaryには変更ファイル一覧、計画逸脱、未実施項目の有無が明記された。単一completion authorityについても、共通preconditionの呼出し形、書込み前のfail-closed順序、receipt identityによる再実行収束、mirror外部作用の抑止、failure-injection検証が記録され、許可資料内でFR-5/FR-8の実装証拠を追跡できる。

### Findings

- None
