# Code Generation Plan: reviewer-protocol

## 目的と承認境界

本 Unit は、Requirements Analysis の FR-5 items 16–17、Story Map の U08→U12 検証経路、Application Design の C6 Harness and Reviewer Adapters、および Functional/NFR Design の BR-U08-01〜17 を、既存 reviewer invocation と配布境界へ実装する。公開 seam は次の2関数だけとし、signature、reviewer 選定、iteration 上限、directive schema、audit event、service 境界を増やさない。

```ts
function reviewerReadScope(unit: UnitRef, consumes: readonly ArtifactRef[]): ReadScope;
function runtimeReviewIdentity(persona: ReviewerPersona, utcDate: string): ReviewHeader;
```

- Plan history: `E-USSU08CGP1` はproduction caller不足とtest ID衝突により`choice2 Request Changes`、`E-USSU08CGP2`はactual invisible readを6 harness共通で捕捉する正本seam不在により`choice3 Block`でrecorded。`E-USSU08CGD1`はauthoritative scopeを§12a declared pass-listへ縮小整合するchoice1 Aを6–0、GoA 6–0でrecordedした。実装後のlocal LCOVで、正準2 pure seamとspawn-only private CLI 34関数を同一moduleに置く設計がpatch coverageを441行中57行に留め、384行を未計測にする逸脱を確認した。`E-USSU08CGP4` は正準2 seamのLCOV carrierとinternal runtimeを分離する本計画（SHA-256 `0445618bf24ec2970fdf5b1f6363dce27235c31bfb04d44d3ac19e3f46791d1d`）をchoice1 6–0、GoA 6–0でrecordedし、実行を承認した。
- 実装許可後も対象は `reviewer-protocol` Unit 内だけとし、U07、他 Unit、次 stage、新規 scope、不要な改善へ触れない。
- `dist/` と self-install tree は生成物であり手編集しない。package は現行6 harness、self-install は現行4面の closed set を維持する。

## トレーサビリティ

| 要求 | 実装対象 | 検証対象 |
|---|---|---|
| FR-5 item 16 / BR-U08-01〜05 / SEC-U08-04 | 実 checker persona と Review 書込直前の `date -u +%Y-%m-%dT%H:%M:%SZ` 実出力を `runtimeReviewIdentity` へ渡し、Verdict / Reviewer / Date / Iteration の4 field を必須化する | `t245-reviewer-protocol-seams` unit testとproduction caller integrationで、invalid command output・date・persona・fieldがReview/READYを非確定にすること、2 reviewer template |
| FR-5 item 17 / BR-U08-06〜13 / PERF-U08-01〜04 | 既存wireの`stage_file`、current Unitの実在`produces`、present `directive.consumes`だけからdeterministic pass-listを作る。Q&Aは`directive.consumes`明示時だけ含め、既存§12a callerが必ず実行する | `t245-reviewer-protocol-production-path` integration test、missing optional・memory・plan・reasoning・record root・sibling・未宣言Q&Aの除外、caller→seam→prompt/result/ReviewのRED→GREEN |
| E-USSU08FD1 / E-USSU08CGD1 / BR-U08-14〜16 / REL-U08-01〜06 | concrete ID、passed contractの単一owner path、非空reason、非browse/searchの単一file pathという4条件ANDを`check-read`でrequest前に評価する | positive controlと、IDなし、owner 0/複数、reason空、path不一致、directory/2 file、grep/glob/shell wildcard/browse/search、事後decision、rejected/outside requestの全negative control |
| BR-U08-17 / SEC-U08-01〜03 | prompt/result間だけのtransient Scope decision transcriptを`complete-review`がdirective/artifacts/consumesから全件再検証し、同内容のScope decision projectionを最終Reviewへ永続記録する。新audit event/read ledger/storeを作らない | `check-read` bypass、transcript tamper、rejected/outside/second requestを含むresultのReview/READY不受理、再実行時のReview projection非増殖 |
| SCALE-U08-01〜04 / NFR-4 | core正本、独立authoringの6 harness surface、generated 6面、self-install 4面を既存 generator で同期する | source/projection content test、package drift、promote-self drift、6/4 inventory |
| NFR-1〜8 / FR-0 | 既存 Bun 1.3.13、TypeScript ESM、reviewer subagent、package/promote/test stackだけを使い、directive/event/schema shapeを変えずproduction invocationへ接続する | 実 `run-stage` directiveを入力にしたinternal caller、6 harness packaged caller、targeted、typecheck、lint、dist、promote、full CI、local lcov、sensorを同一最終差分で実測 |

## 変更候補

### Authored source

- pure seam LCOV carrier: `packages/framework/core/tools/amadeus-reviewer.ts`（新規。exportは正準2関数 `reviewerReadScope()` / `runtimeReviewIdentity()` だけ。side effect、subprocess、CLI dispatch、private runtime helperを置かない）
- internal executable runtime: `packages/framework/core/tools/amadeus-reviewer-runtime.ts`（新規。外部product interfaceではないtest-only internal Interfaceとしてdeep handler `runReviewerCommand(argv, deps)` 1件だけをexportする。FS/UTC/stdin/stdout-stderr/invocation-IDを束ねる`realDeps`をmodule scopeで初期化し、1行の`if (import.meta.main)` guardから`runReviewerCommand(process.argv.slice(2), realDeps)`を直接呼ぶ。別private main/adapterは作らない。integrationはhandlerへlocal substitute depsを渡して全branchをin-process駆動し、importでreal deps初期化とguard隣接行を計測する。`runScope()`、`checkRead()`、`completeReview()`、transient Scope decision transcript型、永続Review projection builder、owner resolver、decision builderはnon-export/private。正準2 seamだけをimportし、package/barrelのcanonical public2へinternal Interfaceを露出させず、directive/event/public schema、新public API、help/utility verbを追加しない）
- existing directive producer/contract anchor: `packages/framework/core/tools/amadeus-orchestrate.ts:buildRunStageDirective()` と `packages/framework/core/tools/amadeus-directive.ts:validateDirective()`。前者が既に出す `unit`、`stage_file`、`produces`、`optional_produces`、`consumes`、`reviewer`、`reviewer_max_iterations` をそのままinternal callerへ渡し、両fileのpublic API、directive field、wire shapeは変更しない。
- production caller: 下記6 authored surfaceの既存 **Reviewer step (§12a)** が、reviewer spawn前に `bun {{HARNESS_DIR}}/tools/amadeus-reviewer-runtime.ts scope`（engineの既存run-stage directive JSONをstdinでそのまま消費）を呼び、`stage_file`、実在`produces`、present `consumes`から作ったauthoritative declared pass-listをpromptへ渡す。Q&Aは`directive.consumes`に明示された場合だけ含め、探索や新wireで補わない。spot-check requestは同じdirective、current artifacts、passed consumes、現在のtranscriptをstdinで渡すinternal `check-read`だけが受理し、更新したcanonical Scope decision transcriptをstdoutへ返す。Review append直前のinternal `complete-review`はdirectiveとresult内transcriptをstdinで受け、全entryを同じ正準入力から再計算してbypass、改竄、rejected/outside/second requestを拒否する。その後`date -u +%Y-%m-%dT%H:%M:%SZ`と`runtimeReviewIdentity`で4-field Reviewを完成し、再検証済みScope decision projectionをprimary artifactの最終Reviewへ永続記録する。transcriptはprompt/result間だけを通るtransient carrierで、別process間にhidden state、file store、audit payloadを持たない。これらは§12a専用internal commandであり、help/utility/公開CLIへ登録しない。既存package manifestはcore toolsを包括投影するshapeを変えず、6 authored commandだけをruntime fileへ接続する。
- reviewer persona: `packages/framework/core/agents/amadeus-architecture-reviewer-agent.md`、`packages/framework/core/agents/amadeus-product-lead-agent.md`
- reviewing knowledge: `packages/framework/core/knowledge/amadeus-architecture-reviewer-agent/reviewing.md`、`packages/framework/core/knowledge/amadeus-product-lead-agent/reviewing.md`
- shared protocol: `packages/framework/core/amadeus-common/protocols/stage-protocol.md` の §12a
- independently authored harness surface:
  - `packages/framework/harness/claude/skills/amadeus/SKILL.md`
  - `packages/framework/harness/codex/skills/amadeus/SKILL.md`
  - `packages/framework/harness/kiro/skills/amadeus/SKILL.md`
  - `packages/framework/harness/kiro-ide/skills/amadeus/SKILL.md`
  - `packages/framework/harness/cursor/commands/amadeus.md`
  - `packages/framework/harness/opencode/commands/amadeus.md`

### Tests and generated evidence

- 新規候補: `tests/unit/t245-reviewer-protocol-seams.test.ts`、`tests/integration/t245-reviewer-protocol-production-path.test.ts`。着手前調査で既存 `t245` fileが0件であることを確認済みで、既存 `t200` / `t217` と衝突させない。
- 既存回帰候補: `tests/integration/t34-stage-protocol-structure.test.ts`、`tests/integration/t145-packaging-parity.test.ts`、`tests/unit/t200-promote-self-composed-scope.test.ts`、`tests/e2e/t-acp-kiro-reviewer.serial.test.ts`（live条件が満たされる場合のみ既存runner規律で実行）
- generated: `dist/{claude,codex,cursor,kiro,kiro-ide,opencode}/**` と self-install 4面は既存 `scripts/package.ts` / `scripts/promote-self.ts` の出力だけを受け入れる。
- `package.json`、`tsconfig.json`、`tsconfig.tests.json`、coverage registry/runner設定は既存のまま使う。新 test harness、設定、dependencyを追加しない。
- pure seamのdirect importとMarkdown content grepだけでは完了にしない。少なくとも1つのreal `run-stage` directiveを既存engineから取得し、packaged internal callerをsubprocess実行してscope→prompt→declared request→`check-read`→result→`complete-review`→Review append/READY判定まで通すproduction-path integrationを必須とする。
- 本改訂の候補source pathは `packages/framework/core/tools/amadeus-reviewer.ts`、新規 `packages/framework/core/tools/amadeus-reviewer-runtime.ts`、共有 `packages/framework/core/amadeus-common/protocols/stage-protocol.md`、上記6 authored harness surface、既存t245 unit/integrationだけに限定する。package manifest、generator、directive producer/validatorはread-only anchorとし、schema/file mappingを変更しない。`dist/` 6面とself-install 4面は既存generator出力だけを受け入れる。

## 実装計画

1. [x] **baseline と Unit 境界を固定する。** 現在の U07 dirty 差分を既存仕掛かりとして列挙し、U08 の変更候補と混同しない。core persona/knowledge/protocol、6 harness authored surface、package/promote ownership、既存 reviewer tests を基準化し、`rg --files tests | rg '/t245'` が0件である証跡を残す。U07・他 Unit・state/audit を変更しない比較基準を維持する。

2. [x] **既存 test stack を再確認し、設定不変を固定する。** `bun:test`、現行 TypeScript 設定、integration の一時 workspace、coverage runnerで pure seam、content、filesystem scope、generated projectionを検査できることを確認する。既存設定で実行できない場合は設定を足さず、実装を止めて再付議する。

3. [x] **`t245-reviewer-protocol-seams` でpure seam責務を固定する。** `tests/unit/t245-reviewer-protocol-seams.test.ts` は正準2 export以外がないこと、declared current-unit scopeのpure projection、checker personaと単一の実在ISO-8601 UTCを受けるpure identityだけを検査する。persona/template/command/Review field、filesystem/content/projection、subprocess runtimeはintegration t245の責務とし、unitへ混在させない。分離後のpure moduleで追加実行可能分岐を全て駆動し、patch coverage 100%を満たすケースはStep 4のREDへ追加する。

4. [x] **runtime分離をtest-firstでREDにする。** unit t245へpure moduleの未駆動分岐を追加し、integration t245へtest-only internal `runReviewerCommand(argv, deps)`のexact 1-export契約、local-substitutable FS/UTC/stdin/stdout-stderr/invocation-ID deps、handler全mode/unknown/error配線のin-process caseを追加する。同時にsource caller path、6 authored command期待、6 package + 4 self-install projection期待を`amadeus-reviewer-runtime.ts`へ切り替える。新runtime file不在、旧moduleへのprivate CLI同居、旧command pathによりREDになることを、production source/生成物を変更する前にexact test名・exit・件数付きで保存する。spawn subprocess caseを削除・文字列assertへ弱化せず、module-scope real deps初期化と1行`import.meta.main` guard隣接行もlocal LCOVでDA>0でなければREDに含める。

5. [x] **2 reviewer persona と2 reviewing knowledgeを maker-checker 契約へ更新する。** architecture は `amadeus-architecture-reviewer-agent`、product は `amadeus-product-lead-agent` を実 checker として一意に記録し、Review書込直前に exact UTC commandを1回実行する。result先頭と最終 `## Review` に identity と4 fieldを置き、conversation date、model knowledge、audit timestamp、producer personaを代替値にしない。

6. [x] **pure seam LCOV carrierとinternal runtimeを分離する。** Step 4のRED後、`packages/framework/core/tools/amadeus-reviewer.ts` は正準2 pure seamだけをexportするside-effect-free moduleとし、private CLI 34関数を残さない。新規 `packages/framework/core/tools/amadeus-reviewer-runtime.ts` へ `runScope()` / `checkRead()` / `completeReview()` と全private helperを移し、test-only internal `runReviewerCommand(argv, deps)` 1件だけをexportする。FS/UTC/stdin/stdout-stderr/invocation-ID adapterはmodule-scope `realDeps`へ束ね、1行の`if (import.meta.main)` guardが`runReviewerCommand(process.argv.slice(2), realDeps)`を直接呼ぶ。別private main/adapterは作らない。integrationはhandlerへlocal substituteを渡して全branchをin-process駆動し、module importでreal deps初期化とguard隣接行をDA>0にする。runtimeは正準2 seamだけをimportする。`completeReview()` はReview append直前に注入UTC runnerからexact command相当を1回取得し、その実出力と `directive.reviewer` を`runtimeReviewIdentity()`へ渡して4-field Reviewを完成させる。時刻の推定、固定fallback、retry、producer identityへの置換を行わず、invalid identity/UTC/field/scopeではReview本文をstdoutへ出さず非0とし、READYを確定しない。internal handlerはpackage/barrelのcanonical public2へ露出させず、新しい外部public API、CLI/help、wire、store、schemaを追加しない。

7. [x] **`reviewerReadScope(unit, consumes)` とinternal runtime scope callerを最小実装する。** `UnitRef`へ既存wireの`unit`、`stage_file`、`produces`、`optional_produces`を写像し、引数で明示されたpresent consumesだけを入力にする。Q&Aは`directive.consumes`のpathとして明示された場合だけ通常のconsumeとして含め、filesystem全体の探索やQ&A discovery、sibling open/grep/glob/shell wildcard/browse/searchを行わないpure seamとする。`amadeus-reviewer-runtime.ts`のnon-export `runScope()`は`amadeus-orchestrate.ts:buildRunStageDirective()`が出した既存run-stage JSONをstdinからそのまま`validateDirective()`へ通し、`unit` / `stage_file` / `produces` / `optional_produces` / `consumes`だけを正準入力へ写像する。directive field、schema、event、wire shapeは追加せず、pathをownership検証後deterministicにdedupeし、§12aのauthoritative declared pass-listとして出力する。

8. [x] **internal runtimeのprivate `checkRead()`でspot-check requestの4条件ANDをproduction経路へ接続する。** current artifactのconcrete integration ID、passed contractからの単一owner path、非空reason、非browse/search由来の単一file pathがrequest前に全て成立した場合だけapproved path 1件を当該invocationへ追加する。`check-read`を唯一の受理経路とし、同じrun-stage directive、current artifacts、passed consumes、現在のtranscriptを毎回stdinで受け、正準化した更新transcriptをstdoutへ返す。owner 0/複数、path不一致、directory、2 file目、grep/glob/shell wildcard/browse/searchはrejectedとする。transcriptはprompt/result間だけを通るtransient carrierとし、engine directive、audit event、file storeへ新fieldを足さず、次iterationへ継承しない。

9. [x] **stage protocol §12aをinternal runtime caller実行の正本へ更新する。** reviewer spawn前の`.../amadeus-reviewer-runtime.ts scope`、spot-check request前のinternal `check-read`、Review append直前のinternal `complete-review`を順序付きで必須化する。scope commandはexisting run-stage directive JSONをそのままstdinで消費し、reviewerへ渡すauthoritative setを`stage_file`、current Unitの実在`produces`、present `directive.consumes`へ限定する。Q&Aは`directive.consumes`明示時だけ含める。path/reason/ID/owner evidenceとdecisionはprompt/result間のtransient Scope decision transcriptへ固定する。`complete-review`はdirective/artifacts/consumesから全entryを再検証し、bypass、tamper、rejected/outside/second requestまたはinvalid scope/persona/UTC/4-fieldではReview appendとREADY受理へ進まず、valid時だけ再検証済みScope decision projectionを最終Reviewへ永続記録する。既存auditはidentity/completionだけを保持する。新public CLI、event、public schema、read ledger、store、permission gate、Q&A discovery、owner discoveryを追加しない。

10. [x] **6 harness authored surfaceから同じinternal runtime callerを必ず実行する。** Claude/Codex/Kiro/Kiro IDEの4 `SKILL.md`とCursor/OpenCodeの2 commandの既存Reviewer stepへ、各harnessの`{{HARNESS_DIR}}`実pathで`amadeus-reviewer-runtime.ts scope`→reviewer spawn→declared requestの`check-read`→`complete-review`を呼ぶcommand-level手順を追加する。§12aと同じpass-list、`directive.consumes`、tool-agnostic sibling request ban、4条件spot-check、runtime UTC/checker identity、4-field Review、Scope decision transcriptを持たせる。harness固有のspawn tool名だけを保持し、pure functionのdirect importだけ、proseだけ、policy差、新shapeで代替しない。

11. [x] **source-tree t245 production pathをGREENにし、positive/negative controlsとruntime配線を統合検証する。** real `run-stage` directive→source runtimeの1行`import.meta.main` guard→`runReviewerCommand(process.argv.slice(2), realDeps)`→`reviewerReadScope`→生成prompt→declared request→`check-read`→subagent result→`complete-review`→`runtimeReviewIdentity`→primary artifact Review/READYまでをsubprocessで通す。同じhandlerをlocal substitute depsでin-process駆動し、scope/check-read/complete-review/unknown/error、FS/UTC/stdin/stdout-stderrの全branchを計測する。module importでreal deps初期化とguard隣接行をDA>0にし、別main/adapterを経由しない。positiveは4条件成立、decision-before-request、invocation限定single owner file、prompt/result transcriptと最終Reviewの再検証済みprojection一致をassertする。Q&Aはexplicit consume時だけ含み、未宣言時は0件をassertする。invalid scope/persona/UTC/4-field、IDなし、owner 0/複数、reason空、path不一致、directory/2 file、open/grep/glob/shell wildcard/browse/search request、事後decision、rejected/outside request、`check-read` bypass result、transcript tamperはprivate caller非0、Review非append、READY非受理をassertする。scope decisionなしは`none`とする。このStepではsource callerを対象にしたtest sliceだけをGREENとし、packaged caller caseをstale生成物でgreenへ読み替えない。actual invisible readの完全捕捉はassertせず、pure/content testだけのgreenはこのstepの代替にならない。

12. [x] **6 harness package projectionを正規生成し、generated6 packaged E2EをGREENにする。** source-tree t245 sliceがGREENになった後だけ `bun scripts/package.ts` を実行し、6 harnessのcore/tool/protocol/persona/knowledge/orchestrator surfaceを生成する。既存package manifestのcore tools包括投影によりpure seam moduleとinternal runtimeが両方入り、6 authored commandがruntime fileへ接続することを確認する。直後に同じreal directive E2Eをgenerated 6 packageのruntime subprocessへ通し、source runtimeとのbyte一致とscope/complete-review GREENを確認してから次へ進む。生成前後の差分をauthored sourceに逆照合し、manifest schema/file mapping変更、`dist/` の手編集、orphan、未投影面、不要な別Unit差分がないことを確認する。

13. [x] **4面 self-install projectionを既存closed listで同期し、投影を確認する。** Step 12のgenerated6 packaged E2EがGREENになった後だけ `bun scripts/promote-self.ts --apply` を既存手順で実行し、Claude/Codex/Cursor/OpenCodeのruntimeがsourceとbyte一致することを確認する。Kiro/Kiro IDEをself-installへ追加せず、composed scope保護と既存runtime-local差分を壊さない。

14. [x] **同一最終差分で全verification gateとpatch coverageを実測する。** Step 12のgenerated6 E2E GREENとStep 13のself4投影確認後、integration t245全体を再実行する。分離前REDは`amadeus-reviewer.ts`のexact diff 441 measured / 57 covered / 0 allowlisted / 384 uncoveredとして固定する。分離後はpure seam moduleとinternal runtime moduleの両方をLCOVへ載せ、unit + handlerのin-process integrationで全追加実行可能行、module-scope real deps初期化、1行`import.meta.main` guard隣接配線行をDA>0にし、exact U08 patch全体を100%（allowlisted 0 / uncovered 0）にする。subprocess production integrationも別に維持し、文字列assertやin-processだけで代替しない。`t245-reviewer-protocol-seams`、`t245-reviewer-protocol-production-path`、関連回帰、`bun run typecheck`、`bun run lint:check`、`bun run dist:check`、`bun run promote:self:check`、`bash tests/run-tests.sh --ci`、local coverage、exact patch gateを順に実行する。production caller subprocessの実行件数、6 harness path、Review append/READY成否を証跡化する。未実施、非0、stale結果をgreenへ読み替えず、Issue #1313が未解消のままfull-CI-required gateへ到達した場合は停止してleaderへ付議する。threshold、allowlist、waiver条件は変更しない。

15. [x] **sensor・独立review・Unit閉包のproduction証跡を揃える。** engine directiveのsensorを実行し、6 harnessの既存Reviewer stepがinternal runtime caller経由で正準2 seamを実行した結果を残す。実reviewer personaはprivate `completeReview()`がReview直前に実測したUTCでVerdict / Reviewer / Date / Iterationと再検証済み`Scope decision`をprimary artifactへ追記し、bypass/tamper/outside requestまたはinvalid identity経路ではReview/READYが非確定であることを示す。reviewはmax 2 iteration、READY受理と§13はleaderの記録済み裁定後だけ進める。`code-summary.md`にはFR/BR/NFR対応、caller file:function/command、transient carrier、RED→move→GREEN、6/4 projection、targeted/full/coverage/patch gate/sensor、actual invisible read非要件、新audit/store/proxy0、既知例外、他者dirty非接触を記録する。

## 完了条件

- `packages/framework/core/tools/amadeus-reviewer.ts` は正準2 public pure seamだけをexportするside-effect-free LCOV carrierである。新規 `packages/framework/core/tools/amadeus-reviewer-runtime.ts` は外部product interfaceではないtest-only internal `runReviewerCommand(argv, deps)` 1件だけをexportし、別main/adapterを作らず、module-scope real depsと1行`import.meta.main` guardが同handlerを直接呼ぶ。他の実行helperはnon-export/private、internal handlerはpackage/barrelのcanonical public2へ露出せず、help/utilityに新public CLIがない。両moduleの追加実行可能行、real deps初期化、guard隣接配線行のpatch coverageが100%（allowlisted 0 / uncovered 0）である。
- existing `run-stage` directiveをshape変更なしで消費するpackaged internal runtime callerが、6 harnessの既存Reviewer stepから正準2 seamを実行し、caller→scope→prompt→declared request→`check-read`→result→`complete-review`→Review/READYのsubprocess証跡がある。pure direct-import/content testだけでは完了としない。
- Reviewは実 checker personaと書込直前UTCを使い、Verdict / Reviewer / Date / Iterationの4 fieldが欠ければREADY証拠にならない。
- default scopeは`stage_file`、current Unitの実在`produces`、present consumesだけで、Q&Aは`directive.consumes`明示時だけ含む。sibling横断とmissing optional/memory/plan/reasoning/root/未宣言Q&Aが0件である。
- spot-checkは4条件AND、request前decision、`check-read`唯一受理、single owner file、invocation限定であり、bypass/tamper/rejected/outside/second requestを含むresultはReview/READY不受理となる。
- Scope decision transcriptはprompt/result間だけのtransient carrierで、`complete-review`が正準入力から全件再検証したprojectionを最終Reviewへ永続記録する。既存auditはidentity/completionを保持し、新audit event、read ledger、別provenance storeがない。
- authored core + 6 harness source、generated 6 package面、4 self-install面が既存generatorで同期し、dist手編集がない。
- targeted、typecheck、lint、package/dist、promote、full CI、coverage、patch coverage gate、sensor、独立reviewが同一最終差分でgreenである。

## 非対象

- 新しい外部public API（正準2 seam以外。test-only internal `runReviewerCommand`は外部product interfaceに含めない）、新public CLI/help/utility verb、public schema、parser DSL、directive/event/wire shape、audit event、read ledger、store、全6 harness read proxy/sandbox、service、database、network、UI、cache、queue、retry、retention、threshold、permission policy。actual invisible readの完全捕捉。
- owner探索のためのsibling directory open、grep、glob、shell wildcard、browse、search、record全体scan。
- U07の再修正、他Unit、次stage、無関係なrefactor/cleanup、test harness・Bun設定の変更。
- `dist/` 手編集、self-install 6面化、plan electionの記録済み承認前の実装/test/生成、Intent完了条件成立前のcommit/push/PR/merge。
