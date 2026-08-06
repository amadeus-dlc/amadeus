# コンポーネント棚卸し

## cross-harness resume の対象コンポーネント（260805-cross-harness-resume、現在、observed `7060956c5`）

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

## subagent 観測パイプラインの対象コンポーネント（260805-subagent-type-guard、現在、observed `7060956c5`）

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
## semi 再定義と autonomy 起動宣言の対象コンポーネント（260805-semi-redefine-autonomy-f、現在、observed `2f255bc69`）

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

## docs/harness 修理コンポーネント(intent 260711-docs-repair-batch9、フォーカス5欠陥)

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
