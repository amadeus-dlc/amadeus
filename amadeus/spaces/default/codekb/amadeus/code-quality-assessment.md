# コード品質評価

> **現在の品質観測は intent `260723-marker-heading-exemption`(2026-07-23、bugfix / Minimal、下記「marker 成果物への required-sections floor 誤適用」節)**。以下の過去 intent 節に残る「本 intent」「最新」「現在」は各見出しで明示した履歴 intent を指し、今回 intent の current marker ではない。

## marker 成果物への required-sections floor 誤適用（260723-marker-heading-exemption、現在、Issue #1296）

実測基準は base `a81c11dde83e0059c48ecc912d2d22dd6bca60eb`(直近 freshness pointer の observed)、observed HEAD `ffc79aad9a53c600ea9b464f1f04c6fa627ae59e`、祖先性 exit 0、距離13。差分 96 files のうち本バグ交差面は**ゼロ** — 非 record 差分(`scripts/team-up.sh` +163 ほか、51 files)は required-sections センサー正本・`amadeus-graph.ts` の弁別関数・sensors manifest・stage marker 宣言のいずれとも無交差(測定 ref: `git diff --shortstat/--stat a81c11dde..HEAD`)。よって欠陥は base より前から現存し observed に不変で貫通。

### 確定欠陥 — 汎用 ≥2-H2 floor の marker への無条件適用（S3 相当、#1296）

- `packages/framework/core/tools/amadeus-sensor-required-sections.ts:141` `let pass = h2_count >= 2;`(`:147` `findings_count = Math.max(0, 2 - h2_count)`)が**全成果物へ無条件適用**される。単一行 timestamp / [Answer] 様式 questions のような「意図的に H2 を欠く」marker を floor から免除する分岐が**不在**。
- **偽 FAIL の機序**: marker は H2=0 → `pass:false`, `findings_count:2`。read-only 再現で timestamp marker `{"pass":false,"h2_count":0,"headings":[],"findings_count":2}`、questions marker も同一 floor FAIL を確認(exit code は常に 0、verdict は JSON フィールド)。
- **ELIGIBILITY GATE は不十分**: `:167-186`(stem 判別 `:173` `basename(outputPath).replace(/\.md$/, "")`)は marker に heading-set template を当てないだけで floor は維持する(`:184-185` verbatim `keeping the generic >=2-H2 floor.`)。GA では template は普通 miss するため marker は常に floor で FAIL。
- **manifest 記述も現行仕様を明記**: `packages/framework/core/sensors/amadeus-required-sections.md:52-53` verbatim `a template resolving for a questions/timestamp marker is ignored with a config warning, and the marker keeps the generic floor.` — 免除実装時は同一 PR で更新対象。

### 再利用候補（欠けている免除述語の既存実装）

- `packages/framework/core/tools/amadeus-graph.ts:801-808` `templateEligibleArtifacts` が既に artifact 名 suffix で marker を弁別(`!a.endsWith("-questions")` / `!a.endsWith("-timestamp")`)。artifact 名 X ↔ 出力 stem X 規約により、センサー側 `stem.endsWith("-timestamp"||"-questions")` はこの関数の否定と一致 = floor 免除へそのまま再利用可能。現状 suffix チェックは graph 側にインライン1箇所のみ(canonical `isMarkerArtifact` 抽出で2定義ドリフト回避が設計選択肢)。

### 既決ノルムとの乖離（原因の所在 = 実装、cid:bug-intent-linkage）

- team 規範 `cid:practices-discovery:e-fvepd-marker-heading-floor`(learned 2026-07-20)は「approval 前に H2 を意図的に欠く `*-timestamp.md` / `*-questions.md` を prose-heading floor から明示的に免除する」と**既に規定**している。#1296 は規範が要求する免除がセンサー実装に未反映という乖離であり、修正は文書化済み仕様への回復(バグ修正)であって仕様変更ではない。

### テスト・回帰ガード

- 既存 `tests/unit/t155-template-override.test.ts` は `:130` で marker 弁別、`:251`/`:267` で floor pass:false を prose 入力(`requirements`)で固定。免除の落ちる実証は「marker stem → pass:true」の新テストを integration 層(実 FS、cid:fs-tests-integration-first)へ足し、既存 floor テストの prose 入力を保つ。corpus sweep 対象は `intents/` 配下 `*-questions.md` 391件 / `*-timestamp.md` 22件(免除後に floor 免除で pass:true になる想定、cid:corpus-sweep-for-new-guards / injection-surface-verify)。`codekb/` 配下 timestamp 1件は manifest filter(`:8` `**/{amadeus-docs,intents}/**`)非適合で元々非発火のため免除の対象外(免除は filter を変えない)。

> 以下は過去 intent の履歴。

## t241 の CI-resident 表明と実行実態の乖離（260723-t241-ci-residency）

差分リフレッシュ（base `a81c11dde` → observed `78bce876`、距離 35、bugfix / Minimal）。**本バグ面は base..HEAD で無変更**（`git diff --numstat <base>..HEAD -- tests/e2e tests/run-tests.ts .github/workflows package.json` = 0 行）で、欠陥は intent `260718-election-ts-foundation`（PR #1235）由来、本区間 35 コミットとは無交差（測定 ref: scan-notes @ observed HEAD `78bce876`）。

- **品質欠陥クラス = 検証劇場に隣接する「表明と実行実態の乖離」**: `tests/e2e/t241-election-machine-executor.test.ts` はヘッダ（:1）で「CI-resident」、本文（:4-5）で「strongest standing proof of FR-0」を主張するが、`tests/e2e/` 配置ゆえ自動 CI（`--ci` = smoke+unit+integration、`run-tests.ts:197-202`）では一度も実行されない。FR-0 の「常設保証」が実行実態で担保されていない偽の安心を生む（team.md の検証劇場 Forbidden と同族の弱い形）。
- **原因所在 = 実装逸脱**（cid:bug-intent-linkage）: ADR-6（`application-design/decisions.md:41-48`）は layer (i) 機械実行器を「integration テストで固定する」と明記。設計は正しく integration を指定していたが、実装（#1235）が `tests/e2e/` に配置し、CI 実行範囲との整合検証（--ci に e2e 非含有）を欠いた。
- **対照の健全例**: sibling `t237`（:1-5）は「Layer: e2e」と正直宣言し CI-resident を自称しない（e2e walking-skeleton の正配置）。t241 単独の主張過剰。
- **回復可能性が高い**: integration に election CLI spawn 兄弟が 6 本既存（t235/t236/t240/t242/t244 + t-formal-verif-arm-s-blind、`grep -rln` = 6）で `--ci` により CI 実行済み。t241 は spawnSync+fs → `classifyTestSize`=medium で integration MAX=medium に適合（size purity clean）、`gen-coverage-registry.ts` 未登録のため registry 影響も小。移設は ADR-6 本来配置への回復で新規機構不要。

## team 起動 watcher-arming の品質観測（履歴: 260722-teamup-prompt-race）

実測基準は base `a326f47bc0146a3b4285552f42b92fd61fb343a7`、observed `a81c11dde83e0059c48ecc912d2d22dd6bca60eb`、祖先性 exit 0、距離101。差分 2593 files のうち本バグ交差面は `scripts/team-up.sh`（+212 −8）と付随テストのみ（測定 ref: `git diff --shortstat/--name-only a326f47..HEAD`）。

### 欠陥形状（一発勝負 = 検証・リトライ欠如）

- `scripts/team-up.sh:800` `claude_member_cmd()` が init_prompt `/agmsg mode monitor` を固定し、`:830-832` で `run-claude.sh` の位置引数へ組立（quoting は `%q` で正常）。`run-claude.sh` 末尾 `exec claude --dangerously-skip-permissions "$@"` → claude 初期プロンプトとして**一度だけ**渡り、TUI 起動レースで取りこぼされても再送・検証がない。
- pane 起動 `:429`/`:447` は `herdr pane run` で cmd を一度 exec するのみ。
- `start_safety_wait_supervisors()`（`:338-395`）は `:340` `[ "$RUNTIME" = "codex" ] || return 0`（verbatim）で claude では即 return → claude runtime に起動後 readiness 検証が構造的に不在。

### 対照実装（欠けている契約）

agmsg `spawn.sh:576-588`（repo 外 read-only）は ready センチネル出現までブロックし `status=ready` を出力（default `--ready-timeout` 90s `:46-47`）。センチネルは `agmsg_ready_path`（`lib/actas-lock.sh:69-73`）が team+role でキーし、`watch.sh:294-310` が DB 可読性検査後に touch する。team-up.sh の claude 経路はこの handshake 相当を欠く。

### テスト・回帰ガード

- **watcher arming の回帰テストはゼロ**。既存 team-up テスト（`tests/integration/t-team-up-msg-backend.test.ts` 他）は init_prompt / `agmsg mode monitor` / ready / watch を一切参照しない（`grep -c` = 0）。修正時に落ちる実証（初期プロンプト取りこぼし→watcher 未起動の検出）を新設する必要がある（fs/herdr 実使用は integration 層、fs-tests-integration-first 準拠）。

### 原因の所在（cid:bug-intent-linkage）

**設計（一般化漏れ）**: 直近 intent `260721-teamup-safety-wait` が起動後の pane readiness 検証を Codex 専用に新設（`team-up.sh:212-395`,`:1259` + `team-up-codex-safety-wait.ts` +567）したが、claude 経路へ一般化しなかった。既存の Codex 検証構造は claude 版検証の再利用先例（`resolve` の `agent === "codex"` フィルタは拡張要）。

> 以下は過去 intent の履歴。

## upstream v2.3.0 同期の品質評価（履歴: 260720-upstream-sync-230）

実測基準は base `a326f47bc0146a3b4285552f42b92fd61fb343a7`、observed `545e69c836d46f7bec2fa351c8e668026eb5fad5`、祖先性 exit 0、距離32。差分は865 files、`+48,636/-241` だが、大半は選挙 record、生成投影、工程記録であり、24項目の実装済み根拠として数えていない。次点 observed `591b6a2a` は距離84、他の日付が新しい observed は非祖先（exit 1）のため base 候補から除外した。

### 24項目の品質サマリ

| 判定 | 件数 | 識別子 |
|---|---:|---|
| MISSING | 19 | 1,4-9,11-13,15-23 |
| PARTIAL | 4 | 2 gate-revision-backstop、10 gate-next-stage-naming、14 kiro-ide-hook-context、24 docs-updates |
| EQUIVALENT 候補 | 1 | 3 swarm-batch-advance |

EQUIVALENT 候補は、`amadeus-orchestrate.ts:1961-1972` の全 batch 走査と `amadeus-swarm.ts:724-769` の merge failure 降格を upstream 契約と対応させた結果である。後続 requirements で回帰テストによる確証後、実装項目から外す候補とする。PARTIAL は内部情報・一部 adapter・一般 docs があるだけで、公開契約の完了は意味しない。

### テスト・ドリフトガード

- Tests: 461 files（unit 216 / integration 159 / e2e 70 / smoke 14）。upstream t199-t219/t188 相当は未移植。
- `bun scripts/package.ts --check`: exit 0、6/6 harness PASS。
- `bun scripts/promote-self.ts --check --no-build`: exit 0。
- `bun run lint:check`: exit 0、593 files、208 warnings、16 infos。
- `bun run typecheck`: exit 127（`tsc` 不在）。型品質の green 根拠にはしない。
- Full tests: RE では未実施。Construction の完了判定に流用しない。

### 保守性リスク

巨大ファイルは `amadeus-lib.ts` 6,070行、`amadeus-utility.ts` 4,281行、`amadeus-migrate.ts` 3,823行、`amadeus-state.ts` 3,562行、`amadeus-orchestrate.ts` 3,215行。認知複雑度の高い例は stop 145（`:520`）、swarm 54（`:601`）、stage-schema 49（`:136`）。今回は新しい共通 abstraction を先に作らず、schema、packager、host adapter の既存チョークポイントに最小変更を置く。plugin は最大 block で、non-active の byte-identical、no-clobber、6面 projection を同時に検証しなければならない。

> 以下は過去 intent の履歴。

## hooks-config-conflict の観測面 — tracked canonical と runtime writer の所有権衝突（2026-07-18、履歴、Issue #770）

現行コード基準 observed HEAD `594ba21d636218558b711b371c286f16731fb081`、base `e9a001105d253e14affb77417423d9f0b0360f9e`（祖先・距離8）からの diff-refresh。フォーカス契約は区間で変更0件であり、[Issue #770](https://github.com/amadeus-dlc/amadeus/issues/770) の再発は既存 repository 契約と外部 agmsg 1.1.7 writer の組合せが Codex 再導入で再顕在化したもの。

### 確定 finding

- HEAD の `.codex/hooks.json`、`.codex/hooks.json.example`、dist example は同一 blob（1925 bytes／93 lines）。一方、現 worktree の active file は2021 bytes／改行0、`1 insertion / 93 deletions` で、agmsg monitor の SessionStart／SessionEnd各1件と machine／clone絶対 path を持つ。
- agmsg 所有 entry を除外した意味比較では、Amadeus の9 command と PostToolUse matcher は全て保持される。故障は hook 破壊ではなく、正常な runtime state が tracked canonical に書かれる所有権衝突である。
- `delivery.sh` は既存 agmsg group を strip してから再追加するため entry 重複は防ぐが、SQLite JSON1 の compact rewrite と絶対 path 追加により tracked bytes は不変にならない。pretty-print だけでは受入条件を満たさない。
- `codex-monitor.sh:194` と `scripts/team-up.sh:742-748` が monitor 設定を再適用するため、手動復元や `set off` は次の monitor 起動で再発する。
- [PR #783](https://github.com/amadeus-dlc/amadeus/pull/783) は marker の ignore／preserveだけを解決済み。現行 agmsg 1.1.7 は marker を読まず書かず、hooks自体が mode source of truth である。

### 回帰テストの空白と完了条件

既存 `t150` は example の event／matcher、trust path、dist driftを、team-up integration は delivery呼出しを検証するが、fake delivery は active fileを書き換えない。次の回帰が欠落している。

1. disposable Git fixtureで monitor登録前後の tracked bytes と `git status --porcelain` が不変。
2. Amadeus 9 command／3 PostToolUse matcherを維持し、agmsg mode再設定で重複しない。
3. tracked contentに skill／clone／userの絶対 pathがない。
4. monitor→off→turn→monitor と Codex再起動後のbridge deliveryが成立する。
5. `dist:check`／`promote:self:check`／trust seedを維持し、既存 dirty active fileを安全に移行する。

恒久案A（active hooksのuntrack／ignore）と案B（tracked static dispatcher + ignored sidecar）は `【裁定待ち】`。実装PRは裁定後、上記fixtureを先に赤化し、diff追加行未カバー0を満たす必要がある。

## state-mirror-fixes の観測面 — set-status 無ロック RMW と countStageProgress SKIP 分母(2026-07-18、履歴、#1170 #1172)

現行コード基準 observed HEAD `591b6a2a222357f41061128f1b5a93c7f7a877be`(`git rev-parse HEAD` 実測、worktree = `origin/main` 一致)、base `6495e03a12d9e7149c2e80b59f171a90607a2d2c`(全 `re-scans/*.md` observed のうち HEAD 祖先・距離最小=126、cid:reverse-engineering:rescan-base-ancestry)からの diff-refresh。base/observed 決定過程と現物照合の真実源は本 intent の `inception/reverse-engineering/scan-notes.md` および `re-scans/260717-state-mirror-fixes.md`。件数・行番号は observed HEAD の実ファイル直読(cid:measurement-ref-in-artifacts)。Focus seam(set-status の無ロック RMW と state ロック機構)は区間126コミットで実質不変であり、確定した2欠陥は base より前から現存(#1170、pre-existing)または #1169 で新規導入(#1172)。

### 確定欠陥1 — set-status の無ロック read-modify-write(#1170、S2 相当・pre-existing)

- `handleSetStatus`(`packages/framework/core/tools/amadeus-utility.ts:3666-3690`)は `withAuditLock` を取らない無防備な RMW。`:3679` で state をスナップショット読み(S0)→ setField×6(Lifecycle Phase / Current Stage / Active Agent / In Progress / Status / Last Updated)+ `:3686` `setCheckbox(content, stage, "in-progress")` で `[-]` 化 → `:3687` `writeStateFile` で S0 ベースの全文上書き。関数内に `withAuditLock`/`acquireAuditLock` 呼び出しは皆無(関数内 grep 0)。
- **唯一の非エンジン state.md 内容ライター**: state.md へ内容を書く hook は `.claude/hooks/amadeus-sync-statusline.ts:69-73` の `Bun.spawnSync(["bun", toolPath, "set-status", …])` のみ(11 hook 全数 grep で他10 hook は read・breadcrumb・heartbeat のみ)。TaskUpdate→in_progress ごとに発火(`:44` status ガード、`:50` activeForm `[slug]` 抽出)し、per-unit Construction では各 stage の TaskUpdate ごとに engine report/advance と競合する。
- **対照(エンジン側は保護済み)**: `amadeus-state.ts` の全 RMW ハンドラ(`handleSet:500`、`handleAdvance:1223`、`handleFinalize:1454`、`handleCompleteWorkflow:1573` 等)は `withAuditLock`(`:251-266`)保護下。set-status だけがロックドメイン外にある片側非対称(cid:requirements-analysis:symmetric-pair-review の RMW ロック面)。
- **自己記述コメントが未保護を明言**: `writeStateFile`(`amadeus-lib.ts:3562-3583`)のコメント(`:3578-3581`)— atomic rename は torn-write 防止のみで「Lost-update safety … is a SEPARATE, larger change tracked as a follow-up」。
- **race 機序**: `B.read(S0) → A(エンジン).lock/write(S1) → B.write(S0')` で A の進行が古いスナップショット由来書込に上書きされ、checkbox `[-]` と Current Stage が巻き戻る。`handleSetStatus` は audit を一切 emit しない → 巻き戻りは state.md のみで audit は健全 = **Issue #1170 の症状(audit 健全・state 巻き戻り)と完全一致**。set-status は intent フラグなし(`:3667` `stateFilePath(projectDir)`)で active intent に解決するため、並行 builder/サブエージェントの set-status 同士も相互 lost-update する。

### 確定欠陥2 — countStageProgress の SKIP 語彙取りこぼし(#1172、#1169 で新規導入)

- `scripts/amadeus-mirror.ts:87-105` の `countStageProgress` は分母除外の唯一条件が checkbox `[S]`(`:100` `if (m[1] === "S") continue;`)。
- **実様式との乖離(format-currency-grep 実測、cid:reverse-engineering:format-currency-grep-for-parser-intents)**: scope-SKIP の現行様式は `- [ ] <stage> — SKIP`(空 checkbox + 行末サフィックス)で、`[S]` checkbox ではない。全 state 横断集計: `[ ] — SKIP` **717件** / `[ ] — EXECUTE` 70件 / `[x] — EXECUTE` 414件 に対し、`grep -rn '^- \[S\]' amadeus/spaces/default/intents/*/amadeus-state.md` = **0件**(`[S]` は実コーパスに1件も存在しない runtime jump marker)。
- 結果、scope-SKIP 行が `total++` に混入。260717-mirror-issue-tool の実データ(EXECUTE 18 / SKIP 14 / 全32行)で `countStageProgress` は 18/32 を返す(期待 18/18)— 症状再現確定。
- **根本原因**: checkbox(実行状態、`setCheckbox` `amadeus-lib.ts:3785`)と suffix(計画、`setStageSuffix:3805`、コメント `:3799-3803`「setCheckbox owns the marker (run-state); this owns the suffix (the plan)」)は直交2フィールドだが、`countStageProgress` は checkbox だけ見て計画サフィックスを無視した。信頼できる分母信号は行末 `— EXECUTE`/`— SKIP`(計画)。

### テスト空白(2件)

- **t232 偽 green fixture**: `tests/unit/t232-amadeus-mirror.test.ts:72` の fixture が実在しない `[S]` 様式(`- [S] market-research — SKIP`)を捏造し `:82` で green。実様式 `[ ] X — SKIP` を fixture に含めていれば赤くなった(format-currency-grep-for-parser-intents 違反の典型)。修正 PR は実 state 由来 fixture を追加すべき。
- **t145 の set-status 未カバー**: `tests/integration/t145-state-lock-concurrency.test.ts` はエンジンハンドラ(`set`/`reject`/`approve`/`skip` 等 `:26-27`)の C2b lost-update のみ対象。`set-status` はテスト本体ヒット 0(`grep -rln 'set-status' tests/`)→ #1170 の実欠陥経路(hook 書込)は concurrency 未カバー。

### 品質機構への含意

- 本バッチは2欠陥とも「片側だけ実装された非対称」+「実様式を含まない fixture の偽 green」という既知の再発クラスタ(cid:requirements-analysis:symmetric-pair-review / cid:reverse-engineering:format-currency-grep-for-parser-intents)。修正 intent は bugfix posture でリグレッションを第一級成果物とし、#1172 は実 state 由来 fixture の 18/18 assert、#1170 は set-status の `withAuditLock` 参加 + set-status ∥ advance の並列 spawn テスト(t145 様式拡張)を追加すべき。

## swarm driver 契約の品質評価（2026-07-13、履歴 intent 260713-swarm-driver-migration）

### 現在確認できる強み

- engine eligibility は autonomy、runtime graph、stage mode、walking-skeleton、成果物 coverage から決定される。#841 の「完了した batch 1 を再提示し続ける」欠陥は、`amadeus-orchestrate.ts:1792-1811` の最初の未完了 batch 選択で解消済みである。
- referee は `prepare`／`check`／`finalize` を分離し、protected file の改竄、lying conductor、merge failure、baton return を real process／worktree で検証する既存 e2e を持つ。
- packaging は `dist/<name>/` 全域の orphan scan（`scripts/package.ts:692-709`）と harness source-side unreferenced scan（`:711-725`）を持つ。過去の #701／#735 finding は解消済みである。
- canonical source→6 harness `dist` の byte drift と、Claude／Codex／Cursor／OpenCode self-install drift を決定的に検査する既存 gate がある。
- Codex exec journey、Kiro ACP tool trace、Claude live journey という opt-in transport seam があり、live proof の土台を再利用できる。

### 未解決 finding

| ID | Finding | 影響 | 必要な検証 |
| --- | --- | --- | --- |
| SD-01 | `AMADEUS_SWARM_DRIVER` の製品実装0件 | 公開5値と既定 `auto` を解決できない | 有効値、不正値、harness mismatch、旧変数、設定競合の全 selector matrix |
| SD-02 | driver 選択が harness skill prose に分散 | 同一入力から同一選択を機械保証できない | topology／capability 入力だけから決まる pure selector の unit test |
| SD-03 | native capability probe がない | 明示 driver の保証と `auto` fallback の根拠を作れない | available／unavailable／malformed evidence、worker 起動前 hard error の integration test |
| SD-04 | `invoke-swarm` が driver-neutral、監査は旧 degrade 2値のみ | requested／selected／reason／native evidence を再現できない | 全 swarm event の payload／correlation と secrets 非記録の audit test |
| SD-05 | live AI worker を既存 swarm test が起動しない | driver 名や flag だけの偽対応を検出できない | 4 driver それぞれ2 Unit以上の native event／trace＋referee convergence |
| SD-06 | Claude／Codex／Kiro の実行面が同一 subprocess 形ではない | 共通 dispatcher へ過剰抽象化すると live tool 境界を壊す | harness adapter 単位の command／env／cwd／stdin／trust 契約テスト |
| SD-07 | `scripts/package.ts`／`amadeus-swarm.ts` 冒頭コメントに古い harness／旧変数前提が残る | 保守者が正本境界を誤解する | 実装時の正本コメント、docs、全 dist、self-install 同期確認 |

### 完了判定上の stop-gate

明示 driver が利用不能な場合に別方式で成功扱いした時点、または Agent Teams／Ultra Code／Codex Ultra／Kiro subagent のいずれかで2 Unit以上の native 証跡を機械判定できない時点で、この intent は完了扱いにできない。CLI flag／環境変数の受理、worker の自己申告、referee の convergence だけでは native driver 利用の証明にならない。

### 既存 finding の訂正

| 過去 finding | 2026-07-13 の現状 |
| --- | --- |
| #841 完了 batch 再提示 | 解決済み。未完了 batch の成果物 coverage 選択が実装済み |
| #735 source-side unreferenced 不在 | 解決済み。`readSources` と harness source tree の差集合を検査 |
| #701 dist root orphan blind spot | 解決済み。`dist/<name>/` の whole-tree scan を実装 |

過去節は欠陥発見時の分析根拠として温存するが、上表の3件を現存問題として後続要件へ持ち込まない。

> 「docs-batch10(2026-07-12)の観測面」節は履歴 intent `260711-docs-batch10`(#765 #764 #763 #728、documentation)の候補記録。続く p3-cleanup-batch8 節(#843 #846 #850 #851 #876 #877 #878、intent `260711-p3-cleanup-batch8`)・p2-repair-batch7 節(#834 #839 #844 #845 #849、intent `260711-p2-repair-batch7`)・p3-cleanup-batch5 節(#811 #822 #830 #730 #819 #831、intent `260710-p3-cleanup-batch5`)・p3-cleanup-batch4 節(#757 #758 #753 #739 #740 #784 — 全6件 2026-07-10 修正着地済み、PR #823/#821/#817/#818/#814/#815)・core-repair-batch3 節(#746 ほか9件、2026-07-11)・複雑度ゲート導入節(intent 260710-complexity-gate)・ tools-dispatch-batch 節(#774 / #785 / #787 / #788 / #789)・ bughunt-fix-batch 節(#771/#773/#775/#776/#779)・swarm-worktree-batch 節(#738/#748/#746/#760)・learnings-audit-batch 節(#754 / #745 / #761)・mint-presence-vectors 節(#755)・packaging source-unreferenced 節(intent 260710、#735)・delegate-answer-consume 節(intent 260710、#736)・kiro-stale-hooks 節(#719 / P3 source hygiene)・dynamic-test-size 節(#699 / #684 Phase D)・t92-worktree-hermeticity 節(#709)・packaging-repair-batch 節(#701/#702 = PR #711/#712 解決済み)は過去 intent の記録で、参照用に温存する。以降の「アーキテクチャ横断パターン」以下は `260709-bug-zero-batch`(#674〜#678/#668)の記録。
> 「docs-repair-batch9(2026-07-11)の観測面」節は履歴 intent `260711-docs-repair-batch9`(#812 #824 #680 #885 #886)の記録。続く p3-cleanup-batch5 節(#811 #822 #830 #730 #819 #831 — 候補記録)・p3-cleanup-batch4 節(#757 #758 #753 #739 #740 #784 — 全6件 2026-07-10 修正着地済み、PR #823/#821/#817/#818/#814/#815)・core-repair-batch3 節(#746 ほか9件、2026-07-11)・複雑度ゲート導入節(intent 260710-complexity-gate)・ tools-dispatch-batch 節(#774 / #785 / #787 / #788 / #789)・ bughunt-fix-batch 節(#771/#773/#775/#776/#779)・swarm-worktree-batch 節(#738/#748/#746/#760)・learnings-audit-batch 節(#754 / #745 / #761)・mint-presence-vectors 節(#755)・packaging source-unreferenced 節(intent 260710、#735)・delegate-answer-consume 節(intent 260710、#736)・kiro-stale-hooks 節(#719 / P3 source hygiene)・dynamic-test-size 節(#699 / #684 Phase D)・t92-worktree-hermeticity 節(#709)・packaging-repair-batch 節(#701/#702 = PR #711/#712 解決済み)は前 intent の記録で、参照用に温存する。以降の「アーキテクチャ横断パターン」以下は `260709-bug-zero-batch`(#674〜#678/#668)の記録。
>
> **履歴ラベルの読み方**: 本ページ以下および `architecture.md` / `business-overview.md` / `api-documentation.md` の「本 intent」は、各節見出しで明示した過去 intent 内の自己参照である。各ファイルの current view は先頭の `260720-upstream-sync-230` 節だけであり、それより下は履歴として読む。

## docs-batch10(2026-07-12)の観測面 — documentation 4欠陥の現物照合(#765 #764 #763 #728)

現行コード基準 observed `d6375bba68f415ce1a31e9a4d70e07fbfe80be85`(HEAD)、base `60f5e1edf472517c5fc2b4a1c388dd9a5030446c`(前回 intent `260711-p3-cleanup-batch8` の observed、HEAD 祖先の最新・距離64)からの diff-refresh。base/observed 決定過程と現物照合の真実源は本 intent の `inception/reverse-engineering/scan-notes.md`。本バッチは restart-loss ではなく起票時からの docs ギャップ(および tests の stale コメント)であり、区間 `base..observed` diff に4欠陥トークン(`set-skeleton-stance` / `--new-intent` / `18-workspace-layout` / `assertNotSiblingWorktree`)は不在 = 区間で未変化のまま observed に現存。

- **#765(S4/documentation)**: `amadeus-state.ts` の subcommand `set-skeleton-stance`(`packages/framework/core/tools/amadeus-state.ts:371` case、`:445` の Valid 一覧、`:518` handler)が `docs/` 全体で未記載。`grep -rln set-skeleton-stance docs/` = 0 件(実測)。当該 verb は **audit row を持たない**(`:508-517` コメント: 「No audit row — the stance is metadata …」)walking-skeleton stance の runtime metadata(`Skeleton Stance` フィールドを `## Runtime State` 下へ upsert)であり、次の `amadeus-orchestrate next` が deferred Construction Bolt-1 gate を解決するために読む。記載すべき正準ページは `docs/reference/12-state-machine.md`(state verb / `## Runtime State` フィールド / audit event taxonomy の構造。ただし audit event ではないため taxonomy 表ではなく verb・Runtime State 側へ)。
- **#764(S4/documentation)**: `amadeus-orchestrate next` の `--new-intent` フラグ(`amadeus-orchestrate.ts:321` 宣言、`:336` parseNextFlags、`:375` の `--new-intent` 分岐、`:1427` Branch 4a)が `docs/reference/` で未記載。`grep -rn -- --new-intent docs/reference/` = 0 件(実測)。姉妹フラグ `--resume`(`:371`)・`--single`(`:373`)も同 parser 内に実在。正準ページは `docs/reference/03-orchestrator.md`(Entry Points / Intent birth 節、`:115`)。
- **#763(S4/documentation)**: `docs/reference/18-workspace-layout.md`(145行、ADR 体裁)に `.ja.md` ペアが欠落。`docs/reference/*.md` 全数走査で `.ja.md` ペア欠落は **18-workspace-layout.md のみ**(他19ファイル=00〜17・diagrams は全ペア有り、実測)。E-L56 の「ペア規約の唯一の欠落が 18 のまま」を再確認、新規欠落なし。
- **#728(S4/documentation)**: `tests/` 配下13ファイル・14参照が旧名 `assertNotSiblingWorktree` を stale 参照。product は `resolveWorktreeAnchor` へ改名済み(`amadeus-worktree.ts:167` 定義、旧名は source に**不在**=`grep` 0 件、実測)。コメントは行番号(`:101` / `:101-121` / `:112` / `:459->101` / `:162`)も stale で、現定義 `:167` と不一致。`tests/harness/fixtures.ts` のみ2参照(`:283` `:542`)、他12ファイルは各1参照。



## docs-repair-batch9(2026-07-11)の観測面 — フォーカス5欠陥の現存確認(#812 #824 #680 #885 #886)

現行 HEAD `13598b752`(base `b845478bb`=前回 bughunt-fix-batch observed からの diff-refresh、59コミット)で確定した、docs/harness 修理バッチ第9弾フォーカス5欠陥の現物照合。出典は本 intent(docs-repair-batch9)の `inception/reverse-engineering/scan-notes.md`(全 file:line 実測付き)。5欠陥の欠陥クラス分類: **byte-copy localize 漏れ2件**(#812 SKILL.md / #824 onboarding.fills.ts)+ **ヘッダ契約乖離1件**(#680 sensor self-contained)+ **restart-loss 2件**(#885 slug 正規化 / #886 phase-check ゲート、詳細は architecture.md「docs-repair-batch9 の観測面」節)。#812/#824/#680 の欠陥3ファイルは `b845478bb..HEAD` 区間内で**一切変更されず欠陥が区間を貫通して現存**、#885/#886 の lib/state/worktree は区間内で #880 flip 配線・#869 jump per-phase の行番号シフトを受けたが**欠陥自体(normalizeWorktreeSlug 喪失 / phase-check ゲート喪失)は未修復で残存**。

### #812 — kiro-ide SKILL.md が kiro CLI 版の byte-copy(localize 漏れ・未修正)

- **欠陥**: `diff harness/kiro/skills/amadeus/SKILL.md harness/kiro-ide/skills/amadeus/SKILL.md` → **IDENTICAL**(バイト同一 = 完全 byte-copy、localize 未実施)。kiro-ide 側に kiro CLI 固有記述が残存: `:14` 見出し `# AI-DLC Orchestrator (Kiro CLI harness)`(IDE ハーネスなのに「Kiro CLI harness」)、`:84` `under \`kiro-cli chat --no-interactive\` the stop-hook enforcement backstop does not fire`(CLI 固有 headless caveat)。`grep -c "Kiro CLI"` = 1 + `kiro-cli` 参照 :84。
- **対照面**: kiro-ide skills 配下に `references/` サブディレクトリ不在(`find` で `skills`/`skills/amadeus` のみ)、kiro CLI 側も `SKILL.md` + `question-rendering.md` の2ファイルのみ。#812 の対照面は SKILL.md 本体に限定。
- **修理の型**: kiro-ide SKILL.md を IDE ハーネス向けに localize(`:14` 見出し / `:84` CLI 固有 caveat の IDE 版差し替え)。SKILL.md は harness 中立でないため byte-copy 自体が誤り。

### #824 — onboarding.fills.ts の kiro CLI 表記残存 + guide_pointer 誤指し(localize 部分漏れ・未修正)

- **欠陥**: `diff harness/kiro/onboarding.fills.ts harness/kiro-ide/onboarding.fills.ts` → DIFFERS。kiro-ide 版は `:13`(`Kiro IDE harness`)/`:37`(`Kiro IDE installs`)の**2箇所のみ** localize 済で、残りに kiro CLI 表記が残存。`grep -noE "Kiro CLI|kiro-cli"` = 7残存: `Kiro CLI`×3(`:1` ヘッダコメント `harness/kiro/onboarding.fills.ts — Kiro CLI's …` = パス+名称とも誤り、`:15` `Kiro CLI ≥ 2.6`、`:30` `rendered onto Kiro CLI. On Kiro:`)、`kiro-cli`×4(`:15` `kiro-cli --version`、`:17` `kiro-cli chat`×2、`:26` guide_pointer 内)。
- **guide_pointer 誤指し**: `:26` `guide_pointer` が kiro-ide 用ドキュメントを指すべきところ CLI 版 `docs/guide/harnesses/kiro-cli.md` を指す。差し替え先 `docs/guide/harnesses/kiro-ide.md` は **実在**(`kiro-ide.ja.md` も存在)= 受け皿あり。
- **dist 伝播**: `manifest.ts:93` の `onboarding: { dst: "AGENTS.md", … fills: onboardingFills }` により生成物 `dist/kiro-ide/AGENTS.md` にも誤表記が伝播済み(`:7`/`:9`/`:36`/`:39`)。正本修正後は `scripts/package.ts` 再生成で dist 同期が必要。
- **修理の型**: kiro-ide onboarding.fills.ts の残 7箇所 CLI 表記を IDE 版へ localize + guide_pointer を `kiro-ide.md` へ差し替え + dist 再生成。

### #812 未カバー面候補 — question-rendering.md の localize 漏れ2箇所(新発見・同根)

- **同根棚卸し**(`diff -rq harness/kiro/ harness/kiro-ide/`): localize 漏れは SKILL.md(#812)・**question-rendering.md**・onboarding.fills.ts(#824)の**3ファイル**に集中。`skills/amadeus/question-rendering.md` は kiro と **byte-identical** で `Kiro CLI` 表記2箇所残存: `:1` `Kiro CLI harness annex`、`:11` `Kiro CLI has no structured-question tool`。**#812 起票文が SKILL.md のみを対象にしている場合、question-rendering.md は同根の未カバー面**(SKILL 以外の annex の同一 localize 漏れクラスタ)。修理時に #812 スコープへ取り込むか別 Issue 化するかは requirements 判断。
- **共有妥当の確認**(誤修正防止): `agents/*.json`(5)・`settings/cli.json` は byte-identical だが `Kiro CLI`/`kiro-cli` 出現 0 = ハーネス中立で共有妥当(localize 対象外)。

### #680 — sensor-type-check.ts の self-contained ヘッダ主張と実 import の矛盾(ヘッダ契約乖離・未修正)

- **欠陥**: `amadeus-sensor-type-check.ts:4-5` ヘッダが `// Self-contained: no imports from sibling tools.`(兄弟ツール非 import を明言)だが、`:89` `import { sensorsDir } from "./amadeus-lib.ts";`(同ディレクトリ兄弟ツール)で**主張と実態が矛盾**(self-contained 主張は虚偽)。他 import は node 標準のみ(`:86-88`)で矛盾は lib import 1件に起因。
- **同型棚卸し**(全 sensor 5件): self-contained を明言するのは type-check と linter の2件のみ。`amadeus-sensor-linter.ts` は主張どおり兄弟 import ゼロで整合(主張 TRUE)。required-sections / schema / upstream-coverage は主張自体がなく整合。**矛盾は type-check.ts 単独**。
- **修理の型(2択、requirements/architect 判断)**: (a) ヘッダ主張を実態(lib へ依存)に合わせて書き換える、(b) `sensorsDir` 依存を除去して主張を真にする。主張のない3 sensor は対象外(誤修正しないこと)。

### #885 / #886 — restart-loss 2件(slug 正規化 / phase-check ゲート)

- 両件とも restart 前旧系譜 `.agents/amadeus/tools/` の契約が現行正本 `packages/framework/core/tools/` へ未移植で喪失し、区間内の #880/#869 再構築でも復元されなかった **restart-loss** クラスタ。品質観点の欠陥形状(機能面だけ再構築し precondition/正規化を復元しない非対称)と旧系譜 vs 現行の file:line 対照は **architecture.md「docs-repair-batch9(2026-07-11)の観測面」節** に詳述。
- **#885**: `normalizeWorktreeSlug` grep 0件。旧 `63314bc82`(#478 gap2)が lib/worktree/state の slug 境界を同一チョークポイントへ一本化し大文字混じり slug を寛容受理+小文字正規化していたが、現行は `amadeus-lib.ts:2099` worktreePath 無正規化 / `:2580` validateBoltSlug + `amadeus-worktree.ts:195` / `amadeus-state.ts:250` validateSlug が大文字を reject。batch8 #850 gap2 と同一 archive の分割で lib.ts 交差。
- **#886**: `phase-check|PHASE_CHECK|verifyPhaseCheck` core 全域 0件。旧 `8cf816138` の `verifyPhaseCheckArtifact`(`verification/phase-check-<phase>.md` を PHASE_VERIFIED 前に強制)が現行 state.ts 4経路(advance :1104 / finalize :1333 / complete-workflow :1428 / approve :1670)+ jump のいずれからも呼ばれず、#880 flip 配線(`setPhaseProgress` :101 / `markPhaseVerified` :114)・#869 jump per-phase が flip のみ再構築し precondition 未復元。

## p2-repair-batch7 の観測面 — restart-loss クラス5欠陥の現物照合(#834 #839 #844 #845 #849)

現行コード基準 `37ad36a97`(observed HEAD、base `d8de2362b`=前回 batch5 RE observed からの diff-refresh、区間13コミット)で確定した、restart-loss クラス5件の現物照合。base/observed の真実源は本 intent の `inception/reverse-engineering/scan-notes.md`。

**差分区間のフォーカス面変化(base→observed)**: 6フォーカスファイル中、変更は `amadeus-utility.ts`(#830/#855 の doctor Check1/3 を worktreeBaseDir に anchor する `5c5e042a2`)のみで、#844 の workspace-shell-ready ブロック(`:619-632`)には非関与。残る5ファイル(orchestrate / log-subagent / learnings / runtime / runtime-compile)は base 時点とバイト同一。**5欠陥はいずれも observed HEAD に未修正で現存**。区間で着地した周辺変更(#837 CCN ゲート・#855 doctor anchor・#856 coverage strip・#863 kiro adapter cwd・#865 lock 隔離+stamp guard 等)は本5欠陥のフォーカス面に非関与。

**クラス分類**: 5件はいずれも**セッション再起動/fresh clone で失われる状態(runtime-graph・active-intent cursor・監査シャード)を跨いだ経路が非対称・不完全に配線された restart-loss 欠陥**。うち #839/#845/#849 は cid:symmetric-pair-review の「片側だけ実装された非対称」(emit⇔terminal・ゲート⇔素通し・read⇔self-heal)、#834 は運用回避策 cid:parked-intent-birth-workaround(#750)の恒久修正面、#844 は 2状態判定と誤誘導 fix 文言。いずれも**挙動欠陥であって構造変化を伴わない**。

### #834 — orchestrate parked 短絡パスが `--new-intent` を検査しない(未修正・実在確認)

- **欠陥**: `packages/framework/core/tools/amadeus-orchestrate.ts:1243-1259`(Branch 2.5、PARKED workflow、issue #367)。ガード条件(`:1243-1249`)は `stateContent && !flags.resume && !flags.stage && !flags.phase && Parked` のみで **`!flags.newIntent` を含まない**。`Parked At Stage === Current Stage` なら `parkedDirective` を emit して `return`(`:1252-1257`)。
- **非対称**: `--new-intent` を処理する Branch 4a は後段 `:1357-1377`(`if (flags.newIntent) :1369`、`birthPrintDirective` emit `:1376`)。parked な active intent 上で `next --new-intent` を打つと Branch 2.5 が先に `parked` を emit して短絡し、新 intent birth(Branch 4a)へ到達できない。#832 面の roll-forward latch(`:1121-1151`、turn counter ベースの読み取り専用ガード)は別系統で不関与。
- **restart-loss 由来**: 運用知識 cid:parked-intent-birth-workaround(#750 — active-intent cursor が parked を指すと `--new-intent` が握りつぶされ、cursor ファイル手動削除で回避)の恒久修正面。
- **archive 参照解**: **なし**(新規修正)。archive `archive/main-before-restart-20260706-224926` を grep しても #834 相当のコミットは不在。切り分けは Issue 本文。
- **修理の型**: Branch 2.5 ガードへ `!flags.newIntent`(および同様に短絡しうる compose/newScope/report は Branch 4c で後段処理される点)を足す方向。latch 面には触れない。

### #839 — orchestrate トップレベル catch / error 分岐が ERROR_LOGGED 非配線(未修正・実在確認)

- **欠陥**: `amadeus-orchestrate.ts:2913-2920` — `if (import.meta.main) { try { main(); } catch (e) { console.error(...); process.exit(1); } }`。未捕捉例外は **stderr 出力 + `process.exit(1)` のみ**で監査イベント ERROR_LOGGED を emit しない。error directive 構築子 `errorDirective`(`:236`)も JSON directive を作るだけで監査を書かず、全 `emit(errorDirective(...))` 呼び出し(`:1209`/`:1303`/`:1329` ほか)も同様。
- **非対称の対照**: 兄弟 CLI は `amadeus-lib.ts:4353` `export function emitError`(コメント `:4333-4342`)経由で ERROR_LOGGED を `appendAuditEntry` 記録する。orchestrate は lib から `errorMessage` のみ import し `emitError` を import していない → orchestrate のクラッシュ/エラーは監査に痕跡を残さない(cid:symmetric-pair-review の emit⇔terminal クラスタ)。
- **restart-loss 由来**: 再起動を跨いだ障害調査で、クラッシュした orchestrate 実行が監査シャードに痕跡を残さないため、restart 後に「何が落ちたか」を監査から復元できない。
- **archive 参照解**: `460f56ba0`(`fix: エンジンの error directive と未捕捉例外を ERROR_LOGGED として audit へ自動記録（Issue #431）`、2026-07-05)。旧系譜パス `.agents/amadeus/tools/amadeus-orchestrate.ts`(+52 行)。
- **修理の型**: `emitError`(lib)を import し、トップレベル catch と `errorDirective` 発火点で ERROR_LOGGED を記録する対称化。

### #844 — utility doctor の workspace-shell-ready 2状態判定 + 一律 fix 文言(未修正・実在確認)

- **欠陥**: `amadeus-utility.ts:619-632`(`handleDoctor` 「5. Workspace shell ready」)。`const shellReady = existsSync(harnessEngineDir) && existsSync(defaultMemoryDir)`(`:627`)の **pass/fail バイナリ判定**。fix 文言(`:631`)`copy the workspace shell from \`dist/<harness>/\` into your project root` は **harness engine dir と memory dir のどちらが欠けても一律**に出す。
- **非対称の対照**: 同関数「6. Hook heartbeats」(コメント `:635-640`)は 3状態((a)未生成=advisory pass /(b)ディレクトリはあるが `.last` なし=fail /(c)`.last` あり=pass)で状態別の文言を出す。#844 は shell-ready を同様に細分化し、欠けている側を指す fix 文言にする面。
- **restart-loss 由来**: 導入直後/fresh clone で workspace shell が部分的に欠けた状態を doctor が誤誘導する(どちらが欠けたか判別できない)。
- **archive 参照解**: `a59590b32`(`fix: 導入直後の doctor / installer smoke の誤誘導を修正（Issue #573）`、2026-07-06)。旧系譜パス `.agents/amadeus/tools/amadeus-utility.ts`(+45 行)ほか `dev-scripts/evals/installer/check.ts`・`scripts/amadeus-install.ts`。
- **修理の型**: shell-ready を欠落側別(engine/memory)の状態に細分化し、状態別 fix 文言を出す(heartbeat の3状態パターンと揃える)。

### #845 — log-subagent 完了 intent ゲート不在 + agent_type 空文字素通し(未修正・実在確認)

- **欠陥(2件)**: `packages/framework/core/hooks/amadeus-log-subagent.ts`(全61行)。
  - **完了 intent ゲート不在**: `:48` `if (!hasActiveWorkflowAudit(projectDir)) process.exit(0);` — active な監査シャードが在れば発火するのみで intent の Status=Completed を除外するゲートがなく、完了済み intent へも SUBAGENT_COMPLETED を追記しうる。
  - **agent_type 空文字素通し**: `:41` `const agentType = parsed.agent_type ?? "unknown";` — `??` は `null`/`undefined` のみ既定化し **空文字 `""` は素通し**。`:50-52` の fields は `"Agent Type": agentType` を**無条件**格納(`agentId :53`/`agentMessage :54` は truthy ガードありに対し agentType はガードなし)。空文字が `"Agent Type": ""` として監査に載る。
- **restart-loss 由来**: 完了 intent の監査シャードが残存した状態で再起動後にサブエージェントが発火すると、閉じた intent へイベントを追記して監査整合を壊す。
- **archive 参照解**: `a2202f58b`(`fix: log-subagent の完了ガードと agent_type 既定、parity 宣言（Issue #555、B003 + FR-4）`、2026-07-06)。旧系譜パス `.agents/amadeus/hooks/amadeus-log-subagent.ts`(+13 行)ほか `dev-scripts/evals/hooks-state-bugfix/check.ts`。
- **修理の型**: Status=Completed 除外ゲートを追加し、agentType を truthy ガード(空文字も既定化 or 非格納)へ揃える。

### #849 — learnings readRuntimeStageRow の3経路 hard fail(runtime-graph 欠落で自己修復せず)(未修正・実在確認)

- **欠陥**: `packages/framework/core/tools/amadeus-learnings.ts:127-153` `readRuntimeStageRow` の3 hard-fail 経路: (1) runtime-graph.json 不在 `:129-130` / (2) malformed(parse 失敗 `:135-136`、非 object `:138-139`、stages 非配列 `:142-143`) / (3) stage 未発見 `:152`。呼び出しは `handleSurface` `:184`。
- **restart-loss 由来(本丸)**: runtime-graph.json は `.gitignore` 対象の per-intent ランタイム生成物(`amadeus/spaces/*/intents/*/runtime-graph.json`)。セッション再起動/fresh clone で欠落した状態で §13 surface が走ると**自己修復せず hard-fail** する。
- **self-heal 移植の seam**: コンパイル正本は `packages/framework/core/tools/amadeus-runtime.ts:319` `export function compile(opts: CompileOptions)`(runtime-graph.json を materialise)。PostToolUse フック `amadeus-runtime-compile.ts` はこれを `spawnSync` で発火するだけ(`:121` `const args = ["run", runtimeTs, "compile"]`)。#849 の自己修復は runtime.ts の `compile` を **in-process import** して、readRuntimeStageRow が不在時に再生成してから読む(フックのプロセス跨ぎではなく関数直呼び)。
- **archive 参照解**: `a62efe182`(`fix: runtime-graph 登録経路の修正と surface の自己修復（Issue #558）`、2026-07-06)。旧系譜パス `.agents/amadeus/tools/amadeus-learnings.ts`(+64 行)・`.agents/amadeus/hooks/amadeus-runtime-compile.ts`(+11 行)ほか `dev-scripts/evals/{engine-e2e,hooks-state-bugfix}/check.ts`。
- **修理の型**: readRuntimeStageRow に不在時 self-heal(`compile` in-process 呼び)を挟む。

### archive 参照解の所在と移植注意(#834/#839/#844/#845/#849 横断)

- archive ブランチ `archive/main-before-restart-20260706-224926`(tip `bc76b6303`、実在確認済)に4件の参照解(#834 は新規で参照解なし)。全参照解は**旧系譜パス `.agents/amadeus/{tools,hooks}/...`** で、現行正本は **`packages/framework/core/{tools,hooks}/...`**。移植時はパスを現行正本へ読み替え、`bun scripts/package.ts`(dist 再生成)+ `bun run promote:self`(セルフインストール昇格)を**同一コミット**で実施する(Mandated)。
- 旧系譜には `dev-scripts/evals/` の check.ts が同梱されるが、現行のテスト機構は `tests/` 配下の Bun ランナー。eval check.ts をそのまま移植せず現行テスト様式へ写像する。

### batch6(#841 tryEmitSwarm)との交差観測

- #841(batch6)対象は `amadeus-orchestrate.ts` の `tryEmitSwarm`(定義 `:1703`、`readBoltDagBatches` 近傍 `:1717-1720`、呼び出し元 `:1643`/`:1669`)。#834(本 batch7)対象は同ファイル Branch 2.5(`:1243-1259`)。
- **ファイル交差・リージョン非交差**(約450行離れる)。cid:code-generation:c6 は静的目録でなく先行 PR の実 diff でリージョン非交差を再評価する規律のため、batch6 の #841 PR が in-flight なら (a)着地待ち or (b)実 diff で非交差実測後に並行。他4欠陥(#839/#844/#845/#849)は #841 と別ファイル/別リージョンで交差なし。

## p3-repair-batch6(履歴・全6件修正着地 2026-07-11)の観測面 — restart による過去修正喪失 regression 6件の現物照合(#841 #842 #836 #840 #847 #848)

現行コード基準 `37ad36a97`(base `d8de2362b`=前回 batch5 RE observed からの diff-refresh、現 origin/main)で確定した、フォーカス6欠陥の現物照合。介在13コミットのうち `packages/framework/core/tools/` のコア tools 変更は `amadeus-lib.ts`/`amadeus-state.ts`/`amadeus-swarm.ts`/`amadeus-utility.ts` の4ファイルに限定され、**本 intent のフォーカス6欠陥が属する `amadeus-orchestrate.ts` / `amadeus-jump.ts` / `amadeus-sensor-linter.ts` / `amadeus-graph.ts` / `amadeus-stage-schema.ts`(および utility の一部関数)は本区間で未変更**。6件はいずれも**挙動欠陥であって構造変化を伴わず**。base/observed の真実源は本 intent の `inception/reverse-engineering/scan-notes.md`。

**欠陥クラス = restart/reset による過去修正の喪失 regression**: 6件はいずれも本区間の新規回帰ではなく、より古い時点で **元修正が既に着地していたにもかかわらず、後の restart/reset により喪失し元修正前の状態へ逆戻りした既存欠陥**であり、現 observed で現存する。各欠陥は元修正コミット SHA と対で接地でき、「元修正との差分再接地」が Architect 合成/開発の一次材料になる(元修正: #486=`3eca83a56`, #481=`2c2c48a39`, #459=`765fe4f20`, #538=`c6597bf18`, #499=`c8ddabffc`)。うち #842(forward⇔backward 非対称 emit)・#836(init で書くが advance/approve で更新しない write⇔update 非対称)は team.md `symmetric-pair-review`(write⇔check / emit⇔terminal / fork⇔merge)クラスタの「対称対の片側喪失」に該当。

### #841 — tryEmitSwarm が完了バッチを除外せず静的 batches[0] を無条件再提示【現存】

- **現行 file:line**: `amadeus-orchestrate.ts:1703`(`tryEmitSwarm`)、欠陥本体 `:1717-1720`。`readBoltDagBatches` の返す静的トポロジ第1バッチ `batches[0]` を無条件採用し、`unitCovered` 等のカバレッジ判定で完了済みバッチを除外していない。`next` が毎回バッチ1を再提示しバッチ進行が手動追跡になる。
- **元修正/喪失**: `3eca83a56`(#486「invoke-swarm を coverage ベースのバッチ進行へ」)が batches を走査し未カバー unit を含む最初のバッチを採るロジックを追加していたが、現行はこの走査が失われ `batches[0]` の静的採用へ逆戻り。

### #842 — jump が backward でも PHASE_VERIFIED を emit・多相 forward の単一イベント化・PHASE_SKIPPED 不在【現存】

- **現行 file:line**: `amadeus-jump.ts:432-447`(`execute` 内の phase 境界イベント emit ブロック)。ガードが `direction` を見ないため (a) **backward jump でも** PHASE_COMPLETED/PHASE_VERIFIED/PHASE_STARTED を emit(Verified ロールバック不可契約に反し前進 Verified を偽発行)、(b) 複数 phase を跨ぐ **forward jump が単一の from→to 対**しか出さず中間 phase を per-phase 列挙しない、(c) 実行済み stage を持たない phase の **PHASE_SKIPPED が皆無**、加えて同一トランザクションの Phase Progress 更新も欠落。
- **元修正/喪失**: `2c2c48a39`(#481「jump の phase 境界に #479 の契約を適用」)が「per-phase 列挙 → forward のみ emit → work 有り=VERIFIED / work 無し=SKIPPED → 同一トランザクションで Progress 更新」を実装し `markPhaseVerified`/`PHASE_PROGRESS_FIELD` を export していたが、direction 分岐・per-phase 列挙・SKIPPED・Progress 更新が全て喪失。

### #836 — delegate 承認フローで Phase Progress ロールアップが更新されない【現存】

- **現行 file:line**: 更新コード自体が不在。`## Phase Progress` を**書く**のは init テンプレートのみ(`amadeus-utility.ts:2449` 見出し、生成ロジック `:2396-2414`)。`amadeus-state.ts` の `handleAdvance:1135` は `Lifecycle Phase` を `setField` 更新するのみ、`handleDelegateApproval:1655` は DELEGATED_APPROVAL audit を追記するのみで、advance/approve/delegate のいずれも `## Phase Progress` を更新しない。init テンプレートのコメント(`:2398-2399`)が約束する Active/Verified への flip を行うコードが存在せず、Progress は init 以降 stale(delegate 承認=本チームの主経路でも未更新)。
- **write⇔update 非対称**: init で「書く」が advance/approve で「更新しない」片側欠落。#481 元修正(`2c2c48a39`)が jump 経路で `PHASE_PROGRESS_FIELD` を同一トランザクション更新していた痕跡があり、Progress 更新機構が過去に存在し喪失したことを示す。advance/approve 経路の Progress 更新は本 batch で新規配線が必要な可能性(要 Architect 合成確認)。

### #840 — detectWorkspace の言語走査が SCAN_SOURCE_DIRS 限定で Greenfield 誤判定【現存】

- **現行 file:line**: `amadeus-utility.ts:1917`(`detectWorkspace`)、欠陥本体 `:1949-1954`。定数 `SCAN_SOURCE_DIRS`(`src`,`app`,`lib`,`pages`,`components`,`tests`)は `:1762`。言語カウントの再帰対象が定型 source dir に限定され、`packages/`・`dev-scripts/`・`skills/` 等にコードを置く repo(本 repo 自身が該当)では `langCounts` が空 → `hasSourceFiles=false`(`:1977`)→ トップレベル framework config 等も無ければ `brownfield=false` で **Greenfield 誤判定** → bugfix scope の reverse-engineering が SKIP 降格。
- **元修正/喪失**: `765fe4f20`(#459「workspace-detection の言語走査を全トップレベル dir へ一般化」)が「SCAN_EXCLUDE とドット始まりを除く全トップレベル dir を再帰対象へ」一般化していたが、現行は `SCAN_SOURCE_DIRS` 限定へ逆戻り。project.md Mandated(workspace 分類の CodeKB 根拠参照)の観点では、本現状が `technology-stack`/`code-structure` の workspace 分類根拠の現行限界。

### #847 — sensor-linter が eslint ラップ専用に逆戻りし lint:check 2段検出が不在【現存】

- **現行 file:line**: `amadeus-sensor-linter.ts`(全357行、冒頭ドキュメントコメント `:5-43`)が `bunx eslint` ラップ専用。`bunx eslint --version`/`--print-config`/`--format json` のみで、workspace の `package.json` が `lint:check` を宣言する場合にそれをラップする1段目が無い。よって Biome 等 eslint 非採用の repo(本 repo 自身)では常に 127 quiet PASS になり実 linter が gate で発火しない(`lint:check`/`bun run` の grep ヒット 0)。
- **元修正/喪失**: `c6597bf18`(#538「linter sensor を 2 段検出化」)が「`lint:check` 宣言 → `bun run lint:check` ラップ、不在なら従来 eslint 検出」の2段検出を追加していたが、1段目(lint:check ラップ)が喪失し eslint 専用へ逆戻り。

### #848 — docs-only intent の workspace_requires 免除経路(declare-docs-only / GUARD_EXEMPTED)が喪失【現存】

- **現行 file:line**: 免除経路自体が不在(`declare-docs-only`/`GUARD_EXEMPTED`/`docsOnly` は tools 全域で 0 ヒット、実測済み)。拒否経路のみ現存: `amadeus-state.ts:952` `verifyStageArtifacts` の `:967-975` が `stage.workspace_requires && !workspaceHasWork(pd)` で無条件 `error()`(免除分岐なし)。型宣言・parse・serialize・graph 登録・schema 検査(`amadeus-lib.ts`/`amadeus-graph.ts`/`amadeus-stage-schema.ts`)はいずれも現存。
- **元修正/喪失**: `c8ddabffc`(#498 #499 #501、B002=#499)が「registry の docsOnly 宣言で workspace_requires ガードを免除でき、免除発動を `GUARD_EXEMPTED` audit に記録。宣言なしの拒否経路は従来どおり」を追加していたが、declare-docs-only サブコマンド・GUARD_EXEMPTED audit・免除分岐が全て喪失し拒否経路のみ現存。

## p3-cleanup-batch5(候補)の観測面 — 候補6欠陥の現物照合(#811 #822 #830 #730 #819 #831)

差分区間 `9738580ef..60f5e1edf`(observed HEAD `60f5e1edf`)で確定した、修理候補7件の現物照合。base/observed の真実源は当該 intent(`260711-p3-cleanup-batch8`)の `inception/reverse-engineering/scan-notes.md` および `re-scans/260711-p3-cleanup-batch8.md`。7件は**2クラスに分かれる**: (I) restart-loss 4件(#843/#846/#850/#851)= 旧 `.agents/`・`aidlc/` 系譜 → `packages/framework/` 移行の境界で復元漏れした既存欠陥(差分区間**外**)、(II) 区間内3件(#876/#877/#878)= 差分区間で導入・変更された面(それぞれ 要件見落とし由来 / テストインフラ由来 / #879 導入ギャップ)。

### restart-loss クラス(#843/#846/#850/#851、区間外)— E-L53 3点法で接地

4件とも (a) archive 元修正コミットが実在し、(b) 現行正本コードで欠陥が現存し、(c) 喪失は差分区間の**外**(base `9738580ef` 時点で既に喪失済み)。archive 側は旧系譜パスのため、修理は現行正本パスへの**再適用**(旧パス直移植は不可)。

| Issue | archive 元 SHA | 旧→現行正本パスの読み替え | 現行欠陥 file:line |
|---|---|---|---|
| #843 | `4d5a0f5a5` | 旧 `.agents/.../protocols/stage-protocol.md` → `packages/framework/core/amadeus-common/protocols/stage-protocol.md` | `:611-614`(subagent 節の persona 注入指示が残存)+ `:842-843` |
| #846 | `657dc9267` | 旧 `.agents/amadeus/tools/` → `packages/framework/core/tools/` | `amadeus-sensor-required-sections.ts:229` / `amadeus-sensor-upstream-coverage.ts:111` / `amadeus-validate.ts:305`(末尾で無条件 `main()`。import しただけで CLI 発火) |
| #850 | `63314bc82` | 旧 `.agents/amadeus/tools/amadeus-audit.ts` + `amadeus-lib.ts` → `packages/framework/core/tools/` | `amadeus-audit.ts:471-475`(wtAuditPath 存在のみで一律拒否、reentrant/DIVERGED 判定欠如)。lib gap2(slug 正規化一本化)は toLowerCase seam が `:746`/`:1828`/`:1980` に散在、単一正準関数化は未確認(functional-design で突き合わせ要) |
| #851 | `589687a19` | 旧 `.agents/skills/amadeus/references/issue-ref-contract.md` → `packages/framework/harness/<name>/skills/amadeus/references/issue-ref-contract.md` | **不在**(全面 0 件、base でも不在)。同種サイドカー `question-rendering.md` の実配置は正本4面+dist4面+self-install2面=計10面。harness スコープは合成で確定要 |

- **#846 の型**: `import.meta.main` ガード有無の不統一が既知アンチパターン。`amadeus-learnings.ts:916`(`if (import.meta.main) main();`)が正しい参照実装。3ファイルとも末尾の無条件 `main()` を同型へ是正する。
- **restart-loss の系譜的含意**: 旧 `.agents/` / `aidlc/` → `packages/framework/` の移行境界で復元漏れした修正群が4件現存する。同型の restart-loss 再発検知の観点(移行時に archive 修正の再適用棚卸しを漏らさない)になる。

### 区間内クラス(#876/#877/#878、区間内)

- **#876 — `computeStrippableLines` が brace-only 行を strip しない(区間内新規)**: `tests/lib/coverage-normalize.ts`(base に不在の新規 +284行)。`computeStrippableLines`(`:40`)の code モードで `:117`(`{` を含む行を markCode)/ `:126-132`(`}` を含む行を markCode)/ `:135`(`;` `)` 等の非空白で markCode)が、brace-only 行(`}` `};` `});`)を全て code-bearing にマークする。`:190-193` の `!codeBearing.has(ln)` 判定で strippable から外れ、lcov 上で DA:0 の閉じ括弧行が strip されず未カバー扱いになりうる。区間内で導入された新規ロジックの欠陥(regression 候補、要件見落とし由来)。
- **#877 — run-tests バッチ時の persist seam 分離不全(区間内新規)**: 現行ランナー `tests/run-tests.ts:692`(`runBunTestFile`)は `bun test <file>` を **1ファイル/1invocation** で実行し、複数ファイルを同一 bun プロセスにバッチ**しない**(unit tier は `pinnedSerial`+`effectiveParallel=1`)。よって #877 は手動 `bun test tests/unit`(ディレクトリ一括)や複数ファイル明示指定でのみ再現する。干渉相手 `tests/unit/t-learnings-persist-seam.test.ts`(新規)は `handlePersist` を in-process 直接 import(`:15`)し、`callPersist`(`:40-61`)で **`process.exit` と `process.stderr.write` をグローバルに monkey-patch**(復元は finally `:57-58`)。共有 `tests/harness/fixtures.ts` は `resetAidlcEnv()` で `process.env.AMADEUS_DEFAULT_SCOPE` を delete。**修理対象はランナーのバッチ構成ではなく、同一プロセス共有時の process-global 汚染耐性**(persist-seam の monkey-patch 残留 / fixtures の env 変異)に定める(テストインフラ由来)。
- **#878 — orchestrate default 出口が recordEngineError 非配線(区間内、#879 の残存ギャップ)**: `packages/framework/core/tools/amadeus-orchestrate.ts:2995-3001` の `default:` ブロックが `console.error` + `process.exit(1)` で、throw しないため上位 catch を通らない。`recordEngineError` 定義は `:195`、配線は `runEngineMain`(`:3017`)の try/catch のみ。#879(= observed HEAD `60f5e1edf`、"record ERROR_LOGGED for orchestrate error exits #839")が recordEngineError を導入したが、**Unknown subcommand の default 出口は未配線のまま**残った(base `9738580ef` には recordEngineError 自体が不在)。修理は default 出口を recordEngineError 配線 or throw 化して runEngineMain catch へ流す2案が候補。構造面は architecture.md の同名節を参照。

## p3-cleanup-batch5(履歴)の観測面 — 候補6欠陥の現物照合(#811 #822 #830 #730 #819 #831)

現行コード基準 `d8de2362b`(base `58f3453ad`=前回 batch4 RE observed からの diff-refresh。現 HEAD `6279efe58` は intent birth checkpoint のみでフォーカスファイル無変更。介在16コミット、うち #751/#753/#746/#758 の4件のみフォーカス領域に触れたが**いずれも本候補6件の欠陥箇所は未修正**で行番号シフトのみ)で確定した、候補6件の現物照合。6件はいずれも**挙動欠陥であって構造変化を伴わず**。base/observed の真実源は当該 intent(260710-p3-cleanup-batch5)の `inception/reverse-engineering/scan-notes.md`。

現行コード基準 `d8de2362b`(base `58f3453ad`=前回 batch4 RE observed からの diff-refresh。現 HEAD `6279efe58` は intent birth checkpoint のみでフォーカスファイル無変更。介在16コミット、うち #751/#753/#746/#758 の4件のみフォーカス領域に触れたが**いずれも本候補6件の欠陥箇所は未修正**で行番号シフトのみ)で確定した、候補6件の現物照合。6件はいずれも**挙動欠陥であって構造変化を伴わず**。base/observed の真実源は当該 intent(260710-p3-cleanup-batch5)の `inception/reverse-engineering/scan-notes.md`。

分類: 3件(#811/#822/#830)は「安全側/正しい対照実装が兄弟にあるのに片系統が非対称に素通しする」非対称欠陥、#730 は lcov merge union の DA 加算合成による false-red、#819/#831 は並列フレーク(それぞれ非ヘルメティックな実 eslint spawn / 時間・cursor 解決依存)。

### #811 — adapter inline mint が #755 分類器をバイパス(未修正・実在確認)

- **欠陥**: codex/kiro/kiro-ide の3アダプタとも `case "mint"` で `appendAuditEntry("HUMAN_TURN")` を**state 存在のみでゲート**し、機械注入ターン分類器 `isMachineInjectedTurnText` を通していない。正の対照は core `amadeus-mint-presence.ts`(`:65` で `isMachineInjectedTurnText(prompt)` を呼び機械注入なら mint 抑止)。
- **起票パス誤りの正誤**: 起票の対照実装 path「core/tools」は**誤り**。正は **`core/hooks/amadeus-mint-presence.ts:65`**。分類器の定義・export は **`core/tools/amadeus-lib.ts:347`**(`export function`。stop-hook `amadeus-stop.ts:584,626` も共用し #755 tier-3 carve-out と分岐一致)。
- **現行 file:line**: codex adapter HUMAN_TURN 直呼び `:357`(起票 :347-362 → 現行 `:349-364`、+2 シフト)、kiro mint HUMAN_TURN `:132`(`:130-134`)、kiro-ide mint HUMAN_TURN `:88`(`:84-94`)、codex emit HOOK_WIRING `emit.ts:31`(変化なし)。
- **決定的裏取り**: `grep -c isMachineInjected` が**3アダプタとも 0**(共有分類器を import すらしていない)。
- **修理の型**: 3アダプタの mint case に共有分類器 import + 抑止分岐を追加(mint-presence hook と同カタログ共有)。実機の HOOK_WIRING/HUMAN_TURN 発火の実証テストが完成条件。

### #822 — kiro 系 runCore の cwd 喪失(未修正・実在確認)

- **欠陥**: kiro/kiro-ide adapter の `runCore` が `Bun.spawnSync` に `cwd` を渡さず、spawn された core フックがアダプタプロセスの cwd を継承する(kiro が渡す `kiro.cwd` が伝播しない)。`stdin/stdout/stderr` のみ指定で `cwd` フィールド欠落。
- **非対称の対照**: codex adapter runCore(`:162-169`、spawnSync `:163`)は `cwd: projectDir`(`:167`、`:90` で `codex.cwd ?? process.cwd()` 解決)を渡す**正しい側**。3アダプタで唯一 codex だけが正しい。
- **現行 file:line**: kiro runCore `:378-385`(spawnSync `:379`)、kiro-ide runCore `:232-239`(spawnSync `:233`)。buildForward は `kiro.cwd ?? process.cwd()` を各ハンドラで解決するが runCore へ未伝播。
- **修理の型**: kiro/kiro-ide の runCore spawnSync に `cwd:` を追加(codex の解決規則と対称化)。#753 の kiro-ide 変更は buildForward(:179-203)止まりで runCore(:232)未到達のため現存。

### #830 — doctor Check1/Check3 が anchored base dir 非適用(未修正・#746 の直接残渣)

- **欠陥**: `amadeus-utility.ts` の doctor Check 1(`:831`)/ Check 3(`:998`)が `const worktreesDir = join(projectDir, ".amadeus", "worktrees")` の**生 join** のまま。Check 2(`:960`)は `worktreePath(projectDir, slug)` の anchored 版(正しい側)を使う**非対称**。lib は `worktreeBaseDir`(`:1981`)/ `worktreePath`(`:1989`)を export 済み。
- **因果(same-root-inventory の実例)**: #830 は **#746(`3563d84c3`)の伝播漏れの直接残渣**。#746 は lib に `worktreeBaseDir` を新設し `amadeus-worktree.ts` の読み側を移行したが、**`amadeus-utility.ts`(doctor)を touch していない**(`git show 3563d84c3 -- amadeus-utility.ts` = 空)。Check 1/3 が生 join のまま取り残された。cid:code-generation:same-root-inventory(同根パターンの全数棚卸し)の実例。
- **クロスレビュー**: 2名 CONFIRMED 済み、行番号は起票時から完全一致。
- **修理の型**: Check 1/3 の生 join を `worktreeBaseDir`/`worktreePath` の anchored 導出へ差し替え(Check 2 と対称化)。

### #730 — bun lcov の関数内コメント/空白行 DA:0(未修正・merge union 経路特定)

- **欠陥の本丸**: `tests/run-tests.ts`(テストインフラ側、`packages/framework` 配下ではない → **dist/self-install 同期不要**)の `normalizeCoverageReport`(`:509`)。union/merge の核心は **`:534`** `current.lines.set(lineNo, (current.lines.get(lineNo) ?? 0) + count)` の **DA 加算合成**。ロードのみチャンクが in-body コメント/空白行を `DA:N,0` で stamp し実行チャンクが正 count を与えないため、`0 + 0 = 0` が恒久化 → LH から漏れて false-red。
- **チャンク連結の実体**: `combineCoverageReports`(**`:674`**)が各 per-file lcov を `chunks.join("\n")`(**`:689`**)で連結し `normalizeCoverageReport` へ渡す。ここが「外部 lcov merge union」の実体。単一プロセスでは1チャンクのみで union が起きず再現しない(レシピの説明と整合)。
- **#772 リマップとの独立**: `normalizeCoverageSourcePath(source, COVERAGE_SOURCE_PATH_CONTEXT)`(`:519`、context `:61`)は SF 行のソースパス正規化で DA:0 問題とは独立。
- **修理の型**: 計測不能行の false-red を merge/normalize 経路(`:534` の union)で loud 検出 or 除外する設計。発生源コード側の回避策 cid:code-generation:bun-inbody-comment-da0(説明コメントをモジュールスコープへ退避)とは別に、本丸は merge 経路の是正。

### #819 — t92 case 15 並列フレーク(未修正・非ヘルメティック spawn が根)

- **欠陥**: `tests/integration/t92.test.ts` case 15(`:661-663`、`test("15: linter — failing TS ... Findings count=1")`、timeout 60000ms)。本体 `runFailedTsReal`(`:610-637`)→ `fire`(`:327-333`)→ `spawnSync(BUN, [SENSOR_TS, "fire", ...])` で **amadeus-sensor.ts を実プロセス spawn → その先で実 eslint バイナリを spawn**(manifest `timeout_seconds=30`)。
- **フレーク機序(Findings 1→0)**: **非ヘルメティックな実 eslint spawn**。full-suite 並列負荷下で eslint が(a)timeout 打ち切り→tool-unavailable→0 findings、(b)リソース競合で空結果、のいずれかに落ち、期待 Findings=1 に対し 0 を返す。`fire` は child_process 側 timeout を指定せず sensor manifest の timeout_seconds と bun-test 60000ms 上限に依存。
- **修理方向の含意**: #741 手法(順序に効くタイムスタンプの定数化)では**閉包しない**。フレークは外部プロセス(実 eslint)の並列競合由来でテスト内部の wallclock 結合ではないため。eslint spawn の hermetic 化(結果を固定 fixture 化 / スタブ経路へ寄せる)が必要。実 eslint を保つなら競合非依存の隔離が要る。

### #831 — t76 test 12 並列フレーク(未修正・起票仮説を反証、真機序候補を特定)

- **欠陥**: `tests/unit/t76.test.ts` test 12(`:626-654`、`test("12: merge audit-lock timeout — slug-tagged failure, no partial state write")`)。`auditLockDir(proj, DEFAULT_RECORD_DIR, DEFAULT_SPACE)`(`:641`)へ lock dir を先行作成し `owner.json` を自 PID + fresh startedAtMs で stamp(`:644-645`)。reaper が live+fresh を reap 拒否 → merge の lock 取得が retry 予算を使い切って失敗する期待。
- **起票仮説(PID/プロセス依存でパス不一致)は反証済み**: ロックパスは**決定的**。`auditLockDir`(lib `:2798`)= `join(tmpdir(), '.amadeus-audit-<md5(identity)[:8]>.lock')`、`auditLockIdentity`(`:2790` 付近)= `` `${projectDir}\x00${space}\x00${intent}` `` で **PID を含まない**(区切りは NUL、#786 と同系)。tmpdir() は `TMPDIR` env 由来で兄弟プロセス間同値 → テストと merge サブプロセスは同一 lockDir を算出するはず。
- **真の機序候補(修正設計は機序切り分けが前提)**: (1) **active-intent cursor 解決 divergence**(最有力): `intent` 成分は merge 時に active-intent cursor から解決される(`:637-639` コメント)。並列負荷下で cursor 解決がテスト前提の DEFAULT_RECORD_DIR と食い違えば merge は別 bucket の lockDir を算出し、植えたロックを観測せず merge 成功 → 期待 failure に対しフレーク。(2) **timeOrigin 依存の staleness マージン**: staleness は `lockAcquireEpochMs()`(`performance.timeOrigin + performance.now()`、`:2845`)と `owner.startedAtMs` の差 > `lockStaleMs()`(default `DEFAULT_LOCK_STALE_MS=10*60*1000`、env `AMADEUS_LOCK_STALE_MS` 上書き可、`:2775-2783`)で、**cross-process の `performance.timeOrigin` epoch 家系一致前提**(`:2841-2844` コメント)に依存する timing 脆弱性。retry 予算は `acquireAuditLock(pd, 50, 100, intent, space)`(`:3135`)= 50×100ms = ~5s。
- **修理方向の含意**: 機序(1)なら cursor 解決を決定化(テストが merge の解決する intent bucket を明示 pin)、機序(2)なら #741 パターン(`startedAtMs` を明示定数 or `AMADEUS_LOCK_STALE_MS` env 固定)が直接効く。両機序の切り分けが修正設計の前提。

## p3-cleanup-batch4(履歴)の観測面 — P3 欠陥6件の横断分類(#757 #758 #753 #739 #740 #784)

> **全6件修正済み(2026-07-10 着地、PR #823/#821/#817/#818/#814/#815)**。以下の欠陥記述は履歴として温存する(欠陥の型・修理方向の記録)。

現 HEAD(`58f3453ad`、base `da1611a9a` からの diff-refresh。焦点9ファイル中7ファイルは無変更、`amadeus-sensor-fire.ts`(#793)/`amadeus-state.ts`(#804)の2ファイルは行番号シフトのみで欠陥不変)で確定した、P3 バグ6件の現物照合。6件はいずれも**挙動欠陥であって構造変化を伴わず**、ファイル非交差(6ファイル群が互いに独立、バッチ3 および open PR #808/#809 とも交差ゼロ)。base/observed の真実源は当該 intent(260710-p3-cleanup-batch4)の `inception/reverse-engineering/scan-notes.md`。

6件を品質パターンで分類すると、いずれも「安全側の機構は既に在るが、その適用が片側・片系統に限られ、もう片方が素通りする」という**非対称欠陥**に収斂する(横断所見は §4 に詳述)。

### #757 — 正規化変数を計算しながら glob マッチだけ生パスを使う非対称(`packages/framework/core/hooks/amadeus-sensor-fire.ts`)

- **欠陥**: `:88` で `const filePathNorm = filePath.replace(/\\/g, "/")` を計算し、再帰ガード(`:90-91`)は正規化版を使うのに、センサー適用判定の `:194` `if (!glob.match(filePath)) continue` は**生 `filePath`** を渡す(`:193` `new Bun.Glob(entry.matches)`)。正規化済み値が同一スコープに在るのに glob だけ生パス、という計算成果の片側適用漏れ。
- **影響境界**: path セグメント型の manifest(`**/{amadeus-docs,intents}/**` 等)2種が Windows 区切りで取りこぼす。拡張子型2種は無害(macOS では区切りが `/` のため実害非再現=P3 根拠と整合)。
- **修理の型**: `:194` を `filePathNorm` に差し替える1語変更。修理時に「正規化済み変数があるのに生パス使用」の同型が hooks/tools 他所に無いか grep で確認する(Issue 明記)。
- **行番号**: 起票時 `:190/:191` → 現行 `:193/:194`(+3、#793 マージ由来。#793 は advisory hook の発火ゲート条件変更で glob マッチ対象には未介入)。

### #758 — mutating verb 列挙と真実源(state.ts switch)の乖離(`packages/framework/core/hooks/amadeus-stop.ts`)

- **欠陥**: stop-hook carve-out の判定 regex `:552` `/\b(approve|advance|finalize|complete-workflow|gate-start|checkbox|park|unpark|set|skip|reject|revise|resume)\b/` が、真実源である `amadeus-state.ts` の subcommand switch に実在する mutating verb 8件 — `delegate-approval`(:284)/`delegate-rejection`(:287)/`acknowledge-compaction`(:302)/`reuse-artifact`(:305)/`practices-event`(:311)/`practices-promote`(:314)/`fork`(:317)/`merge`(:320)— を**取りこぼす**(`\breject\b` は `delegate-rejection` に不一致 — e4 実測 2026-07-10)。列挙(手書き regex)と真実源(switch)を二重管理した結果の同期漏れ。
- **影響境界**: allow-only(session trap なし)・interactive 限定(tier-3 は autonomous では非発火、`:469` 以降のコメントと整合)。read-only verb(get/count/lookup)は正しく列挙外。
- **修理の型**: (A) 判定を read-only verb 列挙+それ以外は関与へ反転(`:490-491`/`:527` の fail-toward-engagement コメントと整合、追加 verb が安全側デフォルト)、または (B) 現列挙に8 verb 追加+state.ts switch との同期テスト強制。消費者は stop.ts 単一、verb 真実源は state.ts switch。同期テストを置くなら switch を canonical に読む形が望ましい。
- **行番号**: 起票時 `:551` → 現行 `:552`(+1)、switch は `:229-298` → 現行 `:254-320`(state.ts 全体が #804 マージで下方シフト、verb 集合は不変)。

### #753 — IDE/CLI 語彙不一致による dead seam(`packages/framework/harness/kiro-ide/hooks/`)

- **欠陥**: adapter `amadeus-kiro-adapter.ts` の log-subagent case(`:200` `if ((kiro.tool_name ?? "") !== "subagent") return null`)と state-sync case(`:184` `!== "todo_list"`)が CLI 語彙を単独ハードチェックする一方、登録 `.kiro.hook` は IDE 語彙で発火する(`amadeus-log-subagent.kiro.hook` の `"toolTypes":[".*invoke_sub_agent.*"]` は文字列 `"subagent"` に不一致、`amadeus-sync-statusline.kiro.hook` の `"toolTypes":["spec"]` は `"todo_list"` に不一致)。兄弟 `canonicalTool()`(`:131`)は write/shell 系で IDE/CLI 両語彙を受理する二重受理パターンを持つのに、この2 case だけ非対称に単一語彙 — その結果どちらの語彙の payload でも一方の面(登録 or 受理)で不一致が残り、seam が死ぬ。
- **影響境界**: 不整合は live payload の `tool_name` 実値に依らず成立(canonicalTool の二重受理欠如という非対称が根拠)。ただし実機 payload は未捕捉。
- **修理の型**: 2 case を canonicalTool の二重受理パターンへ揃える(log-subagent は subagent/invoke_sub_agent、state-sync は todo_list/spec)+ state-sync は spec 入力の shape マッピング追加。実機 payload 未捕捉のため「発火の実証テスト」が完成条件(Issue 明記)。
- **行番号**: Issue の `:200`/`:184` と現行一致(ずれなし)。

### #739 — stat/lstat の混同による dangling symlink クラッシュ(`scripts/promote-self.ts`)

- **欠陥**: `:146` `if (statSync(full).isDirectory()) yield* walk(full)` が `lstat` でなく **`statSync`** でエントリを stat するため、dangling symlink(リンク先欠落)で `statSync` が ENOENT を throw する。preserved 除外(`:155-157` `isPreserved`、`:192` の適用)は walk の**後段**でファイル単位に効くため、walk 内の stat クラッシュを防げない。`--check` 経路(`:207` `function check`)も orphanedFiles(`:184`)経由でクラッシュが伝播する。
- **影響境界**: preserved 配下の symlink 健全性にゲート成否が依存する(ゲートの緑がゲート対象でなく symlink 状態に依存)。
- **修理の型**: walk を lstat 化(symlink を stat しない)、または preserved サブツリーを走査段階で prune(`isPreserved` を walk 内へ前倒し)。check/apply 両経路が orphanedFiles 経由のため単一修正で両復旧。
- **行番号**: 起票時 `:145` → 現行 `:146`(+1)、その他は関数境界同型で近傍一致。

### #740 — shields.io エスケープの片側適用(`scripts/release-version-sync-plan.ts`)

- **欠陥**: `:30` の accept regex `/badge\/version-[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?-blue/` は prerelease サフィックスを受理するが、`:31` の replacement `(v) => \`badge/version-${v}-blue\`` は**生バージョン文字列を埋め込む**だけで、prerelease の `-` を shields.io 用に `--` エスケープしない。受理側(prerelease 許容)と生成側(エスケープ不履行)の非対称で、prerelease バッジが 404 になる。
- **影響境界**: `.github/workflows/release.yml:36` の `options: [patch, minor, major]`(prerelease 選択肢なし)により標準経路から prerelease 到達不能=P3 根拠と整合。
- **修理の型**: replacement 側で prerelease サフィックス内 `-` を `--` エスケープ + accept 側もエスケープ済み形を受理して冪等性を維持。plan.ts 単一 seam の局所変更(CLI `release-version-sync.ts:20` は plan から `planVersionSync, VERSION_SURFACES` を import する薄いエントリで独自 accept regex を持たない)。既存の版同期系テスト(t68)への波及確認が要る。
- **注**: Issue 本文は accept を `release-version-sync.ts:23` と表記するが実体は同 seam モジュール `release-version-sync-plan.ts:30`(1ファイル取り違え)。指す規則(accept/replacement の非対称)は plan.ts に実在。

### #784 — parse-don't-validate の非対称(`tests/gen-coverage-registry.ts`)

- **欠陥**: `:1243` `if (!existsSync(RATCHET_PATH))` は不在時に `RATCHET FAILED:` 整形診断を出すが、`:1250` `JSON.parse(readFileSync(RATCHET_PATH, "utf-8")) as RatchetDoc` は**検証なしの素 JSON.parse** で、malformed JSON は SyntaxError を無診断 throw、`:1253` `baseline.coveredByClass[c] ?? 0` は形状仮定アクセスで `{}` 入力時 TypeError。存在チェックだけ整形済みで parse/shape は未整形、という parse 経路の片側適用漏れ。兄弟 `tests/coverage-project-gate.ts` の `parseTotalsText`(`:89`、`:188` で `GATE FAILED [MALFORMED]` の整形診断+exit 1)が正の型で、同一リポ内で同種入力(壊れた JSON baseline)への処理が非対称。
- **影響境界**: fail-closed(exit 1)は維持され誤 green はない。欠陥は診断可読性に限局(機能破綻でも誤 green でもない)。
- **修理の型**: `coverage-project-gate.ts` の parseTotalsText と同型の parse-don't-validate を runCheck の ratchet 読み込みへ導入。env seam `AMADEUS_COVERAGE_RATCHET`(`:104-105`)が既にありテスト注入可能。
- **ラベル判定(Developer が再確認)**: 現ラベル **bug/P3/S4-MINOR/origin:bootstrap は変更不要**。bug(誤 green でないが無診断スタックトレース=診断品質欠陥)、P3(CI を止めるが回避可・正しさ/安全性の破綻でない)、S4-MINOR(兄弟非対称を現物裏取り、影響は診断可読性限局)、origin:bootstrap(導入コミット `5cfb16165`、intent record なし)いずれも妥当。
- **行番号**: 起票時 `:1250-1252` → 現行 `:1250/:1253`(+1 以内)。

## core-repair-batch3 の観測面 — read/write 非対称・prototype-chain 残余・非アトミック書き込み・時間依存テスト(#746 / #786 / #742 / #743 / #747 / #741 / #751 / #744 / #749 / #750)

現行 HEAD `58f3453ad` で確定(焦点コードは base `da1611a9a`→observed でいずれも無変更、10 Issue 全件現存。下記は現行コード直読の静的分析)。詳細な file:line 一次記録は当該 intent(260710-core-repair-batch3)の `inception/reverse-engineering/scan-notes.md`、横断整理と修理設計空間は architecture.md の同名節を参照。バッチ3は単一クラスに収斂しないが、品質観点では以下の4アンチパターン群に分類できる。

### read/write 非対称クラスタ(#746)

- **anchor 対応の片側適用**: `amadeus-lib.ts:1905-1907` の `worktreePath(projectDir, boltSlug)` は生 `join` で anchor 概念なし(読み手 `amadeus-swarm.ts:233`)。対して write 側 `amadeus-worktree.ts:316/403/621` は `worktreeBaseDir(…)`(`resolveMainCheckout` :155 / `worktreeBaseDir` :214)で anchor 対応済み。同一パスを組む2つの規則が read/write で食い違う。sibling セッション駆動時に write と read が別ディレクトリを指す。
- **生 read 消費者の広がり**: `amadeus-bolt.ts:653`・`amadeus-audit.ts:456/:570`・`amadeus-runtime.ts:1200/:1291`・`amadeus-state.ts:2600/:2754`(`flags["target-dir"] ?? worktreePath(pd, slug)`)・`amadeus-utility.ts:960/:1074` が同型の生呼び出し。修理は単一 anchor 規則へ統一(lib 昇格 or worktree_path 引き回し)。
- **凍結すべき不変条件**: worktree パスの導出規則は write/read で単一。sibling/anchored 環境でも読み手が書き手と同じ base を解決する。

### prototype-chain 残余サイト(#744、#788 の未完部分)

- `PHASE_NUMBERS`(`amadeus-lib.ts:86`、object literal)への生インデックスが3サイト現存: `amadeus-orchestrate.ts:2194`(`canonicalisePhase`)・`amadeus-jump.ts:176`・`amadeus-state.ts:2512`。`Object.hasOwn` ガードなしで `constructor`/`__proto__` が truthy な Object/proto を返し `!canonical` ガードすり抜け → `amadeus-lib.ts:4124` `phase.toLowerCase()` で TypeError crash。
- **バッチ D #788 との同根**: #788 は graph/runtime の dispatch 表に `resolveOwnHandler`(`Object.hasOwn`)を導入したが「lib 共有を避けてローカル保持」と明記。#744 は同一クラスの values 面で未対処。前例に倣うなら**各サイトへローカル own-key ガード適用**が整合し、これで U6 は lib を触らず U1(#746)との交差が消えて並行可能になる(設計含意は architecture.md 参照)。
- **将来顕在化型**: `input.toLowerCase()`(:2192)で全小文字 `constructor`/`__proto__` のみ漏れる稀な crash。exit code/audit を汚す前に弾く硬化が要る。

### 統合境界のエラー握りつぶし + 非アトミック書き込み(#742 / #743、2件連鎖)

- **#742**(err swallow): `packages/setup/src/domain/installation.ts:28-45` が `manifestIo.read` 結果を `:30` `type === "ok" && value !== null` でのみ分岐し **err をフォールスルー**(err と absent を同一視)→ `:44` `noneInstallation()` 誤案内。`manifest-io.ts:19-30` は absent→`ok(null)` / I/O・malformed→`err` を区別しているのに detect 戻り型 `Installation` に err チャネルが無く区別が消滅。「存在するが読めない/壊れている」が診断不能。
- **#743**(非アトミック write): `packages/setup/src/ports/fsops.ts:66` `writeText` の直接 `writeFile`(temp→rename なし。#773 traversal guard 改変で無変更)。`manifest-io.ts:33-38` の唯一の書き込み経路が使用。kill-mid-write の truncated JSON が **#742 がちょうど誤処理する入力を生成**する連鎖。
- **凍結すべき不変条件**: 統合境界(fs I/O)は err を握りつぶさず呼び出し元へ表面化。manifest 書き込みは POSIX アトミック(temp write → same-dir rename)。

### 時間依存・順序依存の脆さ(#741 / #747)

- **#741**(wallclock フレーク): `tests/integration/t90.test.ts:503` test 13 が `setTimeout(2000)` 2回 + `new Date().toISOString()` 秒精度比較で MEMORY_EMPTY Timestamp の前後関係を pin。並列負荷下でスケジューラ遅延が境界を不安定化 → 間欠 fail。**プロダクト(runtime compile 計数)側 vs テスト決定性欠如の切り分け未了**。
- **#747**(prerelease 順序無視、潜在): `internal/semver-factory.ts:15-21` `isLaterThan` が major/minor/patch のみ比較し prerelease を見ない(`:20` out of scope)。`upgrade.ts:42` が誤境界判定(`1.0.0-rc.1`→`1.0.0` が非 proceed)。リポに prerelease タグ非存在ゆえ潜在、発行時顕在化。**#774(バッチ D)が resolver exact 経路を書き換えたため #747 Issue の resolver:60-65 参照は stale だが、根本原因の semver-factory は無変更で現存**(architecture.md 参照)。

### レガシー定数への stale 参照(#751)

- `amadeus-codex-adapter.ts:193/198` の SESSION_ENDED reconcile が `amadeus-docs`(= `FLAT_MIGRATION_ROOT`、`amadeus-lib.ts:850` のマイグレーション専用レガシー定数)を参照 → 現行レイアウトで `:198` early-return 常真、reconcile 常時不発。正準は `hooksHealthDir()`(`amadeus-lib.ts:2120`)。`:59` の `stateFilePath` import が reconcile 未使用(mint 側のみ使用)= 内部不整合の証左。実害は codex SESSION_ENDED の監査欠落(観測性のみ)。

### 生 NUL バイト混入(#786、検証規律への実害)

- `amadeus-learnings.ts:571` emitKey に生 NUL(python 実測: blob 内1個、offset 22828)。in-memory Set 専用(`:574`/`:603`)で永続化されず bun/tsc 受理 → **ランタイム無害・grep binary 誤判定で検証規律に実害**。全7コピーへ dist:check バイト一致で伝播。導入 PR #780。修理は可視区切りへ、挙動不変。

### テスト面(現状カバレッジと欠落 — いずれも「落ちる実証」対象)

- **#746**: sibling/anchored 環境で read が write と同じ base を解決することを pin する回帰(生 read が別ディレクトリを指す現状を再現)。
- **#744**: `canonicalisePhase("constructor")` 等が null を返し crash しないことを pin。
- **#749**: single で construction 先頭ステージが determinate gate を emit(現状 `GATE_UNRESOLVED` 詰みを再現)。**#750**: Kiro latch ターン一致時の素 `next --new-intent` が birth に至ることを pin。
- **#742**: 破損 manifest 存在時に absent と区別して表面化。**#743**: kill-mid-write シミュレーションで truncated JSON が残らない。**#747**: prerelease タグ fixture で正しい proceed/downgrade 判定。
- **#741**: wallclock 依存の除去(決定化)。**#751**: 現行レイアウトで reconcile が発火し SESSION_ENDED を emit。**#786**: emitKey に NUL バイト不在(byte 走査)。


## 複雑度ゲート導入(intent 260710-complexity-gate、2026-07-10)

現行 HEAD からの diff-refresh(フォーカス5面)で確定した、複雑度分布の実測とゲート計画。出典: lizard 実測 + scan-notes + initiative-brief。

### 複雑度分布の実測(lizard、2026-07-10)

- **総関数数 1,093**(lizard が計測した全関数)。うち **CCN(cyclomatic complexity number)> 15 が 42 関数**、CCN 30+ が 12 関数(バグの原因所在分析でバグ多発ファイルに集中)。最大は `blockBoltSlug` の **CCN 65**。
- この 42 関数を baseline として grandfather(現存の高複雑度を許容)し、新規の閾値超過とラチェット悪化のみを赤にする fail-closed 方式。

### 複雑度ゲート導入計画(2層ゲート)

- **方式(確定)**: Biome `noExcessiveCognitiveComplexity`(warn 層)+ lizard CCN の baseline ラチェット(block 層)の2層。
- **閾値**: 初期 CCN 15 で block(E-CX1 Q1=C)。将来の 10 への段階降下は分布改善後にノルム選挙で判断する Issue を起票(受け入れ基準に含む)。
- **Biome スコープ拡大**: biome check の対象へ `packages/framework/core` + `scripts` を追加(E-CX1 Q2=A)。既存6指摘の機械的修正を同一 PR に含む。
- **CI 配置**: 既存 `check` ジョブに lizard ステップを追加(pip 固定インストール、typecheck/lint 直後、E-CX1 Q3=A)。
- **落ちる実証**: NEW_VIOLATION / RATCHET_REGRESSION / fail-closed 各系の注入テスト(team.md Mandated「落ちる実証」)。ゲート実装は `tests/coverage-project-gate.ts`(#762)の正準テンプレート(env seam・parse-don't-validate・fail-closed FailReason・`--check`/`--update`)を踏襲する(architecture.md / code-structure.md 参照)。
- **業務根拠**: バグの原因所在分析(2026-07-10)で実装逸脱・非対称実装が上位原因であり、その温床の高複雑度関数がバグ多発ファイルに集中。人手レビューに頼らない決定的ラチェットで悪化を構造的に止める。
- **残余リスク**: baseline キー(path+name)のリネーム摩擦(R2、頻発時は関数 fingerprint キーへ移行 Issue 化)、lizard の TS 新構文計測ゆらぎ(R1、計測補正で対応、誤検知の握りつぶしはしない)、CI の Python 供給変化(R3、バージョン固定・最悪時 vendoring)。



## mint-presence-vectors(履歴)の観測面 — #755 機械注入ターン分類器の単一プレフィックス欠陥

現行 HEAD(`fc5a34cf1`、base `584262c1a` からの diff-refresh。フォーカス面のコード diff は空で、下記はすべて現行コード直読 + 当該 intent(mint-presence-vectors)の動的/法医学的実測に基づく)で確定した、human-presence 分類器の注入ターン取りこぼしの観測。base/observed の真実源は `re-scans/260710-mint-presence-vectors.md`。

## tools-dispatch-batch の観測面 — caller 供給パラメータの照合欠落と dispatch/prune の非対称(#774 / #785 / #787 / #788 / #789)

現行 HEAD で確定(焦点5ファイルは base→observed でコード diff 空。`amadeus-runtime.ts` のみ #781 で改変されたが dispatch site を含む hunk は無し。下記は現行コード直読の静的分析)。詳細な file:line 一次記録は intent `260710-tools-dispatch-batch`(2026-07-10)の `inception/reverse-engineering/scan-notes.md`、横断整理は architecture.md の同名節を参照。5欠陥は「caller 供給の遷移/ディスパッチ/ページング境界パラメータを、enum・SKIP・存在チェックのみで受理し、index・方向・prototype-own・全件走査の照合をしない」同一クラスで、いずれも導出版(権威経路)が併存しながら実経路がそれを迂回する。

### #787 / #789 — caller 供給遷移パラメータの照合欠落(方向盲目)

- **#787**(`amadeus-jump.ts` handleExecute `:220-`): `direction = flags.direction`(`:228`)を enum メンバーシップのみ(`:229-235`)で受理し target/current の index 関係を再検証しない。同ハンドラ内 scope 側は再検証あり(`:250`/`:256`)=**非対称**。権威版は `handleResolve`(`:173-180`)が direction を index から導出。resolve を迂回した `--target <過去> --direction forward` で後退なのに前進 skip 副作用(`:289-311`)が走る。
- **#789**(`amadeus-state.ts` advance): 2 引数 `nextSlug`(`:1006-1007`)を `nextAction === "SKIP"` 拒否のみ(`:1010-1018`)で受理し隣接性・index を見ない。省略時は `nextInScopeStage`(`:1019-1028`)で導出=権威。さらに `crossesPhaseBoundary`(`:1077`)が **方向を見ない** phase 不一致判定で、別 phase の nextSlug を渡すと後退/横断でも `PHASE_COMPLETED`/`PHASE_VERIFIED`/`PHASE_STARTED`(`:1103-1126`)を鋳造。→ 誤方向の phase 境界イベントが emit されうる(虚偽の phase 進行)。
- **凍結すべき不変条件**: 遷移パラメータは caller 供給値を enum/SKIP チェックだけで信頼せず、resolve と同じく index から導出/照合し、phase 境界判定は方向(前進のみ)を条件に含める。

### #788 — 生 object-index dispatch の prototype-chain 露出(検証機構外の関数実行)

- `amadeus-graph.ts:1901` `COMMANDS[cmd]`(定義 `:1670`)/ `amadeus-runtime.ts:1453` `SUBCOMMANDS[cmd]`(定義 `:1412`)がユーザー供給 `cmd` をブラケット index するため prototype chain を辿る。`cmd === "constructor"`/`"toString"`/`"hasOwnProperty"` 等で Object.prototype の truthy 関数が返り `if (!handler)` ガード(graph `:1902`/runtime `:1454`)を通過して呼び出す(graph `:1910`/runtime `:1459`)。
- **全 tools 中この2サイトのみ**が生 object-index 方式で、他はすべて switch(prototype 汚染に無縁)。防御候補 `Object.hasOwn` / `Object.create(null)` / switch 化は未適用。#744 既知の `PHASE_NUMBERS[…]` 生 index(orchestrate/jump/state)は同型だがバッチ D スコープ外。
- **将来顕在化型**: 現状は不正 subcommand 名で稀に非ハンドラ関数を呼ぶ将来リスク。exit code/audit を汚す前に弾く硬化が要る。

### #785 — runner-gen write/check の走査源非対称(修復不能な赤ドリフト)

- `handleWrite` の prune(`:295-300`)は `loadGraph()` 現存ノードのみ走査 → graph から消えた slug の orphan runner dir は反復対象外で **write では永久に到達不能**。`handleCheck`(`:343-365`)は FS 走査 `onDiskRunnerSlugs()`(`:324-336`)− `compiledSet` で orphan を正しく検出・flag(`:361`)し、修復案内(`:363`)が `write` を指すが、その write は当該 orphan を消せない → **ドリフトガードが赤のまま解消できない詰み**。
- **state/checkbox 乖離型**: 検出条件(FS 実在 − compiled)と修復条件(graph 現存)が非対称で、ガードが指す修復手段が検出対象を満たせない。走査源を FS 側へ揃えるのが修理方向(決定は requirements)。

### #774 — setup version resolver のページング欠落(無言の版取りこぼし)

- `resolver.ts` の URL(`:13-14`)に `per_page` 無し(既定30件)、`fetchNames`(`:22-37`)が単発 getJson で Link 追従なし、`resolveVersion`(`:57-79`)の exact/latest とも単一ページ制約を継承。ポート `http.ts` の `getJson`(`:9-12`/`:23-33`)が **JSON body のみ返しヘッダ非露出**でページング実装が不能。BR-F09(`:12`、1 resolve ≤2 API call)が全件走査より優先され、**版数が30超で新版を無言に発見できない**(notFound 誤失敗 / 最新取りこぼし)。
- **無言偽成功型 + 設計緊張**: 誤って notFound/取りこぼしを返す点が静かな正しさ破綻。BR-F09 制約と全件走査要件の緊張が争点で、修理は「上限維持のページング再定義」か「上限緩和」かを requirements で確定する必要がある。

### テスト面(現状カバレッジと欠落)

- いずれも「落ちる実証」対象。#787/#789 は resolve/導出版と execute/2 引数版の**方向取り違え**を突く回帰(過去 stage を forward 指定 → 副作用差)が要る。#788 は `cmd="constructor"` 等で prototype 関数が呼ばれない(未知コマンドとして拒否される)ことを pin。#785 は graph から消えた slug の orphan dir を注入し `check` 赤 →(修理後)`write` が消せることを実証。#774 は31件超の tags/releases fixture で目標版を発見できることを実証。既存テストにこれらの負の実証は不在(scan-notes 実測)。

## learnings-audit-batch の観測面 — §13 learnings の persist 判定と runtime 集計窓(#754 / #745 / #761)

現行 HEAD で確定(両焦点ファイル `amadeus-learnings.ts` / `amadeus-runtime.ts` は最終変更 `0801d2100`=2026-07-07、base→observed でコード diff 空。下記は現行コード直読の静的分析)。詳細な真理値表とデータフローは architecture.md の同名2節を参照。

### #754 / #745 — persist dedup 判定マトリクスの2穴(同根)

- **共通根**: `handlePersist`(`amadeus-learnings.ts:411-608`)の `withAuditLock` ボディで、重複判定入力 `hasRow` が `:431` の**静的 audit スナップショット**由来(ループ内 `appendAuditEntryUnlocked` `:492` で再読込されない)、かつ `priorAuditRow`(`:348-358`)が `(Stage, Candidate-ID)` のみ照合し **Destination を無視**、加えて `hasLine`(`:476`)が per-file 累積で cross-file を見ない。
- **#754**(同一 file・cid 衝突): 真理値 `hasRow=F, hasLine=T` で行書き込みスキップ(`:483`)+ RULE_LEARNED emit(`:491`)→ audit 行のみ増え practice 行が伴わない row/line 不一致。
- **#745**(別 file・同一 cid): project→team の順で同一 cid を振ると両者 `hasRow=F`(snapshot が先行 emit を見ない)・`hasLine=F`(別 file)で **RULE_LEARNED 二重 emit**。
- **凍結すべき不変条件**: 1 `(Stage, Candidate-ID)` につき RULE_LEARNED は最大1行、かつ audit 行があれば必ず対応 practice 行が存在。
- **テスト欠落**: t99 は異なる cid の2 emit(Case 1)と同一 selection 再実行の直列化(Case 5)を pin するのみで、同一 cid の複数宛先(#745)/ cid 衝突(#754)は未カバー。t112 は sensor guard 専用。

### #761 — per-unit stage の learnings 集計が常に 0

- **欠陥**: instance-bearing(construction・window 内 STATE_FORKED distinct slug ≥2)parent stage の `learnings_captured` が `:739` で `countLearnings` 再計算されず、rollup が置いた `{0,0}`(approved 時)固定のまま。実際に RULE_LEARNED 行があっても数えない。
- **窓終端のデータフロー**: rollup(`:375`)が親 STAGE_COMPLETED を `completed_at` に置くが、BoltInstance populator が `:551` で `null` 上書きし、以後スキーマ(`:83-105`)に保持先がない。
- **e6 訂正の妥当性**: RULE_LEARNED は親ゲート承認時(最終 STATE_MERGED = `parentEnd` より後)に emit されるため、窓終端を `parentEnd` にすると `countLearnings` の `ev.timestamp >= windowEnd`(`:693`)で全除外され 0 のまま。よって窓終端は**親 STAGE_COMPLETED or null(open)**が正。`maxInstanceCompletedAt`(`:1034`)は parentEnd 同値で流用不可。

## mint-presence-vectors の観測面(前 intent、履歴)— #755 機械注入ターン分類器の単一プレフィックス欠陥

現行 HEAD(`fc5a34cf1`、base `584262c1a` からの diff-refresh。フォーカス面のコード diff は空で、下記はすべて現行コード直読 + 当該 intent(mint-presence-vectors)の動的/法医学的実測に基づく)で確定した、human-presence 分類器の注入ターン取りこぼしの観測。base/observed の真実源は `re-scans/260710-mint-presence-vectors.md`。

### #755-O1 — mint 分類器が単一プレフィックス startsWith しか見ず、teammate-message(形式 D)を素通しさせる(確定ベクタ)

- **単一プレフィックス判定**: `packages/framework/core/hooks/amadeus-mint-presence.ts` は `MACHINE_INJECTED_PROMPT_PREFIX = "<task-notification>"`(`:47`)を唯一の抑止シグネチャとし、`isMachineInjectedTurn()`(`:51-66`)は `prompt.startsWith(MACHINE_INJECTED_PROMPT_PREFIX)`(`:62`)だけで機械注入を判定する。先頭バイト一致のみのため、`<task-notification>` 以外の開頭を持つ全注入ターンが素通りして `appendAuditEntry("HUMAN_TURN", {}, projectDir)`(`:71`)で phantom HUMAN_TURN を鋳造する。
- **確定ベクタ = 形式 D(teammate-message)**: agmsg/SendMessage の inbox 配信は user-role ターンとして `Another Claude session sent a message:` 開頭で届き、`<task-notification>` プレフィックスに一致しないため無条件に鋳造される。本番 amadeus transcript 2 セッションで計 **18 件**の実注入を確認(worktree-engineer3=11、worktree-engineer2=7)。これが #755 の実害源。
- **形式 A(裸 `<task-notification>`)は正しく抑止**: 本番 monitor 注入は **439/439 が裸の形式 A** で配信され、startsWith が正しく弾く(t203:90-94 の pin と一致)。
- **形式 B(`[SYSTEM NOTIFICATION - NOT USER INPUT]` 前置き)は合成でのみ鋳造・本番非該当**: 合成 stdin では preamble により startsWith が失敗し鋳造する(測定 HUMAN_TURN=1)が、当該前置き文字列は amadeus 本番 transcript に **0/439 で不在**・レポジトリコードにも不在(grep ヒットは #755 バグ記述のみ)の外来ハーネス artifact。e1(「B も鋳造」)は合成ペイロード限定で真、本番の注入形式は裸 A のため非該当。争点は e6(確定ベクタは D)が正。

### #755-O2 — stop.ts tier-3(`transcriptIsConversational`)が同カタログを共有せず、A も D も素通り(同根・露出大)

- **tier-3 の無防備**: `packages/framework/core/hooks/amadeus-stop.ts` の `transcriptIsConversational()`(`:581-737`)は終端ターンの会話性で tier-3 会話カーブアウト可否を決めるが、user-role ターンの除外ヘルパ `isInjectedHookFeedback()`(`:568-`)は `"Stop hook feedback:"` 系の自己注入しか弾かない。task-notification(A)も teammate-message(D)も除外対象に無く、両形式とも `humanPrompt=true` として「直近の genuine human prompt」に採用される(`:721-728`)。
- **mint より露出が大きい**: mint は少なくとも startsWith で形式 A を弾くが、tier-3 には marker チェックが**皆無**で A・D の双方が素通りする。終端が注入ターンで後続 engine call が無い場合(`:731-736`)、`isConversationalStop`(`:753`)が機械注入 ping を人間チャットと誤認し会話カーブアウトを付与しうる。#755 と**同根**(注入ターンを人間ターンと誤認)であり、修正時は mint hook と共通の注入カタログを共有すべき。

### #755-O3 — HUMAN_TURN 消費系への波及と t203 のカバレッジ欠落

- **presence gate**: `humanActedSinceGate(projectDir, verb?)`(`amadeus-lib.ts:1507-1546`、判定 `:1544` `lastHuman > lastResolution`)は phantom HUMAN_TURN が gate 後に鋳造されると true に転じ、無人でゲート解決が通る。消費点は `assertHumanPresentForGateResolution`(`amadeus-state.ts:1456`)。
- **委任 provenance 汚染(#671)**: `handleDelegateApproval` は DELEGATED_APPROVAL を自 shard の最新 HUMAN_TURN timestamp で grounding する(`amadeus-state.ts:1645`、`handleDelegateRejection` は `:1715`)。形式 D 由来の phantom HUMAN_TURN がこの grounding を満たし、`verifyDelegatedProvenance` が on-disk 実在(ただし phantom)の HUMAN_TURN を根拠に委任を受理する。これが #755 が「#671 委任 provenance を汚染」と述べる経路。CLI minting guard(`amadeus-audit.ts:753/768`)は模倣鋳造を拒むが、UserPromptSubmit hook 自身の in-process 鋳造は正規経路のため、分類漏れ鋳造はこの guard を通り抜ける。
- **t203 の形式 D テスト不在**: `tests/unit/t203-mint-presence-classify.test.ts` は現状 form A 抑止のみを pin し、`grep "Another Claude session" tests/` はヒット 0。#755 修正は t203 に form D の RED→GREEN ケース追加を要する。
- **修正方針への含意(所見のみ、修正はスコープ外)**: 分類は単一 marker の startsWith では不十分で、実注入形式のカタログ(最低でも `<task-notification>`(A)と `Another Claude session sent a message:`(D))を網羅し、mint hook と stop.ts tier-3 で共有すべき。

## packaging の source 側 unreferenced 検査ギャップ(intent 260710、#735)

> 前回 intent の2バグは出荷済み: **#685→#729**(`DELEGATED_REJECTION` 追加)、**#670→#727**(worktree write パスのアンカー化)。以下の #685/#670 節は歴史的記録。

### 技術的負債: build 入力の source 側に未参照検出がない

| リスク | 影響 | 注記 |
| --- | --- | --- |
| **#735**: `harness/<name>/` の manifest 未参照ソースが build 不可視のまま残存しても何も鳴らない | 中(dead source の蓄積、意図せぬ「出荷したつもり」の欠落) | `checkHarness` の orphan scan(`package.ts` L574-628)はすべて**出力側**(committed dist vs 再ビルド dist)で働く。harness ソースは `harnessFiles` に列挙された `src` のみコピーされる(L357-363)ため、未列挙ソースは dist に到達せず出力側検査に載らない。source 側に「全 authored ファイルが manifest から参照されているか(または既知の build 機構ファイルか)」を照合する検査が存在しない |
| **vacuous exemption アンチパターン(#719/#737 の実害)** | 中(検証劇場: 存在しないものを除外する「文書のふりをした」regex) | kiro CLI manifest の `authoredExempt` に `/^hooks\/[^/]+\.kiro\.hook$/` があったが、kiro CLI は `.kiro.hook` を dist へ一切出荷しない(hooks は `agents/amadeus.json` 経由)ため、この regex は**何にもマッチしない vacuous な除外**だった。一方で同名のソース7個が `harness/kiro/hooks/` に manifest 未参照のまま滞留していた。exemption が「未参照ソースの存在を正当化しているかのように」読めてしまう点が負債。#737 は7ソース削除 + exemption 除去 + `t148` 再注入ガード追加で是正 |

### #735 修理時の設計上の注意

1. source-unreferenced check は **build 機構ファイル**(`manifest.ts`/`onboarding.fills.ts`/codex の `emit.ts` — いずれも `package.ts` が `require()` で読み dist へコピーしないモジュール)を誤検出しない除外設計を要する。この3種は「正当に未参照(=出荷されない)」なソース。
2. 検査は「dist 全域 orphan scan(#711)」の source 側対称物として位置づけると一貫する: 出力側は「期待出力集合に属さない committed dist ファイル」を鳴らし、source 側は「manifest 参照集合にも build 機構集合にも属さない authored ソース」を鳴らす。
3. team.md Mandated の「落ちる実証」に従い、未参照ソースを注入して検査が赤くなることを実証してから完成扱いにする(#737 が `t148` で `.kiro.hook` 注入 → 赤、除去 → 緑を実証した先例に倣う)。

## 260709-gate-mechanics(前 intent、履歴)対象2バグの評価

## delegate-answer-consume intent(260710、#736)の観測面 — 委任発行 grounding の QUESTION_ANSWERED 先食い

現行 HEAD(`5e9040cda`)の実コードを直接読解して確定した、委任機構の presence 境界の観測(欠陥候補と検証ギャップ)。差分ベース `24197d755`→`5e9040cda` の実体は **#685(verb-scoped provenance + `DELEGATED_REJECTION`)** の実装で、フォーカス3ファイル(`amadeus-lib.ts`/`amadeus-state.ts`/`amadeus-audit.ts`)はいずれも base→HEAD 間で改変済み。`amadeus-log.ts`(QUESTION_ANSWERED emit 側)は無変更。

### #736-O1 — 委任発行 grounding が verb 無しで QUESTION_ANSWERED に先食いされる(最重要・仮説/根本原因候補)

- **境界イベント集合に QUESTION_ANSWERED が含まれる**: `GATE_RESOLUTION_EVENTS = new Set(["GATE_APPROVED", "GATE_REJECTED", "QUESTION_ANSWERED"])`(`amadeus-lib.ts:1506`)。QUESTION_ANSWERED は非-human の **resolution 境界**として扱われる。
- **`humanActedSinceGate` のセマンティクス**: `humanActedSinceGate(projectDir, verb?)`(`amadeus-lib.ts:1507-1546`)は「直前の resolution より後に human 行為があるか」を返す(`return lastHuman > lastResolution && lastHuman !== -1`、`:1544`)。ledger 空は fail-open で `true`(`:1512`)。委任イベントは verb でスコープされ、`DELEGATED_APPROVAL` は `verb !== "reject"`、`DELEGATED_REJECTION` は `verb !== "approve"` のときだけ `verifyDelegatedProvenance` で検証される(`:1519-1524`)。
- **[仮説/根本原因候補]** 委任**発行**側の grounding gate は **verb 無し** `humanActedSinceGate(pd)` を呼ぶ: `handleDelegateApproval`(`amadeus-state.ts:1625`)と `handleDelegateRejection`(`amadeus-state.ts:1719`)の両方。リーダー ledger 上で `HUMAN_TURN → (interview 応答) QUESTION_ANSWERED` の順になると、`lastResolution(QUESTION_ANSWERED) > lastHuman` となり `false` を返し、**委任発行を誤って拒否**する。すなわち interview 応答の QUESTION_ANSWERED が delegate 発行の human presence を「先食い」する。これが #736 の機構(発行側での消費)と整合する。
- **verb スコープでは解けない直交性**: QUESTION_ANSWERED は委任 type ではなく `GATE_RESOLUTION_EVENTS` の resolution 要素であるため、`humanActedSinceGate` の `verb` 引数の分岐(`:1519-1524`)の影響を受けない。#685 の verb-scoped 足場は既に完成しているが(下記 O3)、**#736 は verb スコープと直交**する。→ 修正は境界イベント集合の定義、または answer/delegate 経路の境界セマンティクスに触れる可能性が高い。確定方式は functional-design 以降に委ねる。

### #736-O2 — 回帰テスト未整備・t188 の 1-answer/turn 契約との両立が要件

- **交差ケース不在(実測)**: `tests/unit/t112-delegated-approval.test.ts` に対する `grep QUESTION_ANSWERED` はヒット 0。委任発行側で「HUMAN_TURN 後に QUESTION_ANSWERED があると発行が誤拒否される」#736 の回帰テストは**現存しない**。t112 が pin するのは verifyDelegatedProvenance の grounding 証明・`humanActedSinceGate` の委任 approve gate・#685 の verb 壁(DELEGATED_APPROVAL は reject gate を開けない/逆も)・delegate-rejection writer 発行ゲート・CLI minting guard で、QUESTION_ANSWERED×委任 の交差は含まれない。→ 修正では新規テスト追加が必要。
- **両立要件(1-answer/turn 契約)**: `tests/unit/t188-human-presence-gate.test.ts:325-348` の handleAnswer twin が「HUMAN_TURN 有りで 1 answer commit → 同 turn 2 回目は QUESTION_ANSWERED が新境界となり refuse」を pin している。これは #736 が問題視する「QUESTION_ANSWERED が境界を進める」挙動を answer 経路で**意図的に固定**した契約。→ #736 の修正は、answer 経路の consume-once 契約(1 human turn = 1 answer、`amadeus-log.ts:122-125` コメント)を壊さずに、delegate 発行経路が同じ QUESTION_ANSWERED に先食いされない設計を要する。両経路のトレードオフが functional-design の要点。

### #736-O3 — #685 verb-scoped provenance 足場は既実装・dist 同期義務

- **verb 足場は完成済み**: `amadeus-lib.ts:1519-1524`(verb 分岐)、`amadeus-state.ts:1443-1456`(`assertHumanPresentForGateResolution` が approve/reject へ verb forward、`:1456` `humanActedSinceGate(pd, verb)`)、`amadeus-audit.ts` の `DELEGATED_REJECTION` 定義、`audit-format.md` / `docs/reference/12-state-machine.md` のレジストリ行。修正方式 B(verb-scoped）に乗せる基盤は整備済み。
- **dist 同期義務**: フォーカス3ファイル(lib/state/audit)は生成コピーを `.claude/tools/`・`.codex/tools/` の両方に持つ(全6コピー)。core 改変時は `bun scripts/package.ts` + `bun run dist:check`、`bun run promote:self` + `bun run promote:self:check`、`bun run typecheck` / `bun run lint`(Biome)、audit event を触るなら `t28-audit-event-sync`(2ファイル間 taxonomy sync)を green 維持し、**core+dist+self-install を同一コミットで揃える**(team.md Mandated)。

## kiro-stale-hooks(intent、履歴)の確認済み欠陥 — #719(P3 / source hygiene)

現行 HEAD(`e1a07fada`、base `24197d755` からの diff-refresh)の実コードを直読して file:line を確定した、drift-guard の2層マスキング欠陥1件。Developer(スキャン)→ Architect(合成)の2サブエージェント直列で実施(cid:reverse-engineering:c3)。base→HEAD 差分13ファイルは本フォーカス面(kiro ハーネスの hook 出荷経路・orphan 検査機構)に非関与(監査エスケープ #204/#205・テストサイズ動的計測系)のため、下記はすべて現行コード直読による。base/observed の真実源は `re-scans/260710-kiro-stale-hooks.md`。

### #719 — Kiro CLI の unshipped な stale `.kiro.hook` を drift-guard が検出できない(2層マスキング)

- **欠陥の本体(dead な source)**: `packages/framework/harness/kiro/hooks/` に 7 件の `.kiro.hook`(audit-logger / log-subagent / runtime-compile / session-end / session-start / stop / sync-statusline)が source に残存するが、kiro CLI はこれらを**出荷も登録もしない**。出荷は `manifest.ts` が hooks 由来を adapter 1 件(`{ src: "hooks/amadeus-kiro-adapter.ts", ... }`、`:55`)のみ列挙し `.kiro.hook` を harnessFiles に1件も含めない。登録は `agents/amadeus.json` の `hooks` オブジェクト経由で全 seam が `amadeus-kiro-adapter.ts` を叩く(`.kiro.hook` は登録経路にも不在)。→ 7 件は出荷・登録とも完全に冗長。うち `amadeus-session-end.kiro.hook` のみ command が `bun .kiro/hooks/amadeus-session-end.ts`(adapter 非経由)で内容ドリフトしており(CLI/IDE 分離前の残骸)、他 6 件は kiro-ide 版と同内容。
- **1層目(主因)= source 側 orphan 検査機構の不在**: `scripts/package.ts` の `checkHarness(name)`(`:554-633`)は committed dist ツリー(`dist/<name>/`)と tmp build 出力のみを walk し、**source(`harness/<name>/`)を走査する経路が存在しない**。built→committed(MISSING/DIFFERS `:565-573`)、harness-dir subtree orphan(committed→built、authoredExempt 消費 `:579` / ORPHAN 判定 `:580`)、whole-tree orphan(`:605-628`、ORPHAN 判定 `:626`)のいずれも dist 側しか見ない。kiro CLI は `.kiro.hook` を dist に投影しない(`dist/kiro/.kiro/hooks/` の `.kiro.hook` は 0 件)ため、source の 7 件はどの walk にも載らず `bun run dist:check` は exit 0 で通過し、stale を一切検出できない。
- **2層目(補助的マスク)= 空振り authoredExempt regex**: `packages/framework/harness/kiro/manifest.ts:81` の `authoredExempt` 第3 regex `/^hooks\/[^/]+\.kiro\.hook$/` は「全 `.kiro.hook` を orphan 免除」するが、kiro CLI は `.kiro.hook` を 0 件出荷するため守る実体が無い純粋なマスク。万一 stale な `.kiro.hook` が dist に混入しても orphan 検査を素通りさせる第二の網として働く(コメント `:76-80` は regex1/2 の正当化のみで regex3 の根拠を記述しない)。対照的に `harness/kiro-ide/manifest.ts` は `.kiro.hook` を 9 件正当出荷(`:51-59`)し、同一 3 regex の authoredExempt(`:96`)は出荷対象という文脈で防御的に妥当。
- **同型性(#701 との関係)**: 本欠陥は下記 #701(orphan スキャンの dist ルート盲点)と同種の drift-guard 穴。#701 が「dist ツリー内の検査対象集合の穴」だったのに対し、#719 は「そもそも source 側を検査する機構が無い」という一段上流の穴で、2層目の空振り exemption がそれを補助的に隠す二段構え。#701 の whole-tree 化(`:605-628`)は dist 側の穴を塞いだが、source 側の未参照ファイルは依然どの検査にも当たらない。
- **テスト影響(削除の安全性)**: `tests/smoke/t148-kiro-file-structure.test.ts` は SHIPPED `dist/kiro` ツリーのみ(`hooks` の `.ts` ≥10 件を数える)、`tests/unit/t147-kiro-hook-adapter.test.ts` は `dist/kiro/.kiro/hooks/amadeus-kiro-adapter.ts` を subprocess 起動する。どちらも source の `.kiro.hook` を参照しない。リポ全体 grep でも source `harness/kiro/hooks/*.kiro.hook` を直接参照するテスト/スクリプトは皆無。→ 7 件の stale source `.kiro.hook` 削除は t147/t148 を含む既存テストを破壊しない(`bun test t148 t147` が exit 0 / 23 pass を実測)。
- **修正境界の候補**: (a) source の 7 `.kiro.hook` を削除して dead を排す、(b) kiro CLI manifest の authoredExempt regex3(空振りマスク)を除去して 2 層目を閉じる、(c) source 側 manifest 未参照ファイルを検出する検査機構を `checkHarness` に追加して 1 層目を塞ぐ。設計判断は requirements-analysis で確定。「落ちる実証」は source に stale `.kiro.hook` を残したまま検査が赤くなること(1 層目を塞ぐ場合)で担保する。


## dynamic-test-size(intent、履歴)の観測面 — #684 Phase D 実装への含意

現行 HEAD(`24197d755`)の実コードを直接読解して確定した、テストランナーの per-file 計測・永続化ライフサイクルの観測(欠陥ではなく、#699「継続的動的計測」実装が土台にすべき既存機構と欠落点)。差分5ファイル(`bun.lock`/`package.json`/`tests/helpers/arbitraries/semver.ts`[A]/`tests/integration/t92.test.ts`/`tests/unit/setup-semver.pbt.test.ts`[A]、#721/#722 由来)はフォーカス面に非関与のため、下記はすべて base 時点から不変の現行コードの読解。

### #699-O1 — wall-clock は既に測れているが、永続化経路が存在しない(最重要)

- **計測は既存**: 各テストファイルは `runBunTestFile()`(`tests/run-tests.ts:685-797`)で1ファイル=1子プロセス実行され、`const start = Date.now()`(`:724`)を張り、`meta.duration === "0"` のときのみ `(Date.now()-start)/1000`(`:762`、秒 float 文字列)で補填する。基本値は JUnit XML root の `<testsuites time>`(`tests/lib/bun-junit-to-meta.ts:182` `attrStr(root,"time")`、`:151-154` `sanitizeDuration`)= **bun 1.2.22 で唯一実 wall-clock を持つ属性**(内側 `<testsuite time>` は全て "0"、同ファイル L28-29/L40-41 が検証記録)。`.meta` は6行 `NAME/STATUS/TESTS/FAILED/DURATION/RC`(`writeMeta` `:369-391`、`renderMeta` `bun-junit-to-meta.ts:287-296`)で **DURATION フィールドを既に持つ**。
- **永続化は不在**: `aggregateTierResults()`(`:417-431`)が全 `.meta` を `parseMeta` で読んだ直後、`:430` `for (const meta of metas) rmSync(meta, ...)` で**全削除**する。非 verbose 実行では `logDir` 自体が `mkdtempSync(TMPDIR)` の一時ディレクトリで実行後に丸ごと削除される(`cleanupLogDir`、`:275-277`・`:1113`)。→ duration が生き残る先は (a) メモリ上の `resultRows[].duration`、(b) `--verbose` 時のみの `summary.txt`(`writeVerboseSummary` `:950-985`、`${row.duration}s` `:973`)の**2箇所のみ**。**JSON/レジストリ形式の duration 永続化は現状ゼロ**(全走査で確認)。→ **#699 は削除される `.meta`/揮発 `resultRows` とは別の新規永続化経路(JSON アーティファクト等)を新設する必要がある。**

### #699-O2 — 動的計測を重ねる際の合流点と隔離契約

- **`printSizeMatrix` は静的分類のみで duration 非消費**: `:895-948` は `SCRIPT_DIR` を `walk()` 再帰走査し各 `.test.ts` を `readFileSync` → `classifyTestSize(src).size`(`:921`)で分類するだけで、実行時 wall-clock/`.meta` に一切触れない。→ **既存 size マトリクスは動的 duration の自然な合流点にならない**。#699 の動的値は別経路で積む設計になる。
- **`SizeClassification` 出力形状は後方安定契約**: `tests/lib/test-size.ts:42-45`(`{ size; signals }`)+ L10-14 のコメントが「Phase D (#699) layers true dynamic observation on top; the classifier's output shape stays stable so the drift guard and runner report keep working」と明言。→ **#699 は分類器の出力形状を壊さず"重ねる"のが前提**。size 軸は `small|medium|large`(`:23`)、順序は `SIZE_ORDER`(`:28`)が唯一の定義。
- **exit-code 隔離パターンは既存**: size 報告は `printSummary()` 内 `try { printSizeMatrix(); } catch {}`(`:882-886`、コメント `:880-881`「Observability only — MUST NOT affect the process exit code」)で完全隔離済み。t112(`tests/integration/t112.serial.test.ts`)が「exit == failed-FILE 数」不変条件を固定するため、**#699 が SUMMARY に動的計測を足すなら同じ try/catch 隔離が必須**。

### #699-O3 — t112 copy リスト伝播とレジストリ直交(実装制約)

- **t112 copy リスト制約(明確な破壊条件)**: `t112.serial.test.ts` は scratch tree に実ランナーをコピーして実駆動する(`copyFileSync` `:91-94`)。コピー対象は `run-tests.sh`/`run-tests.ts`/`lib/bun-junit-to-meta.ts`/`lib/test-size.ts`(`REAL_SIZE` `:52`、コメント `:49-52`「run-tests.ts also imports lib/test-size.ts ... the copied runner fails to load without it」)。→ **#699 で run-tests.ts が新たに static import するモジュール(動的計測モジュール等)を追加したら、この copy リスト(`:91-94`)にも同時追加しないと scratch runner がロード不能で t112 が壊れる**。`REAL_SIZE` と同じパターン必須。
- **coverage registry は size/duration と直交**: `tests/gen-coverage-registry.ts` は `// covers:` ヘッダ join を軸とし、`size|duration|meta|classifyTestSize` への参照を一切持たない(全走査で確認、ヒットは `Set.size` 等のみ)。→ **#699 が size/duration を registry 化するなら既存 `covers:` 機構への相乗りは自明でなく、別 JSON アーティファクト新設が現実的**。

### #699-O4 — CI 配線と動的バックエンドの環境制約

- **CI は Linux 確定・size 専用アーティファクト未設置**: `.github/workflows/ci.yml` の `check` ジョブは `runs-on: ubuntu-latest`(`:22`)、`coverage` ジョブは `actions/upload-artifact@v4` で `coverage/lcov.info`+`coverage/html` を upload 済み(`:75-84`、retention 14日)。→ **size/duration 専用のアーティファクト upload は現状無い**(ci.yml 全読で確認)。#699 が動的計測レポートを CI に残すなら、この既存 upload-artifact パターンが合流先。
- **動的バックエンドの OS 制約**: macOS の DTrace は SIP-blocked、Bun test preload も非発火(`test-size.ts:11-12` が既存判断として記録)= Phase A が静的である根拠。#699 の動的バックエンド選定はこの制約を継承し、GitHub hosted runner(ubuntu-latest、非特権/sudo 制限)での strace/eBPF 実行可否は要検証。

## t92-worktree-hermeticity(intent、履歴)の確認済み欠陥

現行 HEAD(`be205cfca`)の実コードを直接読解して file:line を確定した、tsc 解決の非ヘルメチシティ欠陥1件。

### #709 — t92 test 44 が install 済 node_modules へのシンボリックリンクを前提し、worktree の install 状態で exit code がドリフトする

- **原因1(exit-code そのまま伝播の設計)**: ステータスゲート `packages/framework/core/tools/amadeus-sensor-type-check.ts:368` の `if (status !== null && status !== 0 && allErrors.length === 0) process.exit(status)` は、`allErrors` 空(TS18003「No inputs were found」等、`PRIMARY_RE` 不一致で line:col を持たない)かつ tsc 非 0 のとき tsc の生 exit code をそのまま伝播する。この code は TS のバージョン/`--incremental` 有無で 2 か 1 に揺れる。
- **原因2(環境依存 launcher)**: `resolveTscLauncher(tsconfigDir)`(`:182-201`)は起点 dir から上方向に `node_modules/.bin/tsc` を探索し、`existsSync`(`:192`)がシンボリックリンク追従で判定するため、リンク先欠落(未 `bun install`)だと false。ツリー上端まで無ければ `bunx tsc`(`:200`)へフォールバックし、グローバルキャッシュの別バージョン TS(観測 7.x)が走る。原因1と原因2の組合せが #709 の非対称の根本 — pinned tsc(typescript ^6 + `--incremental`)は exit 2、bunx フォールバックは exit 1。
- **バグの核心(test 44 の非ヘルメチシティ)**: `tests/integration/t92.test.ts` test 44(`:1160-1189`)は唯一 exit code(=2)を厳密ピンし、`:1180` の `symlinkSync(REPO_ROOT/node_modules, proj/sub/node_modules)` が**リポジトリの node_modules が install 済である前提**に立つ。未 install の worktree ではリンクが壊れ → bunx → exit 1 → `Note` が `script-error: exit-2` を満たさず**失敗**する。これが #709 の非ヘルメチシティ本体で、テストの緑がテスト対象ではなく worktree の install 状態に依存する。
- **堅牢な対照テスト(要修正外)**: test 45(`:1206-1234`)は node_modules シンボリックリンクなし・`allErrors` 非空(other.ts の実型エラー)でゲート不発火のため exit code ドリフトに非依存。test 12/16(`:557-567`, `:666-668`)は pass/fail 件数のみ検証で exit code 非依存。`tests/unit/t202-sensor-type-check-tsc-launcher.test.ts` は `resolveTscLauncher` の純関数テストで自前 temp ツリーを組み(`:37-101`)リポジトリ node_modules に非依存。tsc 解決を持つのは t92・t202 のみで、脆弱なのは t92 test 44 単独。
- **修正境界の候補**: test 44 の install 済 node_modules 前提を、worktree の install 状態に依存しない形(install 有無を前提しない skip ガード、または launcher を明示注入して exit code 依存を除去)へ。requirements で確定。「落ちる実証」は未 install 相当環境での再現で担保する。

## packaging-repair-batch(intent、履歴)の確認済み欠陥 — PR #711/#712 で解決済み

> **解決状態(260709-t92-worktree-hermeticity スキャンで確認)**: 下記 #701/#702 はいずれも `22e3eb5aa..be205cfca` 区間で PR #711(#701)/ #712(#702)としてマージされ**解決済み**。以下の記述は当時の欠陥分析として参照用に温存する。

現行 HEAD(`22e3eb5aa`)の実コードを直接読解して file:line を確定した、2件の(当時)確認済み欠陥。両者ともリリース/配布パイプラインの整合性を静かに破る型であり、既存の正のテスト(下記「既存の品質ゲート」参照)では検出されなかった。

### #701 — `scripts/package.ts --check` の orphan スキャンが dist ルート平坦面を見ない盲点

- **原因1(orphan ルート集合のハードコード)**: harness 外 orphan スキャンが walk するサブツリーは `for (const sub of [".agents", "amadeus"])`(`scripts/package.ts:611`)の2件のみ。dist ルート直下(`dist/<name>/` の非 `<harnessDir>/`・非 `.agents/`・非 `amadeus/` ファイル)はどの walk 対象にも入らない。
- **原因2(projectRoot diff の片方向性)**: projectRoot な harness ファイルの明示 diff(`:586-592`)は `MISSING`/`DIFFERS`(built→committed 方向)のみを検査し、committed→built の orphan 方向を検査しない。
- **バグの核心**: (a) `<harnessDir>/` 配下でない、(b) `.agents/`/`amadeus/` 配下でない、(c) 現行 manifest が宣言する projectRoot 出力でない — の3条件を満たす stale ファイル(典型: manifest から削除/改名された旧 `AGENTS.md`/`CLAUDE.md`/onboarding の旧コピー)が `dist/<name>/` に居座っても、`--check` はどのスキャンにも当たらず exit 0 で通過する。drift ガードとしての保証に穴がある。
- **テスト状況**: `tests/integration/t145-packaging-parity.test.ts:46-69` は `--check` の exit 0 と `[claude] --check: OK` を主張する**正の drift ガードのみ**。dist ルート直下に stale orphan を注入して `--check` が赤くなることを実証する負のテストは存在しない(team.md「落ちる実証」規範の対象)。

### #702 — `scripts/release-version-sync.ts` の prerelease バッジが前進不能・half-applied

- **原因(正規表現の非対称)**: version 受理正規表現(`:22` `/^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$/`)は prerelease サフィックスを受理するが、README バッジ正規表現(`:53-54` `/badge\/version-[0-9]+\.[0-9]+\.[0-9]+-blue/`)は `X.Y.Z` の直後に即 `-blue` を要求し prerelease を許さない。受理側と patch 側が非対称。
- **バグの核心1(前進不能)**: prerelease 版へ bump するとバッジは `version-1.2.3-rc.1-blue` になり、次回実行時 `:54` の正規表現が一致せず `patchFile` が `:37-40` で `console.error` → `process.exit(1)`。以後どの版へも進めなくなる。
- **バグの核心2(half-applied / 冪等性破綻)**: `patchFile` は version.ts を先(`:47-51`)にディスクへ書き込んだ後に、バッジ patchFile が `:39` で exit 1 する。→ version.ts は前進済み・バッジは据え置きの半適用。再実行では version.ts は既に目標値(`changedVersionTs=false`)だがバッジは依然一致せず、再び exit 1 に張り付く。
- **リリース配線上の影響**: `release-version-sync.ts` は `packages/setup/.release-it.json` の `hooks.after:bump` 経由でのみ起動する(`release.yml` の workflow_dispatch 一本運用)。この盲点は1ボタンリリースを prerelease 到達時点で停止させる。
- **テスト状況**: `tests/unit/t68-version-changelog-sync.test.ts` は release-version-sync.ts を**実行しない静的検査**で、バッジ正規表現も非 prerelease 前提(`:81`)。#702 は未カバーで、修正時は t68 の正規表現も同時更新が必要。

## 品質改善(この差分区間 `a1c79dc12..22e3eb5aa` で観測)

- **PR #703 テスト hermeticity 修正(class-B 14ファイル)**: `tests/` 配下のユニット/インテグレーションテストで、共有状態・実行順序依存を排する hermeticity 修正が入った。テストスイートの決定性が向上している。
- **test-size ドリフトガードの新設**: `tests/lib/test-size.ts`(共有ヘルパー)+ `tests/unit/t-test-size-drift.test.ts`(ガードテスト)が追加され、テストファイルの規模ドリフトを検知する新しい品質ゲートが導入された。これは前述 #701/#702 のような「正のテストのみで負の実証を欠く」ギャップとは別軸の、テスト資産自体の健全性を守る仕組み。

## 既存の品質ゲート(変更なし)

- `dist:check`、`promote:self:check`、`.github/workflows/ci.yml`(typecheck → lint → dist:check → promote:self:check → tests)は変更なし。
- 6件のバグは、どれも既存テストが「合成 evidence」または「正常系」のみをカバーしており、実際に問題になる境界条件(merge 失敗、ガード欠落、audit の bare fallback、不正 JSON、chunk 分割、worktree 実行)を突く既存テストは確認できなかった(#674〜#678、#668 いずれも)。

## 強み

- `amadeus-swarm.ts`/`amadeus-state.ts`/`amadeus-bolt.ts` は audit-first の設計思想(状態変更前に audit emit、または audit emit 後に state write)が徹底されており、#674/#675/#676 の修理はこの既存パターンに沿って局所化できる構造になっている。
- `packages/setup/src/ports/http.ts`・`internal/tar-archive-extractor.ts` は Result 型でエラーを表現する規律が徹底されており、#677 の修理(`try/catch` 追加)はこの既存パターンへの単純な合流で完結する。
- `amadeus-lib.ts` の record-dir/repo-name 解決系は1箇所に集約されているため、#676/#668 の修理は同じファイルの2つの関数に閉じた変更で済む見込み。

## アーキテクチャ横断パターン(6バグの構造的共通性)

個別の欠陥コード位置は code-structure.md に記録済みだが、6件を並べると5つの構造パターンに整理できる。修理時はパターン単位で「同型の欠陥が他にもないか」を確認する価値がある。

1. **監査と実行結果の分離(#674)**: `handleFinalize`(`amadeus-swarm.ts:484-631`)は「exit code / envelope の `merge_failures`」と「`results[]` → audit trail(`emitUnitConverged`/`emitUnitFailed`)」という2つの真実源を持ち、`results[]` を再検証フェーズ(L551-553)で確定してから merge-back フェーズ(L588-599)を走らせるため、後者の失敗が前者に反映されない。原因は「2つの経路が別変数に書かれる設計」自体ではなく、「片方の経路が確定した後にもう片方が更新される順序」にある。
2. **ガードの非対称(#675)**: `handleApprove`(L1286-1379)と `handleReject`(L1430-1487)は `withAuditLock`/`validateSlugInState` という共通骨格を持つ姉妹ハンドラだが、`isAutonomousMode`/`humanPresenceGuardDisabled`/`humanActedSinceGate` という3関数の呼び出しが片方(approve)にのみ配線されている。ガード機構自体は健全で、もう一方の呼び出し口への配線が単に存在しない、という「配線漏れ」型の欠陥。
3. **識別子・パス導出の安定性欠如(#676・#668)**: `auditFilePath`(`amadeus-lib.ts:1267-1270`)と `codekbRepoName`(`amadeus-lib.ts:501-504`)はどちらも「唯一解が求まらないときに、より低精度な識別子へ黙って差し替える」フォールバックを持つ(`recordDir` が null → space-root 直下、`intentRepos` が0/2+件 → `basename(projectDir)`)。フォールバック自体の存在は妥当な設計判断だが、発火がログや戻り値に一切現れないため、呼び出し元は精度の低い識別子で処理を続けていることに気づけない。`stateFilePath`(L1255-1259)も同型のフォールバックを共有しており、#676 の修理範囲を検討する際にはこの姉妹関数への影響有無も確認対象になる(code-quality-assessment 修理時の安全要件 #3 に既述)。
4. **ポート境界での例外漏れ(#677)**: `Http` 型(`http.ts:9-12`)は `Promise<Result<unknown, FetchError>>` を全経路の契約として宣言しているが、`fetchChecked()` の try/catch は Response の取得までしか覆っておらず、その後に `getJson()` 自身が行う `.json()` の await(L27)は契約の外に置かれている。Result 型で境界を守る規律(強みの節に既述)は「境界に入る最初の非同期呼び出し」にだけ適用され、「境界内で追加される2番目の非同期呼び出し」には再適用されていない。
5. **ストリーム状態機械の chunk 境界未検証(#678)**: `extractTarGz` の `carry`/`pendingLongName`/`current`(L36-38)は `for await` ループの外側で宣言されたクロージャ変数であり、chunk をまたいで状態が保持される設計自体は静的スキャン上は妥当に見える。他の4パターンとは異なり、これは「欠陥が実測で確認された」パターンではなく「欠陥の有無が実測でしか確認できない」パターン — 修理着手前に、まず合成 fixture による実証(安全と確認できるなら codekb にその旨を明記、破綻するなら修理)が必要という点で扱いが分岐する。

パターン1・2・3は「機構は存在するが、2つの経路/2つの呼び出し口/2つの姉妹関数のうち片方にしか正しく適用されていない」という同じ形をしており、修理は既存機構への「もう片方への配線」で完結する見込みが高い(bugfix スコープの小規模修正という前提と整合する)。パターン4は既存規律の再適用漏れ、パターン5は検証負債であり、この2件は「直す」前に「本当に直すべきか/どう直すべきか」を requirements-analysis で先に確定する必要がある(既存の「移行しない選択肢の評価」節と整合)。

## リスクと技術的負債

| リスク | 影響 | 注記 |
| --- | --- | --- |
| **#674**: merge-back 失敗が audit/`results[]` に反映されない | 高(監査ログの正確性、conductor の後続判断を誤らせる) | `merge_failures`/exit code だけを見る呼び出し元は正しく検知できるが、`units[].status` や audit trail だけを見る消費者は誤認する。二重の真実源(exit code 経路と audit 経路)が食い違う構造そのものが負債 |
| **#675**: `reject` に human-presence guard が無い | 高(ゲートの公正性、approve/reject の非対称性) | 誰が呼んでも無条件に `revising` へ遷移できる。悪意の有無に関わらず、自動化スクリプトの誤操作でも人間の意思決定を経ずにゲートが後退しうる |
| **#676**: `auditFilePath`/`stateFilePath` の bare fallback が静かに発火する | 中〜高(audit trail の欠落、デバッグ困難性) | 呼び出し元にエラー・警告が一切出ないため、intent 解決失敗という異常状態が正常系のように見える。`error-classification` の観点では「回復不能なはずのエラーを黙って握りつぶす」パターンに該当しうる |
| **#677**: `getJson()` の `.json()` が未保護 | 中(信頼性、原因不明のクラッシュ) | GitHub API のレスポンスボディが期待通りでない場合、`Result` 契約を破って未処理の Promise rejection になる。呼び出し元のエラーハンドリングが `Result` のみを想定していれば、そこで例外が素通りする |
| **#678**: PAX/GNU longname の chunk 跨ぎが実測未検証 | 中(配布物の展開失敗、サイレントな破損の可能性) | 静的スキャンでは明確な破綻は確認できなかったが、実際の chunk 境界での動作は未実証。「検証しないまま安全と断定する」ことも「検証しないまま欠陥と断定する」こともproject.md の evidence-discipline 是正事項に反する |
| **#668**: `codekbRepoName` の fallback が worktree 名を使う | 中(codekb 出力先の非決定性) | 「決定的な per-repo ディレクトリ」という契約(`codekb-path` のコメント)に反する。本スキャン自体がこの fallback の実例(`codekb/claude-engineer-1/`) |

## 修理時の安全要件

1. **#674**: merge-back フェーズの結果を `results[]` に反映してから audit emission フェーズを走らせる順序に変更する。exit code 契約(L630)は変更しない。修理後、意図的に `complete --merge` を失敗させる(例: 競合するブランチ状態を用意する)テストで、`emitUnitFailed`/`emitBoltFailed` が発火し `emitUnitConverged` が発火しないことを実証する(team.md Mandated の「落ちる実証」原則)。
2. **#675**: `handleReject` にガードを追加するかどうかは意図的な設計判断を要する(reject は「人間が却下した」ことを示す操作であり、approve と同じ厳格さを求めるべきかは要件次第)。requirements-analysis で明示的に決定し、ADR 相当の根拠を残す。
3. **#676**: `recordDir` が `null` を返すケースを bare fallback で握り潰さず、`--worktree` の `start` からは明示的に失敗させる(またはログに警告を出す)分岐を追加する。既存の `stateFilePath` の同型 fallback(L1255-1259)への影響有無も確認する。
4. **#677**: `getJson()` の `.json()` 呼び出しを try/catch で包み、`FetchError.classify` 相当のエラー分類を追加する。不正 JSON を返す fixture でユニットテストを追加し、`Result.err` が返ることを実証する。
5. **#678**: PAX/GNU longname ヘッダが2つの `chunk` に分割される、または longname ヘッダとその本体ヘッダが別 chunk に分かれる合成 fixture を用意し、`extractTarGz` が正しく展開できるかを実測する。破綻するなら修理し、破綻しないなら「検証済みで安全」と codekb/テストに明記する。
6. **#668**: `codekbRepoName` の fallback を worktree 対応にする(例: `git rev-parse --show-toplevel` で実体リポジトリのルートを取得し、その `basename` を使う、または `.git` ファイルの `commondir`/`worktrees/<name>` パスから親リポジトリ名を逆算する)。複数 worktree(`claude-engineer-1`、`claude-engineer-2` 等)から同一リポジトリ名が解決されることをテストで実証する。

## 移行しない選択肢の評価

6件とも既存機能の欠陥修理であり、「修理しない」選択肢は intent の目的そのものを満たさない。ただし #675(reject のガード追加)と #678(実測検証)は、修理範囲が「バグである」という前提そのものの検証を要する点で他の4件と性質が異なり、requirements-analysis で先に「これは本当に欠陥か」を確定すべきである。

---

## 既知の欠陥 — integrity-batch(intent `260709-integrity-batch`、履歴)の修理対象4件

> 上記の6バグ(#674/#675/#676/#677/#678/#668)は前回 intent `260709-bug-zero-batch` のスキャン記述であり、integrity-batch のスコープ外。本節が当時の diff-refresh(`a1c79dc12..162553b99`)で焦点化した4件。いずれも当該区間の焦点コードに未着手で残存する欠陥であり、#707・#708 は今回区間で入った前提機構(#693 origin 由来 repo 名 / #671 delegate provenance)の隣接領域として顕在化した。file:line は self-install ツリー(`.claude/`)を実測面として引用する — 修正は source of truth の `packages/framework/core/` を編集し dist/self-install へ伝播させる(team.md Mandated)。

### #708 human-presence 偽陽性(P1、検証機構の正しさ)

- **mint 側(無条件 mint・stdin 未読)**: `.claude/hooks/amadeus-mint-presence.ts:23-31` — `resolveProjectDirFromHook(import.meta.url)` → `existsSync(stateFilePath(...))` なら **無条件に** `appendAuditEntry("HUMAN_TURN", {}, projectDir)`。冒頭コメント L12-13 が「Presence-only: the prompt text is irrelevant, so stdin is not read.」と明言し、UserPromptSubmit を発火させた入力が人間の生タイプか機械注入(Stop-hook フィードバック / task-notification)かを区別する情報を取得しない。これが偽陽性の直接原因。
- **gate 側(mint を消費する判定)**: `.claude/tools/amadeus-lib.ts:1442-1479` `humanActedSinceGate` は `HUMAN_TURN`(および検証済み `DELEGATED_APPROVAL`)とゲート解決イベントを時系列比較し `lastHuman > lastResolution` で true を返す(空台帳は fail-open で true、L1444)。委任承認 provenance `verifyDelegatedApproval`(L1480以降、#671)は健全だが、偽の `HUMAN_TURN` が mint 側で湧くと `isHumanTurn` 経路(L1451)で無条件カウントされ、provenance を経ずゲートが開く。消費点は `amadeus-state.ts:1311`(approve/reject 共通ヘルパー)と `amadeus-state.ts:1479`(delegate-approval)。
- **修正の型(既存様式)**: `amadeus-audit-logger.ts:29-44` / `amadeus-session-start.ts:86-96` が `isTTY` ガード → `Bun.stdin.text()` → `JSON.parse` → `isClaudeCodeHookInput`(`amadeus-lib.ts:2049-2051`)→ fail-open(`process.exit(0)`)の定型を確立済み。hook 入力型 `ClaudeCodeHookInput`(`amadeus-lib.ts:2029-2047`)は既に `source?` / `prompt?` を宣言済み(フィールド追加不要)。ただし**型に在る≠ランタイムで来る**。`source` は SessionStart 固有(session-start.ts が読む)で、UserPromptSubmit に判別材料が来る保証はない — 実 UserPromptSubmit stdin JSON の実機キャプチャが必須(code-generation 段)。判別材料が無ければ #708 提案(b)「gate は delegate provenance を正道とし、ローカル単独 HUMAN_TURN を信頼しない」が現実的な緩和方向。fail-open 契約(mint 失敗が人間のターンをブロックしない)は維持必須。

### #705 sdk-drive calibration のランナー管理外・doctor ドリフト(P2、検証機構の正しさ)

- **doctor 期待値ドリフト**: `tests/harness/sdk-drive.calibration.test.ts:55-72` が既知回答 doctor 文字列をピン留めするが、`DOCTOR_DOCS_LABEL = "amadeus-docs/ directory exists"`(L72)は現行 doctor 出力に存在しない(CONFIRMED)。現行 `amadeus-utility.ts:628` は `label: \`workspace shell ready (${harnessDir()}/ + amadeus/spaces/default/memory/)\`` を出力し、旧文字列は現れない。よって calibration 2 は依存導入後も失敗する。コメント L61-66 が指す `utility.ts:396` の旧行自体もドリフト。
- **ランナー管理外**: `tests/run-tests.ts:31` の `type Level = "smoke" | "unit" | "integration" | "e2e"`、`levelFiles(level)`(L577-587)は `join(SCRIPT_DIR, level)` 直下のみ列挙。`tests/harness/` はどの Level にも属さず、substrate skip(`shouldSkipForClaude`、L485-489)も掛からない(CONFIRMED)。ad hoc 実行時のみ走り、通常 CI では tier 外。`tests/gen-coverage-registry.ts`(L675以降)のカバレッジウォークは `tests/harness/` を静的集計するが、これは**実行**ではなく substrate ゲートとは別系統。
- 修正はテスト側の期待値更新 + ランナー登録方針の決定(#705 提案 A/B)。team.md/project.md の「検証劇場 Forbidden」(偽の trust anchor)の趣旨に直結し、「落ちる実証」が要求される。

### #707 codekb 並行リフレッシュ衝突(P2、共有ストアの一貫性)

- **前提機構(#693)**: `.claude/tools/amadeus-lib.ts:556-565` `codekbRepoName` は recorded repos が1件ならその名、0件なら `originRepoSlug(projectDir)`(L560)、解決不能時 `basename(projectDir)`。#693 で origin remote 由来に統一され、全 worktree/clone が同一 `codekb/amadeus/` を指す = #707 の前提。関連: `codekbDir`(L530-533)、`originRepoSlug`(L571-580)。
- **単一 timestamp 構造(構造的原因)**: ステージ定義 `.claude/amadeus-common/stages/inception/reverse-engineering.md` の L5 `condition:`(「Always rerun for freshness」= 常時リフレッシュ前提)、L36 `outputs:`(`codekb/<repo>/` の**9固定ファイル・単一ディレクトリ**)、L110(`reverse-engineering-timestamp.md` は freshness marker、**単一ファイル**)。timestamp は per-intent の base/observed を分離して持てず、並行リフレッシュで base/observed が互いに上書きされる。現行 `codekb/amadeus/reverse-engineering-timestamp.md` の実形式も単一 intent の単一スキャン点を前提とし、複数 intent の並行 base/observed 欄が無い。
- 修正方向 C(timestamp を per-intent 記録化、本文 last-writer-wins 明文化)を採るなら、このファイル構造とステージ定義 L110/L36 の両方に規約追記が要る。**本 timestamp 更新自体がこの緊張(自己言及)の当事者** — last-writer-wins 前提で書く必要がある。

### #706 delivery knowledge の tree 外参照(P3、共有参照の一貫性)

- **破損参照**: `packages/framework/core/knowledge/amadeus-delivery-agent/workflow-planning-guide.md:3` — 「Use this alongside `product-guide.md` when leading execution plan creation.」だが、delivery-agent の宣言済みロードパス(`amadeus-delivery-agent.md:71-77`)は自分の `knowledge/amadeus-delivery-agent/` と `amadeus-shared/` のみで product-agent ディレクトリを読まない。
- **実配置**: `knowledge/amadeus-delivery-agent/` は `mob-programming-guide.md` / `team-topologies.md` / `workflow-planning-guide.md` の3ファイルのみで **`product-guide.md` は不在**。`product-guide.md` は `knowledge/amadeus-product-agent/product-guide.md` に存在(core / `.claude` / `.codex` / `dist/{claude,codex,kiro,kiro-ide}` の7箇所に伝播済み)。
- **伝播構造**: 破損参照は既に `.claude/knowledge/.../workflow-planning-guide.md:3` と `dist/claude/` 複製にも伝播済み。L3 は当該 diff 区間で未変更(L55 のみ #672 で編集)= 恒久的な既存欠陥。修正は core を直し `bun scripts/package.ts` + `bun run promote:self` で全ツリー再同期(`dist:check`/`promote:self:check` を同一コミット)。修正方向は (a) 参照文言の削除/修正、(b) `product-guide.md` を delivery ディレクトリにコピー(重複負債・NEVER 二重実装ノルムと緊張)、(c) delivery-agent のロードパスに product-agent knowledge を追加 — 設計判断は requirements-analysis へ。

### 構造的共通性(4バグの分類)

- **検証機構の正しさ系(#705・#708)**: どちらも「偽の信頼を生む機構」= team.md/project.md の「検証劇場 Forbidden」の趣旨に直結。修正時は「落ちる実証」(失敗ケース注入で赤くなること)が team.md Mandated で要求される。
- **共有ストア/参照の一貫性系(#706・#707)**: #693(origin 由来 repo 名)後の単一 codekb ストアという新しい共有面で、並行書き込み(#707)と tree 外参照(#706)が顕在化。
