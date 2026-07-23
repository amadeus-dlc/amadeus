# Doctor in-process seam — Code Generation Plan

## スコープと入力

対象は Issue #857 の doctor 実行境界に限定する。Units Generation と User Stories は
`refactor` scope により SKIP されているため、実装の追跡元は
`requirements.md` の FR-1〜FR-6、NFR-1〜NFR-4、および承認済み Functional Design
の3成果物とする。

承認時点の変更対象の正本は次のとおり。

- `packages/framework/core/tools/amadeus-utility.ts`
- `tests/integration/t226-migration-doctor-heartbeats.test.ts`
- `tests/integration/t257-doctor-inprocess-seam.test.ts`（新規）

実装後、承認済み Functional Design の BR-7（既存 helper の再利用）を満たすため、
次の追加所有範囲を逸脱として取り込んだ。

- 正本 helper: `packages/framework/core/tools/amadeus-graph.ts`
- 直接 caller 移行:
  - `tests/integration/t-codex-hooks-ownership.test.ts`
  - `tests/integration/t104.test.ts`
  - `tests/integration/t246-routing-and-autonomy-guards.test.ts`
  - `tests/integration/t249-workspace-inspection.test.ts`
  - `tests/unit/t37.test.ts`
  - `tests/unit/t83-doctor-orphan-worktree.test.ts`
- test/coverage registry:
  - `tests/unit/gen-coverage-registry.test.ts`
  - `tests/.coverage-patch-allowlist.json`
- 生成物: `dist/{claude,codex,cursor,kiro,kiro-ide,opencode}/` 内の
  `amadeus-graph.ts` と `amadeus-utility.ts`
- reviewer 第2回の実装照合で更新した設計正本:
  - `functional-design/business-logic-model.md`
  - `functional-design/business-rules.md`
  - `functional-design/domain-entities.md`

`amadeus-graph.ts` は Step 3／FR-4／NFR-3／NFR-4、caller 移行は
Step 5／FR-3〜FR-6、registry と allowlist は Step 6／NFR-2、配布物同期は
Step 6／FR-3／NFR-1 に対応する。

既存の test runner、TypeScript、Biome 設定をそのまま使うため、test configuration
ファイルの追加・変更は行わない。CLI の統合契約は既存
`t37`、`t83`、`t210` で継続検証する。

計画逸脱: 当初は `tests/unit/` に t257 を置く計画だったが、実装後の test-size
classification guard が filesystem/process を使う同テストを `medium` と判定し、
新規 unit allowlist 追加を禁止する ratchet に抵触した。11ケースの専用 suite は
分割せず `tests/integration/` へ移し、`// size: medium` と CLI mechanism ratchet を
更新した。テスト内容と本番 seam の設計は変更していない。

## 実装手順

### Step 1: 現行契約のベースラインを固定する

- [x] `t226`、`t37`、`t210` を変更前に実行し、35 tests が成功することを確認する
- [x] `t83` も含めた doctor 対象テスト一覧を確定する
- [x] 現行 stdout、exit code、audit、stale-lock cleanup の観測点をテストへ対応付ける

追跡: FR-3、FR-5、FR-6、NFR-1。

### Step 2: doctor の値契約と immutable context resolver を追加する

- [x] `DoctorContext`、`DoctorRunResult`、`DeepReadonly` を追加する
- [x] loader 戻り値を `structuredClone` し、nested array/plain object を再帰 freeze する
  `deepFreezeDoctorSnapshot` を追加する
- [x] `resolveDoctorContext(projectDir)` で path、platform、HOME、CODEX_HOME、
  default scope、migration mode、既存 TOCTOU 検証 seam、時刻、graph、rules、
  agents、scope mapping、artifact names を各1回だけ解決する
- [x] `GraphStage extends StageEntry` の構造を再利用し、`loadStageGraph()` の二重ロードを
  doctor core から除く

追跡: FR-1、FR-4、NFR-3、NFR-4。

### Step 3: `handleDoctor` を同期 core へ変更する

- [x] signature を `handleDoctor(context: DoctorContext): DoctorRunResult` へ変更する
- [x] doctor call tree の routing/catalog 依存を `context` または helper 引数から読む
- [x] `process.stdout.write`、`process.exit`、対象 env/loader/cwd の再読を core から除く
- [x] check 順序、label、fix、audit、stale-lock cleanup の既存意味論を維持する
- [x] 通常失敗は `{ exitCode: 1, output }`、全成功は
  `{ exitCode: 0, output }` として返す

追跡: FR-1、FR-2、FR-4、FR-5、NFR-1、NFR-4。

### Step 4: CLI wrapper と fatal error 順序を実装する

- [x] 内部 `DoctorPostOutputError` を追加し、output 完成後の
  `HEALTH_CHECKED` failure だけに使用する
- [x] output 完成前の fatal は original error をそのまま伝播させる
- [x] `runUtilityMain` の doctor arm で production context を解決し、core の output を
  1回だけ stdout へ書き、正常結果時だけ `process.exit(result.exitCode)` を呼ぶ
- [x] `DoctorPostOutputError` は full stdout を書いて original cause を再throwし、
  明示 `process.exit` を呼ばない

追跡: FR-2、FR-3、FR-5、NFR-1。

### Step 5: in-process integration tests を追加・移行する

- [x] `tests/integration/t257-doctor-inprocess-seam.test.ts` に fixture context builder を置く
- [x] success/failure の exit code と完全 output を戻り値だけで検証する
- [x] fixture graph、main checkout、harness/env snapshot の差し替えを検証する
- [x] loader alias 変更が snapshot に波及しないことと nested mutation の
  `TypeError` を検証する
- [x] core 実行中に対象 loader/env/cwd を再読しないことを検証する
- [x] reviewer spot-check 後、migration mode、CODEX_HOME、NODE_ENV、swap target、
  platform、時刻も context snapshot に含め、解決後の ambient 変更に対する
  完全出力不変を検証する
- [x] audit cold-safe、active audit、stale lock cleanup の副作用を検証する
- [x] output 前後の fatal contract を検証する
- [x] `t226` の doctor dispatch test から stdout/process.exit monkeypatch を除き、
  正式な context/result seam を使う

Minimal strategy の requirement-driven tests として FR-1〜FR-6 を最低1ケースずつ
直接検証し、Construction 共通基準に従って happy path と2件以上の error/edge case を
含める。本番コードへ fixture 専用分岐は追加しない。

追跡: FR-1〜FR-6、NFR-2、NFR-4。

### Step 6: 既存 spawn 契約と品質ゲートを検証する

- [x] `t37`、`t83`、`t210`、`t226`、`t257` を実行する
- [x] `bun run typecheck` を実行する
- [x] `bun run lint:check` を実行する
- [x] project coverage と patch coverage を実測し、変更行100%を確認する
- [x] application source、tests、generated dist、stage artifact の全所有パスに対して
  `git diff --check -- <owned paths>` を実行し、Issue #857 外の変更がないことを確認する
- [x] worktree 全体の `git diff --check` も実行し、実装差分ではなく tool-owned
  append-only audit の空 `Command` 行4件だけが既存フォーマット由来の trailing
  whitespace として残ることを記録する
- [x] reviewer修正後の115テスト並列セットを3回連続実行し、各回115/115成功を確認する

追跡: FR-3、FR-5、FR-6、NFR-1〜NFR-3。

### Step 7: 実装記録を完成させる

- [x] 全手順の完了状態を本 plan に反映する
- [x] `code-summary.md` に変更ファイル、設計判断、テスト結果、plan 逸脱を記録する
  （conductor が作成）
- [x] application code と workflow record の参照・トレーサビリティを確認する
- [x] reviewer 第2回で検出した `DoctorContext` と Functional Design の不整合を、
  clock port を増やさない単一 `nowMs` snapshot と、test mode を core に渡さない
  任意 swap target seam として設計正本へ反映する

追跡: 全要件。

## 完了条件

- `handleDoctor` は process 制御を行わず、明示 context から再現可能な結果を返す
- 公開 doctor CLI の stdout、stderr、exit、audit、cleanup 契約が維持される
- 変更行は in-process tests で直接実行され、patch coverage 100%を満たす
- 既存 spawn tests、typecheck、lint、project coverage がすべて成功する
- 変更は Issue #857 の最小 seam に限定される

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T05:34:13Z
- **Iteration:** 1
- **Scope decision:** approved — FR-1 — packages/framework/core/tools/amadeus-utility.ts — reason: doctor core、context resolver、CLI adapterの正式境界とfatal順序をコードで確認する — owner: amadeus/spaces/default/intents/260723-doctor-inprocess-seam/construction/doctor-inprocess-seam/functional-design/business-logic-model.md#既存 `packages/framework/core/tools/amadeus-utility.ts` の doctor 診断ロジックを（FR-1）

spot-checkにより、export済みcore/context resolverとCLI adapter、通常結果およびfatal前後のstdout順序は設計どおり実装されていることを確認しました。しかしhandleDoctorの呼出し階層がcontext構築後も複数のprocess.env値を再読しており、FR-4、NFR-4、BR-3とcode-summaryの検証主張に反します。加えて変更範囲と品質ゲート証跡が不完全で、失効したspawn-onlyコメントも残っています。

### Findings

- [HIGH] artifact=packages/framework/core/tools/amadeus-utility.ts; description=handleDoctorはcodexProjectTrustDoctorCheckとhookHeartbeatDoctorCheckを呼び、これらがcontext構築後にAMADEUS_MIGRATION_DOCTOR、CODEX_HOME、NODE_ENV、AMADEUS_DOCTOR_TEST_SWAP_*およびprocess.platformを直接再読しています。同じDoctorContextでも実行途中の環境変更で診断分岐、参照ファイル、出力が変わるため、FR-4、NFR-4、BR-3の推移的global依存封じ込めとloader/env/cwd非再読の検証主張を満たしません。; recommendation=利用者向け挙動に影響するAMADEUS_MIGRATION_DOCTORとCODEX_HOME等をresolverで値としてsnapshotし、helperへ明示引数で渡してください。テスト用swap seamもcore実行時のambient env再読を不要にする形へ分離し、context生成後に対象envを変更しても結果が不変である回帰テストを追加してください。
- [MEDIUM] artifact=packages/framework/core/tools/amadeus-utility.ts; description=複数のコメントがhandleDoctorをspawn-onlyまたはnever called in-processと説明したままですが、今回handleDoctorは正式なexport済みin-process境界となりt257から直接実行されます。; recommendation=handleDoctor周辺および各check配線コメントをcoreはin-process、CLI契約はspawnで検証する現在の二層テスト責務へ更新してください。
- [HIGH] artifact=code-summary.md; description=作成・変更ファイル一覧と要件対応が不足しています。; recommendation=差分内の全ファイルを分類して正確なパスで列挙し、plan stepとFR/NFRへ対応付けてください。
- [HIGH] artifact=code-summary.md; description=品質ゲートの再現可能なコマンド、終了状態、レポート参照、patch coverageの分母境界が不足しています。; recommendation=検証表へコマンド、対象範囲、終了状態、証跡、allowlistの所在・理由・失効条件を記載してください。
- [MEDIUM] artifact=code-generation-plan.md; description=追加所有パスと全差分scope検査が反映されていません。; recommendation=承認後逸脱として追加所有パス、必要性、全変更範囲の検査証跡を追記してください。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T06:06:20Z
- **Iteration:** 2
- **Scope decision:** approved — FR-1 — packages/framework/core/tools/amadeus-utility.ts — reason: reviewer修正後のDoctorContext fieldとambient再読除去の実装形状を確認する — owner: amadeus/spaces/default/intents/260723-doctor-inprocess-seam/construction/doctor-inprocess-seam/functional-design/business-logic-model.md#既存 `packages/framework/core/tools/amadeus-utility.ts` の doctor 診断ロジックを（FR-1）

spot-checkにより、ambient env・platform・時刻はresolverでsnapshotされ、handleDoctorと配下helperへ明示引数で渡されており、context解決後のprocess.env、process.platform、Date.now再読は除去されたことを確認しました。失効したspawn-onlyコメント、fatal前後の出力順序、変更パス一覧、検証表、patch coverage分母、flaky watcherの修正説明もiteration 1から改善されています。ただし実装されたDoctorContextは承認済みFunctional Designと矛盾したままであり、設計正本を更新するか実装を設計へ戻す必要があります。

### Findings

- [HIGH] artifact=packages/framework/core/tools/amadeus-utility.ts + business-logic-model.md + business-rules.md + domain-entities.md; description=実装のDoctorContextにはcodexHomeDir、migrationDoctor、heartbeatSwapTarget、healthDirSwapTarget、nowMsが追加され、resolveDoctorContextがNODE_ENV連動のテスト用swap値と時刻をsnapshotしています。一方、business-logic-modelとdomain-entitiesのDoctorContext契約にはこれらのfieldが存在せず、BR-7はclockをambient入力として維持すると定め、BR-4はtest専用booleanやproduction分岐をcontextへ追加しないと定めています。ambient再読のコード欠陥自体は解消しましたが、実装が承認済み設計の依存境界と正面から矛盾し、将来の変更者がclockとテストseamの正しい所有先を判断できません。; recommendation=DoctorContextの実フィールド、resolver flow、推移的global依存表、domain entity属性を実装へ合わせて更新し、BR-7のclock除外を修正してください。heartbeatSwapTargetとhealthDirSwapTargetをDoctorContextに保持する判断は、BR-4の禁止事項に対する明示的な例外と理由を承認するか、テスト専用入力を本番domain contextから分離する設計へ変更してください。
