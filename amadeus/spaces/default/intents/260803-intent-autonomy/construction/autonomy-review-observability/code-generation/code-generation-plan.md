# Code Generation Plan — autonomy-review-observability

## スコープと追跡元

U4 `autonomy-review-observability`（Issue #2067）だけを `self-feature` として実装する。正本は U4 の Functional / NFR Design と U3 が提供する immutable autonomy projection である。active / completed Intent の自動判断一覧・詳細・未レビューqueue、人間本人による accept / flag、completed seal を保持する限定append、status、Event Registry / OTel provenance を一つの harness-neutral Core で閉じる。

Claude Code、Codex、Cursor、OpenCode、Kimi Code は同じ Core を利用し、eligibility、redaction、review authorization、remediation分類をharness別に複製しない。配布物は package generator から生成し、`dist/` を直接編集しない。

## 実装計画

- [x] **Step 1 — decision read model**: explicit Intent UUID と lifecycle から U3 の canonical projection を読み、eligible decision の一覧・詳細・未レビューqueueを構築する。decision IDからIntentを逆引きせず、raw evidence / prompt / secretを公開しない。
- [x] **Step 2 — snapshot-bound pagination**: query fingerprint、target audit revision、completed review extension head、projection event-set digestへcursorを束縛し、page間driftを `CONFLICT(cursorSnapshot)` で拒否する。
- [x] **Step 3 — real-human authorization**: canonical `HUMAN_TURN` とreview command bindingをsource Intentから直接再検証する。active targetは同一Intent、completed targetは現在のactive Intentをsource contextとし、synthetic / missing / stale provenanceを拒否する。
- [x] **Step 4 — terminal review append**: accept / flagを `AUTO_DECISION_REVIEWED` としてappendし、same choiceをidempotent、different choiceをterminal conflictにする。completed targetではcompletion sealを変更せず、denseなreview extension chainだけを進める。
- [x] **Step 5 — safe remediation**: flagは分類に応じて `self-fix`、`self-feature`、または `self-fix-with-feature-alternative` を提案するだけに留める。rollback、effect replay、grant変更、新規Intent生成を行わない。
- [x] **Step 6 — persistence / replay**: canonical payload digest、event identity、transaction、projection revision、extension chainを検証してsnapshotをreloadし、session / process / compaction / clone後もqueueとterminal receiptを再構築する。改変はfail-closedにする。
- [x] **Step 7 — status / telemetry**: human / machine statusを同じprojectionから組み立て、completed workflowをterminalのまま保持する。`AUTO_DECISION_REVIEWED` を canonical audit vocabulary の85件目としてEvent Registry、OTel attribute、audit formatへ同期する。
- [x] **Step 8 — shared projection**: Coreとregistry変更を package generator で全7生成treeへ反映し、現行5 self-install harnessへpromoteする。5 harness contractではexactly-once cohortと共通algorithmを検証する。
- [x] **Step 9 — verification**: focused test、Event Registry drift、typecheck、Biome、coverage、全体 `test:ci`、重いsuiteの個別再実行、package / promote drift、`git diff --check` を実測する。
- [x] **Step 10 — convergence follow-up**: 親再検証で検出された `t81` のaudit event count assertion漏れを統合側で85へ修正し、U4成果物に事実を記録する。

## 非目標

U5 の credential-attested terminal live completion、workflow completion判定、rollback、自動remediation実行、自動Intent生成、PR / merge / GitHub semantics、外部runner / supervisor、harness固有Core、U3 projectionの再実装は対象外とする。レビューqueueは中断点を増やさず、既存autonomy flowを途中でblockingしない。

## 検証基準

- focused U4 behaviorとEvent Registry driftがgreenである。
- 新規Coreのcoverageを計測し、主要なlist / detail / review / reload / status経路を通す。
- `bun run typecheck`、対象Biome check、`bun scripts/package.ts --check`、`bun run promote:self:check` がgreenである。
- default timeoutで失敗した重い5ファイルは120秒timeoutで個別再実行し、U4由来failureか環境・wall-clock由来かを切り分ける。
- 実装commitと親統合側の追補修正を区別し、未修正事項を隠さない。
