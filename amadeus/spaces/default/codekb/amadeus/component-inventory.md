# コンポーネント棚卸し

## Issue #3029 のコンポーネント境界

| コンポーネント | 入力 | 出力 | 境界上の注意 |
|---|---|---|---|
| sensor manifest parser | YAML frontmatter | `SensorManifest` / `SensorSeverity` | blocking の宣言を graph に渡すが、script exit の意味は持たない |
| sensor dispatcher | command、stage、output path | `SENSOR_FIRED` と terminal `SENSOR_*` | exit 127 を成功系イベントへ分類する |
| compiled graph | stage `sensors:` と manifest roster | `sensors_applicable` | severity の唯一の runtime carrier |
| blocking guard | graph の blocking IDs、audit、artifact digest | allow / deny verdict | `script-error:` を拒否し `tool-unavailable` を許可する |
| GitHub PR convergence sensor | `pr-convergence-report.md` | pass/fail JSON | manifest は `default_severity: blocking`。実際の gate は core guard が担う |
| t511 / t92 regression corpus | inline audit、isolated temp project、stub scripts | truth-table assertions | exit 127 の pass 維持を明示的に pin する |

コンポーネントは「分類」「severity 搬送」「完了判定」に分離されており、Issue #3029 は dispatcher の `tool-unavailable` 分類を guard の blocking semantics が失敗扱いとして消費していない接合部にある。

## core/tools の増減と formal-model-check patient 面の構成要素（260814-fmc-macos-provider、履歴、observed `5f6b5bf97`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260814-priority-bug-batch の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**観測 ref**: すべて observed = `5f6b5bf97068f59dee53dcd4a2f6564967c3d164`。差分 base = `89532174c30ef9cc7ff29496cd6916586fdda00a`（9 commits）。全数列挙と検索述語は `re-scans/260814-fmc-macos-provider.md` を正本とする。

### base..observed の増減（`packages/framework/core/tools/`）

| 変化 | コンポーネント | 位置 | 責務 |
| --- | --- | --- | --- |
| **追加** | `amadeus-lifecycle-guard.ts`（236 行） | `packages/framework/core/tools/` | 4 checkpoint 共通の guard 評価 Runtime（`0fbbec42b` / #2986）。`LifecycleCheckpoint` `:42` / `LifecycleGuardAdapter` `:80` / `evaluateLifecycleGuards` `:208` / `guardReceipt` `:153` / `formatGuardRefusal` `:137` |
| **削除** | `team-up.sh` | 旧 `packages/framework/core/tools/` | チームモードの正本ランチャ（bash）。`8b6089275` / #2975 で撤去 |
| **削除** | `team-up-codex-safety-wait.ts` | 同上 | ランチャ専用 supervisor。同上 |
| **削除** | `team-msg.sh` | 同上 | チーム間メッセージング CLI。同上 |

削除 3 件は `git ls-files` に現行コード面としては残らない（`git ls-files \| grep -iE "team-up\|team-msg"` の残ヒットは intent record・re-scan 履歴と、不在を固定する `tests/integration/t-remove-team-up-absence.test.ts` のみ）。本棚卸しの履歴節（`:1504` / `:1506` ほか）が引く `team-up.sh:508` / `team-up-codex-safety-wait.ts:643` は、いずれも**当時の断面の記録**であり observed には存在しない。

### Lifecycle Guard Runtime の adapter registry（5 本、いずれも `Object.freeze` された module-level 配列）

| registry | 位置 | adapter（order 昇順） | receipt 型 |
| --- | --- | --- | --- |
| `INTENT_BIRTH_WORKSPACE_GUARDS` | `amadeus-utility.ts:4123` | `intent-birth.workspace-scan`(10) | `ClassifiedWorkspaceScan` |
| `STAGE_COMPLETION_GUARDS` | `amadeus-state.ts:329` | `.artifacts`(10) / `.unit-review`(20) / `.blocking-sensors`(30) | なし（`never`） |
| `PHASE_TRANSITION_GUARDS` | `amadeus-state.ts:353` | `.phase-check-artifact`(10) | なし |
| `WORKFLOW_COMPLETION_PREPARATION_GUARDS` | `amadeus-state.ts:369` | `.prepared`(10) / `.mandatory-plugin-stages`(20) | なし |
| `WORKFLOW_COMPLETION_AUTHORIZATION_GUARDS` | `amadeus-state.ts:387` | `.record-resolution`(10) / `.goal-receipt`(20)（`WORKFLOW_COMPLETION_GOAL_RECEIPT_POLICY` `:385`） | `GoalReconciliationReceipt` |

拒否の合流点は `refuseBlockedTransition`（`amadeus-state.ts:405`）。消費側 8 ファイル（`git grep -l "amadeus-lifecycle-guard" -- . ':!amadeus/spaces'`）は正本 2（`amadeus-state.ts` / `amadeus-utility.ts`）+ 文書 2（`docs/reference/26-lifecycle-guard-runtime{,.ja}.md`）+ テスト 4（`tests/unit/t2771-lifecycle-guard-runtime.test.ts` 240 行 / `tests/integration/t2771-lifecycle-guard-checkpoints.integration.test.ts` 728 行 / `t2771-lifecycle-guard-regression.integration.test.ts` 164 行 / `t511-blocking-sensor-gate.integration.test.ts`）。**hooks 配下は 0 ヒット** — hook 層のガードは Runtime の外にある。

### 本 intent の患部コンポーネント（`plugins/formal-model-check/tools/`、base..observed で無変更）

| コンポーネント | 位置 | 責務 | #2361 との関係 |
| --- | --- | --- | --- |
| `selectTlcSpawnPlanner` | `tlc-spawn-planner.ts:520` | provider → planner。**同期・可用性検査ゼロ**。`auto` 分岐は `:526` | 患部（フォールバック不在） |
| `createNotRunPlannerReceipt` | `tlc-spawn-planner.ts:62` | not-run receipt の inspection plan 選択。`auto` 分岐は `:68` | 患部（`:526` と同期必須） |
| `NodePlannerEnvironmentPort.inspectDarwin` | `tlc-spawn-planner.ts:131-191` | JAVA_HOME / JDK version / sandbox-exec / network-deny の実 probe | JDK 不一致の実観測点（`:150-166`） |
| `DarwinTlcSpawnPlanner.snapshotEnvironment` | `tlc-spawn-planner.ts:292`（catch `:316-321`） | probe 失敗を `ENVIRONMENT_UNAVAILABLE` へ | フォールバックの自然な合流点 |
| `DockerTlcSpawnPlanner.snapshotEnvironment` | `tlc-spawn-planner.ts:415` → `inspectDocker` `:193` → `inspectImage` `:246-265` | docker CLI 実在 + `docker image inspect` | 代替経路の可用性判定（デーモン独立検査なし） |
| `DARWIN_INSPECTION_PLAN` / `DOCKER_INSPECTION_PLAN` | `tlc-spawn-planner.ts:46-52` / `:54-60` | 同じ 5 `EnvInspectionId` を持つ平行構造 | plan の取り違えが receipt の不整合になる |
| `FIXED_JDK_RUN_PROFILE` | `tlc-toolchain.ts:90-92` | JDK ピンのデータ正本（`OpenJDK` / `26.0.1`） | ピン 6 面のうち A |
| `JdkDistributionManifest` | `tlc-toolchain.ts:709-710` | **型レベルのリテラル固定**（`"OpenJDK"` / `"26.0.1"`） | ピン 6 面のうち C。version を緩めるなら型から |
| `#verifyJavaVersion` | `fs-tlc-toolchain.ts:1331` | distribution snapshot 経路の同一正規表現 | ピン 6 面のうち E。planner 側と独立に走る |

`selectTlcSpawnPlanner` の production 呼出は 2 件 — `run-model-check-execution.ts:225-234`（platform を DI）と `tla-referee-toolchain.ts:224-228`（**platform を注入せず既定 `process.platform`**）。テスト seam が経路間で非対称である。

## ライフサイクル進行ガードの構成要素棚卸し（260813-lifecycle-guard-runtime、履歴、observed `89532174c`。**#2986 着地前の断面**。着地後の registry 構成は上の 260814 節）

**観測 ref**: すべて observed = `89532174c30ef9cc7ff29496cd6916586fdda00a`。差分 base = `854692fd7a11b124236b0427fe3d59e2fe6bf785`（35 commits / 233 files、うち `packages/framework/core/tools` は 9 files / +680 −105）。**G 番号付きの全数棚卸し（G1〜G40）と検索述語 P1〜P13 は `re-scans/260813-lifecycle-guard-runtime.md` を正本とする**。本節は checkpoint 群ごとの component だけを掲げる。

分類凡例 — **built-in**: フレームワーク不変条件 / **policy**: ユーザ設定・intent 属性依存 / **off-switch**: 環境変数による無効化面。パスの prefix は `packages/framework/core/tools/`（G40 のみ `packages/framework/core/hooks/`）。

### C1. Intent 生成前（`handleIntentBirth` `amadeus-utility.ts:4387`）

| コンポーネント | 位置 | 責務 | 種別 |
| --- | --- | --- | --- |
| `scanWorkspaceOrRefuse`（G1） | `amadeus-utility.ts:4097` | workspace 分類が `inconclusive` なら `refuseWithoutAudit` = mutation 前に exit | built-in |
| `isReservedHelpRecordName`（G2） | `amadeus-utility.ts:4415` | 予約名の intent 生成を拒否 | built-in |
| `birthAutonomyOrDie`（G3） | 呼出 `amadeus-utility.ts:4410`、定義 `:4362` | autonomy フラグの妥当性 | policy |
| `resolveBirthRepoSet`（G4） | `amadeus-utility.ts:4428`（try/catch → `die`） | repo 集合の解決 | built-in |

**集約点なし** — 4 ガードが birth ハンドラ内に直列に置かれている。

### C2. Stage 完了（**集約済み**）

| コンポーネント | 位置 | 責務 | 種別 |
| --- | --- | --- | --- |
| `verifyStageCompletionGuards`（G5） | `amadeus-state.ts:2539` | 完了 chokepoint。呼出 `:2763` advance / `:2877` finalize / `:3054` complete-workflow / `:3998` approve | built-in |
| `verifyStageArtifacts`（G6） | `amadeus-state.ts:2460` | 成果物の存在 | built-in + off-switch |
| `verifyBlockingSensors`（G7） | `amadeus-state.ts:1835` | blocking sensor verdict の消費（fail-closed） | built-in + off-switch + policy |
| `evaluateBlockingSensors` / `blockingSensorIdsForStage`（G8） | `amadeus-state.ts:1752` / `:1824` | `sensors_applicable` からの宣言駆動な適用解決。純関数 | built-in |
| sensor verdict 真理値表（G9） | `amadeus-sensor.ts:19-31` | 実行結果 → verdict。**異常は PASSED（fail-open）** | built-in |

> **引用の訂正（2026-08-14、intent `260814-failopen-error-paths`、observed `cd64486a68c6a1144db50fbe3fde8273f5e18455`）**: G7 行の `verifyBlockingSensors` / `amadeus-state.ts:1835` と G8 行の `:1752` / `:1824` は observed `89532174c` 断面の記録。**現行断面に `verifyBlockingSensors` の定義も呼出も存在しない**（#2986 の Guard Runtime 移行で置換。`git grep -n "verifyBlockingSensors" -- packages/` は exit 0 / **1 hit** だが、それは `amadeus-sensor-schema.ts:21` の散文コメント内の stale な言及であり定義・呼出ではない）。現行の対応面は Guard adapter `evaluateBlockingSensorGuard`（`amadeus-state.ts:2023-2068`、registry 結線 `:347`）/ decision core `evaluateBlockingSensors`（`:1932-1995`）/ `blockingSensorIdsForStage`（`:2004-2013`）/ off-switch `blockingSensorGuardDisabled`（`:1997-1999`）、fail-closed 宣言文字列は `:2052`。**G9（真理値表の fail-open）は observed `cd64486a6` でも未解消**であり、その全数マップは `code-quality-assessment.md` の 260814-failopen-error-paths 節（Q-1）が正本。履歴節の本文は当時の記録として保存する。
| unit レビュー未了拒否（G10） | `amadeus-state.ts`（`"Refusing to complete ... unit(s) produced"`） | code-producing stage の unit ゲート | built-in |

### C3. Phase 境界

| コンポーネント | 位置 | 責務 | 種別 |
| --- | --- | --- | --- |
| `verifyPhaseCheckArtifact`（G11） | `amadeus-state.ts:392`（export、コメント `:384-391`） | phase-check artifact の存在検査。不在なら `error()` で exit（fail-closed）。`amadeus-jump.ts` へ export | built-in + off-switch |
| 呼出 5 箇所 | `amadeus-state.ts:2775` / `:2926` / `:3059` / `:4009` + `amadeus-jump.ts:581` | advance / finalize / complete-workflow / approve / 前進 jump | — |

**jump は第 5 の権威ある遷移**だが `verifyStageCompletionGuards` は通さない（`[S]` / `pending` 化であり完了ではないため、設計上正しい非対称）。

### C4. Workflow 完了（`completeWorkflowForTarget` `amadeus-state.ts:2963`）

| コンポーネント | 位置 | 責務 | 種別 |
| --- | --- | --- | --- |
| `verifyPreparedWorkflowCompletion`（G13） | `amadeus-state.ts:6011` → 呼出 `:3002` | 完了準備の一貫性 | built-in |
| `verifyMandatoryPluginStages`（G14） | `amadeus-state.ts:4689` → 呼出 `:3008` | 必須 plugin stage の完了 | policy |
| `authorizeWorkflowCompletion`（G15） | `amadeus-workflow-completion.ts:161` → 呼出 `amadeus-state.ts:3030` / `amadeus-orchestrate.ts:613` | Goal receipt 照合。settled / not-settled / 拒否の 3 値 | built-in |
| record 解決ガード（G16） | `amadeus-state.ts:3010-3013` | 未解決 record を「待機」でなく「拒否」へ倒す | built-in |
| `emitMirrorBoundaryIfNeeded`（G17） | `amadeus-orchestrate.ts:591` → 呼出 `:673` / `:3427` / `:5682` / `:6179` | mirror boundary receipt。`MirrorBoundaryOutcome`（`amadeus-mirror-coordinator.ts:71`）を boolean へ潰す | policy |

**集約点なし** — 5 ガードが完了ハンドラ内に直列に置かれている。

### C5. Autonomy 裁定

| コンポーネント | 位置 | 種別 |
| --- | --- | --- |
| `authorizeProductionOccurrence` / `emitAuthorizationRefusal`（G18） | `amadeus-intent-autonomy-production.ts:309` / `:291` | policy |
| `resolveDeclarationProvenance`（G19） | `amadeus-intent-autonomy-production.ts:487`（`:744` returns） | built-in |
| `grantScope` / `semiAuthorityScope`（G20） | `amadeus-intent-autonomy-production.ts:507` / `:532` | policy |
| `commitProductionStageGateDecision`（G21） | `amadeus-intent-autonomy-production.ts:794` | policy |
| **`admitProductionStageFailure`（G22 ★）** | `amadeus-intent-autonomy-production.ts:1102`、出口 `stageFailureDirective` `amadeus-orchestrate.ts:5779`（emit `:5816`） | policy |
| `InteractionKind` / `StopReason`（G23） | `amadeus-intent-autonomy.ts:14-15` | policy |
| `allowedInteractionKinds`（G24、**G23 と重複定義**） | `amadeus-autonomy-review.ts:1070` | policy |

★ **G22 は base（`854692fd7`）以後に着地した新規コンポーネント**（`16d94927d` / #2945）。full autonomy の型付き stage failure を Quality Repair / REPAIR_STALLED へ接続する。

### C6. Human presence / delegation

| コンポーネント | 位置 | 種別 |
| --- | --- | --- |
| approve/reject gate presence（G25） | `amadeus-state.ts:3452` | built-in + policy（autonomy 免除が文言に埋込） |
| delegate-approval presence（G26） | `amadeus-state.ts:4306` | built-in |
| delegate-rejection presence（G27） | `amadeus-state.ts:4395` | built-in |
| `humanPresenceGuardDisabled`（G28、共有 off-switch） | `amadeus-lib.ts:5342` | off-switch |
| question 応答記録 presence（G29） | `amadeus-log.ts:280` | built-in |

### C7. その他のライフサイクル遷移

| コンポーネント | 位置 | 種別 |
| --- | --- | --- |
| park 拒否（G30、**Stop hook に二重実装**） | `amadeus-state.ts:1399`（コメント `:1390-1398`） | policy |
| gate-start ruling 参照検査（G31） | `amadeus-state.ts:3362` / `:3365` | built-in |
| declare-docs-only 群（G32、拒否文言 ×5） | `amadeus-state.ts` | built-in |
| declare-units-done（G33、**exit せず `{ok:false, reason}` を返す**） | `amadeus-lib.ts`（×2） | built-in |
| audit 捏造防止（G34、×3） | `amadeus-audit.ts` | built-in |
| swarm retry 可否（G35、`classifyRetry`） | `amadeus-swarm.ts:763` `:784` `:798` `:813` `:852` `:854` | policy |
| swarm 収束（G36） | `amadeus-swarm.ts:236` | policy |
| Bolt batch gate（G37） | `amadeus-bolt.ts:1197-1214` | policy |
| `IntentOperationGuardResult`（G38、**`recovery` を型に持つ**） | `amadeus-lib.ts:3042` / `:3085` | built-in |
| `RecomposeGuardResult` / `AdvisoryHoldVerdict` / `AdvisoryChoiceGuardResult`（G39） | `amadeus-lib.ts:554` / `amadeus-advisory-choice.ts:127` / `:152` | policy |
| subagent 起動 deny（G40、**CLI 層の外**） | `packages/framework/core/hooks/amadeus-subagent-model-guard.ts:89` | hook 層 |

### Runtime 化の reuse 候補（inception ノルムの reuse inventory 入力）

1. **G7 / G8** — 宣言駆動の適用解決（`sensors_applicable`）+ 監査受領証 + fail-closed。「どのガードがどの stage に適用されるか」を手書きリストでなく宣言から導く既存機構。
2. **G38** — `{kind:"allowed"} | {kind:"rejected", error:{..., recovery}}`。Issue #2771 が求める「復旧案付き」判定語彙をすでに実装している。

## coverage patch gate の構成要素棚卸し（260811-allowlist-semantic-audit、履歴、observed `854692fd7`）

**観測 ref**: すべて observed = `854692fd7a11b124236b0427fe3d59e2fe6bf785`。差分 base = `ce3c3ccfdb3f93e619a081386a70c8185b84f1db`（34 commits、ゲート実装は区間内無変更）。正本は `re-scans/260811-allowlist-semantic-audit.md`。

### `tests/coverage-patch-gate.ts` の公開面（`grep -n "^export "` の全 16 件）

| 行 | シンボル | 種別 | `reason` を受け取るか |
|---|---|---|---|
| `:68` | `parseLcovLineHits` | 関数 | — |
| `:109` | `parseDiffAddedLines` | 関数 | — |
| `:155` | `SemanticSelector` | interface | — |
| `:162` | `ResolvedLineRange` | interface | — |
| `:237` | `createSemanticSelector` | 関数 | — |
| `:288` | `resolveSemanticSelector` | 関数 | **否**（`file` / `source` / `selector`） |
| `:318` | `AllowlistEntry` | interface | 型として保持 |
| `:325` | `ResolvedAllowlistEntry` | interface | 型として保持 |
| `:360` | `parseAllowlist` | 関数 | 非空検査のみ |
| `:384` | `resolveAllowlistEntries` | 関数 | 素通し |
| `:407` | `findStaleAllowlistEntries` | 関数 | **否**（`entries` / `lcov`） |
| `:431` | `PatchGateResult` | interface | — |
| `:438` | `evaluatePatch` | 関数 | **否**（`added` / `lcov` / `allowlist`） |
| `:463` | `renderSummary` | 関数 | — |
| `:481` | `runCheck` | 関数 | — |
| `:571` | `main` | 関数 | — |

**`reason` を判定に用いる公開関数は 0 件。** 非公開の `allowlisted`（`:421-426`）も `file` / `start` / `end` のみを見る。

### 台帳 `tests/.coverage-patch-allowlist.json` のデータ形状

| フィールド | 型 | 検査 |
|---|---|---|
| `file` | string | `join(repoRoot, entry.file)` で読取、LCOV の `SF:` と突合 |
| `selector.function` | string | AST スコープ名。トップレベルは `<module>`（`:190`）。クラスメンバは `Class.member` 形 |
| `selector.fingerprint` | string | `sha256:` + アンカー窓の sha256（`sourceFingerprint` `:181-183`） |
| `selector.anchorLines` | number | アンカー窓の行数。1 が最多（233 件 = 37%） |
| `selector.targetLines` | string | アンカー窓**内の相対**範囲。絶対化は `:312` |
| `reason` | string | **非空のみ**。内容は無検査 |
| `expiry` | string?（597 件が保持） | string 型のみ検査 |

### 台帳が張る対象コンポーネント（上位 10、`jq` の group_by 出力からの転記）

| 件数 | ファイル |
|---|---|
| 63 | `packages/framework/core/tools/amadeus-orchestrate.ts` |
| 61 | `packages/framework/core/tools/amadeus-state.ts` |
| 19 | `packages/framework/core/tools/amadeus-quality-repair-runtime.ts` |
| 18 | `packages/framework/core/tools/amadeus-advisory-choice.ts` |
| 18 | `packages/framework/core/tools/amadeus-intent-completion.ts` |
| 18 | `packages/framework/core/tools/amadeus-utility.ts` |
| 17 | `packages/framework/core/tools/amadeus-intent-autonomy-runtime.ts` |
| 16 | `packages/framework/core/tools/amadeus-process-runner.ts` |
| 16 | `packages/framework/core/tools/amadeus-quality-repair.ts` |
| 16 | `scripts/pi-live-rpc.ts` |

### 転位が確定したコンポーネント（18 件の分布）

| ファイル | 確定転位数 | 該当エントリの解決先 |
|---|---|---|
| `packages/framework/core/tools/amadeus-state.ts` | 6 | `:916` / `:925-940` / `:961-964` / `:1070` / `:5683` / `:5736-5739` |
| `packages/framework/core/tools/amadeus-orchestrate.ts` | 3 | `:944-951` / `:1707` / `:6189-6190` |
| `packages/framework/core/tools/amadeus-graph.ts` | 2 | `:1711-1716` / `:1715-1720` |
| `packages/framework/core/tools/amadeus-mirror-executor.ts` | 2 | `:1471-1475` / `:1480-1484` |
| `packages/framework/core/tools/amadeus-election.ts` | 1 | `:417` |
| `packages/framework/core/tools/amadeus-runtime.ts` | 1 | `:878` |
| `packages/framework/core/tools/amadeus-learnings.ts` | 1 | `:902-904` |
| `packages/framework/core/tools/amadeus-utility.ts` | 1 | `:820-822` |
| `plugins/formal-model-check/tools/tla-arm.ts` | 1 | `:199` |

各エントリの `reason` と真の対象所在は `re-scans/260811-allowlist-semantic-audit.md` §4 が正本。**全数照合は未実施のため本表は下限**。

### 契約を固定しているテスト

| ファイル | 固定している allowlist 契約 |
|---|---|
| `tests/unit/t229-coverage-patch-gate.test.ts` | 旧行ピンの拒否（`:176`）、指紋の行シフト耐性（`:182`）、指紋窓の拡張（`:197`）、解決の fail-closed（`:283`）、ソース不在の fail-closed（`:308`）、`reason` 非空（`:315`）、`targetLines` 形式（`:321`）、契約外セレクタフィールド（`:329`）、`expiry` 型（`:337`）、stale 範囲検出（`:343`） |
| `tests/integration/t229-coverage-patch-gate-check.test.ts` | プロセス境界での `--check` 挙動 |

**`reason` の内容を検査するテストは両ファイルに 0 件。**

## TLA+ receipt 生成・検証コンポーネント（260812-tla-proof-receipt、履歴、observed `854692fd7`）

**観測 ref**: 本節の file:line はすべて observed = `854692fd7a11b124236b0427fe3d59e2fe6bf785`（= 本 worktree HEAD）時点。差分 base = `ce3c3ccfdb3f93e619a081386a70c8185b84f1db`（距離 34）。正本は `re-scans/260812-tla-proof-receipt.md`。パスはすべて `plugins/formal-model-check/tools/` 配下（テストを除く）。

### receipt の生成器・検証器・消費者

| 構成要素 | file:line | 役割 |
|---|---|---|
| `createVerifiedTlaModelReceipt` | `tla-model-receipt.ts:89-130` | receipt 構築。**identity を再計算せず `source.moduleIdentity` / `source.cfgIdentity` / `source.auxIdentities` をコピー**（`:104-112`）し、`identityInput` 全体を `:124-127` でハッシュする |
| `validateVerifiedTlaModelReceipt` | `tla-model-receipt.ts:142` | 検証器。基準値を loader から作る（`:154` / `:156` / `:158`）。identity 比較は `:161-169`、拒否文言は `:169` `"receipt differs from the selected verified model"` |
| `validateModelCheckReceipt` | `tla-model-receipt.ts:184`（`:187` で verified 分岐へ委譲） | union のディスパッチャ |
| `sourceIdentityOf`（referee） | `tla-referee-toolchain.ts:46-48` | referee 側の identity 生成。**object 形式** `{ bytes: <base64> }` |
| receipt 生成（referee） | `tla-referee-toolchain.ts:158` | ディスク上のバイト列から receipt を作る（未登録モデル） |
| identity 生成（loader） | `tla-model-loader-internal.ts:279` | **デコード済み文字列**形式 |
| `readVerifiedSourceBytes` | `fs-tlc-toolchain.ts:702`、identity 照合 `:731`、呼び出し `:1645` / `:1651` / `:1777` | ステージング時のバイト照合。**文字列形式**で比較 |
| `verifyPlannedModelSources` | `fs-tlc-toolchain.ts:1635`、検証呼び出し `:1641`、中断 `:1643` | 準備段の消費者 |
| `parseTlcOutput174` | `tlc-toolchain.ts:647` | 出力解析段の消費者（現状は準備段で止まるため未到達） |
| `loadVerifiedTlaSourcesInternal` | `tla-model-loader-internal.ts:463`（方針コメント `:461-462`、root 解決 `findRepositoryRoot` `:151-168`） | test 専用 seam。root 選択の**能力はある**が本番利用は方針で禁止 |

### loader 消費者の DI seam 有無 — 非対称は 1 箇所のみ

| 消費者 | seam | file:line |
|---|---|---|
| `run-model-check-ci.ts` | **あり** — `loadSources` / `selectModel` フィールド（既定値つき） | `:19-20` `readonly loadSources: typeof loadVerifiedTlaSources;` / `:28-29` |
| `run-model-check-diagnostic.ts` | **あり** — 同形 | `:326-327` / `:333-334` |
| `run-model-check-source.ts` | **あり** — `loadVerifiedSources?` 任意依存、`:128` `(dependencies.loadVerifiedSources ?? loadVerifiedTlaSources)()` | `:40` / `:128` |
| `run-skeleton-ci.ts` | なし（ただし検証器ではなく最上位 CI スクリプト） | `:66` / `:70` |
| **`tla-model-receipt.ts`** | **なし — モジュール束縛の直接呼び出し** | **`:154` / `:156`** |

seam のパターンは兄弟ファイルに 3 例すでに存在し、必要な 1 箇所にだけ無い（`cid:requirements-analysis:symmetric-pair-review` の形）。

### `ModelCheckReceipt` の生産側（本番 2 箇所）

- `tla-referee-toolchain.ts:158` — referee がディスク上のバイト列から生成（#2913 の患部）
- `run-model-check-source.ts:96` `const verified = createVerifiedTlaModelReceipt(source);` — loader 由来のソースから生成（非対称なし）

## PR 収束プラグインのコンポーネント棚卸し（260811-pr-convergence-gate、履歴、observed `854692fd7`）

### Repository-Level Components

| コンポーネント | 責務 | 主な依存 | Health |
|---|---|---|---|
| Framework Core | lifecycle、graph、state、audit、artifact/sensor guard | Bun、filesystem | at-risk |
| Harness Adapters | 8 host 向け filesystem/UI integration | Core、host conventions | healthy |
| Plugin Runtime | compose/drop、stage/tool/sensor projection | Core graph、filesystem | healthy |
| PR Convergence Plugin | PR delivery loop と report | `gh`、GitHub、record | degraded |
| Build/Packaging | deterministic `dist/<harness>` と self promotion | Bun、manifest | healthy |
| Test System | smoke/unit/integration/e2e/conformance | Bun test、fixtures | at-risk |
| Workflow Record Store | Intent state、audit、artifacts、CodeKB | Markdown/JSON filesystem | healthy |

### PR Convergence Components

| コンポーネント | 責務 | 依存 | Health / 根拠 |
|---|---|---|---|
| Host activation/config | plugin 有効化、4 self-* binding | `amadeus/config.json` | healthy — 配線済み |
| Scope binding compiler | binding を stock/composed grid に加算 | config、plugin stage metadata | healthy — 非 self opt-in を保持 |
| Plugin manifest | stage/tool と code-generation produces seam の宣言 | plugin composer | healthy |
| Plugin stage contract | convergence loop、manual sensor fire、merge 非権限 | CLI、sensor | degraded — own produces/requires/sensors が空 |
| CLI dispatcher | `create/status/report/override` | adapter、predicate、ledger | at-risk — local delivery precondition 不在 |
| GitHub runner | auth probe、GraphQL/PR create boundary | `gh` CLI | healthy |
| Lifecycle/predicate | active/merged と convergence 判定 | raw PR state | healthy |
| Review ledger | all-page thread classification | GitHub GraphQL | healthy |
| PR provenance checker | Intent/Bolt/Unit と title/body の一致 | record registry、snapshot | healthy |
| Presentation renderer | canonical linked PR title/body | intent reference | healthy |
| Report renderer/writer | canonical Markdown の生成 | convergence facts、filesystem | degraded — attestation 不在 |
| Report format sensor | required field と自己矛盾の検査 | report filesystem | degraded — shape-only/advisory |
| Orchestrator coverage | per-unit required produces の全件存在 | compiled graph、filesystem | healthy on normal engine path |
| State artifact guard | direct transition の evidence check | compiled graph、filesystem | degraded — any-one artifact semantics |
| Blocking sensor guard | blocking sensor の fired/passed 要求 | graph severity、audit | healthy generic mechanism、未配線 |

### Ownership Gaps

- CLI execution receipt の発行 owner がない。
- report content digest と audit identity の binding owner がない。
- receipt/digest の completion-time verification owner がない。
- local branch/commit/push/head SHA precondition の検査 owner がない。
- pr-convergence stage と code-generation overlay の間で report lifecycle owner が分散している。

## テスト時間制御コンポーネント（260810-test-time-factor、履歴、observed `ce3c3ccfd`）

| コンポーネント | 責務 | 係数対応状況 |
|---|---|---|
| run-tests argument parser | suite/perf/coverage/test timeout 引数の解決 | 固定値のみ |
| run-tests scheduler | file 分類、並列実行、Bun child 起動 | 係数未使用 |
| GitHub Actions workflows | CI、coverage、PBT、release の実行 | 係数未注入 |
| TUI/IDE test drivers | 外部 UI の poll、settle、deadline | 固定値 |
| test fixtures/perf suites | timeout 発火や wall-clock 上限の検証 | 意味保持のため対象外候補 |

追加候補 `tests/lib/test-time-factor.ts` は環境値の parse と基準時間の scale だけを担い、scheduler や個別 driver のドメイン判定は持たない小さな共通モジュールが妥当である。

## advisory 宣言消費と plugin 供給経路の構成要素（260810-plugin-manifest-resoluti、履歴、observed `7b9391be2`）

**観測 ref**: すべて observed = `7b9391be2db4fad791d637293ea442d5a1462bac`（= repo HEAD）。差分 base = `df1c874cfb397fafe877a72f00a82664a59689ae`（**13 commits / 302 files**、**PR #2811 を含む** — 直下の履歴節の `amadeus-plugin.ts` 系行番号は陳腐化しており、本節で取り直す）。正本は `re-scans/260810-plugin-manifest-resoluti.md`。

### advisory 宣言の消費者側コンポーネント（Issue #2823 の患部）

| 構成要素 | file:line | 役割 |
|---|---|---|
| `pluginManifestPath` | `packages/framework/core/tools/amadeus-advisory-declaration.ts:295-297` | 宣言の唯一の解決規則: `<projectRoot>/plugins/<name>/plugin.json`。doc comment `:289-294` は authoring レイアウト前提を明言 |
| `declaredAdvisoriesForPlugin` | `amadeus-advisory-declaration.ts:305-329` | checkpoint 発火。`:312-313` manifest 不在 → **無音 `return []`** |
| `declarationFor` | `amadeus-advisory-declaration.ts:386-400` | `:393` / `:397-399` で無音 null |
| `declaredFormalCheckArgv` / `declaredHandoffStage` | `amadeus-advisory-declaration.ts:403-410` / `:413-420` | null をそのまま伝播（silent-null degradation） |
| `spawnEvaluator` | `amadeus-advisory-declaration.ts:347-357` | `cwd: projectRoot`・shell なし spawn。timeout 60s / 8MiB、失敗は unreadable verdict → hold（fail-closed） |
| `advisoriesForHost` | `amadeus-advisory-declaration.ts:366-383` | activation 判定 + composed plugins の宣言を flatMap |
| `verdictSummary` / `advisoryFromEvaluatorRun` | `amadeus-advisory-declaration.ts:214-232` / `:241-257` | verdict が権威。no-hold 以外は raise |
| `projectRootForHost` | `amadeus-plugin-activation.ts:110-112` | hostRoot（harness ディレクトリ）の親 = projectRoot |
| `declaredFormalCheckRoute` | `amadeus-advisory-choice.ts:948-978` | run-now ルートを宣言 argv から構築（トークン解決 `:962-967`） |
| `directiveItemFor` | `amadeus-advisory-choice.ts:729-741` | handoff_stage を宣言から載せる（null なら素の item） |
| `DECLARED_RELEASE_RULE` | `amadeus-advisory-choice.ts:980-986` | formalCheck:null は engine 側 release 経路なし |
| engine 側双子 argv | `amadeus-advisory-choice.ts:925` | hard-coded `"bun", "plugins/formal-model-check/tools/run-model-check.ts"` — repo ルート相対、宣言 argv `:61` と同根 |
| 宣言の出荷形 | `plugins/formal-model-check/plugin.json:50-71` | `advisories` キーはこの 1 plugin のみ（全 2 plugin 中）。機械的 root-relative argv は `:61` の 1 本 |

### 供給側コンポーネント（PR #2811 後の行番号で取り直し）

| 構成要素 | file:line | 役割 |
|---|---|---|
| `PLUGIN_SOURCE_DIR_NAME` / `pluginSourceRootOf` | `amadeus-plugin.ts:563` / `:570-572` | staging root `.amadeus-plugin-src` |
| `PLUGIN_AUTHORING_DIR_NAME` | `amadeus-plugin.ts:578` | 権威ディレクトリ名 `plugins` |
| `stagingHarnessDirOf` / `seedBytesForHarness` | `amadeus-plugin.ts:659-664` / `:669-675` | **#2811 で新設**。staging 宛てコピー時に `{{HARNESS_DIR}}` を解決（authoring 宛ては除外）。`rulesSubdirFor` は `amadeus-harness.ts:71` |
| `copyPluginSource` / `copyRealFiles` | `amadeus-plugin.ts:702-741` | tmp+rename swap。`copyRealFiles` は `harnessDir` 非 null なら散文を解決しつつコピー |
| `collectPluginSources` / `seedStaging` | `amadeus-plugin.ts:874-906` | repo ルート `plugins/` 優先 → 各ツリー staging。seed は absent のみ |
| `prepareInstall` / `handleInstall` | `amadeus-plugin.ts:1102-1129` / `:1154-1174` | `:1117-1118` `persistentInstall = selected.projectDir !== hostRoot`、`:1160` で **FULL bundle を `<projectRoot>/plugins/<name>/` へ永続化**（project supply） |
| tools/stages push | `amadeus-plugin-compose.ts:370-415` | 生バイトを `posix.join("plugins", pluginName, rel)` へ（`:386` / `:412`） |
| `ownedPaths` | `amadeus-plugin-compose.ts:895` | compose が manifest から集めるのは stages/tools のみ — **plugin.json は配送されない** |
| `composeWriteSet` | `amadeus-plugin-compose.ts:1390-1408` | hostWrites は stage/tool/shared コピーのみ |
| `ownedRecordDigests` / `pluginContentDigest` | `amadeus-plugin-compose.ts:921-972` | manifest の stages/tools のバイトを sha256 |
| `installDoc` | `scripts/plugin-projection.ts:613-664` | `:634` folder-drop（primary、project supply を作らない）/ `:636` install verb 言及（persistent 腕の project supply 永続化は**未開示**） |
| `transform` / `isMarkdownProsePath` | `scripts/harness-transform.ts:33-45` / `:27-29` | 拡張子のみで分岐。`.json` / `.ts` は逐語 — manifest は経路Aでも変換されない |

### 検証面コンポーネント

| テスト | 位置 | 何を pin するか |
|---|---|---|
| t445-advisory-declaration-supply | `:155-160` / `:224-226` | 無音 fail-open を**契約として** pin / dogfood レイアウトで宣言供給 |
| t526 / t528 | `:59-61` / `:103-105` | 同じく dogfood レイアウト（`<projectDir>/plugins/demo/plugin.json` 手書き） |
| t353-plugin-install-verb | `:254-274` / `:276-324` | persistentInstall=true の 4 面永続化と rollback。**advisory 消費との join は未 pin** |
| t340-plugin-drop-fs-restore | `:196` / `:220` / `:240` | project supply を `cpSync` で手作り |
| t531-plugin-harness-literal-guard | 新設（#2811） | plugin **散文**のハーネスリテラル走査。manifest argv は対象外 |

consumer レイアウト（staging のみで project supply なし）を組むテストは **0 件**。

## seed 置換器と rename データ源の構成要素棚卸し（260810-plugin-prose-seed-guard、履歴、observed `c51afbd0a`）

**観測 ref**: すべて observed = `c51afbd0a99b2eb3f0b9c1ee4e2cef2772378131`。差分 base = `df1c874cfb397fafe877a72f00a82664a59689ae`（8 コミット、非 record 面 16 files / +721 / -101）。正本は `re-scans/260810-plugin-prose-seed-guard.md`。構造的含意は `architecture.md` の同 intent 節。

### PR #2811（`c51afbd0a`）が新設した構成要素

| 構成要素 | file:line | 役割 |
|---|---|---|
| `rulesSubdirFor(dir)` | `packages/framework/core/tools/amadeus-harness.ts:71-73` | `KNOWN_RULES_SUBDIR[dir] ?? "rules"`。**明示指定されたハーネス**の rename を返す（`rulesSubdir()` は ambient 用） |
| `KNOWN_RULES_SUBDIR` | 同 `:59-65` | **5 キー**（`.claude` / `.kiro` / `.codex` / `.kimi-code` / `.pi`）。`.opencode` / `.cursor` は不在 |
| `HARNESS_TOKEN`（core 側） | `amadeus-plugin.ts:653` | `/\{\{HARNESS_DIR\}\}/g`。`scripts/harness-transform.ts:11` と**別実体**（core は `scripts/` を import できない） |
| `stagingHarnessDirOf(dst)` | `amadeus-plugin.ts:659-664` | 書き出し先が `<harnessTree>/.amadeus-plugin-src/<name>` のときのみハーネス dir、authoring 宛は `null` |
| `seedBytesForHarness(relPath, bytes, harnessDir)` | `amadeus-plugin.ts:669-675` | 経路B の置換器。prose ゲート `:671`、rename `:672`、token `:673` |
| `stagingEntryState(dst, src)` | `amadeus-plugin.ts:681-692` | staging の drift 判定を **seed 適用後のソース**と比較（`:689`）— 恒久 drift の回避 |
| seed 適用点 | `amadeus-plugin.ts:738` | `copyRealFiles` の `writeFileSync` |
| `harnessNames` / `harnessDirOf` / `allHarnessDirs` / `foreignHarnessDirs` | `tests/helpers/harness-dir-fixture.ts:15/21/28/34` | manifest 由来のハーネス事実供給。**`rulesRename` を返すヘルパーは未実装** |
| `scanPluginProseForHarnessLiterals` | `tests/lib/boundary-guard.ts:205-210` | predicate 3。`HARNESS_LITERAL_TOKEN_RE`（`:122`）を plugin 散文へ適用 |

### rename のデータ源 — 2 面 3 消費点

| 消費点 | file:line | データ源 | descriptor を見るか |
|---|---|---|---|
| `transform()` の rename | `scripts/harness-transform.ts:22-24`（引数 `:37`） | **harness manifest の `rulesRename`** | — （呼び出し元が manifest から渡す） |
| `seedBytesForHarness` の rename | `amadeus-plugin.ts:672` → `rulesSubdirFor` | `KNOWN_RULES_SUBDIR` | 見ない |
| `rulesSubdir()` env 分岐 | `amadeus-harness.ts:194` | `KNOWN_RULES_SUBDIR` | **見ない**（両レビュー未指摘） |
| `rulesSubdir()` fallback | `amadeus-harness.ts:196` | `shippedRulesSubdir() ?? KNOWN_RULES_SUBDIR` | descriptor 優先 |

manifest 実測 8 面（`harnessDir` / `rulesRename` 行）: claude `.claude` `null`(:112) / codex `.codex` `"amadeus-rules"`(:74) / **cursor `.cursor` `"amadeus-rules"`(:74)** / kimi `.kimi-code` `null`(:109) / kiro `.kiro` `"steering"`(:91) / kiro-ide `.kiro` `"steering"`(:111) / **opencode `.opencode` `"amadeus-rules"`(:76)** / pi `.pi` `null`(:114)。**8 manifest → distinct `(harnessDir, rulesRename)` ペアは 7**、うち 2 面が `KNOWN_RULES_SUBDIR` と乖離。

### 4 系統の rename 実装（emit 層 — `transform()` とは別面）

| 系統 | file:line | 形 |
|---|---|---|
| codex emit | `packages/framework/harness/codex/emit.ts:227-228` | `substituteToken(s).replaceAll(".codex/rules/", ".codex/amadeus-rules/")` |
| codex emit（否定先読み） | 同 `:245` | `s.replace(/\.codex\/rules\/(?!default\.rules)/g, ".codex/amadeus-rules/")` — **例外規則は他 3 系統に不在** |
| opencode emit | `packages/framework/harness/opencode/emit.ts:160-161` | `substituteToken(s).replaceAll(\`${harnessDir}/rules/\`, \`${harnessDir}/amadeus-rules/\`)` |
| cursor emit | — | **hardcode なし**（`git grep -nE 'amadeus-rules' "${S}" -- packages/framework/harness/cursor/` → **6 hits = manifest 5 行（`:3` / `:11` / `:33` / `:44` / `:74`）+ `emit.ts:3` のコメント 1 行**。実行コードのヒットは 0。scan の「manifest 6 行」は内訳誤りで Architect 独立再実測により訂正） |

emit 層は core ソース由来 prose の**生成器**であり、`transform()` / `seedBytesForHarness` の経路とは別面。実装時の評価対象として棚卸ししておく。

### 患部ファイルの棚卸し（#2810、11 行）

| ファイル | 行 | 件数 |
|---|---|---|
| `plugins/pr-convergence/stages/pr-convergence.md` | 54, 80, 162, 214 | 4 |
| `plugins/formal-model-check/stages/formal-model-check.md` | 48 | 1 |
| `plugins/formal-model-check/stages/tla-authoring.md` | 65, 68, 110, 113, 116 | 5 |
| `plugins/formal-model-check/README.md` | 111 | 1 |

スコープ隣接（要件段で採否裁定）: `formal-model-check.md:12`（frontmatter `inputs:` の説明参照）、`README.md:101`（自ファイルへの自己ポインタ）。トークンが届かない面: `plugin.json:61`（**#2823** へ分離）、`node-ci-model-check-port.ts:223`、`run-skeleton-ci.ts:19` / `:60`。

## plugin 配布経路の構成要素棚卸し（260810-plugin-harness-dir-token、履歴、2026-08-10、observed `df1c874cf`）

**観測 ref**: すべて observed = `df1c874cfb397fafe877a72f00a82664a59689ae`（= repo HEAD = `origin/main`）。差分 base = `91f37ec8589cdf468599b4787e27e5125d4d16e8`（20 commits / 117 files。患部 7 パスは区間の変更集合と**非交差** — `git diff --name-only base..HEAD` を患部語彙で絞って **0 hit**）。正本は `re-scans/260810-plugin-harness-dir-token.md`。構造的含意は `architecture.md` の同 intent 節。

### 経路A — build-time packager

| 構成要素 | file:line | 役割 |
|---|---|---|
| `HARNESS_TOKEN` | `scripts/harness-transform.ts:11` | `/\{\{HARNESS_DIR\}\}/g` |
| `substituteToken` | `harness-transform.ts:14` | トークン置換本体 |
| `applyRulesRename` | `harness-transform.ts:23` | `${harnessDir}/rules/` にアンカー。claude は `rulesRename === null` で no-op |
| `isMarkdownProsePath` | `harness-transform.ts:27` | `.md` / `.md.example` のみ真 |
| `transform` | `harness-transform.ts:33-46` | 拡張子だけで分岐。`.json` / `.ts` / `.snippet` は Buffer 素通し |
| `projectPluginArtifacts` | `scripts/plugin-projection.ts:262-278` | `:274` で `transform` 適用 |
| `pluginHostPrefix` | `plugin-projection.ts:148-150` | 出力を `plugins/<name>` へ名前空間化 |
| `buildPluginBundle` | `plugin-projection.ts:283-293` | 中立バンドル（逐語） |
| `buildPluginProjection` | `plugin-projection.ts:304-307` | — |
| `installArtifacts` | `plugin-projection.ts:670-685` | — |
| `projectPluginForHarness` | `plugin-projection.ts:696-714` | — |
| `buildHarnessTree` | `plugin-projection.ts:718-731` | **呼び出し元はテストのみ** |
| `checkHarnessTree` | `plugin-projection.ts:786-800` | **呼び出し元はテストのみ** |
| `installDoc` | `plugin-projection.ts:620-664` | 消費者への導入手順。**repo ルート `plugins/` を作る指示は無い** |
| `projectInTemporaryWorkspace` | `plugin-projection.ts:1019-1067` | `:1025` dist コピー / `:1031` `plugins/` を逐語 `cpSync` / `:1035` compose を spawn |
| `buildSelfInstallProjection` | `scripts/promote-self.ts:382` | 上記の呼び出し元 |

`scripts/package.ts` は `pluginBundleExpected` のみを import（`:67`、`:873`）。

### 経路B — runtime compose

| 構成要素 | file:line | 役割 |
|---|---|---|
| `KNOWN_HARNESS_DIRS` import | `packages/framework/core/tools/amadeus-plugin.ts:32` | **置換器ではなく名前列挙**。compose 側の置換器関連ヒットはこれ 1 件のみ |
| `copyPluginSource` | `amadeus-plugin.ts:659-671` | tmp + rename swap |
| `copyRealFiles` | `amadeus-plugin.ts:676-688` | `:686` でバイト逐語コピー、symlink は `:681-684` で skip |
| `collectPluginSources` | `amadeus-plugin.ts:821-838` | repo ルート `plugins/` 優先 → 各ツリーの staging root |
| `PLUGIN_AUTHORING_DIR_NAME` | `amadeus-plugin.ts:578` | 権威ディレクトリ名 |
| `pluginSourceRootOf` | `amadeus-plugin.ts:570-572`（`:563`） | staging root `.amadeus-plugin-src` |
| `seedStaging` | `amadeus-plugin.ts:841-853` | 逐語コピー |
| tools push | `amadeus-plugin-compose.ts:381-386` | 生バイトを `posix.join("plugins", pluginName, rel)` へ |
| stages push | `amadeus-plugin-compose.ts:407-412` | 同上 |
| `pluginContentDigest` / `digestBytes` | `amadeus-plugin-compose.ts:921-972` | manifest の stages/tools の**バイト**を sha256（N-7 の隠れ結合） |
| `resolveHarnessToolsDir` | `amadeus-plugin.ts:368` | 非散文ランタイム経路のハーネス差吸収。吸収範囲は **UNMEASURED** |

### harnessDir 実測（`packages/framework/harness/*/manifest.ts`）

claude `.claude`（:45）/ codex `.codex`（:24）/ cursor `.cursor`（:30）/ kimi `.kimi-code`（:35）/ kiro `.kiro`（:27）/ kiro-ide `.kiro`（:24）/ opencode `.opencode`（:35）/ pi `.pi`（:15）。**8 ハーネス、7 個の相異なるディレクトリ**（`.kiro` 共有）。`amadeus-harness.ts:38-46` `KNOWN_HARNESS_DIRS` と一致。self-install 面は 5（claude / codex / cursor / opencode / kimi）。

### ガード側の構成要素

| 構成要素 | file:line | 現況 |
|---|---|---|
| `CORE` | `tests/unit/t146-core-hygiene.test.ts` | `packages/framework/core` のみ（`plugins/` 非対象） |
| `HARNESS_PATH_RE` | 同上 | `/\.(claude\|kiro\|codex)\//` — 7 ディレクトリ中 3 個のみ（N-5） |
| `isCarvedOut` | 同上 | carve-out ちょうど 2 件 |
| `PLUGIN_SCAN_ROOTS` | `tests/integration/t377-plugin-boundary-guard.integration.test.ts:33-35` | `["plugins"]` — corpus は正しい |
| `scanDistributionTreeForScriptsRefs` | `tests/lib/boundary-guard.ts:152` | `scripts/` トークンのみ照合 — 述語が噛み合わない |
| `SCAN_ROOTS` | `tests/lib/boundary-guard.ts:54-66` | `plugins/` / `dist/kimi` / `dist/pi` / `.kimi-code` / `.pi` を欠く |

### 漏洩している生成物（tracked ではない）

self-install 5 面 × {`plugins/…`, `.amadeus-plugin-src/…`} = **10 ファイル**が同一ブロックを運ぶ（例 `.codex/plugins/pr-convergence/stages/pr-convergence.md:180` が `.claude/tools/` を指す）。`git ls-files` → `dist/` tracked **0**、self-install `plugins/` tracked **0**。**修正が触るのはソースのみ**。

`plugin.json` は composed ツリーへ配送されない（N-9）— `.claude/plugins/pr-convergence/` は `stages/` と `tools/` のみを持つ。

## formal-model-check advisory 供給チェーンの棚卸し（260810-tla-applicability-wiring、履歴、2026-08-10、observed `91f37ec85`）

**観測 ref**: すべて observed = `91f37ec8589cdf468599b4787e27e5125d4d16e8`（= 本 worktree HEAD = `origin/main` 系譜。`cid:reverse-engineering:measurement-ref-in-artifacts`）。行番号はこの断面で解決する。正本は `re-scans/260810-tla-applicability-wiring.md`。

対象は [Issue #2766](https://github.com/amadeus-dlc/amadeus/issues/2766)（TLA+ applicability 判定が常に no-hold）とユーザー裁定 **案A**（接続完成 + FR-005 receipt 閉包）。判別子は「**宣言 → 発火 → 評価 → 解除の鎖のどこが実装済みで、どこに書き手が居ないか**」。結論を先に言えば、**鎖は両端が完成していて中央（subjects の書き手）だけが空**である。

### 供給チェーンのコンポーネントと現況

| 段 | コンポーネント（`packages/framework/core/tools/` ほか） | 現況（observed 実測） |
|---|---|---|
| **宣言 parse** | `amadeus-advisory-declaration.ts` — `parseAdvisoryDeclarations` :110-128 / `parseOne` :90-99 / `declaredAdvisoriesForPlugin` :253-277 | **実装済み・稼働中**。`pluginManifestPath` :243-245 = `<projectRoot>/plugins/<plugin>/plugin.json` が本 repo に実在するため経路は生きている |
| **no-hold の痕跡消失** | 同 :171 逐語 `if (isRecord(verdict) && verdict.kind === "no-hold") return null;` | **#2766 の症状面**。「評価器が走って no-hold」と「そもそも走っていない」が観測上区別できない |
| **checkpoint 発火** | `amadeus-orchestrate.ts` — `ACTIVATION_ADVISORY_STAGES` :1785-1789（`requirements-analysis` / `functional-design` / `build-and-test`）、`emitActivationAdvisory` :1808-1820、`raiseActivationAdvisoriesFor` :1844-1858 | **実装済み・2 call site**。コメント :1796-1803 が両者の乖離を戒める → 供給側に触る変更は**両方を必ず棚卸し** |
| **guard → directive** | `applyPendingAdvisoryGuard` :814-866 → `guardAdvisoryChoices` :819 → `await-advisory-choice`（`run_required` / `formal_checks` は :861-863） | 実装済み |
| **run-now ルート供給** | `amadeus-advisory-choice.ts` — `declaredFormalCheckRoute` :925-955、予約トークン4種 :939-944、`resolveRunRequiredHold` :978-1019、`DECLARED_RELEASE_RULE` :962-963 | **実装済み・テストで両側固定**（`t445-advisory-declaration-supply.integration.test.ts:297-322`）。実 manifest の `formalCheck` を非 null にすれば **engine 変更なしでルートが立つ** |
| **subjects 供給** | `plugins/formal-model-check/tools/tla-authoring.ts` — `defaultSubjectsPath` :453-455、`GovernedSubjects` :457-476、`governedIdentity` :479-496、`advisoryHold` :498-532 | **🔴 書き手が存在しない**。解決先 `amadeus/spaces/default/specs/tla/authoring-subjects.json` は**未作成**（`ls -d` 実測）。`advisoryHold` は ENOENT のみ no-hold（:507-508）で、それ以外は fail-closed |
| **model-map 書込** | `plugins/formal-model-check/tools/tla-registration.ts:265-270`（staging + `renameSync` の atomic replace） | model-map **のみ**を書く。subjects 宣言の書き手はここにも無い |
| **判定表** | `plugins/formal-model-check/tools/tla-applicability.ts` — `judge` :121-138、`ApplicabilityReceipt` :147-157、`buildReceipt` :176-198、`HoldReason` :211-214、`evaluate` :319-352 | 実装済み。終端2経路（:169）は検証済み human approval 必須（:183-185 `approval-missing`） |
| **evidence store** | `amadeus/spaces/default/specs/tla-evidence` | **未作成**（`ls -d` 実測）。案A で hold を実発火させると全 intent の RA/FD/B&T で `no-applicability-receipt` hold が立つ |

**書き手不在の全数根拠**（述語 `git grep -n "authoring-subjects"`、全 tracked・除外なし → **7 hit**）: record 3 / docs 2 / 読み手 1（`tla-authoring.ts:454`）/ テスト 1（`t481-spec-root-resolver.integration.test.ts:227`）= **書き手 0 件**。

### applicability judge の CLI verb 全数（`tla-authoring.ts` :746-792 の argv dispatch）

| 形 | verb | ハンドラ |
|---|---|---|
| group+verb | `identity extract` / `identity compare` | :150 / :173 |
| group+verb | `bundle build` / `verify` / `read` / `list` / `head` | :201 / :237 / :258 / :267 |
| group+verb | `applicability judge` / `receipt` / `series` | :351 / :373 / :399 |
| group+verb | `advisory hold` | :498 |
| flat | `hold` / `trace` / `proof`（async）/ `commit` | :407 / :592 / :625 / :669 |

フラグ形式は `--name value` の対のみ（`parseFlags` :101-112、奇数長・非 `--` 先頭は null → usage exit 2）。in-process seam は `runTlaAuthoring` :795-803、エントリ :805-807。

### FR-005 receipt surface — owner が存在しない

- 永続 kind は2つ（`tla-evidence.ts:229-231`）= `authoring-bundle` / `terminal-route-receipt`。必須 part は :274-275
- **書き手は `bundle build` のみ**（`tla-authoring.ts:201-228` → `EvidenceBundle.build`）。`applicability receipt`（:373-397）は receipt JSON を **stdout に返すだけで永続化しない**
- `tla-authoring` stage は終端経路を明示拒否（`plugins/formal-model-check/stages/tla-authoring.md:40-44` 逐語「Refuse to start on a terminal route as well. `impl-only` and `non-target` carry no authoring work, so a receipt naming either one ends the stage instead of opening it.」）
- → **非対象 receipt を発行する owner がワークフロー上どこにも無い**。案A 項目3 はこの欠落を埋める設計を要する。`t450-tla-authoring-stage-e2e.integration.test.ts:163` が「owner は stage 外」を固定しているピンで、**衝突しうる**

### ADR-6 の一般化点と残る非一般化点

- 一般化済み（改訂1 で承認、`260804-tla-authoring/inception/application-design/decisions.md:65`）: **宣言 parse** と **formal-check route の argv**（`declaredFormalCheckArgv` :334-348）
- call site: `declaredFormalCheckArgv` = `amadeus-advisory-choice.ts:20`（import）/ `:932`（唯一の呼び出し）。`advisoriesForHost` = `amadeus-advisory-choice.ts:974` / `amadeus-orchestrate.ts:1816` / `:1817` / `:1847`
- **🔴 非一般化点（案A 項目2 の核心）**: ルートの遷移先 stage は `declaredFormalCheckRoute` 内でハードコード。`amadeus-advisory-choice.ts:948` 逐語 `stage: "formal-model-check",` → **`tla-authoring` を指す手段が現行の一般化点に存在しない**。ADR-6 が一般化したのは argv だけで**遷移先 stage は一般化されていない**

### 設計段へ持ち上げる2リスク

- **🔴 R1 見出し文法の不一致（測定）**: `tla-evidence.ts:45` 逐語 `const REQUIREMENTS_HEADING_RE = /^###\s+((?:FR|NFR|AC)-\d{3})\b/;` は3桁ゼロ埋めを要求するが、実コーパスは **134 ファイル中 3 ファイルのみ一致**（述語は re-scan の P2/P3）。対照として decisions 側（:46 `/^##\s+(ADR-\d+)\b/`）は **56 中 54** で健全。intent 要件を直接読む供給設計は現行文法では大半で `unresolvable-id` fail-closed になる
- **🔴 R2 subjects の置き場（演繹、未実測）**: `amadeus-plugin-activation.ts:51` 逐語 `export const ACTIVATION_WATCH_GLOBS: readonly string[] = ["tla/**"];`。直前の :49-50 が「the evidence store (`<specsRoot>/tla-evidence`) sits outside the glob by construction」と設計意図を明言する一方、`defaultSubjectsPath` の解決先 `specs/tla/authoring-subjects.json` は **glob の内側**。subjects 更新のたび spec-hash が変わり兄弟 advisory が発火する見込み — **ハッシュ再計算の実測は未実施**

## CG attribution のコンポーネント棚卸し（260809-cg-attribution-stats、履歴、observed `82e2f30c0`）

| コンポーネント | 現在の責務・根拠 | 本 intent での役割 | 依存 |
| --- | --- | --- | --- |
| `amadeus-stage-stats.ts` corpus scanner | intent audit shardをpath帰属で走査（`:844-872`） | canonical records と corpus diagnostics を供給。dedup境界をjournal正本へ合わせる | filesystem、`readJournalRecords` |
| stage window builder | `intent×stage` FIFO pairing（`:132-176`） | measured windowを保存し、stable internal IDとcollision group metadataを追加 | chronological records |
| idle index/subtractor | awaiting/parked/session-gapのclip/union（`:180-321`） | attribution intervalから同じidle交差を除去。zero-net判定はattribution側 | measured windows、audit records |
| candidate inventory | **未実装** | 全 candidate family、outer/inner event、採否理由を無音廃棄なく列挙 | event registry、journal、event-set decoders |
| lifecycle rule evaluator | **未実装** | explicit stage/start/terminal/identityが揃うpairだけinterval化 | candidate inventory |
| interval accountant | **未実装** | `[start,end)` clip、idle差引、category/global union、overlap、residual、恒等式 | eligible windows、explicit intervals |
| `StageStatsReport` composer | 既存duration/sensor/model/reviewを合成（`:515-577`） | append-only attribution sectionの唯一のsemantic model | measured stats、attribution aggregate |
| Markdown renderer | 人間向け表（`:632-667`） | attributionの全意味軸とmethodologyを表示 | report model |
| CSV renderer | section型CSV（`:676-699`） | 同じ値をconsumer向けに表示 | report model |
| JSON serializer | 決定的配列化（`:701-723`） | machine-readable attributionと`candidateBoundary`の事実/仮説分離 | report model |
| argv/parser/main | option検証、scan、stdout、exit ladder（`:728-798`, `:941-968`） | `--stage` / `--outliers`、正常空レポート、exit 2境界 | renderers、project/space解決 |
| journal codec/merge | v1/v2 reader、canonical merge/dedup（`amadeus-journal.ts:30-35`, `:481-497`, `:534-549`, `:608-640`） | attributionの正準入力とcross-shard dedup | crypto、pure codec |
| `packages/framework/core/otel/event-registry.ts` | event vocabulary/required fields | candidate inventoryの閉じた候補集合 | audit schema |
| Sensor lifecycle | Fire id + Stage slugを持つ start/terminal | `sensor-execution` interval | `amadeus-sensor.ts:521-536`, `:819-865` |
| Execution event set | operation ID + origin stage contract | `execution-lifecycle`。現 corpus terminal欠落を理由報告 | `amadeus-execution-contract.ts:30-46`, `:101-154` |
| Unit-pool event set | attempt acquired/settled + dedup | `unit-pool-lifecycle`。現 corpus stage属性欠落を理由報告 | `amadeus-unit-pool.ts:80-93`, `:130-148`; runtime `:113-159` |
| Other lifecycle families | Bolt/Swarm/Subagent/Loop monitor/Merge dispatch/transaction | interval要件を満たすまではinventoryのみ | 各writer、event registry |
| runtime graph compiler | stage snapshot、containment/latest-wins帰属 | 本集計の一次資料には使わない比較対象 | `amadeus-runtime.ts:71-110`, `:498-760`, `:980-1044` |
| `t486-stage-stats.test.ts` | pure unit、renderer、argv | interval代数・恒等式・理由計数・parity・flag境界 | core source import |
| `t487-stage-stats.integration.test.ts` | filesystem/CLI/real corpus/pipe | event-set合成fixture、実 corpus、3形式oversized consumer | Bun spawn、scratch filesystem、`jq` |

### candidate family の完全性

inventory は `SENSOR_*`、`SWARM_*`、`BOLT_*`、`SUBAGENT_*`、`LOOP_MONITOR_*`、`MERGE_DISPATCH_*`、`UNIT_POOL_EVENT_SET_COMMITTED`、`EXECUTION_EVENT_SET_COMMITTED`、transaction envelope を全て対象にする。区間採用できない family を削るのではなく、`stage-identity-missing` / `start-missing` / `terminal-missing` / `identity-missing` / `duplicate-start` / `duplicate-terminal` / `terminal-not-after-start` / `malformed-event-set` / `digest-mismatch` / `duplicate-event-set` 等の理由別件数として report に残す。

### 所有境界

- journal codec はwire正規化とcanonical dedupを所有し、業務上のstage attributionを所有しない。
- window builderは既存 measured identityとFIFO collision診断を所有し、event containmentからstageを推論しない。
- lifecycle rule evaluatorはcandidateごとの明示契約を所有し、categoryを「実装/検証/review」へ読み替えない。
- interval accountantは時間代数と恒等式を所有し、rendererは再計算しない。
- report modelが3形式 parityの正本であり、各renderer固有の集計分岐を作らない。

## directive kind の terminal/非terminal 分類（260809-report-done-kind-split、履歴、2026-08-09、observed `91f37ec85`）

**観測 ref**: すべて observed = `91f37ec8589cdf468599b4787e27e5125d4d16e8`（`cid:reverse-engineering:measurement-ref-in-artifacts`）。行番号はこの断面で解決する。

判別軸は「その emit 点が返す `kind:"done"` が、conductor にとってループ終端を意味するか、単なる commit ack（続行すべき）を意味するか」。**同一 kind が両方の意味を担っており**、`amadeus-directive.ts` の型にも harness 契約にも区別は存在しない。

### `kind:"done"` の全 emit 点（`packages/framework/core/tools/amadeus-orchestrate.ts`、7サイト）

述語: `git show "91f37ec85…:packages/framework/core/tools/amadeus-orchestrate.ts" | grep -nE 'kind: ?"done"'` → 7 hit（`:4635` の `FORWARD_RESULTS` 内リテラル `"done"` は kind ではないため除外）。

| 行 | 到達経路 | 分類 |
|---|---|---|
| `:2987` | `handleNext` read-only latch（`:2983-2992`） | turn 終端・正（ただし SKILL.md の「completion summary」文言は不適合 — 分類は裁定事項） |
| `:3582` | `handleNext` 完了判定 | 終端・正 |
| `:4933` | single-stage run 完了 | 終端・正 |
| **`:5382`** | `handleAuthorizedApprovalReport` | **多義（terminal / non-terminal の両方）** |
| `:5744` | `handleReport` already-Completed 再 report | 終端・正 |
| **`:5765`** | `handleReport` stale re-report guard（`:5754-5771`） | **純・非終端** |
| **`:5849`** | `handleReport` 通常 commit ack | **多義（terminal / non-terminal の両方）** |

### 多義2サイトの合流構造と判別子

- `:5849` — `:5790` gated→`approve` / `:5791-5794` 非gated かつ最終→`complete-workflow`（**terminal**）/ `:5795-5796` 非gated 途中→`advance`（**non-terminal**）の3分岐がすべて `:5848-5849` の単一 emit へ合流する
- `:5382` — `:5352` / `:5377` の `deferWorkflowCompletion` 経路のみ先に return し、それ以外の terminal / non-terminal が同一 emit へ落ちる
- **判別子 `isFinal` は両サイトのスコープ内に既存**: `:5674`（`const isFinal = nextInScopeStage(slug, scope, stateContent) === null;`）/ `:5298-5299`（同、`scope !== null &&` 付き）。新規の状態読取なしで分岐できる
- **`committed` 配列は判別子として不十分** — gated 最終ステージは `approve` が `complete-workflow` へ自己委譲するため、配列の中身では最終か否かを決められない
- **設計先例**: `deferWorkflowCompletion` 経路は「終端だが未コミット」を `await-completion` / mirror boundary directive として既に別 kind へ切り出している

### 契約面（同期対象コンポーネント）

| 面 | 実体 | 備考 |
|---|---|---|
| harness SKILL.md **6面** | claude `:60` / codex `:58` / kimi `:60` / kiro `:56` / kiro-ide `:56`（**逐語同一**）+ pi `:121`（**別文言**） | 加えて全6面が forwarding-loop の stop 集合に `done` を含む（claude `:22` / codex `:20` / kimi `:22` / kiro `:20` / kiro-ide `:20` / pi `:70`）— report 返り値を loop step として stop 判定する契約なので多義が直撃する |
| `amadeus-directive.ts` | `:52`（union）/ `:330-331`（doc）/ **`:332-335`**（`interface DoneDirective`）/ `:407`（`VALID_KINDS`）/ `:474`（`DONE_FIELDS`）/ `:495`（`KNOWN_FIELDS_BY_KIND`）/ `:548`（`FIELD_CHECKS_BY_KIND`）/ `:1201`（golden sample） | rule 3（`:590-594`）が unknown key を **strict 拒否**。両 Record は total（`:503` 逐語「Adding a DirectiveKind without a row here is a compile error (Record is total).」）でフィールド追加・kind 追加のいずれも漏れが検出される |
| `docs/reference` **6ファイル** | `17-skill-system.md:38`（SKILL.md と同一の契約行）/ `:76` / `:80` と `.ja.md` 同座標、`06-hooks-and-tools.md:50,250,259` / `.ja.md:48,248,257`、`14-claude-features.md:333` / `.ja.md:328` | **reviewer-1「docs/reference には契約なし」は誤り**（本 RE が反証）。`06-…` / `14-…` の各 hit が契約行か散文言及かの逐語分類は未実施 |
| stage-protocol | `packages/framework/core/amadeus-common/` は **0 hit** | reviewer-1 のこの半分は正 |
| Stop hook | `packages/framework/core/hooks/amadeus-stop.ts:931-932`（`// \`done\` → the workflow is complete; allow the turn to end.` / `if (kind === "done") {`） | kind の出所は report の stdout ではなく `runEngineNextKind()`（`next` の再 spawn）= バックストップとして機能。実害は conductor 判断層に限定 |

### 既存の件数語ドリフト（**本 intent の患部外**、同根棚卸し候補）

`VALID_KINDS` 実数 = **13**（`awk '/VALID_KINDS = \[/,/\] as const/' | grep -cE '^\s*"'` で機械再計算。要素: `run-stage` / `dispatch-subagent` / `await-advisory-choice` / `invoke-swarm` / `present-gate` / `ask` / `select-intent` / `print` / `error` / `done` / `parked` / `await-completion` / `await-approval`）に対し、契約面の件数語が乖離している:

| 所在 | 逐語 |
|---|---|
| SKILL.md 5面（claude `:73` / codex `:71` / kimi `:71` / kiro `:67` / kiro-ide `:67`） | 「The orchestration engine emits **ten** kinds today」 |
| `docs/reference/17-skill-system.md:32` | 「a discriminated union over **nine** directive kinds」「The engine **emits seven kinds today**」 |
| `docs/reference/17-skill-system.ja.md:32` | 「**9つ**のディレクティブ種別」「エンジンは**今日7つの種別を発行**します」 |

新 kind 追加方式を採る場合はこの群を全て触ることになり、`cid:code-generation:count-comment-sync-on-catalog-change`（件数語は隣接列挙がある場合のみ許容）と `cid:functional-design:c3-adjacent-enum-numerals` の適用対象になる。

### テストピンの所在

`t115`（`tests/unit/t115.test.ts`）が中核 — `.sh` からの CLI 契約ポート（TAP plan 22）で、ヘッダ逐語「An in-process twin would lose the directive-JSON-to-stdout half (every "kind":"done"/"kind":"error" assertion)」。非終端サイトを pin する assert は `t115:287,314,332,350,373,538,557,586` / `t118:52,441,457` / `t-solo-gate-transaction-carrier:167` / `t435-intent-autonomy-production:564` / `t186:481` に分布。Stop hook 側は `t121-stop-hook-enforce:846-847`（スタブ engine が `done` を返す）が分岐を固定しており、Stop hook 改訂の落ちる実証の注入面になる。`cid:reverse-engineering:c1-pinned-behavior-ruling` の対象。

---

## per-sensor argv parse の所在と現況（260809-sensor-parseflags-failop、履歴、observed `778567dd0`）

**観測 ref**: すべて observed = `778567dd03b00f22cb887eec06f025557eeaaaf4`（`cid:reverse-engineering:measurement-ref-in-artifacts`）。行番号はこの断面で解決する。

判別子は「値なしフラグ（`--depth` が argv 末尾、または直後が別のフラグ）をどう扱うか」。**loud に拒否する house idiom** と、**次トークンを無条件に飲む fail-open 形**が同一 repo 内に併存する。

### 欠陥クラスの所在（T1〜T7b）

| クラス | 所在（`packages/framework/core/tools/`） | 現況（実測、exit code は非パイプ取得） |
|---|---|---|
| **T1 コア3本** | `amadeus-sensor-depth-budget.ts:294-302` / `amadeus-sensor-question-budget.ts:340-348` / `amadeus-sensor-nfr-budget.ts:1031-1040` | `out.depth = argv[++i]`。**両アーム silent・exit 0**。over-budget の finding 1件が無言で消える。nfr は `--kind --depth Minimal` で `unit_kind:"--depth"` となり測定値が変わる。**最悪ケース（受け皿なし）** |
| **T2 scope-sizing 残渣** | `amadeus-sensor-scope-sizing.ts:247-260`（`valueAt` + 逐語コメント） | アームB（`--output-path --depth S`）は exit 1 で封鎖済み。アームA（`--output-path P --depth`）は `depth:null` の残渣 — `valueAt(argv, ++i)` の `++i` 副作用で次フラグが値化されず飲まれる |
| **T3 センサー・偽 green** | `amadeus-sensor-required-sections.ts:67-87` | **完全偽 green を実測再現**。`--templates-dir --template-eligible requirements` でテンプレート違反1件が警告も非0 exit もなく消える。本 Issue の3本より重い |
| **T4 センサー・偶然 loud** | `amadeus-sensor-answer-evidence.ts:95-106` / `amadeus-sensor-pr-convergence-report-format.ts:166-173` | parse 欠陥は同一だが、下流の必須チェックで偶然 exit 1 |
| **T5 意図宣言済み例外** | `amadeus-sensor-upstream-coverage.ts:19-35`（`:29-30` 逐語コメント） | `--consumes` 末尾 = 空リストと**同一扱いを意図宣言**。一律修正は意図破壊 |
| **T6 別イディオム・両アーム loud** | `amadeus-sensor-linter.ts:93-119` / `amadeus-sensor-type-check.ts:112` 以降 | **実測 exit 1 ×4**。機序 = `?? ""` の後の `if (!stage) exit(1)`（linter:110-117）と未知トークンの `else { unknown flag → exit 1 }`（linter:104-107）。**欠陥クラスから外してよい**（メッセージ誤帰属の質は残る） |
| **T7 汎用 `parseFlags`（センサー外・engine 系 CLI）** | `amadeus-learnings.ts:858-867` / `amadeus-jump.ts:238-244` / `amadeus-state.ts:705-715` / `amadeus-state.ts:5029-5036`（`handlePracticesPromote` インライン） | ガードは `a.startsWith("--") && i + 1 < args.length` のみ。**任意のフラグ**が次トークンを飲む。末尾フラグは無言ドロップ |
| **T7b 名指しフラグ変種**（Architect 追加検出） | `amadeus-jump.ts:192-194`（`--project-dir`）/ `amadeus-state.ts:732-739`（`extractIntentSelector` の `--intent` / `--space`）/ `:4653-4656`（`--choice`）/ `:4788-4795`（`--type` / `--field`） | 同一欠陥形だが**対象は名指しフラグのみ**で誤消費の射程が狭い。`--intent --space X` → intent = `"--space"`。`--choice --foo` は非空になるため後段 `if (!choice) error()`（`:4659`）を通過し偶然 loud にもならない。**重大度は T7 と同一ではない** |

**T7 / T7b は実発現有無が未実測（仮説）** — 呼出し元の argv 構成が値なしフラグを生みうるかは本 RE では確認していない。

**列挙述語の注意**: `[++i]` 単独の述語は `args[i+1]; i++` 形を構造的に取りこぼす。T7 / T7b はいずれも後者の形で、`grep -rnE '\[(i|idx|index) \+ 1\]'` でのみ現れる（`cid:application-design:c1-asd-multi-idiom-inventory`）。

### house idiom（loud 拒否形）の所在 — 5本

`grep -rn "expects a value" packages/ tests/` で現れる。代表は `amadeus-state.ts:4076-4087` の `getFlagValue`:

> `` `${flag} expects a value, got end of arguments.` `` / `` `${flag} expects a value, got another flag: "${val}". Did you forget the value?` ``

逐語コメントが「silently wrong. This helper errors cleanly when the value starts with `--`」と述べる。**`amadeus-state.ts` は house idiom（`:4076-4087`）と T7（`:705-715` / `:5029-5036`）と T7b（`:732-739` / `:4653-4656` / `:4788-4795`）を1ファイル内に同居させており、非対称が最も濃い**。文言の先例テストは `tests/unit/t31.test.ts:223-244`（両アームを assert）。

### canonical 化の配置制約（実測）

- `amadeus-sensor-depth-budget.ts:23-24` の逐語コメントは「**no amadeus-lib import**」であり「no import」ではない。同ファイルの import は `node:fs` / `node:path` のみ（`:25-26`）
- **cross-sensor import の現役先例**: `amadeus-sensor-nfr-budget.ts:76` `import { canonicalDepth } from "./amadeus-sensor-depth-budget.ts";`
- amadeus-lib を import する per-sensor スクリプトは **6本**: `amadeus-sensor-invocation.ts:8` / `answer-evidence:19` / `schema:33` / `upstream-coverage:2` / `required-sections:3` / `type-check:90` → self-contained は per-sensor 全体の規約ではなく **budget 系のローカル方針**
- 配布面: `packages/framework/harness/*/manifest.ts` の `coreDirs` が `{ src: "tools", dst: "tools" }`（claude:56）で `walk(srcDir)` の全ファイルを投影 → **core/tools への新規小モジュールは全ハーネスへ自動で乗る**（手動同期不要）

### in-process seam の現況（falling-proof の書きやすさ）

| センサー | `main` export | `fail` export |
|---|---|---|
| depth-budget | `:311` ✅ | `:304` ❌ |
| question-budget | `:357` ✅ | `:350` ❌ |
| nfr-budget | `:1054` ✅ | `:1042` ❌ |
| scope-sizing | `:275` ✅ | `:266` ✅ |

`fail` の export は scope-sizing のみ。`tests/integration/t519-scope-sizing-sensor.integration.test.ts:275-306` の in-process falling-proof を他3本へ移植するには `fail` の export 化が要る（`cid:requirements-analysis:bun-coverage-spawn-blindspot`）。

### 発火経路（dispatcher）は構造的に安全

`amadeus-sensor.ts:886-898`（`depthBudgetArgs`）と `:900-926`（`unitKindArgs`）はいずれも `return X === undefined ? [] : ["--flag", X];` の形で、値なしフラグを構造的に生まない。dispatcher 自身の `parseFlags`（`amadeus-sensor.ts:179-195`）は**両アーム loud** — 「dispatcher は loud、dispatch される側は silent」の非対称。

詳細と決定的再現の全出力は `re-scans/260809-sensor-parseflags-failop.md` を正本とする。

## #2328 audit schema drift の患部コンポーネント（260807-intent-2328-tests-e2e-au、履歴、observed `a5621236c`）

判別子は「共有ハーネス `tests/harness/audit-records.ts` を使うか、自前で `JSON.parse` するか」。自前パーサは **e2e 17ファイル + 非 e2e 14ファイル**に実在する。

### 患部（e2e 17ファイル — 全て単独実行で fail を scan が実測）

`tests/e2e/` は review SHA `75a1c198d` → observed `a5621236c` で無変更（`git diff --name-only 75a1c198d HEAD -- tests/e2e/` が空を返すことを Architect が独立実測）。したがって行番号の再解決は不要（`cid:reverse-engineering:E-XBB-RE-S13-c2`）。

v1 形決め打ちパーサの逐語例:

| ファイル | 型定義 | 消費点 |
|---|---|---|
| `t10-halt-and-ask-discard.test.ts` | `:126-130` `interface AuditRecord { event: string \| null; heading: string; fields?: Record<string, string>; }` | `:144` |
| `t05.test.ts` | `:147`（同型 `interface AuditRecord`） | `:260-262` |
| `t07-audit-fork-merge.test.ts` | — | `:249` 定義、消費 `:268` `:298` `:330` `:343` `:366` |

残る14ファイルを含む全数列挙は `re-scans/260807-intent-2328-tests-e2e-au.md` を正本とする。

**唯一 green な例外**: `t-formal-verif-model-completeness-sensor` は in-file で両対応正規化を内蔵する（`:227-233` の `event: record.event ?? record.attributes?.Event ?? null`）。これは「in-file 正規化」方式が実際に機能することの実在証拠であり、修正方式の選択肢の一方を裏づける。

### canonical 修正様式のコンポーネント

| コンポーネント | 所在 | 責務 |
|---|---|---|
| `normalizeAuditRecord` | `tests/harness/audit-records.ts:26` | 単一 record の v1/v2 正規化 |
| `auditRowsFrom` | `:49` | shard 本文 → 正規化済み record 配列 |
| `countAuditEvent` | `:57` | 両スキーマ横断のイベント計数 |
| `EVENT_HEADINGS` import | `:18` | `../../dist/claude/.claude/tools/amadeus-audit.ts` 由来 — **dist ビルド前提**を持ち込む |

消費実例 59ファイル（`t118.test.ts:219` / `t45-revision-loop.test.ts:161` 等）。

### 書き手コンポーネント（v1/v2 共存 — 置換禁止）

| 版 | コンポーネント | 所在 |
|---|---|---|
| v1 | lifecycle writer | `amadeus-audit.ts:534` |
| v1 | raw body 経路（`event: null`） | `amadeus-audit.ts:597` |
| v1 | state writer | `amadeus-state.ts:3193` |
| v2 | `emitAudit` → `emitAuditEvent` → `appendAuditEntryViaEvents` | `amadeus-worktree.ts:635` → `:95` → `otel/audit-emit.ts:48` |

### vacuity 3件（壊れたリーダーでも通る偽 green）

| 所在 | assertion | 危険 |
|---|---|---|
| `t09-halt-and-ask-preservation.test.ts:211` | `eventCount(p, "WORKTREE_DISCARDED")).toBe(0)` | v2 行が実在しても v1 リーダーは 0 を返す |
| `t07-audit-fork-merge.test.ts:371` | `countEvent(wtAuditPath(p, "demo"), "AUDIT_MERGED")).toBe(0)` | 同上 |
| `t07-audit-fork-merge.test.ts:530` | `countEvent(auditPath(p), "AUDIT_FORKED")).toBe(0)` | 同上 |

いずれも「行が存在しないこと」を主張する negative invariant であるため、リーダーが壊れていても通過する。修正時は**落ちる実証が必須**（Mandated: 新設・変更したガードは実際に赤くなることを実証する）。

### 除外（患部でない）

`t378` / `t380` / `t382` / `t388` — v1 不在 assert が設計意図であり、本件の患部に当たらない。

### 検証面コンポーネント

| コンポーネント | 所在 | 事実 |
|---|---|---|
| `--ci` プロファイル | `tests/lib/run-tests-args.ts:95-100` | `runSmoke` + `runUnit` + `runIntegration` のみ（e2e 非含） |
| CI 認識 | `.github/workflows/ci.yml:224-227` | 死角を逐語で明記 |
| CI 上の唯一の e2e | `ci.yml:252` | `t341-plugin-conformance-journey.serial.test.ts` 1本のみ |

**tNNN 予約**: 使用済み最大 `t483`、次は **`t484`**。

## 監査・record の読み手生態（260807-stage-perf-report、履歴、observed `4a3da7d62`）

本節の file:line はすべて observed `4a3da7d62c3cc3dadda2dfb6225d30cfa985a8d0` 時点。差分 base は `b8e3e664f08185e0bd3e3b6d9b7f2dfb60c0ad7d`（祖先性 exit 0、距離 12 commits / 108 files）。全数列挙は `re-scans/260807-stage-perf-report.md` を正本とする。

監査シャードと record を入力に取る既存コンポーネントの棚卸し。**ステージ性能軸で集計する読み手は observed 時点で不在**である。

| コンポーネント | 行数 | 種別 | 入力 | 出力 | 本用途への適合 |
| --- | --- | --- | --- | --- | --- |
| `packages/framework/core/tools/amadeus-journal.ts` | — | ライブラリ（正規化層） | 監査シャード（v1/v2 混成） | `JournalRecord` 正規化ビュー | **適合。ただし消費者が subagent-stats に不在** — `journalRecordField:130` / `readJournalRecords:534` / `parseJournalLine:481` / `splitJournalLines:501` / `mergeShards:612` / `isJournalEntryV2:103` / `journalRecordKey:109` がすべて export 済み |
| `packages/framework/core/tools/amadeus-subagent-stats.ts` | 468 | read-only CLI | 監査シャード全域 | subagent 軸のモデル別統計（text / `--json`） | **形は雛形、コードは再利用不可** — `recordFromLine:278` が非 export、`scanAuditCorpus:345` は subagent 型固定 |
| `packages/framework/core/tools/amadeus-runtime.ts` (`summary`) | — | read-only 集計 | `runtime-graph.json`（**gitignored**） | `RuntimeSummary`（`:1019-1044`） | **不適合** — `:982-984` が "never re-walks audit"、過去 intent のグラフは存在しない（`git ls-files` 0 件）。per-stage 所要時間・モデル・レビューイテレーションを持たない |
| `.claude/skills/amadeus-session-cost/SKILL.md` | — | read-only スキル | 上記 `summary` の出力のみ | 端末表示 | **不適合** — 薄いラッパ、単一ワークフロー限定、"does no counting of its own" |
| `packages/framework/core/tools/amadeus-observability.ts` | 384 | telemetry **書き手** seam | 呼び出し元のイベント | `<record>/.amadeus-otel/buffer-<clone>.jsonl` | **不適合かつ名前空間使用不可** — サブコマンド 0、opt-in、**fail-open**（`:1-19`）。読み手は fail-closed で契約が正反対 |
| `packages/framework/core/tools/amadeus-reviewer-runtime.ts` | — | §12a レビュー記録の**書き手** | reviewer verdict | record 成果物への `## Review — Iteration N` ブロック | **読み手の parse 契約の出所** — `REVIEW_MARKER:96-97`、`reviewBlock:618-644`、`reviewField:672-677`、二段マッチ `:660` |
| `scripts/metrics-timeseries.ts` | — | read-only ビューア（repo 側） | `metrics/` スナップショット | 時系列表示 | **重複しないが先例として有用** — grep 検査可能な no-write 契約（`:1-8`） |
| `scripts/metrics-snapshot.ts` ほか `metrics-*` | — | 書き手・可視化・保持 | リポジトリ健全性（CCN / coverage / LOC / テスト数） | `metrics/*.json`（288 件） | **軸が異なる** — ワークフロー・ステージ・モデルの軸を持たない |

### 出力面の資産

| 面 | 所在 | 制約 |
| --- | --- | --- |
| `nearestRankP95` | `tests/lib/percentile.ts:12` | **`tests/` 配下のため core から import 不可**。意味論を写す（nearest-rank、空入力で `NaN`） |
| `sortedEntries`（`--json` 安定順序） | `amadeus-subagent-stats.ts:174-176, 237-254` | 件数降順・キー昇順。file-private だが規約として写せる |
| バージョン付きレポートのエンベロープ | `metrics/*.json` | `{schema_version, captured_at, commit, collectors{tool, tool_version, values}}` — repo の確立形 |

### テスト面の双子

| 層 | ファイル | 役割 |
| --- | --- | --- |
| unit | `tests/unit/t460-subagent-stats-compose.test.ts` | 純粋な compose |
| integration | `tests/integration/t461-subagent-stats.integration.test.ts` | fs + CLI spawn、`MECHANISM: cli`、独立オラクル（`:5-23`） |

## #2297/#2303 subagent-start 患部コンポーネント（260807-subagent-start-pair、履歴、2026-08-08、observed `5f2ad9195`）

測定 ref は observed `5f2ad9195d9ce3ea55d6bf3d34509f2c5ca2c12b`、差分 base `4a3da7d62`（2 commits）。全数列挙は `re-scans/260807-subagent-start-pair.md`。

### Unit A — hook 配線（#2297）

| コンポーネント | パス | observed 状態 | 役割 |
|---|---|---|---|
| live 設定 | `.claude/settings.json` | tracked、hook 11件、`PreToolUse` **不在**（`grep -c` → 0 / exit=1）、`plugin-compose` **不在** | このリポジトリ自身が実際に読む配線面 |
| 正本 example | `packages/framework/harness/claude/settings.json.example` | tracked、hook 13件、`PreToolUse{^Task$}` を `:60-68` に、`plugin-compose` を `:44` に保持 | 配布・ガードの ground truth 候補 |
| 投影 example | `.claude/settings.json.example` | **untracked**（source-only 生成物）、正本と byte 一致 | build 生成物。ガード基準にすると build 依存になる |
| dispatcher | `packages/framework/harness/claude/hooks/amadeus-dispatch.ts` | `HOOK_PATHS` 10スロット（`:4-15`）、fail-closed 4契約 | slug → hook path の解決と forward |
| 未配線フック（実在） | `packages/framework/core/hooks/amadeus-log-subagent-start.ts`<br>`packages/framework/core/hooks/amadeus-plugin-compose.ts` | 正本・自己インストール面 `.claude/hooks/` の**両方に実在** | スロット追加時の実在要件は充足済み |
| **不在コンポーネント** | — | live 設定の hook 集合を検査するガードが**存在しない** | 再発防止の新設対象 |

既存の settings 系ガード6面はいずれも live を見ない:

| テスト | 対象 | live を見るか |
|---|---|---|
| `tests/smoke/t03-settings-json.test.ts` | `AMADEUS_SRC/settings.json.example`（= dist の example） | ✗ |
| `tests/integration/t40-settings-hook-config.test.ts` | 同上 | ✗ |
| `tests/integration/t131-hooks-settings-fire.test.ts` | 同上 | ✗ |
| `tests/unit/t132-hooks-doc-count-sync.test.ts` | `AMADEUS_SRC/settings.json.example` + `AMADEUS_SRC/hooks/*.ts` + doc | ✗ |
| `tests/integration/t327-hook-wiring-xor-closure.integration.test.ts` | `WIRING_SITE.claude = "packages/framework/harness/claude/settings.json.example"`（`:38`） | ✗（正本 example） |
| `tests/unit/t416` / `t418`（+ integration 版） | `.claude/settings.json` を**パス membership としてのみ**参照 | 部分（hook 集合は不検査） |

### Unit B — dispatch tool 語彙（#2303）

| コンポーネント | パス:行 | 役割 | 修正影響 |
|---|---|---|---|
| dispatch tool 定数 | `packages/framework/core/tools/amadeus-lib.ts:4128` | `SUBAGENT_DISPATCH_TOOL = "Task"` | 患部の中核。消費者は `:4161` の1箇所のみ |
| 判定ガード | 同 `:4160-4161` | `subagentStartFields` の入口。`tool_name !== undefined &&` 短絡が kimi 経路を通す | 語彙変更の適用点。短絡は保全必須 |
| 型宣言 | 同 `:4774` | `tool_name?: string;`（`ClaudeCodeHookInput`） | optional のまま維持 |
| emit フック | `packages/framework/core/hooks/amadeus-log-subagent-start.ts:64-65, :98` | 判定呼出しと唯一の `SUBAGENT_STARTED` append | 迂回路なし |
| 旧語彙コメント | 同 `:10-12` | ヘッダ doc-comment | doc 同期対象 |
| coverage registry | `tests/.coverage-registry.json:4250` | `unitId: "function:SUBAGENT_DISPATCH_TOOL"` | 定数名を変える案では同期対象 |

**テストピン（15箇所 / 3ファイル）**:

| ファイル | 行 | 件数 |
|---|---|---|
| `tests/unit/t-subagent-purpose.test.ts` | 66, 89, 96, 97, 101, 113 | 6 |
| `tests/integration/t454-subagent-model-attribution.integration.test.ts` | 291, 369, 377, 387, 395, 407, 418, 426 | 8 |
| `tests/integration/t-log-subagent-start.integration.test.ts` | 106 | 1 |

**doc 面（旧語彙 `PreToolUse{Task}` / dispatch tool 記述）— レビューの4面より広い**:

| 面 | observed 行 | レビュー言及 |
|---|---|---|
| `.claude/knowledge/amadeus-shared/audit-format.md` | :176、:181 | :176 のみ ✓ |
| `packages/framework/core/knowledge/amadeus-shared/audit-format.md`（正本） | :176、:181 | :176 のみ ✓ |
| `docs/reference/12-state-machine.md` | :400 | ✓ |
| `packages/framework/core/tools/amadeus-lib.ts` コメント | :4149 | ✓ |
| `packages/framework/core/hooks/amadeus-log-subagent-start.ts` | :10-12 | ✓ |
| `docs/reference/06-hooks-and-tools.md` | :26, :46, :205, :215, :219 | **未列挙** |
| `docs/reference/06-hooks-and-tools.ja.md` | :25, :44, :203, :213, :217 | **未列挙** |
| `docs/reference/23-telemetry-schema.md` | :194 | **未列挙 + stale cite** |
| `docs/reference/23-telemetry-schema.ja.md` | :189 | **未列挙 + stale cite** |

うち `:46 / :215`（および ja の `:44 / :213`）は **matcher `^Task$` の記述であり修正対象外**（表示名の名前空間、語彙とは別軸）。

**stale cite（両 reviewer 未検出、本スキャンの新規発見）**: `docs/reference/23-telemetry-schema.md:194` と `.ja.md:189` は `tools/amadeus-lib.ts:4430` / `:4456-4457` を引くが、observed の該当行は無関係:

```
4430: // The recorded repo set for an intent (its intents.json row's `repos`), or [] when
4456: }
4457: （空行）
```

正しい引用先は **`:4128`（定数）と `:4160-4161`（ガード）**。#2303 の doc 同期はこの2面の cite 訂正も射程に入る。

### kimi 経路の保全コンポーネント

| コンポーネント | パス:行 | 内容 |
|---|---|---|
| payload 構築 | `packages/framework/harness/kimi/hooks/amadeus-kimi-lib.ts:732-741` | `hook_event_name` / `agent_type` / `prompt` の3キーのみ。**`tool_name` を含まない** |
| 配線 | `packages/framework/harness/kimi/hooks/amadeus-hooks.snippet.toml:59-60` | `event = "SubagentStart"` → `amadeus-kimi-adapter.ts role-start` |
| 回帰ピン | `tests/unit/t-subagent-purpose.test.ts:82-86` | `{hook_event_name:"SubagentStart", agent_type:"explore", prompt:"Look around"}` → フィールド返却を既にピン |

### 設計材料としての既存前例

`tests/integration/t189-compose-dispatch.sdk.test.ts:78-81` に**両語彙を受理する既存前例**が実在する（両 reviewer 未言及）:

```ts
        // subagent tool as "Task" or "Agent" depending on the SDK build -
        // accept either; an inline-improvised grid would show neither.
        const taskCalls = r.toolResults.filter(
          (t) => t.toolName === "Task" || t.toolName === "Agent",
        );
```

## pr-convergence landed 対応の対象コンポーネント（260807-merged-pr-convergence、履歴、2026-08-07、observed `4a3da7d62`）

本節の file:line はすべて observed `4a3da7d62c3cc3dadda2dfb6225d30cfa985a8d0` 時点。差分 base は `b8e3e664f08185e0bd3e3b6d9b7f2dfb60c0ad7d`（12 commits / 108 files、`plugins/pr-convergence/` の区間内変更 0 件）。全数列挙は `re-scans/260807-merged-pr-convergence.md` を正本とする。

- `plugins/pr-convergence/tools/pr-convergence-predicate.ts` — 収束述語（`evaluateConvergence :180-192`、`MergeStateStatus :90-98` に MERGED なし・未知値 throw `:117-121`、`resolveMergeable :249-269` retry 5×10s）
- `plugins/pr-convergence/tools/pr-convergence-gh-runner.ts` — GraphQL 取得面（`PR_STATE_QUERY :191-195` は `mergeable mergeStateStatus` のみ、`RawPrState :76-79`）— landed 判定は fail-closed parse を弱めないフィールド追加が要る
- `plugins/pr-convergence/tools/pr-convergence-cli.ts` — verb 閉集合 `:320`（status|report|override）、`ConvergenceReport` kind union `:61-76`、`renderReport :89-129`、refuse 2分岐 `:438-447` / `:468-474`、audit-before-report 順序（ヘッダ `:20-25`）
- `packages/framework/core/tools/amadeus-sensor-pr-convergence-report-format.ts` — kind 閉集合 `:69`・整合分岐 `:122-130`・core→plugin import 禁止（`:16-20`）
- `plugins/pr-convergence/stages/pr-convergence.md` — 「Convergence is not merge」宣言（`:34-37` / `:200-202`）— landed 語彙の文書整理対象
- テスト: t444〜t450（全て in-process）。coverage 行ピンは `tests/.coverage-patch-allowlist.json:6365-6398` の4エントリ。tNNN 使用済み最大 t480、新規 t481 以降

## project-dir 解決の患部コンポーネント（260807-projectdir-worktree-fix、履歴、2026-08-07、observed `4a3da7d62`）

本節の測定 ref はすべて observed `4a3da7d62c3cc3dadda2dfb6225d30cfa985a8d0`。差分 base は `b8e3e664f08185e0bd3e3b6d9b7f2dfb60c0ad7d`（12 commits）。全数列挙は `re-scans/260807-projectdir-worktree-fix.md` を正本とする。

### 患部コンポーネント

| コンポーネント | 所在 | 役割 | #2352 での位置づけ |
|---|---|---|---|
| `resolveProjectDir` | `packages/framework/core/tools/amadeus-lib.ts:226-250` | CLI ツールの workspace root 解決（4段） | **患部本体**。marker 段が無く、env が段2で無条件に勝つ |
| `resolveProjectDirFromHook` | 同 `:310-347` | hook の workspace root 解決（5段） | **対照実装**。marker 段2つを持つ。緩和対象ではない |
| `hasWorkspaceMarker` | 同 `:283-286` | `amadeus/` + `<harness>/tools/` の両ディレクトリ存在判定 | marker 段の述語。build 前 worktree では偽 |
| `findWorkspaceMarkerAncestor` | 同 `:290` 付近 | cwd から祖先方向へ marker 探索 | hook 段3 の実体 |
| `isDir` | 同 `:266-272` | ディレクトリ限定の存在判定 | #641 レビュー是正で導入（ファイル名だけの偽 marker を排除） |
| `stripProjectDir` | 同 `:212-224` | argv から `--project-dir` を剥がす共有ヘルパー | 段1 の受け口。runtime / sensor / learnings が使用 |
| `resolveProjectDir`（ローカル） | `packages/framework/core/hooks/amadeus-statusline.ts:31` | 名前シャドウ。内部で `resolveProjectDirFromHook` を呼ぶ（`:42`） | **lib 関数の caller ではない**。grep 棚卸しの誤カウント源 |

### 設定・文書面のコンポーネント

| 面 | 所在 | 内容 |
|---|---|---|
| allowlist（正本） | `packages/framework/harness/claude/settings.json.example:10` | `"Bash(bun $CLAUDE_PROJECT_DIR/.claude/tools/*)"` |
| allowlist（セルフインストール、tracked） | `.claude/settings.json:39` | 同上 |
| プロトコル指示 | `packages/framework/core/amadeus-common/protocols/stage-protocol.md:511` | CWD drift warning — 絶対形を推奨、サブシェル代替も明記 |
| `--project-dir` 使用例 | 同 `:1209-1216` | `amadeus-finding.ts create-github-issue --project-dir <workspace-root>` |

### テスト面 — 非対称がテストにも写っている

| テスト | `covers:` 宣言 | ケース B 被覆 |
|---|---|---|
| `tests/integration/t144-harness-seam.cli.test.ts` | `function:harnessDir, function:resolveProjectDir, function:rulesSubdir, file:tools/amadeus-lib.ts`（`:4`） | **なし** |
| `tests/unit/t202-hook-project-dir-worktree-marker.test.ts` | `function:resolveProjectDirFromHook, file:tools/amadeus-lib.ts`（`:5`） | hook 側のみ |
| `tests/integration/t296-hook-launch-and-worktree-resolution.test.ts` | `hook:amadeus-mint-presence, function:resolveProjectDirFromHook, …, file:settings.json.example`（`:1`） | hook 側のみ |
| `tests/integration/t230-hook-project-dir-opencode-cursor-marker.test.ts` | opencode / cursor の marker 段（#1048） | hook 側のみ |

**t144 の落とし穴**: test 5 のタイトルは `"resolveProjectDir CWD-marker rung accepts a .codex marker"` だが、body（`:134-146`）は `mkdirSync(join(project, ".codex"))` のみで `amadeus/` を作らない。これは**段4（既知 harness dir の存在）であって workspace marker ではない** — `resolveProjectDir` に workspace marker 段は存在しないため、タイトルの "CWD-marker rung" は段4を指す。t144 が pin するのは段1/2/3/4 のみであり、**ケース B（cwd=worktree marker 保有 × 本線絶対パス lib）を固定するテストは repo 全域で不在**。

**t144 の前提条件**: t144 は `dist/claude/.claude/tools/amadeus-lib.ts` を読む（`:37-38` `const CLAUDE_TOOLS = join(REPO_ROOT, "dist", "claude", ".claude", "tools")`）。source-only 移行後 `dist/` は未追跡生成物のため、**このテストは `bun run build` 済みを前提とする**。ケース B の回帰テストを t144 に足す場合、この前提が引き継がれる。


## fail-closed ガードの回復経路（260807-failclosed-recovery-path、履歴、observed `b8e3e664f`）

本節の file:line はすべて observed `b8e3e664f08185e0bd3e3b6d9b7f2dfb60c0ad7d` 時点。差分 base は `7060956c5617125dd2f4e284957aa180cb306484`（祖先性 exit 0、距離 76 commits / 1223 files）。全数列挙は `re-scans/260807-failclosed-recovery-path.md` を正本とする。

### no-silent-drop（#2313 の患部と隣接コンポーネント）

| コンポーネント | 責務 | 本 intent での所見 |
| --- | --- | --- |
| `tests/no-silent-drop/events.ts` | append-only ULID イベント台帳。`GrantEvent`（`:19`）/ `RevokeEvent`（`:31`）/ `SnapshotEvent`（`:47`）の3型、`foldEvents`（`:213`）→ `FoldedLedger`（`:58`）、旧 doc 形への射影 `baselineDocFromFold`（`:305`）/ `exemptionsDocFromFold`（`:319`）、custody 検証 `listEventUlidsAtRevision`（`:323`）/ `assertEventCustody`（`:438`） | #2338 で新設。`EVENTS_DIR`（`:15`）配下は observed で **217 ファイル**（区間ですべて新規追加）。`previousDigest` によるバイト束縛は廃止済みで、残骸は `model.ts:69,76` の optional field と `evidence-rebind.ts:407` / `bootstrap.ts:337,433` のコメントのみ |
| `tests/no-silent-drop/ledger.ts`（308行） | baseline / exemption / approval のパースと shrink-only ラチェット。`assertShrinkOnly`（`:191`）/ `assertExemptionsShrinkOnly`（`:202`）/ `trustedBaseSha`（`:213`）/ `baselineAtRevision`（`:226`）/ `approvalDigest`（`:242`）/ `validateApproval`（`:250`）/ `buildCandidate`（`:271`）/ `CANONICAL_PATHS`（`:301`） | `:213-223` の base 解決順が `--base-revision` 規約の実装。厳密祖先性を要求する |
| `tests/no-silent-drop/engine.ts`（315行） | `Mode`（`:52`）= `check` / `census-evidence` / `approve-evidence` / `baseline-candidate`、`runGate`（`:295`）、`isMode`（`:304`）、`:256` で `foldEvents(loadEvents(repoRoot).byUlid.values())` | `:250-252` が trusted base null を fail-closed で拒否 |
| `tests/no-silent-drop-gate.ts`（36行） | CLI 薄皮 | `package.json` の `"no-silent-drop"` スクリプト実体 |
| `tests/no-silent-drop/repository-adoption-evidence.ts`（468行） | 採用エビデンスの値オブジェクト層。`ADOPTION_RECEIPT_IDS`（`:5`）は **23 種**、`readEvidenceArtifact`（`:293`）/ `evidenceDigestForEntry`（`:353`）/ `validateEvidenceBundle`（`:445`）/ `validateEvidenceRegistryFile`（`:459`） | `repository-adoption.ts`（227行）は registry 型（`AdoptionReceipt` `:13` / `EvidenceRegistry` `:22`）を被せる薄い層で上を re-export |
| `tests/no-silent-drop/evidence-rebind.ts`（623行） | registry を別 revision へ rebind / reconcile する遷移層。`buildReboundBundle`（`:341`）/ `buildReconcileBundle`（`:405`）/ `applyReboundBundle`（`:462`）/ `rollbackAppliedBundle`（`:550`）、status 語彙（`:40`） | `:24-30` の `EVIDENCE_BUNDLE_PATHS` 3定数が第1段 tree 比較の除外集合。対象パスは `EVIDENCE_REGISTRY_PATH`（`:24`）/ `EVIDENCE_MANIFEST_PATH`（`:25`）/ `EVIDENCE_RUNS_PATH`（`:26`） |
| `scripts/no-silent-drop-evidence.ts`（270行） | rebind / reconcile の CLI | **verb は2つのみ**。`:162-171` の回復分岐は `currentBindingIsValidForEvent` が false のときだけ走る |
| `scripts/no-silent-drop-evidence-adapter.ts`（463行） | 上記 CLI に注入される I/O ポート（git / gh / fs）。純粋な rebind 計算と副作用を分離 | **`:226-240` が throw 点**。freshness の対象パスが `packages/framework/core/tools` を含む広域 set |
| `scripts/no-silent-drop-retention.ts`（175行、新規） | snapshot 書込と列挙済み ULID の削除 | `parseArgs`（`:28`）は dry-run / `--apply` のみ。維持系であり drift 回復ではない |
| `scripts/no-silent-drop-migrate-events.ts`（87行、新規） | 旧 baseline/exemptions → events の一回性移行 | #2338 の移行面 |
| `tests/no-silent-drop/adoption-evidence.json` | registry 着地点 | `currentRevision = fe8c701ba15c0677a4ec18cc3715ff1086318dde`、receipts **23件** |
| `tests/integration/t413-no-silent-drop-ci-adoption.test.ts` | CI 採用の正準 pin | `:181-195` が freshness の **narrow set**（`":(glob)tests/no-silent-drop/**/*.ts"` と `"tests/no-silent-drop-gate.ts"`）と選定理由コメントを持つ。adapter の広域 set と同一意味論の別実装 |

### CI ワークフロー

| ワークフロー | トリガ | 本 intent での所見 |
| --- | --- | --- |
| `.github/workflows/ci.yml:121-157` "No silent drop (trusted base ratchet)" | PR / push / workflow_dispatch | base 解決を3経路で分岐し、40桁小文字 SHA・非全零・`git cat-file -e` を検証。**observed で success**（main 最新 run 31135183415 は全 job success） |
| `.github/workflows/no-silent-drop-evidence-reconcile.yml` | `push: [main]` | **恒久赤の所在**。直近5 run のうち 3 run が failure、全件 `REBIND_NON_IDENTITY_DRIFT`。preflight 失敗は `REBIND_PREFLIGHT_FAILED` / `REBIND_CREDENTIAL_FAILED` / `REBIND_CHECKOUT_FAILED` を step summary へ |
| `.github/workflows/no-silent-drop-retention.yml`（新規、#2338） | 毎週月 03:00 UTC + workflow_dispatch | dry-run で `would write snapshot` を検出したときだけ `nsd-retention-<ts>` ブランチを切って `--apply` → auto-squash-merge PR。**feature PR には混ぜない設計** |

### advisory choice（#2330）

| コンポーネント | 責務 | 本 intent での所見 |
| --- | --- | --- |
| `packages/framework/core/tools/amadeus-advisory-choice.ts`（1567行） | advisory の人間選択 receipt。`parsePending`（`:640-651`）/ `parseStore`（`:659-661`）/ `readStore`（`:681-691`）/ CLI（USAGE `:1516-1520`、dispatch `:1522-1532`） | **CLI verb は `record` / `correct-misattributed` の2つのみ**。schema 1 store からの回復 verb は不在。`:653-657` の設計コメントが「翻訳せず fail-closed hold にする」意図を明文で記す |
| `packages/framework/core/tools/amadeus-orchestrate.ts` | `applyPendingAdvisoryGuard`（`:797-799`） | `if (pending.length === 0) return directive;` の早期 return により、evaluator がもう advisory を raise しない intent では guard 経路自体が走らない |
| `.amadeus-advisory-choice.json`（per-clone ランタイム、gitignored） | pending / receipts の保存面 | observed の clone 内に **6 件**実在。**schema 1 が 5 件・schema 2 が 1 件**（分布表は re-scan 記録を正本とする）。1 clone 内で複数 worktree にまたがって schema 1 が滞留することを実測で確定 |

### degrade 経路の unit 解決（#2358）

| コンポーネント | 責務 | 本 intent での所見 |
| --- | --- | --- |
| `packages/framework/core/tools/amadeus-orchestrate.ts` | `degradeUnitResolutionError`（`:3707-3733`）/ `unitCovered`（`:3746-3760`）/ 単一 unit 解決（`:3807`） | 全被覆アーム（`:3727-3731`）は「unit ディレクトリを作れ」と案内するが、残る仕事が無い状況では実行不能。`unitCovered` は produces の実在のみで判定し §12a Review の記録有無を見ない（#2359 と共有） |
| `tests/integration/t367-degrade-unitname-resolution.test.ts` | 非対称の両側 pin | `:411-420` test 13（multi-unit 全被覆 → refuse）、`:428-437` test 14（単一 unit は covered でもゲートを運ぶ）、`:422-426` コメントが E-OBB2-CG1 を INTENTIONAL と明記。**詰みは multi-unit 限定** |
| 選挙記録 `amadeus/spaces/default/elections/260730-e-obb2-cg1/` ほか（`-cgs13` / `-ras13` / `-res13`） | 裁定の一次記録 | ディレクトリ実在を確認 |
| `amadeus/spaces/default/memory/project.md:287` | `cid:code-generation:c1-degrade-batch-directive-capture` | 逐語で「全 unit covered 後の engine emit は裁定 B（E-OBB2-CG1）どおり fail-closed のため、build 時捕捉が唯一の in-band 経路」 |

### 干渉先

`gh issue list --state open --label bug` → open bug **16 件**（対象3件を含む）。**#2359 は OPEN・未修正**であり、#2385 Q4-B（明示宣言）が課す「宣言受理点を #2359 の hook として空けておく」制約は observed でも有効。

### 区間内で新設されたコンポーネント（患部隣接）

`amadeus-sensor-pr-convergence-report-format.ts`（+165）、`amadeus-session-takeover.ts`（+275）、`amadeus-subagent-observability.ts`（+293）、`amadeus-subagent-stats.ts`（+468）、`core/sensors/amadeus-pr-convergence-report-format.md`（+64）。後2者の `.ts` は #2313 の freshness 広域 set に含まれ、drift の直接原因ファイルである。plugin では `plugins/pr-convergence/` の6ファイルが全新規、`plugins/formal-model-check/` に `stages/tla-authoring.md`（+160）と `tools/tla-registration.ts`（+349）が追加。


## cross-harness resume の対象コンポーネント（260805-cross-harness-resume、履歴、observed `7060956c5`）

本節の file:line はすべて observed `7060956c5617125dd2f4e284957aa180cb306484` 時点。差分 base は `b938898f364160d4b5857e153579b40b5ab18372`（距離 34 commits / 493 files）。全数列挙は `re-scans/260805-cross-harness-resume.md` を正本とする。

### 認可判定

| コンポーネント | 責務 | 本 intent での所見 |
| --- | --- | --- |
| `packages/framework/core/tools/amadeus-caller-authorization.ts`（122行） | `:72` `authorizeMainConductor` — Kimi 呼出元の main-conductor 判定 | `:75` で kimi 以外は無条件 authorized。拒否枝4種（`:85` / `:94` / `:105` / `:108`）が `:117-122` `callerAuthorizationError("unknown")` に畳まれ判別不能。復旧案内なし |
| `packages/framework/core/tools/amadeus-orchestrate.ts` | `:2400` `refuseUnauthorizedKimiCaller` | 消費点5（`:2446` next / `:4543` report / `:5099` park / `:5326` gate-reserve / `:5387` gate-reject） |
| `packages/framework/core/tools/amadeus-state.ts` | `:902` `enforceCallerAuthorization` | `:908-912` で `get` / `count` / `lookup` のみ除外。**`case "park"` `:1024` / `case "unpark"` `:1027` を含む全27語彙をゲート** → in-band 復旧不能（所見A） |
| `packages/framework/core/tools/amadeus-harness.ts` | `:113-123` `detectHarnessType` | `:114-116` の `AMADEUS_HARNESS_TYPE` 最優先が未文書の認可バイパスになる。`kiro-ide` は harness dir `.kiro` のため type `kiro` へ畳まれる |

### セッション carrier

| コンポーネント | 責務 | 本 intent での所見 |
| --- | --- | --- |
| `packages/framework/core/hooks/amadeus-session-start.ts` | `:97` `if (sessionId) writeCurrentSessionId(projectDir, sessionId);` | **`.current-session` の唯一の書き手**。`:88-96` のコメントが「session_id を見るのはこの hook だけ、CLI switch からは供給不能」と明記 |
| `packages/framework/core/tools/amadeus-lib.ts` | `:2170` `writeCurrentSessionId` / `:298` `resolveProjectDirFromHook` | 後者は `:305` marker 検証付き payload cwd → `:308` env → `:317` marker 祖先 → `:322` script path → `:329` known harness dir の5段ラダー |
| `packages/framework/harness/kimi/hooks/amadeus-kimi-lib.ts` | `:236` `establishKimiMainBaseline` / `:281` `clearKimiRoleCarrier`（**いずれも非 export**）/ `:285-286` deny ラッチ書込 / `:704` adapter 入口 | 復旧に使える公開 seam がない。`:704` の `env.cwd ?? projectDir` は raw cwd を採り core hook ラダーと非対称（carrier 分裂） |

### carrier を書かないハーネス面（所見B）

| ハーネス | 実体 | `.current-session` |
| --- | --- | --- |
| `kiro-ide` | `hooks/amadeus-kiro-adapter.ts:261,266,388` が core `amadeus-session-start.ts` を起動するが `session_id` を転送しない | **書かない** |
| `opencode` | `plugins/` 構成、`amadeus-session-start` の参照 0 hit | **書かない** |
| `pi` | `extensions/amadeus-pi-extension.ts:779` `case "session-started"` でネイティブに処理、core hook 不使用 | **書かない** |

### テスト面

| コンポーネント | pin している契約 |
| --- | --- |
| `tests/integration/t365-kimi-reviewer-boundary.integration.test.ts` | 拒否／許可の両面。`:504` / `:536` / `:573` / `:646` / `:669` / `:689` の **substring assert（`"is not the main conductor"`）のみ** — 文言の全文 verbatim ピンはない |
| `tests/integration/t-kimi-adapter.test.ts` | `:413` テスト名 `"the payload cwd wins as the core hook's project dir"` が raw-cwd 挙動を pin。project-dir 解決を変えるなら明示改訂を伴う |
| `tests/.coverage-patch-allowlist.json` / no-silent-drop 台帳 | `authorizeMainConductor` エントリ3件＋同ファイルエントリ。行挿入時は機械 remap＋span 検査＋census 再バインドが該当 |

**復旧手段の不在**: session carrier を修復する verb は存在しない（`amadeus-utility.ts` verb dispatch 全数確認、`session-repair` 系 grep 0 hit）。`doctor` は kimi hook の配線のみを検査し carrier 状態を見ない（carrier 名 grep 0 hit）。

## PR 収束プラグインの対象コンポーネント（260805-pr-convergence-plugin、履歴、observed `8409c2039`）

本節の file:line はすべて observed `8409c2039c5281e533db88a637649276d8bc4a73` 時点。差分 base は `b938898f364160d4b5857e153579b40b5ab18372`（27 commits / 474 files）。全数列挙は `re-scans/260805-pr-convergence-plugin.md` を正本とする。

### plugin 機構を構成する5ファイル

| ファイル | 行数 | 責務 | 本 intent との関係 |
| --- | --- | --- | --- |
| `packages/framework/core/tools/amadeus-plugin.ts` | 1534 | CLI（compose / compose-all / install / drop / doctor / status）、`buildHostSnapshot`、`parseHostStageSeams`（`:258-270`） | host stage 認識面の未着地箇所を所有 |
| `packages/framework/core/tools/amadeus-plugin-compose.ts` | 1574 | manifest parse（`:325-345`）、`inspectPlugin`、`planPluginComposition`、seam / fragment 台帳、drop 再構築、`SEAM_NAMES`（`:74`）、`serializeStageSeams`（`:555`） | seam 機構の正本。拡張の主戦場 |
| `packages/framework/core/tools/amadeus-plugin-activation.ts` | 469 | spec-hash advisory。`:35` verbatim `// The formal-model-check plugin is the sole activation target of this intent.` | **formal-model-check 専用**であり汎用ではない。新規 plugin は対象外 |
| `packages/framework/core/tools/amadeus-plugin-selection.ts` | 157 | 汎用の opt-in 解決（`resolvePluginSelection` `:68-96` が `amadeus/config.json` の `plugin.activation.names` を読む） | 汎用面。新規 plugin もここで選択される |
| `scripts/plugin-projection.ts` | 1105 | パッケージング / harness 投影 / import-closure guard（`:880-946`） | 区間内で唯一 touch された患部（+77行/−1行、#2240） |

`amadeus-plugin-activation.ts` と `amadeus-plugin-selection.ts` の責務差は重要である。前者は参照実装1本に固定された advisory 機構、後者が汎用の opt-in 解決面であり、新規 plugin が乗るのは後者だけである。

### ガード述語を所有するコンポーネント

| コンポーネント | 所在 | 判定 |
| --- | --- | --- |
| per-unit ループ前進ガード | `amadeus-orchestrate.ts` `unitCovered` `:3452-3472` | produces **全件** `existsSync`。承認状態を参照しない（fail-closed） |
| batch 選定 | 同 `firstUncoveredBatch` `:3068-3085` | `unitCovered` を `unitKinds.get(u)` 付きで呼ぶため fail-open を継承 |
| 未被覆 unit 解決 | 同 `nextUncoveredUnit` `:3526-3547` | — |
| 成果物パス解決 | 同 `resolveArtifactPath` `:1897-1919`（per-unit 分岐 `:1916`） | `<record>/construction/<unit>/<owner.slug>/<name>.md` |
| kind 別必須成果物 | `amadeus-graph.ts` `requiredArtifactsForUnit` `:842-849` | `produces_kinds` による絞り込み |
| approve 時ガード | `amadeus-state.ts` `producesArtifactsExist` `:1683-1696`（ANY ループ `:1691-1694`） | **1件でも存在すれば通す** |
| approve 時 kind 別ガード | 同 `kindAwareArtifactsExist` `:1653-1678` | unit を走査し最初に揃った1 unit で true。`:1677` は適用成果物ゼロで true |
| ガードバイパス | 同 `artifactGuardDisabled` `:1529` | `AMADEUS_SKIP_ARTIFACT_GUARD === "1"` |
| ステージ成果物検証 | 同 `verifyStageArtifacts` `:1992-2002` | — |

### センサー実行面

`packages/framework/core/tools/amadeus-sensor.ts` — `:29-31` のコメントが「Sensor outcomes are advisory」と契約を明示し、`:573-574` は無条件 `process.exit(0)`。`severity` の分岐利用は `:271` の表示1箇所のみ。出荷センサーは `packages/framework/core/sensors/*.md` の **8件**（`amadeus-answer-evidence` / `amadeus-linter` / `amadeus-model-completeness` / `amadeus-event-registry-drift` / `amadeus-required-sections` / `amadeus-type-check` / `amadeus-upstream-coverage` / `amadeus-self-scope-consistency`）で、**全件 `default_severity: advisory`**。

### PR 収束のための再利用候補コンポーネント（3件）

| コンポーネント | 所在 | 再利用可能な面 | 制約 |
| --- | --- | --- | --- |
| `parseMergeability` | `scripts/metrics-publication-domain.ts:256-262` | `mergeStateStatus` を mergeable / pending / conflicting へ正規化。`UNKNOWN`→pending、未知値は throw | 現在は metrics 公開ドメイン内の private 関数。canonical 化するなら移設が要る |
| GitHub gateway | `packages/framework/core/tools/amadeus-github-gateway.ts`（1034行） | `versionArgv()` `:112` / `authArgv()` `:116` の runnable / auth readiness、`parseHttpEnvelope` `:247`、`interpretGraphqlResult` `:647` | GraphQL は `amadeus-mirror-project-gateway.ts:79` が argv 配列で渡す既存形。plugin から使うと core への依存が生じ import-closure guard と交差する |
| Quality Repair contribution | `packages/framework/core/tools/amadeus-quality-repair.ts` `QualityRequiredOutputDescriptor` `:125-130` | 「ステージへ必須成果物を宣言する」型そのもの | **未接続**。`compileQualityContribution:242` が非空 `requiredOutputs` を拒否し、消費者は repo 全域で 0 件 |

### 接続点が存在しないことの確認

ステージ本文 **32件**（`packages/framework/core/amadeus-common/stages/**/*.md`）に対する `grep -rniE 'converge|reviewThread|review thread|gh pr |pull request|レビュースレッド|収束'` は **0 hit**、`grep -rn '\bPR\b'` も **0 hit**。`reviewThreads` の実装コード hit も 0（record を除く）。収束スキル（`j5ik2o-gh-pr-converge-loop` / `j5ik2o-gh-pr-resolve-conflicts` / `j5ik2o-gh-pr-review-follow-up`）はハーネス側 `~/.agents/skills/` にのみ実在し、**リポジトリ内に正本を持たない**。
## advisory 人間選択に関わるコンポーネント（260803-advisory-human-choice、履歴、observed `498c3034a`）

| コンポーネント | 責務 | 依存 | 健全性 |
| --- | --- | --- | --- |
| plugin activation evaluator | readinessからadvisory shapeを作る | model-map、対象asset、stage | healthy: 発火済み |
| pending advisory latch | `(plugin, code)` 単位で同一runの再発行を抑止 | activation result | healthyな重複抑止 / at-risk: 人間選択前に消費可能 |
| orchestration router | main / single / per-unit directiveを発行 | activation、stage graph、report | degraded: receipt前提なし |
| directive serializer | advisoryのplugin/code/message/stageを運ぶ | directive schema | at-risk: 選択入力面なし |
| report parser | stage結果をengineへ返す | main / single flag schema | degraded: receipt flagなし |
| presence / gate state | human turnとstage approvalを検証する | audit、reservation、grant | healthyな汎用機構 / advisory意味には不適合 |
| audit event registry | canonical 81 eventの属性・writerを規定 | `amadeus-audit`、docs、drift test | at-risk: advisory固有receiptなし |
| stage protocol §11a | advisoryを人間へ提示し判断させる | conductor | degraded: proseを状態機械が強制しない |
| formal-model-check stage | 承認済み時点で形式モデルを実行する | plugin composition、model-map | healthyな後段実行器 / 上流判断の代替ではない |
| t378 / t381 suites | directive field、3 checkpoint、latchを検証 | integration fixtures | healthyな現行回帰 / receipt面は未被覆 |

候補となるreceipt store、validator、protected writerはまだコンポーネントとして存在しない。後続設計で追加する場合も、activationの重複抑止と人間権限の検証を別責務として保ち、汎用gate承認をadvisory選択へ読み替えない。

## subagent 観測パイプラインの対象コンポーネント（260805-subagent-type-guard、履歴、observed `7060956c5`）

本節の file:line はすべて observed `7060956c5617125dd2f4e284957aa180cb306484` 時点。差分 base は `b938898f364160d4b5857e153579b40b5ab18372`（34 commits / 493 files）。全数列挙は `re-scans/260805-subagent-type-guard.md` を正本とする。

### core コンポーネント

| コンポーネント | 所在 | 入出力 | 状態 |
| --- | --- | --- | --- |
| `normalizeAgentType` | `core/tools/amadeus-lib.ts:4082-4084` | `string \| null \| undefined` → `string` | 稼働。`raw?.trim() ? raw : "unknown"` の空白判定のみ。**所属検査なし** |
| `subagentPurposeLine` | 同 `:4109-4114` | `unknown` → `string`（最大 200 字） | 稼働。escape 正規化 → 初行 → control 除去 → trim → 切詰の固定順 |
| `subagentStartFields` | 同 `:4128-4139` | `ClaudeCodeHookInput` → `Record<string,string> \| null` | **Claude Code では常に `null`**（D-1、`:4129` の `"Task"` 照合）。kimi 経路（tool_name 不在）は正常 |
| `SUBAGENT_DISPATCH_TOOL` | 同 `:4102` | 定数 `"Task"` | **実 payload（`"Agent"`）と不一致** |
| `SUBAGENT_PURPOSE_MAX_LENGTH` | 同 `:4097` | 定数 `200` | 稼働 |
| `CONTROL_CHARS` | 同 `:4107` | 正規表現（module 非 export） | 稼働 |
| `ClaudeCodeHookInput` | 同 `:4687-4707` | 型宣言 | `model` 未宣言。`:4706` の `[key: string]: unknown` により追加は非破壊 |
| `composeSubagentLifetimes` | `core/otel/subagent-lifetime.ts:112` | `readonly JournalRecord[]` → `SubagentLifetime[]` | **休眠**（本番消費者 0、テストのみ）。Agent ID 優先 → 型 fallback（LIFO）でペアリング |
| `SUPPLIED_RESOURCE_KEYS` | `core/otel/resource-suppliers.ts:22-27` | 定数配列（4 キー） | `gen_ai.request.model`（`:24`）は**宣言済み・本番供給 0** |
| `supplyResourceAttribute` | 同 `:49` | `(SuppliedResourceKey, string) → void` | 本番呼出は `core/hooks/amadeus-session-start.ts:148` の `"session.id"` **1 箇所のみ** |
| `recordRuntimeAttrs` | `core/hooks/amadeus-statusline.ts:230-256` | `(projectDir, input) → void` | **休眠**（observability 無効・実体 0 件・読み手 0 件）。書込先 `<telemetryDir>/runtime-attrs.json` |

### hook コンポーネント（emitter）

| hook | 所在 | 発火 seam | 現状 |
| --- | --- | --- | --- |
| `amadeus-log-subagent-start.ts` | `core/hooks/` | Claude Code `PreToolUse{^Task$}` / kimi `SubagentStart` | Claude Code 経路は D-1 + D-2 の二重で**不発**。`:61-72` が emit するフィールドを literal 再構成（t385 対応） |
| `amadeus-log-subagent.ts` | `core/hooks/` | `SubagentStop` 系（Claude Code / codex adapter / kimi） | 稼働。`:50-52` で型・ID・Message を導出、`:68-72` でフィールド組立 |
| `amadeus-statusline.ts` | `core/hooks/` | statusline render | model 読取は稼働するが `runtime-attrs` 書込は休眠 |

### harness コンポーネント（配線）

| ハーネス | subagent 配線 | model 供給 | 座標 |
| --- | --- | --- | --- |
| Claude Code | complete のみ live（`settings.json` に `SubagentStop`）。start は `settings.json.example` のみ | **不在**（明示 `tool_input.model` を除く） | `.claude/settings.json` / `.example` |
| codex | complete のみ（start 配線なし、grep 0 件） | **実在**（`model` を verbatim pipe） | `harness/codex/hooks/amadeus-codex-adapter.ts:349-352` |
| kimi | start / complete 両方（`role-start` / `role-stop`） | 未実測 | `harness/kimi/hooks/amadeus-kimi-lib.ts:625-626` |
| cursor / opencode / kiro / kiro-ide / pi | 未実測 | 未実測 | — |

### registry / doc コンポーネント

| 対象 | 所在 | 契約 |
| --- | --- | --- |
| `SUBAGENT_STARTED` | `core/otel/event-registry.ts:612-623` | required `["Agent Type"]`（`:620`）/ optional `["Agent ID","Purpose"]`（`:621`）/ canonical / category `subagent` / schemaVersion 1 |
| `SUBAGENT_COMPLETED` | 同 `:624-632` | required `["Agent Type"]`（`:629`）/ optional `["Agent ID","Message"]`（`:630`）/ 同上 |
| `audit-format.md` | `core/knowledge/amadeus-shared/audit-format.md:154` | Emitter 欄が `(PreToolUse{Task} / SubagentStart)` — D-1 の同期対象 |

`Purpose`（START）と `Message`（COMPLETE）は**設計上意図された非対称**である。前者は dispatch prompt から導出したラベル、後者は `last_assistant_message` の先頭 200 字であり、registry も別 optional として登録済み。統合は要件化されていない。

### 集計 host の候補比較

| 候補 | audit を読むか | subagent を知るか | 判定 |
| --- | --- | --- | --- |
| `amadeus-runtime.ts summary` | いいえ（`runtime-graph.json` 対象） | いいえ（`Agent Type` / `SUBAGENT` の grep 0 件） | CAP-3 の host に不適 |
| `composeSubagentLifetimes` | はい（`JournalRecord[]`） | はい | **第一候補**（休眠 seam の配線で足りる） |
| `metrics-instruments.ts:102` | いいえ（metric 属性） | いいえ（model 別のみ） | 別軸 |
| `amadeus-norm-metrics.ts` / `amadeus-loop-monitor-runtime.ts` | はい | いいえ | 実装様式の先例（reuse inventory） |

### 観測量（audit 実測、Architect 再計測 2026-08-06）

| 指標 | 値 |
| --- | --- |
| `SUBAGENT_STARTED` | 60（1 intent のみ、型は `coder` 33 / `explore` 27） |
| `SUBAGENT_COMPLETED` | 974（移動値 — 本セッション中も追記される） |
| `Agent Type` distinct | 200（persona 8 / 組込型 8 / 許可集合外 184） |
| イベント内訳 | persona 416 / 組込型 297 / 許可集合外 261（和は 974 と一致） |
## semi 再定義と autonomy 起動宣言の対象コンポーネント（260805-semi-redefine-autonomy-f、履歴、observed `2f255bc69`）

本節の行数・行番号はすべて observed `2f255bc6993316f1a271bcd932fabf773096494e` 時点の実測（`wc -l` / `grep -n`、canonical 側 `packages/framework/core/`）。差分 base は `b938898f364160d4b5857e153579b40b5ab18372`（区間 19 commits / 464 files）。

### 焦点コンポーネント

| コンポーネント（行数） | 位置 | 本 intent での役割 |
| --- | --- | --- |
| `amadeus-intent-autonomy.ts` (961) | core/tools | autonomy ドメイン。`authorizeInteraction` `:501`、`createGateAutoDecision` `:666`、`resolveAutoDecision` `:699`。**再定義の主患部** |
| `amadeus-intent-autonomy-runtime.ts` (800) | core/tools | 裁定ルーティング。`selectDecision` の分岐 `:522-524`、`applySemiDecision` `:546-554` |
| `amadeus-intent-autonomy-production.ts` (900) | core/tools | 本番結線。`readProductionAutonomyProjection` `:133`、mode 分岐 `:417`、`prepareNonFullCommand` `:382-395` |
| `amadeus-intent-autonomy-replay.ts` (175) | core/tools | canonical 永続化。`replayIntentAutonomyAudit` `:123`、`createAuditIntentAutonomyRepository` `:138` |
| `amadeus-stop.ts` (1020) | core/hooks | cap / budget / carve-out。`stopContinuationDefaultCap` `:147-151`、`stopBudgetMode` `:157-160`、`isFullyAutonomousIntent` `:167-178` |
| `amadeus-bolt.ts` (1312) | core/tools | autonomy CLI 面。dispatch テーブル `:1212-1221`、`handleSetAutonomy` `:1051-1092` |
| `amadeus-orchestrate.ts` (5544) | core/tools | 起動フラグ parser `:1044-1074`、read-only 梯子 `:1014-1016`、`birthPrintDirective` `:2617-2646` |
| `amadeus-utility.ts` (6327) | core/tools | `--status` の autonomy 表示。`readStatusAutonomy` `:323-334`、`renderAutonomyStatus` `:336-350` |
| `amadeus-statusline.ts` (325) | core/hooks | **autonomy 表示を持たない**（`grep -i autonom` → 0 hit）。セグメント組み立て `:203-206` |
| `amadeus-directive.ts` | core/tools | `intent_autonomy_mode?: "semi" \| "full"` `:97`、検証器 `:606` |

### 区間内で追加されたコンポーネント（本 intent の焦点に隣接）

`git diff --name-only --diff-filter=A b938898f3 2f255bc69` による実測（`packages/framework/core/tools` / `packages/framework/harness` 限定）:

| 新規ファイル（行数） | 隣接性 |
| --- | --- |
| `amadeus-autonomy-review.ts` (1273) | auto-decision の **unreviewed レビュー面**。梯子後段2段（solo-election / agent-recommendation）が生む `reviewState: "unreviewed"` の受け皿。`semi` を梯子へ載せると未レビュー件数が増えるため直接影響する |
| `amadeus-autonomy-review-production.ts` (484) | 同上の本番結線 |
| `amadeus-harness-registry.ts` | ハーネス登録の集約。docs/annex 横展開の対象面に関係 |
| `amadeus-intent-completion.ts` | ワークフロー完了判定 |
| `packages/framework/harness/registry.ts` | ハーネス registry 正本 |

これら5ファイルは **base 時点では存在しなかった**。特に `amadeus-autonomy-review*.ts`（計 1757 行）は、本 intent が `semi` を梯子へ載せる場合の下流受け皿であり、requirements で明示的に扱うべき隣接面である。

### `amadeus-bolt.ts` の autonomy サブコマンドは8種（5種ではない）

dispatch テーブル `:1212-1221` の実測: `set-autonomy` `:1213` / `preview-autonomy` `:1214` / `decide-question` `:1215` / `observe-quality` `:1216` / `resume-quality` `:1217` / `list-auto-decisions` `:1218` / `get-auto-decision` `:1219` / `review-auto-decision` `:1220`。

本文書の 260804 履歴節は「サブコマンド5種追加 — `set-autonomy`（`:1117`）…」と記すが、これは observed `b938898f3` 時点の正しい記述であり書き換えない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）。区間内で `:961` 以降が **+96 行シフト**し、`get-auto-decision` / `review-auto-decision` の2種が追加されたため、observed `2f255bc69` では上記8種・上記行番号が正である。

なお `amadeus-intent-autonomy.ts (961)` の行数記述は履歴節と observed で**一致**しており、鮮度上の問題はない。

### 構成規模のデルタ

| 指標 | 260804 断面（base `b938898f3`） | 本断面（observed `2f255bc69`） | 差 |
| --- | --- | --- | --- |
| core tools の `.ts` 本数 | 116 | **119** | +3 |
| `tests/**/*.test.ts` 本数 | 927 | **941** | +14 |
| 最大テスト番号 | — | **t439** | 後続 Bolt は t440 以降 |

測定コマンド: `ls packages/framework/core/tools/*.ts | wc -l` / `find tests -name '*.test.ts' | wc -l` / `ls tests/{unit,integration,e2e} | grep -oE "^t([0-9]+)" | sed 's/t//' | sort -n | tail -3`（いずれも observed で実行）。

## phase boundary approval の対象コンポーネント（260804-phase-boundary-approval、履歴、observed `b938898f3`）

本節の file:line はすべて observed `b938898f364160d4b5857e153579b40b5ab18372` 時点。差分 base は `9458bbda85eb7257310a80882b4858dc6ce3d1fc`（距離 134 commits / 1041 files）。全数列挙は `re-scans/260804-phase-boundary-approval.md` を正本とする。core tools は **103 → 116**。

> **行ピンの再解決（2026-08-14 追記、260813-lifecycle-guard-runtime）**: 下表の `:379-396` / `:3471-3472` / `:3484` は本節が宣言する observed `b938898f3` 時点の値であり、そのまま保存する。observed `89532174c` では `verifyPhaseCheckArtifact` 定義 = **`:392`**、approve 経路の phase gate = **`:4008-4009`**、checkbox 書込 = **`:4021`**（順序と fail-closed 性は不変）。core tools は **132 ファイル**（`ls packages/framework/core/tools/*.ts | wc -l`）。現在断面は本ファイル冒頭「ライフサイクル進行ガードの構成要素棚卸し」節を参照。

### 本 intent が直接触れるコンポーネント

| コンポーネント | 位置 | 責務 | 区間内の変化 |
| --- | --- | --- | --- |
| `verifyPhaseCheckArtifact` | `amadeus-state.ts:379-396` | phase-check artifact の存在検査。不在なら `error()` で exit（fail-closed）。`amadeus-jump.ts` へ export | **無変更** |
| `approveUnderLock` の phase gate | `amadeus-state.ts:3471-3472` | 次が別 phase または最終なら guard を発火。checkbox 書込 `:3484` より前 | 無変更 |
| governance protocol §13 | `stage-protocol-governance.md:14-18` | 「いつ検証するか」の規約 | **`f7273b9ab`（#2166）で是正済み** |
| `phase_boundary` 算出 | `amadeus-orchestrate.ts:2160-2166` | phase 境界を検出し directive へ載せる | 新設 |
| `routeMainWorkflowDirective` | `amadeus-orchestrate.ts:2170-2200` | autonomy を同一 directive へ射影（`:2193-2194`） | 新設 |
| harness annex（8本） | `harness/<name>/skills/amadeus/SKILL.md` ほか | conductor が読む承認手順 | **pi のみ phase-check 記述あり（`:98-103`）** |

### 新規コンポーネント — core tools 14件

| コンポーネント | 位置 | 責務 |
| --- | --- | --- |
| `amadeus-approval-authorization.ts` (80) | core/tools | 承認権限の分類（`classifyApprovalAuthority` `:20-48` → `normal` / `targeted-human` / `invalid`）と承認サブプロセス出力の解釈（`parseApprovalProcessResult` `:55-80`、単一 JSON 行 `{"kind":"approved"}` のみ受理）。**`amadeus-grant-authorization.ts` の後継** |
| `amadeus-goal.ts` (582) | core/tools | goal 定義と receipt のドメイン |
| `amadeus-goal-reconciliation.ts` (883) | core/tools | goal lineage の突合（`ACHIEVED` / `DEVIATED` / `UNVERIFIED`）。workflow completion の前提条件（#2171） |
| `amadeus-intent-autonomy.ts` (961) | core/tools | Intent 単位の autonomy ドメイン（`none` / `semi` / `full`） |
| `amadeus-intent-autonomy-production.ts` (900) | core/tools | 本番結線。`productionStageAutonomy` を orchestrate へ供給（`amadeus-orchestrate.ts:2183` から呼出） |
| `amadeus-intent-autonomy-runtime.ts` (800) | core/tools | autonomy ランタイム |
| `amadeus-intent-autonomy-replay.ts` (175) | core/tools | autonomy replay |
| `amadeus-loop-monitor.ts` (795) | core/tools | 非生産的な修復ループの検出ドメイン |
| `amadeus-loop-monitor-runtime.ts` (816) | core/tools | ループ検出ランタイム |
| `amadeus-loop-monitor-replay.ts` (553) | core/tools | ループ検出 replay |
| `amadeus-quality-repair.ts` (838) | core/tools | 品質不合格の修復ドメイン。`REPAIR_STALLED` で park |
| `amadeus-quality-repair-runtime.ts` (951) | core/tools | 修復ランタイム |
| `amadeus-quality-repair-replay.ts` (190) | core/tools | 修復 replay |
| `amadeus-pi-doctor.ts` (392) | core/tools | pi ハーネスの診断 |

**削除**: `amadeus-grant-authorization.ts`。本文書の同コンポーネントに対する過去記述はすべて observed と不整合である。

### 新規コンポーネント — pi ハーネス

| コンポーネント | 位置 | 責務 |
| --- | --- | --- |
| `amadeus-pi-extension.ts` (1313) | `harness/pi/extensions/` | Pi 側 extension 本体。`package.json` の `pi.extensions` が `./dist/pi/.pi/extensions/amadeus.ts` を宣言 |
| `amadeus-pi-driver.ts` (659) | `harness/pi/drivers/` | 認証付き子プロセス実行ドライバ |
| `amadeus-pi-guardian.ts` (377) | `harness/pi/drivers/` | ライフサイクル gate アダプタ |
| `amadeus-pi-replay-store.ts` (336) | `harness/pi/drivers/` | replay 永続化 |
| `amadeus-pi-driver-contract.ts` (231) | `harness/pi/drivers/` | driver 契約の型と検証 |
| `harness/pi/manifest.ts` (97) | `harness/pi/` | ハーネス manifest |
| `harness/pi/skills/amadeus/SKILL.md` (200) | `harness/pi/skills/` | conductor annex。**8ハーネス中唯一 `phase_boundary` → artifact → approval を記述**（`:98-103`） |

### 新規コンポーネント — scripts 6件

| コンポーネント | 責務 |
| --- | --- |
| `scripts/harness-manifest.ts` | ハーネス manifest の生成・検査 |
| `scripts/no-silent-drop-evidence.ts` | no-silent-drop evidence の生成 |
| `scripts/no-silent-drop-evidence-adapter.ts` | 同アダプタ |
| `scripts/pi-conformance-evidence.ts` | pi 適合性証跡の生成 |
| `scripts/pi-live-rpc.ts` | pi live RPC |
| `scripts/pi-package.ts` | pi パッケージング |

（`scripts/manifest-types.ts` は base 時点で既存。Developer scan の「7本追加」を6本へ訂正）

### 責務が更新されたコンポーネント

- **`amadeus-config.ts`（771行）**: canonical key がフラットキーからドットパス6本へ再編（`:59-64` 型宣言、`:472` 以降の `AMADEUS_CONFIG_REGISTRY` が実体）。各エントリが `legacy: { key, valueConversion }` を持ち、旧キーは移行入力としてのみ解釈される。`plugin.activation.names` のみ `layers: ["project"]`。
- **`amadeus-state.ts`**: `approve` / `reject` が `--target-intent-id` / `--presence-reservation-id`（対で必須、`:3684-3685`）と `--defer-workflow-completion`（最終 in-scope stage 限定、`:3468-3470` / `:3686`）を受けるようになった。
- **`amadeus-bolt.ts`**: サブコマンド5種追加 — `set-autonomy`（`:1117`）/ `preview-autonomy`（`:1118`）/ `decide-question`（`:1119`）/ `observe-quality`（`:1120`）/ `resume-quality`（`:1121`）。
- **`amadeus-orchestrate.ts`**: `handleAuthorizedApprovalReport`（`:4445`、dispatch `:4728`）が `amadeus-approval-authorization.ts` の分類結果を消費する。
- **`amadeus-directive.ts`**: 6フィールド追加（`phase_boundary` / `next_stage` / `intent_autonomy_mode` / `autonomy_auto_approve` / `intent_grant_id` / `quality_repair`）。

## no-silent-drop evidence 再バインドの対象コンポーネント（260804-evidence-revision-rebind、履歴、observed `9458bbda8`）

本節の file:line はすべて observed `9458bbda85eb7257310a80882b4858dc6ce3d1fc` 時点。全数列挙は `re-scans/260804-evidence-revision-rebind.md` を正本とする。

| コンポーネント | パス | 本 intent での役割 |
| --- | --- | --- |
| evidence registry（正本） | `tests/no-silent-drop/adoption-evidence.json` | `currentRevision` 24（top 1 + receipt 23）/ `evidenceDigest` 23 を保持 |
| evidence manifest | `tests/no-silent-drop/adoption-evidence-manifest.json` | `testedRevision` 24 / `artifact.sha256` 25 を保持 |
| 成果物レコード | `tests/no-silent-drop/evidence/adoption-runs.json` | run 25 件の `testedRevision` を保持 |
| registry 検証器 | `tests/no-silent-drop/repository-adoption.ts` | `validateEvidenceRegistry` — receipt revision（`:182`）と digest（`:183-187`） |
| evidence 検証器 | `tests/no-silent-drop/repository-adoption-evidence.ts` | manifest/entry/run の revision（`:197` / `:268` / `:360`）と `canonicalBinding`（`:333-351`） |
| ゲート CLI | `tests/no-silent-drop-gate.ts` | `:35` stdout JSON 一本。書込 API 0 件 |
| ゲートエンジン | `tests/no-silent-drop/engine.ts` | `:49` `Mode` 4種（`check` / `census-evidence` / `approve-evidence` / `baseline-candidate`） |
| bootstrap 検証 | `tests/no-silent-drop/bootstrap.ts` | `:331` postRevision 等値 / `:427-428` preRevision 到達性 / `:493-495` fallback 分岐 |
| bootstrap provenance | `tests/no-silent-drop/bootstrap-provenance.json` | 導入コミット `7c29e33f7` 以降未更新。candidate digest 乖離・postRevision 不在 |
| 統合検査 | `tests/integration/t413-no-silent-drop-ci-adoption.test.ts` | `:151-174` の到達性・digest・鮮度 assertion |
| 併存検査 | `tests/integration/no-silent-drop-repository-adoption.test.ts` | 検証器の単体検査。write 19 件はすべて `mkdtempSync` 由来の temp root 宛 |
| CI 集約 | `.github/workflows/ci.yml` | `:893-906` `ci-success`（唯一の必須チェック） |

ゲート実装の `.ts` は **8ファイル**（上表の gate / engine / bootstrap / repository-adoption / repository-adoption-evidence + `ast-scan.ts` / `ledger.ts` / `model.ts`）で、**全8ファイルの書込 API 出現数が 0**（Architect が observed で独立再計算）。台帳を書くコンポーネントは棚卸しに存在しない。

## state integrity の対象コンポーネント（履歴: 260803-state-integrity、2026-08-03、observed `6c15af23a`）

本節の file:line はすべて observed `6c15af23a` 時点。全数列挙は `re-scans/260803-state-integrity.md` を正本とする。

> **測定 ref の訂正（Step 1 preflight の後追い実施）。** 本 intent の RE は、ステージ Step 1 の preflight（差分リフレッシュ前に trunk を統合する）を**当初スキップしたまま**走った。preflight は事後に是正パスとして実施され、observed はその統合後の HEAD `6c15af23a` である。統合した 6 コミットは患部ソース 6 ファイルを **1 行も変更していない**（`git diff --stat 498c3034a..origin/main -- packages/framework/core/tools/{amadeus-lib,amadeus-state,amadeus-audit,amadeus-jump,amadeus-utility,amadeus-bolt}.ts` が空出力・exit 0。Architect が独立に再実測）。したがって本節の行番号・引用はいずれも preflight 前後で不変である。経緯の全文は `re-scans/260803-state-integrity.md` §実行メタデータ。

| コンポーネント | 所在 | 責務 | health |
| --- | --- | --- | --- |
| audit lock reaper | `amadeus-lib.ts:6284-6331`（`liveOwnerMayBeReaped:6274-6282`） | stale lock の検出と CAS steal | **不健全（S1-FATAL 相当）** — 分岐 B の CAS 後検証が構造的に不活性。6/6 の run で無音の相互排他破れを実測 |
| lock acquire finalize | `amadeus-lib.ts:6337-6356` | stamp 書込と acquire の成否確定 | **不健全** — `:6345` の fail-open が stamp なし live lock を恒久化。唯一の決定的な分岐 A 経路 |
| lock owner stamp | `writeOwnerStamp:6013` / `readOwnerStamp:6060` | 所有者 PID と `startedAtMs` の記録 | **不完全** — acquire 時 1 回のみで heartbeat 経路がなく、健全な長時間 holder と wedge holder が区別不能 |
| CAS 検証 `stampMatches` | `amadeus-lib.ts:6142-6154` | steal の後段検証 | **非対称** — 分岐 A 用（`:6144-6152`）は入口述語の再評価、分岐 B 用（`:6153-6154`）は必ず通過する |
| reap mutex | `acquireReapMutex:6241-6269` | steal の直列化 | **健全** — 勝者は 1 プロセスに限定される。欠陥は入口判定側にある |
| `withAuditLock` depth counter | `amadeus-lib.ts`（`:6520-6521` で `AuditLockAcquireError`） | 同一 identity の再入許可 | **健全** — nested-append の自己 EEXIST を防ぐ（`amadeus-audit.ts:429-433` の設計意図どおり機能） |
| `auditLockIdentity` | `amadeus-lib.ts:5960-5966` | bucket 決定 | **不整合** — 同一 state file を per-intent と workspace sentinel の 2 bucket で保護する呼び出し点が併存（code-derived、未実測） |
| `withLockedIntentRegistry` | `amadeus-lib.ts:2289` | `intents.json` の保護 | 意図的に workspace スコープ。bucket 統一を採る場合は「registry ロック」と「state file ロック」の分離が必要 |
| state CLI ロック取得点 | `amadeus-state.ts` 15 箇所 | state file の RMW 保護 | per-intent 4 件（`:1079`、`:1444`、`:5157`、`:5359`）／ workspace 8 件。bucket 判定は callback 閉じ行で行う |
| `amadeus-jump.ts` jump handler | `:370` → `:627` | ステージジャンプの state 更新 | **UNLOCKED** — ロックプリミティブを import していない。`:565` で `Completed` を書く |
| `amadeus-bolt.ts` state RMW | `:872`→`:889`、`:927`→`:954` | Bolt 進行の state 更新 | **UNLOCKED** — 同上 |
| `handleScopeChange` | `amadeus-utility.ts:5141-5299` | スコープ変更 | **UNLOCKED** かつ `Completed` の**独自 inline コピー**（`:5236`→`:5239`）を持つ |
| `resyncOneIntent` | `amadeus-lib.ts:5830-5891` | intent の派生フィールド再同期 | **UNLOCKED** — `rebuildDerivedPlanFields:5784` 経由で `Completed` を書く。**新規所見**。`NSD003_FUNCTIONS` の追跡対象でもある |
| `countCheckboxes` | `amadeus-lib.ts:5669` | `[x]` の生カウント | 定義 R の供給元。EXECUTE/SKIP suffix に対して定義盲目 |
| `rebuildDerivedPlanFields` | `amadeus-lib.ts:5781-5784` | EXECUTE 実効の完了数と `Total Stages` を導出 | 定義 E の供給元・**唯一の共有書き手**。統一の受け皿として既存 |
| `approvalNextStateIssue` | `amadeus-state.ts:3377` | approve の fail-closed 検証 | **検証劇場** — 書き手と同じ定義 R で再計算するため乖離検出が構造的に不可能（repo `Forbidden` 該当） |
| state 初期化テンプレート | `amadeus-utility.ts:4433` / `:4513` / `:4568` | `Completed` の seed 値 | 定義 G の供給元。graph の initialization 段数を使う第 3 の定義 |
| `requireChanged` 基盤 | `amadeus-lib.ts:5660-5667`（呼び出し 19 箇所） | text mutation の not-found を throw | **健全・新設**（`7c29e33f7`）。#1875 の是正はこの規律の上に載る |
| no-silent-drop gate | `ci.yml:154`、`tests/no-silent-drop/ast-scan.ts`、`baseline.json` | NSD001/002/003 の検出 | 健全だが**本 intent 最大の CI リスク源** — ロックの catch 編集で再 fingerprint され NSD001 が発火する |

### 依存関係上の注意

- `amadeus-jump.ts` と `amadeus-bolt.ts` は現在ロックプリミティブを一切 import していない。これらの UNLOCKED RMW をロックする判断は**新規依存の導入**にあたる。
- `packages/framework/core/otel/fatal-latch.ts:99` は削減予算 `(5, 50)` = 250 ms で bare acquire する。lock 予算に関する変更はこの呼び出し点の余裕にも影響する。
- 各 core tool ファイルは 12 個のコミット済み生成コピー（7 dist + 5 self-install）を持ち、いずれのパッチも全面再生成を強制する。

## registry drift guard の対象コンポーネント（260802-registry-drift-guard、履歴、observed `64b44a9f8`）

| コンポーネント | 責務 | 依存 | 健全性 |
| --- | --- | --- | --- |
| state CLI dispatcher | verb→handler配送、未知verb診断 | handler群、`error()` | at-risk: dispatch 33 vs表示30 |
| stage schema validator | authored fieldのclosed-world検証 | `REQUIRED_FIELDS`、`OPTIONAL_FIELDS` | healthy実装 / at-risk公開registry不在 |
| frontmatter parser/emitter | YAML subsetのparse/emit | schema型、`FIELD_ORDER` | healthy: accepted集合25と一致 |
| authoritative stage spec | field型・制約の規範 | schemaとの同期宣言 | degraded: 9 field欠落、`when`矛盾 |
| EN/JA Field reference | 判断を要するfieldの利用解説 | authoritative spec | healthyな意図的要約 / at-risk完全性registry不在 |
| registry extraction helper（候補） | source/docsから集合抽出 | textのみ | 新設候補。pure・空抽出拒否が必要 |
| registry comparator（候補） | 双方向差分・cardinality・duplicate | 抽出結果 | 新設候補。event registry先例を再利用 |
| CI change detector | 変更path→test tier | shell case registry | degraded: 対象docs-only変更をfull testへ送らない |
| packaging/promote pipeline | core正本→7 dist→5 root face | `scripts/package.ts`、promote-self | healthy:既存drift guardあり |
| registry guard tests（候補） | live file一致 + tamper negative | 上記pure helper、fixture text | 新設候補。unitを中心にCI route検証を追加 |

## scope-grid 面間同期の対象コンポーネント（260802-scope-grid-face-sync、履歴、observed `47574fbab`）

- 判断: 新規コンポーネントの新設は見通しにない。対象は既存の 3 グループ — データ 10 ファイル（grid 5 面 `<face>/tools/data/scope-grid.json` + prose `amadeus-self-feature.md` 4 面 / `amadeus-self-document.md` 4 面 / `amadeus-self-refactor.md` 4 面）、検査機構（センサー正本 `packages/framework/core/tools/amadeus-sensor-self-scope-consistency.ts` + manifest + byte 一致の 5 面コピー）、周辺ガード（`scripts/promote-self.ts` / `packages/framework/core/tools/amadeus-graph.ts` / `.github/workflows/ci.yml:243-255`）。テスト側は `tests/integration/t-self-scope-consistency-sensor.test.ts` / `tests/unit/t370-promote-self-scopegrid-order.test.ts` / `t93` / `t89`。患部一覧は `re-scans/260802-scope-grid-face-sync.md` を正本とする。

## 2026-08-03 差分更新 — Issue #2018 projection parity 修復

- **healthy** — neutral packaging: `scripts/package.ts`／`plugin-projection.ts` は `dist/plugins/<name>/` に7 faceのbundleを出し、compile-visible harness treeを0-plugin baselineに保つ。
- **degraded** — self-install projection: Claude 58 trackedに対しCodex／Cursor／OpenCode／Kimiは0 tracked。`promote-self` は既存plugin surfaceの保全だけを行い、欠損を作らない。
- **degraded** — runtime compose／runner-gen: startupが未追跡surfaceを生成し、Codexでは非正規 `.codex/skills` まで作る。Codex manifest／emitが定める `.agents/skills` との契約違反である。
- **missing** — git-clean E2E: commit済みprojectionから起動し、初回利用可能性とstartup後cleanを5 self-install面で検証する境界テストがない。Kiro 2 faceはpackage-only検査で扱う。

## formal-model-check 複数モデル化の対象コンポーネント（260801-tla-multi-model、履歴、observed `33e196b8`）

- 判断: 新規コンポーネントの新設は見通しにない。対象は既存 plugin 内の 6 面 — model-map スキーマ（`plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts` + canonical コピー `packages/framework/core/tools/`、byte-identical）、loader（`tla-model-loader.ts` / `tla-model-loader-internal.ts`）、arm（`tla-arm.ts`）、toolchain（`tlc-toolchain.ts` / `fs-tlc-toolchain.ts` / `tlc-spawn-planner.ts`）、CI ポート（`node-ci-model-check-port.ts` / `ci-model-check-*.ts` / `run-skeleton-ci.ts` / `run-model-check-diagnostic.ts`）、run 系（`run-model-check*.ts`、byte-pin `:118-123`）。加えて `specs/tla/`（model-map.json + 4 モジュール）、stage doc（`stages/formal-model-check.md`）、`.github/workflows/ci.yml:508-564`。患部一覧は `re-scans/260801-tla-multi-model.md` を正本とする。

## no-silent-drop の対象コンポーネント（260801-silent-drop-gate、履歴、observed `d72f60b5a`）

| コンポーネント | 状態 | 責務／所見 |
| --- | --- | --- |
| `tests/callsite-guard.ts` | healthy / 再利用先例 | authored source census と shrink-only allowlist。現行 root は core + scripts（`:61`）のため新 gate の harness root は別途明示が必要 |
| `tests/complexity-gate.ts` | healthy / 再利用先例 | 外部 tool、baseline、typed failure、注入 seam |
| CI lint job | healthy / 拡張点 | `.github/workflows/ci.yml:93-143`。既存静的 gate の直列 blocking boundary |
| no-silent-drop CLI | 未実装 | 設定検証、完全走査、typed diagnostic、exit code の所有者 |
| AST rule set | 未実装 | 3 shape を独立 rule ID で分類 |
| census normalizer | 未実装 | repo-relative path と AST node identity、生成物／fixture 除外 |
| baseline ratchet | 未実装 | 既存違反の shrink-only 債務台帳 |
| exemption validator | 未実装 | 非空理由と直近1 node の intentional drop 台帳 |
| `persistBlocked` | at-risk | `amadeus-mirror-executor.ts:188-196` が `StateResult` を破棄 |
| `setCheckbox` / `setStageSuffix` | at-risk | `amadeus-lib.ts:5399-5429` が非一致を成功相当の文字列へ潰す |
| state resync / plugin compose | healthy / regression-only | #1963 の section・graph 失敗を typed outcome と exit 1 へ昇格済み |

新規 gate は runtime コンポーネントへ依存させず、runtime 2修正は各所有モジュール内で結果消費を直す。これにより静的検出の責務と実際の失敗伝播を分離できる。

## kimi bootstrap デッドロック修正の対象コンポーネント（260801-kimi-bootstrap-deadlock、履歴、observed `861688c31`）

- 判断: 新規コンポーネントなし。対象は既存3面 — core session-start hook（`packages/framework/core/hooks/amadeus-session-start.ts`）、認可（`packages/framework/core/tools/amadeus-caller-authorization.ts`）、kimi harness ロール管理（`packages/framework/harness/kimi/hooks/amadeus-kimi-lib.ts`）の欠陥修正のみ。区間で到着した otel 基盤拡張（resource-core / span-context 等）の目録化は本 intent のスコープ外（bugs-only）。患部一覧は `re-scans/260801-kimi-bootstrap-deadlock.md` を正本とする。

## CG 計画整合ガードの対象コンポーネント（260801-cg-plan-guard、履歴、observed `cb809c4de`）

- 判断: 新規コンポーネントなし — 既存3モジュール（orchestrate/runtime/lib）内のガード関数追加と、audit SWARM イベントの読み手追加。目録は `re-scans/260801-cg-plan-guard.md` を正本とする。

## オープンバグ一括修正バッチ第5弾の対象コンポーネント（260801-open-bug-batch-5、履歴、observed `c49e385ac`）
## formal-verif 価値チェーンの対象コンポーネント（260731-formal-verif-value-chain、履歴、observed `da51af375`）

file:line はすべて HEAD `16486d3c` 断面の実測。3 Issue が触るコンポーネントを所有境界つきで列挙する。

| コンポーネント | 所在 | 規模 | 役割 | 触る Issue |
| --- | --- | --- | --- | --- |
| plugin compose エンジン | `packages/framework/core/tools/amadeus-plugin-compose.ts` | 1,488 行 | manifest 解析（`:330-334`）、`PluginManifest` 型（`:105-110`）、host 書込集合 `composeWriteSet`（`:1021`） | #1829 |
| plugin CLI | `packages/framework/core/tools/amadeus-plugin.ts` | 884 行 | `compose` / `drop` / `install`、host root 解決（`:377-380`）、staging root（`:381` `PLUGIN_SOURCE_DIR_NAME` / `:393-395`） | #1829 / #1738 |
| plugin projection | `scripts/plugin-projection.ts` | — | 正本 → `dist/` の全ファイル走査（`:158` `discoverPluginSources` / `:169-172`）、`.json`/`.ts` verbatim（`:238-241`）、prefix `plugins/<name>/`（`:129`） | #1829（無改修で通る） |
| activation advisory 判定 | `packages/framework/core/tools/amadeus-plugin-activation.ts` | 295 行 | 3値判定 + 文面生成（`:209` / `:211`）、公開口 `:272` `activationAdvisoryForHost`、compose ゲート `:230` 近傍 | #1738 |
| engine 発火点 | `packages/framework/core/tools/amadeus-orchestrate.ts` | — | `:1293` `ACTIVATION_ADVISORY_STAGE`、`:1306` ガード、`:1307-1308` stderr 出力 | #1738 |
| model-map スキーマ | `packages/framework/core/tools/amadeus-formal-verif-model-map.ts` | — | パス定数（`:49-51`）、`exactObject(["implPath","sha256"])`（`:158`）、境界検査（`:161`）、ソート/一意（`:169`）、`exactObject(["cfg","entries","model","schemaVersion"])`（`:186`） | #1510 |
| model-completeness センサー | `packages/framework/core/tools/amadeus-sensor-model-completeness.ts` | — | `MODEL_UNCHANGED` 拒否（`:650-659`）、更新本体 `:691` `updateModelMapInternal`、公開 API `:729`、CLI 分岐 `:778-779` / `:790` | #1510 |
| センサー manifest | `.claude/sensors/amadeus-model-completeness.md` | — | `matches`（`:8`）、更新手順（`:37`）、MODEL_UNCHANGED 拒否の記述（`:39-41`） | #1510 |
| TLA source loader | `scripts/formal-verif/tla-model-loader-internal.ts` | — | SOURCE_DRIFT 4分岐（`:221` / `:224` / `:229` / `:232`）、消費側 `:239` `loadVerifiedTlaSourceInternal`（`:236-237` internal/test-only seam 注記） | #1510 |
| 実行器 群 A | `scripts/formal-verif/` 16 本 | 最大 `fs-tlc-toolchain.ts` 98,472 B | `run-model-check.ts` の推移閉包。外部依存は `canonical.ts:1-5` の1本のみ | #1829（移設対象） |
| 実行器 群 B | `scripts/formal-verif/` 7 本 | — | CI 専用ラッパ。`ci.yml:584` / `:600` から消費 | #1829（帰属は要裁定） |
| 実行器 群 C | `run-model-check-diagnostic.ts` | 1 本 | 診断 CLI。閉包は群 A + 自身 | #1829（帰属は要裁定） |
| 実行器 群 D | `scripts/formal-verif/` 30 本 | — | どの CLI からも到達不能。テストからは広く参照（`provenance.ts` 14 件 / `execution-evidence.ts` 10 件） | #1829（削除範囲は要裁定） |
| CI ジョブ | `.github/workflows/ci.yml:545` | 約 100 行 | `workflow_dispatch` 限定（`:547`）、`run`（`:584`）/ `verify`（`:600`） | #1829 |
| plugin 正本 | `plugins/formal-model-check/` | 3 点 | `plugin.json` / `README.md` / `stages/formal-model-check.md`。`tools/` 不在 | #1829 |

### 新規モデル題材の候補コンポーネント — mirror lifecycle（#1738）

`amadeus-mirror*.ts` = **25 ファイル / 12,174 行**。骨格は次の2本に閉じており、**model-map entries の正準 impl 集合の第一候補**になる。

| コンポーネント | 行数 | 役割 |
| --- | --- | --- |
| `amadeus-mirror-types.ts` | 608 | 語彙の集中点。有限ドメイン10種を全列挙可能（Mode 3 / Operation 3 / Boundary 6 / FailureClass 14 / ReceiptStatus 7 / MutationEffect 3 / PhaseKey 5 / ProjectSyncState 3 / ProjectMutation 2 / RegistryStatus 4） |
| `amadeus-mirror-state-reducer.ts` | 823 | `MirrorTransition` union（`:55`、inline 18 種 + `:113` `ProjectSyncTransition` 3 種 = 計 21）、終端4（`:127-132`）、ガード4本（`:692-715`）、統合口 `:814` `reduceMirrorState`、上限 `:42` `MAX_RECEIPTS = 1000` |

周辺（モデル化の直接対象外だが遷移を駆動する）: `amadeus-mirror-state-codec.ts` 1,946 / `amadeus-mirror-executor.ts` 1,562 / `amadeus-mirror-lifecycle.ts` 1,272 / `amadeus-mirror-coordinator.ts` 1,004（`:230-244` `operationForBoundary`）/ `amadeus-mirror-project-reconciliation-reducer.ts`（`:45-48` `ProjectSyncTransition` の3構成子）。

### テスト・台帳コンポーネント

| 面 | 実測値 |
| --- | --- |
| formal-verif を参照する `.test.ts` | 72（unit 29 / integration 35 / e2e 8） |
| formal-verif 参照パス総数（fixtures / support / 台帳込み） | 93 |
| plugin 語を含む `.test.ts` | 70 |
| `tests/formal-verif/` 下位 | `fixtures/`（arm-t の d1〜d7 パッチほか）と `support/`（10 本のハーネス） |
| `tests/.complexity-baseline.json` の formal-verif エントリ | 22（うち 20 が群 D） |

中核テスト: `t-formal-verif-model-completeness-sensor`（unit / e2e / integration × 2 — #1510 対象）、`t-formal-verif-plugin-lifecycle` / `-stage-discovery`、`t-formal-verif-ci-workflow`（#1829 の CI 面）、`t-plugin-projection` / `t303` / `t310` / `t311` / `t356`（projection・promote-self 面）、`t341-plugin-conformance-journey`。

## オープンバグ4件の対象コンポーネント（260731-open-bug-batch-4、履歴、observed `6e7a9d701`）
## perf 分離の対象コンポーネント（260731-perf-ci-separation、履歴、observed `da51af375`）
## オープンバグ一括修正バッチ第5弾の対象コンポーネント（260801-open-bug-batch-5、履歴、observed `c49e385ac`）

- 判断: 新規コンポーネントなし。対象は既存5クラスタ（mirror 状態機械 / engine state / OTel bootstrap 系 / graph 合成 / metrics publication）の欠陥修正のみ。区間で到着した OTel 18モジュールの目録化は本 intent のスコープ外（bugs-only）。患部一覧は `re-scans/260801-open-bug-batch-5.md` を正本とする。

## OTel メタ情報スキーマ実装の対象コンポーネント（260801-otel-meta-schema、履歴、observed `9c8df859e`）

本節の file:line・件数はすべて observed `9c8df859e` 時点（`cid:reverse-engineering:measurement-ref-in-artifacts`）。

### 改修面の目録

| コンポーネント | 現在の責務 | #1868 での改修 |
|---|---|---|
| `otel/tracer-provider.ts` | Span 実装 + Tracer Provider 登録 | resource literal（`:137`）の一元化・`recordException`（`:145-157`）の属性拡張・span 属性の intent/stage 直載り |
| `otel/bootstrap.ts` | 冪等な一度きり初期化 seam（logs / traces の2 arm） | resource 組み立ての設置・**metrics arm 新設** |
| `otel/event-registry.ts` | 80 def の全数管理（78 canonical + 2 telemetry） | exception def への optional 2属性追加・§5 `amadeus.subagent.started` 新設 |
| `otel/redaction.ts` | 二層共有ポリシー・safe-key 機械導出 | stacktrace のパス書換え処置追加 |
| `otel/local-span-exporter.ts` | span JSONL + export 境界 redaction | `resource` を redaction 対象へ（現在は素通り） |
| `otel/logger-provider.ts` | canonical 行の identity 組み立て | resource フィールド追加（log OTLP resource の充填） |
| `otel/meter-provider.ts` | Counter/Histogram subset | §6 計器の命名規約適用先。production 未配線 |
| `otel/local-metric-exporter.ts` | metrics JSONL | resource フィールド追加 |
| `otel/relay.ts` | Signal Store → OTLP 転送 | resource キー admission 方針の再確認（`:294-297`） |
| `core/hooks/amadeus-log-subagent.ts` | SubagentStop → `SUBAGENT_COMPLETED` | started 側との対称化（Agent Type の `unknown` 落ち改善） |
| `core/hooks/`（新規） | — | **PreToolUse（matcher: Task）hook の新設** |
| `harness/claude/settings.json.example` | hook 配線 | PreToolUse セクション新設 |
| `core/tools/amadeus-harness.ts` | ハーネス検出 | `amadeus.harness` の供給元（改修不要の見込み） |
| `scripts/package.ts` | dist ビルド | `writeHarnessData()`（`:206-214`）へ harness version 等を追加する場合の唯一の書き手 |

### イベントレジストリの構成（実測）

`event-registry.ts` の def 総数 80（`grep -c '^    name: '`）。durability 内訳（`grep -o 'durability: "[a-z]*"' | sort | uniq -c`）:

- `canonical` = **78**（`EXPECTED_CANONICAL_COUNT = 78` が `:77` で pin。scan 報告の `:79` は本実測で `:77` と訂正）
- `telemetry` = **2**（`amadeus.diagnostic.note` と `exception`）

telemetry 分類は `auditEvent: null` を持ち cardinality pin に参入しない（`assertRegistryConsistent` が canonical のみ数える）。これが「78-pin を触らずにイベントを足す」既存の回避先例であり、`exception`（`:827-837`）と diagnostic note（`:817-826`）が共存実例として機能している。

**ただし #1868 §5 の `amadeus.subagent.started` は canonical（監査ジャーナルへ載る）指定のため、この回避は使えず 78→79 の全面更新になる。**

### subagent イベントの現状定義

`event-registry.ts:476-484`: `amadeus.subagent.completed` / `auditEvent: "SUBAGENT_COMPLETED"` / `category: "subagent"` / required `["Agent Type"]` / optional `["Agent ID", "Message"]`。

hook 側（`amadeus-log-subagent.ts`）の取得値:
- `agent_type` → `normalizeAgentType()` で空文字を正規化（`:50`、#845 の経緯）
- `agent_id`（`:51`）・`last_assistant_message` を 200 文字に切った `Message`（`:52`）
- 3段の早期 exit: TTY（`:37`）/ shard 不在 `hasActiveWorkflowAudit`（`:57`）/ workflow 完了済 `activeWorkflowIsComplete`（`:63`）
- emit は `ensureOtelBootstrap` → `appendAuditEntryViaEvents`（`:84-85`）、失敗は `recordHookDrop` で fail-open（`:86-89`）

コメント `:79-83` が「Agent ID と Message は conditional なので、default-deny redaction に落ちるのを避けるためこの hook だけ legacy writer に残っていた。optional 登録により両立した」経緯を記録している — **conditional 属性を registry optional で扱う設計先例**として #1868 §5 の `Purpose` に直接適用できる。

### セッション相関の片側欠落（独立検証で判明）

`amadeus.session.started` の def（`event-registry.ts:245-253`）は `requiredAttributes: ["Source"]` / `optionalAttributes: []` — **セッション ID を属性として持たない**。同様に `amadeus.session.resumed`（`:254-262`）も `Source` のみ。

#1868 §1 は `session.id` を「SESSION_STARTED 監査行との突合キー」と位置づけるが、現状の監査行側には突合対象のキーが存在しない。resource へ `session.id` を載せるだけでは相関が片側にしか立たないため、**`amadeus.session.started` / `.resumed` の optional 属性追加が対になる**（属性追加のみなら cardinality pin は動かない）。

### 計器の現状

production 実例はゼロ。テストのみに `"amadeus.events.total"`（counter）と `"amadeus.span.duration"`（histogram）が現れる（`t369-otel-metrics-subset.test.ts`）。§6 が定める5計器（`gen_ai.client.token.usage` / `amadeus.stage.duration` / `amadeus.gate.iterations` / `amadeus.operation.failures` / `amadeus.subagent.duration`）はいずれも新規で、**命名規約・bootstrap arm・register 経路のすべてが未整備**。

`meter-provider.ts` の subset 制約（`:28-38`, `:80-100`）: UpDownCounter / Gauge / Observable* / batch callback / `options.advice` は `outOfSubset()` で throw。§6 の5計器はすべて Counter か Histogram なので subset 内に収まる。

## perf 分離の対象コンポーネント（260731-perf-ci-separation、履歴、observed `da51af375`）

本節の file:line はすべて observed `da51af375` 時点（`cid:reverse-engineering:measurement-ref-in-artifacts`）。

### 分離候補（スイート内 perf）

| コンポーネント | 種別 | 実時間性 | 分離した場合の主な波及 |
| --- | --- | --- | --- |
| `tests/integration/t258-lifecycle-transaction.test.ts` | 実 subprocess ベンチ | 高（`:529` timeout 120s、ローカル 30.01s） | project coverage 低下、registry claim の移動、drift 報告から消える |
| `tests/integration/t257-status-registry-migration.test.ts` | 実 subprocess ベンチ | 高（`:260` timeout 120s、ローカル 6.70s） | 同上 |
| `tests/integration/t259-guard-corpus.test.ts` | 交互計測 + 孫 spawn | 中（`:121` timeout 180s、ローカル 12.28s） | 同上 |
| `tests/integration/t269-amadeus-mirror-contract-policy-performance.integration.test.ts` | in-process マイクロベンチ | 低いが**予算が最厳**（`:102` 1ms / `:162` 50ms） | 同上 |
| `tests/integration/t292-mirror-distribution-performance.integration.test.ts` | 主体は純アグリゲータ検証 + 実時間1点（`:84` 10s） | 低 | 純部分まで一緒に外すと検証力を失う。**分割検討の対象** |
| `tests/integration/t-plugin-stage-discovery-performance.integration.test.ts` | 実 compile 10 対 | 中（`:34` `COMPILE_LIMIT_MS = 10_000`） | 同上 |

### 分離してはならないコンポーネント

| コンポーネント | 理由 |
| --- | --- |
| `tests/unit/latency-median-budget-gate.test.ts`（`// size: small`） | `exceedsMedianLatencyBudget` / `median` の落ちる実証。合成データのみでコストゼロ |
| `tests/unit/plugin-discovery-overhead-gate.test.ts`（`// size: small`） | `exceedsDiscoveryOverhead` の落ちる実証。同上 |
| `tests/lib/latency-median-budget-gate.ts` / `tests/lib/plugin-discovery-overhead-gate.ts` | 判定述語の正本。計測側と消費側の両方から参照される |

### 触れることになる周辺機構

| コンポーネント | 行 | 分離との関係 |
| --- | --- | --- |
| `tests/run-tests.ts` | `:839-850` / `:875-880` / `:900-909` / `:1161-1166` | 除外集合の口。`runTier` のみ `excludes` 非対応 |
| `tests/gen-coverage-registry.ts` | `discoverClaims` `:771-774`、`CLAIMS_TESTS_DIR` `:74` | 宇宙は**ディスク列挙**。実行からの除外では不変、ディレクトリ移動では claim が落ちる |
| `tests/coverage-project-gate.ts` | totals `:48`、baseline `:52` | 行率ラチェット。実行除外で必ず低下 → baseline 再カット必須 |
| `tests/coverage-patch-gate.ts` | allowlist `:56`、stale 拒否 `:295` | LCOV から消えたファイルを指す既存 allowlist 行ピンが hard-fail する |
| `tests/integration/t257-ci-residency-marker-guard.integration.test.ts` | `CI_SCOPES` `:32`、`scopeOf` `:34` | 新ディレクトリを作ると `scopeOf` は `"other"` を返す |
| `tests/unit/t-test-size-drift.test.ts` | — | ディスク上の全 `*.test.ts` を走査。ディレクトリ移動では発火しないが、注記値の誤りは fatal |
| `tests/smoke/t05-run-tests-parallel.test.ts` | `PER_TEST_TIMEOUT` `:163` | ランナー CLI 契約のピン |
| `.github/workflows/ci.yml` | `:167` / `:293` / `:353` / `:224` / `:255` / `:279` / `:475` / `:648` | ジョブグラフとブロッキング境界 |

### 区間で変化したコンポーネント（本 intent 外）

`amadeus-mirror-presentation.ts`（`mirrorSnapshotStatus` `:250-252` 新設）、`amadeus-mirror-lifecycle.ts`、`t224`（spawn 診断層）、`t259`（交互計測化）、`t-team-up-codex-resume.serial.test.ts`（supervisor reap）、`tests/.coverage-patch-allowlist.json`（上記に伴う churn）。


## オープンバグ4件の対象コンポーネント（260731-open-bug-batch-4、履歴、observed `6e7a9d701`）

本節の file:line はすべて observed `6e7a9d701` 時点（`cid:reverse-engineering:measurement-ref-in-artifacts`）。

### 修正面の目録

| Issue | 主対象コンポーネント | 種別 | 補助対象 | 本番コード変更 |
| --- | --- | --- | --- | --- |
| #1811 P1/S2 | `tests/integration/t-team-up-codex-resume.serial.test.ts`（1,813行） | テスト fixture | なし | **不要（推奨: 非改変）** |
| #1800 P3/S3 | `tests/integration/t224-upstream-v2-migration-cli.test.ts`（1,830行） | テスト診断 | なし | 不要 |
| #1797 P3/S4 | `tests/integration/t259-guard-corpus.test.ts`（126行） | テスト計測 | `tests/helpers/guard-corpus-benchmark-child.ts` | 不要 |
| #1816 P3/S4 | `packages/framework/core/tools/amadeus-mirror-presentation.ts` | 本番（表示層） | `tests/.coverage-patch-allowlist.json`（行ピン5件の remap）、`tests/unit/t281-amadeus-mirror-presentation.test.ts`（ケース追加） | **必要** → 7 dist + self-install 再生成 |

**#1816 のみが `packages/framework/core/` を触る。** 他3件はテスト面に閉じるため、生成面（`dist/` 7ハーネス + self-install）の再生成チェーンを通らない。

### コンポーネント別の詳細

#### `tests/integration/t-team-up-codex-resume.serial.test.ts`（#1811）

| 要素 | 行 | 役割 |
| --- | --- | --- |
| fake supervisor stub の終了ハンドラ | `:218` | `process.on("SIGTERM", () => process.exit(0));` — 唯一の終了経路 |
| fake supervisor stub の event loop 保持 | `:219` | `setInterval(() => {}, 1_000);` — 不死化の直接原因 |
| `afterEach` | `:39-41` | 一時ディレクトリの `rmSync` のみ。プロセス掃引なし。**掃引を追加する場合は `rmSync` より前**（PID ファイルが同ディレクトリ配下にある） |
| 漏洩テスト | `:590` / `:973` / `:1004` | いずれも `--kill` を通らずに終端 |
| 案 A の影響検証対象 | `:717` / `:774` / `:823` | stub へ record ポーリングを付与した場合に挙動が変わりうる3テスト |

**関連する本番コンポーネント（改変対象ではない — 契約の参照元）**:

| コンポーネント | 行 | 内容 |
| --- | --- | --- |
| `packages/framework/core/tools/team-up-codex-safety-wait.ts` | `:643` | `while (await runRecordIsActive(runRecord, run, session)) {` — run record 消滅で自律終了する fail-closed ループ |
| 同上 | `:561`（宣言）/ `:580-582` | `runRecordIsActive` の `catch` → `return false` |
| `packages/framework/core/tools/team-up.sh` | `:508` | `printf '%s\n' "$pid" >"$member_record/safety-wait.pid"` — 掃引に使える PID 追跡面 |

#### `tests/integration/t224-upstream-v2-migration-cli.test.ts`（#1800）

| 要素 | 行 | 役割 |
| --- | --- | --- |
| 終了状態の正規化（2箇所の同型ヘルパー） | `:170` / `:210` | `status: result.status ?? -1,` — `-1` は signal 終了 or spawn 失敗のセンチネル |
| 診断ヘルパー | `:218`（宣言）/ `:225-238`（メッセージ配列） | `expectSuccessfulMigration` — exit path / status / signal / error / stdout / stderr を並べる |
| 3分類の契約固定 | `:311-313` | `exit-status` / `signal` / `spawn-error` の `test.each` |
| **患部** | `:1411` | `expect(collided.status).toBe(1);` — 素の等値比較で診断が非対称 |

#### `tests/integration/t259-guard-corpus.test.ts`（#1797）

| 要素 | 行 | 役割 |
| --- | --- | --- |
| `median` | `:46`（宣言）/ `:47-48` | t258 裁定の反映として適用済み |
| 計測呼び出し | `:89`（`measure` 宣言）/ `:101` / `:102` | `measure(1)` と `measure(2)` を**逐次に別プロセスで** spawn |
| **患部** | `:108` / `:109` | 時間比・RSS 比の `toBeLessThanOrEqual(2.5)` |
| 子プロセス | `tests/helpers/guard-corpus-benchmark-child.ts` | 交互計測（案 (i)）を採る場合の主改修面 |

`tests/.coverage-patch-allowlist.json` の `t259` エントリ群は**別テスト由来**であり本件では触らない。

#### `packages/framework/core/tools/amadeus-mirror-presentation.ts`（#1816）

| 要素 | 行 | 役割 |
| --- | --- | --- |
| `renderMirrorIssueContent` | `:239`（宣言）〜`:273` | body 組立は `:245-267` |
| **患部** | `:259-260` | `"## Status",` / `snapshot.status,` — snapshot の逐語レンダリング |
| `## Stage` / `## Phase` | `:253-257` | 終端化の対象にするかは要件段の確定事項 |
| `renderMirrorStatus` | `:298`（宣言） | `buildMirrorStatusRecordView` の drift 診断が偽 drift を出さないよう導出キーの選定に注意 |

**`completionInstance` は本ファイルで未消費**（`grep` 0ヒット）。消費側は executor `:394` / coordinator `:279` `:284` / policy `:254` / lifecycle `:339` / state-codec `:567` `:763` `:770` `:775` / types `:516` `:527` / `amadeus-state.ts:533` ほか。

**関連する本番コンポーネント**:

| コンポーネント | 行 | 内容 |
| --- | --- | --- |
| `packages/framework/core/tools/amadeus-mirror-executor.ts` | `:1156-1159` | sync → `editIssue(permit, body)` / close → `closeIssue(permit)` の非対称（close は body を書かない） |
| 同上 | `:1038-1041` | 収束判定も同じ非対称（sync = body 一致 / close = state CLOSED） |
| `packages/framework/core/tools/amadeus-mirror-lifecycle.ts` | `:311-312` | pending completion を持つ snapshot に `Running` を強制する assert（`:311-316` が assert ブロック）。**改訂不要** |

**`tests/.coverage-patch-allowlist.json` の presentation 行ピン**: `193-194` / `230-234` / `237-239` / `245-247` / `266-271` の5件。`renderMirrorIssueContent`（`:239-273`）と交差するのは `245-247`（直撃）と `266-271`（下方シフト）。機械 remap 必須（`cid:code-generation:c1-allowlist-mechanical-remap`）。

### 本区間で変化したコンポーネント（本 intent の患部外）

| コンポーネント | 変化 | 由来 |
| --- | --- | --- |
| `packages/framework/core/tools/amadeus-election-store.ts` | `+168/−10` — pending ballot lane 6関数を新設 | #1773 修正（`25f54b066`） |
| `packages/framework/core/tools/amadeus-election-model.ts` | `+36/−9` — view へ question / choice description を搬送 | #1772 修正（`75367ba67`） |
| `packages/framework/core/tools/amadeus-mirror-state-codec.ts` | `succeededMirrorCreateExists` を `:1731` に新設 | #1752 修正（`8a8abf567`） |
| `packages/framework/core/tools/amadeus-orchestrate.ts` | `+10/−3` — `:4249` で `createRan` を導出 | 同上 |
| `.github/workflows/release.yml` | `+68/−22` — 再実行可能ジョブへ分割 | #1799（`b488466b8`） |
| ルート `.gitignore` + 7ハーネス `dot-gitignore` | 各 `+5/−0` — pending lane 除外 | #1773 修正 |

sensors / hooks / scopes の構成は不変。core tools への**新規モジュール追加は 0件**（前区間の +9件と対照的）。

## オープンバグ3件の対象コンポーネント（260730-open-bug-batch-3、履歴、observed `3f73823b1`）

本節の file:line はすべて observed `3f73823b1` 時点。

| Issue / Bolt | コンポーネント | 責務 | 現在の破断点 | 依存・配布 |
| --- | --- | --- | --- | --- |
| [#1773](https://github.com/amadeus-dlc/amadeus/issues/1773) | `packages/framework/core/tools/amadeus-election-store.ts`（格納層）+ `amadeus-election-model.ts`（票の型）+ `skills/amadeus-election/SKILL.md`（運用手順） | 選挙の受理・永続化・blind lift・状態照会 | 未開票中の全票本文が単一共有 tracked ファイル `ledger.json` に平文で載る（書込 `:464-465`）。blind lift（`materialize` `:500`、コメント `:498`）は tally 時のみで collecting 中は保護対象外。voter subagent は選挙ディレクトリを直接触る（`SKILL.md:51`）。git tracked のため `git status` / `git diff` が第2の露出面（tracked `ledger.json` は 183件） | core 正本のため 7 dist + 5 self-install 再生成。`.gitignore` も修正面候補。**blind 性を assert するテストは 0件** |
| [#1772](https://github.com/amadeus-dlc/amadeus/issues/1772) | `packages/framework/core/tools/amadeus-election-model.ts`（型 / parse / view render / tally） | 選挙定義の parse と blind 配布ビューの構築 | `Choice`（`:48`）が `{ internalNo, label }` のみで description を持たず、`parseChoices`（`:73`、再構成 `:80`）が未知フィールドを exit 0 のまま無音 drop（fail-open）。`DistributionView`（`:306-310`）に `question` が無い | core 正本。**テスト契約が3重固定**（型 `:306-310` / 設計コメント `:304-305` / `tests/unit/t234-election-model.test.ts:190` `:192`）— 要件段の仕様裁定が前提 |
| [#1752](https://github.com/amadeus-dlc/amadeus/issues/1752) | `packages/framework/core/tools/amadeus-orchestrate.ts`（mirror boundary report 分岐） | boundary の offer と report 受理 | `:4255` の `(answer === "create" && hasMirrorIssue)` が report 実行時点の state 再評価（`:4241-4242`）に立つため、ask の指示（`:519-529`）に従って create した利用者が拒否される自己矛盾。`sync` / `skip` には対応する照合が無い片側実装 | core 正本。#1791 の初回 create 分岐（`:486-500`）は auto 優先（`:488`）のため prompt 経路の再現は温存。fixture `tests/integration/t265-engine-boundary.integration.test.ts:793` は2ケースを区別できず分岐が要る |

### 共有コンポーネントと変更競合

- **#1773 と #1772 は同一ファイル群を共有する。** 両者とも `amadeus-election-model.ts` を触る（#1773 は票の型 `:134-136`、#1772 は選択肢の型 `:48` と view `:306-310`）。ファイル単位で**交差する**ため、`cid:code-generation:c6` の非交差判定を満たさない — **直列化するか、実 diff で行レンジの非交差を確認してから並行させる**。前 intent までの「全件並行可」とは条件が異なる点に注意。
- **#1752 は他2件と完全に非交差**（`amadeus-orchestrate.ts` のみ）。先行着地できる。
- 3件とも `packages/framework/core/` を正本とするため、`bun scripts/package.ts` → dist 7ハーネス → `bun run promote:self` → self-install 5面の同一チェーンを通る。生成面が競合するため着地順は実 diff で再評価する。

### 区間で増えた主要コンポーネント（本 intent の患部外）

`a38a1f4d3..3f73823b1`（25コミット）で `packages/framework/core/tools/` に **9件**の新規モジュールが追加された（base `79` → observed `88`。`git diff --name-status a38a1f4d3 HEAD -- packages/framework/core/tools/ \| grep '^A'` の実測）。

| コンポーネント | 責務 | 出自 |
| --- | --- | --- |
| `amadeus-github-gateway.ts` | GitHub 汎用ゲートウェイ（mirror 専用実装からの抽出、+953） | #1744 `d56e76ddd` |
| `amadeus-github-types.ts` | 上記の型（+44） | 同上 |
| `amadeus-layered-config.ts` | 階層設定リゾルバ（global → space → intent、+610）。`auto-mirror` / `auto-file-findings` / `auto-solo-election` を解決 | 同上 |
| `amadeus-process-runner.ts` | `gh` spawn の唯一の不純エッジ（+306） | 同上 |
| `amadeus-contained-file.ts` | ファイル境界の封じ込め（+175） | 同上 |
| `amadeus-finding.ts` | finding CLI 本体（+296） | 同上 |
| `amadeus-finding-types.ts` | 上記の型（+28） | 同上 |
| `amadeus-finding-capability.ts` | capability 宣言（+33） | 同上 |
| `amadeus-sensor-invocation.ts` | 宣言 outputs を `sensor-invocation.json` へ投影（+118）。`hooks/amadeus-sensor-fire.ts:27` が exact-path allowlist として消費 | #1758 / #1770 |

**縮小したコンポーネント**（抽出元）: `amadeus-mirror-config.ts` −689 / `amadeus-mirror-gateway.ts` −911 / `amadeus-mirror-runner.ts` −310。`scripts/projections.ts` の `MIRROR_TOOL_FILES` に新5ファイルが追加されている。

**件数不変の面**: core sensors `7` / core hooks `12` / core scopes `10`（いずれも `ls` 実測。base からの変化なし）。

## オープンバグ5件の対象コンポーネント（260730-open-bug-batch-2、履歴、observed `c42ef4d77`）

**判断: 実質更新なし。** 区間 `8b8016f62..c42ef4d77` で新規コンポーネント（core tool / sensor / hook / scope）の追加・削除はない。5件の患部はいずれも既存コンポーネント内にあり、所有関係も不変 — #1750 = `amadeus-mirror-lifecycle.ts` + `amadeus-orchestrate.ts`、#1749 = `stage-protocol-governance.md`、#1742 = `amadeus-sensor-fire.ts`、#1735 = `amadeus-election/SKILL.md` + `stage-protocol.md`、#1734 = `scripts/promote-self.ts`。個別の配置と行番号は `code-structure.md` の対応節を参照。

## SKILL/reviewer 2件の対象コンポーネント（260730-skill-reviewer-fixes、履歴、observed `278d61d8e`）

| Issue / Bolt | コンポーネント | 責務 | 現在の破断点 | 依存・配布 |
| --- | --- | --- | --- | --- |
| [#1736](https://github.com/amadeus-dlc/amadeus/issues/1736) | harness SKILL.md（new-work offer 節） | 稼働中 intent と並行する new-work の CONFIRM 経路を conductor に指示する | 実行ツール名の誤り。`amadeus-utility.ts next --new-intent` を指示するが、`next` verb は utility に存在せず（`amadeus-utility.ts:6088` の `switch (subcommand)` に `case "next"` が 0 件）`default:`（`:6182`）で die する。実装は `amadeus-orchestrate.ts:2405` 側にある | 正本5 + dist 5 + self-install 3 = **13ファイル**（`git ls-files \| xargs grep -n 'amadeus-utility\.ts next'` = 13）。cursor / opencode は SKILL.md を持たず、command 面（`:23`）は正しく orchestrate を指すため患部外 |
| [#1711](https://github.com/amadeus-dlc/amadeus/issues/1711) | orchestrate degrade 分岐 / reviewer-runtime scope / reviewer 実在検査 | units-generation を SKIP するスコープでの run-stage directive 発行と reviewer 読取スコープ確定 | produces に `{unit-name}` プレースホルダが残ったまま reviewer へ渡り、実在検査（`amadeus-reviewer.ts:74`）が `required review artifact is missing` で throw する。consumes 側には exempt（`amadeus-orchestrate.ts:1771-1774`）があるが produces 側には無い **非対称** | core 正本の変更となるため 7 dist + 5 self-install の再生成対象。テスト契約 `t186:351` / `t186:492` / `t116:380-403` が現挙動をピン |

### 共有コンポーネントと変更競合

- 2件は所有コンポーネントが完全に分離している（#1736 = harness SKILL.md の散文、#1711 = core engine + reviewer 層）。ファイル単位で非交差のため並行実装が可能（`cid:code-generation:c6` の非交差判定）。
- ただし #1711 は core 正本を触るため 13コピー同期を伴い、#1736 も SKILL.md の 13ファイル同期を伴う。両者の同期対象ファイル集合は重ならない（前者 = `tools/`、後者 = `skills/amadeus/SKILL.md`）。
- 本 intent 自身が `self-fix` スコープで走り、`self-fix` は units-generation を SKIP するため **#1711 の患部経路を自ら通る**。code-generation ステージで reviewer scope が exit 1 する場合、既知の運用回避（conductor が実 unit 名へ解決した directive JSON を渡す — project.md `cid:code-generation:degrade-scope-unit-dir-layout` 追補）を適用する。

### 区間で増えた主要コンポーネント

`22ee27dbe..278d61d8e`（34コミット）で `packages/framework/core/tools/` に**3件**の新規モジュールが追加された（base 76 → observed 79。`git diff --name-status 22ee27dbe 278d61d8e -- packages/framework/core/tools/ \| grep '^A'` の実測）。下表の3件はいずれも本 intent の患部ではない。

| コンポーネント | 行数 | 責務 | 消費側 |
| --- | --- | --- | --- |
| `packages/framework/core/tools/amadeus-caller-authorization.ts` | 122 | subagent role による engine state 変更経路の拒否判定（`MainConductorAuthorization` = `:27-29`） | `amadeus-orchestrate.ts:2108`、`amadeus-state.ts:828` / `:831` の2箇所のみ |
| `packages/framework/core/tools/amadeus-sensor-self-scope-consistency.ts` | 231 | `self-*` スコープと scope-grid の整合検査（manifest `packages/framework/core/sensors/amadeus-self-scope-consistency.md` 38行、`matches` = `:8`） | センサー発火経路 |
| `packages/framework/core/tools/amadeus-workflow-completion.ts` | 110 | ワークフロー完了の2相化によるクラッシュ回復（`WorkflowCompletionPreparation` = `:9-13`） | orchestrate の完了経路 |

`amadeus-mirror-policy.ts`（現在514行）と `team-up-codex-safety-wait.ts`（現在689行）は **本区間の新設ではなく既存コンポーネントの変更**である（`git diff --name-status` で両者 `M`、base `22ee27dbe` にも実在）。後者は本棚卸しの `:634` に既収載。

## Open bug 6件の対象コンポーネント（260729-open-bug-batch、履歴、observed `22ee27dbe`）

| Issue / Bolt | コンポーネント | 責務 | 現在の破断点 | 依存・配布 |
| --- | --- | --- | --- | --- |
| [#1667](https://github.com/amadeus-dlc/amadeus/issues/1667) | book-pack verify test / verifier / test runner | engine coupling drift guard | 120秒の test timeout が180秒 child timeout を包含しない | Bash、Bun test。repo-local |
| [#1664](https://github.com/amadeus-dlc/amadeus/issues/1664) | t224 migration fixture / migrate / doctor / clone-id / audit | upstream workspace conversion と health evidence | subprocess の status 以外の診断が assertion から失われる | core を触る場合13コピー同期 |
| [#1663](https://github.com/amadeus-dlc/amadeus/issues/1663) | `team-up.sh` worktree creator | serial registration + parallel checkout | worker exit status を保持せず最終走査へ圧縮 | git worktree、Shell jobs、13コピー同期 |
| [#1662](https://github.com/amadeus-dlc/amadeus/issues/1662) | coverage patch gate | changed measurable line と LCOV hit の照合 | committed diff と dirty LCOV の source identity が不一致 | git、LCOV、repo-local |
| [#1336](https://github.com/amadeus-dlc/amadeus/issues/1336) | Team Mode launcher / safety-wait supervisor | Codex pane の自動安全応答 | fixed sleep + PID liveness を readiness に代用 | Bun child、herdr、Shell、13コピー同期 |
| [#1607](https://github.com/amadeus-dlc/amadeus/issues/1607) | orchestrator / state transaction / audit journal / mirror coordinator-executor-store-policy | workflow finalization と GitHub mirror completion | registry complete と audit seal が mirror receipt より先に着地 | GitHub mirror、journal codec、workspace lock、13コピー同期 |

### 共有コンポーネントと変更競合

- `team-up.sh` は #1336 と #1663 の共有正本である。#1336 の readiness protocol を先に確定し、その後 #1663 の worker result aggregation を載せる。
- audit/journal/state は #1607 と OTel [#1679](https://github.com/amadeus-dlc/amadeus/issues/1679) の Critical 共有境界である。`amadeus-mirror-state-store.ts` の audit outbox と `amadeus-audit.ts` の post-complete seal を別々の Bolt が独立改変すると、local state durable / audit retained の不変条件が分裂する。
- t224 は #1664 の診断面であると同時に OTel の journal/audit expectation を観測する。テストを「通す」ために期待値を緩めず、診断追加後の実再現から製品根因を確定する。
- #1667 と #1662 は source 所有が分離している。並列実装は可能だが、coverage job の負荷が book-pack timeout を再現する環境条件になりうるため、最終検証では同一 CI 帯でも実行する。

### 区間で増えた主要コンポーネント

`ca8ff0af4..22ee27dbe` では Intent Mirror の Project 同期面として contract、diagnostics、executor、gateway、ledger reducer、reconciliation reducer、verification が `packages/framework/core/tools/` に追加された。テスト面では CLI/SDK/TUI mechanism と live Codex helper が追加された。これにより core tools は実測78ファイルとなり、#1607 の修正対象は旧 mirror lifecycle だけでなく Project ledger の完了ゲートまで含めた現行スタックで評価する必要がある。

## OTel/observability 面コンポーネント（260729-otel-upstream、履歴、observed `22ee27dbe`）

行数は HEAD の `wc -l` 実測値、消費者数は `grep -l` の import 実測値（測定 ref: observed `22ee27dbe`）。正本はすべて `packages/framework/core/` 配下。

### C-O1. JSONL journal codec（`tools/amadeus-journal.ts`、236 行）

serialize / parse / identity ヘルパのみを持つ pure codec（FS 非依存）。消費者は 5 モジュール（audit / state / lib / journal-convert / otel-projector）。`JOURNAL_SCHEMA_VERSION = 1` の wire 契約と `(cloneId, seq)` べき等キー、fork lineage token 採番を所有する。テストは `tests/unit/t352-journal-codec.pbt.test.ts`（fast-check PBT）。

### C-O2. Audit writer（`tools/amadeus-audit.ts`、1094 行）

append-only 監査台帳の writer。JSONL 化済みで codec を共有し、`initProcessObservability` でプロセス区間 telemetry も emit する。Markdown renderer `formatAuditRecord` は converter の lossless proof 専用に残存（`:323` コメント）。**#1672 で OTel EventRecord → AuditLogExporter 経路へ置換予定のコンポーネント**。

### C-O3. 移行 converter（`tools/amadeus-journal-convert.ts`、298 行）

Markdown shard → JSONL shard の one-shot 移行橋渡し。switchover 後に legacy Markdown block を parse してよい唯一のモジュールで、byte-exact round-trip 自己検証の fail-closed 設計。テストは `t356-journal-convert.test.ts`。

### C-O4. Observability seam（`tools/amadeus-observability.ts`、325 行）

Core 向け telemetry seam（Issue #1628 Phase 2）。消費者は tools 17 + hooks 12 = 計 29 モジュール。layered config 解決、default-deny の meta redaction、fail-open の buffer append、process / operation / subprocess の 3 種の区間計測を所有する。区間で未使用 `registered` フィールドが削除され、登録状態は `_processObservation !== null` に一本化。**#1672 で `observe()` / `observeSubprocess()` が Trace API spans へ置換予定**。テストは `t357-observability-seam.test.ts`。

### C-O5. OTLP projector（`tools/amadeus-otel-projector.ts`、609 行）

journal + buffer → OTLP/HTTP JSON の投影器（Phase 3）。依存ゼロで ResourceSpans/ResourceMetrics を自前構築し fetch POST する、OTel を話す唯一のモジュール。消費者は `hooks/amadeus-session-end.ts` と CLI のみで、Core からは import されない。**#1672 で pure OTLP relay へ縮小予定**。テストは `t358-otel-projector.test.ts`。

### C-O6. Session-end hook（`hooks/amadeus-session-end.ts`）

projector の piggyback 起動点（session 終了時の export 駆動）。

### 配布増幅と区間の新設コンポーネント

正本モジュールは 7 `dist` 面 + 5 self-install 面へ同期される（計 13 コピー、`git diff --name-status` で確認）。区間の新設コンポーネント（focus 外）: mirror-project 系 9 モジュール（project-executor 486 / project-verification 483 / reconciliation-reducer 385 / project-gateway 344 / project-diagnostics 314 / ledger-reducer 254 / warning-reducer 91 / timestamp 81 / contract 46 行）と純粋ロジック分離の `amadeus-intent-selection.ts`（168 行）。周辺テストに `t355-audit-merge-info-seams.test.ts`（audit マージ境界）と `t315-doctor-plugin-observability.integration.test.ts`（doctor の observability section）。

## Slop cleanup 対象コンポーネント（260728-slop-cleanup、履歴、observed `ca8ff0af4`）

| コンポーネント | 責務 | 現状 | 最小修正 |
| --- | --- | --- | --- |
| Intent Event Journal codec | JSONL journal の serialize / parse / identity | 5 canonical module が利用中だがコメントは「未配線」 | コメントを現行依存へ整合 |
| Process observability seam | process span の初期化・exit flush | nullable singleton と未使用 `registered` が状態を二重表現 | 未使用フィールドと初期化子を削除 |
| Markdown artifacts | 計画・workspace layout の説明 | 3 件の空白 diagnostic | 空白のみ除去 |

全コンポーネントの責務・ownership・境界は不変。core tools 2 コンポーネントは正本 1 + dist 7 + self-install 5 の 13 コピー同期対象である。

> **2026-07-27（intent `260726-answer-manual-binding`、[Issue #1548](https://github.com/amadeus-dlc/amadeus/issues/1548) bug、amadeus-bugfix / Brownfield）: 本 intent 断面は対象外（コンポーネント面に変化なし）。** 測定 ref: observed `ad1ff5de9`、base `09c669901`、距離 2。区間 2 コミットは record-only で mirror answer/guard スタックの source 変更ゼロ。#1548 は既存 mirror コンポーネント（adapter `amadeus-mirror-lifecycle.ts` / coordinator `amadeus-mirror-coordinator.ts` / types `amadeus-mirror-types.ts`）間の**契約の欠落**（answer 転送 `:969-985` が guard `:257-265` の要求フィールドを渡さない）で、新規コンポーネントの追加はない。配布は `amadeus-mirror-lifecycle.ts` の **13 コピー**（canonical 1 + self-install 5 + dist 7）が同期対象。詳細は上流入力 `re3-dev-scan-result.md` と本 scan の `architecture.md` / `code-quality-assessment.md` 新節、`re-scans/260726-answer-manual-binding.md`。

> **2026-07-27（intent `260726-t258-p95-flake`、[Issue #1511](https://github.com/amadeus-dlc/amadeus/issues/1511) bug/P2/S3-MAJOR、amadeus-bugfix / Brownfield）: 本 intent 断面は対象外（変更なし）。** 測定 ref: observed `09c669901`、base `f9a0fb86a`、距離 2。区間 32 ファイルはすべて `amadeus/` record で **source/test/CI 変更ゼロ**。#1511 の患部コンポーネント（`p95()` 述語 `t258:430-433`、child benchmark helper `tests/helpers/lifecycle-transaction-benchmark-child.ts`、絶対 assert `t258:461-462` / `t257:240-241`、被測定 `withIntentLifecyclePreflight` / `runIntentLifecycleTransactionLocked`）はいずれも既存で、新規コンポーネント登録なし。詳細は上流入力 `re2-dev-scan-result.md` と本 scan の `code-quality-assessment.md` / `architecture.md` 新節、`re-scans/260726-t258-p95-flake.md`。

## plugin CLI 層・dispatch 層・スキル層のコンポーネント棚卸し（260727-plugin-verb-skills、履歴、差分リフレッシュ、observed `afb93a825`）

260727-plugin-verb-skills 差分リフレッシュ（2026-07-28、observed `afb93a825`、base `0c4709102`（祖先 exit 0）、距離 **16**）。上流入力: Developer スキャン結果。件数・行数はすべて `wc -l` / `ls` / `find` / `git ls-files` 出力からの転記（測定 ref: observed `afb93a825`）。

### 実行系コンポーネント（plugin 面、#1596 着地後）

| コンポーネント | 実体 | 規模 | 責務 | 本 intent での関与 |
| --- | --- | --- | --- | --- |
| plugin CLI | `core/tools/amadeus-plugin.ts` | **678 行** | 4 動詞（compose / doctor / drop / status）、ホストルート解決、host snapshot、統合 doctor への投影 | **中心** — 動詞体系の拡張可否（`install` 不在・`:71-75` 判別 union が閉じている） |
| 合成エンジン | `core/tools/amadeus-plugin-compose.ts` | **1488 行** | plan / apply / drop / journal / backend / DropsRecord | 非対象（CLI 層より下） |
| activation policy | `core/tools/amadeus-plugin-activation.ts` | 295 行 | spec-hash advisory（TLC は起動しない） | 非対象 |
| SessionStart hook | `core/hooks/amadeus-plugin-compose.ts` | **25 行** | `handlePluginCli(["compose","--if-stale","--project-root",dir])` の薄いラッパ | ホストルートの hook 側解決（`pluginHostRootFromHook:305-311`）を共有 |
| ホストルート解決 | `amadeus-plugin.ts:293-297` / `:305-311` / `:313-316`、`amadeus-graph.ts:2021-2023` | — | CLI・hook・エンジンを同一ハーネスディレクトリへ収束（#1591 裁定 B） | 新動詞・新スキルが従うべき既定 |
| recompile ドライバ | `amadeus-plugin.ts:253-263` `spawnRecompile` | — | `amadeus-graph.ts compile` → `amadeus-runtime.ts compile` の 2 段（#1592） | 新動詞が合成面を触る場合の必須後処理 |
| 統合 CLI dispatch | `core/tools/amadeus-utility.ts:5945` `switch (subcommand)` | 20 case | 統合 CLI の唯一の動詞入口 | **`plugin` case が不在** — 委譲を足すならここ（先例は `handleMigrate:5900` の 1 件のみ） |
| stage-runner 生成・検査 | `core/tools/amadeus-runner-gen.ts` | — | compiled graph → `skills/amadeus-<slug>/` の生成（`:118`）と等価検査（`:363`） | **#1598 の所在** — `isRunnableStage:88-90` に plugin 識別語彙が無い |
| スキル正本 | `core/skills/`（6 ディレクトリ） | 雛形 `amadeus-mirror/SKILL.md` = **94 行** | ハーネス中立なユーザー起動スキル | 新スキルを足す場合の正本置き場 |
| スキル投影配線 | `harness/projections.ts:300`、各 `manifest.ts`、`harness/codex/emit.ts:338-345` | — | 面ごとの投影集合を決める 3 系統の列挙 | 新スキルの配布面選択（mirror=7 面 / election=3 面の両前例） |

### 検証系コンポーネント（区間で新設）

| コンポーネント | 実体 | 規模 | 何を守るか |
| --- | --- | --- | --- |
| plugin conformance E2E | `tests/e2e/t341-plugin-conformance-journey.serial.test.ts` | **234 行** | 出荷 `dist/claude` 面での folder-drop → hook 実 spawn による compose → stage graph 到達 → `--single` なしの directive 発行 → 既定ホストルートでの doctor/status → drop の baseline 復元、という**開発者の実導線 1 本** |
| 専用 CI ジョブ | `.github/workflows/ci.yml:146` `plugin-conformance-e2e` | — | e2e tier が `test:ci` に含まれない構造的盲点を埋める。集約ゲートの必須依存（`:678` / `:704`） |
| runner ドリフト検査 | `amadeus-runner-gen.ts:363` `handleCheck` + `tests/unit/t129-stage-runner-drift.test.ts` | — | compiled slug 集合 と on-disk runner 集合の等価。**plugin stage を識別できないため compose 済みホストで破綻**（`t129:206` `toBe(29)` / `:208` `toBe(3)` / `:221` `"(29 runners)"` の硬い数値も同時に崩れる） |

### コンポーネント境界の注記

- **配布対象と repo-local の境界**: `core/tools/` / `core/hooks/` / `core/skills/` は 7 dist + 5 self-install へ投影される。`scripts/plugin-projection.ts` / `scripts/promote-self.ts` は repo-local で配布対象外。
- **plugin CLI と統合 CLI は現状無接続**: plugin CLI は `bun <harnessDir>/tools/amadeus-plugin.ts <verb>` として独立に到達され、統合 CLI からの委譲経路を持たない（`grep -n '"plugin"' amadeus-utility.ts` = 0 hit）。
- **同名の別物**: `packages/framework/harness/opencode/plugin/amadeus-opencode-plugin.ts` は opencode ハーネス自身のプラグイン機構であり、Amadeus plugin 機能とは別コンポーネント。

## plugin 実行系コンポーネントと検証コンポーネントの棚卸し（260727-e2e-plugin-conformance、履歴 2026-07-27、差分リフレッシュ、observed `0c4709102`。行数 613 / 1469 / 23 と「e2e 0 件」は当時断面）

260727-e2e-plugin-conformance 差分リフレッシュ（2026-07-27、observed `0c4709102`、base `1673c433`（祖先 exit 0）、距離 **60**）。上流入力: Developer スキャン結果 `inception/reverse-engineering/scan-notes.md`。件数・行数はすべて `wc -l` / `ls` / `git ls-files` / `find` 出力からの転記（測定 ref: observed `0c4709102`）。

### 実行系コンポーネント（plugin 面）

| コンポーネント | 実体 | 規模 | 責務 | 本 intent での関与 |
| --- | --- | --- | --- | --- |
| plugin CLI | `core/tools/amadeus-plugin.ts` | 613 行 | 4 動詞（compose / doctor / drop / status）、host snapshot、統合 doctor への投影 | **#1585 の所在**（`:591-593` standalone レンダラ）・#1586 の判定側（`:377`） |
| 合成エンジン | `core/tools/amadeus-plugin-compose.ts` | 1469 行 | plan / apply / drop / journal / backend / DropsRecord | **#1586 の所在**（`:1150` mkdir ⇔ `:1154` rm の非対称） |
| activation policy | `core/tools/amadeus-plugin-activation.ts` | 295 行 | spec-hash advisory（TLC は起動しない） | 非対象 |
| SessionStart hook | `core/hooks/amadeus-plugin-compose.ts` | **23 行** | `handlePluginCli(["compose","--if-stale","--project-root",dir])` の薄いラッパ | **#1589 の未検証面**（hook 実体・settings 配線の実発火が未駆動） |
| graph discovery | `core/tools/amadeus-graph.ts` の `discoverPluginStageFiles`（`:2011-2013`）/ `pluginsHostRoot`（`:2015-2023`） | — | compose 済み stage の列挙 | recompile 後の実効果が e2e 未検証 |
| orchestrate 到達経路 | `core/tools/amadeus-orchestrate.ts` の `emitComposedPluginStageIfInstalled`（`:1017-1034`、呼び出し `:2289`） | — | `--single` なしでの plugin stage 到達 | **#1589 の未検証面**（seam 単体の in-process 呼び出しのみ） |
| パッケージャ | `scripts/plugin-projection.ts` | — | 中立バンドル + 7 面 install バンドル生成、定数 2 本の canonical | **#1575 の canonical 側**（`:42` 7 / `:56` 5） |
| self-install 反映 | `scripts/promote-self.ts` | — | 5 面 self-install ツリーへの反映 | **#1575 の欠陥側**（`:184` 同名 5 値定義） |

配布物コンポーネント: 中立バンドル `dist/plugins/formal-model-check/`（`plugin.json` / `README.md` / `stages/formal-model-check.md` + 7 面 `INSTALL.md` = 計 10 ファイル、`find` 実測）と、各ハーネス dist / self-install の `hooks/amadeus-plugin-compose.ts` + `tools/` 3 本（5 面）。

### 検証系コンポーネント（plugin テスト 24 件の内訳と駆動形態）

**unit（純関数・in-process、8 件）**: `t252`（合成エンジン純関数）/ `t300`（`parsePluginCliArgs`）/ `t301`（CLI 純 seam）/ `t306`（`PLUGIN_HOST_CLASS` × 7 面）/ `t313`（`buildDoctorPluginSection`）/ `t314`（`doctorPluginRows` / `formatDoctorPluginLine`）/ `t-plugin-projection`（投影純関数 + 定数集合。`:308` `expect(PACKAGE_HARNESSES).toHaveLength(7)`）/ `plugin-discovery-overhead-gate`。

**integration（実 FS、in-process 駆動が主、17 件）**: `t253`（FS 証明、medium）/ `t254`（reference lifecycle、`applyPluginDrop` を直接呼ぶ `:286`）/ `t299`（walking skeleton、**recompile スタブ** `:75-78` + 唯一の実 spawn `:205-218`、medium）/ `t302`（失敗分岐）/ `t303`（`projectPluginForHarness`、medium）/ `t308`（7 面投影）/ `t310`（`--check` seam、medium）/ `t311`（パッケージャ側 0-plugin baseline、37 行）/ `t315`（統合 doctor、medium）/ `t321`（activation seam、ヘッダ `:5` verbatim「driven IN-PROCESS so the added orchestrate lines register in lcov」）/ `t322`（activation behaviour）/ `t338`（recompile self-heal、カウンタ、medium）/ `t-formal-verif-plugin-lifecycle`（spawn した orchestrate。ヘッダ `:8` verbatim は `--single` **付き**）/ `t-formal-verif-plugin-stage-discovery`（graph join）/ `t-plugin-projection-packaging`（`:44` 別名 import、`:48` 7 値ハードコード）/ `t-plugin-stage-discovery-performance` / `t327`（hook 配線 XOR）。

**e2e: 0 件**（`git ls-files tests/e2e/ | grep -c plugin` = 0）。既存 e2e コンポーネントは 83 ファイル（serial 35）で、駆動機構は (a) node-pty / @xterm/headless の TUI 系（capability gate `t-tui-preflight.serial.test.ts`）(b) ハーネス CLI 実起動 + 出荷 dist の tmp コピー（`t-print-kimi-*`、live gate 付き）(c) 実バイナリ spawn + fetch shim によるオフライン E2E（`setup-install.test.ts` ほか）の 3 系統。#1589 で追加する検証コンポーネントは (b)(c) のいずれかの様式に載る。

**実行トリガーの欠落（コンポーネント外の制約）**: e2e プロファイルは `tests/run-tests.ts:125-126` の通り `--ci` に含まれず `--release` / `--e2e` 明示時のみ実行され、CI（`.github/workflows/ci.yml:163` = `bun run test:ci -- -P 4`）は `--ci` のみを呼ぶ。**e2e 検証コンポーネントを追加しても、実行するコンポーネント（CI ジョブ）が別途必要**。

## plugin ホスト配信のコンポーネント（260727-install-doc-mismatch、履歴 2026-07-27、差分リフレッシュ）

260727-install-doc-mismatch 差分リフレッシュ（2026-07-27、observed `46a75f2e7`、base `0d83aa48b`、距離 70）。上流入力: Developer スキャン結果。本区間で plugin ホスト配信（前 intent `260726-plugin-host-delivery` の Construction U2–U8）が着地し、以下のコンポーネントが新規に現れた。

| コンポーネント | 実体（observed `46a75f2e7`） | 責務 | #1569 との関係 |
| --- | --- | --- | --- |
| **plugin CLI** | `packages/framework/core/tools/amadeus-plugin.ts`（607 行） | discovery + compose + status。`pluginSourceRootOf:278` が discovery staging root（`.amadeus-plugin-src`）を決める単一定義 | discovery 入力先の**正**（ユーザー裁定 A の基準面） |
| **composition engine** | `packages/framework/core/tools/amadeus-plugin-compose.ts`（1469 行） | inspect / plan / apply の3面 atomic transaction、read-only doctor 投影。旧 `plugin-composition.ts` からの core 再配置 | compose 出力先 `plugins/<name>/` を書き出す（doc が誤って案内する先） |
| **activation policy** | `packages/framework/core/tools/amadeus-plugin-activation.ts`（295 行） | spec-hash advisory activation（U6） | 直接関与なし |
| **install bundle projector** | `scripts/plugin-projection.ts`（877 行） | 7 面の install bundle をバイト投影。`installDoc:580-610` が INSTALL.md 本文を class 別生成 | installDoc `:593` が**誤**の案内先を生成（患部）。`.amadeus-plugin-src` を 0 参照 |
| **dist packager / guard** | `scripts/package.ts`（898 行） | `pluginBundleExpected:787-796`（installDoc からバイト再導出）+ `checkPluginProjections:832`（バイト比較） | installDoc 修正後の dist 6 面 stale を機械検出（docs prose は対象外） |
| **authoring source** | `plugins/formal-model-check/`（`plugin.json` / `README.md` / `stages/`） | 参照 plugin の正本 | — |
| **install bundle（配布）** | `dist/plugins/formal-model-check/<face>/`（7 面、37 files） | 各面が INSTALL.md + `plugins/<name>/` + hooks を同梱 | 6 面 INSTALL.md（claude 以外）が copy 行を持つ |
| **docs コンポーネント** | `docs/guide/19-plugins.md`（EN）/ `19-plugins.ja.md`（JA 対訳） | plugin 導入ガイド | `:183`/`:175` が installDoc 内容を手書き複製（ドリフトガード非対象・修正対象） |

class 分類（`PLUGIN_HOST_CLASS`、ADR-4）: `native-manifest`（claude）/ `folder-drop-auto`（codex・cursor・kimi・kiro・kiro-ide）/ `manual-only`（opencode）。copy 行を出すのは後者 2 クラスの計 6 面。

測定 ref: observed `46a75f2e7`（cid:reverse-engineering:measurement-ref-in-artifacts）。

## docs 同期の対象コンポーネントと真実源インベントリ（260727-docs-impl-sync、履歴、amadeus-document）

測定 ref: observed `aabc0527d`、base `1673c4332`（祖先 exit 0 / 距離 47）。

**ハーネス面インベントリ（`ls -d packages/framework/harness/*/`、= 7）**

| ハーネス | セルフインストール面 | パッケージ面 | 区間内変更 |
| --- | --- | --- | --- |
| claude | `.claude/`（25 ファイル変更） | ✅ | plugin hook 追加 |
| codex | `.codex/`（23） | ✅ | — |
| cursor | `.cursor/`（22） | ✅ | — |
| opencode | `.opencode/`（24） | ✅ | 起動エラー修正 #1508 |
| **kimi** | `.kimi-code/`（**294 = 新設**） | ✅ | **#1522 新規追加** |
| kiro | なし（意図的除外） | ✅ | — |
| kiro-ide | なし（意図的除外） | ✅ | — |

`PACKAGE_HARNESSES` = 7（`scripts/plugin-projection.ts:41-49`）、`SELF_INSTALL_HARNESSES` = 5（`:55`）。

**hook インベントリ（`ls packages/framework/core/hooks/`、= 12）**: `amadeus-audit-logger.ts` / `amadeus-log-subagent.ts` / `amadeus-mint-presence.ts` / **`amadeus-plugin-compose.ts`（区間内新設・12番目）** / `amadeus-runtime-compile.ts` / `amadeus-sensor-fire.ts` / `amadeus-session-end.ts` / `amadeus-session-start.ts` / `amadeus-statusline.ts` / `amadeus-stop.ts` / `amadeus-sync-statusline.ts` / `amadeus-validate-state.ts`。うち flow-altering は `amadeus-stop.ts` の 1 件のみで、残り 11 は non-blocking（新 hook もこの契約側に属する — 失敗時 stderr 1 行 + exit 0）。

**agent インベントリ（`ls packages/framework/core/agents/*.md | wc -l` = 14）**: domain-expert **11**（architect / aws-platform / compliance / delivery / design / developer / devsecops / operations / pipeline-deploy / product / quality）+ reviewer **2**（architecture-reviewer / product-lead）+ composer **1**。docs の「11 domain-expert agents」表現は**正**、「Eleven flat agent files」（`docs/reference/01-architecture.md:60` / `.ja.md:60`）は**誤**（= 14）。この乖離は区間外の pre-existing。

**区間で追加された CLI／ツールコンポーネント**

| コンポーネント | 種別 | 規模 | 契約 |
| --- | --- | --- | --- |
| `core/tools/amadeus-plugin.ts` | CLI | +454 新設 | 4 verb（compose / doctor / drop / status）、usage-error は exit 2 |
| `core/tools/amadeus-plugin-compose.ts` | エンジン | 移設 +111/-7、1469 行 | 合成の単一定義。dist 同梱面が `scripts/` を import しない |
| `core/hooks/amadeus-plugin-compose.ts` | hook | +23 新設 | SessionStart、CLI の薄いラッパ、合成ロジック非再実装 |
| `scripts/metrics-visualize.ts` | スクリプト | +292 新設 | 自己完結 HTML、決定的レンダリング、`--check` バイト比較 |
| `harness/kimi/hooks/amadeus-kimi-lib.ts` | アダプタ lib | +352 新設 | Kimi hook payload → core 中立契約の写像 |
| `harness/kimi/hooks/amadeus-kimi-adapter.ts` | アダプタ | +28 新設 | 同上のエントリ |
| `harness/kimi/skills/amadeus/SKILL.md` | スキル | +238 新設 | Kimi 面のオーケストレーター |
| `harness/kimi/skills/amadeus/question-rendering.md` | スキル補助 | +109 新設 | 質問レンダリング様式 |

**mirror コンポーネント群（16 モジュール、区間内で v1 統一）**: `amadeus-mirror.ts`（357 行、+73/-303）/ `-capability` / `-config` / `-coordinator` / `-executor` / `-gateway` / `-lifecycle` / `-policy` / `-presentation` / `-provenance` / `-repair` / `-runner` / `-state-codec` / `-state-reducer` / `-state-store` / `-types`。legacy「Mirror Issue」フィールドの読取コンポーネントは全廃済み。

**docs 側の消費コンポーネント（患部）**: 上記真実源を手書きで複製している docs は README 2 件 + `19-plugins` 2 件 + JA hook 記述 4 件 = **8 ファイル**（`01-architecture.{md,ja.md}:60` の agent 数を含めると 10）。いずれも実装からの導出機構を持たず、ドリフトガードも存在しない。

## mirror 状態表現分裂 患部コンポーネント（260726-mirror-state-split、履歴、Issue #1547 + #1534）

測定 ref: observed `f9a0fb86a`（base `1673c4332`、距離 38）。所在・コピー数は同 commit の `git ls-files` / `grep -n` / `wc -l` 出力からの転記。上流入力は Developer スキャン結果 `inception/reverse-engineering/scan-notes.md`。

### 患部コンポーネント一覧

| コンポーネント | 所在 | 役割 | 系統 | 本 intent での位置づけ |
| --- | --- | --- | --- | --- |
| `mutateMirrorStateAtomic` | `amadeus-mirror-state-store.ts:158`（呼出 executor `:71` / lifecycle `:629`） | v1 sentinel ブロックの atomic write（唯一の書き手） | Write | 正しい権威。read はここが書いた表現に寄せる |
| `MIRROR_STATE_SENTINEL_START/END` | `amadeus-mirror-state-codec.ts:38-39` | v1 ブロック境界。`parseMirrorStateDocument`（`:1301`）が読取 | Write | 修正後 read が参照すべき権威表現 |
| `buildSnapshot` / status read | `amadeus-mirror.ts:169`（`:188` で `mirrorIssue` 決定） | status が `getField("Mirror Issue")` で legacy field を読む | Read | **主患部 A**（v1 非参照） |
| `hasMirrorIssue` ×2 | `amadeus-orchestrate.ts:314` / `:3522` | boundary auto-sync/suppress・report 判定が legacy field を読む | Read | **主患部 B**（同根 2 箇所、同時修正必須） |
| `compareMirrorStatus` | `amadeus-mirror.ts:249-258` | legacy field null → `mirror-missing` 報告（findings 型 `:231-233`） | Read | 症状の出所（create 後も missing） |
| `writeMirrorIssueField` | `amadeus-mirror.ts:363`（呼び手 `:413` = `handleCreate` 内） | legacy field の唯一の writer | dead | **CLI 実行時不到達**（main 不到達）。撤去可否は要件裁定 |
| `handleCreate` / `handleSync` / `handleClose` | `amadeus-mirror.ts:379` / `:425` / `:450` | 旧 CLI verb ハンドラ | dead | main（`:570-585`）不到達。t232 のみ参照。dead path が偽 green を生む |
| `runLegacyMutation` | `amadeus-mirror.ts:533` | 名称に反し v1 lifecycle（`runMirrorLifecycleBoundary`）を呼ぶ | Write 経路 | 命名 misdirection。成功時 `issueNumber` echo のみで可視 field を残さない |
| `renderMirrorMarker` | `amadeus-mirror-provenance.ts:47` | ownership marker の唯一の書き手 | marker | legacy 経路が呼ばず → #1534 の根 |
| `runRepairRelink` / `verifyOwnership` | `amadeus-mirror-lifecycle.ts:775`（`:785` marker 検査 / `:788` message） / `amadeus-mirror-provenance.ts:149`（`:165` `missing-marker`） | marker 必須の復旧経路 | marker | marker 無き legacy Issue を fail-closed 拒否 → in-tool 復旧ゼロ |
| status テスト | `tests/unit/t232-amadeus-mirror.test.ts:104` / `:124` | `snapshot({ mirrorIssue: 1161 })` で legacy field を直接シード | テスト | **偽 green の発生源**（v1 ブロックを書かず、real-create→status e2e が不在） |

### 配布増幅

mirror スタック各モジュールは `git ls-files "*<module>.ts"` = **13 パス**（正本 1 + self-install 5 = `.claude` `.codex` `.cursor` `.kimi-code` `.opencode` + dist 7 = `claude` `codex` `cursor` `kiro` `kiro-ide` `opencode` `kimi`）。投影宣言は `packages/framework/harness/projections.ts:23-32`（mirror 群 10 宣言）。

### 区間での変化

区間 38 コミットで**上記コンポーネントはいずれも無変更**（mirror スタック 8 モジュール各 `git log --oneline 1673c4332..HEAD -- <path>` = 0 行）。区間で変化したのは gateway envelope（#1537）/ core tools dedup（#1521、orchestrate.ts の非欠陥面）/ Kimi ハーネス / metrics 面であり、状態表現分裂の write/read 経路は非交差。

## mirror-gateway 患部コンポーネント（260726-mirror-envelope-lf、履歴、Issue #1498）

## kimi ハーネス面・metrics 可視化・plugin perf ゲートのコンポーネント（260726-plugin-host-delivery、履歴 2026-07-26、差分リフレッシュ）

260726-plugin-host-delivery 差分リフレッシュ（2026-07-26、observed `0d83aa48b886fe85cd977569c0e7b3015b84d3e5`、base `1673c4332`、距離 43）。上流入力: Developer スキャン結果（実測済みスキャンノート）。

| コンポーネント | 所在 | 責務（区間内の新規／変更） |
|---|---|---|
| kimi manifest | `packages/framework/harness/kimi/manifest.ts` | 第7ディストリ面の投影宣言。token = `.kimi-code`（`:10`）、hooks はユーザーレベル `~/.kimi-code/config.toml` の marker-fenced managed block（`:22`） |
| kimi hooks | `packages/framework/harness/kimi/hooks/`（`amadeus-hooks.snippet.toml` = 単一ソース、`amadeus-kimi-adapter.ts`、`amadeus-kimi-lib.ts`） | Kimi Code CLI の hook イベントを framework hooks へ橋渡し |
| kimi skills | `packages/framework/harness/kimi/skills/amadeus/`（`SKILL.md`、`question-rendering.md`） | Kimi 向けオーケストレーター表層 |
| setup kimi-hooks | `packages/setup/src/domain/kimi-hooks.ts` / `src/modules/kimi-hooks.ts` | config.toml managed block の merge（domain 純関数 + I/O module の既存境界に準拠） |
| metrics-visualize | `scripts/metrics-visualize.ts`（新規） | metrics スナップショットの自己完結 HTML ダッシュボード生成。`--write` / `--check`（drift guard）。CI render step 配線済み（[PR #1504](https://github.com/amadeus-dlc/amadeus/pull/1504)） |
| plugin-discovery-overhead-gate | `tests/lib/plugin-discovery-overhead-gate.ts` + `tests/unit/plugin-discovery-overhead-gate.test.ts` | plugin stage discovery の perf ゲート再設計（[PR #1535](https://github.com/amadeus-dlc/amadeus/pull/1535) — `DISCOVERY_OVERHEAD_RATIO_LIMIT = 0.2`（`:15`）の相対比 + 絶対 noise floor の **AND** 判定。注: ブリーフィングの #1525 は `git log` 実測で **#1535**） |
| plugin-projection | `scripts/plugin-projection.ts` | **self-install 面を「closed four → closed five」へ拡張** — `:60` `SELF_INSTALL_HARNESSES = ["claude", "codex", "cursor", "opencode", "kimi"]`。packaged 面は seven faces（kiro/kiro-ide は非昇格のまま） |

**無変更の反証確認**: plugin-composition / formal-model-check / `dist/plugins` / トップレベル `plugins/` は区間内で変化なし（`git log --oneline 1673c4332..HEAD -- <各パス>` および `git diff --name-only … | grep -c` の出力 **0 件**）。

測定 ref: observed `0d83aa48b`（cid:reverse-engineering:measurement-ref-in-artifacts）。

## mirror-gateway 患部コンポーネント（260726-mirror-envelope-lf、履歴、Issue #1498）

測定 ref: observed `e39402224`（base `1673c4332`、距離 27）。所在・コピー数は同 commit の `git ls-files` / `grep -n` / `wc -l` 出力からの転記。上流入力は Developer スキャン結果 `inception/reverse-engineering/scan-notes.md`。

### 患部コンポーネント一覧

| コンポーネント | 所在 | 役割 | コピー数 | 本 intent での位置づけ |
| --- | --- | --- | --- | --- |
| `parseHttpEnvelope` | `amadeus-mirror-gateway.ts:179-235` | `gh --include` stdout を statuses + JSON body へ分解 | 正本 1 + 配布 10 | **主患部**（`:196` の CRLF 前提終端探索） |
| `interpretApiResult` | 同 `:483-553` | envelope の分類（`:495` パーサ呼び出し、`:509` malformed 分岐、`:525-534` `invalid-response`） | 同上 | 症状文字列の出所 |
| `createArgv` / `findArgv` / `viewArgv` / `editArgv` / `closeArgv` | 同 `:97-116` / `:118-132` / `:134-139` / `:141-155` / `:157-170` | 5 verb の argv 構築。`findArgv` のみ `--paginate --slurp`（`:124-125`） | 同上 | 影響範囲の確定に使用 |
| `findIssuesByMarker` | 同 `:655-685` | ページ統合。`:665` `JSON.parse` / `:669` `outer.length !== interp.pageCount` | 同上 | LF 対応後も残る二次患部 |
| mirror lifecycle | `amadeus-mirror-lifecycle.ts:29` が gateway を import | gateway の唯一の内部消費側 | 正本 1 + 配布 10 | 返り値型不変なら無改修見込み（仮説） |
| 投影宣言 | `packages/framework/harness/projections.ts:26` | `"amadeus-mirror-gateway.ts"` を harness 投影対象として宣言 | 1 | 配布同期の根拠 |
| gateway テスト | `tests/unit/t272-amadeus-mirror-gateway.test.ts`（`:11` import、`:61` `block()`） | envelope の golden fixture を自作 | 1 | **偽 green の発生源**（`grep -c 'HTTP/'` = 1） |
| repository テスト | `tests/unit/t270-amadeus-mirror-repository.test.ts:10` | gateway を import する第 2 のテスト | 1 | 修正時の影響確認対象 |
| coverage allowlist | `tests/.coverage-patch-allowlist.json` | gateway の行ピン 5 件（`447-448` / `602` / `615-620` / `702` / `716`） | 1 | 行挿入で全件 stale 化 |
| 過去 record の設計宣言 | `260724-mirror-auto-modes/…/nfr-design/security-design.md:37` | `--slurp` 文法の宣言（実出力と不一致） | 1 | 誤宣言の扱いは requirements で裁定 |

### 配布増幅

`git ls-files "*amadeus-mirror-gateway*"` = **12 パス**（正本 1 / self-install 4 = `.claude` `.codex` `.cursor` `.opencode` / dist 6 = `claude` `codex` `cursor` `kiro` `kiro-ide` `opencode` / テスト 1）。`cmp -s` で配布 10 コピーすべて正本とバイト一致を実測。self-install 側に `.kiro/tools` は存在しない。

**HEAD 前進後の更新（HEAD = `ccdabd323`、Kimi Code CLI ハーネス追加 [PR #1522](https://github.com/amadeus-dlc/amadeus/pull/1522)）**: 同 `git ls-files` は **14 パス**（self-install **5** / dist **7**）。追加は `.kimi-code/tools/` と `dist/kimi/.kimi-code/tools/` の 2 パスで、`cmp -s` により配布 12 コピーすべて正本とバイト一致。**上表のコンポーネント構成・file:line は無変更**（正本ソースは `git log e39402224..HEAD -- '*amadeus-mirror-gateway*'` のヒットが新規コピー 2 パスのみで、`wc -l` = 724 も不変）。

### 区間での変化

区間 27 コミットで**上記コンポーネントはいずれも無変更**（`git log --oneline 1673c4332..HEAD -- '*amadeus-mirror-gateway*'` 出力 0 行）。区間で変化したのは election / audit / graph / benchmark / metrics / CI 面であり、mirror 面とは非交差。

## クロスレビュー済みバグ7件の患部コンポーネント（260726-crossreviewed-bug-batch、履歴、7 Issue）

測定 ref: observed `1673c4332`（base `e12259ba7`、距離 2）。所在・コピー数は同 commit の `git ls-files` / `grep -n` 出力からの転記。上流入力は Developer スキャン結果 `inception/reverse-engineering/scan-notes.md`。

### 患部コンポーネント一覧

| Issue | 主患部コンポーネント | 所在（observed `1673c4332`） | 配布コピー数 |
| --- | --- | --- | --- |
| #1489 | benchmark 集約ゲート | `scripts/mirror-distribution-benchmark-aggregate.ts:20, 32, 33-35, 61-62`（予算側は `scripts/mirror-distribution-benchmark.ts:18-19`） | 0（配布対象外） |
| #1457 | 選挙 verify 配線 / 自己検証 | `packages/framework/core/tools/amadeus-election.ts:486, 494, 503` / `amadeus-election-record.ts:186, 193, 196` | 各 10 |
| #1377 | audit パス構築 / シャード生成 | `amadeus-lib.ts:3313-3316, 3326-3328, 4126-4128` / `amadeus-audit.ts:258-262` / emitter 側 `amadeus-learnings.ts` | 各 10 |
| #1459 | 選挙定義パーサ | `amadeus-election-model.ts:62, 81-82, 449, 456` | 10 |
| #1462 | plugin ステージ探索 | `amadeus-graph.ts:1813, 1823-1824, 1828, 1837` | 10 |
| #1458 | 選挙 transport / report | `amadeus-election.ts:293, 326, 582` / `amadeus-election-transport.ts:165-167, 173, 183` | 各 10 |
| #1388 | team 起動スクリプト | `packages/framework/core/tools/team-up.sh:998, 1061-1062, 1098-1099, 1116-1117`（+ `team-up-codex-safety-wait.ts`） | 10 |

コピー数は `git ls-files "*/<file>" | grep -v '^packages/' | wc -l` の出力からの転記。

### コンポーネント境界の交差（着手順に影響）

- **election サブシステムに3件が集中**: #1457（`amadeus-election.ts` + `amadeus-election-record.ts`）と #1458（`amadeus-election.ts` + `amadeus-election-transport.ts`）は **`amadeus-election.ts` で交差**する。直列化するか、caller 配線（#1457）と report 配線（#1458）でファイル内スコープを非交差に切り分ける判断が要る（cid:code-generation:c6 の非交差判定は静的目録でなく実 diff で行う）。#1459（`amadeus-election-model.ts`）は他2件と非交差。
- **#1377 は `amadeus-lib.ts` に触れる**: 同ファイルは区間直前の #1497 修正で変更されたばかりであり、`.coverage-patch-allowlist.json` の行ピンを持つ（cid:code-generation:allowlist-line-pin-stale — 上方挿入時は台帳行番号の同一 PR 更新が要る）。
- **#1462（`amadeus-graph.ts`）/ #1489（`scripts/`）/ #1388（`team-up.sh`）は相互に非交差**。
- **`reportDelivery` の消費者は現在テストのみ**（`grep -rn "reportDelivery" packages/framework/core/tools/ tests/` の全 6 hit のうち、`amadeus-election.ts` からの hit は 0 件 — 定義 `amadeus-election-transport.ts:183`、コメント 2、テスト import/呼出 4）。#1458 の修正は「新しい消費者を CLI 側に足す」形になる。

### コンポーネント所有の逸脱

#1457 と #1458 はいずれも、**当該コンポーネントの doc コメントが宣言する責務と実際の配線が食い違っている**クラスである（`amadeus-election-record.ts:182-185` / `amadeus-election-transport.ts:165-167`）。すなわち原因の所在は設計ではなく実装（配線）であり、コンポーネント境界そのものの再設計は要求されない。

## metrics サブシステムのコンポーネント（260726-metrics-visualization、履歴）

測定 ref: observed `1c43438df`。所在はすべて同 commit の実ファイル直読による。

### M-1. スナップショット writer（`scripts/metrics-snapshot.ts`）

| 項目 | 内容 |
| --- | --- |
| 所在 | `scripts/metrics-snapshot.ts`（185 行）|
| 責務 | 6 collector を実行し、単一 JSON スナップショットを `metrics/` へ原子的に書き出す |
| 公開面 | `defaultEnv` `:112`（env seam）、`writeSnapshotAtomic` `:153-163`、`runCli` `:169`（`--write` / `--check`）|
| 不変条件 | 値は有限数（`finite` `:26-29`）／シリアライズ後 16,384 バイト以下（`:150`）／既存ファイルへ上書きしない（`:158` throw）|
| 失敗姿勢 | loud-fail。最初の collector 失敗で即 return（`:129`）— 部分スナップショットを作らない |
| 外部依存 | `../tests/complexity-gate.ts`（`runLizard`）、`../tests/lib/test-size.ts` |
| 可視化との関係 | **入力データの発生源**。スキーマ変更はここが起点になるが、可視化は読み取り専用で関与しない |

### M-2. 時系列 reader（`scripts/metrics-timeseries.ts`）— 可視化の主再利用 seam

| 項目 | 内容 |
| --- | --- |
| 所在 | `scripts/metrics-timeseries.ts`（236 行）|
| 責務 | `metrics/*.json` をパースし、collector 別の時系列テーブルをプレーンテキストで描画する |
| 契約 | **`:3-4` verbatim「must not import any fs write API (AC-1c; grep-checkable)」— 書き込み禁止**。grep で機械検査可能 |
| 公開型 | `CollectorEntry` `:20` / `Snapshot` `:25` / `ParseOutcome` `:32` / `NonEmpty` `:36` / `CollectorResolution` `:38` |
| 公開関数 | `parseSnapshot` `:50` / `assertNonEmpty` `:81` / `buildSeries` `:87` / `discoverCollectors` `:95` / `unionValueKeys` `:103` / `resolveCollector` `:113` / `renderDigest` `:131` / `renderCollectorTable` `:151` / `parseArgs` `:171` / `main` `:188` |
| 非公開 | `formatValue` `:117-119`（`typeof` 分岐）、`renderTable` `:121` |
| 型の緩さ | `values` の個値は `unknown` のまま（`:18-19` に明文）。描画側が `typeof` で分岐する責務を負う |
| 可視化との関係 | **パース・系列化・キー集合解決をそのまま再利用できる**。ただし `--html` 等の出力フラグ追加は AC-1c 契約に抵触するため不可 |

### M-3. 保持ポリシー pruner（`scripts/metrics-retention.ts`）— 同型先例

| 項目 | 内容 |
| --- | --- |
| 所在 | `scripts/metrics-retention.ts`（129 行）|
| 責務 | 最新 `METRICS_RETENTION_KEEP_LAST` 件を残して剪定する |
| 定数 | `METRICS_RETENTION_KEEP_LAST = 360` `:25`（約 12/日 × 約 30 日、[Issue #1121](https://github.com/amadeus-dlc/amadeus/issues/1121) の E-1121-RA Q1 由来）|
| 契約 | fail-closed `:6-9` — 1件でも不正なら削除 0 件で exit 1 |
| 依存 | `parseSnapshot` を `:17` で import。**private parser を持たない**（writer / reader / pruner が妥当性定義を共有する明文契約）|
| フィルタ | `:45` — `readdirSync(dir).filter((f) => f.endsWith(".json"))` |
| 可視化との関係 | **「reader を import しつつ自身は書き手」という構造の唯一の先例**。新規可視化モジュールが倣うべき同型 |

現データ量は `metrics/*.json` **123 件**（`ls metrics/*.json \| wc -l`）で、保持上限 360 の 1/3 弱。剪定は現時点で発動していない。

### M-4. CI publication job（`.github/workflows/ci.yml:398-`）

| 項目 | 内容 |
| --- | --- |
| job 名 | `metrics-snapshot` `:398` |
| 発火 | `push` かつ `main` かつ `coverage` job 成功 |
| 位置づけ | **`ci-success` 集約の外**（`:396-397` のコメントで意図を明文化）。PR をブロックしない |
| 直列化 | concurrency group `metrics-snapshot-main`、`cancel-in-progress: false` |
| 自己再帰の遮断 | `:12-13` `paths-ignore: metrics/**` |
| 主要ステップ | snapshot `--write` `:446` → retention `--apply` `:449` → `git add -A metrics/` `:461` → `gh pr create` `:470` → `gh pr merge --auto --squash --delete-branch` `:475` |
| 誤解の訂正 | **`main` 直 push ではない**。`GITHUB_RUN_ATTEMPT` 入りブランチ + PR auto-squash。260712 設計の「push 最大3回再試行」は現実装と不一致 |
| 可視化との関係 | 挿入位置の候補は `:449` の後・`:461` の前。`metrics/` 配下へ出力すれば commit に自動で乗るが `paths-ignore` と retention の `*.json` フィルタ `:45` への影響を要設計 |

### M-5. HTML 生成の既習コンポーネント（`tests/run-tests.ts`）

| 項目 | 内容 |
| --- | --- |
| 所在 | `tests/run-tests.ts:573` `writeCoverageHtml` / `:526` `coverageHtmlEscape` |
| 様式 | テンプレートリテラル直書きの自己完結 HTML。外部アセット・CDN 参照なし |
| 検証 | 生成物を読み返す assert（`t05:582`）|
| 位置づけ | **repo 内で唯一の HTML 生成器**。チャートライブラリの前例は 0 件 |
| 可視化との関係 | inline SVG はこの様式の自然な延長。新規ランタイム依存を持ち込まない方向と整合する |

### M-6. metrics テスト群（8ファイル）

| 層 | ファイル | test 数 | covers マーカー |
| --- | --- | --- | --- |
| unit | `t221-metrics-snapshot-core` | 6 | — |
| unit | `t221-metrics-snapshot-cli` | 7 | — |
| unit | `t221-metrics-snapshot-collectors` | 2 | — |
| unit | `t230-metrics-timeseries` | 17 | `harness-instrument:metrics-timeseries` |
| unit | `t231-metrics-retention` | 9 | `harness-instrument:metrics-retention` |
| integration | `t221-metrics-snapshot.integration` | 9 | — |
| integration | `t230-metrics-timeseries.integration` | 9 | `harness-instrument:metrics-timeseries` |
| integration | `t231-metrics-retention.integration` | 10 | `harness-instrument:metrics-retention` |

integration は `AMADEUS_METRICS_ROOT` seam で実 FS を差し替える。可視化モジュールも同じ2層構成 + covers マーカーに倣う。**なお covers マーカーは `tests/.coverage-registry.json` には登録されていない**（同ファイルの `grep -c 'harness-instrument'` = **0**）— registry 連携は既存 metrics テストが行っていないため、要否は設計段の判断事項（詳細は `code-structure.md` の同 intent 節）。

### 区間で新設されたコンポーネント（metrics 面には非交差）

| コンポーネント | 所在 | 系統 |
| --- | --- | --- |
| grant authorization | `packages/framework/core/tools/amadeus-grant-authorization.ts`（+876、新規）| A（PR #1483）|
| presence reservation | `packages/framework/core/tools/amadeus-presence-reservation.ts`（+512、新規）| A（PR #1483）|
| `HookStdin` / `hookPayloadCwd` / `readHookStdin` | `amadeus-lib.ts:4773` / `:4779` / `:4794` | B（PR #1493）|
| `resolveProjectDirFromHook`（シグネチャ変更）| `amadeus-lib.ts:269`（第2引数 `payloadCwd?: string \| null`）| B（PR #1493）|

`scripts/metrics-*.ts` の3ファイルは `amadeus-lib` を import しない（各 `grep -c` = **0**）ため、上記いずれとも依存関係を持たない。

## solo standing grant 認可コンポーネント（260726-grant-scope-gate、履歴、Issue #1497）

測定 ref: observed `e12259ba7`（base `11f1ad61f`、距離 4）。所在・行数はすべて同 commit の実ファイル直読（`wc -l` / `grep -n` 出力からの転記）。

### 新規コンポーネント（PR #1483 で導入）

| コンポーネント | 所在 | 行数 | 責務 | 所有境界 |
| --- | --- | --- | --- | --- |
| `amadeus-grant-authorization` | `packages/framework/core/tools/amadeus-grant-authorization.ts` | 876 | solo モードの常任グラント台帳スキャン・検証・route receipt 発行・approval authority 分類 | core 中立層。`amadeus-lib.ts` から `standingGrantSatisfiesGate`（`:16`）等を import する消費側 |
| `amadeus-presence-reservation` | `packages/framework/core/tools/amadeus-presence-reservation.ts` | 512 | presence 予約（人間承認の先取り確保）の管理 | core 中立層 |

`amadeus-grant-authorization.ts` の主要関数（すべて同ファイル内、observed 直読）:

| 関数 | 行 | 役割 |
| --- | --- | --- |
| `validateGrant` | `:318-340` | グラント単体の妥当性判定。`:336` で `standingGrantSatisfiesGate` を呼び、false なら `gate-out-of-scope` |
| `selectBestGrant` | `:352-388` | 台帳から最適グラントを選択 |
| `findSoloStandingGrant` | `:389-410` | solo 経路のグラント探索エントリ（export） |
| `validateGrantById` | `:427-444` | ID 指定検証 |
| `routeSoloStandingGrantDirective` | `:739-800` | directive 差し替えと `GATE_AUTHORIZATION_SELECTED` receipt append。`:762` で grant null なら directive 無変更返却、`:776` で receipt 発行 |

### 既存コンポーネントの増分と患部

| コンポーネント | 区間増分 | 本 intent での位置づけ |
| --- | --- | --- |
| `amadeus-lib.ts` | `+160` | **患部所有**。`standingGrantSatisfiesGate :3985-4017` / `evaluateStandingGrantGateEligibility :3951-3969` / `StandingGrant.parse :3774-3816` / `SKELETON_ON_SCOPES :3896-3904`（`amadeus-feature` は `:3900`）/ `getField :4903-4914` |
| `amadeus-state.ts` | `+540` | 発行 verb `grant-standing-delegation` / `revoke-standing-delegation`（`:732-737`）、team mode 呼び出し元 `:2470`・`:3269`、approve 側 receipt 解決 `:2985-3040`、`printAwaitApproval :3198-3207` |
| `amadeus-orchestrate.ts` | `+188` | `routeMainWorkflowDirective :1597`（solo route 入口）、受け側 `:3442-3478`、plugin opt-in 判定 `:2796` |
| `amadeus-directive.ts` | `+168` | directive 契約面 |
| `amadeus-audit.ts` | `+8` | `:850-854` が汎用 CLI からの `GRANT_ISSUED` 手動 mint を拒否 |

### グラント系テストコンポーネント

| ファイル | 位置づけ |
| --- | --- |
| `tests/harness/solo-gate-fixture.ts`（341 行） | `:50` で `.codex/tools/data/stage-graph.json`（self-install コピー = 実 graph）を読む唯一のグラント系ハーネス。ただし state fixture は `tests/fixtures/state-mid-inception.md:6` = `Scope: bugfix`（stock）、グラントは `Includes Phase Boundary: true`（`:116`）で、欠陥が現れない組合せ |
| `tests/harness/git-sha.ts`（36 行） | PR #1493 で新設 |
| `t-solo-gate-transaction{,-carrier,-prefix,-report,-seam}.test.ts` | integration 計 2,272 行 |
| `t-solo-standing-grant-{domain,harness,opencode-mint}.test.ts` | domain / harness / mint 面 |
| `unit/t-solo-gate-transaction.test.ts` / `unit/t-solo-standing-grant-domain.test.ts` | unit 面 |
| `t-standing-grant.test.ts`（既存 `+135`） | `:221-253` がゲート分類を検証するが scope は `"feature"` 固定（`:222`）、`:889-923` の skeleton 面も feature / bugfix のみ |

## worktree パス／ref 解決コンポーネント（260725-worktree-ref-fixes、履歴: 2026-07-26、Issue #1482 / #1481 / #1455）

測定 ref: observed `11f1ad61f`。所在はすべて同 commit の実ファイル直読による。

### C-1. hook project-dir リゾルバ（`resolveProjectDirFromHook`）

| 項目 | 内容 |
| --- | --- |
| 所在 | `packages/framework/core/tools/amadeus-lib.ts:247`（export） |
| 責務 | hook プロセスが「どの project root に対して動いているか」を解決する |
| 内部依存 | `hasWorkspaceMarker`（`:227`、非 export）、`findWorkspaceMarkerAncestor`（`:235`、非 export）、`stripHarnessLeaf`、`KNOWN_HARNESS_DIRS` |
| 入力 | `importMetaUrl`（呼び出し元のスクリプトパス）、`process.env.CLAUDE_PROJECT_DIR`、`process.cwd()` |
| 解決順序 | rung1 env `:249` → rung2 marker `:258-259` → rung3 スクリプトパス `:263-265` → rung4 cwd harness dir `:268-273` → cwd `:275` |
| 消費者 | 実呼び出し12箇所（core hooks 11 + kiro-ide adapter 1。列挙は `code-structure.md` 同 intent 節） |
| 配布コピー数 | 11（正本 + harness 表層4 + dist 6） |
| 欠陥 | rung1 が env を無条件採用するため、cwd だけが worktree へ切り替わる EnterWorktree セッションで本線を返す（#1482） |
| 対照 | 姉妹 `resolveProjectDir`（`:170`）は `:172` で明示引数を第1順位に置き engine 経路を救済 |
| テスト | `tests/unit/t202-hook-project-dir-worktree-marker.test.ts`（正典。`:105` の test 2 が現行 rung 順序を固定） |

### C-2. Stop hook（`amadeus-stop.ts`）

| 項目 | 内容 |
| --- | --- |
| 所在 | `packages/framework/core/hooks/amadeus-stop.ts`（正本）。`:118` で C-1 を import、`:167` で解決 |
| 起動 | `.claude/settings.json:154` — `bun $CLAUDE_PROJECT_DIR/.claude/hooks/amadeus-stop.ts` |
| `projectDir` の消費 | 24箇所（state path `:880`、engine 呼び出し `:793` / `:802`、audit `:266`、stage dir `:455` ほか） |
| 配布コピー数 | 11 |
| 位置づけ | #1482 の**症状が最も可視な**消費者であり、欠陥の所在ではない。欠陥は C-1 側にあり hook 一族12箇所が同じ誤解決を共有する |

### C-3. main checkout リゾルバ（`resolveMainCheckout`）— 参照実装

| 項目 | 内容 |
| --- | --- |
| 所在 | `packages/framework/core/tools/amadeus-lib.ts:4131`（export、戻り値 `MainCheckout \| null`） |
| 実装方式 | git plumbing サブプロセス — `:4132` `rev-parse --show-toplevel`、`:4135` `rev-parse --git-common-dir` |
| 位置づけ | **worktree 安全な既習様式**。#1481 の修正方針が倣うべき前例。同型前例に `codex/tools/amadeus-codex-hooks-migration.ts:590` |
| 自己参照 | `:4165` / `:4166` で cwd 版と projectDir 版の両方を解決 |

### C-4. テスト内 SHA リゾルバ（`currentGitSha`）— 三重複製

| 複製 | 所在 | シグネチャ | throw 行 |
| --- | --- | --- | --- |
| 1 | `tests/integration/t257-status-registry-migration.test.ts:193` | `currentGitSha(): string` | `:214`（`cannot resolve Git ref`） |
| 2 | `tests/integration/t258-lifecycle-transaction.test.ts:434` | `currentGitSha(): string` | `:455`（`Cannot resolve Git ref`） |
| 3 | `tests/integration/t259-guard-integration.test.ts:77` | `currentGitSha(repositoryRoot: string): string` | `:96`（`Unable to resolve Git ref`） |

| 項目 | 内容 |
| --- | --- |
| 責務 | provenance 記録テストが現 HEAD の SHA を得る |
| 実装方式 | **FS 直読**（`.git` の dir/file 判別 → `gitdir:` 追従 → `HEAD` 読取 → loose ref → `commondir` → `packed-refs`） |
| 共有状態 | **共有されていない**。3複製がエラー文言と引数形で食い違う（canonical 1定義から導出されていない） |
| 欠陥 | loose ref を worktree gitDir 配下でしか探さず、common dir へは `packed-refs` としてしか降りないため worktree で必ず throw（#1481 / #1455） |
| 導入 | 3件とも `2e157d7fe`（2026-07-23、#1424）。helper 全24行が単一コミット帰属、後続修正なし |
| 現症状 | worktree で t257 exit 1（10 pass / 1 fail）、t258 exit 1（25 / 1）、t259 exit 1（9 / 1）。各スイートで赤いのは helper を通る1テストのみ |
| 同根棚卸し | git 内部レイアウトを FS 直読するのは**この3ファイルのみ**。他はすべて git サブプロセス経由で worktree 安全 |

### C-5. worktree fixture 参照点（修正時の影響確認先）

`tests/harness/fixtures.ts:543` / `tests/unit/t49-*:22` / `tests/e2e/t06-*:17` — worktree レイアウトを前提に持つ既存 fixture。ref 解決方式を変更する際の回帰確認先。

## Team Mode 起動経路コンポーネント（260725-teamup-launch-hardening、履歴、Issue #1476 / #1478）

差分リフレッシュ（base `ec624022f` → observed HEAD `4a0f91ad07dbe17c6477b7fe9b52a0e9ab4532ba`、距離 9、amadeus-feature / Standard）。測定 ref: observed HEAD 実ファイル直読。**行番号は 260725-teamup-attach-latency 節から +23 シフトしている**（PR #1477 が :1071 以降に 23 行を挿入）ため、以下が現行値。

### 正本コンポーネント: `packages/framework/core/tools/team-up.sh`（**1497 行**）

| コンポーネント | 行 | 種別 | 本 intent での役割 |
| --- | --- | --- | --- |
| `CLAUDE_MONITOR_PROMPT` | `:104` | 定数 | **U1 の変更中心**。actas 化で per-member 化が必要 |
| `WATCHER_READY_TIMEOUT` | `:108` | 定数（既定 90、env override 可） | 検証再有効化時の待ち予算（1ラウンド） |
| `WATCHER_RESEND_MAX` | `:114` | 定数（既定 1、env override 可） | ラウンド数 = `+1` = 2。最悪 180 秒 |
| `AGMSG_ACTAS_LOCK_LIB` | `:118` | 定数（env override 可） | agmsg `lib/actas-lock.sh` の source 元。テストが stub を差せる seam |
| `start_safety_wait_supervisors` | `:399` | 関数 | 検証のバックグラウンド化を検討する際の同型パターン参照先 |
| `mux_attach` | `:513-515` | 関数 | **ユーザーが interactive に触れる点**。検証はこの前（`:1483` に対し `:1479`）。実体は `open -na Ghostty --args -e ...` の**非ブロッキング1行** |
| `claude_member_cmd` | `:860` | 関数 | 初期プロンプト組立（`:861`）と `delivery.sh set monitor` 実行（`:876-878`）。**U1 の主変更点** |
| **`WATCHER_SKIP_ANNOUNCED`** | `:1091` | **新設**（PR #1477） | スキップ告知の one-shot ラッチ |
| `watcher_verification_applies` | `:1092` | 関数（**PR #1477 で拡張**） | runtime/backend 2条件 + prompt 形（`:1094-1096`）。既定では false |
| `ready_sentinel_path` | `:1111` | 関数 | agmsg lib を source して path を導出（文字列非複製） |
| `resend_monitor_prompt` | `:1143` | 関数 | 再送。`:1202` で `CLAUDE_MONITOR_PROMPT` を受ける |
| `clear_stale_watcher_sentinels` | `:1155` | 関数 | `:1461-1463` で呼出（ガード配下） |
| `verify_watchers_armed` | `:1174` | 関数 | `:1479` で同期実行（ガード配下）。現在は未発火 |
| `rollback_prepared_run` の worktree ロールバック | `:1241`（読み手 `:1244`、除去 `:1247`） | 関数（`handle_exit` `:1253` が `:1259` で呼ぶ） | `CREATED_MEMBERS` を読む。**U2 の並列化制約** |
| `create_run` | `:1267` | 関数（呼出は `:1427` 単一） | **U2 の変更中心**。worktree 逐次作成ループ `:1302-1310` |
| `CREATED_MEMBERS` | `:1306` 追記 / `:1392` 初期化 | shell 変数 | 成功集合。並列化時は集約が必要 |

### 配布コンポーネント（伝播先、全11面が同期済み）

| 層 | 面数 | パス |
| --- | --- | --- |
| 正本 | 1 | `packages/framework/core/tools/team-up.sh` |
| self-install | 4 | `.claude` / `.codex` / `.cursor` / `.opencode` の `tools/team-up.sh` |
| dist | 6 | `dist/{claude,codex,cursor,kiro,kiro-ide,opencode}/**/tools/team-up.sh` |

（`git ls-files '*tools/team-up.sh' | wc -l` = 11、全面で `grep -c WATCHER_SKIP_ANNOUNCED` = 3。self-install に `.kiro` 系がないのは既存の構成であり本 intent の変化ではない。）

### テストコンポーネント

| ファイル | 行数 | test 数 | 本 intent との関係 |
| --- | --- | --- | --- |
| `tests/integration/t-team-up-watcher-arming.test.ts` | — | — | 既存。fixture が sentinel を自前生成するため外部 seam の欠陥に非到達（`code-quality-assessment.md` D-2）。`:196` の適用可否テストは PR #1477 で prompt 軸を actas 形にピン |
| `tests/integration/t294-team-up-watcher-applicability.test.ts` | **113** | **7** | 新規（PR #1477）。`:44` 既定スキップ / `:52` 出荷定数の形 / `:60` actas forward path / `:68` runtime・backend 非回帰 / `:83` 告知1回・stdout 非汚染 / `:96` 適用時は無告知 / `:104` 機構保持（FR-5） |

### 外部コンポーネント（repo 外・非バージョン管理、`~/.agents/skills/agmsg/`、読取 2026-07-25）

| コンポーネント | 所在 | 役割 |
| --- | --- | --- |
| `watch.sh` の `ACTIVE_NAME` | `:43`（`ACTIVE_NAME="${4:-}"`） | 第4位置引数。非空のときだけ actas モード |
| sentinel 書込ガード | `watch.sh:300`（`if [ -n "$ACTIVE_NAME" ]; then`） | **唯一の書き手**の入口 |
| sentinel 書込 | `watch.sh:307`（`    printf '%s\n' "$SESSION_ID" > "$_rp" 2>/dev/null \|\| true`） | 実書込行 |
| actas 排他ロック | `watch.sh:162` ガード / `lib/actas-lock.sh:140 actas_lock_claim` / `:230 actas_lock_state` | **U1 の未検証リスク**: resume（`-c`）経路で前セッションのロックが残ると `held` で abort しうる |
| monitor 起動経路 | `delivery.sh:301` | 引数 3 個のみ → `ACTIVE_NAME` 空 |
| actas ドライバ規定（**claude-code の正準**） | `drivers/types/claude-code/template.md:143-148` | step 5d: mode が `monitor`/`both` のときだけ watcher 起動、第4引数 `<name>` 付き |
| `SKILL.md` の actas 節 | `:110-115` | **codex 向け**。watcher 起動を規定しない。誤読源 |

## Team Mode 起動レイテンシ関連コンポーネント（260725-teamup-attach-latency、履歴、Issue #1449）

差分リフレッシュ（base `6d4df9056` → observed HEAD `ec624022ff65cc8b3912001f768bd66ec41a0e39`、距離 125、amadeus-bugfix / Minimal）。測定 ref: observed HEAD 実ファイル直読。行番号は 260724 節から移動しているため、以下が現行値。

| コンポーネント | 場所（file:line） | 役割 / #1449 での関与 |
| --- | --- | --- |
| `CLAUDE_MONITOR_PROMPT` | team-up.sh:104 | 初期プロンプト `/agmsg mode monitor`。**monitor モード**を選ぶ点が欠陥の起点 |
| `WATCHER_READY_TIMEOUT` | team-up.sh:108 | per-wait タイムアウト（既定 90 秒）。ブロッキング時間の第1因子 |
| `WATCHER_RESEND_MAX` | team-up.sh:114（verbatim: `WATCHER_RESEND_MAX="${WATCHER_RESEND_MAX:-1}"`） | 再送上限。`9b851c5ae` で 2 → **1** へ短縮（worst-case 270 → 180 秒） |
| `watcher_verification_applies` | team-up.sh:1077-1079 | claude + agmsg のときだけ検証発火するガード |
| `ready_sentinel_path` | team-up.sh:1088-… | agmsg `agmsg_ready_path` を subshell source で解決（path 二重定義回避） |
| `clear_stale_watcher_sentinels` | team-up.sh:1132-1141 | pane 起動前の旧 sentinel 除去 |
| `verify_watchers_armed` | team-up.sh:1151-1190（verbatim :1153 `  local max_attempts=$(( WATCHER_RESEND_MAX + 1 ))`） | **#1449 の核心**。sentinel を 2 ラウンド × 90 秒ポーリング。sentinel は monitor モードでは生成されないため常に失敗 |
| 呼び出し元（launch） | team-up.sh:1455-1457 | `mux_attach`（:1460）の**前**で同期実行 → attach を 180 秒ブロック |
| `git worktree add`（直列） | team-up.sh:1282 | 副次コスト。1.0〜1.2 秒/回（3回実測）、7人で約 7.4 秒 |
| `t-team-up-watcher-arming.test.ts` | tests/integration/（268 行） | agmsg 側をスタブ化（:42 path 関数、:60 fake arming、:87-91 `armAll`）し本欠陥を検出しない |

### 外部コンポーネント（repo 外、`~/.agents/skills/agmsg/`）

| コンポーネント | 場所（file:line） | 関与 |
| --- | --- | --- |
| `watch.sh` sentinel 書込ブロック | watch.sh:300-310 | `ACTIVE_NAME` 非空のときだけ sentinel を書く（= actas 専用） |
| `watch.sh` 引数束縛 | watch.sh:43 | `ACTIVE_NAME="${4:-}"` |
| `emit_monitor_directive()` | delivery.sh:259 / :301 | monitor 経路。watch.sh へ 3 引数のみ渡す |
| `agmsg_ready_path` / 所有コメント | lib/actas-lock.sh:63-73 | sentinel path の正本と「actas watcher が書く」旨の明記 |
| `ACTAS_PROMPT` | spawn.sh:358 | 対照経路（actas 起動で sentinel が書かれる） |

## Issue #1466 solo standing grant（260725-solo-standing-grants、2026-07-25、履歴）

base `6d4df90566dcf7aa00980e5f9e85c831ca9108ba`、observed `4491310cc0b432eb404524ef30a7d8a0a3f68f73`。[Issue #1466](https://github.com/amadeus-dlc/amadeus/issues/1466)。[PR #1468](https://github.com/amadeus-dlc/amadeus/pull/1468) は凍結試作で参考のみ、実装前提にしない。

| コンポーネント | 健全性 | 観測 |
|---|---|---|
| grant issuer / revoker | 注意 | human grounding は健全だが現行 team-only |
| grant ledger resolver | リスク | exact ID lookup と同値 expiry tie-break がなく broad catch は `null` |
| gate classifier | 健全 | phase boundary / skeleton / ordinary を分離 |
| directive / report transport | ギャップ | authorization / Grant Id carrier がない |
| approval transaction | 注意 | lock 内再検証位置はあるが exact-ID lookup がなく、拒否が error 経路 |
| audit protection / presence mint | 健全 | protected mint と provenance を維持すべき |

## 所有境界と候補

team `DELEGATED_APPROVAL` は remote topology 固有、solo は local route / commit 相関であり統合しない。per-unit controller は `GateRequirement` を所有し、grant resolver は `GateAuthorizationSource` を所有する。grant は全 unit 完了後の最終 gate の認可源だけを担い、body / reviewer を再実行しない。exact ID、opaque claim、commit-only の比較は後続設計へ送る。

## Mirror レビュー修正コンポーネント（260725-mirror-review-fixes、履歴）

観測 HEAD は `70336937529f5be31c011de5d368c0f03e534506`、差分 base は `6d4df90566dcf7aa00980e5f9e85c831ca9108ba`。

| コンポーネント | 責務 | 依存先 | 欠陥との関係 |
|---|---|---|---|
| Lifecycle adapter | CLI parse、Intent/repo 解決、coordinator 呼出、exit 表現 | config、state store、gateway、coordinator | inner 未完了 outcome を exit 0 に丸め、answer surface がない |
| Mirror coordinator | mode/policy、prompt、reconciliation、operation chain | policy、executor、state reducer | 回答処理は存在するが CLI 未配線かつ回答型に bindingId がなく、skip は event/operation 照合も迂回 |
| Mirror executor | permit、receipt、remote effect、recovery、completion guard | gateway、state store、provenance | legacy CLI から迂回される正準 mutation owner |
| Legacy mirror CLI | 旧 create/sync/close/status | `gh`、`amadeus-lib` | mutation が permit/receipt/provenance を迂回 |
| Config resolver | 3層 config の bounded read と precedence | Node fs/path、workspace selector | realpath 検査と open が別操作で TOCTOU |
| State codec | strict JSON と Mirror state schema | Buffer、Mirror types | CR/LF 以外の未エスケープ C0 を受理 |
| Coverage source normalizer | LCOV source の core 正本化 | Node path、test runner | Cursor/OpenCode の投影を列挙していない |
| Packaging / distribution checks | core を6 harnessへ投影し byte drift 検査 | manifests、`scripts/package.ts` | 正本修正後の全配布面同期を保証 |
| CI | typecheck、lint、distribution、tests、coverage | Bun、Biome、TypeScript、Codecov | coverage source 漏れの利用者であり回帰検査先 |

所有境界は `lifecycle/coordinator/executor` が mutation、legacy CLI は互換入口または read-only 診断、config/codec は fail-closed input boundary、coverage normalizer は生成物→正本の計測 mapping とする。

## ハーネス検出モジュール・plugin 信頼層・kimi 移植面コンポーネント（260725-kimi-harness、2026-07-25、履歴）

差分リフレッシュ（base `6d4df9056` → observed HEAD `d31b8a5db`、距離 105、amadeus-feature）。測定 ref: observed HEAD `d31b8a5db` 実ファイル直読。区間はハーネス検出の新規分離・plugin 同梱/信頼層・intent birth provenance の 4 クラスタ。フレームワークバージョンは `packages/framework/core/tools/amadeus-version.ts:4` `AMADEUS_VERSION = "0.1.5"`。

| コンポーネント | 場所（file:line） | 役割 / 区間での変化 |
| --- | --- | --- |
| `amadeus-harness.ts`（新規） | `packages/framework/core/tools/amadeus-harness.ts`（137 行、`58053fa61` で追加、base 非存在） | ハーネス種別・検出の canonical モジュール。`HarnessType` :5-12 / `HARNESS_DIR_TO_TYPE` :14-22 / `KNOWN_HARNESS_DIRS` :34-40 / `KNOWN_RULES_SUBDIR` :53-57 + `harnessDir()` :101 / `detectHarnessType()` :105 / `rulesSubdir()` :131。kimi 追加時の第 1 登録面 |
| `amadeus-lib.ts` harness facade | `amadeus-lib.ts:7-18`（import + 型 re-export）、:152-166（facade）、:186/:229/:269（KNOWN_HARNESS_DIRS 利用） | 区間 +21/−99 で実装を amadeus-harness.ts へ移管し、後方互換の re-export のみ保持。呼び出し側契約不変 |
| plugin 中立バンドル出荷 | `scripts/package.ts:316` `projectPluginsIntoHarnessTree`（no-op 化、呼出 :505）、`dist/plugins/formal-model-check/`（初のバンドル、base では `dist/plugins/` 非存在） | `47d5e3f9c` で plugin は `dist/plugins/<name>/` のみで出荷。per-harness `<harnessDir>/plugins/` 投影は廃止、関数は read-source 会計（#735 未参照ソース scan 用）のみの no-op |
| plugin 信頼層 | `scripts/plugin-composition.ts`（1365 行、`f67b931c2` で +138/−15 + `454194231` テスト）: `contentDigest` フィールド :128/:135/:191、`parseStages` :293（呼出 :286）、`validJournal` :813（sha256 形式検査 :826 `/^sha256:[0-9a-f]{64}$/`） | sha256 contentDigest による内容検証、stage index 検証、journal 内の信頼付与（trust grant）、drop 時ドリフト拒否を追加 |
| intent birth provenance | `dc1eeba20`: `amadeus-lib.ts` +78/−9、`amadeus-utility.ts` +3/−0 | intent birth 時に実行ハーネスを state へ記録（Issue #1452 系の着地） |
| packager 自動発見 | `scripts/package.ts:85-91` `discoverHarnessNames`（コメント :80-84） | `harness/<name>/manifest.ts` 保持 scan。新ハーネス追加は 1 dir + manifest 行で packager 編集不要 |
| 3 閉集合（非対称の要点） | `scripts/plugin-projection.ts:46-53` `PACKAGE_HARNESSES`（6 面）/ 同 :59 `SELF_INSTALL_HARNESSES`（4 面、membership :407）/ `promote-self.ts:169` `PACKAGE_HARNESSES`（4 面）/ `amadeus-swarm.ts:100` `HARNESS_VALUES`（4 面、cursor/opencode を意図的除外） | kimi は各集合へ**個別に判断して**追加（または非追加を維持）する。swarm は `resolveDriver` :118-136 が未知値を fail-closed 拒否するため opt-in 追加 |
| その他の移植面触点 | `scripts/detect-ci-changes.sh:20`（drift glob）/ `packages/setup/src/domain/harness.ts:9,:21-28,:33` / `engine-layout.ts:8-15` / `reporter.ts:24-25,:137` / `promote-self.ts:37-43` managedDirs（5 行）/ `amadeus-utility.ts` doctor :1196,:1275,:1350-1351,:1366,:1379,:1439,:1446 | 新ハーネス touch list（HEAD 実測済み）。setup CLI・doctor・CI drift 検知の各閉集合 |
| kimi の雛形 | `packages/framework/harness/cursor/manifest.ts`（75 行）/ `packages/framework/harness/codex/emit.ts`（375 行、HOOK_WIRING :29-39） | `packages/framework/harness/` は base・HEAD とも同じ 6 dir で新ハーネス dir は区間内未追加。最小面（cursor 型）とフル emit（codex 型）の 2 参照実装 |

## Team Mode watcher arming 検証コンポーネント（260724-watcher-timeout-fix、2026-07-24、履歴）

差分リフレッシュ（base `a81c11dde` → observed HEAD `6d4df9056`、距離 155、amadeus-bugfix / Minimal、[#1449](https://github.com/amadeus-dlc/amadeus/issues/1449)）。測定 ref: observed HEAD `6d4df9056` 実ファイル直読。すべて `packages/framework/core/tools/team-up.sh` 内（区間内 #1391 で導入、#1421 で packages 昇格 + 配布 11 コピー）。

| コンポーネント | 場所（file:line） | 役割 / #1449 での関与 |
| --- | --- | --- |
| `WATCHER_READY_TIMEOUT` | team-up.sh:101 | per-wait タイムアウト定数（既定 90 秒、env 上書き可）。`spawn.sh:132 READY_TIMEOUT=90` 接地。#1449 のブロッキング時間の第 1 因子 |
| `WATCHER_RESEND_MAX` | team-up.sh:104 | monitor prompt 再送上限（既定 2、dispatch-ack-required 接地）。worst-case を ×(2+1) に増幅する第 2 因子 |
| `watcher_verification_applies` | team-up.sh:1067-1069 | claude + agmsg のみ検証発火のガード |
| `ready_sentinel_path` | team-up.sh:1078-1085 | agmsg `agmsg_ready_path` を subshell source で解決（NFR-4、path 二重定義回避） |
| `resolve_member_pane` | team-up.sh:1093-1105 | `herdr agent list` から member ラベルで pane id 抽出 |
| `resend_monitor_prompt` | team-up.sh:1110-1115 | herdr send-text → send-keys enter の 2 段送信 |
| `clear_stale_watcher_sentinels` | team-up.sh:1122-1129 | pane 起動前の旧 sentinel 除去（spawn.sh:572 対称） |
| `verify_watchers_armed` | team-up.sh:1139-1178 | **#1449 の核心**。再送 ×3 × 90 秒ポーリングの二重ループ。全員 armed で 0、未 armed で非ゼロ + 復旧案内 |
| 呼び出し元（launch シーケンス） | team-up.sh:1442-1445 | `mux_attach`（:1448）の**前**で `verify_watchers_armed` を無条件同期実行 → attach ブロック |
| `t-team-up-watcher-arming.test.ts` | tests/integration/（197 行、新規） | seam 3 + `verify_watchers_armed` 4 テスト。`TEAM_UP_LIB_ONLY=1` source 駆動、`WATCHER_READY_TIMEOUT: "0"`（:79）でタイミング無被覆 |

## t241 CI-residency 関連コンポーネント（260723-t241-ci-residency、2026-07-23、履歴）

差分リフレッシュ（base `a81c11dde` → observed `78bce876`、距離 35、bugfix / Minimal、[#1294](https://github.com/amadeus-dlc/amadeus/issues/1294)）。本バグ面は base..HEAD 無変更（numstat 0 行）、欠陥は 260718-election-ts-foundation（#1235）由来。測定 ref: scan-notes @ observed HEAD `78bce876`。

| コンポーネント | 場所 | 役割 / 本 intent での関与 |
| --- | --- | --- |
| t241 機械実行器 | `tests/e2e/t241-election-machine-executor.test.ts`（:1 ヘッダ、:91-140 テスト2件） | FR-0 layer (i) の LLM 無知識 directive ループ。「CI-resident/standing proof」自称（:1,:4-5）だが e2e 配置で自動 CI 非実行 = 欠陥コンポーネント |
| テスト profile 判定 | `tests/run-tests.ts:197-202`（--ci）/:203-211（--release） | `--ci`=smoke+unit+integration（runE2e 非設定）、`--release`=+e2e。banner :124-127/:148 |
| test scripts | `package.json:14-16` | `test:ci`/`coverage:ci`=--ci、`test:all`=--all（e2e はローカル手動のみ） |
| CI ワークフロー | `.github/workflows/ci.yml`（:114/:152/:227） | `test:ci`/`coverage:ci` 実行。`--e2e`/`--release`/`test:all` 0 ヒット。`release.yml`（test 無し）・`formal-verification.yml`（:12 workflow_dispatch）も e2e 非実行 |
| size 分類器 | `tests/lib/test-size.ts:161-166`、`classifyTestSize`（signals `t-test-size-drift.test.ts:66-69`） | spawn/fs→medium。integration MAX=medium で t241 移設 clean |
| ADR-6（設計権威） | `application-design/decisions.md:41-48` | layer (i) を「integration テストで固定する」と明記 = t241 e2e 配置は実装逸脱の対照点 |
| integration precedent | `tests/integration/{t235,t236,t240,t242,t244,t-formal-verif-arm-s-blind}` | election CLI spawn 兄弟 6 本（`grep -rln amadeus-election` = 6）、`--ci` で CI 実行済み |
| coverage registry | `tests/gen-coverage-registry.ts` | t241 未登録（0 ヒット）。wiring coverage は in-process t236 が所有 |
| sibling 健全例 | `tests/e2e/t237-election-walking-skeleton.test.ts:1-5` | 「Layer: e2e」正直宣言・CI-resident 非自称（対照） |

## team 起動 watcher-arming コンポーネント（履歴: 260722-teamup-prompt-race、2026-07-22）

bugfix / Minimal。observed `a81c11dde83e0059c48ecc912d2d22dd6bca60eb`。本 intent の交差コンポーネントは `scripts/team-up.sh` の claude 起動経路と、対照の agmsg readiness handshake（repo 外）。

| コンポーネント | 責務 | 本バグとの関係 |
|---|---|---|
| `scripts/team-up.sh` `claude_member_cmd()` `:800` | init_prompt `/agmsg mode monitor` を固定し `:830-832` で `run-claude.sh` 位置引数へ組立 | 初期プロンプトを一発勝負で供給。再送・検証なし（欠陥の発生元） |
| `scripts/team-up.sh` pane 起動 `:429`/`:447`、launch 列 `:1251-1257` | `herdr pane run` で cmd を一度 exec | claude 受理／watcher attach の検証なし |
| `scripts/team-up.sh` `start_safety_wait_supervisors()` `:338-395` | 起動後 readiness 検証の supervisor | `:340` `[ "$RUNTIME" = "codex" ] \|\| return 0` で claude は no-op（readiness 検証の構造的不在） |
| `scripts/run-claude.sh` | 末尾 `exec claude --dangerously-skip-permissions "$@"` | init_prompt を claude 初期プロンプト（位置引数）として一度だけ渡す |
| `scripts/team-up-codex-safety-wait.ts`（260721 新設、+567） | Codex pane readiness の fingerprint 検証・解除 | claude 非対応（`resolve` の `agent === "codex"` フィルタ）。検証構造の再利用先例 |
| agmsg `spawn.sh:576-588`（repo 外 read-only） | ready センチネル出現までブロック（`status=ready`、default timeout 90s `:46-47`） | team-up claude 経路に欠ける handshake の対照実装 |
| agmsg `lib/actas-lock.sh:69-73` `agmsg_ready_path()` / `watch.sh:294-310` | センチネル path 算出（team+role キー）と生成（touch） | team-up は team+role を保持 → 機械判定の第一候補 |
| team-up 回帰テスト（`t-team-up-msg-backend` 他） | 既存 team-up 動作の検査 | init_prompt/`agmsg mode monitor`/ready/watch を参照せず（`grep -c` = 0）→ watcher arming の回帰テスト不在 |

原因の所在は**設計（一般化漏れ）**: 260721 が readiness 検証を Codex 専用に新設し claude 経路へ一般化しなかった。詳細は `re-scans/260722-teamup-prompt-race.md`。

> 以下は過去 intent の履歴。

## upstream-sync-230 コンポーネント（2026-07-20、履歴）

| コンポーネント | 責務 | upstream-sync での役割 |
|---|---|---|
| Core tools（30 CLI） | state、graph、routing、swarm、learnings | D1/D2/D3/D6 の機械契約 |
| Core hooks（11） | session、human turn、stop、sensor、status | compose freshness、Kiro context、plugin compose 発火 |
| Agent personas（14） | stage 別の役割境界 | reviewer date/persona/read-scope 契約 |
| Stage definitions（32） | phase/stage graph の正本 | schema extension、bundle、required sections |
| Sensors（5） | artifact の決定的検査 | plugin/stage 投影の完全性 |
| Harness adapters（69 files / 6面） | ホスト固有起動・payload・設定 | upstream 4面の変更を6面へ ADAPT |
| `scripts/package.ts` | manifest discovery、clean sweep、drift guard | plugin source の6面 projection オーナー |
| `scripts/promote-self.ts` | リポ内 self-install | closed-list 4面の投影オーナー |
| `packages/setup` | 独立配布 CLI（101 exports） | 新規 runtime dependency を追加しない |
| Tests（461 files） | unit/integration/e2e/smoke | 24項目の regression と ported tests |
| Docs | guide/reference/harness engineering | plugin/schema/compose 契約を同期 |

plugin は source component、`dist/plugins` cache、host projection の3コンポーネントに分け、manifest、dist clean-sweep、harness projection で所有権を分離する。

> 以下は過去 intent の履歴。

## Codex hooks／agmsg 競合コンポーネント（intent 260718-hooks-config-conflict、2026-07-18、履歴）

| コンポーネント | 現行責務 | Issue #770 との関係 |
| --- | --- | --- |
| Codex `HOOK_WIRING`／`emitHooksJson` | 9個の Amadeus command を `hooks.json.example` へ生成（`emit.ts:25-54,291-298`） | tracked canonical の正本 |
| `.codex/hooks.json` | Codex discovery／trust が読む active config | tracked activation copy と mutable runtime state の競合点 |
| `scripts/promote-self.ts` | Claude／Codex／Cursor／OpenCode self-install、local config preserve（`:37-43,84-97,207-299`） | `.codex/hooks.json` を戻さず dirty を保持 |
| agmsg `type.conf` | `hooks_file=.codex/hooks.json`（`:18-22`） | 同一 active path を runtime state に指定 |
| agmsg `delivery.sh`／`hooks-json.sh` | agmsg group の strip／add と SQLite JSON1 compact rewrite | absolute skill／clone path と monitor entry を書き込む直接 writer |
| agmsg `codex-shim.sh`／`codex-monitor.sh` | mode status 読取、app-server／bridge 起動、起動ごとの `set monitor` | Codex 再起動後 delivery を成立させる再書換え経路 |
| `scripts/run-codex.sh`／`scripts/team-up.sh` | shim 起動と Codex member ごとの monitor 再設定 | repository 側の再起動 acceptance boundary |
| `t150`／`t227`／harness fixture | example の hook roster／trust／active copy を検査 | clean fixture で実 monitor 登録後の Git-clean 回帰は未保有 |

恒久案は active file の untrack／ignore、または tracked static dispatcher + ignored sidecar の二案が `【裁定待ち】`。既存9 command と restart delivery の保持を同時に検証する。

## swarm driver 関連コンポーネント（intent 260713-swarm-driver-migration、2026-07-13、履歴）

| コンポーネント | 現行責務 | driver migration との関係 |
| --- | --- | --- |
| `amadeus-orchestrate.ts` `tryEmitSwarm` 系 | autonomous Construction、runtime graph、未完了 batch、walking-skeleton から eligibility を判定 | driver-neutral。#841 の batch 再提示は最初の未完了 batch 選択により解消済み |
| `amadeus-directive.ts` | `invoke-swarm` の schema／parse | `{kind, units, repo?}` のみ。選択結果・能力証跡なし |
| Claude `skills/amadeus/SKILL.md` | live `Task` fan-out、旧変数1で Dynamic `Workflow`、retry loop | Agent Teams／Ultra Code の明示 driver adapter と capability proof は未実装 |
| Codex `skills/amadeus/SKILL.md` | Unit ごとの `codex exec` floor、stdin close、resume | Codex Ultra の明示選択／native multi-agent proof は未実装。現行で唯一の別 AI CLI process fan-out |
| Kiro CLI／IDE `skills/amadeus/SKILL.md` | live native `subagent` 一括 fan-out | driver selector と native trace classifier は未実装 |
| `amadeus-swarm.ts` | `prepare`／`check`／`finalize`、worktree／Bolt、anti-tamper、merge、監査 | stateless referee。AI dispatcher ではない。driver 型は degrade 記録用の旧2値のみ |
| `amadeus-worktree.ts`／`amadeus-bolt.ts` | Unit 隔離と Bolt lifecycle | 全 driver が再利用すべき共通収束境界 |
| `audit-format.md` と swarm emitter | swarm 6イベント | selected driver、capability evidence、native trace correlation が不足 |
| 6 harness の `onboarding.fills.ts` と Codex `emit.ts` | 導入条件、利用者設定、生成設定 | selector、experimental flag、Ultra／trust／probe の契約追加面 |
| `scripts/package.ts` | 6 harness の build、drift／whole-tree orphan／source-unreferenced 検査 | source scan と root orphan blind spot は解消済み。driver 正本の全配布同期を担う |
| `scripts/promote-self.ts` | Claude／Codex／Cursor／OpenCode の project-local self-install | Kiro／Kiro IDE は対象外。4 harness 正本変更時の同期境界 |
| `t135-invoke-swarm`／`t134-swarm-referee` | eligibility と referee の決定的検証 | live AI worker は起動しないため native proof にはならない |
| Codex exec journey／Kiro ACP journey／Claude live journey | opt-in live transport seam | 4 driver の2 Unit以上 live proof へ再利用可能だが専用 classifier は未実装 |

> 以下は過去 intent の棚卸し。#735 の source-side scan と #701 の dist-root orphan は現行 `scripts/package.ts:692-725` で解消済みであり、旧表の「現存」記述は修正前の履歴を表す。

## docs/harness 修理コンポーネント(intent 260711-docs-repair-batch9、フォーカス5欠陥)（履歴、observed `13598b752`）

> **現在時制の失効（2026-08-14 追記、260813-lifecycle-guard-runtime）**: 下表の「**#886 の主対象**(`verifyPhaseCheckArtifact` precondition 不在)」は observed `13598b752` 当時の観測であり、**observed `89532174c` では成立しない**。#886 は解決済みで、`verifyPhaseCheckArtifact` は `amadeus-state.ts:392` に実在し `:2775` / `:2926` / `:3059` / `:4009` + `amadeus-jump.ts:581` の 5 箇所から呼ばれる。境界完了 4 経路の行ピン `:1104` / `:1333` / `:1428` / `:1670` も旧系譜の値であり現行とは対応しない。

現行 HEAD `13598b752`(base `b845478bb`、59コミット diff-refresh)で確定したフォーカス5欠陥の正本コンポーネント。出典は本 intent の `inception/reverse-engineering/scan-notes.md`(全 file:line 実測)。localize 3面(#812/#824 + question-rendering.md 同根)+ ヘッダ契約1面(#680)は区間内無変更、restart-loss 2面(#885/#886)は #880/#869 の行番号シフトのみで欠陥現存。

| コンポーネント | 責務 | 欠陥/関係 |
| --- | --- | --- |
| `harness/kiro-ide/skills/amadeus/SKILL.md` | kiro-ide ハーネスの orchestrator スキル定義 | **#812**(kiro CLI 版と byte-identical = localize 未実施。`:14` `Kiro CLI harness` 見出し / `:84` `kiro-cli chat` CLI 固有 caveat) |
| `harness/kiro-ide/skills/amadeus/question-rendering.md` | 構造化質問レンダリング annex | **#812 同根未カバー候補**(kiro と byte-identical。`:1`/`:11` に `Kiro CLI` 表記2箇所) |
| `harness/kiro-ide/onboarding.fills.ts` | AGENTS.md への onboarding fill(`manifest.ts:93` 経由 `dist/kiro-ide/AGENTS.md` へ出力) | **#824**(2箇所のみ localize 済、7箇所に kiro CLI 表記残存 + `:26` guide_pointer が `kiro-cli.md` 誤指し。dist 伝播済み) |
| `core/tools/amadeus-sensor-type-check.ts` | type-check sensor(`tsc --noEmit` 起動) | **#680**(`:4-5` self-contained ヘッダ主張と `:89` `sensorsDir` from `./amadeus-lib.ts` の矛盾) |
| `core/tools/amadeus-lib.ts` `worktreePath`(`:2099`)/`validateBoltSlug`(`:2580`)/`BOLT_SLUG_REGEX`(`:2430`) | worktree slug の補間と検証 | **#885 の主対象**(`normalizeWorktreeSlug` 喪失で slug 境界一本化なし。大文字混じり slug を reject。batch8 #850 gap2 と lib.ts 交差) |
| `core/tools/amadeus-worktree.ts` `validateSlug`(`:195`)/`SLUG_RE`(`:39`)・`core/tools/amadeus-state.ts` `validateSlug`(`:250`)/`SLUG_RE`(`:248`) | 各ツールの slug 検証(個別実装) | **#885**(旧系譜の同一チョークポイント一本化が喪失、各所で個別 reject) |
| `core/tools/amadeus-state.ts` 境界完了4経路(handleAdvance `:1104` / handleFinalize `:1333` / handleCompleteWorkflow `:1428` / handleApprove `:1670`)+ flip 本体(`setPhaseProgress` `:101` / `markPhaseVerified` `:114`) | phase 境界の PHASE_VERIFIED / roll-up 遷移 | **#886 の主対象**(`verifyPhaseCheckArtifact` precondition 不在。#880 `c4304edf4` が flip のみ再構築) |
| `core/tools/amadeus-jump.ts` / `core/tools/amadeus-orchestrate.ts`(per-phase VERIFIED/SKIPPED) | jump 経路の phase 境界遷移 | **#886**(#869 `aac1869e4` で再構築、phase-check ゲート 0件) |

## packaging コンポーネント(intent 260710、#735 関連)

> **履歴・解決済み**: `checkHarness` は現在 `readSources` と harness source tree を照合し、未参照 source を `UNREFERENCED in source` として報告する（`scripts/package.ts:711-725`）。

| コンポーネント | 責務 | 依存先 | #735 との関係 |
| --- | --- | --- | --- |
| `scripts/package.ts` `buildTree` | build 入力集合の確定と dist 生成(core walk / harnessFiles コピー / onboarding / memory / emit) | `manifest-types.ts`、各 `harness/<name>/manifest.ts`、`core/`、`harness/<name>/` | **build が読む入力集合の確定点**(L307)。未列挙 harness ソースは不可視 |
| `scripts/package.ts` `checkHarness` | committed dist と再ビルドの byte-diff + orphan scan | `buildTree`、`walk` | orphan 検出は**出力側のみ**(L554)。source 側 unreferenced は守備範囲外(#735 のギャップ) |
| `scripts/package.ts` `discoverHarnessNames` | `harness/*/manifest.ts` の存在で harness を発見 | `harness/` dir | 1 manifest = 1 harness(L68) |
| `scripts/manifest-types.ts` `HarnessManifest` | harness 投影ルールの型契約(`coreDirs`/`harnessFiles`/`authoredExempt`/`emit` 等) | — | `authoredExempt`(L101)が orphan scan の除外集合。source 側検査の設計対象 |
| `packages/framework/harness/{claude,codex,kiro,kiro-ide}/manifest.ts` | 各 harness の投影データ | `manifest-types.ts` | `harnessFiles`(出荷対象)と `authoredExempt`(除外)が「参照集合」を定義 |
| `packages/framework/harness/<name>/{manifest,onboarding.fills,emit}.ts` | build 機構(`require()` で読まれ dist 非コピー) | — | **正当に未参照**なソース。source-unreferenced check の誤検出除外対象 |
| `tests/smoke/t148-kiro-file-structure.test.ts` | kiro dist 構造の smoke。#719 再注入ガード(CLI harness ソースに `.kiro.hook` 0個) | `dist/kiro`、`harness/kiro` | #737 の落ちる実証を固定するテスト先例 |

## 260709-gate-mechanics(前 intent、履歴)関連コンポーネント

## 差分リフレッシュ(260709-packaging-repair-batch)

> **履歴・解決済み**: #701 の dist root blind spot は whole-tree orphan scan（`scripts/package.ts:692-709`）で解消済み。

packaging-repair-batch(intent 260709-packaging-repair-batch、履歴)の2バグの正本コンポーネント(下表)と、差分区間 `a1c79dc12..22e3eb5aa` で変更のあったコンポーネント。

| コンポーネント | 責務 | バグ/変更との関係 |
| --- | --- | --- |
| `scripts/package.ts` `checkHarness` | `dist/<name>/` の drift 検査(`--check`) | **#701 の直接対象**(orphan スキャンルート `[".agents","amadeus"]` ハードコード `:611`、projectRoot diff 片方向 `:586-592`)。この差分区間では未変更の既存欠陥 |
| `scripts/release-version-sync.ts` | version.ts/README バッジ/`packages/setup/package.json` の同期(`.release-it.json` の after:bump 経由) | **#702 の直接対象**(version 受理 `:22` とバッジ `:53-54` の非対称)。未変更の既存欠陥 |
| `packages/framework/core/tools/{amadeus-audit,amadeus-bolt,amadeus-lib,amadeus-sensor-type-check,amadeus-state,amadeus-swarm}.ts` | audit / Bolt / 共有ライブラリ / type-check sensor / 状態遷移 / swarm | 全 M。delegated-approval provenance、sensor-type-check の tsc launcher 化、hook project-dir/worktree marker 解決を反映 |
| `packages/setup/src/{ports/http,internal/tar-archive-extractor,domain/installation}.ts` | HTTP ポート / tar 展開 / インストール判定 | M(独立 npm 配布経路) |
| `tests/lib/test-size.ts` + `tests/unit/t-test-size-drift.test.ts` | テストサイズドリフトガード | 新規(A)。品質ゲート追加 |
| `tests/unit/{setup-http,t112-delegated-approval,t202-hook-project-dir-worktree-marker,t202-sensor-type-check-tsc-launcher}.test.ts` | 上記コアツール変更のリグレッションテスト | 新規(A) |
| `tests/`(class-B 14ファイル、PR #703) | hermeticity 修正済みユニット/インテグレーションテスト | M |

## Framework コンポーネント(既存、安定)

| コンポーネント | 責務 | 依存先 | 対象 intent との関係 |
| --- | --- | --- | --- |
| `packages/framework/core/` | AI-DLC engine source, tools, templates, stage 定義 | 各種 scripts・manifest | #674/#675/#676/#668 の正本を含む |
| `packages/framework/harness/<name>/` | harness ごとの配布 source | `scripts/manifest-types.ts` | 直接の修理対象なし |
| `scripts/package.ts` | `dist/<name>` の生成と検査 | `packages/framework/core`, `packages/framework/harness` | 6件すべての修理伝播経路(正本修正後に必須) |
| `scripts/promote-self.ts` | self-install と drift check | root `dist/{claude,codex,cursor,opencode}` | 同上 |

## swarm/gate コンポーネント(#674・#675 の対象)

| コンポーネント | 責務 | 依存先 | バグとの関係 |
| --- | --- | --- | --- |
| `packages/framework/core/tools/amadeus-swarm.ts` `handleFinalize` | claimed unit の再検証、merge-back、audit 発行 | `amadeus-bolt.ts`(`release-merge`/`complete --merge`)、`emitUnitConverged`/`emitUnitFailed` | **#674 の直接対象** |
| `packages/framework/core/tools/amadeus-state.ts` `handleApprove` | ゲート承認、human-presence guard、advance への delegate | `isAutonomousMode`/`humanPresenceGuardDisabled`/`humanActedSinceGate`(`amadeus-lib.ts`) | ガードの実装例(#675 との非対称比較対象) |
| `packages/framework/core/tools/amadeus-state.ts` `handleReject` | ゲート却下、Revision Count 増分 | `validateSlugInState`、`withAuditLock` | **#675 の直接対象**(ガード欠落) |

## bolt/audit コンポーネント(#676・#668 の対象)

| コンポーネント | 責務 | 依存先 | バグとの関係 |
| --- | --- | --- | --- |
| `packages/framework/core/tools/amadeus-bolt.ts` `handleStart` | Bolt/worktree 起動、`BOLT_STARTED` audit 発行 | `emitAudit`、`readStateFile` | **#676 の直接対象**(呼び出し元) |
| `packages/framework/core/tools/amadeus-lib.ts` `auditFilePath` | intent/space から audit shard パスを解決 | `recordDir`、`spaceRecordRoot`、`auditShardName` | **#676 の直接対象**(bare fallback の発生源) |
| `packages/framework/core/tools/amadeus-lib.ts` `codekbRepoName` | per-repo codekb ディレクトリ名の解決 | `intentRepos`、`basename` | **#668 の直接対象** |
| `packages/framework/core/tools/amadeus-utility.ts` `codekb-path` ハンドラ | `codekb-path` CLI コマンドの実装 | `codekbRepoName` | #668 の呼び出し元 |

## `@amadeus-dlc/setup` コンポーネント(#677・#678 の対象)

| コンポーネント | 責務 | 依存先 | バグとの関係 |
| --- | --- | --- | --- |
| `packages/setup/src/ports/http.ts` `createHttp`(`getJson`/`downloadArchive`) | GitHub API/アーカイブ取得のポート実装 | `fetchChecked`、`fetchFollowingAllowedHosts` | **#677 の直接対象**(`getJson`) |
| `packages/setup/src/internal/tar-archive-extractor.ts` `extractTarGz` | tar.gz のストリーミング展開、PAX/GNU longname 処理 | `TmpWrite` port、`node:zlib` | **#678 の直接対象** |
| `packages/setup/src/modules/fetcher.ts`(想定、直接読解対象外) | `Http` ポートの呼び出し元、リトライ制御 | `ports/http.ts` | #677 の間接的影響範囲(要確認) |

## presence/gate コンポーネント(#708 の対象、integrity-batch)

| コンポーネント | 責務 | 依存先 | バグとの関係 |
| --- | --- | --- | --- |
| `packages/framework/core/hooks/amadeus-mint-presence.ts`(L23-31) | UserPromptSubmit で `HUMAN_TURN` を audit へ mint(stdin 未読・無条件) | `resolveProjectDirFromHook`、`appendAuditEntry`、`stateFilePath` | **#708 の直接対象**(mint 側・偽陽性の発生源) |
| `packages/framework/core/tools/amadeus-lib.ts` `humanActedSinceGate`(L1442-1479)/ `verifyDelegatedApproval`(L1480-) | 監査台帳から人間関与を判定。委任承認 provenance(#671)の物理照合 | audit シャード、`isHumanTurn`(L1451) | **#708 の対象**(gate 側・偽 `HUMAN_TURN` を無条件カウント) |
| `packages/framework/core/tools/amadeus-lib.ts` `ClaudeCodeHookInput`(L2029-2047)/ `isClaudeCodeHookInput`(L2049-2051) | hook 入力 JSON の型と型ガード。`source?`/`prompt?` を既宣言 | `isPlainObject` | #708 修正の型基盤(フィールド追加不要、ただし型在≠ランタイム到来) |
| `packages/framework/core/hooks/amadeus-audit-logger.ts`(L29-44)/ `amadeus-session-start.ts`(L86-96) | stdin parse の canonical パターン(`isTTY`→`Bun.stdin.text()`→`JSON.parse`→型ガード→fail-open) | `ClaudeCodeHookInput` | #708 修正の参照実装(mint-presence を寄せる型) |

## codekb 永続化コンポーネント(#707 の対象、integrity-batch)

| コンポーネント | 責務 | 依存先 | バグとの関係 |
| --- | --- | --- | --- |
| `packages/framework/core/tools/amadeus-lib.ts` `codekbRepoName`(L556-565) | codekb ディレクトリ名を origin remote 由来で解決(#693 統一) | `intentRepos`、`originRepoSlug`、`basename` | **#707 の前提機構**(全 worktree が同一 `codekb/amadeus/` を指す) |
| `.claude/amadeus-common/stages/inception/reverse-engineering.md`(L5/L36/L110) | RE ステージ定義。常時リフレッシュ・9固定ファイル・単一 timestamp marker | — | **#707 の直接対象**(単一 timestamp が並行 base/observed を表現不能) |

## テストハーネスコンポーネント(#705 の対象、integrity-batch)

| コンポーネント | 責務 | 依存先 | バグとの関係 |
| --- | --- | --- | --- |
| `tests/harness/sdk-drive.calibration.test.ts`(L55-72) | doctor 既知回答文字列のピン留め検証 | `driveAidlc`、doctor ハンドラ | **#705 の直接対象**(L72 期待値ドリフト + ランナー管理外) |
| `tests/run-tests.ts`(L31/L577-587/L485-489) | tier discovery と substrate skip | `Level` ディレクトリ列挙 | #705 の構造的根拠(`tests/harness/` は tier 外) |
| `packages/framework/core/tools/amadeus-utility.ts`(L628 doctor) | doctor のワークスペースチェック出力(`workspace shell ready ...`) | `harnessDir` | #705 の期待値対向(旧文言不在) |

## knowledge 配布コンポーネント(#706 の対象、integrity-batch)

| コンポーネント | 責務 | 依存先 | バグとの関係 |
| --- | --- | --- | --- |
| `packages/framework/core/knowledge/amadeus-delivery-agent/workflow-planning-guide.md`(L3) | delivery 実行計画ガイド。不在 `product-guide.md` を tree 外参照 | — | **#706 の直接対象**(core→dist→self-install 全複製に伝播) |
| `packages/framework/core/agents/amadeus-delivery-agent.md`(L71-77) | delivery-agent の knowledge ロードパス宣言 | 自 dir + `amadeus-shared/` のみ | #706 の根拠(product-agent dir は読まない) |
| `packages/framework/core/knowledge/amadeus-product-agent/product-guide.md` | 実在する product ガイド(参照先の正しい所在) | — | #706 修正方向の判断材料(7箇所に伝播済み) |

## 品質コンポーネント(既存)

| コンポーネント | 責務 | 依存先 | 対象 intent との関係 |
| --- | --- | --- | --- |
| `.github/workflows/ci.yml` | CI(typecheck → lint → dist:check → promote:self:check → tests) | root package scripts | 6件の修理後もグリーンを維持する必要がある |
| `packages/setup/tests/setup-*.test.ts`(11ファイル) | `packages/setup` のユニットテスト | 各モジュール | #677/#678 のリグレッションテストをここに追加 |
| `tests/` 配下の framework テスト群 | `amadeus-swarm.ts`/`amadeus-state.ts`/`amadeus-bolt.ts`/`amadeus-lib.ts` のテスト | 各ツール | #674/#675/#676/#668 のリグレッションテストをここに追加 |

## Coverage / ゲートコンポーネント(260710-codecov-project-gate の対象)

> 出典: `.github/workflows/ci.yml`・`codecov.yml`・`tests/run-tests.ts`・`tests/gen-coverage-registry.ts`(2026-07-10, HEAD 98089faf 実測)。詳細は code-structure.md 「Coverage CI 経路」節を参照。

| コンポーネント | 責務 | 依存先 | 対象 intent との関係 |
| --- | --- | --- | --- |
| `ci.yml` `coverage` ジョブ(:60-103) | `coverage:ci` で lcov 生成・artifact 化・Codecov 送信 | `tests/run-tests.ts`, `package.json` scripts | 自前 project ゲートの lcov 供給元。ゲートを本ジョブ内ステップ(B)にするか独立ジョブ(A)にするかは設計判断 |
| `ci.yml` `codecov-status` ジョブ(:105-200) | Codecov 外部 status を polling(patch 待ち役割は #687 で稼働) | Codecov, `github-script` | 自前ゲートは非依存(polling 不要)。#717 が `requiredChecks` を触るが codecov-project-gate が supersede 対象 |
| `ci.yml` `ci-success` ジョブ(:202-225) | `require_result()` で3ジョブ result を集約ゲート | check/coverage/codecov-status | 自前ゲートを配線する先(needs 追加 or coverage ジョブ result 経由) |
| `tests/run-tests.ts`(coverage 経路) | LCOV 生成・正規化・総%算出(`totalHits/totalLines` :597-599) | bun test | 総%の機械可読 emit 追加候補(乖離ゼロで再利用可) |
| `tests/gen-coverage-registry.ts` + `tests/.coverage-ratchet.json` | ラチェット(件数ベースの単調 fail-closed、env 差し替え可) | `tests/unit/gen-coverage-registry.test.ts` | ベースライン運用の設計テンプレート(リポ内ファイル + 単調 fail-closed + 落ちる実証) |
| `codecov.yml` | `fixes`(6)・`ignore`(8)・`status.project`/`status.patch` 定義 | Codecov | 母集団定義(ignore 模倣可否)と `status.project` ブロック残置/削除の判断材料 |

## Issue #857 差分スキャン（2026-07-23）

| コンポーネント | 現在の責務 | Issue #857 での扱い |
|---|---|---|
| `runUtilityMain` | CLI コマンド dispatch | doctor の薄い wrapper への入口として維持 |
| `handleDoctor` | 検査編成、出力、終了、副作用を約1,371行で担う | export 済み。doctor core と CLI wrapper の分離候補 |
| doctor checks | 個別診断と結果生成 | 既存単位を活用し、全件純関数化はしない |
| dependencies | env、cache、cwd、filesystem、audit | 明示的な doctor core 境界の依存として整理 |
| t37/t83/t210 | spawn CLI/cwd 契約41ケース | 互換性テストとして維持。LCOV 1/771行の盲点は別途認識 |
| in-process doctor tests | monkeypatch による6ファイル104ケース | LCOV 437/771行。正式 seam 導入後の重複削減対象 |

## 所有境界

薄い CLI wrapper は stdout、集計、exit 0/1、spawn CLI/cwd 互換性を所有する。doctor core は検査順序、結果集合、終了判定を所有し、audit 追記と stale lock cleanup を欠落させない。checks/dependencies は既存動作を提供し、utility 全体の再設計は行わない。

## 記録系 round-trip PBT の対象コンポーネント（260802-record-roundtrip-pbt、履歴、observed `9750f8aea`）

- 判断: 本 intent での実質変更なし — 新規コンポーネントの新設は見通しにない。対象は既存 3 グループで、全数は `code-structure.md` 現在節の患部配置表と `re-scans/260802-record-roundtrip-pbt.md` を正本とする — (1) コーデック正本（`packages/framework/core/tools/` の `amadeus-mirror-state-codec.ts` / `amadeus-state.ts` / `amadeus-lib.ts` / `amadeus-audit.ts` / `amadeus-election-store.ts` / `amadeus-election-model.ts` / `amadeus-election.ts` / `amadeus-journal.ts`）、(2) テスト側（fast-check 使用ファイル 8 本 + arbitrary ヘルパ 2 本 = `grep -rln "fast-check" tests/` の 10 パス、新規 PBT と新規 arbitrary の追加先）、(3) 静的ガード（`tests/callsite-guard.ts` 同型の新規 allowlist ratchet 1 本）。dist 側は core/tools の投影コピーのみで、独立コンポーネントは増えない。

## grilling 対話契約の棚卸し（260810-grilling-frontier-resync）

Issue #2785（grilling depth を質問数予算から frontier 駆動の枝刈り閾値へ再定義）に向けた対応表。全数は `re-scans/260810-grilling-frontier-resync.md` を正本とする。observed `5564dccd1`。

| 層 | コンポーネント | 責務 | 患部箇所（file:line） |
|---|---|---|---|
| 正本 | `packages/framework/core/amadeus-common/protocols/grilling-protocol.md`（137行） | grilling 対話規律の単一正本。D1-D7（Dialogue Discipline）、8ステップループ、質問テンプレート、workflow/standalone 分岐を定義 | D1 :29、D6（Bounded termination）:34、§2 ループ :37-69、§3 テンプレート :71-122、§4 :124-137、帰属ヘッダ :1-6 |
| 参照面 | `packages/framework/core/amadeus-common/protocols/stage-protocol.md`（1304行） | grilling を workflow ステージへ配線する薄い呼び出し面。depth 別の質問数予算契約そのものはこちらが正本 | §3 depth 表 :300-311、Step 3d「Grill me」:348-356（`hybrid termination` 残存 :349）、§8 Depth-Level Contract :726-746、semi decide-question 経路 :137 |
| 参照面 | `packages/framework/core/amadeus-common/conductor.md` | interaction-mode 一覧で grilling を1行言及 | :50-53（"one question at a time" 言及 :51） |
| 参照面 | `packages/framework/core/skills/amadeus-grilling/SKILL.md`（58行） | standalone grilling スキルのエントリポイント。read-only 保証と depth 既定値（Standard=8）を明記 | Purpose 節、Standalone rules 規則2（depth 言及の唯一箇所） |
| 機械契約 | `packages/framework/core/tools/amadeus-directive.ts` | depth 値の閉語彙契約（3値）を directive validation に強制 | `VALID_DEPTH_VALUES` :62、呼び出し :664 |
| 機械契約 | `packages/framework/core/tools/amadeus-sensor-question-budget.ts` | depth 別の質問数上限をセンサーとして29ステージへ強制 | `QUESTION_BUDGETS` :39-43、`DEPTH_LEVELS`（directive.ts からの mirror）:47、`QUESTION_BUDGET_CUTOFF_YYMMDD` :63 |
| 機械契約 | `packages/framework/core/amadeus-common/stages/*.md`（29ファイル） | `question-budget` センサーの宣言側。ideation 7 / inception 8 / construction 7 / operation 7 | `git grep -l "question-budget"` で全数列挙、専用 manifest ファイルなし |
| 検証面 | `tests/integration/t415-interaction-budget-contract.test.ts` | `stage-protocol.md` の数値予算文言 + `grilling-protocol.md` D6/C-3 文言を verbatim `toContain`/`not.toContain` で29個ピン | grilling/depth 関連ピン :26-54 |
| 検証面 | `tests/unit/t199-grilling-distribution.test.ts` | 4ハーネス `dist/` への `SKILL.md` / `grilling-protocol.md` 投影の存在・frontmatter・MIT 表示を検査（`hybrid`/`bounded` 用語は非対象、dist 読みのため正本編集後は要リビルド） | 6アサーション全数、非 verbatim |
| 投影 | `dist/{claude,codex,kiro,kiro-ide}/**/amadeus-common/protocols/{grilling-protocol.md,stage-protocol.md}` | `bun run build` によるハーネス別投影コピー | `existsSync` のみで内容検証は t199 の限定範囲 |
| 用語ドリフト | `docs/reference/04-stage-protocol.md` / `.ja.md` | canonical D6 改称（→ Bounded termination）に未追従の旧称 `hybrid termination` / `ハイブリッド終了` が残存 | `.md:320`、`.ja.md:264` |
| prose 消費者 | `docs/guide/02-your-first-workflow.{md,ja.md}` / `docs/guide/07-interaction-modes.{md,ja.md}` | "one question at a time" を利用者向けガイドで踏襲説明（英語のみ、和訳は「一度に1質問」で別語彙） | `02-*.md:89` / `.ja.md:89`、`07-*.md:22,37` / `.ja.md:18`、和訳: `04-stage-protocol.ja.md:264` |

**未確定**: frontier 駆動（上流 `mattpocock/skills`、ピン SHA `1495d014303e041c51c29f9e442485ba06f5878d`）が具体的にどの層（正本のみか、機械契約の閉語彙・数値も含むか）まで置き換えるかは要件段の裁定事項。本棚卸しは現行構造の全数把握であり、再定義後の to-be 構造は含まない。

## Issue #2813 コンポーネント一覧（履歴、observed `c0f9edf2782`）

| コンポーネント | 責務 | 直接依存 | #2813 観点の健全性 |
|---|---|---|---|
| Election Model | definition、ballot parse、shuffle、resolution、tally | なし（純粋層） | **要変更**: 全主要型が単問 cardinality |
| Election Store | atomic write、pending/ledger、registry、materialize | model、filesystem | **要変更**: scalar ElectionFile/tally/global status/voter file |
| Election Record | ruling、GoA、reservation、timeline、self-verify | model、norm metrics parser | **要変更**: question 帰属と mixed ruling が不在 |
| Election Transport | agmsg/subagent port、per-voter view path 配送 | filesystem、Bun.spawnSync | **健全**: view payload の複数問化で吸収可能 |
| Election CLI | verb dispatch、state transition、hold policy、render/verify | model/store/record/transport | **高リスク**: 853行に global state と hold resolution が集中 |
| Election Skill | typed directive の転送手順 | CLI vocabulary | **要変更**: question 単数と全体 hold/rerun を前提 |
| Election Migration | directory/registry plan、approval、fidelity verify | store/CLI、git | **部分利用**: schema 破壊移行より dual decoder の回帰確認に利用 |
| FormalElection | 有限 voter/choice の状態探索 | TLA+/TLC、model-map | **要変更**: accepted/tally/hold が election 全体で1組 |
| Election Test Suite | example、PBT、integration、e2e | Bun test、fast-check、formal plugin | **被覆不足**: multi/mixed/held-only/legacy-new invariant が無い |

所有境界は維持する。question schema と tally business rule は model、永続形式と dual decoder は store、判断を含まない配送は transport、human-facing state transition は CLI、監査 prose と完全性検査は record、有限状態の安全性は TLA+ が所有する。これらをCLI単一ファイルへ寄せる設計は責務境界を崩すため避ける。

## Issue #2985 コンポーネント一覧（履歴、observed `0fbbec42bb33d625bdb9d034789c0ff391df1287`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260814-priority-bug-batch の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

| コンポーネント | 責務 | 入力 / 出力 | 状態 |
|---|---|---|---|
| Delivery Planning artifact | Unit を Delivery Bolt へ編成 | `bolt-plan.md` | 複数 Unit Bolt を表現可能 |
| Runtime DAG compiler | Unit dependency を topological batch へ変換 | dependency doc → `bolt_dag.batches` | Delivery Bolt ID を消費しない |
| Construction orchestrator | batch dispatch と per-unit coverage | batches / Unit artifacts | Unit を実行 owner とする |
| PR convergence contract | PR delivery / convergence loop | Bolt branch / GitHub state | one-Bolt-one-PR、複数 Unit fold 禁止 |
| CLI target / context | repo / PR / record / Unit と heads を解決 | argv / checkout / PR | 単数 Unit のみ |
| Provenance checker | title と `Amadeus Work` を検査 | PR title/body → verdict | Bolt / Unit 各1件 |
| Attestation codec | report identity と digest を encode / parse | report / delivery identity | Bolt / Unit / PR 各1件 |
| Git / GitHub runners | checkout と PR state を取得・検証 | branch / repo / PR | 1 head tuple / 1 PR summary |
| Report format sensor | report、checkout、audit を検証 | Unit report path | path Unit と receipt Unit 一致必須 |
| State completion guard | artifacts と sensors を全 Unit で検査 | graph / audit / Unit paths | per-unit evidence を要求 |

健全な単一 Unit 経路では Git / GitHub head 一致、content digest、audit receipt、sensor fail-closed の責務が明確である。要注意点は Delivery Bolt、runtime batch、execution Bolt が同じ語を異なる cardinality で使うこと、劣化点は共有 PR evidence の composition owner が存在しないことである。既存 component の一般リファクタや新規 service 分割は対象外とする。

## 260814-unit-failure-autoelectio (2026-08-14, observed `cd64486a6`) — Issue #2976 患部のコンポーネント棚卸し

### 実装コンポーネント

| コンポーネント | 所在 | 本 intent での位置づけ |
|---|---|---|
| `emitConstructionFailureIfPresent` | `amadeus-orchestrate.ts:4027`（分岐 `:4069-4075`） | 欠陥の発生源。無条件に `askDirective` を emit する |
| `askDirective` | `amadeus-orchestrate.ts:1042-1044` | directive 構築子（`{ kind: "ask", question }`） |
| `failureOutsideRuntimePopulation` | `amadeus-orchestrate.ts:4018-4025` | 前段の絞り込み。config を見ない |
| `canonicalConstructionFailurePending` | `amadeus-orchestrate.ts:3922-3936` | report 受け口のガード（state + audit 射影が `await-unit-ruling` か） |
| `handleFailureRuling` | `amadeus-orchestrate.ts:6507`（受け口 `:6161-6169`、直接動線 `:6973`） | 裁定の commit。answer の出所を問わない — 変更不要 |
| `emitConfiguredSwarm` | `amadeus-orchestrate.ts:3940` | engine が config を 1 引数で読む既存前例 |
| mirror boundary の config 解決 | `amadeus-orchestrate.ts:632-643` | engine が config を 3 引数（intent + space）で読み、invalid を fail-closed する既存前例 |
| `handleTriggeredOpen` | `amadeus-election.ts:443-463` | `soloElection.trigger.mode` を読む**唯一**の実装（`:459`） |
| `handleOpen` | `amadeus-election.ts:402-434` | store 作成 + blind view 書出し |
| `handleNotify` | `amadeus-election.ts:483` 付近 | subagent への配布 DeliveryDirective |
| `Election.parse` | `amadeus-election-model.ts:100-116` | definition スキーマ |
| `solo-election.trigger.mode` スキーマ | `amadeus-config.ts:563-574`（型 `:94`、解決 `:771-775`） | `ALL_LAYERS` の 3 層解決 |
| solo auto-election hook（規範） | `stage-protocol.md:149-152` | branch 1 = prompt 非提示 / branch 2 = prompt 提示 |
| voters 規約 | `skills/amadeus-election/SKILL.md:28` | `subagent-1` / `subagent-2`。CLI 側は無制約 |

`soloElectionAvailable`（`amadeus-intent-autonomy-production.ts:834,910` / `amadeus-intent-autonomy.ts:802,956`）は decide-question 梯子の capability フラグであり、**本 intent の患部とは別機構**である。混同しない。

### テストコンポーネントの棚卸しと交差の空集合

述語 P1 `git grep -ln "solo-election\|soloElection" -- tests/`（**exit 0**、17 ファイル）:

```
tests/e2e/t-exec-codex-autosolo-s13.serial.test.ts
tests/harness/autosolo-s13-fixture.ts
tests/integration/t236-election-loop.integration.test.ts
tests/integration/t269-election-solo-skill-template.integration.test.ts
tests/integration/t282-amadeus-mirror-lifecycle.integration.test.ts
tests/integration/t369-protocol-autosolo-hook.test.ts
tests/integration/t432-config-vocabulary-drift.integration.test.ts
tests/integration/t432-intent-autonomy-runtime.integration.test.ts
tests/integration/t433-autonomy-review-observability.test.ts
tests/integration/t434-intent-completion-live-seam.integration.test.ts
tests/integration/t435-intent-autonomy-production.integration.test.ts
tests/integration/t453-semi-ladder-runtime.integration.test.ts
tests/unit/t234-election-model.test.ts
tests/unit/t280-amadeus-mirror-coordinator.test.ts
tests/unit/t431-intent-autonomy.test.ts
tests/unit/t431-structured-config.test.ts
tests/unit/t452-authorize-interaction-semi.test.ts
```

述語 P2 `git grep -ln -- "--trigger" tests/`（**exit 0**、5 ファイル）: `t-exec-codex-autosolo-s13.serial.test.ts`、`t236-election-loop`、`t269-election-solo-skill-template`、`t369-protocol-autosolo-hook`、`t432-config-vocabulary-drift`。

述語 P3（engine 側の failure ruling 面、いずれも exit 0）:

| 述語 | ヒット |
|---|---|
| `git grep -ln "await-unit-ruling" -- tests/` | `tests/integration/t533-per-unit-consume-fanout.integration.test.ts`、`tests/unit/t-construction-outcome-projection.test.ts` |
| `git grep -ln "resolve-failure" -- tests/` | `tests/unit/t211-swarm-batch-progress.test.ts` のみ |
| `git grep -ln "Retry, Skip, or Abort" -- tests/` | `tests/unit/t211-swarm-batch-progress.test.ts` のみ |

**P2 ∩ P3 = ∅**。「auto 設定下で unit failure がどう扱われるか」を engine 断面で検証しているテストは 0 件である。これが本 Issue が緑のまま生存できた構造的理由である。

### 既存テストの射程（修正時の扱い）

- `tests/unit/t211-swarm-batch-progress.test.ts:326-333` — `seedFailedSwarmUnit()` を seed して `runNext(proj)` が `{ kind: "ask", question: expect.stringContaining("Retry, Skip, or Abort") }` に matchObject することを要求。`:395` にも同文言（error 側）。seed ヘルパは `:239-280`（`seedSwarmProject([["alpha"]])` → `createUnitPoolCoordinator(createAuditUnitPoolRepository(proj))` → initialEnqueue(batchId "1", cap 1, units [alpha]) → acquire → confirmDispatch → `settleRelease({ outcome: "failed" })`、`withClosure` 時は `BOLT_FAILED` と `SWARM_BATON_RETURNED` を追記）。**`amadeus/config.json` を seed しない**ため config はデフォルト `manual` 相当で走る → `manual` 経路の期待値としてそのまま維持でき、`auto` を植えた新ケース追加が構造的に整合する
- `tests/integration/t369-protocol-autosolo-hook.test.ts` — 射程はテキスト固定のみ。判定述語 `findMissingHookMarker`（`:88-92`）が対象セクション文字列に (a) `OPEN_COMMAND` 正規表現（`open --trigger auto`）と (b) `DISABLED_ENVELOPE`（`solo-election-manual-trigger-required`）を含むかを見るだけで、**engine 挙動を一切拘束しない**。テストは `:96`（§13 セクション）、`:106`（halt-and-ask セクション）、`:114`（conductor persona）、`:124`（`--file` 名指し）、`:134`（falling proof）の 5 件 + `:178` `:197` `:211` の fixture 系 3 件。対象パスは `packages/framework/core/amadeus-common/`・`dist/<harness>/amadeus-common/`・self-install ツリー
- `tests/integration/t236-election-loop.integration.test.ts:71-135` — `open --trigger auto` の 4 段階を 1 テスト内で実測する CLI 契約の正本。`:117` からは invalid config（`mode: "true"`）で exit 1 + `solo-election.trigger.mode expected manual | auto`。voters は両テストとも `["subagent-1", "subagent-2"]`

### 本スキャンの未検証面

- `amadeus-election.ts:137` `handleNext` / `:186` `handleReport` の内部指令生成ロジックは概要把握に留め、逐行未読
- `tests/e2e/t-exec-codex-autosolo-s13.serial.test.ts` と `tests/harness/autosolo-s13-fixture.ts` は grep によるファイル特定のみ（§13 学習選定の auto 発動面であり本 Issue の halt-and-ask 面とは別類型）
- `constructionFailureTransition` / `projectConstructionOutcomes` の射影ロジック（`amadeus-construction-outcome*.ts` 系）は患部外として未読

## 260814-open-bug-batch-6 のコンポーネント棚卸し（履歴、observed `a49f9e9fd`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260815-priority-bug-batch-2 の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

### プラグイン一覧（本区間で 3 → 4 へ増加）

| プラグイン | 責務 | stages | sensors 宣言 | 本区間の変化 |
| --- | --- | --- | --- | --- |
| `coverage-patch-quick` | push 前 patch coverage の advisory 往復 | なし | なし（センサー資産も無し） | 変化なし |
| `formal-model-check` | TLA モデル検査、モデル完全性 | `formal-model-check` / `tla-authoring` | **なし（資産は実在 — #3026）** | ツール 7 件が変更 |
| `git-drift` | origin drift の早期 advisory | なし | あり（`sensors/amadeus-git-drift.md`） | **新設**（PR #3055、4 ファイル） |
| `github-pr-convergence` | PR 収束ステージと report 形式検査 | `pr-convergence` | あり | **rename**（旧 `pr-convergence`、PR #3051） |

### センサーコンポーネント（実在 14 / 投影 13）

core 正本 11 件（`packages/framework/core/sensors/`、`ls` 出力の転記）: `amadeus-answer-evidence` / `amadeus-depth-budget` / `amadeus-event-registry-drift` / `amadeus-linter` / `amadeus-nfr-budget` / `amadeus-question-budget` / `amadeus-required-sections` / `amadeus-scope-sizing` / `amadeus-self-scope-consistency` / `amadeus-type-check` / `amadeus-upstream-coverage`。

プラグイン供給 3 件: `amadeus-model-completeness`（formal-model-check、**未投影**）/ `amadeus-git-drift`（git-drift）/ `amadeus-pr-convergence-report-format`（github-pr-convergence）。

投影 `.claude/sensors/` の 13 件は core 11 + git-drift + pr-convergence-report-format。**docs の表に載るのはこのうち 10 件**（欠落 4 = nfr-budget / question-budget / scope-sizing / git-drift、幽霊記載 1 = model-completeness）。この 3 集合（実在 14 / 投影 13 / 文書 10）がどれも一致していないことが #3026 と #3028 の共通の構造である。

### #3062 の関与コンポーネント

| コンポーネント | 責務 | 本 Issue での位置 |
| --- | --- | --- |
| `pr-convergence-cli.ts` | verb ディスパッチ、self report 書込 | 拒否の主体（3 層） |
| `pr-convergence-predicate.ts` | verdict の単一定義 | landed を表現できる側 |
| `amadeus-sensor-pr-convergence-report-format.ts` | report 形式の blocking 検査 | 拒否のもう一方 |
| `pr-convergence-attestation.ts` / `pr-convergence-ledger.ts` / `pr-convergence-provenance.ts` | 証跡・台帳・provenance | 是正時の波及候補（本スキャンでは未調査） |
| `amadeus-state.ts` | approve ゲート | blocking sensor 未解決で拒否する終端 |

### #3032 の関与コンポーネント

| コンポーネント | 責務 |
| --- | --- |
| `amadeus-lib.ts` の `emitError` / `emitErrorAuditRow` | エラー終了時の ERROR_LOGGED 記録（best-effort） |
| `otel/audit-emit.ts` の `emitAuditEvent` | 監査イベントの正準 emit 入口 |
| `otel/bootstrap.ts` の `ensureOtelBootstrap` / `assertSameProject` | プロセス単位の workspace ピンとその検査 |
| `tests/unit/t214-engine-error-logged-seam.test.ts` | in-process 駆動側（着地リテラルの帰属先） |
| `tests/harness/fixtures.ts` の `createTestProject` / `removeWorkspaceRecord` | fixture の隔離境界 |

### 新設コンポーネント（背景）

- `amadeus-plugin-settings.ts`（+274 行）— plugin.settings の宣言・階層化オーバーライド・fail-closed 解決
- 選挙 v2 — `amadeus-election-codec.ts`(+908) / `amadeus-election-question-tally.ts`(+386) / `amadeus-election-transport.ts`(+94)。`amadeus-election-model.ts` は -536 行縮退、`scripts/amadeus-election-migrate.ts` は削除

本 intent の Focus はこれらに非接触。

## 区間内のコンポーネント増減（260814-priority-bug-batch、履歴、observed `d64fd7cac`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260815-priority-bug-batch-2 の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**観測 ref**: base `1d08374cd7e4ef89637b4a8000bab3fcf1a0f780` → observed `d64fd7cac049d7c2cda7dd7dc7d9d0a652ff02d7`。増減の列挙元は `git diff --name-status -M 1d08374cd HEAD -- ':!amadeus/' ':!metrics/' | grep -E '^(A|D)'`（A 31 件 / D 9 件）。`packages/framework/core/tools/` の総数は 166（`git ls-files packages/framework/core/tools | wc -l`）。

### 新規コンポーネント — 選挙（PR #3036）

| コンポーネント | 行数 | 責務 | 主なエクスポート |
|---|---|---|---|
| `packages/framework/core/tools/amadeus-election-codec.ts` | 908 | schemaVersion 2 の canonical schema と legacy decoder。純粋、例外を投げない | 型 `Canonical*`（choice / question / definition / ballot / tally 系 11 種）、`ElectionCodecResult<T>`、コンパニオン `ElectionDefinitionCodec`（`:279`）/ `BallotCodec`（`:543`）/ `TallyCodec`（`:804`） |
| `packages/framework/core/tools/amadeus-election-question-tally.ts` | 386 | 問ごとの集計方針。voter×question 解決、遅延回答分類、early tally 可否、lifecycle 導出 | `resolveResponses`（`:77`）/ `classifyLateResponses`（`:127`）/ `canEarlyTally`（`:190`）/ `deriveLifecycle`（`:334`）/ `tallyQuestions`（`:340`）、型 `ResolvedResponse` / `LateResponseClassification` / `TallyPolicyResult<T>` / `ElectionTallyDraft` |

### 削除・縮小したコンポーネント（履歴へ降格）

| コンポーネント | 状態 | 備考 |
|---|---|---|
| `scripts/amadeus-election-migrate.ts` | **削除** | 旧 direct-path 選挙の承認付き migration。多問化にあたり dual-read 前提ごと退役 |
| `tests/helpers/arbitraries/election.ts` | **削除** | 単問 Election/ElectionFile の arbitrary。PBT は `t548` / `t550` / `t552` / `t554` の各ファイルへ移った |
| `packages/framework/core/tools/amadeus-election-model.ts` | **32 行へ縮小** | データモデル責務を codec へ、集計を question-tally へ移譲。残るのは `Result` / `ok` / `err` / `VoterKind` / `HoldReason` の共有語彙のみ |
| 旧選挙テスト 7 件 | **削除** | `tests/unit/t234-election-model` / `t238-election-record` / `t244-election-choice-resolution` / `t262-elections-migration` / `t416-election-model-roundtrip.pbt`、`tests/integration/t244-election-tie-choice` / `t262-elections-migration` |

置換となる新規テストは 13 件（unit 6 = `t547` / `t548` / `t549` / `t550` / `t551` / `t552`、integration 7 = `t549-election-v2-store` / `t553` / `t554` / `t555` / `t557` / `t558` / `t559`）。

### 新規コンポーネント — plugin.settings（PR #3052）

| コンポーネント | 行数 | 責務 | 主なエクスポート |
|---|---|---|---|
| `packages/framework/core/tools/amadeus-plugin-settings.ts` | 274 | 設定宣言の parse と、宣言 × override の fail-closed 解決 | `parseSettingsDeclaration`（`:54`）/ `collectSettingsMisspellings`（`:92`）/ `settingsKeyViolation`（`:120`）/ `valueMatchesType`（`:193`）/ `resolvePluginSettings`（`:240`）、定数 `SETTINGS_KEY_RE`（`:20`）/ `SECRET_KEY_RE`（`:24`） |

既存コンポーネントへの追加面: `amadeus-sensor.ts` に `resolvePluginSettingsForSensor`（`:291`）と `pluginSettingsOverrides`（`:324`）、`amadeus-plugin-compose.ts:362-363` に compose 時の宣言検査、`amadeus-config.ts:649-655` に registry entry `plugin.settings`。検証面は `tests/unit/t2997-plugin-settings.test.ts` / `t2997-plugin-settings-config.test.ts` / `tests/integration/t2997-plugin-settings.integration.test.ts` / `t2997-sensor-plugin-settings.integration.test.ts`。

### 新規コンポーネント — git-drift プラグイン（PR #3055）

`plugins/git-drift/` の 4 ファイル（`git ls-files plugins/git-drift`）。`stages: []` の tool-only プラグインで、`code-generation` と `build-and-test` の `sensors` seam へ `git-drift` を追加する。

| コンポーネント | 行数 | 責務 | 主なエクスポート |
|---|---|---|---|
| `plugins/git-drift/tools/git-drift-detect.ts` | 249 | drift 判定の純粋ロジックと port 定義 | `detectDrift`（`:109`）/ `renderDriftResult`（`:228`）、port 型 `GitPort` / `ClockPort` / `ThrottleStore`、`DriftReport` / `DriftDetection` / `SensorResult`、定数 `FETCH_TIMEOUT_MS = 10_000`（`:77`） |
| `plugins/git-drift/tools/amadeus-sensor-git-drift.ts` | 147 | port の実装と sensor エントリポイント | `nodeGitPort`（`:33`）/ `systemClock`（`:50`）/ `fileThrottleStore`（`:55`）/ `parseSettings`（`:107`）/ `evaluateGitDrift`（`:122`）/ `main`（`:134`）、`THROTTLE_REL_PATH`（`:30` = `amadeus/.amadeus-sessions/git-drift-fetch.json`） |
| `plugins/git-drift/sensors/amadeus-git-drift.md` | — | sensor manifest。`default_severity` を宣言せず advisory | — |
| `plugins/git-drift/plugin.json` | — | seam 宣言 + `settings.fetch-throttle-seconds`（number、default 600） | — |

構造上の要点は、判定ロジック（`git-drift-detect.ts`）と I/O adapter（`amadeus-sensor-git-drift.ts`）を port 境界で分離し、`GitPort` / `ClockPort` / `ThrottleStore` の 3 port を注入可能にしたことである。throttle は fetch の頻度のみを絞り、drift 判定自体は毎回走る（`plugin.json` の description 逐語: `Minimum seconds between origin fetches; the drift verdict itself runs on every fire`）。検証面は `tests/unit/t2997-git-drift-detect.test.ts` / `tests/integration/t2997-git-drift-sensor.integration.test.ts` / `t2997-git-drift-conformance.integration.test.ts`。

### プラグイン bundle の rename（PR #3051）

`plugins/pr-convergence/` → `plugins/github-pr-convergence/` の 13 ファイル移動。コンポーネントの追加・削除ではなく、bundle ディレクトリ名の変更である。ツールのファイル名・責務・エクスポート面はいずれも不変。本ファイル内の旧パス表記は、それを宣言する観測断面が rename 以前である**履歴節に限って**保存されている。

### その他の新規テストコンポーネント

`tests/integration/t2996-pr-convergence-scope-grid.integration.test.ts`（rename 後の scope grid 固定）、`tests/integration/t3016-park-provenance.integration.test.ts`（PR #3053、autonomous park の human-turn provenance）、`tests/fixtures/coverage-registry/unit/fixture.none.test.ts`、`tests/no-silent-drop/events/01M008DFEFXTFBWM3T9FZRHKAZ.json`（追記型 ULID イベント台帳への 1 件追加）。

## 新規モジュール 1 件と、選挙 7 モジュールの責務分担（260815-priority-bug-batch-2、履歴、observed `9ba8170bb`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260815-per-unit-outcome の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**観測 ref**: base `a49f9e9fdbd19fd40e9374feba77e9360771d173` → observed `9ba8170bb03996fb98b497cfcbac3d207795018d`。増減の列挙元は `git diff --name-status a49f9e9fd HEAD -- ':!amadeus/' ':!metrics/'`（A **1 件** / D **0 件** / M 9 件）。`packages/framework/core/tools/` の総数は **167**（`git ls-files packages/framework/core/tools | wc -l`。前区間 166 から +1）。

### 新規コンポーネント（1 件）

| コンポーネント | 行数 | 責務 | エクスポート |
|---|---|---|---|
| `packages/framework/core/tools/amadeus-migrate-git.ts` | **32** | migration ツールの git spawn 判定。`error` が立った spawn を exit code に関わらず ok にしない fail-closed 正規化と、その stderr への逐語追記 | `GitSpawnOutcome`（`:7`、`status` / `stdout` / `stderr` / `error` の 4 面）/ `normalizeGitOutcome`（`:19`） |

消費者は 2 面のみである — `packages/framework/core/tools/amadeus-migrate.ts:32`（import）と `:452`（`git()` からの委譲）、および `tests/integration/t226-migration-routing-in-process.test.ts:22`（in-process 検証）。**32 行という粒度は設計判断であり偶然ではない**: 3847 行の `amadeus-migrate.ts` を in-process import すると lcov 母集団が膨張して Project Coverage Gate の相対条件を構造的に割るため、被検関数だけを切り出してテストはそれだけを import する（`cid:build-and-test:bt-coverage-universe-inflation`）。冒頭コメントがこの意図を逐語で述べる — `in its own module so a test can drive it without importing the migration tool itself`。

削除コンポーネントはない。

### 選挙サブシステム 7 モジュールの責務分担

#3077 の患部が `amadeus-election.ts`（生産）と `amadeus-election-store.ts`（検証）の 2 ファイルに割れているため、どの責務がどこにあるかを棚卸しする。行数はいずれも `wc -l` の転記で、合計 **4314 行**。本区間ではこの 7 ファイルに変更はない（前区間 PR #3036 の v2 移行が最後の変更）。

| コンポーネント | 行数 | 責務 | #3077 との関係 |
|---|---|---|---|
| `amadeus-election-codec.ts` | 908 | schemaVersion 2 の canonical schema と legacy decoder。純粋、例外を投げない | **digest の定義元**。`establishedResultsDigest`（`:840`）が established 結果のみを payload 化してハッシュする（`:868`）。established 0 件でも非 null を返す点が不整合の起点 |
| `amadeus-election-store.ts` | 1232 | election / ledger / pending / tally / registry の永続化と、書込時の不変条件検査 | **検証側の患部**。`verifyPreservation`（`:716`）の全 question 分岐（`:728-729`）が `null` を要求する |
| `amadeus-election.ts` | 804 | CLI 9 verb と directive loop。snapshot から次の指令を導出し、store へ commit する | **生産側の患部**。`directiveFromSnapshot`（`:148`）が digest を決め（`:154-159`）、`tallyElection`（`:424`）が `:451` で書く。`isCommittedRun`（`:419-420`）のリペア期待も同じ非対称を持つ |
| `amadeus-election-record.ts` | 651 | question 別 ruling / GoA / 留保 / timeline の render・verify | 非接触。`buildDistributionView`（`:74`）ほか |
| `amadeus-election-question-tally.ts` | 386 | 問ごとの集計方針。voter×question 解決、遅延回答分類、early tally 可否、lifecycle 導出 | 非接触だが隣接 — hold を生むのはこの層の判定であり、hold が `currentTargets` を経て不整合の入口条件を作る |
| `amadeus-election-transport.ts` | 301 | agmsg / subagent への通知 port | 非接触 |
| `amadeus-election-model.ts` | 32 | `Result` / `ok` / `err` / `VoterKind` / `HoldReason` の共有語彙のみ | 非接触 |

**責務境界としての要点**: digest の**定義**（codec）、**生産**（CLI）、**検証**（store）が 3 モジュールに分かれており、生産と検証が互いの述語を参照していない。#3077 はこの分散が生んだ不整合であり、是正は「述語を 1 か所に持ち、生産と検証の双方がそれを呼ぶ」形が構造的な再発防止になる（詳細は `architecture.md` の対応節）。

## per-unit consume / unit pool / construction outcome の 3 コンポーネント（260815-per-unit-outcome、履歴、observed `78146f435a`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260815-stale-epoch-landed の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**観測 ref**: observed `78146f435a66680055a24144937b5aa03d48bfb4`（base `9ba8170bb03996fb98b497cfcbac3d207795018d` からの差分リフレッシュ）。**区間で本節のコンポーネントはいずれも無変更**（`git diff --quiet 9ba8170bb 78146f435 -- <path>` を 5 パスへ適用し全件 **exit 0**）。行数は `wc -l`、export 数は `grep -c "^export "` の実測。

### 患部を構成する 5 モジュール

| モジュール | 行数 | export | 責務 | 本 intent での位置 |
|---|---|---|---|---|
| `packages/framework/core/tools/amadeus-per-unit-consume-fanout.ts` | 272 | 11 | per-unit consume の展開と fail-closed 判定。消費者エッジ在庫 `EXPECTED_PER_UNIT_CONSUMER_EDGES`（`:90-110`）とガード `assertConsumerEdgeInventory`（`:144-168`、`consumer-edge-inventory-mismatch`） | **症状の発火点**（`:224-228` の `producer-outcome-pending`） |
| `packages/framework/core/tools/amadeus-unit-pool-runtime.ts` | 354 | 9 | unit pool の監査シャード永続化。`UNIT_POOL_EVENT_SET_COMMITTED` の**単一 writer**（`:152-161`）と reader（`:122-141`） | 患部の**入力源**（per-unit 経路はここへ書かない） |
| `packages/framework/core/tools/amadeus-construction-outcome-projection.ts` | 681 | 15 | Construction 成果の正準射影。`CONSTRUCTION_AUDIT_EVENTS`（`:222-228`）で 5 イベントを正規化 | **既存のより豊かな読み口**（fanout はこれを使っていない） |
| `packages/framework/core/tools/amadeus-orchestrate.ts` | 7088 | — | ディスパッチ本体。`readPerUnitConsumePopulation`（`:2447-2473`）、`emitRunStageForSlug`（`:4232`、配線 `:4259-4261`）、`emitPerUnitRunStage`（`:4574-4725`）、正準射影の 4 消費点 | **2 系統の読み口が同居する層** |
| `packages/framework/core/tools/amadeus-lib.ts` | 9061 | — | plan-integrity 判定 `planIntegrityVerdict`（`:8412`、幅判定 `:8416`。`grep -n "export function planIntegrityVerdict"` で再取得） | **再現条件**（幅 1 バッチが redirect を素通り） |

関連: `packages/framework/core/tools/amadeus-unit-pool.ts`（450 行、`foldUnitPoolEventSets` の純関数側）、`packages/framework/core/tools/amadeus-swarm.ts`（1426 行、pool の唯一の変異源 = 9 call site）。

### 消費者エッジ在庫 — 7 consumer / 19 edge

`amadeus-per-unit-consume-fanout.ts:90-110`。件数の述語は `awk 'NR>=91 && NR<=109' <file> | grep -c '^\s*\['` → **19**、consumer 名は同範囲へ `grep -oE '^\s*\["[a-z-]+' | grep -oE '[a-z-]+$' | sort -u | wc -l` → **7**。内訳は `sort | uniq -c` からの転記。

| consumer（stage） | edge 数 | consume する artifact ← producer stage |
|---|---|---|
| `observability-setup` | 5 | performance-design / security-design / reliability-design ← `nfr-design`、monitoring-design / infrastructure-services ← `infrastructure-design` |
| `performance-validation` | 4 | performance-requirements / scalability-requirements ← `nfr-requirements`、performance-design / scalability-design ← `nfr-design` |
| `incident-response` | 3 | reliability-design / security-design ← `nfr-design`、deployment-architecture ← `infrastructure-design` |
| `build-and-test` | 2 | code-generation-plan / code-summary ← `code-generation` |
| `deployment-pipeline` | 2 | deployment-architecture / cicd-pipeline ← `infrastructure-design` |
| `environment-provisioning` | 2 | deployment-architecture / infrastructure-services ← `infrastructure-design` |
| `ci-pipeline` | 1 | code-summary ← `code-generation` |

Issue #3099 が名指す到達不能は `build-and-test`（2 edge、producer = `code-generation`）で発生する。**在庫はガードで fail-closed のため、是正がエッジ集合を変えるなら在庫の更新が同時に必要**であり、変えないなら触れてはならない。

機序は `architecture.md`、配置は `code-structure.md`、テスト面と台帳は `code-quality-assessment.md` の各対応節を参照。

## pr-convergence の 4 コンポーネントと、拒否の所在（260815-stale-epoch-landed、履歴、observed `83e1dbeef`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260816-open-bug-batch-7 の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**本差分でのコンポーネント変化なし。** base `78146f435a` → observed `83e1dbeef` で新規モジュール・責務移動はゼロ。`git diff --quiet 78146f435a 83e1dbeef -- plugins/github-pr-convergence/` → **exit 0**。

[Issue #3110](https://github.com/amadeus-dlc/amadeus/issues/3110) の患部にあたる 4 コンポーネントの責務分担は次のとおり（行数は observed 断面の `wc -l`）。

| コンポーネント | ファイル | 規模 | 責務 | 本件での役割 |
|---|---|---|---|---|
| CLI（4 verb） | `plugins/github-pr-convergence/tools/pr-convergence-cli.ts` | 1468 行 | `create` / `report` / `override` / `status` の駆動、attestation の検証と書込 | **拒否の所在**。`:669` の head 束縛が verb 分岐（`:1398`）より先に走り、4 verb すべてを塞ぐ |
| GitHub runner | `plugins/github-pr-convergence/tools/pr-convergence-gh-runner.ts` | 354 行 | `gh` CLI の readiness 検査と呼び出し（optional dependency 扱い） | `fetchOpenPrForHead`（`:322`）が `--state open` のみ引き、MERGED PR の read-back 経路を持たない |
| blocking sensor | `plugins/github-pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts` | 432 行 | report ファイルの形式と最終性を record 直読で判定 | `:391-393` が `created` を非最終と報告し、`:289` が local head 不一致を報告。**CLI に依存しない独立判定** |
| stage 文書 | `plugins/github-pr-convergence/stages/pr-convergence.md` | 431 行 | ステージ契約の正本 | `:344-346` が「merged PR に ruling は不要、report が landed を書く」と定め、override 経路を閉じる |

補助として `pr-convergence-attestation.ts`（`local head` フィールドの生成 `:82` / 型 `:115` / parse `:166`）と `pr-convergence-predicate.ts`（`converged` / `landed` の判定）が関わる。**sensor manifest（`sensors/amadeus-pr-convergence-report-format.md`）と sensor 実装（`tools/amadeus-sensor-pr-convergence-report-format.ts`）はファイル名プレフィックスもディレクトリも異なる**ため、参照時に取り違えない（`sensors/` 配下に `.ts` は存在しない）。

**責務分担から見た是正の制約**: sensor は record を直読する独立コンポーネントであるため、CLI 側の挙動だけを変えても record が `created` のままなら赤は消えない。閉路の解消は「record へ `landed` を書けるようにする」側でしか成立しない。機序は `architecture.md` の対応節を参照。

## オープンバグ 3 件のコンポーネント棚卸しと、区間のコンポーネント増減（260816-open-bug-batch-7、履歴、observed `5c5911ee3`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260816-priority-bug-batch-3 の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**観測 ref**: base `83e1dbeefb3278a00e86f69d3c79071a35ccf043` → observed `5c5911ee3f107152c3173701caf178a746b6e3aa`。file:line はすべて observed 断面で本節の起草時に逐語確認した（`sed -n` による直読）。

### A. 区間のコンポーネント増減 — 新規 core tool 5 本

`git diff --name-status 83e1dbee..HEAD -- packages/framework/core/tools/` → 新規（`^A`）**5** / 変更（`^M`）**21**。新規 5 本の責務と規模（`wc -l`）は `architecture.md` の対応節の表に収載。いずれも RFC-0001 intent autonomy modes（#3116、intent `260815-rfc-autonomy-modes`、unit **13**）由来であり、**本節 B〜D の患部とは 1 ファイルも交差しない**。

### B. #2363 — self-install 配布経路のコンポーネント

pi は **packager 側では第一級**である（`scripts/plugin-projection.ts:44-53` の `PACKAGE_HARNESSES` は 8 面で、`:52` が `"pi"`。`packages/framework/harness/pi/` も実在）。不在なのは自己インストール側の 3 定義すべてである。

| コンポーネント | ファイル / 行 | 責務 | pi の扱い |
|---|---|---|---|
| package face 集合 | `scripts/plugin-projection.ts:44-53` | 配布対象 8 ハーネスの閉じた union | **在**（`:52`） |
| self-install face 集合 | `scripts/plugin-projection.ts:59` | `SELF_INSTALL_HARNESSES = ["claude", "codex", "cursor", "opencode", "kimi"]`（5 面）。直上 `:56` のコメントが「the five faces promote-self.ts reflects into」と述べる | **不在** |
| dist→作業ツリー写像 | `scripts/promote-self.ts:64-71` | `managedDirs`（6 エントリ。codex のみ `.codex` と `.agents` の 2 行を持つ） | **不在** |
| 生成ルート allowlist | `packages/framework/core/tools/data/self-install-allowlist.ts:12-19` | `GENERATED_SELF_INSTALL_ROOTS`（6 ルート）。ここから `.gitignore` の ignore 行と `.gitattributes` が導出される | **不在**（`.pi` なし） |
| pi manifest | `packages/framework/harness/pi/manifest.ts:83` / `:106-108` / `:112` | `{ src: "agents", dst: "agents" }` の投影、`frontmatterAdditions`（reviewer へ `tools: read, grep, find, ls`）、`modelPins: PI_MODEL_PINS` | 宣言は完備 |
| pi driver（charter 解決） | `packages/framework/harness/pi/drivers/amadeus-pi-driver.ts:32` | `PERSONA_CHARTER_DIRS = [".pi/agents", ".codex/agents", ".claude/agents", ".agents/agents"]` のフォールバック順 | fallback で charter 本体は解決される |
| 包含ガード | `tests/integration/t531-plugin-harness-literal-guard.integration.test.ts:143-148` | テスト名逐語 `PACKAGE_HARNESSES enumerates every self-install face`。`for (const harness of SELF_INSTALL_HARNESSES) expect(PACKAGE_HARNESSES).toContain(harness);` | **片方向**（package 側にしか居ないハーネスは違反にならない） |
| doctor 鮮度検査 | `scripts/promote-self.ts:327-329` | `packageFreshnessArgs` が `SELF_INSTALL_HARNESSES.map(...)` を返す | 同じ 5 面の盲点を継承 |

作業ツリーの実ルートは 6 件で `.pi/` は不在（`ls -d .agents .claude .codex .cursor .kimi-code .opencode .pi` → `.pi` のみ `No such file or directory`）。**固定件数ピンを持つテスト 3 本**が pi 追加で確実に赤化する（Red の実測点）: `tests/integration/t-plugin-projection-packaging.test.ts:148-149`（`toEqual(["claude","codex","cursor","kimi","opencode"])` と `toHaveLength(5)`）、`tests/unit/t-plugin-projection.test.ts:308`（`toHaveLength(5)`）、`tests/unit/t209-promote-self-dangling-symlink.test.ts:146-150`（`packageFreshnessArgs("apply")` の逐語配列）。

### C. #2162 — no-silent-drop bootstrap provenance のコンポーネント

| コンポーネント | ファイル / 行 | 責務 | 本件での役割 |
|---|---|---|---|
| 信頼台帳ローダ | `tests/no-silent-drop/bootstrap.ts:435-461` | `loadTrustedPreviousLedgers`。`trustedSha` に `events/` があれば `assertStrictAncestorOfHead`（`:449`）、無ければ `validateBootstrapHistory`（`:451`） | **分岐点**。events 着地後は後者を通らず、bootstrap 検証が潜在化 |
| bootstrap 検証 | 同 `:348-358` | `bootstrapBaseRevision === preRevision` の等値（`:348-351`）と `preRevision` の `gitObjectExists` + `isAncestor`（`:352-356`） | 到達性検査は **`preRevision` にのみ**掛かる |
| evidence 束の検証 | 同 `:283` | `approved.revision !== revision` の**文字列等値比較のみ** | `postRevision` の唯一の実消費（`:358` 経由）。git 到達性は見ない |
| ULID event 台帳 | `tests/no-silent-drop/events/` | append-only の grant / revoke / snapshot 台帳（**222** ファイル、`ls \| wc -l`） | `fe8c701ba1`（#2338 / #2353）で `baseline.json` を置換した新正本 |
| 死んだ baseline 参照 | `tests/no-silent-drop/ledger.ts:226-227` / `:301-302` | `baselineAtRevision`（`git show ${sha}:tests/no-silent-drop/baseline.json`）と `CANONICAL_PATHS.baseline` | **不在ファイルを指し続ける**（`ls tests/no-silent-drop/baseline.json` → exit 1）。唯一の呼出は `tests/integration/no-silent-drop-gate.test.ts:839` の negative test |
| CI 起動点 | `.github/workflows/ci.yml:164` | `bun run no-silent-drop -- --base-revision "${BASE_REVISION}"` | 通常経路。`validateBootstrapHistory` を通らない |

`postRevision` の全消費点は 3 hit のみ（`grep -n postRevision tests/no-silent-drop/*.ts` → `bootstrap.ts:53` 型 / `:186` パース / `:358` 消費）。

### D. #3097 — センサー機構の docs 面と検査射程

**この面は本 intent 以前の codekb に収載がない。** `grep -c "07-sensor-system" *.md`（本 codekb ディレクトリ 9 面）→ **全 9 面 0**（exit 1 = エラーなく不一致）。対照として `grep -c "sensor"` は `architecture.md` 71 / `component-inventory.md` 64 であり、センサー機構そのものは収載済みで、**この docs パスだけが未収載**という限定的な不在だった。本節がその欠落を埋める。

| コンポーネント | ファイル / 行 | 内容 |
|---|---|---|
| manifest コーパス（core） | `packages/framework/core/sensors/` | **11** ファイル（`ls \| wc -l`） |
| manifest コーパス（plugin 宣言） | `plugins/*/plugin.json` の `sensors` 配列 | **3**（`formal-model-check` → `sensors/amadeus-model-completeness.md`、`git-drift` → `sensors/amadeus-git-drift.md`、`github-pr-convergence` → `sensors/amadeus-pr-convergence-report-format.md`） |
| `matches` 宣言を持つ集合 | 上記 14 のうち | **13**（`amadeus-git-drift.md` のみ `grep -c "^matches:"` → 0、exit 1） |
| 検査対象の doc（射程内） | `docs/harness-engineering/06-sensors.md` / `.ja.md` | t3028 の `covers:` ヘッダ（`:1-2`）が名指す 2 面。表は 14 行で同期済み |
| 検査対象外の doc | `docs/reference/07-sensor-system.md` / `.ja.md` | **誰も検査していない**。`matches` 表は en `:200-208` で **9 行**（ヘッダ行は `:198`）。ja 面は表 `:199-207` |
| 同期テスト | `tests/integration/t3028-sensors-docs-sync.integration.test.ts` | `derivedCorpus()`（`:20-45`）が core + plugin 宣言から 14 件を導出、`tableRows()`（`:47-51`）が `docs/harness-engineering` **直下だけ**を読み `toEqual` 比較 |
| 発火規約の宣言 | `docs/reference/07-sensor-system.md:210-212` | 逐語「`matches` **is** the fire filter … an entry **without** a `matches` glob never fires at all」 |

07 の欠落 4 件は `amadeus-nfr-budget.md` / `amadeus-pr-convergence-report-format.md` / `amadeus-question-budget.md` / `amadeus-scope-sizing.md`（`comm -23`）。逆向き（表にあるが実在しない）は **0 件**。値の陳腐化は `:200` / `:201` の 2 行で、manifest 側（両者とも `:8`）が `**/{amadeus-docs,intents,codekb}/**` なのに対し表は `codekb` を欠く。**同期先の正しい対象集合は 14 ではなく 13** である（`amadeus-git-drift.md` を足すと `:210-212` の規約と矛盾する行が生まれる）。

**3 領域はファイル交差ゼロ**（A は `scripts/` + allowlist + harness manifest、B は `tests/no-silent-drop/`、C は `docs/reference/07-*` + t3028）。機序は `architecture.md`、配置は `code-structure.md`、テスト空白と台帳は `code-quality-assessment.md` の各対応節を参照。

## 優先バグ 5 件のコンポーネント棚卸しと、区間のコンポーネント増減（260816-priority-bug-batch-3、履歴、observed `89053172e`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260817-inception-cost-batch の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する。本節が記す 5 欠陥は本区間で是正済み — 現況は本ファイル末尾の 260817-inception-cost-batch 節を参照））

**観測 ref**: base `5c5911ee3f107152c3173701caf178a746b6e3aa` → observed `89053172ed8b5bb270e254aea029a13291d10b6b`。file:line はすべて observed 断面で本節の起草時に `sed -n` により逐語確認した。

### A. 区間のコンポーネント増減 — ゼロ

`git diff --name-status 5c5911ee3 89053172e -- packages/framework/core/tools/` → 新規（`^A`）**0** / 削除（`^D`）**0** / 変更（`^M`）**4**（本節の実測）。`plugins/` と `packages/framework/harness/` は**空 diff・exit 0**。**コンポーネント境界は本区間で 1 つも動いていない**。

変更 4 本のうち 2 本（`amadeus-sensor-self-scope-consistency.ts` の `SELF_HARNESSES` 5 → 6 面、`data/self-install-allowlist.ts` の `GENERATED_SELF_INSTALL_ROOTS` 6 → 7 ルート）は前 intent §B（#2363）が記した「3 重化した配布経路の定義」のうち 2 つへの `.pi` 追加であり、**前節が予告した是正がそのまま着地した形**である。

### B. #3153 — autonomy 層と presence 層の 2 コンポーネント

| コンポーネント | ファイル / 行 | 責務 | 本件での役割 |
|---|---|---|---|
| gate resolution guard | `packages/framework/core/tools/amadeus-state.ts:3721-3772` | approve / reject の直前に「人間が居るか」を判定する | **接合部の所在**。autonomy を呼びながらその結論を使わない |
| autonomy 層 | `packages/framework/core/tools/amadeus-intent-autonomy-production.ts:295-328` | occurrence が現 mode で自動決定できるか判定し、`autoApprove` と `authorizationReason` を返す | **宣言する側**。`SCOPE_OUT` / `MODE_REQUIRES_HUMAN` を返すが読まれない |
| presence 述語 | `packages/framework/core/tools/amadeus-lib.ts:3926-3941` | ledger を走査し「直前の解決以降に HUMAN_TURN があるか」を返す | **単独で承認可否を決める側**。問いの同一性は見ない |
| ledger 走査 | 同 `scanPresenceLedger` / `resolveGatePresence`（`:3932-3940` の本体で使用） | 2 レーン（直接 HUMAN_TURN / delegate verb）の合成 | 述語の実体 |
| off-switch | `amadeus-state.ts:3757-3760` `humanPresenceGuardDisabled()` | suite-wide のテスト用無効化 | 本件では無関係（既存機構） |
| 監査書式 | `packages/framework/core/knowledge/amadeus-shared/audit-format.md:150` | `GATE_APPROVED` の任意フィールド 4 種 | **区別用フィールドの不在**（完了条件 (2) の対象） |

`humanActedSinceGate` の**本番呼出元は 7 箇所**（Developer scan §3.1 の全数棚卸しからの転記）: `amadeus-state.ts:3761`（本件）/ `:4614`（delegate approval 発行）/ `:4703`（delegate rejection 発行）/ `amadeus-lib.ts:3966`（`verifyBatchApprovalPresence`、R-6 で同述語を再利用）/ `amadeus-intent-autonomy-production.ts:384`（`latestHumanTurnId` の前段ガード）/ `packages/framework/harness/kiro/hooks/amadeus-kiro-adapter.ts:410` / `packages/framework/harness/kiro-ide/hooks/amadeus-kiro-adapter.ts:156`。**述語そのものを変える方式はこの 7 箇所すべてへ波及する**のに対し、`assertHumanPresentForGateResolution` 内で autonomy の結論を効かせる方式は 1 箇所に閉じる — コンポーネント境界から見た方式選択の主要な分岐点である。

### C. #3152 — 発行側と認可側の非対称

| コンポーネント | ファイル / 行 | 責務 | 冪等性 |
|---|---|---|---|
| 判定 + 発行の入口 | `amadeus-intent-autonomy-production.ts:295-328` `productionStageAutonomy` | projection 読取 → occurrence 構成 → 認可判定 → 非認可なら emit | — |
| **拒否イベント発行** | 同 `:354-370` `emitAuthorizationRefusal`（呼出 `:314-319`） | `INTENT_AUTONOMY_HUMAN_REQUIRED` を 1 行 append。fail-open | **なし**（毎回あたらしい UUID） |
| **認可イベント commit** | 同 `:901-913` `commitProductionStageGateDecision` | grant を発行。既決なら `{ kind: "already-decided", grantId }` を返す（`:913`） | **あり** |
| occurrence キー構成 | 同 `:246-249` `interactionKind` / `:261` `occurrence` | `projection / stage / phase / graphRevision / walkingSkeleton / phaseBoundary / skeletonGateFires` | 決定的（キー材料は揃っている） |
| 閉語彙（reason） | 同 `:333` `REFUSAL_REASONS` | `["SCOPE_OUT", "MODE_REQUIRES_HUMAN"]` | — |
| 閉語彙（kind） | `amadeus-intent-autonomy.ts:113` `InteractionKind` | 4 値 | — |
| 監査書式 | `packages/framework/core/knowledge/amadeus-shared/audit-format.md:297` | 「**an occurrence**」（単数）と宣言 | 契約側は冪等を前提 |

**同一ファイル内に冪等な commit（`:901-913`）と非冪等な emit（`:354-370`）が同居している**点が、本件のコンポーネント上の核心である。キーの材料（`occurrence`）は既に構成されており、emit 層にも `idempotencyKey` の枠がある — 欠けているのは**両者を結ぶ配線だけ**である。

`emitAuthorizationRefusal` は `:314` の 1 箇所からのみ呼ばれる（`git grep -n "emitAuthorizationRefusal"` → 定義 `:354` / 呼出 `:314` / コメント `:1300`、exit 0。Developer scan §3.2 からの転記）ため、**発行点の一元性は既に確保されている**。

### D. #3149 — 独立した 4 コンポーネントが 1 つの record を巡って衝突する

| コンポーネント | ファイル / 行 | 責務 | 本件での役割 |
|---|---|---|---|
| lifecycle 判定 | `plugins/github-pr-convergence/tools/pr-convergence-cli.ts:610-617` `transitionAllowed` | kind 遷移の可否 | **`converged` を final と定義**（クラス A の片側） |
| stale / 遷移の適用点 | 同 `:907-924` | attestation の prHead 変化と kind 変化を評価し write / refuse を返す | `:913-914` が #3110 経路、`:923` が遷移拒否 |
| 祖先証明 | `plugins/github-pr-convergence/tools/pr-convergence-git-runner.ts:213-243` `verifyMergedEpochAncestry` | `refs/pull/<n>/head` を fetch し `merge-base --is-ancestor` で判定 | **クラス B の判定主体**（`:236` がエラー文言、呼出は CLI `:763`） |
| **blocking sensor** | `plugins/github-pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts` | record を**独立に直読**して attestation の整合を検査 | **`converged` を通さない側**（`:294-295` head 一致、`:297-298` 分岐、`:331-334` checkout binding） |
| sensor manifest | `plugins/github-pr-convergence/sensors/amadeus-pr-convergence-report-format.md` | `default_severity: blocking` / `matches: "**/construction/*/code-generation/pr-convergence-report.md"` | **code-generation の stage approve を fail-closed で止める** |
| binding の排他宣言 | sensor `:278-284` | live record は checkout に、landed record は merge に答える | 逐語「The two bindings are exclusive: neither kind may borrow the other's evidence.」 |

**責務分担から見た是正の制約**（前 intent §「pr-convergence の 4 コンポーネント」節が記した制約の再確認）: sensor は record を直読する**独立コンポーネント**であるため、CLI 側の挙動だけを変えても record が `converged` のままなら赤は消えない。逆に sensor 側だけを緩めると、binding の排他性という設計上の主張（`:278-284`）を壊す。**閉路の解消は両コンポーネントの契約を同時に扱う必要がある** — これが #3110（CLI 側だけで解けた）との構造的な差である。

### E. #3156 — 単一起点を共有する 3 プローブ

| コンポーネント | 行（すべて `packages/framework/core/tools/amadeus-state.ts`） | 責務 | 本件での役割 |
|---|---|---|---|
| `isGitRepo` | `:2491-2493` | git repo 判定 | 入口の分岐 |
| **`intentBirthCommit`** | `:2498-2504` | record `amadeus-state.md` を追加したコミット（`--diff-filter=A` の最古） | **3 プローブが共有する単一起点** |
| プローブ (a) `recordBranchSourceWork` | `:2511-2521` | `birth..HEAD`（`--first-parent --no-merges`）の非 doc パス | birth 以前のコードコミットを見ない |
| `intentBoltSlugs` | `:2525-2536` | state の `Bolt Refs` を読む。読めなければ `[]` | 空なら (b) のループが回らない |
| `boltRefsForSlug` | `:2542-2549` | `refs/heads/bolt-<slug>` 等 4 候補 | — |
| プローブ (b) `boltRefHasSourceWork` | `:2556-2563` | ref 実在 → `merge-base HEAD ref` → diff に非 doc | bolt ref が HEAD 祖先だと diff が空 |
| `intentIssueRefs` | `:2568-2580` | state の `Project` から `#<digits>` を抽出 | — |
| プローブ (c) `mergedPrSourceWork` | `:2595-2609` | `birth..HEAD` の subject が宣言 issue を参照し非 doc に触れるか | record checkpoint のみの subject では false |
| 合成 | `:2622-2632` `intentScopedSourceWork` | (a) → (b) → (c) の短絡 | 3 つが同時に false |
| **テストシーム** | `:2650-2679` `gitHasSourceWork`（**export 済み**） | porcelain → `HEAD~1..HEAD` → doc-only なら合成へ | `t206` が dist 経由で import |
| 入口 | `:2685-2691` `workspaceHasWork` | git なら上記、null なら FS fallback | — |
| 判定点 | `:2710-` `evaluateStageArtifacts`（判定 `:2726`、docs-only 免除 `:2734-2736`、メッセージ `:2738`） | ステージ成果物の評価 | 誤拒否の発火点 |
| バイパス | `:2712` `artifactGuardDisabled()` | `AMADEUS_SKIP_ARTIFACT_GUARD` | 現存する唯一の逃げ道 |

**冗長化に見えて単一障害点である**点がコンポーネント上の要点である。3 プローブは別関数として分離されているが、判定範囲の起点をすべて `intentBirthCommit` から得るため、独立した検出器として機能していない。

### F. #3046 — 読取と書込のスコープが非対称なストア

| コンポーネント | 行（すべて `packages/framework/core/tools/amadeus-election-store.ts`） | 責務 | スコープ |
|---|---|---|---|
| 設計前提 | `:17-20`（コメント） | 「Single writer (conductor) by decision D-09 — no locking」 | **前提そのものが patch 対象** |
| `pendingPath` | `:489-491` | `join(dir, "pending", <voter>.json)` | voter 単位 |
| `readPendingVoter` | `:493-525` | 1 voter 分の decode。`schemaVersion !== 2` 等で `err("corrupt")` | **voter 単位** |
| **`readAllPending`** | `:527-549` | 全 voter を読み、**横断の一意性検査**（`:545-547`）、ソートして返す（`:548`） | **全体** |
| **`appendPending`** | `:1032-1092` | 検証 → load → encode → 全体読み（`:1042`）→ 冪等判定 → 採番（`:1063`）→ 書込（`:1087-1090`） | **読みは全体、書きは voter 単位** |
| `writeStoreFile` | （`appendPending` から使用） | tmp+rename による torn write 防止 | **単一ファイル内のみ** |
| 外部呼出元 | `packages/framework/core/tools/amadeus-election.ts:318` | `ElectionStore.appendPending(root, electionId, ballot)` | **本番はここ 1 箇所のみ** |

**防御機構と脅威のスコープがずれている**のが核心である。`writeStoreFile` の tmp+rename は 1 ファイル内の torn write を防ぐが、脅威は**複数ファイル間の採番衝突**なので作用しない。逆に一意性検査（`:545-547`）は全体スコープで働くため、**衝突を検出はするが検出時点では既に永続化されており、以後恒久的に `err("corrupt")` を返す**。

`readAllPending` の内部呼出元は 4 箇所（`:990` / `:1042` / `:1106` / `:1221`）で **tally / integrate 系を含む**ため、corrupt 化の影響は append 経路に留まらず選挙全体へ及ぶ。

### 5 領域の交差

**#3153 / #3152 / #3156 が `amadeus-state.ts`（6457 行、`wc -l` 実測）を共有する。** #3153（`:3721-3772`）と #3152 の呼出点（`:3744`）は**同一関数内**、#3156（`:2491-2691`）は離れた行域にある。#3149（`plugins/github-pr-convergence/`）と #3046（`amadeus-election-store.ts`）は他と交差しない。機序は `architecture.md`、配置は `code-structure.md`、テスト空白と台帳は `code-quality-assessment.md` の各対応節を参照。

## 区間のコンポーネント増減ゼロと、focus 2 件が触れる既存コンポーネント（260817-inception-cost-batch、履歴、observed `23d4ae767`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260818-priority-bug-batch-4 の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**観測 ref**: base `89053172ed8b5bb270e254aea029a13291d10b6b` → observed `23d4ae767956cd56fc28fa78abe28096712eff8a`。file:line はすべて observed 断面で本節の起草時に逐語確認した。

### A. 区間のコンポーネント増減 — ゼロ（2 区間連続）

`git diff --name-status 89053172e..23d4ae767 -- packages/ plugins/ docs/ .github/`（本節の実測、exit 0）の出力は **14 行すべてが `M`** である。新規（`A`）**0** / 削除（`D`）**0**。`packages/framework/harness/` と `.github/` は**空 diff・exit 0**。**コンポーネント境界は 2 区間連続で 1 つも動いていない**。

変更 14 面の内訳:

| 面 | ファイル | 規模 |
|---|---|---|
| core tools | `packages/framework/core/tools/amadeus-state.ts` | +198 −39 |
| core tools | `packages/framework/core/tools/amadeus-intent-autonomy-production.ts` | +136 −12 |
| core tools | `packages/framework/core/tools/amadeus-lib.ts` | +106 −8 |
| core tools | `packages/framework/core/tools/amadeus-election-store.ts` | +58 −17 |
| core tools | `packages/framework/core/tools/amadeus-intent-autonomy.ts` | +7 −0 |
| core otel | `packages/framework/core/otel/event-registry.ts` | +2 −2 |
| core knowledge | `packages/framework/core/knowledge/amadeus-shared/audit-format.md` | +4 −2 |
| plugin tools | `plugins/github-pr-convergence/tools/pr-convergence-cli.ts` | +318 −53 |
| plugin tools | `plugins/github-pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts` | +70 −25 |
| plugin tools | `plugins/github-pr-convergence/tools/pr-convergence-attestation.ts` | +4 −3 |
| plugin stages | `plugins/github-pr-convergence/stages/pr-convergence.md` | +38 −12 |
| plugin sensors | `plugins/github-pr-convergence/sensors/amadeus-pr-convergence-report-format.md` | +22 −0 |
| docs 対訳 | `docs/reference/12-state-machine.md` / `.ja.md` | 各 +2 −2 |

（`git diff --numstat 89053172e..23d4ae767 -- packages/ plugins/ docs/`、本節の実測）

### B. gate 解決 presence の 3 コンポーネント（#3153 / #3152 の着地形）

前節 §B が記した「autonomy 層 / presence 述語 / ledger 走査」の分担は保たれたまま、**presence 述語が bool から判別ユニオンへ、autonomy の結論が窓幅の入力へ**変わった。

| コンポーネント | file:line（observed） | 責務 | 前節からの変化 |
|---|---|---|---|
| gate resolution guard | `packages/framework/core/tools/amadeus-state.ts:3866` 以降（`assertHumanPresentForGateResolution`） | approve / reject の直前に承認可否と provenance を決める | autonomy の `humanRequired` × interaction kind を `milestoneStage` へ合成（`:3896-3897`）し、presence の戻り値 provenance を承認記録へ運ぶ |
| presence resolver | `packages/framework/core/tools/amadeus-lib.ts:3967-3981`（`resolveGateResolutionPresence`） | ledger を走査し「通ったか / なぜ通らなかったか」を返す | **新設**。`humanActedSinceGate` の verb 分岐（`:4038`）が milestone `null` で同関数へ委譲するので、狭めた述語と元の述語が drift しえない |
| presence 語彙 | 同 `:3912`（`GateApprovalProvenance`）/ `:3958-3960`（`GateResolutionPresence`） | 「何が通したか」「なぜ通らなかったか」の閉語彙 | **新設**。provenance 4 値 / 拒否理由 3 値 |
| slot 定義 | 同 `:3937-3952`（`gateResolutionSlots`）/ `:3922`（`opensGateFor`） | ローカル HUMAN_TURN と delegate GATE の 2 スロット合成、`--recovered` backfill の除外 | milestone 指定時のみローカルスロットを当該 gate の open 以降へ狭める |
| milestone 判定 | `packages/framework/core/tools/amadeus-intent-autonomy.ts:762`（`isMilestoneInteraction`） | interaction kind が milestone 級か | **新設**。`phase-gate` / `walking-skeleton` が true、`stage-gate` / `question` が false（`tests/unit/t188-human-presence-gate.test.ts:507-510` の逐語アサーション） |
| 拒否記録 | `packages/framework/core/tools/amadeus-state.ts:3811`（`recordGateOpenRefusal`）→ `packages/framework/core/tools/amadeus-intent-autonomy-production.ts:432-450`（`recordAutonomyRefusalAtGateOpen`） | 「なぜこの gate が人間へ落ちたか」を gate 提示時に 1 行だけ記録 | **発行点が移動**。読み取り時（`productionStageAutonomy`）ではなく `STAGE_AWAITING_APPROVAL` 発行サイトから、冪等鍵（`:442-446`）と既存行検出（`:408-411` `refusalAlreadyRecorded`）付きで |

**承認記録側の型**: `amadeus-state.ts:3834-3837` `GateResolutionAuthorization`（`grantId` + `provenance`）と `:4287` `ApprovalAuthorization.provenance: GateApprovalProvenance | null`。null は「そもそも presence を問わなかった経路」を表す。

### C. pr-convergence の 4 コンポーネントと、束縛判定の所在（#3149 の着地形）

前節 §D が「CLI と sensor の両立不能な契約」と記した境界は、**両者から `kind` 依存を外し、receipt を判定入力にする**ことで整合した。

| コンポーネント | file:line（observed） | 責務 |
|---|---|---|
| lifecycle 遷移表 | `plugins/github-pr-convergence/tools/pr-convergence-cli.ts:639`（`transitionAllowed`）/ `:1040`（`selfReportLifecycle`）/ `:1019`（`lifecycleAtChangedHead`） | kind 遷移の可否。**本区間で規則自体は不変**（`converged` は依然 final） |
| merged 最終化 | 同 `:1083`（`finalRecordOnDisk`）/ `:1110`（`finaliseMergedInPlace`）/ `:1126`（`finaliseUnitInPlace`） | **新設**。final な verdict を payload バイト不変のまま当該 merge へ再 attest し、canonical audit receipt を append |
| merged 用の証跡照合 | 同 `:816`（`mergedOverrideSelfContext`）/ `:849`（`mergeFactsOf`）/ `:860`（`mergedSelfEvidence`）/ `:885`（`attestationIsIntact`）/ `:893`（`attestationBindsDelivery`）/ `:919`（`attestationBindsIdentity`） | **新設・拡張**。live-head 前提を merge 事実の照合へ置換 |
| 束縛環境の判定（sensor） | `plugins/github-pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts:322-338`（`checkAttestationEnvironment`） | **receipt が merge 事実に触れるか**（`:303-306` `touchesMergeFacts`）で `checkMergeBinding`（`:344-370`）と `checkCheckoutBinding`（`:372-381`）へ分岐 |
| 契約散文 | `plugins/github-pr-convergence/sensors/amadeus-pr-convergence-report-format.md` の新設節「Which environment a record answers for」（+22 行）/ `plugins/github-pr-convergence/stages/pr-convergence.md`（+38 −12） | 「the receipt decides which — never the kind (#3149)」 |

**半端な merge 事実は fail-closed である**: `mergeCommit` と `mergedAt` の片方だけを持つ receipt は `checkMergeBinding` の冒頭（`:349-354`）で malformed finding となり、**checkout 束縛へフォールバックしない**。

### D. election store の採番コンポーネント（#3046 の着地形）

前節 §F が記した「読み全体 / 書き voter 単位」の非対称は解消され、**読みと書きが同一スコープ**になった。

| コンポーネント | file:line（observed） | 責務 | 変化 |
|---|---|---|---|
| D-09 契約ヘッダ | `packages/framework/core/tools/amadeus-election-store.ts:17-31` | store の並行性前提を宣言 | **改訂**（`revised for #3046, ADR-5`）。`arrivalSequence` は voter 単位で一意、グローバルには非一意 |
| append 経路 | 同 `:1070`（`appendPending`）、採番は `:1104` | 自 voter ファイルのみを読んで max+1 を採番 | **read set == write set** へ変更（旧: `readAllPending` 全体読み） |
| voter 単位の読み | 同 `:504`（`readPendingVoter`）、単調性検査 `:537` | 1 voter ファイルの decode | **狭義単調でない並びを `err("corrupt")`**（再ソートしない） |
| 全 voter 読みと順序 | 同 `:558`（`readAllPending`）、複合鍵検査 `:582`、比較子 `:550-556`（`comparePendingEvents`） | 全 pending の decode と全順序付与 | 一意性検査が `(voter, arrivalSequence)` の**複合鍵**へ。順序は `(arrivalSequence, voter)` の辞書式比較 |

**全順序はディスク上のプロパティではなく読み時の決定的計算になった** — 書き込み順・ディレクトリ列挙順に依存しない。

### E. `workspace_requires` ガードの probe 群（#3156 の着地形）

前節 §E が「3 プローブが `intentBirthCommit` を共有する単一障害点」と記した構成は、**4 probe 構成**になった。

| probe | file:line（observed） | 窓 |
|---|---|---|
| (a) `recordBranchSourceWork` | `packages/framework/core/tools/amadeus-state.ts:2516` | `birth..HEAD`（record ブランチ直上） |
| (b) `boltRefHasSourceWork` | 同 `:2561` | 当該 intent の bolt ref（merge-base 経由） |
| (c) `mergedPrSourceWork` | 同 `:2600` | `birth..HEAD` のうち宣言 Issue を参照するコミット |
| **(d) `branchSourceWorkSinceTrunkFork`** | 同 `:2660` | **`[trunk fork point .. HEAD]`**（`--first-parent --no-merges`）。**新設** |
| 合成 | 同 `:2703-2711`（`intentScopedSourceWork`） | 4 probe の OR |
| trunk 解決 | 同 `:2625`（`resolveTrunkRef`） | `refs/heads/main` → `refs/remotes/origin/main` の**完全修飾** ref 解決。**新設** |
| birth 起点 | 同 `:2503`（`intentBirthCommit`） | 不変 |
| ガード呼出 | 同 `:2732`（`gitHasSourceWork`）/ `:2767`（`workspaceHasWork`） | 不変 |

**probe (d) は birth を窓の起点でなく妥当性検査にのみ使う** — birth が fork point と HEAD の間に無ければ false を返す。前節が指摘した単一障害点は、この 1 probe が birth より前を見られるようになった分だけ緩和された（birth が null なら (d) も false を返す点は不変）。

### F. focus 2 件が触れる既存コンポーネント（新規コンポーネントの追加は本スキャンでは未決）

| コンポーネント | file:line（observed） | focus との関係 |
|---|---|---|
| RE stage 契約 | `packages/framework/core/amadeus-common/stages/inception/reverse-engineering.md`（237 行）。`consumes: []` は `:20`、スキャン対象列挙は `:104-112`、Preflight は `:81-95` | **#2415** — 除外規則の置き場。現状**規則は不在**（`git grep -n -iE "exclude\|excluded\|exclusion\|workflow exhaust\|process record"` → exit 1） |
| Developer scan テンプレート | `packages/framework/core/amadeus-common/templates/re-artifacts.md`（RE 契約 `:114` から引き渡し） | 同上。同じ grep で **exit 1**（不在） |
| RA stage 契約 | `packages/framework/core/amadeus-common/stages/inception/requirements-analysis.md`（217 行）。`consumes:` は `:14-29`（6 件、いずれも Issue 由来でない）、読み口は `:68-71` | **#3181** — Issue 証跡の consume 追加先。今日 issue 的入力は `:71` の audit shard 散文のみ |
| artifact パス解決 | `packages/framework/core/tools/amadeus-orchestrate.ts:2378-2400`（`resolveArtifactPath`）/ `:2411-2420`（`resolveConsumePath`） | **レジストリファイルは存在しない**（規約が実装で計算される）。新 artifact 種別は resolver 側 0 行 |
| graph 不変量 | `packages/framework/core/tools/amadeus-graph.ts:856`（`producersOf`）/ `:1192-1198`（producer 不在は hard error）/ `:1200-1206`（経路外は advisory、strict で error） | **consume のみの artifact は graph エラー**。producing stage の宣言が必須 |
| stage schema | `packages/framework/core/tools/amadeus-stage-schema.ts:39-43` | `consumes` の型と `conditional_on` 語彙 |
| codekb stage 集合 | `packages/framework/core/tools/amadeus-lib.ts:1461` | 逐語 `new Set(["reverse-engineering"])` — **単一要素集合** |
| GitHub プロセス境界 | `packages/framework/core/tools/amadeus-github-gateway.ts`（1,034 行）。`viewArgv` `:175-180` / `parseIssueObject` `:418-446` / `readiness` `:799-830` / adapter 2 種 `:944` `:950` | **#3181** — Issue の read path は既存。新 transport 不要。3 つ目の adapter を足す形かは design の裁定事項（仮説） |

### 5 領域の交差（是正後）

**`amadeus-state.ts` は observed で 6,616 行**（`git show 23d4ae767:packages/framework/core/tools/amadeus-state.ts | wc -l`、本節の実測。base の 6,457 行から +159 = 区間 diff の +198 −39 と一致）。#3153 / #3152 / #3156 の是正は同ファイル内の非重複行域（gate 系 `:3782-3930` 付近、source-work 系 `:2503-2770`）へ着地した。

**focus 2 件の患部は上表 §F のとおり `amadeus-state.ts` を含まない**（RE/RA の stage 契約、`amadeus-orchestrate.ts` の resolver、`amadeus-graph.ts` の不変量、`amadeus-github-gateway.ts`）。ただしこれは**現時点で同定できた患部集合についての観測**であって、実装が触る面の確定ではない — 是正方式が未決である以上、write scope の最終的な交差有無は design 以降の裁定に依存する。機序は `architecture.md`、配置は `code-structure.md`、テスト面と台帳は `code-quality-assessment.md` の各対応節を参照。

## 区間のコンポーネント増減と、focus 2 件が触れる既存コンポーネント（260818-priority-bug-batch-4、履歴、observed `127be70c5`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260820-fmc-drift-batch の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**観測 ref**: base `23d4ae767956cd56fc28fa78abe28096712eff8a` → observed `127be70c5d7a584016f88a5d44e8715904020721`（5 コミット / 99 files changed, 7314 insertions(+), 61 deletions(-)、`git rev-list --count` と `git diff --shortstat`、本節の実測）。

### 1. 新規コンポーネント — モジュール 0 / 責務 1

**新しいソースファイルは 1 件も追加されていない。** `git diff --name-status 23d4ae767..127be70c5 -- packages/ plugins/ docs/ .github/`（本節の実測、exit 0）の出力は **`M` 10 行のみ**で、`A` も `D` もゼロである。増えたのは既存モジュール内の責務であり、モジュール境界は動いていない。

| 責務 | 置き場（既存モジュール） | 種別 |
|---|---|---|
| Issue 証跡の取り込み（read-only CLI verb） | `packages/framework/core/tools/amadeus-utility.ts`（+337 −1） | 新 verb `issue-evidence fetch` |
| Issue コメントの read 面 | `packages/framework/core/tools/amadeus-github-gateway.ts`（+210 −33） | 3 つ目の adapter（`createEvidenceGitHubGatewayAdapter`） |
| record 内の証跡パス解決 / RE スキャン除外の定義 | `packages/framework/core/tools/amadeus-lib.ts`（+57 −0） | 純関数 2 + 定数 1 |

### 2. `amadeus-utility.ts` — 取り込み verb の内部構成

新 verb は既存の read-only 照会 arm（`codekb-path`）と同じ系統に置かれ、state / audit の遷移を持たない。

| 部品 | file:line（observed） | 役割 |
|---|---|---|
| `parseCrossReviewMarker` | `:6645` | コメント本文の `<!-- issue-cross-review … -->` marker を読み、独立レビュアーを数える |
| `renderIssueEvidence` | `:6893` | 取り込んだ Issue 本文とコメントを 1 つの markdown へ整形。`:6899` で `fetched-at` / `repo` / `tool` の provenance 行を刻む |
| `runIssueEvidenceFetch` | `:6824` | verb 本体。`fetch` 以外は `:6834` で拒否 |
| dispatch arm | `:6981` | `case "issue-evidence":` |
| usage | `:7045` | verb 名の列挙へ追加 |

**batch 性**: 複数 Issue を一度に取り込み、**全部または何も書かない**（契約散文 `stages/ideation/intent-capture.md` の逐語 `the whole batch or nothing`）。`gh` が不在・未認証・失敗のいずれでも非 0 終了で何も書かず、ステージは自由文へフォールバックする。

### 3. `amadeus-github-gateway.ts` — adapter が 2 種から 3 種へ

| adapter | file:line | 消費者 | 権限 |
|---|---|---|---|
| `createMirrorGitHubGatewayAdapter` | `:1058` | intent mirror | mutation permit あり |
| `createFindingGitHubGatewayAdapter` | `:1064` | finding | mutation permit あり |
| **`createEvidenceGitHubGatewayAdapter`** | **`:1089`** | **`issue-evidence fetch`** | **permit なし（read-only）** |

port 型 `EvidenceGitHubGateway`（`:1077`）は `readiness()` / `viewIssue()` / `listComments()` の 3 面だけを露出する。`viewIssue` は既存の combined gateway へ委譲し（`:1092` で合成、`:1095` で委譲）、`listComments` のみが新しい walk（`commentsArgv` `:189` + `parseIssueComments` `:550`）を持つ。

**gateway 内の非対称を 1 点記録する。** `listComments` の argv は `--include` を持たないため、この 1 経路だけ HTTP status を取得できず、失敗分類が exit code のみに依る（根拠と逐語は `api-documentation.md` の対応節）。gateway の他の read 面はすべて `--include` 経由で HTTP envelope を読む。

### 4. `amadeus-lib.ts` — 定数 1・純関数 2

| 部品 | file:line | 形 |
|---|---|---|
| `RE_SCAN_EXCLUDED_PATHSPECS` | `:1540` | `readonly string[]`（5 pathspec）。RE 差分スキャンの除外集合の**コード側で唯一の定義** |
| `issueEvidencePath` | `:5043` | `(projectDir, intent?, space?) => string \| null` |
| `relativeIssueEvidencePath` | `:5051` | 同上の posix 相対形 |

`RE_SCAN_EXCLUDED_PATHSPECS` は **stage 契約散文（`stages/inception/reverse-engineering.md` の Scan input exclusions 節）と対で 1 つの機構をなす**。契約散文が pathspec を逐語で載せ、コード側の定数がそれと同じ集合を持ち、drift test（`tests/integration/t2415-re-scan-exclusion-contract.integration.test.ts:96` / `:159`）が両者の一致を固定する。同テストは source 断面だけでなく**全 delivered tree** も検証する（`cid:requirements-analysis:c2-acceptance-at-delivery-tree` の実装）。

### 5. focus 2 件が触れる既存コンポーネント

**是正は本区間で着地していない**（`git grep -n "3106" 127be70c5 -- packages/ plugins/ tests/ docs/` → **exit 1**、`"2837"` は allowlist の sha256 内部文字列 2 hit のみ）。以下は現況の棚卸しであり、患部の確定ではない。

#### 5.1 #2837 — batch identity を保持しながら emit 境界で捨てるコンポーネント

```
amadeus-orchestrate.ts:3906  firstUncoveredBatch(batches, node, …)
     └─→ 戻り値 { units: string[]; batchNumber: number }（:3912 の型、:3929 の return）
             │
             ├─→ :4026  SwarmSelection.pick（batchNumber を保持したまま運ぶ）
             │
             └─→ :4294  emitConfiguredSwarm(projectDir, selection.value.pick.units)
                          └─→ :4074  function emitConfiguredSwarm(projectDir, units)
                                      ← 第2引数が units のみ。**batchNumber はここで消える**

  対称面（同じ engine が batch を運ぶ経路）:
    amadeus-orchestrate.ts:4092  preparedSwarmRetryDirective → prepared_batch / retry_unit
    amadeus-directive.ts:644-649  execute-failure-election → batch を必須フィールドとして搬送
    amadeus-orchestrate.ts:3889  batchGateQuestion(batch, units) → gate では 1-origin 番号を人へ開示
```

テキストフォールバック: `firstUncoveredBatch`（`:3906`）は `{units, batchNumber}` を返し、`:4294` の呼び出しが `pick.units` だけを渡すため、`emitConfiguredSwarm`（`:4074`、第2引数は `units: string[]`）に batch 番号は届かない。同じ engine は retry arm・failure election・gate 提示の 3 経路では batch identity を運んでいる。

**batch 値の下流での意味**: `packages/framework/core/tools/amadeus-swarm.ts:638` 逐語 `idempotencyKey: \`unit-pool:${flags.batch}:initial-enqueue\`` — batch 整数がそのまま durable な pool identity になる。`prepare` の既定 base はブランチ名（同 `:581` 逐語 `const base = flags.base ?? currentBranch(repoCwd);`）。

**conductor 面の census**（本節の実測、2 つの述語を書き分ける）:

| 述語 | claude | codex | kimi | kiro | kiro-ide | cursor | opencode | pi |
|---|---|---|---|---|---|---|---|---|
| `git grep -c -- "--batch <n>" 127be70c5 -- <face>`（手動で `<n>` を埋めることを要求する箇所） | 6 | 6 | 6 | 6 | 6 | 5 | 5 | **0** |
| `git grep -c -- "--batch" 127be70c5 -- <face>`（`--batch` の全出現） | 7 | 7 | 7 | 7 | 7 | 5 | 5 | 1 |

face の実体: claude / codex / kimi / kiro / kiro-ide は `packages/framework/harness/<h>/skills/amadeus/SKILL.md`、cursor / opencode は `packages/framework/harness/<h>/commands/amadeus.md`、pi は `packages/framework/harness/pi/skills/amadeus/SKILL.md`。**8 面中 7 面が `--batch <n>` の手動指定を要求する。** pi の唯一の hit（`:90`）は `acquire --batch <directive.prepared_batch>` で、これは directive が運ぶ値を渡す形であり手動指定ではない。

#### 5.2 #3106 — 同一監査ストリームを読む 2 つの読み口

```
監査ストリーム（record/audit/*.jsonl）
   │
   ├─→ 検出側  amadeus-orchestrate.ts:3934  cancelledConstructionUnits(projectDir, stage)
   │        └─→ canonical projection（amadeus-construction-outcome-projection.ts）
   │              → solo の BOLT_COMPLETED(Outcome: cancelled) を terminal として **見る**
   │
   └─→ 母集団側 amadeus-orchestrate.ts:2513  readPerUnitConsumePopulation(projectDir)
            ├─→ pool event set（実在する pool 行のみ）
            └─→ :2499 readSettledUnitOutcomes → :2508 で outcome を "succeeded" 一語に閉じる
                  → solo terminal を **見ない**

   発行側 amadeus-orchestrate.ts:4686  settlePerUnitOutcomes
        └─→ :4706  if (batch === undefined || cancelledUnits.has(unit)) continue;
              → cancelled unit は行を持たない

   下流   amadeus-per-unit-consume-fanout.ts:199  KNOWN_OUTCOMES（"cancelled" を含む）
        └─→ :224-228  pending 述語は「行が無い」ことだけを見る
```

テキストフォールバック: 同じ Unit が、検出側では「cancelled だから settle をスキップすべき」と判定され、母集団側では「outcome 行が無いから pending」と判定される。発行側（`:4706`）が cancelled を除外し、読み側（`:2508`）が `succeeded` 以外を拒否するため、cancelled 行はどこにも存在しない。下流の `KNOWN_OUTCOMES`（`:199`）は `cancelled` を正規値として既に受理するので、**行さえ届けば fail-closed は解ける**。

**solo skip arm の位置**（`:6767-6781`）: `handleFailureRuling`（`:6733`）の Skip 分岐は solo arm と pool arm（`:6783-6785`）に分かれ、solo arm は `BOLT_COMPLETED`（`Outcome: "cancelled"` / `Reason: "skipped"`）を 1 行書くだけで **pool を経由しない**。pool arm は `pool.skipFailedUnit` を呼ぶ。この分岐が非対称の発生点である。

**是正時に同じ関数を触る隣接面**: `settlePerUnitOutcomes` のスキップ条件は 3 つ（`:4706` の `batch === undefined`、同行の `cancelledUnits.has(unit)`、`:4707-4709` の `!unitCovered`）に加えて `:4711` の `appended.has(key)` 冪等ガードがある。batch identity が解決できない Unit も同じく pending 源になりうる点は、本 focus の範囲外だが同一関数の棚卸し対象である。

## 区間のコンポーネント増減と、focus 4 件が触れる既存コンポーネント（260820-fmc-drift-batch、現在、observed `e86fbe125`）

**観測 ref**: base `c8c393bba` → observed `e86fbe125`（97 commits）。

### 1. 新規コンポーネント 4 / 撤去 4 / 移設 1

| 種別 | コンポーネント | 所在 | 役割 |
|---|---|---|---|
| 新規 | **Mirror orphan repair CLI** | `packages/framework/core/tools/amadeus-mirror-orphan.ts`（+377） | 孤児化した Intent Mirror Issue の診断・修復（#3271） |
| 新規 | **Release land orchestrator** | `scripts/release-land.ts`（+306） | `workflow_dispatch` からのリリース着地。副作用層 |
| 新規 | **Release land domain** | `scripts/release-land-domain.ts`（+219） | 同ドメインの純ロジック層。テストはこちらだけを import する |
| 新規 | **Silent-success gate library** | `tests/lib/silent-success.ts` | アサーション 0 件 / 恒常 SKIP / プロセスリークの判定を純関数として提供（#1982） |
| 撤去 | ローカルランナースクリプト | `scripts/run-claude.sh` / `scripts/run-codex.sh` | #3299 |
| 撤去 | release-it 設定 | `packages/setup/.release-it.json` | 自前ドメインへの置換 |
| 移設 | advisory model-check ヘルパ | `plugins/formal-model-check/tools/` → **`tests/lib/advisory-model-check.ts`**（R094） | #3078 — plugin `tools[]` の宣言と実ファイルの一致を blocking 化したため |

### 2. 既存コンポーネントの規模変化（上位 10、`git diff --numstat`）

| コンポーネント | +/− | 主な由来 |
|---|---|---|
| `amadeus-swarm.ts` | +347 −52 | #3197（finalize の source 統合）、#2837 |
| `amadeus-worktree.ts` | +299 −5 | #3197 |
| `amadeus-election-store.ts` | +268 −83 | #3256（terminate）、#3225（per-voter lock）、#3183（per-process staging 名） |
| `pr-convergence-cli.ts` | +237 −16 | #3239 / #3270（supersede クロージャ）、#3265（landed 受理） |
| `amadeus-orchestrate.ts` | +203 −40 | #3267、#3194、#3268、#2837、#3106 |
| `amadeus-migrate.ts` | +119 −22 | #3151（短い git tool-index 読み取りの再読） |
| `amadeus-election.ts` | +94 −4 | #3256（terminate verb） |
| `amadeus-state.ts` | +94 −13 | #3267、#3106 |
| `amadeus-sensor-pr-convergence-report-format.ts` | +76 −13 | #3265 |
| `amadeus-formal-verif-model-map.ts` | **+69 −3** | **#3263（`authoringProvenance` の optional キー宣言）** |

**model-map の実装ハッシュピンが 6 件再 resync された**（`amadeus/spaces/default/specs/tla/model-map.json` +14 −6）: `amadeus-orchestrate.ts` ×2（PrConvergenceGate / BoltPrAttestationGate）、`amadeus-state.ts` ×2（同）、`amadeus-election.ts` / `amadeus-election-store.ts` 各 1（FormalElection）。加えて **BoltPrAttestationGate に `authoringProvenance` が追加**され、新規 tla-evidence 1 件（`f258519902a8a014….json`）が入った。

### 3. formal-model-check plugin の現行構成（observed 実測）

`plugins/formal-model-check/plugin.json` を `bun -e` で直読:

| 面 | 値 |
|---|---|
| stages | **2**（`formal-model-check` / `tla-authoring`） |
| sensors | **1**（`sensors/amadeus-model-completeness.md`） |
| tools | **35**（明示宣言。t3078 が git-tracked ファイル集合との一致を blocking 検査） |
| advisories | **2**（`spec-change` / `authoring-hold`。両者とも checkpoints は `requirements-analysis` / `functional-design` / `build-and-test`、handoff は `formal-model-check`） |

**`authoring-hold` の evaluator は `bun tools/tla-authoring.ts advisory hold`、`spec-change` は `bun tools/plugin-activation.ts advisory {host-root} {stage}`** — 別ツールであり、#3187 の退役は `advisories[]` から前者のエントリだけを外す形になる。

### 4. model-map の登録内容（observed 実測）

schemaVersion 2、**4 モデル / 13 entries**、全 entries が `packages/framework/core/tools/` 配下（plugin 配下 0 件）。

| モデル | entries | vocabulary（namedInvariants / traceStateVariables） | sensor glob で自動発火するか | `authoringProvenance` |
|---|---|---|---|---|
| FormalElection | 5 | 7 / 5 | **する**（`amadeus-election*.ts`） | ABSENT |
| MirrorLifecycle | 4 | 3 / 3 | **する**（`amadeus-mirror-*.ts`） | ABSENT |
| PrConvergenceGate | 2 | 5 / 8 | **しない**（pin が `amadeus-orchestrate.ts` / `amadeus-state.ts`） | ABSENT |
| BoltPrAttestationGate | 2 | 11 / 21 | **しない**（同上） | **PRESENT**（本区間で追加） |

**自動発火は 9/13 entries**。本区間はまさに自動発火しない 4 entries のうち 4 件のハッシュを手動 resync しており、被覆の非対称が実運用で現れている（#2929 の第三面）。

### 5. focus 4 件が触れる既存コンポーネント

| Issue | 触れるコンポーネント | 交差の有無 |
|---|---|---|
| #3186 | `tla-applicability.ts`（判定器）、`stages/tla-authoring.md`（stage 契約）、`model-map.json`（読取のみ） | **#2289 と `tla-applicability.ts` で交差**（`AUTHORING_ROUTES` の定義・消費） |
| #2289 | `tla-registration.ts`、`amadeus-formal-verif-model-map.ts`、`tla-authoring.ts`（本番経路）、`tests/unit/t448-tla-registration.test.ts` | **#2929 と `amadeus-formal-verif-model-map.ts` で交差**、**#3187 と `tla-authoring.ts` で交差** |
| #2929 | `amadeus-formal-verif-model-map.ts`、`tla-model-loader-internal.ts`、`sensors/amadeus-model-completeness.md`、`run-model-check-artifacts.ts` | **#2289 と `amadeus-formal-verif-model-map.ts` で交差** |
| #3187 | `tla-authoring.ts`、`plugin.json`、`stages/tla-authoring.md`、`docs/reference/22-formal-model-supply.{md,ja.md}`、テスト 9 面 | **#2289 と `tla-authoring.ts` で交差**、**#3186 と `stages/tla-authoring.md` で交差** |

**4 件は独立ではない。** 交差する共有ファイルは `tla-authoring.ts`（#2289 × #3187）、`amadeus-formal-verif-model-map.ts`（#2289 × #2929）、`tla-applicability.ts`（#3186 × #2289）、`stages/tla-authoring.md`（#3186 × #3187）の 4 面である。`memory/team.md` § Issue 運用の「同一ファイル・進行中 PR との交差は直列化する」が該当し、並行実装するなら write scope の割当を交差面で切る設計が要る。**あわせて `memory/project.md` の `cid:units-generation:c1`（Issue 起点は 1 Issue = 1 Unit）と `cid:code-generation:oq-singleton`（degrade スコープの Delivery Bolt authority は unit ディレクトリちょうど 1 つを要求）の両方が効くため、4 Issue を 1 つの degrade intent へ載せる構成は構造的に成立しない。**
