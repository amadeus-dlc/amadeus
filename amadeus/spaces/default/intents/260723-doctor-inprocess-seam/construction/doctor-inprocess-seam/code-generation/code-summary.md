# Doctor in-process seam — Code Summary

## 実装結果

Issue #857 の doctor 実行境界を、process-global state に直接依存する CLI 処理から、
明示的な immutable context を受け取って同期的な値を返す core へ分離した。公開 CLI の
stdout、exit code、audit、stale-lock cleanup の契約は維持している。

## 変更ファイルとトレーサビリティ

### 作成

- `tests/integration/t257-doctor-inprocess-seam.test.ts`
  - Step 5、FR-1〜FR-6、NFR-2、NFR-4
  - success/failure、snapshot isolation、nested immutability、loader/env/cwd 非再読、
    audit、stale-lock cleanup、output 前後の fatal contract を検証する
- `amadeus/spaces/default/intents/260723-doctor-inprocess-seam/construction/doctor-inprocess-seam/code-generation/code-generation-plan.md`
- `amadeus/spaces/default/intents/260723-doctor-inprocess-seam/construction/doctor-inprocess-seam/code-generation/code-generation-questions.md`
- `amadeus/spaces/default/intents/260723-doctor-inprocess-seam/construction/doctor-inprocess-seam/code-generation/code-summary.md`
  - 以上3件は Code Generation stage の計画、承認証跡、実装記録

### 正本を変更

- `packages/framework/core/tools/amadeus-utility.ts`
  - Step 2〜4、FR-1〜FR-6、NFR-1〜NFR-4
  - `DoctorContext`、`DoctorRunResult`、`DeepReadonly`、
    `resolveDoctorContext(projectDir)`、同期 `handleDoctor(context)`、
    CLI adapter、`DoctorPostOutputError` を実装した
  - `CODEX_HOME`、migration mode、`NODE_ENV` で有効化する swap target、
    platform、時刻を resolver で一度だけ snapshot し、doctor call tree の
    helper へ明示引数で渡す
- `packages/framework/core/tools/amadeus-graph.ts`
  - Step 3、FR-4、NFR-3、NFR-4、BR-7
  - `validateGrid` と `stageGraphDrift` を snapshot-aware にし、
    doctor 専用ロジックの複製を避けた
- `amadeus/spaces/default/intents/260723-doctor-inprocess-seam/construction/doctor-inprocess-seam/functional-design/business-logic-model.md`
- `amadeus/spaces/default/intents/260723-doctor-inprocess-seam/construction/doctor-inprocess-seam/functional-design/business-rules.md`
- `amadeus/spaces/default/intents/260723-doctor-inprocess-seam/construction/doctor-inprocess-seam/functional-design/domain-entities.md`
  - reviewer 第2回、FR-4、NFR-4、BR-4、BR-7。実装済み context field、
    resolver flow、推移的 global 依存、時刻 snapshot、既存 TOCTOU 検証 seam の
    限定例外を設計正本へ反映した

### tests／coverage を変更

- `tests/integration/t226-migration-doctor-heartbeats.test.ts`
  - Step 5、FR-3、FR-5、FR-6。stdout/exit monkeypatch を正式 seam へ移行した
- `tests/integration/t-codex-hooks-ownership.test.ts`
- `tests/integration/t104.test.ts`
- `tests/integration/t246-routing-and-autonomy-guards.test.ts`
- `tests/integration/t249-workspace-inspection.test.ts`
- `tests/unit/t37.test.ts`
- `tests/unit/t83-doctor-orphan-worktree.test.ts`
  - Step 5〜6、FR-3〜FR-6。直接 caller、spawn 契約、コメント上の境界を正式 seam
    と整合させた
- `tests/unit/gen-coverage-registry.test.ts`
  - Step 5、NFR-2。t257 の integration mechanism ratchet を登録した
- `tests/.coverage-patch-allowlist.json`
  - Step 6、NFR-2。Bun LCOV が `DA:0` を付ける runtime-erased 型注釈10行へ、
    理由・失効条件付きの限定除外を追加した

### 生成物を更新

`packages/framework/core` を生成元として、次の12ファイルを
`bun scripts/package.ts` で同期した。Step 6、FR-3、NFR-1 に対応する。

- `dist/claude/.claude/tools/amadeus-graph.ts`
- `dist/claude/.claude/tools/amadeus-utility.ts`
- `dist/codex/.codex/tools/amadeus-graph.ts`
- `dist/codex/.codex/tools/amadeus-utility.ts`
- `dist/cursor/.cursor/tools/amadeus-graph.ts`
- `dist/cursor/.cursor/tools/amadeus-utility.ts`
- `dist/kiro/.kiro/tools/amadeus-graph.ts`
- `dist/kiro/.kiro/tools/amadeus-utility.ts`
- `dist/kiro-ide/.kiro/tools/amadeus-graph.ts`
- `dist/kiro-ide/.kiro/tools/amadeus-utility.ts`
- `dist/opencode/.opencode/tools/amadeus-graph.ts`
- `dist/opencode/.opencode/tools/amadeus-utility.ts`

### Workflow record

次は実装コードではなく、Amadeus が本 intent の進行中に作成・更新した記録である。

- `amadeus/spaces/default/intents/260723-doctor-inprocess-seam/amadeus-state.md`
- `amadeus/spaces/default/intents/260723-doctor-inprocess-seam/audit/j5ik2o-mac-studio-lan-b29dc8f78423.md`
- `amadeus/spaces/default/intents/260723-doctor-inprocess-seam/inception/requirements-analysis/memory.md`
- `amadeus/spaces/default/intents/260723-doctor-inprocess-seam/inception/requirements-analysis/requirements-analysis-questions.md`
- `amadeus/spaces/default/intents/260723-doctor-inprocess-seam/inception/requirements-analysis/requirements.md`
- `amadeus/spaces/default/intents/260723-doctor-inprocess-seam/construction/functional-design/memory.md`
- `amadeus/spaces/default/intents/260723-doctor-inprocess-seam/construction/code-generation/memory.md`
- `amadeus/spaces/default/intents/260723-doctor-inprocess-seam/construction/doctor-inprocess-seam/functional-design/business-logic-model.md`
- `amadeus/spaces/default/intents/260723-doctor-inprocess-seam/construction/doctor-inprocess-seam/functional-design/business-rules.md`
- `amadeus/spaces/default/intents/260723-doctor-inprocess-seam/construction/doctor-inprocess-seam/functional-design/domain-entities.md`
- `amadeus/spaces/default/intents/260723-doctor-inprocess-seam/construction/doctor-inprocess-seam/functional-design/functional-design-questions.md`
- `amadeus/spaces/default/intents/260723-doctor-inprocess-seam/verification/phase-check-inception.md`

## 設計判断

- core は stdout と `process.exit` を所有せず、CLI adapter だけが transport を扱う
- loader の戻り値は clone 後に再帰 freeze し、呼び出し後の loader alias 変更や
  nested mutation が実行結果へ混入しないようにした
- graph drift と scope validation は既存の正本 helper を snapshot-aware に拡張し、
  doctor 内へ同等ロジックを複製しない
- post-output fatal だけを内部 error 型で識別し、pre-output fatal は既存どおり
  original error をそのまま伝播する

## 再現可能な検証結果

| コマンド | 結果 | 証跡・対象 |
|---|---|---|
| `bun run coverage:ci -- --verbose -P 4` | PASS、462 files、6,651 assertions、失敗0 | `coverage/tests-totals.json`、`tests/logs/2026-07-23T05-51-22Z/` |
| `bun tests/coverage-project-gate.ts --check` | PASS、27,918 / 34,769 lines、80.2957% | `coverage/coverage-totals.json`、`coverage/lcov.info` |
| `AMADEUS_PATCH_DIFF=/tmp/amadeus-857-patch.diff bun tests/coverage-patch-gate.ts --check` | PASS、LCOV測定対象211行＝実行201＋除外10、未実行0 | diff は `git diff --unified=0 HEAD -- packages/framework/core/tools/amadeus-{graph,utility}.ts` で生成、除外は `tests/.coverage-patch-allowlist.json` |
| `bun test tests/integration/t257-doctor-inprocess-seam.test.ts` | 11/11 PASS | t257 の in-process seam 全ケース |
| `bun test tests/integration/t257-doctor-inprocess-seam.test.ts tests/integration/t226-migration-doctor-heartbeats.test.ts tests/integration/t246-routing-and-autonomy-guards.test.ts tests/integration/t249-workspace-inspection.test.ts tests/integration/t-codex-hooks-ownership.test.ts tests/integration/t104.test.ts tests/unit/t37.test.ts tests/unit/t83-doctor-orphan-worktree.test.ts`（3回連続） | 各回115/115 PASS | reviewer修正後の同時負荷回帰。`/tmp/amadeus-857-watcher-run-{1,2,3}.log` |
| `bun run typecheck` | PASS | production と tests の2 tsconfig |
| `bun run lint:check` | PASS、既存 warning のみ | `tests/ packages/setup/ packages/framework/core/ scripts/` |
| `bun scripts/package.ts --check` | PASS | 6 harness、全生成物 |
| `git diff --check -- packages/framework/core/tools/amadeus-graph.ts packages/framework/core/tools/amadeus-utility.ts dist tests amadeus/spaces/default/intents/260723-doctor-inprocess-seam/construction/doctor-inprocess-seam/code-generation` | PASS | tracked application source、tests、dist、code-generation artifacts |

patch coverage の分母は LCOV に存在する追加行211行である。うち実行可能行201行は
201/201で実行済み。残る `amadeus-graph.ts:1049,1615-1617` と
`amadeus-utility.ts:658-660,700-702` は TypeScript の runtime-erased な複数行型注釈で、
Bun LCOV が `DA:0` を付与する既知クラスである。snapshot 経路自体は t226 と t257 で
in-process 実行済みであり、正確なファイル・理由・失効条件を
`tests/.coverage-patch-allowlist.json` に記録した。未実行かつ未除外の行は0である。

worktree 全体の `git diff --check` では、tool-owned append-only audit の空
`**Command**:` 行4件だけが trailing whitespace として報告される。application source、
tests、dist、Code Generation artifact の全所有差分は clean であり、audit shard は
手編集していない。untracked artifact も各ファイルを
`git diff --no-index --check /dev/null <path>` で検査し、前段の
`verification/phase-check-inception.md` に意図的な Markdown hard break 2件がある以外は
clean である。これは Code Generation の所有範囲外であり、内容を変更していない。

## 計画からの逸脱

- t257 は当初の `tests/unit/` では test-size classification guard に抵触したため、
  medium integration test として `tests/integration/` に配置した
- doctor の直接 caller が当初想定より多かったため、t246、t249、
  Codex hooks ownership test も正式 seam へ移行した
- 独立レビューで doctor 内の graph drift/scope validation 複製を検出したため、
  正本 helper へ snapshot 引数を追加する設計へ修正した
- 第1回 reviewer spot-check で doctor 配下 helper の ambient env/platform 再読を
  検出したため、対象値と時刻を `DoctorContext` に追加し、context 解決後の変更で
  結果が変わらない回帰テストを追加した
- suite 負荷時に post-output fatal watcher の固定回数 polling が枯渇したため、
  production injection を追加せず、READY handshake、監視開始同期、親側期限、
  child の必須 kill/reap に置き換えた
- 第2回 reviewer が実装と承認済み Functional Design の field 不一致を検出したため、
  `nowMs` を clock port ではない run 単位の数値 snapshot として明記し、既存
  TOCTOU swap target は test mode を core へ渡さない限定 seam として正本化した

これらはいずれも Issue #857 の seam と検証に必要な変更であり、doctor の
ユーザー向け振る舞いは変更していない。
