# Code Generation Plan — harness-provenance

上流入力(consumes 全数): `functional-design/business-logic-model.md`, `functional-design/business-rules.md`, `functional-design/domain-entities.md`, `nfr-design/performance-design.md`, `nfr-design/security-design.md`, `infrastructure-design/deployment-architecture.md`, `inception/units-generation/unit-of-work.md`, `inception/requirements-analysis/requirements.md`

## 目的

Issue #1452 の単一 Unit `harness-provenance` を walking skeleton として実装する。新規 intent birth 時に、実行ハーネスを `claude-code | codex | cursor | opencode | kiro | unknown | manual` のいずれかへ fail-closed に正規化し、`amadeus-state.md` の `## Project Information` に `Harness` を exactly once 記録する。既存 `harnessDir(): string`、V7 state、memory diary の4見出し、全配布形態の互換性を維持する。

FR-5（監査シャードへのハーネス付記）は対象外とする。新しい API、DB、外部サービス、フロントエンド、IaC、ネットワーク呼出、実行時依存関係は追加しない。

## 変更対象と所有境界

- 正本ロジック: `packages/framework/core/tools/amadeus-lib.ts`
- intent birth 連携: `packages/framework/core/tools/amadeus-utility.ts`
- 単体テスト: `tests/unit/t269-harness-provenance.test.ts`
- 統合テスト: `tests/integration/t270-harness-provenance-birth.test.ts`
- 既存回帰テスト: `tests/unit/t144-harness-seam.test.ts`, `tests/unit/t100-memory-template-lifecycle.test.ts`
- 利用者向け契約: `docs/guide/12-cli-commands.md`, `docs/guide/12-cli-commands.ja.md`
- 生成物: `dist/**` および self-install 面（既存 package/promote コマンドだけで同期し、手編集しない）

## 実装手順

- [x] **Step 1 — provenance 付き resolver を導入する（FR-2, FR-3 / BR-4〜BR-8, BR-13〜BR-16）**
  - [x] `HarnessType` を7値の exported union として定義する。
  - [x] 5つの既知 dot-dir を型へ対応付ける exported `HARNESS_DIR_TO_TYPE` を canonical mapping とする。
  - [x] 内部型 `HarnessDirSource = "env" | "script-path" | "cwd-probe" | "fallback"` と immutable な解決結果を導入する。
  - [x] 既存 ladder（env → script path → CWD probe → `.claude` fallback）を provenance 付き resolver へ移し、非 env 解決結果をオブジェクト単位でキャッシュする。
  - [x] 公開 `harnessDir(): string` のシグネチャ、返値、call-time env 優先、非 env cache の意味論を維持する。
  - [x] `detectHarnessType()` を `AMADEUS_HARNESS_TYPE` の存在判定 → 厳密7値 parse → `CLAUDECODE === "1"` → provenance 付き resolver の順で実装する。空文字・不正値・fallback・未知 open-set dir は `unknown` とし、明示 override が存在する場合は後段へ落とさない。

- [x] **Step 2 — intent birth へ exactly-once で記録する（FR-1 / BR-9〜BR-12）**
  - [x] `amadeus-utility.ts` から `detectHarnessType()` を import する。
  - [x] `handleIntentBirthStateBuild()` で detector をちょうど1回呼び、ローカル変数へ保持する。
  - [x] `stateContent` の `Active Agent` 直後へ `- **Harness**: ${harnessType}` を1行だけ追加する。
  - [x] `STATE_V7_FIELDS` は変更せず、`Harness` を optional V7 拡張として扱う。

- [x] **Step 3 — resolver/detector の単体テストを追加する（FR-2, FR-3, NFR-1）**
  - [x] 7つの明示値を全件検証し、空文字・不正値が `unknown` で検出を遮断することを検証する。
  - [x] `CLAUDECODE=1`、canonical mapping 5件、未知 dot-dir、fallback provenance を検証する。
  - [x] env/script-path/CWD probe/fallback の各 source と、複数 dot-dir 時の既存固定順を fresh subprocess で分離する。
  - [x] `harnessDir()` の call-time env と非 env cache が従来どおりであることを固定する。
  - [x] 既存 `t144` は互換性回帰として green を維持し、重複する fixture 改変は最小限にする。

- [x] **Step 4 — intent birth と6配布形態の統合テストを追加する（FR-1, AC-3d, NFR-1, NFR-2）**
  - [x] 実 FS 上の新規 birth で `Harness` が Project Information に exactly once 存在し、既存 field helper で読めることを検証する。
  - [x] `Harness` のない既存 V7 state と `Harness` を持つ新規 V7 state の双方が既存 validator/reader で受理されることを検証する。
  - [x] Claude Code / Codex / Cursor / OpenCode / Kiro CLI / Kiro IDE の6配布形態を fresh subprocess で起動し、3つの override env を明示的に unset したうえで、競合する CWD dot-dir より script-path が優先されることを検証する。
  - [x] 不正な `AMADEUS_HARNESS_TYPE` の生値が state、audit、stdout、stderr へ残らず、state には `unknown` だけが記録されることを検証する。
  - [x] detector の追加がネットワーク・subprocess・追加ファイル I/O を発生させず、固定5候補の同期判定だけであることを source contract と実行結果で確認する。

- [x] **Step 5 — FR-4 の運用契約を受け入れる（FR-4 / BR-17〜BR-19）**
  - [x] `ensureStageDiary()` と `memory-template.md` を変更しない。
  - [x] `tests/unit/t100-memory-template-lifecycle.test.ts` で4見出しと `total=0` の不変を再検証する。
  - [x] conductor が本ステージの実在する通常 diary エントリ本文へ、生成済み state の値を使った `Harness=<type>` を記録する。受入のためだけの synthetic entry は作らない。

- [x] **Step 6 — 利用者向け override 契約を文書化する（FR-1 AC-1d）**
  - [x] 英語版・日本語版 CLI guide の環境変数節へ `AMADEUS_HARNESS_TYPE` を追加する。
  - [x] 有効な7値、空/不正値が `unknown` へ正規化されること、`CLAUDECODE` と dot-dir 検出より優先されること、`manual` の用途を明記する。

- [x] **Step 7 — package/promote と検証を完了する**
  - [x] 既存テスト設定を変更せず、新規 `t269`/`t270` が現行 runner に検出されることを確認する。
  - [x] `bun test tests/unit/t269-harness-provenance.test.ts tests/unit/t144-harness-seam.test.ts tests/unit/t100-memory-template-lifecycle.test.ts tests/integration/t270-harness-provenance-birth.test.ts`
  - [x] `bun run typecheck`
  - [x] `bun run lint`
  - [x] `bun scripts/package.ts`
  - [x] `bun run promote:self`
  - [x] `bun run dist:check`
  - [x] `bun run promote:self:check`
  - [x] `bun tests/gen-coverage-registry.ts --check`
  - [x] `bun tests/complexity-gate.ts --check`
  - [x] stage sensor の linter / type-check / answer-evidence を実行し、実測結果を `code-summary.md` に記録する。

- [x] **Step 8 — 完了成果物をまとめる**
  - [x] 各チェックボックスを実装順に更新する。
  - [x] 変更ファイル、FR/AC 対応、配布同期、テストの実測 exit code、残課題を `code-summary.md` に記録する。
  - [x] application code と plan/summary を architecture reviewer の unit scope review へ渡す。

## ストーリー・要件トレーサビリティ

| 実装・検証 | 対応要件 | 完了条件 |
|---|---|---|
| Step 1, Step 3 | FR-2, FR-3 / AC-2a〜2b, AC-3a〜3d | 優先順位、fail-closed、source provenance、既存 `harnessDir()` 互換がテストで固定される |
| Step 2, Step 4 | FR-1 / AC-1a〜1d | 新規 birth の Project Information に正規化済み Harness が exactly once 記録される |
| Step 4 | NFR-1, NFR-2 | Harness のない既存 V7 を受理し、既存センサー契約を壊さない |
| Step 5 | FR-4 / AC-4a〜4b | diary template を変えず、実在ログ本文に人間可読の provenance が残る |
| Step 6 | manual override 契約 | 7値・優先順位・正規化が英日ガイドから確認できる |
| Step 7 | 全受入境界 | 正本、全配布面、型、lint、回帰、drift guard がすべて green |

## 設定・データ・インフラ

- test runner、TypeScript、Biome、coverage registry、complexity baseline の設定変更は不要。
- schema migration、永続DB、repository 層、API endpoint、認証認可、秘密情報、監視基盤、CI/CD 定義、デプロイ topology の変更は不要。
- `AMADEUS_HARNESS_TYPE` は任意の process env 入力であり、設定ファイルの新設や既定値の永続化は行わない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T00:18:16Z
- **Iteration:** 1
- **Scope decision:** none

型・依存方向・fail-closed判定・V7互換・6配布形態・drift/complexity gateの宣言と実測証跡は整合していますが、security-designのmemory漏洩防止検証が実装計画から脱落し、Unitが指定した利用者向け文書成果物も無申告で別配置へ置換されています。

### Findings

- [Major] security-design.md:19-21 はinvalid overrideのraw markerがstate・実在memory entry・audit・stdout・stderrの全てに存在せず、memoryには正規化済みHarness=unknownだけがあることを必須検証としています。しかしcode-generation-plan.md:44-54のraw leak検証はmemoryを対象外とし、code-summary.md:27-30/43-48もt270のinvalid leak防止と別のHarness=codex実在entryしか示していません。実観測memory entryにinvalid markerを流すfixtureを追加し、raw不存在とHarness=unknownを同一caseで検証して、実測結果をsummaryへ記録してください。
- [Major] unit-of-work.md:21 は利用者向け契約の成果物をdocs/reference/の環境変数一覧と定義していますが、code-generation-plan.md:11-19/56-58とcode-summary.md:33-37はdocs/guide/12-cli-commands.mdと日本語版だけを変更し、上流成果物の置換理由やdocs/reference側の同期・非該当根拠を記録していません。権威ある契約面が二重化または未更新になるため、Unit指定のreference文書も更新するか、guideを唯一のownerとする承認済み変更としてUnitとのトレーサビリティを是正してください。

## Iteration 1 限定是正

- [x] t270 のinvalid override同一caseで、canonical memory templateを使うtemp fixtureへconductorの通常Interpretations観測を記録し、state・memory・audit・stdout・stderrのraw marker不存在と`Harness=unknown`、4見出し不変を検証する。
- [x] runtime utilityの正準referenceである`docs/reference/06-hooks-and-tools.md`と日本語版へ`AMADEUS_HARNESS_TYPE`契約を追加する。`docs/reference/09-testing.*`の環境変数一覧はテストランナー専用のため変更しない。
- [x] referenceを契約の正本、`docs/guide/12-cli-commands.*`を利用者向け導線として相互参照し、Unit指定成果物とのownershipを明記する。
- [x] focused/full tests、typecheck、lint、package/promote、dist/promote drift、registry/complexity、stage sensorsを再実行し、実測結果をsummaryへ記録する。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T00:23:22Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の2件のMajorは解消済みです。t270の同一invalid override caseはcanonical template由来の実在diaryで5面のraw marker不存在、Harness=unknown、4 H2不変、専用Harness見出しなしを検証し、referenceは06-hooks-and-tools英日版をruntime契約正本、CLI guideを利用者導線として同期し、09-testingをテストランナー専用として非該当化しています。是正後はfocused 6 pass、全focused regression 38 pass・167 expect、typecheck・lint・6配布・4 self-install・drift・registry・complexity・全stage sensorがgreenです。

### Findings

- None
