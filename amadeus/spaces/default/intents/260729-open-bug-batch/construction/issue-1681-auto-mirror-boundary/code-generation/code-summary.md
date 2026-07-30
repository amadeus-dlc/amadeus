# Issue #1681 Code Generationサマリー

## 入力

`unit-of-work.md`は`amadeus-bugfix`スコープでexpected absentのため補完せず、`requirements.md`のFR-CROSS-1〜4、FR-1681-1〜3、NFR-1、NFR-5〜6と、先行して着地した[Issue #1607](https://github.com/amadeus-dlc/amadeus/issues/1607)のcompletion contractからスコープした。

## 実装結果

- merge済みhead `5b1ee249d01d2e83db4f392a010574a8b4543439`の`decideMirrorBoundary`は、`auto`をIssue有無にかかわらず`{ kind: "auto-lifecycle" }`へ写像する。
- `emitConfiguredMirrorBoundary`は`auto-lifecycle`から固定`amadeus-mirror-lifecycle.ts boundary phase` commandを発行する。orchestratorはcreate／syncを直接選ばず、既存coordinatorへ委譲する。
- `prompt`だけがcreate／sync／skipの質問を出し、`off`はphase boundaryの質問とGitHub mutationを抑止する。
- phase receiptは`absent → pending → completed`を維持し、mirror operationまたはreceipt更新の失敗時は`next`を再実行せず停止する案内にした。
- #1607のcompletion instance、receipt、`--intent`／`--space` selector、multi-intent cursor、retry-safe terminal commitは変更せず、既存E2Eで非回帰を確認した。

## Red→Greenの再現証拠

共有worktreeを変更せず、一時展開したGit objectへ同じtest patchを適用して再検証した。

1. **Red**: PR base `c3f4bbf7f7136d113a10678060c99566a7a551d6`へ、実装commit `d69c104f6b63592d0c18b8cdf4465b22221e1f99`のt265 unit／integration test差分だけを適用し、`bun test --timeout 120000 tests/unit/t265-engine-boundary.test.ts tests/integration/t265-engine-boundary.integration.test.ts`を実行した。結果は91 pass／6 fail／379 expect、exit 1。失敗はunitの`auto + Issue不在`、unitの旧`auto-sync`名、fixed lifecycle function名、ideation／inception／construction各phaseの`auto + Issue不在`（期待`print`、実際`ask`）である。
2. **Green**: PR head `5b1ee249d01d2e83db4f392a010574a8b4543439`で、`bun test --timeout 120000 tests/unit/t265-engine-boundary.test.ts tests/integration/t265-engine-boundary.integration.test.ts tests/e2e/t265-engine-boundary.test.ts tests/integration/t282-amadeus-mirror-lifecycle.integration.test.ts`を実行した。結果は132 pass／0 fail／540 expect、exit 0。

## receipt冪等性と#1607非回帰

- t282の`remote create success plus one local completion failure converges to the same Issue`は、remote create後のlocal succeeded-state writeを1回だけfailure injectionする。初回は`pending`、再試行後は`succeeded`へ収束し、`gateway.issues`は1件、`create` callは初回後も再試行後も1回である。したがって再試行による追加createは0件である。
- t265 E2Eの`final report keeps a multi-intent workflow addressable until completion mirror settles`は、最終report後も対象Intentを`in-flight`、cursorを対象Intentへ維持し、同一completion instanceと`--intent`／`--space`を使ってedit 1回、close 1回、terminal commit後の`STAGE_COMPLETED` 1件へ収束する。他Intentのstate／auditを変更しない。
- t265 unit／integrationはcompleted receipt replay、completion identityとconstruction receiptの分離、pending再発行、receipt update failure、carrierのintent／stage mismatch拒否をGreenで維持した。

## 要件・テスト双方向対応

| 要件 | 実装／配送 | テスト・結果 |
|---|---|---|
| FR-CROSS-1 | 1 Bolt、[PR #1690](https://github.com/amadeus-dlc/amadeus/pull/1690)、`Closes #1681`だけを記載 | PR metadataで#1681だけがcloseされ、#1607は先行PR #1689でclose済み |
| FR-CROSS-2 | test-only patchをbaseへ適用したRed 6件から、最小decision変更でGreenへ遷移 | t265 unit／integration 97件のうち修正境界6件がRed→Green、関連t282／E2Eを含む132件Green |
| FR-CROSS-3 | core正本からself-install 5面・dist 7面を同期 | CIのIntent Mirror distribution contract、Dist and self-install driftがSUCCESS |
| FR-CROSS-4 | 本表、SHA、command、結果、全変更パス、未検証限界を記録 | 対象4 files 132 pass／0 fail、CI run SUCCESS |
| FR-1681-1 | `auto → auto-lifecycle`、`prompt → ask`、`off → suppress` | unit 6セル、integration 3 phase × 6セル = 18実行 |
| FR-1681-2 | fixed lifecycle commandだけを発行し、create／syncをcoordinatorへ委譲。pending receiptとselectorを維持 | fixed-command検査、t265 receipt recovery、t282 create retry（Issue 1、create 1、重複0） |
| FR-1681-3 | t265 unit／integrationを更新し、既存t265 E2Eとt282 lifecycleを回帰実行。英日referenceと配布面を同期 | 対象4 files 132 pass／0 fail、docs／distribution／drift CI SUCCESS |

逆方向では、unit 6セルとintegration 18セルがFR-1681-1／3、fixed-command検査がFR-1681-2、t282のfailure injectionがFR-1681-2のreceipt冪等性、t265 E2Eが#1607非回帰とFR-CROSS-2／4、docs・生成面がFR-CROSS-3とFR-1681-3へ戻る。

## Comprehensiveの適用根拠

対象componentはengine boundary decision／directiveの1つである。Comprehensiveのcomponent当たり10〜15件という下限に対し、最終headでunit・integration・E2E・lifecycle integrationの4 filesを実行して132件であり、件数の縮小はしていない。pure decisionはunit 6セル、CLI routingはintegration 18セル、cross-module completionはE2E、実filesystemとfailure injectionを伴うcreate retryはt282へ置いた。E2Eへ同じ18セルを複製しないのは層ごとの責務分離であり、test volumeの免除ではない。既存Bun runnerで完走するため新しいtest configは不要だった。

## 全変更パス台帳

[PR #1690](https://github.com/amadeus-dlc/amadeus/pull/1690)のmerge commit `dcb318e6e733ca795a9506b3f65d5bf986884165`を親commitと比較した20 pathsである。

| 区分 | status | path |
|---|---|---|
| Core正本 | modified | `packages/framework/core/tools/amadeus-orchestrate.ts` |
| Test | modified | `tests/unit/t265-engine-boundary.test.ts` |
| Test | modified | `tests/integration/t265-engine-boundary.integration.test.ts` |
| Coverage設定 | modified | `tests/.coverage-patch-allowlist.json` |
| Reference EN | modified | `docs/reference/19-layered-config.md` |
| Reference JA | modified | `docs/reference/19-layered-config.ja.md` |
| self-install Claude | modified | `.claude/tools/amadeus-orchestrate.ts` |
| self-install Codex | modified | `.codex/tools/amadeus-orchestrate.ts` |
| self-install Cursor | modified | `.cursor/tools/amadeus-orchestrate.ts` |
| self-install Kimi | modified | `.kimi-code/tools/amadeus-orchestrate.ts` |
| self-install OpenCode | modified | `.opencode/tools/amadeus-orchestrate.ts` |
| dist Claude | modified | `dist/claude/.claude/tools/amadeus-orchestrate.ts` |
| dist Codex | modified | `dist/codex/.codex/tools/amadeus-orchestrate.ts` |
| dist Cursor | modified | `dist/cursor/.cursor/tools/amadeus-orchestrate.ts` |
| dist Kimi | modified | `dist/kimi/.kimi-code/tools/amadeus-orchestrate.ts` |
| dist Kiro IDE | modified | `dist/kiro-ide/.kiro/tools/amadeus-orchestrate.ts` |
| dist Kiro CLI | modified | `dist/kiro/.kiro/tools/amadeus-orchestrate.ts` |
| dist OpenCode | modified | `dist/opencode/.opencode/tools/amadeus-orchestrate.ts` |
| Construction record | added | `amadeus/spaces/default/intents/260729-open-bug-batch/construction/issue-1681-auto-mirror-boundary/code-generation/code-generation-plan.md` |
| Construction record | added | `amadeus/spaces/default/intents/260729-open-bug-batch/construction/issue-1681-auto-mirror-boundary/code-generation/code-summary.md` |

`tests/e2e/t265-engine-boundary.test.ts`と`tests/integration/t282-amadeus-mirror-lifecycle.integration.test.ts`は検証に使用した既存fileであり、PR変更pathではない。この区別により「変更」と「回帰実行」を混同しない。

## Git・PR・CI証拠

- [PR #1690](https://github.com/amadeus-dlc/amadeus/pull/1690): head `5b1ee249d01d2e83db4f392a010574a8b4543439`、merge commit `dcb318e6e733ca795a9506b3f65d5bf986884165`、2026-07-29T23:09:49Z merge、20 changed paths。
- [CI run 30497961531](https://github.com/amadeus-dlc/amadeus/actions/runs/30497961531): head SHA `5b1ee249d01d2e83db4f392a010574a8b4543439`、conclusion SUCCESS。
- SUCCESS jobs: [Tests](https://github.com/amadeus-dlc/amadeus/actions/runs/30497961531/job/90731453450)、[Typecheck](https://github.com/amadeus-dlc/amadeus/actions/runs/30497961531/job/90731453376)、[Lint and complexity](https://github.com/amadeus-dlc/amadeus/actions/runs/30497961531/job/90731453350)、[Coverage Report](https://github.com/amadeus-dlc/amadeus/actions/runs/30497961531/job/90732990018)、[Intent Mirror distribution contract](https://github.com/amadeus-dlc/amadeus/actions/runs/30497961531/job/90731453401)、[Dist and self-install drift](https://github.com/amadeus-dlc/amadeus/actions/runs/30497961531/job/90731453385)、[CI Success](https://github.com/amadeus-dlc/amadeus/actions/runs/30497961531/job/90733020365)。

## 独立検証の限界

- §12a reviewerの権威あるpass-listはstage file、既存produces、present consumesだけである。コード・tests・Git／PR／CIログをpass-listへ追加することは契約上できない。本書はSHA、command、結果、pathを再現可能に集約したが、reviewerが同じinvocation内でpass-list外の実装を独立直読した証拠にはならない。
- ローカル再検証は対象4 filesだけであり、full repository suiteは再実行していない。full smoke＋unit＋integration、coverage、typecheck、lint／complexity、distribution／driftは上記CI runのSUCCESSを根拠とする。
- t282は実filesystemとfailure injectionを使うが、GitHub mutationはin-memory gatewayである。実GitHub上でremote create成功後local write失敗を発生させる破壊的E2Eは実施していない。
- t265 E2Eは#1607のcompletion boundaryを直接検証する既存1件で、phase境界の`auto + Issue不在`そのものはintegration 3 phaseで検証している。E2Eへ18セルを重複展開してはいない。

## 逸脱

orchestratorがcreate／syncを直接選ぶ設計、coordinator／gateway／receipt reducer、Issue #1607のcompletion境界は変更していない。未実行項目を成功へ丸めていない。
