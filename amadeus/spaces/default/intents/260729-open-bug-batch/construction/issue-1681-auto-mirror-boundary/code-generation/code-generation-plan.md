# Issue #1681 Code Generation計画

## 入力とスコープ

- 対象: [Issue #1681](https://github.com/amadeus-dlc/amadeus/issues/1681)
- 対応要件: FR-CROSS-1〜4、FR-1681-1〜3、NFR-1、NFR-5〜6
- 依存: [Issue #1607](https://github.com/amadeus-dlc/amadeus/issues/1607)を先に着地させ、そのcompletion transaction、durable receipt、`--intent`／`--space` selectorを非回帰対象とする。
- `unit-of-work.md`は`amadeus-bugfix`スコープでexpected absentのため補完せず、`requirements.md`と既存Bolt証跡からスコープした。
- 変更境界は、`auto + Mirror Issue不在`を`ask`へ落とすorchestratorの一時的なdecisionだけである。create／syncの選択、GitHub gateway、receipt reducer、completion transactionは変更しない。
- テスト戦略はComprehensiveである。対象componentは「engine boundary decision／directive」であり、unit・integration・E2Eと既存lifecycle integrationを使う。

## 実装手順

| Step | 実装・検証 | 対応要件 | 具体的なテスト／証拠 |
|---|---|---|---|
| [x] **1** | base SHAへ新しい期待値だけを適用し、旧実装のRedを確立する | FR-CROSS-2、FR-CROSS-4、FR-1681-1〜3、NFR-6 | `tests/unit/t265-engine-boundary.test.ts`と`tests/integration/t265-engine-boundary.integration.test.ts`。`auto + Issue不在`のunit 1セルと3 phaseのintegration 3セルを含む6 failを再現する |
| [x] **2** | `MirrorBoundaryDecision`の`auto-sync`を、operationを先決めしない`auto-lifecycle`へ変更する | FR-1681-1〜2、NFR-5 | unitの`off／prompt／auto × Issue不在／存在` 6セル |
| [x] **3** | `auto`ではIssue有無にかかわらず固定`amadeus-mirror-lifecycle.ts boundary phase` commandを発行し、create／syncをcoordinatorへ委譲する。`prompt`だけを`ask`、`off`をno-opに保つ | FR-1681-1〜2、FR-CROSS-2 | integrationの18セル（3 phase × 3 mode × Issue有無）と「fixed lifecycle commandだけを名前に含み、直接create／sync／closeしない」検査 |
| [x] **4** | pending receipt更新に成功した後だけ`next`を再実行する案内へ一般化し、途中失敗時は停止して再試行可能状態を保つ | FR-1681-2、NFR-1、NFR-6 | t265 integrationのpending receipt再発行、receipt update failure、completed replay。`tests/integration/t282-amadeus-mirror-lifecycle.integration.test.ts`のremote create成功後local completion失敗→再試行 |
| [x] **5** | #1607のcompletion instance、`--intent`／`--space` selector、multi-intent cursor、terminal auditを回帰確認する | FR-CROSS-2、FR-CROSS-4、FR-1681-2、NFR-1 | `tests/e2e/t265-engine-boundary.test.ts`のmulti-intent completion 1件と、t265 unit／integrationのcompletion／carrier cases |
| [x] **6** | 英日referenceを更新し、正本からself-install 5面とdist 7面を再生成する | FR-CROSS-3、FR-1681-3、NFR-5〜6 | `docs/reference/19-layered-config.md`、`.ja.md`、`bun scripts/package.ts --check`、`bun run promote:self:check`、CIのdistribution contract／drift jobs |
| [x] **7** | focused suite、typecheck、lint、complexity、coverage、配布driftを検証し、1 Issue = 1 Bolt = 1 PRで配送する | FR-CROSS-1〜4、NFR-6 | [PR #1690](https://github.com/amadeus-dlc/amadeus/pull/1690)、[CI run 30497961531](https://github.com/amadeus-dlc/amadeus/actions/runs/30497961531)、ローカル再検証132 pass／0 fail |
| [x] **8** | 既存Bun runnerと`package.json`を再利用し、新しいtest configが不要であることを確認する | FR-CROSS-4、NFR-5〜6 | `bun test --timeout 120000 <対象4 files>`が設定追加なしで完走 |

## Comprehensiveテスト計画

| 層 | 対象file | 主要ケース | 要件 |
|---|---|---|---|
| Unit | `tests/unit/t265-engine-boundary.test.ts` | mode × Issue有無の6セル、receipt parse／transition／completed replay、completion identity | FR-1681-1〜3、#1607非回帰 |
| Integration | `tests/integration/t265-engine-boundary.integration.test.ts` | 3 phase × 6セル = 18実行、fixed lifecycle command、pending receipt、prompt answer、off、selector／carrier | FR-CROSS-2／4、FR-1681-1〜3 |
| E2E | `tests/e2e/t265-engine-boundary.test.ts` | multi-intent final report→completion lifecycle→close→terminal commit、selector伝播、cursor／audit終端 | FR-CROSS-2／4、FR-1681-2、#1607非回帰 |
| Lifecycle integration | `tests/integration/t282-amadeus-mirror-lifecycle.integration.test.ts` | remote create成功後local completion write失敗、pending receiptから再試行、Issue数1・create call数1（重複0） | FR-1681-2、NFR-1 |

Comprehensiveの「component当たり10〜15件」は下限として扱う。今回の単一componentに対し、最終headの上記4 filesは実行時132件であり下限を超えるため、件数の正式な縮小は行っていない。E2Eへ18セルを重複展開しない理由は、pure decisionをunit 6セル、CLI phase routingをintegration 18セル、cross-module completion transactionをE2E 1件へ責務分離しているためである。create retryは実filesystemとfailure injectionを使うt282へ置き、E2E fixtureへ同じcoordinator test doubleを重複させない。

## 完了条件

- `auto`はIssue不在でも質問せずfixed lifecycle commandを発行し、既存coordinatorのguarded createへ収束する。
- `prompt`と`off`、receipt冪等性、Issue #1607のcompletion境界を維持する。
- 正本、英日reference、self-install、distが同期し、対象suiteとCIがGreenである。
- [PR #1690](https://github.com/amadeus-dlc/amadeus/pull/1690)がIssue #1681だけをcloseする。

## Iteration 1是正の境界

§12a reviewerの権威あるpass-listはstage file、既存produces、present consumesだけであり、実装コードやテストを追加できない。したがってコードをpass-listへ追加する是正は行わず、再現可能なSHA・command・結果・全変更パスを`code-summary.md`へ集約する。この集約は監査証拠を改善するが、reviewer自身がpass-list外のコードを独立直読できない契約上の限界は残る。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-30T00:16:07Z
- **Iteration:** 1
- **Scope decision:** none

実装コードとテスト本体が権威あるpass-listに含まれず、Code Generationの主要契約を検証できない。加えて、計画とサマリーにも必須の追跡可能性および変更ファイル一覧が不足している。

### Findings

- BLOCKER: 権威あるpass-listには計画・サマリー・要件しかなく、変更された`amadeus-orchestrate.ts`、t265テスト、mirror lifecycleテスト、文書、生成面を読めない。したがって、固定`auto-lifecycle` commandが既存coordinatorへ正しく委譲されること、#1607のcompletion transactionを壊していないこと、receiptによる冪等性、実際のRed→Green、報告された検証結果をコード証拠で確認できない。Code GenerationをREADYにするには、実装差分または変更ファイルを権威あるレビュー入力へ含める必要がある。
- HIGH: `code-generation-plan.md`は要件群を冒頭で一括列挙するだけで、各StepをFR-CROSS-1〜4／FR-1681-1〜3へ個別対応付けていない。stageの各plan stepからuser storyへのtraceabilityと、FR-CROSS-4の受け入れ条件・テスト双方向対応を満たさない。各Stepへ実装対象FRと検証テストを明記する必要がある。
- HIGH: Comprehensiveテスト戦略に対して、計画はunit／integration／E2Eの一般記述のみで、対象test file、各要件のケース、component当たり10〜15件というstage基準、create retry時の重複0件を検証する既存mirror lifecycle testを具体化していない。Step 7の既存設定再利用はtest configuration判断として妥当でも、必須テスト計画の不足を補えない。
- MEDIUM: `code-summary.md`は主な変更しか示さず、必須の作成・変更ファイル完全一覧を提供していない。特に要件で指定されたE2Eファイル、mirror lifecycle test、英日referenceの具体的パス、再生成されたdist／self-install面が列挙されておらず、配布増幅面とテスト証拠を差分へ追跡できない。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-30T00:23:33Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の是正事項は解消された。各Stepから要件と具体的テストへの追跡、Comprehensive戦略の層別根拠、全20変更パス、base/head SHA、再現コマンド、Red 6件からGreen 132件への結果、receipt冪等性と#1607非回帰、CI・drift証拠、未検証範囲が明記されている。FR-CROSS-1〜4、FR-1681-1〜3、NFR-1・5・6との矛盾や実装を阻む未決事項は認めない。コード直読ができない点は§12aのpass-list契約そのものによる制約であり、それだけを理由にBLOCKERとはしない。

### Findings

- None
