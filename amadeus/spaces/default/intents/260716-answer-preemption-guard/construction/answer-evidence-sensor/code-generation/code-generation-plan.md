# Code Generation Plan — answer-evidence-sensor(Issue #922)

上流入力(consumes 全数): `../functional-design/business-logic-model.md`、`../functional-design/business-rules.md`(R1〜R6)、`../functional-design/domain-entities.md`(AnswerEvidenceResult 型・不変条件)、`../nfr-design/performance-design.md`(P-1/P-2)、`../nfr-design/security-design.md`(S-1〜3)、`../../../inception/units-generation/unit-of-work.md`(単一 Unit)、`../../../inception/requirements-analysis/requirements.md`(FR-1〜7)。

## 前提

- 単一 Unit(`answer-evidence-sensor`)・単一 Bolt。builder は worktree 隔離(base = origin/main)へディスパッチし、Bolt ブランチ+PR で main へ着地する。
- Test Strategy: Comprehensive。C-5 は R1〜R6 の 1:1 ケース+落ちる実証両側+corpus sweep+決定性ピンを含む。
- ステージ成果物(本 plan・code-summary)は record 配下、アプリケーションコードはワークスペース正本(`packages/framework/core/`)のみ。`dist/` 手編集禁止。

## ステップ(story/FR トレース付き)

- [x] Step 1: C-3 cutoff 定数の canonical 化 — `packages/framework/core/tools/amadeus-lib.ts` に `export const QUESTIONS_EVIDENCE_CUTOFF_YYMMDD = 260716;` を `checkQuestionsEvidence` 直上へ新設し、`amadeus-state.ts` のローカル `GUARD_CUTOFF_YYMMDD`(:1721 付近)を import へ置換(挙動不変・値同一)。【FR-2 / ADR-3】
- [x] Step 2: C-1 sensor script — `packages/framework/core/tools/amadeus-sensor-answer-evidence.ts` 新規。`evaluateAnswerEvidence(outputPath)`(export・純関数、段1 basename → 段2 cutoff(`intents/<dir>/` セグメント直接パース、経路差 docstring 明記)→ 段3 述語写像)+ `main(argv)`(export・in-process seam、--stage/--output-path 必須欠落のみ exit 1、検査結果は常に exit 0)。Result 型は domain-entities.md のとおり(pass=false ⇒ findings_count=1 ∧ skipped=null を構成関数で強制)。import 面は node:fs/node:path/amadeus-lib のみ(S-2/S-3)。【FR-1 AC-1b〜1e / R1〜R6】
- [x] Step 3: C-2 manifest — `packages/framework/core/sensors/amadeus-answer-evidence.md` 新規。既存スキーマ準拠(id/kind=deterministic/command {{HARNESS_DIR}}/default_severity=advisory/category/matches `**/*-questions.md`(狭 glob)/input_schema/output_schema/timeout_seconds: 5)。【FR-1 AC-1a / P-1 / P-2】
- [x] Step 4: C-4 stage frontmatter — `.claude/amadeus-common/stages` の正本(core 側 stages ディレクトリ)全 32 stage の `sensors:` リストへ `answer-evidence` を追加(grep -l '^sensors:' で 32/32 を実装時に第3再列挙 — enumeration-reverify-at-implementation)。【FR-3 AC-3a / ADR-2(E-APG-AD-DEV 裁定済み)】【遡及注記 2026-07-17: E-APG-AD-DEV 再裁定 (i)(22:53:17Z 開票)により **29 stage** へ確定 — 初期化3ステージ(state-init/workspace-detection/workspace-scaffold)は `sensors: []` 維持。実装時再列挙 = 29+3=32 で過不足なし(reviewer 独立再列挙一致)。ADR-2 追記済み】
- [x] Step 5: C-5 テスト — `tests/integration/t-answer-evidence-sensor.test.ts` 新規(Comprehensive)。ケース: R1 fail 2種(no-evidence / unparseable-timestamp)→ pass=false・findings_count=1、R2 pass 4 reason、R3 cutoff 前 intent pass(skipped:"pre-cutoff")、R4 非 questions pass(skipped:"not-questions")、R5 exit code(in-process main seam で検査 fail でも exit 0 相当・引数欠落 exit 1)、R6 地の文 E-code は evidence-present(述語の既知の限界の文書化ピン)、vacuity guard(定型ヘッダのみ入力で検査が空文化しない — AC-4c)、決定性(同一入力2回実行一致 — R-3)、cutoff 定数の lib/state 単一定義確認。fixture は `t-eoc1-gate-evidence.test.ts` の scaffold 様式を再利用。【FR-4 / C-5】
- [x] Step 6: ADR-5 整合 — TOOL_DESCRIPTORS への登録は行わない(per-sensor script 前例踏襲)。`bun tests/gen-coverage-registry.ts --check` green を検証列に含める。【FR-5 AC-5b】
- [x] Step 7: 配布同期 — `bun scripts/package.ts` + `bun run promote:self` で dist×5+self-install へ再生成(C-4 の stage frontmatter 変更を含む)。【FR-5 AC-5a】
- [x] Step 8: 検証列 — `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci` / `bun .claude/tools/amadeus-runner-gen.ts check` 全 exit 0(パイプ越し exit 捕捉禁止 — no-exit-capture-through-pipe)。【FR-5 AC-5c / FR-3 AC-3c】
- [x] Step 9: 落ちる実証(両側)— 赤側: cutoff 後 intent dir 名 fixture(裁定参照なし記入)で dispatcher 経由 fire → finding ファイル+SENSOR_FAILED 監査行を実測(注入は実行時消費される実データ md、scratch の record 汚染なし)。白側: repo 内全 `*-questions.md` corpus sweep で false-red 0(測定 ref 明記)。実証はテスト内 fixture で恒久化し、一時注入は「赤の実測→revert」を1セットで完結(falling-proof-injection-one-set)。【FR-4 AC-4a/4b】
- [x] Step 10: push 前 local lcov — patch 追加行の未カバー 0 を実測(main/evaluateAnswerEvidence の in-process seam。配線行・catch 行・多行引数の個別確認 — lcov-wiring-line-checklist / bun-multiline-arg-da0 回避のため単一行 collapse 既定)。E2E 検分は配布コピー `.claude/tools/` 経由(no-canonical-direct-execution)。【FR-5 AC-5c/5d】
- [x] Step 11: code-summary.md 作成(ファイル一覧・実装判断・テストカバレッジ・plan からの逸脱有無)。

## 逸脱規律(builder ディスパッチに明記)

- 逸脱(既存様式準拠と判断する場合も含む)は実装前に停止して conductor へ報告(deviation-stop-before-implement / deviation-applicability-not-solo)。
- 割当 worktree 以外での git 操作禁止・本線絶対パス非混入(c2)。
- モニタ/バックグラウンド待ちでターンを終了しない — 検証は同期完遂(builder-prompt-sync-completion)。

## トレーサビリティ

| Step | FR/AC | 由来ストーリー |
|------|-------|---------------|
| 1 | FR-2 AC-2b | #922 提案 (a)・R2 緩和 |
| 2 | FR-1 AC-1b〜1e | #922 提案 (a) |
| 3 | FR-1 AC-1a | #922 提案 (a) |
| 4 | FR-3 AC-3a〜3c | E-APG-AD-DEV 裁定 |
| 5 | FR-4 AC-4a〜4c | 成功基準1/2 |
| 6 | FR-5 AC-5b | ADR-5 |
| 7〜10 | FR-5 AC-5a/5c/5d | project.md Mandated |
| 11 | ステージ produces | — |

(user-stories 非実行スコープのため、トレースは requirements.md の FR/AC を正とする — 上記表がその対応)
