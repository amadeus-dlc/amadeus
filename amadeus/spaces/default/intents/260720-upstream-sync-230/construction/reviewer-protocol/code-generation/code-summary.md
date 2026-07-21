# Code Summary: reviewer-protocol

## 実装結果

記録済み設計裁定 `E-USSU08CGD1` と実行承認 `E-USSU08CGP4`（choice1 6–0、GoA 6–0、plan SHA-256 `0445618bf24ec2970fdf5b1f6363dce27235c31bfb04d44d3ac19e3f46791d1d`）に従い、既存 `run-stage` directive のshapeを変えず reviewer protocol をproduction経路へ接続した。

外部product interfaceは次の正準2 pure seamだけである。

```ts
function reviewerReadScope(unit: UnitRef, consumes: readonly ArtifactRef[]): ReadScope;
function runtimeReviewIdentity(persona: ReviewerPersona, utcDate: string): ReviewHeader;
```

`packages/framework/core/tools/amadeus-reviewer.ts` はこの2関数だけをexportするside-effect-free LCOV carrierである。実行処理は新規 `packages/framework/core/tools/amadeus-reviewer-runtime.ts` に分離し、外部product interfaceではないtest-only internal Interface `runReviewerCommand(argv, deps)` 1件だけをexportする。別private main/adapterは作らず、module-scope `realDeps` と1行の `if (import.meta.main)` guardから同handlerを直接呼ぶ。

新しいpublic CLI/help verb、directive/event/wire/schema shape、audit event、read ledger、store、proxy、sandbox、permission policy、threshold、allowlistは追加していない。

## Production path

Claude、Codex、Kiro、Kiro IDE、Cursor、OpenCode の既存Reviewer stepは、各harnessの実pathで次の順序を実行する。

1. reviewer spawn前に `bun <harness>/tools/amadeus-reviewer-runtime.ts scope` へ未変更の `run-stage` directive JSONを渡し、authoritative declared pass-listとfresh `invocationId` を得る。
2. scopeは `stage_file`、current Unitの実在required/optional `produces`、present `directive.consumes` だけで構成する。Q&Aは明示consume時だけ含める。
3. spot-checkは `check-read` を唯一の受理経路とし、concrete integration ID、passed contractの単一owner path、非空reason、非browse/search由来の単一literal fileという4条件ANDをrequest前に検査する。
4. prompt/result間だけのtransient transcriptを `invocationId + iteration` に結合し、`complete-review` がdirective/artifacts/consumesから全entryを再検証する。
5. Review追記直前に実UTCを取得し、checker personaとともに正準identity seamへ渡す。Verdict / Reviewer / Date / Iterationと再検証済みScope decisionが揃う場合だけReview/READYを受理する。

bypass、tamper、rejected/outside/second request、別invocationまたは次iterationへのreplay、invalid scope/persona/UTC、field欠落・重複は非0でReview/READYを生成しない。transcriptはhidden state、directive field、audit payload、file storeへ保存しない。actual invisible read syscallの完全捕捉は記録済み裁定どおり非要件である。

## RED → GREEN

runtime分離前にexact full t245を実行し、新runtime不在・旧path・stale projectionを `12 pass / 15 fail / 90 expect()` でRED固定した。source実装後はpackaged caseを除くauthored sliceをGREEN化し、その後だけ正規generatorでpackage 6面を生成して、同じreal directiveを6 packaged runtimeすべてへ通した。

先行reviewの反例も固定negativeへ残した。

- Date欠落・重複・不正UTC、後段iterationからのfield借用
- iteration 1 decisionのiteration 2 replay
- 同一iterationの別invocation replay
- bypass、transcript tamper、outside/rejected/second request
- owner 0/複数、reason空、path不一致、directory/2 file、open/grep/glob/wildcard shell/browse/search

最終先行reviewで、既存Reviewの再受理がsummary部分文字列とfindings差替えを見逃す反例をRED固定した。初回 `summary="alpha beta" / findings=["first finding"]` の後に同一invocation/iterationで `summary="alpha" / findings=["different finding"]` を再提出すると、旧実装は誤って `status 0 / appended=false` を返した。`validateExistingReview()` を主要field＋部分文字列判定からcanonical Review projection全体の完全一致へ変更し、summary部分一致、findings差替え・順序変更、stored summary空白tamperを非0にした。同一projectionの冪等再実行は `appended=false` のまま維持した。

Formal Iteration 1で、初回Review append時のfindingに改行・Review heading・field行を注入するとmalformed projectionを永続化しながらREADYになる反例をRED固定した。`parseReviewResult()` でsummaryに加えてfinding各要素も単一非空行へ限定し、finding専用grammarでASCII control characterを拒否し、canonical findingの重複も拒否する。初回append前にも生成したcanonical projectionを `validateExistingReview()` で自己検証するよう変更した。summary/finding双方のheading・field injection、control character、duplicate findingは非0、正準projectionだけがappend可能で、既存projectionの完全一致・冪等性は維持した。

coverage分離前は `amadeus-reviewer.ts` の441 added lines中57 covered / 384 uncoveredだった。pure carrierとinternal runtimeを分離し、passive capability depsとin-process handler casesでruntime全branchを駆動した。Formal Iteration 1是正後のfocused coverageは `34 pass / 1 filtered / 398 expect()`、pure 69/69、runtime 489/489、uncovered 0となった。

## Projection inventory

| 面 | 対象 | 結果 |
|---|---|---|
| Authored harness | Claude / Codex / Kiro / Kiro IDE / Cursor / OpenCode | 6/6が `amadeus-reviewer-runtime.ts` の `scope → check-read → complete-review` を実行 |
| Generated package | `dist/{claude,codex,cursor,kiro,kiro-ide,opencode}` | 6/6を正規生成し、real directive E2E `1 pass / 33 expect()` |
| Self-install | `.claude` / `.codex` / `.cursor` / `.opencode` | 4/4を正規promotion。Kiro/Kiro IDEは既存closed listへ追加なし |

`dist/` とself-install treeは手編集していない。

## 最終検証

| 検証 | 結果 |
|---|---|
| t245 unit + production integration | 35 pass / 0 fail / 408 expect() |
| targeted 7 files | 176 pass / 0 fail / 1589 expect() |
| `bun run typecheck` | exit 0 |
| `bun run lint:check` | exit 0（既存warningのみ） |
| `bun run dist:check` | 6/6 OK |
| `bun run promote:self:check` | 4/4 OK |
| final full CI | 395 files / 5596 assertions / 1 fail。唯一の赤はrecorded M16 `t199-generated-prefix-contract` |
| final local coverage | 395 files / 5596 assertions / 1 fail。唯一の赤はrecorded M16 |
| project coverage gate | current 72.4659%、baseline 40.9395%、+31.5264pp、PASS |
| exact U08 11-path patch gate | diff 330058 bytes / SHA-256 `62e46c8de7b8f79d28d6cc5a685707bc8b77b9564d61bc0f5c86cad1dd988c6b`、measured 544 / covered 544 / allowlisted 0 / uncovered 0、PASS |
| Code Generation sensors | linter / type-check をpure・runtime各1回発火し、4/4 `SENSOR_PASSED`。answer-evidenceは `*-questions.md` 専用で本stageのTS出力には非該当 |
| `git diff --check`（U08 exact 11 path） | exit 0 |

### Full / coverage logs

- full: `tests/logs/2026-07-21T13-39-40Z`
  - summary SHA-256: `52392d2731f958fd5f7d92784f543649650ffcbe5f778a47eae363d25c6d203f`
  - failures SHA-256: `fe3457f6f2b4404020f1b52cbbd0d7da91e375ec749df8babfe12472486845a4`
- coverage: `tests/logs/2026-07-21T13-46-19Z`
  - summary SHA-256: `8916cd998683b459da895533789aa2d0a4f57161a98518d41d5e73e10992b9bb`
  - failures SHA-256: `b0c24dd4d1f8881c1a391b0c6dbcf9eec635579ea7b20cf7f836f21cf4b59c37`
  - `coverage/lcov.info` SHA-256: `ca6eb37fcc6e08529520221c223b3bc18d894de900b79695e3a1459fc83ea433`

fullとcoverageは共有runner 0を確認して直列実行した。両方の唯一の赤M16は `E-USSU07CGF1` のrecorded裁定どおりHEAD由来12 pathの既知baselineであり、本Unitでは正本変更、allowlist、self-exclusionを行っていない。

## Freeze hashes

exact 11 pathはpure module、runtime、§12a、6 authored harness surface、unit/integration t245である。aggregateはこの固定順の `shasum -a 256 <path>` 出力を再度SHA-256した値である。

| 対象 | SHA-256 |
|---|---|
| `packages/framework/core/tools/amadeus-reviewer.ts` | `98d71df104d672ae671c480e49208b239aef1437ff13d60e6e78ad5d43a17ff2` |
| `packages/framework/core/tools/amadeus-reviewer-runtime.ts` | `f00f07d1d36cee7b0a304cbd99192a7bbe4ae2fe5bee3e04cbcf53693ae7a84d` |
| `tests/unit/t245-reviewer-protocol-seams.test.ts` | `7e4ee3e4f3ea119d9adb227c91b93cb8923614c037c8e9927139062c727b6930` |
| `tests/integration/t245-reviewer-protocol-production-path.test.ts` | `fcebb649a397b532d4a87d7de803ac7656869322024a544a6ed606b8c39e957c` |
| exact 11-path aggregate | `d297e8213a393c2a4fe97796f74cece02e18c65fc978353e4aed62bdb88ad2f3` |

## 残作業とdirty分離

sensor、e3独立先行確認、別identity Formal Iteration 2 READY、review acceptanceは完了した。残る§13、Code Generation / Build & Test / Intent閉包を継続する。commit、push、PR、mergeは実行していない（PR status=NOT_CREATED）。worktreeには先行Unitとworkflow recordの既存dirtyが混在するため、reset、checkout、cleanup、隣接修正を行わず保持している。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-21T13:04:05Z
- **Iteration:** 1
- **Critical / Major / Minor:** 0 / 1 / 0
- **GoA:** FAIL
- **Scope decision:** none

### Findings

- **Major — 初回Review appendでfinding文字列がMarkdown topologyを注入でき、malformed/duplicate ReviewでもREADYが確定する。** `packages/framework/core/tools/amadeus-reviewer-runtime.ts`の`parseReviewResult()`は`findings`を`stringArray()`で型だけ検査し、各要素の改行、Review heading、4-field行を拒否しない。`reviewBlock()`はその値をそのまま`- ${finding}`として埋め込み、`completeReview()`の新規Review経路は生成projectionを再parseせずappend後に`ready: true`を返す。このため、例えばfindingに改行と`## Review — Iteration 1`を含むidentity-first reviewer resultは、同一iterationのduplicate Review headingを永続化しながらREADY証拠になる。`validateExistingReview()`のcanonical完全一致は既存Review再受理時にしか走らず、初回書込みを保護しない。これはBR-U08-03/17、REL-U08-02/06、および「invalid result fieldsではReview/READY非確定」「non-growing canonical Review projection」というproduction契約に反する。初回append前にfindingsを安全な正準形へ限定またはescapeし、生成projection自体を同じexact parserで検証してから書込み、summary/findingsのheading・field injection negative fixtureを追加する必要がある。

### 検証証跡

- freeze hashはruntime `f22e2813ff2414a90a48839b98772bc205b49d11bc712d5f23b0739d60de7d47`、integration `4199133841a3d80af56654400a6e0092267c44847f730f8d4f31451640285cee`、exact 11 aggregate `9186991c6175d1687bc1782f2b066c4ace613ba14abbe28f81fd299a2a2f0bd0`、review前summary `541b629b86724cdaccf9b6d2d1d1521adf2eaff70ead41626029fdb7af4ce909`で一致した。
- t245 unit + production integrationを独立再実行し、31/31、376 assertions。既存のsummary/findings/order/whitespace replay tamper、invocation/iteration replay、bypass/outside/second request、6 packaged callerはGREENだが、上記の初回finding topology injection fixtureは存在しない。
- typecheck、lint、dist 6/6、promote self 4/4はexit 0。full `2026-07-21T12-46-32Z`とcoverage `2026-07-21T12-52-54Z`は各395 files / 5592 assertions / 1 failで、唯一の赤はrecorded M16。保存hashとLCOV `a0439d9c846cdcb0018c7165e99d6e747d2477de16a40bbfc95ba6613de74081`は一致した。
- project coverage gateは72.4383%。exact U08 11-path patch gateは519/519、allowlisted 0、uncovered 0。sensor記録は4/4 PASS。wire/store/schema/threshold/allowlistおよび6/4 projection境界の変更は認められない。

上記Majorは、untrusted reviewer resultからdurable Review/READYへ至るproduction境界でcanonical recordを破壊できるため、Iteration 1は承認できない。コード/test/generated/state/auditは変更していない。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-21T13:57:40Z
- **Iteration:** 2
- **Critical / Major / Minor:** 0 / 0 / 0
- **GoA:** PASS
- **Scope decision:** none

### Findings

- 新規findingなし。
- Iteration 1 Major: CLOSED。untrusted `findings`は各要素を非空single-lineへ限定し、newline、Review heading、4-field行、NUL/tab/DELを含むASCII control、canonical duplicateを初回append前に拒否する。summaryのsingle-line guardも維持されている。
- 初回Reviewは`canonicalReviewProjection()`で生成後、書込み前に`validateExistingReview()`で同じexact parserへ通る。正常な初回appendと同一projectionの冪等replay、既存Date検証、invocation + iteration binding、tamper/bypass/outside/second request拒否は維持されている。

### 検証証跡

- recorded plan SHA-256 `0445618bf24ec2970fdf5b1f6363dce27235c31bfb04d44d3ac19e3f46791d1d`、pure `98d71df104d672ae671c480e49208b239aef1437ff13d60e6e78ad5d43a17ff2`、runtime `f00f07d1d36cee7b0a304cbd99192a7bbe4ae2fe5bee3e04cbcf53693ae7a84d`、unit `7e4ee3e4f3ea119d9adb227c91b93cb8923614c037c8e9927139062c727b6930`、integration `fcebb649a397b532d4a87d7de803ac7656869322024a544a6ed606b8c39e957c`、exact11 aggregate `d297e8213a393c2a4fe97796f74cece02e18c65fc978353e4aed62bdb88ad2f3`、review前summary `0273ce5461caae7b677490ec490207db8bd983b40a357f54af9921f581c89cc8`は一致した。
- t245 unit + production integrationを独立再実行し、35/35、408 assertions。targeted保存証跡は176/176、1589 assertions。
- full `tests/logs/2026-07-21T13-39-40Z`とcoverage `tests/logs/2026-07-21T13-46-19Z`は各395 files / 5596 assertions / 1 fail。summary/failures hashとLCOV `ca6eb37fcc6e08529520221c223b3bc18d894de900b79695e3a1459fc83ea433`は一致し、唯一の赤はrecorded M16である。
- typecheck、dist 6/6、promote self 4/4は独立再実行でexit 0。lint保存証跡はexit 0（既存warningのみ）。generated 6 + self 4のruntimeはsource runtimeと全てbyte一致した。
- exact11 no-index streamは330058 bytes、SHA-256 `62e46c8de7b8f79d28d6cc5a685707bc8b77b9564d61bc0f5c86cad1dd988c6b`。patch coverageは544/544、allowlisted 0、uncovered 0。project coverageは72.4659%。sensor記録は4/4 PASS。
- public canonical seam 2件、internal runtime export 1件とdirect `import.meta.main` guard、scope → check-read → complete-review production path、6 harness / self 4 closed projectionを維持し、wire、store、schema、threshold、allowlistに変更はない。

Iteration 1 findingは閉包され、同一最終freezeで要求・設計・plan・production path・negative matrix・検証証跡が一致するため、Iteration 2をREADYとして承認する。
