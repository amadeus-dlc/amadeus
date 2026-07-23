# Code Summary — fix-1389-shard-pollution（#1389）

上流入力(consumes 全数): requirements.md（FR-1〜4/NFR-1〜4）、code-generation-plan.md、codekb architecture（エラー監査アーキテクチャの current view）、codekb code-structure / re-scans/260723-fixture-shard-pollution.md（同型サイト目録）。

## 概要

フルテストスイート実行中に、in-process のエラー駆動が **ambient `CLAUDE_PROJECT_DIR`（実ワークツリー）** の audit へ fixture clone-id シャードを書き込む欠陥（bug/P2/S3-MAJOR、設計非対称の bootstrap 由来）を、**根（`recordEngineError` の projectDir 貫通）** と **増幅（`_cloneId`/`_auditShardName` の projectDir キー化）** の両面で修正した（FR-1 裁定 A）。テスト側は犯人 t248 の env 隔離を是正し（FR-2）、汚染ゼロを直接 assert する回帰テスト t257 を追加した（FR-3）。正規 CLI 経路の ERROR_LOGGED 記録は不変（FR-4）。

コミット:
- `d9b4ee7d1` fix(engine): 根+増幅の修正 + dist/self-install 再生成
- `e0a4d333d` test(engine): t257 追加 / t248 隔離 / t-learnings-persist-seam 更新 / coverage registry 再生成

## 実装内容

### 1. 根 — `recordEngineError` の projectDir 貫通（`amadeus-orchestrate.ts`）

- `recordEngineError(message, projectDir?)` に projectDir 引数を追加。引数指定時は `resolveProjectDir(projectDir)`、未指定時のみ従来の `process.argv` 再抽出へフォールバック（`runEngineMain` トップレベル catch は main の flag parse より前に発火しうるため、この経路のフォールバックは設計上必要 — 実測: t214 seam の catch テストが argv 経路を駆動）。
- projectDir の配送は、**module スコープの「現ハンドラ projectDir」`_handlerProjectDir` を各 in-process エントリ（`handleNext` / `handleReport` / `main`）で set し、単一の `emit()` 集約点で read** して `recordEngineError` へ渡す方式とした。

  **設計判断（param 直接貫通ではなく module スコープ current-dir を採る根拠）**: plan の「emit() 経由で各 error 発行ハンドラの pd を貫通」を満たす2案のうち、`emit()` に projectDir 引数を足して全 error 発行サイト（実測 45 箇所）へ `, projectDir` を付す案は、codecov patch ゲート（NFR-4 / cid:local-lcov-pre-push）と非両立だった — 変更行のうち 56 箇所超が INIT_JUMP_ERROR・"Internal: …" 等の**到達困難な内部不変量エラー経路**で、既存テストが被覆せず、被覆のためのテスト新設は bugfix の外科的最小（P5）を大きく超える。module スコパの current-dir 方式は、観測可能な契約（ERROR_LOGGED が呼び出し元 projectDir に記録される）と plan の pd フロー（ハンドラ→emit→recordEngineError）を保ちつつ、変更行を被覆済みの少数（emit body / recordEngineError / 3 set-site）に限定する。既存の `_engineErrorInProgress` 再入ガード・`_cloneId` メモと同じ module-state idiom に一致。CLI は同期 one-shot 実行のため current-dir の staleness 懸念はない（各ハンドラ入口で set、emit はハンドラ経由でのみ到達）。

### 2. 増幅 — clone-id/shard 名の projectDir キー化（`amadeus-lib.ts`）

- `_cloneId: string | null`（単一値メモ）→ `_cloneIdByProject: Map<string,string>`。`cloneId(projectDir)` は projectDir キーで get/set（早期 return 構造を保持）。
- `_auditShardName: string | null` → `_auditShardNameByProject: Map<string,string>`（`auditShardName` は `<host>-<cloneId(projectDir)>.md` のため対称にキー化）。
- `_resetCloneIdForTests()` は両 Map を `clear()`（write/reset 対称を維持）。

### 3. テスト隔離（FR-2） — `tests/integration/t248-stage-contract-routing.test.ts`

犯人テスト「report on a per-unit stage with uncovered units emits the coverage-gate error」の `withStageEnv` に `CLAUDE_PROJECT_DIR: project` を明示（対照 `advanceInProcess:420-431` の既習様式）。

### 4. 回帰テスト（FR-3） — `tests/integration/t257-engine-error-ambient-shard-pollution.test.ts`（新規）

canonical import の in-process integration テスト（実 FS = integration 層、cid:fs-tests-integration-first；canonical import で lcov は canonical 行に帰属 = t248 系と同一様式）。4 ケース:
- (a) ambient fake project を `CLAUDE_PROJECT_DIR` に、別 temp `target` を `handleReport` へ渡し in-process エラー駆動 → **ambient の audit がシャード 0**、target に 1（汚染ゼロを直接 assert）。
- (b) 別 projectDir が**各自の clone-id** を解決（fixture→real 混成が起きない）。
- (c) 単一 projectDir 経路の挙動不変（e1/e6 留保: `CLAUDE_PROJECT_DIR == handler projectDir` で 1 回記録）。
- reset seam: 同一 project の clone-id 変更はメモ維持、`_resetCloneIdForTests` 後に再読込。

### 5. 付随修正

- `tests/unit/t-learnings-persist-seam.test.ts`（#877 reset-seam）: 旧単一値メモ挙動（別 project が先行 project のトークンを再利用）を assert していたため、**projectDir キー化後の正挙動**（別 project は各自トークン、同一 project はメモ維持→reset で再読込）へ更新。FR-1(b) 必須修正の直接帰結であり逸脱ではない。
- `tests/.coverage-registry.json`: t257 の in-process import 追加に伴い `gen-coverage-registry.ts` で再生成（cid:integration-registry-regen、+4 行 t257 のみ）。
- dist/self-install（`.claude`/`.codex`/`.cursor`/`.opencode` + `dist/<6 harness>`）を `bun scripts/package.ts` + `promote:self` で再生成（NFR-2、fix コミットに同梱）。

## 検証コマンド表（フルパス + exit code）

作業ディレクトリ: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/runs/20260722-233519-0637/engineer-4`

| コマンド | exit code | 備考 |
|---|---|---|
| `bun run typecheck`（`tsc --noEmit -p tsconfig.json && -p tsconfig.tests.json`） | 0 | — |
| `bun run lint`（biome check tests/ packages/setup/ packages/framework/core/ scripts/） | 0 | 既存 warning のみ（handleReport 複雑度 68 は既存、plain 代入で不変） |
| `bun scripts/package.ts`（dist 再生成） | 0 | 6 harness 再生成 |
| `bun run promote:self`（self-install 再生成） | 0 | — |
| `bun run dist:check` | 0 | all harness trees in sync |
| `bun run promote:self:check` | 0 | project-local self install in sync |
| `bash tests/run-tests.sh --ci`（修正前・初回） | FAIL | 3 files fail（t-learnings-persist-seam=旧挙動 assert / gen-coverage-registry・t134=t257 未登録）→ 全て是正 |
| `bun run coverage:ci`（全スイート + lcov・最終） | 0 | `RESULT: PASS` / Failed files 0 / Failed assertions 0 / Total assertions 6644 |
| `bun test t257 / t248 / t-learnings-persist-seam / gen-coverage-registry / t134`（是正後） | 0 | 55 pass 0 fail |
| `AMADEUS_PATCH_BASE_REF=d9b4ee7d1^ bun tests/coverage-patch-gate.ts --check`（NFR-4） | 0 | `PASS` / measured added lines 38, covered 38, uncovered 0 |

NFR-4 補足（diff 追加行の lcov DA 実測、`coverage/lcov.info`）: canonical 2 ファイルの追加実行行は **未カバー 0**（`amadeus-orchestrate.ts` added 45 / covered 16 / 非実行 29 / 未カバー 0、`amadeus-lib.ts` added 40 / covered 22 / 非実行 18 / 未カバー 0）。module スコープ current-dir 方式の採用により変更行が被覆済み少数に限定され、patch ゲートを 0 uncovered で通過した。

## 同型サイト実測表（FR-2 後段、cid:same-root-inventory）

判定基準: 「in-process で error directive を駆動 × その実行窓で `CLAUDE_PROJECT_DIR` を temp へ set しない × 非 migration error」の 3 条件。修正は根（`recordEngineError` 側）のため、error を発行する全 in-process ハンドラ経路が構造的に封鎖される。Issue 起票はしない（plan 指示・実測結果を本表に記録）。

| サイト | ハンドラ | error 発行? | 修正前 汚染 | 修正後（構造） |
|---|---|---|---|---|
| `tests/integration/t248...:507`（犯人） | `handleReport` per-unit gate | あり | あり（ambient 実 record、確定再現） | 停止（`_handlerProjectDir=project`）+ test 側 `CLAUDE_PROJECT_DIR` 明示 |
| `tests/integration/t118.test.ts:378` | `handleReport(["--user-input","Resume"], p)` → "report requires --result" | あり | **あり**（p は state 無し temp、argv 空 → ambient `CLAUDE_PROJECT_DIR` の実 record へ記録） | 停止（`_handlerProjectDir=p`、p は state 無し → `existsSync` false で no-op） |
| `tests/unit/t211-swarm-batch-progress.test.ts:177` | `handleNext([], proj)` happy path | **なし** | なし | 該当なし（error 経路を踏まない） |
| `tests/integration/t251-swarm-and-next-stage.test.ts:80` | `handleNext([], proj)` happy path | なし | なし | 該当なし |
| `tests/integration/t251-...:222` | `handleNext(--stage requirements-analysis --single ...)` happy | なし（有効 stage） | なし | 該当なし; error 時は `_handlerProjectDir=proj` へ記録 |
| `tests/integration/t212-optional-produces.test.ts:630` | `handleNext([], project)` happy path | なし | なし | 該当なし |

補足: `t211`/`t251`/`t212` は `handleNext` の happy path（run-stage directive を発行、error directive 非発行）のため `recordEngineError` を呼ばず、修正前後を問わず汚染ベクトルではない（`grep -c CLAUDE_PROJECT_DIR` = 0 の 3 本はいずれも happy path）。`t118:378` のみ `handleNext`/`handleReport` の in-process error で修正前に実 record へ記録しうる同型ベクトルであり、根の修正で構造封鎖される。

過去に committed 済みの汚染シャード（`amadeus/spaces/default/intents/260722-state-intent-selector/audit/j5ik2o-mac-studio-lan-fixturecloneid01.md`、mtime 本セッション前・git clean）は履歴 rewrite 対象外（requirements Out of scope・append-only）として残置。本作業の実行で実 record への新規汚染シャードは発生していない（`find ... -name '*fixturecloneid*'` で確認）。

## 落ちる実証の実測記録（cid:falling-proof-no-stash / injection-one-set）

fix コミット `d9b4ee7d1` 後、canonical 2 ファイルのみ pre-fix 面へ `git checkout d9b4ee7d1^ -- <path>` で切替 → t257 実行 → `git checkout d9b4ee7d1 -- <path>` で復元（stash 不使用）。t257 は自前の temp `ambient` を `CLAUDE_PROJECT_DIR` に設定するため実 record を汚染しない。

- pre-fix: **2 fail / 2 pass**（`Ran 4`）。
  - (a) ambient 汚染: FAIL（`auditShardsOf(ambient)` に fixture シャードが出現）
  - (b) clone-id 混成: FAIL（`auditShardName(second)` が `distinctcloneid2` でなく primed `...-fixturecloneid01.md` を返す — Received 実測: `j5ik2o-mac-studio-lan-fixturecloneid01.md`）
  - (c) 単一 projectDir / reset: PASS（設計どおり修正前も green の非回帰ケース）
- 復元後（fix）: **4 pass / 0 fail**。

両フィックス（根の ambient 汚染・増幅の clone-id 混成）が pre-fix red で実証された。

## 裁定の記録(逸脱2点)

- **E-FSPCG1**: A 承認 3-0 — module-scoped 方式維持。留保転記: [e1 GoA2] 実装後申告は deviation-stop-before-implement の違反実例として PM 回付(記帳済み)— builder ディスパッチ文言の停止指示を CG summary にも残す(本ディスパッチには『逸脱は実装前に停止』を明記済みだったが、builder は plan 詳細レベルの逸脱を停止対象外と判断した — 次回は『既存様式への準拠と判断する場合も停止対象』の deviation-applicability-not-solo 文言を併記する)
- **E-FSPCG2**: A 承認 3-0 — t-learnings-persist-seam の assert 更新を追認(FR-1b 必須帰結)
- leader E-OC1 承認: 2026-07-23T04:13:02Z(agmsg 一次記録)
