# リバースエンジニアリング実施記録

## 実行メタデータ（最新: 260715-parser-checkbox-fixes）

- Date: 2026-07-16
- Observed at: `git rev-parse HEAD` = `6495e03a12d9e7149c2e80b59f171a90607a2d2c`
- Intent: `260715-parser-checkbox-fixes`（bugfix。#1013 practices-promote parseRules が ALWAYS/NEVER 契約を検証せず散文行を project.md へ append / #1015 scope-change checkbox 再構築の三項が6→4状態崩落＝awaiting-approval・revising が pending へ退行＋再構築ヘッダの4状態 drift）
- Scope: `bugfix`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`（2.1）
- 手法: diff-refresh（cid:reverse-engineering:c1、E-L63 の base 選定2則）。base=`cf3dc88b46a2b23bcfd71b1136632d1739cdd7e5`（リーダー割当。全 `re-scans/*.md` の observed のうち HEAD 祖先で距離最小=65。`git merge-base --is-ancestor cf3dc88 HEAD`=exit 0、`git rev-list --count`=65 を実測で裏取り）、observed=`6495e03a12d9e7149c2e80b59f171a90607a2d2c`（`git rev-parse HEAD` 実測一致）。共有 timestamp 前 pointer の canonical-settings observed `e55cc25143717d84b3e7f1a543151f0b7c99b96f` は `--is-ancestor`=exit 1（非祖先・並行 intent）につき base 候補から除外。区間65コミットにフォーカス欠陥の修正は存在せず、両欠陥は observed に現存。base/observed の真実源は本 intent の `inception/reverse-engineering/scan-notes.md` および `re-scans/260715-parser-checkbox-fixes.md`。
- 実施体制: Developer（スキャン）→ Architect（合成）の2サブエージェント直列（cid:reverse-engineering:c3）
- Focus: #1013 `amadeus-state.ts:2556-2561`（parseRules、区間無変更で欠陥貫通。呼び出し元は handlePracticesPromote の :2570/:2571 のみ、stage 契約 `practices-discovery.md:101`）・#1015 `amadeus-utility.ts:3228-3230`（handleScopeChange 三項の6→4崩落）＋副次 drift `:3238`（再構築ヘッダ4状態、正本テンプレ :2748 は6状態）・状態型正本 `amadeus-lib.ts:58` CheckboxState / `:60-67` CHECKBOX_MAP / `:69-76` CHECKBOX_REVERSE / `:3395` parseCheckboxes（6状態復元）/ `:3435` CHECKBOX_MAP 正準経路。手書き marker 構築サイト2箇所（`utility.ts:3229` 欠陥 / `:2656` 良性 init）
- 現行結論: #1013 / #1015 とも observed HEAD で未修正・現存。両欠陥とも既存テスト未カバー（t75 は ALWAYS/NEVER 整形済み fixture のみ、t194 は別関数 handleRecompose を検査）。編集正本は `packages/framework/core/tools/`（`.claude/tools/*` と byte 同一）。codekb の本 intent 観測面に stale 記述は検出されず。
- Per-intent record: `re-scans/260715-parser-checkbox-fixes.md`
- 更新成果物: `code-structure.md`（「parser/checkbox 欠陥面の観測」節を先頭新設＋前「最新」= canonical-settings 節を履歴ラベル化 cid:reverse-engineering:c3-relabel）、本ファイル（鮮度ポインタ＋「最新: 260709-canonical-settings」→履歴ラベル化）、`re-scans/260715-parser-checkbox-fixes.md`（per-intent re-scan 記録）。他成果物（architecture / business-overview / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment）は両欠陥が挙動欠陥で構造変化を伴わず、base→observed でフォーカス面外に破壊的変化がないため温存（churn 回避、cid:reverse-engineering:c1）。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。**本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。**

## 実行メタデータ（履歴: 260709-canonical-settings）

- Date: 2026-07-16
- Observed at: `git rev-parse HEAD` = `e55cc25143717d84b3e7f1a543151f0b7c99b96f`
- Intent: `260709-canonical-settings`（#623: Amadeus 共通の既定挙動を型付き canonical settings＝1正本へ集約する基盤。現状 CLI フラグ `--depth`/`--test-strategy`・env `AMADEUS_DEFAULT_SCOPE`・state `Construction Autonomy Mode` の3系統に分散した設定を統合）
- Scope: `amadeus`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`（2.1）
- 手法: diff-refresh（cid:reverse-engineering:c1、E-L63 の base 選定2則）。base=`cf3dc88b46a2b23bcfd71b1136632d1739cdd7e5`（前 intent `260713-swarm-driver-migration` の observed。全 `re-scans/*.md` の Observed commit を `git merge-base --is-ancestor` で走査し、HEAD の祖先である候補のうち `git rev-list --count` が最小＝距離58 を採用）、observed=`e55cc25143717d84b3e7f1a543151f0b7c99b96f`（`git rev-parse HEAD` 実測一致）。区間58コミット（519 files, +98136/-1659、主因は upstream-v2 移行 `amadeus-migrate.ts` +3823行新規と移行テスト大量追加）に**本 intent 関連の新規機構は存在せず**、設定土台（doctor row 構造・stage-schema 厳格 parse 様式・amadeus-lib の JSON ロード様式・`AMADEUS_DEFAULT_SCOPE` precedent）は base 時点で確立済み。フォーカス面は observed HEAD 実コード直読で file:line 確定。base/observed の真実源は本 intent の `inception/reverse-engineering/scan-notes.md` および `re-scans/260709-canonical-settings.md`。
- 実施体制: Developer（スキャン）→ Architect（合成）の2サブエージェント直列（cid:reverse-engineering:c3）
- Focus: 設定配置（`amadeus/spaces/default/` 直下に設定ファイル不在・`.gitignore:47-58` はどのパターンでも新設 settings を ignore しない）・doctor 統合（`DoctorCheck{pass,label,fix?}` `amadeus-utility.ts:407-411`、`handleDoctor:676`、`process.exit(failed>0?1:0):1958`、`AMADEUS_DEFAULT_SCOPE` row:875-892 が雛形）・parse 様式（厳格＝`amadeus-stage-schema.ts` 判別ユニオン `{valid,data}｜{valid,errors[]}`:55-57/`unknown key:`:163 対 寛容＝`amadeus-rule-schema.ts` throw:69,72/未知キー許容:39）・JSON ロード（`readIntentRegistry` `amadeus-lib.ts:1496-1509`、`writeFileAtomic`、`AMADEUS_*` env-seam `amadeus-graph.ts:307`）・共通挙動設定の3系統分散（CLI フラグ/`AMADEUS_DEFAULT_SCOPE`/`Construction Autonomy Mode`、重複記述なし）・dist 同期（正本 `packages/framework/core/tools/` `package.ts:56-57`、`promote:self`、`dist:check`/`promote:self:check`）・env var 責務境界（約40 `AMADEUS_*` の唯一の挙動既定 precedent＝`AMADEUS_DEFAULT_SCOPE`、settings.json env 由来 `amadeus-utility.ts:871`）
- 現行結論: `settings.json` 相当の型付き canonical settings ファイルは製品に**未実装**（実装0件）。設定の3系統分散は現存し、`AMADEUS_DEFAULT_SCOPE`（settings.json env → env var → ツール読み）が canonical settings チャネルの唯一の既存 precedent。設定土台（parse/JSON/doctor/dist 同期）は base 時点で確立済みで区間内に破壊的変化なし。codekb の本 intent 観測面に stale 記述は検出されず。
- Per-intent record: `re-scans/260709-canonical-settings.md`
- 更新成果物: `code-structure.md`（「canonical settings 観測面」節を先頭新設 = フォーカス面1〜7 の要点を file:line 付き転記）、本ファイル（鮮度ポインタ + 「最新: 260713-swarm-driver-migration」→履歴ラベル化 cid:reverse-engineering:c3-relabel）、`re-scans/260709-canonical-settings.md`（per-intent re-scan 記録）。他成果物（architecture / business-overview / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment）は Developer が本 intent 観測面で stale なしと判定し、base→observed で構造変化・挙動欠陥を伴わないため温存（churn 回避、cid:reverse-engineering:c1）。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。**本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。**

## 実行メタデータ（履歴: 260713-swarm-driver-migration）

- Date: 2026-07-13
- Observed at: 2026-07-13T07:57:31Z
- Intent: `260713-swarm-driver-migration`（`AMADEUS_SWARM_DRIVER` 新設、`AMADEUS_USE_SWARM` の0.1.x互換移行、Claude Agent Teams／Ultra Code、Codex Ultra、Kiro subagent の決定的選択・監査・live proof）
- Scope: `amadeus`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`（2.1）
- 手法: diff-refresh。base=`13598b752b656cc9bbf5d931f8e3a6c34881fd1c`、observed=`cf3dc88b46a2b23bcfd71b1136632d1739cdd7e5`、距離49 commits。全 `re-scans/*.md` の Observed commit を `git merge-base --is-ancestor` で検査し、HEAD の祖先である候補のうち距離最小を採用した。`c11554226542faabd2a6c694650ea26323745ed8` は現 HEAD の非祖先であり除外した。
- 実施体制: Developer code scan → Architect synthesis の2サブエージェント直列
- Focus: engine eligibility、driver-neutral `invoke-swarm`、harness conductor の fan-out、Claude／Codex／Kiro の process／live-tool 境界、stateless referee、worktree／Bolt／audit、`scripts/package.ts`／`promote-self.ts`、決定的 selector matrix、capability probe、explicit hard error、auto loud fallback、driver-aware audit、4 driver の2 Unit以上 live proof
- 現行結論: `AMADEUS_SWARM_DRIVER` の製品実装は0件。現行 driver 選択は harness skill prose に分散し、referee は AI dispatcher ではない。#841 の batch progress、package source-side unreferenced scan、dist root orphan blind spot は解消済み。
- Per-intent record: `re-scans/260713-swarm-driver-migration.md`
- 更新成果物: `business-overview.md`、`architecture.md`、`code-structure.md`、`api-documentation.md`、`component-inventory.md`、`technology-stack.md`、`dependencies.md`、`code-quality-assessment.md`、本ファイル、および per-intent record。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。**本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。**

## 実行メタデータ(履歴: 260712-metrics-observation)

- Date: 2026-07-12
- Intent: `260712-metrics-observation`(既存計測経路 — CCN 分布・テスト数・カバレッジ% — の出力をコミット snapshot に保存する観測機構、#921)
- Scope: `feature`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/engineer-2`(branch `intent/921-metrics-observation`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定2則)。base=`13598b752b656cc9bbf5d931f8e3a6c34881fd1c`(前 intent `260711-docs-repair-batch9` の observed。全 re-scan observed の HEAD 祖先性を `git merge-base --is-ancestor` で判定し、祖先のうち距離最小=56 を採用。非祖先2件 `11c52f153`/`d6375bba6` は squash 別 SHA で除外)、observed=`c11554226542faabd2a6c694650ea26323745ed8`(`git rev-parse HEAD` 実測)。フォーカス面(snapshot 再利用 seam)は observed HEAD 実コード直読で file:line 確定、base→observed diff で ideation feasibility 前提の現存を検証。フォーカス面の export シグネチャは全て base と不変(実コード触は `tests/lib/coverage-normalize.ts` の #876 closing-only strip のみで export byte 同一)。base/observed の真実源は本 intent の `inception/reverse-engineering/scan-notes.md` および `re-scans/260712-metrics-observation.md`。
- 実施体制: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `tests/complexity-gate.ts`(CCN seam: `runLizard:151`/`MEASUREMENT_ROOTS:43`/`CCN_BLOCK_THRESHOLD:35`/`CCN_WARN_FLOOR:36`/`parseLizardCsv:128`/`evaluateComplexity:241`、`python3 -m lizard` spawn 前提)・`tests/run-tests.ts`(カバレッジ機械可読出力 `writeCoverageTotalsJson:610`→`coverage/coverage-totals.json`、`collectCoverageTotals:538` 非 export、テスト数は `printSummary:899` の stdout print のみ=機械可読 seam 不在)・`tests/lib/coverage-normalize.ts`(`normalizeCoverageReport:273`/`computeStrippableLines:79` export)・`.github/workflows/ci.yml`(`contents:read` :23-24)/`release.yml`(`contents:write` :48、GITHUB_TOKEN push 非トリガー前例 :15-16)・`scripts/package.ts`(dist コピー源 CORE/HARNESS のみ :57-58 = scripts/tests は C2 対象外)・`.gitignore`(`coverage/` :30)
- 更新した成果物: `code-structure.md`(「計測 seam 台帳 — metrics-observation の観測面」節を先頭新設 = export 状況・非 export ギャップ・CI 権限前例・配置規約の seam 台帳)、本ファイル(鮮度ポインタ + 「最新: 260711-docs-batch10」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、`re-scans/260712-metrics-observation.md`(per-intent re-scan 記録)。他成果物(architecture / code-quality-assessment / business-overview / api-documentation / component-inventory / technology-stack / dependencies)は base→observed で本 intent 観測面(既存 seam の再利用面)と無関係、かつ挙動欠陥・構造変化を伴わないため温存(churn 回避、cid:reverse-engineering:c1)。テスト数の機械可読 seam 不在のみ既知ギャップとして functional-design へ持ち越し。

## 実行メタデータ(履歴: 260711-docs-batch10)

- Date: 2026-07-12
- Intent: `260711-docs-batch10`(documentation 4件 — #765 `set-skeleton-stance` verb が `docs/` 全体で未記載 / #764 `orchestrate next --new-intent` フラグが `docs/reference/` で未記載 / #763 `docs/reference/18-workspace-layout.md` の `.ja.md` ペア欠落 / #728 `tests/` 13ファイル・14参照の `assertNotSiblingWorktree` stale コメント参照=product は `resolveWorktreeAnchor` へ改名済み)
- Scope: `documentation`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/codex-engineer-2`(branch `intent/p3-cleanup-batch5`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1、E-L63 の base 選定2則)。base=`60f5e1edf472517c5fc2b4a1c388dd9a5030446c`(前回 intent `260711-p3-cleanup-batch8` の observed。re-scans 記録の observed を `git merge-base --is-ancestor` で走査し、HEAD 祖先のうち距離最小=64 を採用)、observed=`d6375bba68f415ce1a31e9a4d70e07fbfe80be85`(`git rev-parse HEAD` 実測)。本バッチは restart-loss ではなく起票時からの docs ギャップ(および tests の stale コメント)であり、区間 `base..observed` の docs/tests diff に4欠陥トークンは不在=区間で未変化のまま observed に現存(E-L53 3点法の (b)(c) を実測、(a) 元修正対照は非該当)。フォーカス4 Issue の file:line は現行 HEAD の実コード直読・grep で確定。base/observed の真実源は本 intent の `re-scans/260711-docs-batch10.md` および `inception/reverse-engineering/scan-notes.md`。
- 実施体制: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `docs/`(#765 grep 0件、正準ページ `docs/reference/12-state-machine.md`)・`docs/reference/`(#764 grep 0件、正準ページ `docs/reference/03-orchestrator.md`)・`docs/reference/18-workspace-layout.md`(#763、`.ja.md` 欠落=全20ファイル中の唯一欠落)・`tests/`13ファイル14参照(#728、旧名 stale)。source 側の真実: `amadeus-state.ts:371/:445/:518`(set-skeleton-stance)・`amadeus-orchestrate.ts:321/:336/:375/:1427`(--new-intent)・`amadeus-worktree.ts:167`(resolveWorktreeAnchor)
- 更新した成果物: `code-quality-assessment.md`(本 intent の documentation 4欠陥横断節を先頭新設 + 先頭バナーの「最新」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、本ファイル(鮮度ポインタ)、`re-scans/260711-docs-batch10.md`(per-intent re-scan 記録)。他成果物(architecture / business-overview / code-structure / api-documentation / component-inventory / technology-stack / dependencies)は base→observed で本 intent 観測面(docs/tests のコメント・ペア面)と無関係のため温存(churn 回避)。

## 実行メタデータ(履歴: 260711-docs-repair-batch9)

- Date: 2026-07-11
- Intent: `260711-docs-repair-batch9`(docs/harness 修理バッチ第9弾 — #812 kiro-ide SKILL.md の kiro CLI 版 byte-copy / #824 onboarding.fills.ts の kiro CLI 表記残存 + guide_pointer 誤指し / #680 sensor-type-check の self-contained ヘッダと実 import の矛盾 / #885 normalizeWorktreeSlug 喪失 restart-loss / #886 phase-check ゲート喪失 restart-loss)
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/codex-engineer-1`(branch `intent/docs-repair-batch9`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。base=`b845478bbf25a534a59f97f18e5a4a2a5a4e239c`(前回 bughunt-fix-batch RE observed。全 re-scan observed 候補の HEAD 祖先性を判定し最短距離59の最新祖先を採用)、observed=`13598b752b656cc9bbf5d931f8e3a6c34881fd1c`(現 HEAD = origin/main)。**#812/#824/#680 の欠陥3ファイルは区間内無変更で欠陥が区間を貫通して現存**、**#885/#886 の lib/state/worktree は区間内で #880(`c4304edf4` flip 配線)・#869(`aac1869e4` jump per-phase)の行番号シフトを受けたが欠陥自体(normalizeWorktreeSlug 喪失 / phase-check ゲート喪失)は未修復で残存**。Always-rerun-for-freshness は差分実測(区間内変更の有無 + 現行 file:line の grep 0件確認)で満たした。base/observed の真実源は本 intent の `inception/reverse-engineering/scan-notes.md`。
- 実施体制: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `harness/kiro-ide/skills/amadeus/SKILL.md:14,84`(#812)+ `question-rendering.md:1,11`(#812 同根候補)・`harness/kiro-ide/onboarding.fills.ts:1,15,17,26,30` + `manifest.ts:93`(#824)・`core/tools/amadeus-sensor-type-check.ts:4-5,89`(#680)・`core/tools/amadeus-lib.ts:2099,2430,2580` + `amadeus-worktree.ts:39,195` + `amadeus-state.ts:248,250`(#885)・`core/tools/amadeus-state.ts:101,114,1104,1333,1428,1670` + `amadeus-jump.ts`/`amadeus-orchestrate.ts`(#886)
- 更新した成果物: `code-quality-assessment.md`(本 intent のフォーカス5欠陥現存確認節を先頭新設 + question-rendering.md localize 漏れの #812 未カバー候補記録 + 先頭バナー/batch5 節「本 intent」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、`architecture.md`(restart-loss 系統節「docs-repair-batch9 の観測面」新設 + core-repair-batch3 バナー「最新」降格・「本 intent」履歴ラベル化)、`code-structure.md`(restart-loss フォーカス面の区間構造変化節 = #880/#869 の flip 再構築を新設)、`component-inventory.md`(docs/harness 修理コンポーネント節新設)、本ファイル(鮮度ポインタ)。他成果物(business-overview / api-documentation / technology-stack / dependencies)は本 intent 観測面と無関係のため温存(churn 回避、cid:reverse-engineering:c1)。

## 実行メタデータ(履歴: 260711-p3-cleanup-batch8)

- Date: 2026-07-11
- Intent: `260711-p3-cleanup-batch8`(P3 修理7件 — #843 stage-protocol.md persona 注入残存 / #846 sensor・validate ツールの無条件 main() import 副作用 / #850 audit-fork one-shot ガードの復活拒否 / #851 issue-ref-contract.md 全面不在 / #876 computeStrippableLines の brace-only 行 strip 漏れ / #877 run-tests バッチ時の persist seam 分離不全 / #878 orchestrate default 出口の recordEngineError 非配線)
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/claude-engineer-3`(branch `intent/batch-c-learnings-audit`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。base=`9738580ef`(re-scans 最新 observed 由来)、observed=`60f5e1edf`(現 HEAD)。差分区間 `9738580ef..60f5e1edf`(294 files, +25889/-3508)。restart-loss 4件(#843/#846/#850/#851)の欠陥ファイルは区間内で一切未変更(`git diff --name-only` grep = NONE)で base 時点の既存欠陥、#876/#877/#878 は区間内で導入・変更された面。フォーカス7 Issue の file:line は現行 HEAD の実コード直読で再確定。base/observed の真実源は本 intent の `re-scans/260711-p3-cleanup-batch8.md` および `inception/reverse-engineering/scan-notes.md`。
- 実施体制: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `core/amadeus-common/protocols/stage-protocol.md:611-614`(#843)・`core/tools/amadeus-sensor-required-sections.ts:229` + `amadeus-sensor-upstream-coverage.ts:111` + `amadeus-validate.ts:305`(#846、参照実装 `amadeus-learnings.ts:916`)・`core/tools/amadeus-audit.ts:471-475`(#850)・`harness/<name>/skills/amadeus/references/issue-ref-contract.md`(#851、不在)・`tests/lib/coverage-normalize.ts:40/:117/:126-132/:135`(#876)・`tests/run-tests.ts:692` + `tests/unit/t-learnings-persist-seam.test.ts:40-61`(#877)・`core/tools/amadeus-orchestrate.ts:2995-3001` + `recordEngineError:195`/配線 `:3017`(#878)
- 更新した成果物: `code-quality-assessment.md`(本 intent の修理7件横断分類節を先頭新設 + 先頭バナー/batch5 節見出しの「最新/本 intent」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、`architecture.md`(「orchestrate エラー監査経路の部分配線(#879/#878)」構造節を新設 + 先頭バナー履歴化)、本ファイル(鮮度ポインタ)、`re-scans/260711-p3-cleanup-batch8.md`(per-intent re-scan 記録)。他成果物(business-overview / code-structure / api-documentation / component-inventory / technology-stack / dependencies)は base→observed で本 intent 観測面と無関係のため温存(churn 回避、前回 RE と同判断)。

## 実行メタデータ(履歴: 260711-p2-repair-batch7)

- Date: 2026-07-11
- Intent: `260711-p2-repair-batch7`(restart-loss クラス5バグ — #834 orchestrate parked 短絡が `--new-intent` 非検査 / #839 orchestrate トップレベル catch・error 分岐が ERROR_LOGGED 非配線 / #844 doctor workspace-shell-ready の2状態判定+一律 fix 文言 / #845 log-subagent 完了 intent ゲート不在+agent_type 空文字素通し / #849 learnings readRuntimeStageRow の runtime-graph 欠落 hard fail=自己修復せず)
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/claude-engineer-2`(branch `intent/p2-repair-batch7` = origin/main ベース)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。base=`d8de2362b`(最新祖先 observed = 260710-p3-cleanup-batch5)、observed=`37ad36a97`(`git rev-parse HEAD` 実測)。区間 `d8de2362b..37ad36a97` = 13 コミット。6フォーカスファイル限定 diff は `amadeus-utility.ts`(M、#830/#855 の doctor Check1/3 anchor の `5c5e042a2`、#844 面 `:619-632` には非関与)のみで、残り5ファイル(orchestrate / log-subagent / learnings / runtime / runtime-compile)は base 時点と**バイト同一**。**5欠陥はいずれも observed HEAD に未修正で現存**。base 決定は `git merge-base --is-ancestor` で実測(`11c52f153`=swarm-worktree-batch は HEAD 非祖先につき除外、最新祖先 `d8de2362b` を採用)。base/observed の真実源は本 intent の `re-scans/260711-p2-repair-batch7.md`(共有本ファイルは鮮度ポインタ)。
- 実施体制: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `amadeus-orchestrate.ts:1243-1259`(#834 Branch 2.5)・`amadeus-orchestrate.ts:2913-2920`+`errorDirective:236`(#839、対照 `amadeus-lib.ts:4353` emitError)・`amadeus-utility.ts:619-632`(#844 handleDoctor 「5. Workspace shell ready」)・`amadeus-log-subagent.ts:41,48,50-52`(#845)・`amadeus-learnings.ts:127-153`(#849 readRuntimeStageRow、self-heal seam=`amadeus-runtime.ts:319` `export function compile`)
- 更新した成果物: `code-quality-assessment.md`(本 intent の restart-loss クラス5欠陥横断分類節を先頭新設 + 先頭バナー履歴化 + batch5 節の「本 intent」自己参照を履歴ラベル化 cid:reverse-engineering:c3-relabel)、本ファイル(鮮度ポインタ)。他成果物(architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / business-overview)は5件が挙動欠陥で構造変化を伴わず、かつ base→observed のフォーカス面が実質無変更のため温存(churn 回避、前例=p3-cleanup-batch5/batch4 の判断)。archive 参照解4件はすべて旧系譜パス `.agents/amadeus/{tools,hooks}/...` で、現行正本 `packages/framework/core/{tools,hooks}/...` へ読み替えて移植する(#834 は参照解なしの新規修正)。

## 実行メタデータ(履歴: 260711-p3-repair-batch6)

- Date: 2026-07-11
- Intent: `260711-p3-repair-batch6`(P3 修理6件 — #841 tryEmitSwarm が完了バッチ非除外で静的 batches[0] 再提示 / #842 jump が backward でも PHASE_VERIFIED emit・多相 forward 単一化・PHASE_SKIPPED 不在 / #836 delegate 承認で Phase Progress ロールアップ未更新 / #840 detectWorkspace が SCAN_SOURCE_DIRS 限定で Greenfield 誤判定 / #847 sensor-linter が eslint ラップ専用で lint:check 2段検出不在 / #848 docs-only の workspace_requires 免除経路 declare-docs-only/GUARD_EXEMPTED 喪失)
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/codex-engineer-3`(branch `claude-engineer-6`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。base=`d8de2362b`(前回 batch5 RE observed)、observed=`37ad36a97`(現 origin/main)。介在13コミットのうち `packages/framework/core/tools/` のコア tools 変更は `amadeus-lib.ts`(#859 adapter mint を共有分類器へ経路変更ほか、+84)/`amadeus-state.ts`(+6)/`amadeus-swarm.ts`(+2)/`amadeus-utility.ts`(+5)の4ファイルに限定。**本 intent のフォーカス6欠陥が属する `amadeus-orchestrate.ts` / `amadeus-jump.ts` / `amadeus-sensor-linter.ts` / `amadeus-graph.ts` / `amadeus-stage-schema.ts` は本区間で未変更**。6欠陥は本区間の新規回帰ではなく、より古い時点で着地した元修正(#486=`3eca83a56` / #481=`2c2c48a39` / #459=`765fe4f20` / #538=`c6597bf18` / #499=`c8ddabffc`)が restart/reset により喪失し元修正前へ逆戻りした既存欠陥で、現 observed で全件現存。Always-rerun-for-freshness は差分実測(コア tools 4ファイルの差分確認+フォーカス5ファイル無変更判定+6欠陥の現行 file:line 実読)で満たした。base/observed の真実源は本 intent の `inception/reverse-engineering/scan-notes.md`。
- 実施体制: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `amadeus-orchestrate.ts:1703/:1717-1720`(#841 tryEmitSwarm)・`amadeus-jump.ts:432-447`(#842 phase 境界 emit)・`amadeus-utility.ts:2449/:2396-2414`(#836 Phase Progress 書き込み)+ `amadeus-state.ts:1135/:1655`(#836 advance/delegate 経路)・`amadeus-utility.ts:1917/:1949-1954/:1762`(#840 detectWorkspace/SCAN_SOURCE_DIRS)・`amadeus-sensor-linter.ts:5-43`(#847 eslint ラップ専用)・`amadeus-state.ts:952/:967-975`(#848 workspace_requires 拒否経路)+ 免除経路の不在確認
- 更新した成果物: `code-quality-assessment.md`(本 intent の restart 喪失 regression 6欠陥横断分類節を先頭新設 + 先頭バナーの batch6 現行化 + batch5 節見出しの「候補」→履歴ラベル化&修正着地状態行の追記 cid:reverse-engineering:c3-relabel)、本ファイル(鮮度ポインタ)。他成果物(architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / business-overview)は6件が挙動欠陥で構造変化を伴わず、かつ batch5 修正着地(lib/utility/swarm/state)も既存インベントリ済みコアツールの内部挙動変更で構造非改変のため温存(churn 回避、前例=p3-cleanup-batch5/batch4 の判断)。#840 の detectWorkspace 現状(SCAN_SOURCE_DIRS 限定で本 repo を Greenfield 誤判定しうる)は workspace 分類の CodeKB 根拠の現行限界として code-quality-assessment 内で接地済み。

## 実行メタデータ(履歴: 260710-p3-cleanup-batch5)

- Date: 2026-07-11
- Intent: `260710-p3-cleanup-batch5`(P3 候補6件 — #811 adapter inline mint が #755 分類器バイパス / #822 kiro 系 runCore の cwd 喪失 / #830 doctor Check1/3 の anchored base dir 非適用 = #746 残渣 / #730 bun lcov の関数内コメント/空白行 DA:0 の merge union false-red / #819 t92 case 15 の非ヘルメティック実 eslint spawn フレーク / #831 t76 test 12 の cursor 解決/timeOrigin 依存フレーク)
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/codex-engineer-2`(branch `intent/p3-cleanup-batch5`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。base=`58f3453ad`(前回 batch4 RE observed)、observed=`d8de2362b`(コード基準、origin/main の batch3/batch4 全着地点)。現 HEAD `6279efe58` は `d8de2362b` の1コミット先だが intent birth checkpoint のみでフォーカスファイル無変更。介在16コミットのうちフォーカス領域に触れたのは #751(codex adapter wrapContext のみ)/#753(kiro-ide buildForward のみ)/#746(worktreeBaseDir 昇格、utility.ts 未変更)/#758(stop-hook carve-out)の4件だが、**いずれも本候補6件の欠陥箇所は未修正で行番号シフトのみ** — 6件は差分区間を通じて現存する欠陥。Always-rerun-for-freshness は差分実測(行番号現行値更新+未修正判定)で満たした。base/observed の真実源は当該 intent(260710-p3-cleanup-batch5)の `inception/reverse-engineering/scan-notes.md`。
- 実施体制: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `harness/{codex,kiro,kiro-ide}/hooks/amadeus-*-adapter.ts`(#811 mint case / #822 runCore cwd)・`core/hooks/amadeus-mint-presence.ts:65` + `core/tools/amadeus-lib.ts:347`(#811 対照分類器)・`amadeus-utility.ts:831/:960/:998`(#830 doctor Check1/2/3)・`tests/run-tests.ts:509/:534/:674/:689`(#730 normalize/combine coverage)・`tests/integration/t92.test.ts:327/:610/:661`(#819 fire/runFailedTsReal/case 15)・`tests/unit/t76.test.ts:626-654` + lib `:2775-2851/:3135`(#831 auditLockDir/staleness/retry)
- 更新した成果物: `code-quality-assessment.md`(当該 intent(260710-p3-cleanup-batch5)の候補6欠陥横断分類節を先頭新設 + 先頭バナー/batch4 節見出しの「本 intent」→履歴ラベル化 + batch4 節へ全6件修正済み状態行を追記 cid:reverse-engineering:c3-relabel)、本ファイル(鮮度ポインタ)。他成果物(architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / business-overview)は6件が挙動欠陥で構造変化を伴わないため温存(churn 回避、前例=p3-cleanup-batch4 の判断)。ただし #811 起票の対照実装 path 誤り(core/tools → 正は `core/hooks/amadeus-mint-presence.ts:65`)は code-quality-assessment の #811 節で正誤を吸収済み。

## 実行メタデータ(履歴: 260710-p3-cleanup-batch4)

> 全6件修正着地済み(2026-07-10、PR #823/#821/#817/#818/#814/#815)。

- Date: 2026-07-10
- Intent: `260710-p3-cleanup-batch4`(P3 バグ6件 — #757 sensor-fire の生パス glob / #758 stop-hook carve-out の mutating verb 漏れ / #753 kiro-ide adapter の IDE/CLI 語彙不一致 dead seam / #739 promote-self walk の dangling symlink クラッシュ / #740 prerelease バッジ 404 / #784 gen-coverage-registry --check の無診断クラッシュ)
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/codex-engineer-2`(branch `intent/p3-cleanup-batch4`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。base=`da1611a9a`(前回 observed 相当)、observed=`58f3453ad`(現 HEAD = main)。焦点9ファイル中7ファイルは `da1611a9a..HEAD` で無変更(起票時照合が有効)、2ファイルのみ変更 — `amadeus-sensor-fire.ts`(#793、`d715b8224`、行 +3 シフトのみで #757 欠陥不変)/`amadeus-state.ts`(#804、`d9d7b6ba4`、switch 下方シフトのみで #758 が数える7 verb 不変)。base/observed の真実源は本 intent の `inception/reverse-engineering/scan-notes.md`。
- 実施体制: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `amadeus-sensor-fire.ts`(#757)・`amadeus-stop.ts` + `amadeus-state.ts` switch(#758)・`kiro-ide/hooks/amadeus-kiro-adapter.ts` + `.kiro.hook`(#753)・`scripts/promote-self.ts`(#739)・`scripts/release-version-sync-plan.ts` + `release.yml`(#740)・`tests/gen-coverage-registry.ts`(#784)
- 更新した成果物: `code-quality-assessment.md`(本 intent の P3 6欠陥横断分類節を追加)、本ファイル(鮮度ポインタ)。他成果物(architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / business-overview)は6件が挙動欠陥で構造変化を伴わないため温存(churn 回避、cid:practices-discovery:c2 相当。前例=core-repair-batch3 の判断)。

## 実行メタデータ(履歴: 260710-core-repair-batch3)

- Date: 2026-07-11
- Intent: `260710-core-repair-batch3`(バッチ3: #746 / #786 / #742 / #743 / #747 / #741 / #751 / #744 / #749 / #750 — swarm/bolt の worktreePath read/write 非対称 / learnings emitKey の生 NUL バイト / setup の err swallow・非アトミック書き込み・prerelease 順序無視 / t90 test 13 の wallclock フレーク / codex adapter のレガシー flat root 参照 / orchestrate の PHASE_NUMBERS prototype-chain・single skeleton-gate 詰み・Branch 0 除外欠落)
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/claude-engineer-3`(branch `intent/batch-c-learnings-audit`。焦点コードは origin/main と同一を都度確認)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1、E-L3 追補適用)。**焦点コードは base→observed でいずれも無変更**(`amadeus-swarm.ts`/`amadeus-learnings.ts`/`amadeus-orchestrate.ts` と setup の installation/upgrade/semver-factory、codex adapter、t90.test.ts は全て UNCHANGED。`amadeus-lib.ts`/`amadeus-jump.ts`/`amadeus-state.ts`/setup `fsops.ts`/`resolver.ts` は区間内変更ありだが**焦点行は無変更で行番号のみシフト**)。14コミットの差分区間はバッチ D と周辺 hooks/presence 修理が着地したが焦点面に非関与のため、バッチ3の10 Issue は差分区間を通じて現存する欠陥。Always-rerun-for-freshness は「焦点コード無変更」の確認で満たした。
- Base commit(前回 observed): `da1611a9ace9dc81d92c7c617d506bde938fa4cc`(= tools-dispatch-batch の observed)
- Observed commit(現 origin/main): `58f3453ad0d2cee653619c9fbc27ec3888f1d110`(差分区間 `da1611a9a..origin/main` は14コミット)
- 実施体制: Developer(スキャン)→ Architect(合成)の 2 サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `amadeus-lib.ts`(`:1905-1907` worktreePath / `:86` PHASE_NUMBERS / `:4124` firstInScopeStageOfPhase / `:850` FLAT_MIGRATION_ROOT / `:2120` hooksHealthDir)・`amadeus-swarm.ts`(`:233` verdictFor の生 read)・`amadeus-learnings.ts`(`:571` emitKey の生 NUL)・`amadeus-orchestrate.ts`(`:2194` canonicalisePhase / `:1017-1031` computeGate / `:1948-` emitSingleRunStage / `:1115-1117` Branch 0)・`amadeus-jump.ts:176`・`amadeus-state.ts:2512`(#744 各サイト)・setup `installation.ts:28-45`(#742)・`fsops.ts:66`(#743)・`semver-factory.ts:15-21`/`upgrade.ts:42`(#747)・`amadeus-codex-adapter.ts:193/198/200-217`(#751)・`tests/integration/t90.test.ts:503`(#741)
- 更新した成果物: `architecture.md`(「core-repair-batch3(2026-07-11)の観測面」節を新設 + 先頭バナー履歴化 + tools-dispatch-batch 節の「本 intent」→履歴ラベル化)、`code-quality-assessment.md`(同名品質観測節を先頭新設 + 先頭バナー/tools-dispatch-batch 節の「本 intent」→履歴ラベル化)、本ファイル(鮮度ポインタ)。他成果物(business-overview / code-structure / api-documentation / component-inventory / technology-stack / dependencies)は base→observed 無変更かつ焦点欠陥が構造変化を伴わない挙動欠陥のため内容追記なし(churn 回避、前回 RE と同判断)。

## 実行メタデータ(履歴: 260710-complexity-gate)

- Date: 2026-07-10
- Intent: `260710-complexity-gate`(CI にコード複雑度の増加を機械的に止める2層ゲート — Biome `noExcessiveCognitiveComplexity` warn + lizard CCN の baseline ラチェット — を導入する)
- Scope: `feature`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/claude-engineer-2`(branch `intent/codecov-project-gate`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。フォーカス5面(`ci.yml`・`tests/coverage-project-gate.ts`・`gen-coverage-registry.ts`・`biome.json`・`package.json`)。フォーカス面のコード diff は `ci.yml` +18/-3・`tests/coverage-project-gate.ts` 新規 +236 で、`gen-coverage-registry.ts`・`biome.json`・`package.json` は base→observed で無変更。base/observed の真実源は per-intent の `re-scans/`(共有本ファイルは鮮度ポインタ)。
- Base commit: `584262c1a`(前回スキャン observed)
- Observed commit: `05141555b`(現 HEAD 実測)
- 実施体制: Developer(スキャン)→ Architect(合成)の 2 サブエージェント直列(cid:reverse-engineering:c3)
- Focus: ゲート系ツールの正準テンプレート(`coverage-project-gate.ts` の env seam・parse-don't-validate・fail-closed 5値 FailReason・`--check`/`--update`)・CI ジョブ DAG(`check`/`coverage`/`codecov-status`/`ci-success`、#777 concurrency・#801 Codecov flags 削除)・lizard 複雑度分布実測(1,093関数、CCN>15 が 42、最大 `blockBoltSlug` 65)・Biome lint スコープ(`tests/ packages/setup/`)拡大対象
- 更新した成果物: `code-quality-assessment.md`(複雑度ゲート導入節=分布実測+2層ゲート計画を先頭に追加)、`architecture.md`(ゲート系ツールの正準テンプレートと CI ジョブ構成節を追加)、`code-structure.md`(ゲート系ツールの構造テンプレート節を追加)、`technology-stack.md`・`dependencies.md`(lizard 1.23.0 pip 固定導入予定 + Biome noExcessiveCognitiveComplexity 有効化予定)、本ファイル(鮮度ポインタ)。全 codekb ファイルに c3-relabel(旧 intent の現在時制マーカー→履歴ラベル)を適用。business-overview / api-documentation / component-inventory は relabel のみ。

## 実行メタデータ(履歴: 260710-tools-dispatch-batch)

- Date: 2026-07-10
- Intent: `260710-tools-dispatch-batch`(バッチ D: #774 / #785 / #787 / #788 / #789 — setup version resolver のページング欠落 / runner-gen prune の非対称 / jump execute の direction 非再導出 / graph・runtime dispatch の prototype-chain / state advance の nextSlug 方向盲目)
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/claude-engineer-3`(作業ツリー HEAD `c59c5a9c7`、branch `intent/batch-c-learnings-audit` 上だが焦点コードは origin/main と同一)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。**焦点5ファイルは base→observed でコード diff 空**(setup resolver/http は 2026-07-09、core tools は `0801d2100`=2026-07-07 が最終変更。`amadeus-runtime.ts` のみ #781 で改変されたが dispatch site を含む hunk は無し)。9 コミットの差分区間はいずれも Batch D の焦点面に非関与のため、Batch D の5 Issue は差分区間を通じて現存する欠陥。Always-rerun-for-freshness は「焦点コード無変更」の確認で満たした。
- Base commit(前回 observed): `8e212dbbb4c52939638c5cef18732cb351771259`
- Observed commit(現 origin/main): `da1611a9ace9dc81d92c7c617d506bde938fa4cc`(差分区間 `8e212dbbb..origin/main` は9コミット)
- 実施体制: Developer(スキャン)→ Architect(合成)の 2 サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `packages/setup/src/modules/resolver.ts`(`:12` BR-F09 / `:22-37` fetchNames の単一ページ / `:57-79` resolveVersion)・`packages/setup/src/ports/http.ts`(`:9-12` getJson がヘッダ非露出)・`amadeus-runner-gen.ts`(`:295-300` prune の loadGraph 限定 / `:324-365` onDiskRunnerSlugs 対 compiledSet)・`amadeus-jump.ts`(`:220-` handleExecute の direction 非再導出 / `:173-180` handleResolve が権威)・`amadeus-graph.ts`(`:1670`/`:1901` COMMANDS[cmd])・`amadeus-runtime.ts`(`:1412`/`:1453` SUBCOMMANDS[cmd])・`amadeus-state.ts`(`:1005-1018` advance の nextSlug 検証 / `:1077` crossesPhaseBoundary の方向盲目 / `:1103-1126` phase イベント emit)
- 更新した成果物: `architecture.md`(「tools-dispatch-batch(2026-07-10)の観測面」節を新設 + 先頭バナー履歴化)、`code-quality-assessment.md`(同名観測節を新設 + 先頭バナー/旧節見出しの履歴化)、本ファイル(鮮度ポインタ)。他成果物(business-overview / code-structure / api-documentation / component-inventory / technology-stack / dependencies)は c3-relabel の該当箇所を履歴ラベル化するのみで内容追記なし(焦点欠陥は構造変化を伴わない挙動欠陥のため churn 回避、前回 RE と同判断)。

## 実行メタデータ(前々回: 260710-learnings-audit-batch)

- Date: 2026-07-10
- Intent: `260710-learnings-audit-batch`(バッチ C: #754 / #745 / #761 — §13 learnings の persist 判定と runtime 集計窓の欠陥修理)
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/claude-engineer-3`(branch `intent/batch-c-learnings-audit`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。**焦点2ファイル `amadeus-learnings.ts` / `amadeus-runtime.ts` は base→observed でコード diff 空**(最終変更 `0801d2100`=2026-07-07、前回スキャン base より前)。よって前回理解を温存し、バッチ C が要求する「persist 判定マトリクスの真理値表」「per-unit learnings 集計窓のデータフロー」を現行コード直読で第一級の事実として codekb に整理した。
- Base commit: `584262c1a9b9d6beac11cb0b98d03f2fc001fba6`(前回 observed = intent 260710-source-unreferenced-check)
- Observed commit: `8e212dbbb`(origin/main 最新 = PR #759 込み)を含む現 HEAD `intent/batch-c-learnings-audit`。差分区間 `584262c1a..HEAD` は #759(package.ts source scan)等の後半マージ群だが**焦点2ファイルは無変更**。
- 実施体制: Developer(スキャン)→ Architect(合成)の 2 サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `amadeus-learnings.ts` `handlePersist`(:411-608 の dedup 判定マトリクス、:407 cidMarker、:431 静的 auditContent スナップショット、:348-358 priorAuditRow、:508-511 flush)・`amadeus-runtime.ts`(:684-700 countLearnings、:702-755 populator の instance-bearing/single 分岐、:461-560 rollup null-out、:974-976 summarize 集計、:1034 maxInstanceCompletedAt)
- 更新した成果物: `architecture.md`(「§13 learnings persist 判定マトリクスと audit 整合」「runtime learnings 集計の窓(per-unit)」の2新設節 + 先頭バナー履歴化)、`code-quality-assessment.md`(learnings-audit-batch 観測節 + 先頭バナー/mint-presence 節見出しの履歴化)、本ファイル(鮮度ポインタ)。`code-structure.md` は**無変更**(両焦点ファイルは既存インベントリ済みのコアツールで、欠陥は構造変化を伴わない挙動欠陥のため churn 回避)。他成果物は base→observed 無変更かつ本 intent 観測面と無関係のため温存(cid:practices-discovery:c2 相当)。

## 実行メタデータ(履歴: 260710-bughunt-fix-batch)

- Date: 2026-07-10
- Intent: `260710-bughunt-fix-batch`(#771/#773/#775/#776/#779 の5バグをまとめて修理するバッチ)
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/codex-engineer-3`(branch `claude-engineer-6`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。base→observed でフォーカス5面のうち `scripts/package.ts`(#759=#735)・`amadeus-lib.ts`(#756=#736)・`amadeus-runtime.ts`(#781=#761)に**実コード差分あり**だが、いずれも今回の修理対象欠陥そのものは**未修正**(5バグは全て現行コードに残存、file:line で裏取り)。base/observed の真実源は per-intent の `re-scans/260710-bughunt-fix-batch.md`。
- Base commit: `fc5a34cf194aac05a4913e99eb7f9c4707d9d8e1`(前回 observed = intent 260710-mint-presence-vectors)
- Observed commit: `b845478bbf25a534a59f97f18e5a4a2a5a4e239c`(現 HEAD 実測)
- 差分規模: `git diff --name-status <base>..<observed> -- ':!amadeus/' ':!dist/'` は **37 ファイル**(amadeus-lib/runtime/state/learnings の core+self-install コピー、ci.yml、codecov.yml、package.ts、promote-self.ts、manifest-types.ts、harness/codex/emit.ts、tests 多数 — 自前 coverage gate 新設 `tests/coverage-project-gate.ts`/baseline JSON を含む)。
- 実施体制: Developer(スキャン)→ Architect(合成)の 2 サブエージェント直列(cid:reverse-engineering:c3)
- Focus: (#771)`scripts/package.ts` writeHarness/checkHarness、(#773)`packages/setup/src/ports/fsops.ts` resolveUnderRoot + `scripts/package.ts:644`、(#775)`core/hooks/` の audit-logger/sensor-fire/log-subagent/validate-state の pre-init ガード、(#776)`core/hooks/amadeus-sync-statusline.ts` の Bun.spawnSync、(#779)`amadeus-lib.ts` の isoTimestamp/scanPresenceLedger/auditShards と消費者(humanActedSinceGate/humanActedSinceLastAnswer/runtime.ts pairStartedCompleted)。
- 更新した成果物: `code-quality-assessment.md`(本 intent 観測節を先頭に追加 + 直近 mint-presence マーカーを履歴ラベル化 cid:reverse-engineering:c3-relabel)、`code-structure.md`(自前 project ゲート出荷後状態を追補)、本ファイル(鮮度ポインタ)。`architecture.md` は skeleton 不変・新規 architecture decision 無しのため温存。他成果物も base→observed 無変更かつ本 intent 観測面と無関係のため温存(churn 回避)。

## 実行メタデータ(前々々回: 260710-mint-presence-vectors)

- Date: 2026-07-10
- Intent: `260710-mint-presence-vectors`(#755 — machine-injected-turn 分類器が `<task-notification>` 開頭のみを抑止し、teammate-message 注入ターン(agmsg/SendMessage inbox 配信、形式 D)が phantom HUMAN_TURN を鋳造して human-presence gate と #671 委任 provenance を汚染する)
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/codex-engineer-1`(branch `diag/683-codecov-project-numeric-target`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。フォーカス面のコード diff は**空**(base→observed でソース無変更)のため前回理解を温存し、e1/e6/e5 の 3 者食い違いを動的実測(隔離 temp プロジェクトでの合成 stdin 測定)+ 本番 Claude Code transcript の法医学的照合で確定した。base/observed の真実源は per-intent の `re-scans/260710-mint-presence-vectors.md`(共有本ファイルは鮮度ポインタでありベース点ではない)。
- Base commit: `584262c1a9b9d6beac11cb0b98d03f2fc001fba6`(前回 observed = intent 260710-source-unreferenced-check)
- Observed commit: `fc5a34cf194aac05a4913e99eb7f9c4707d9d8e1`(現 HEAD 実測)
- 実施体制: Developer(スキャン)→ Architect(合成)の 2 サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `amadeus-mint-presence.ts`(分類器)・`amadeus-stop.ts` tier-3(`transcriptIsConversational`)・`amadeus-lib.ts` `humanActedSinceGate`・`amadeus-state.ts` 委任 grounding・`tests/unit/t203-mint-presence-classify.test.ts`
- 更新した成果物: `code-quality-assessment.md`(#755 観測節を追加)、`architecture.md`(注入分類カタログ非共有の構造事実を追補)、本ファイル(鮮度ポインタ)。他成果物は base→observed 無変更かつ当該 intent 観測面と無関係のため温存(churn 回避、cid:practices-discovery:c2 相当)。

## 実行メタデータ(前々々々回: 260710-source-unreferenced-check)

- Date: 2026-07-10
- Intent: `260710-source-unreferenced-chec`
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/claude-engineer-3`(branch `intent/735-source-unreferenced-check`, base `origin/main`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(前回スキャンコミットからの差分更新。project.md 是正事項 cid:reverse-engineering:c1 に従う)
- Base commit(前回 codekb 観測コミット): `162553b99`(intent `260709-bug-zero-batch` の統合版、`codekb/amadeus/` 一本化後。前回 gate-mechanics スキャンもこのコミットを観測対象としており、実コード diff は0だった)
- Observed commit: `584262c1a9b9d6beac11cb0b98d03f2fc001fba6`(現 HEAD、`origin/main` = #737 込みをマージ済み)
- 差分規模: `git log 162553b99..HEAD` は38コミット。本日の main マージ群(#711/#712/#713/#714/#715/#716、#721/#722/#724/#725/#726、#732、#727=#670修正、#729=#685修正、#737=#719修正 等)を含み、当該スキャンは前回2スキャン(bug-zero-batch/gate-mechanics)と異なり**実コードに差分がある**。
- Focus: Issue #735 が依存する理解面 — **packaging の入力集合と source 側 unreferenced 検査点**。`scripts/package.ts`(`checkHarness`/`buildTree`)、全 harness の `manifest.ts`(`harnessFiles`/`renames`/`authoredExempt`/`emit`)、#737(kiro CLI の stale `.kiro.hook` 削除 + vacuous exemption 除去)と #711(dist 全域 orphan scan)を重点読解。
- ベースにした codekb: `amadeus/spaces/default/codekb/amadeus/`(2026-07-09、intent `260709-gate-mechanics` 版)

## 再検証結果(source-unreferenced-check の差分、履歴)

38コミットのうち、前回 codekb(gate-mechanics 版)の記述を陳腐化させる主要変更と、#735 の理解面に新規に加える読解結果を記録する。

### 前回 codekb を陳腐化させた変更(2バグとも出荷済みに)

- **#685 delegate-rejection は解消済み(#729)**: 前回 codekb は「REJECT 側に delegate-approval 相当の遠隔委任機構が存在しない」と記録していたが、`14d1146e0`「fix #685: add DELEGATED_REJECTION ... (#729)」がマージ済み。現在 `amadeus-state.ts` の subcommand dispatch(L262-263)に `delegate-rejection` → `handleDelegateRejection` があり、`amadeus-audit.ts` の `VALID_EVENT_TYPES`(L73)と presence/provenance の trusted-writer 集合(L755)に `DELEGATED_REJECTION` が追加された。`humanActedSinceGate` は「`DELEGATED_APPROVAL` は approve のみ、`DELEGATED_REJECTION` は reject のみを開く」verb-scoped presence に分離されている(`amadeus-state.ts` L1444 近傍のコメント)。architecture.md・code-structure.md・api-documentation.md 等の #685「不在」記述は歴史的記録であり、以後は「#685 は fix 済み」を前提にする。
- **#670 sibling-worktree guard は解消済み(#727)**: 前回 codekb は `assertNotSiblingWorktree` が sibling worktree を無条件拒否すると記録していたが、`20c2e9674`「fix #670: anchor amadeus-worktree write paths to the main checkout (#727)」がマージ済み。現在 `amadeus-worktree.ts` は無条件拒否をやめ、cwd を分類して write パスをメインチェックアウトへ**アンカー**する方式(戻り値 `{ cwdTop, mainCheckout }`、L116-123)。sibling dev worktree から呼んでも Bolt worktree はメインチェックアウトの sibling として作成/マージ/破棄される(冒頭コメント L12-13、分類コメント L133-137)。architecture.md・code-structure.md の #670「無条件拒否」記述は歴史的記録。

### #735 の理解面(新規読解)

- **build が読む「入力集合」の確定点**: `scripts/package.ts` の `buildTree`(L307)が、build がソースとして消費する集合を確定する。(1)`core/<coreDirs[].src>` を `walk()` で列挙(L322-344)、(2)`harness/<name>/<harnessFiles[].src>` を個別コピー(L357-363)、(3)onboarding skeleton(L370-376)、(4)`core/memory/` を `emitMemory`/`emitMemorySeed`(L382-395)、(5)`emit()` プラグイン(codex のみ、L446-458)。harness ソースは**ディレクトリ全体を walk せず `harnessFiles` に列挙された src だけ**をコピーする — したがって `harness/<name>/` 配下の未列挙ファイルは build から完全に不可視になる。
- **source 側 unreferenced 検査は現状不在**: `checkHarness`(L554)の orphan 検出はすべて **dist 出力側**(committed dist vs 再ビルド dist)で働く(harness-dir orphan L574-582、dist 全域 orphan L605-628、#711 で追加)。`harness/<name>/` の authored ソースが manifest のどの行からも参照されない場合、それは dist に到達しないため dist orphan scan では検出できない。これが #735 が塞ごうとしているギャップ。
- **#737 = このギャップの実害例**: kiro CLI harness に7個の `.kiro.hook` ソースファイルが manifest 未参照のまま残存し(dist へ出荷されず)、しかも kiro manifest の `authoredExempt` に「dist/kiro には元々存在しない」ファイル種別を除外する vacuous な regex `/^hooks\/[^/]+\.kiro\.hook$/` があった。#737 は7ファイルを削除し vacuous exemption を除去、`t148` に「CLI harness ソースに `.kiro.hook` が0個」の再注入ガードを追加した(`tests/smoke/t148-kiro-file-structure.test.ts`)。詳細は code-quality-assessment.md・code-structure.md「packaging」節を参照。

## 実行メタデータ(前回: 260709-bug-zero-batch、履歴として保持)

- Date: 2026-07-09
- Intent: `260709-bug-zero-batch`
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/claude-engineer-1`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(前回スキャンコミットからの差分更新。project.md 是正事項 cid:reverse-engineering:c1 に従う)
- Base commit: `aff3b6671`(`amadeus/spaces/default/codekb/claude-leader/` の観測コミット、前回 intent `260709-framework-repair-batch` のスキャン)
- Observed commit: `a1c79dc12df38a8363524116eff9d877677a7224`
- Focus: 修理対象バグ6件 — #674(`amadeus-swarm.ts` finalize の merge-back/audit 分離)、#675(`amadeus-state.ts` reject の human-presence guard 欠落)、#676(`amadeus-bolt.ts` start + `amadeus-lib.ts` auditFilePath の bare fallback)、#677(`packages/setup/src/ports/http.ts` getJson の json() 未保護)、#678(`packages/setup/src/internal/tar-archive-extractor.ts` の PAX/GNU longname 状態)、#668(`amadeus-utility.ts`/`amadeus-lib.ts` の codekb-path `<repo>` セグメント導出)
- ベースにした codekb: `amadeus/spaces/default/codekb/claude-leader/`(2026-07-09、intent `260709-framework-repair-batch`、対象バグ #656/#657/#641/#661)

## 分析範囲

`git diff --name-status aff3b6671..HEAD` で143ファイルの差分を確認した(19コミット、うち大半は `origin/claude-leader` ブランチのマージ)。主な変更内容は次の通り。

- `modelOverride` → `model` へのエージェント frontmatter 改名(PR #669、114ファイル規模、`.claude`/`.codex`/`dist/*`/`packages/framework/core/agents/` の全複製箇所)。
- `amadeus/spaces/default/codekb/claude-leader/` の新設(前回 intent `260709-framework-repair-batch` のスキャン結果、9ファイル)。
- `amadeus/spaces/default/intents/260709-canonical-settings/`・`260709-framework-repair-batch/` の工程記録追加(ideation/requirements-analysis の memory・questions・requirements)。
- `amadeus/spaces/default/memory/team.md` への §13 学習事項の複数追記(human-presence interim 運用、auto-gate-approval、blocker-election 等の運用ノルム)。

この差分自体は当該 intent(bug-zero-batch)が対象とする6バグのコード領域(`amadeus-swarm.ts`/`amadeus-state.ts`/`amadeus-bolt.ts`/`amadeus-lib.ts`/`packages/setup/src/ports/http.ts`/`packages/setup/src/internal/tar-archive-extractor.ts`)に変更を加えていない。したがって6バグはこの差分区間の前後を通じて存在し続けている欠陥である。

重点スキャン対象は次の6ファイル/領域(すべて実コードを直接読解して確認)。

- `packages/framework/core/tools/amadeus-swarm.ts` L484-631(`handleFinalize`)— #674
- `packages/framework/core/tools/amadeus-state.ts` L1286-1487(`handleApprove`/`handleReject`)— #675
- `packages/framework/core/tools/amadeus-bolt.ts` L180-239(`start` の `--worktree` パス)+ `amadeus-lib.ts` L1246-1271(`stateFilePath`/`auditFilePath`)— #676
- `packages/setup/src/ports/http.ts` 全体(84行)— #677
- `packages/setup/src/internal/tar-archive-extractor.ts` 全体(228行)— #678
- `packages/framework/core/tools/amadeus-lib.ts` L495-524(`codekbRepoName`)+ `amadeus-utility.ts` L2690-2699(`codekb-path` ハンドラ)— #668

## 鮮度に関する注記

ベースライン `amadeus/spaces/default/codekb/claude-leader/`(2026-07-09、intent `260709-framework-repair-batch`)は #656/#657/#641/#661 という前回バッチの4バグを主眼に書かれており、当該 intent(bug-zero-batch)が対象とする6バグには一言も触れていない。当該スキャンはこの前提を次のように更新した。

- 対象バグ群を完全に入れ替えた(#656/#657/#641/#661 → #674/#675/#676/#677/#678/#668)。前回バッチの4件はこの codekb では扱わない。
- 前回バッチのうち #656(`Installation.detect` が `LegacyLayout` を呼ばない)は、`upgrade.ts:192` で `Installation.detect` の evidence を `LegacyLayout.isUnsupported` に渡す配線が確認でき、解消済みと判断した。#657(`bunx tsc` の無条件使用)は `amadeus-sensor-type-check.ts:157,174` の時点でも変更が確認できず、未修理のまま残存している。#641・#661 は本スキャンの重点対象外のため状態未確認。これらは当該 intent のスコープではないため、修理判断は行わず状態のみを記録する。
- `packages/framework/core/`・`packages/setup/` の全体構造(one-core-many-harnesses、functional-domain-modeling-ts スタイル)自体は前回スキャン時点から変更なし。

## 合成方針(Architect 想定)

Developer スキャン結果として、6アーティファクト構造(business-overview / architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment / reverse-engineering-timestamp の9ファイル)を diff-refresh 方式で更新した。前回バッチの4バグに関する記述は新しい6バグの記述に置き換え、全体構造・技術スタック・依存関係グラフのうち変更がない節(one-core-many-harnesses、Bun/TypeScript/Biome スタック、`release.yml` 一本化のバージョン運用)はベース(claude-leader 版)の記述をほぼ温存した。architecture.md に6バグそれぞれの相互作用図(シーケンス図)を新設し、原因コード位置・再現条件・修理時の波及範囲を code-structure.md・code-quality-assessment.md に集中して記述した。

## 更新した成果物

- `business-overview.md`
- `architecture.md`
- `code-structure.md`
- `api-documentation.md`
- `component-inventory.md`
- `technology-stack.md`
- `dependencies.md`
- `code-quality-assessment.md`
- `reverse-engineering-timestamp.md`

## 統合記録(AC-668-4、2026-07-09)

- **統合**: #668 修正(PR #693)マージ後、分裂していた4ディレクトリ(`amadeus`(2026-07-07 stale)/ `installer-distribution`(2026-07-08)/ `claude-leader`(2026-07-09)/ `claude-engineer-1`(2026-07-09))を本ディレクトリ `codekb/amadeus/` に一本化した
- **正の根拠**: スキャンの系譜は amadeus(7/7)→ installer-distribution(7/8、base 8510281ae)→ claude-leader(7/9、base aff3b6671)→ claude-engineer-1(7/9、base aff3b6671 の leader 版をベースに observed a1c79dc12)という差分リフレッシュの連鎖であり、最新の claude-engineer-1 版が累積 superset。本ディレクトリはその claude-engineer-1 版の git mv
- **包含チェック**: 4ディレクトリとも同一の9ファイル構成でファイル単位の欠落なし(削除分は git 履歴から復元可能)
- **以後**: `codekb-path` は #668 修正により安定名 `amadeus` を返す(このコミットで実測済み)ため、次回スキャンは本ディレクトリへの差分リフレッシュとなる

## source-unreferenced-check(intent 260710、履歴)で更新した成果物

packaging 入力集合と source-unreferenced ギャップに焦点を絞った diff-refresh。既存の bug 別ナラティブ節(#674〜#678/#668/#685/#670)は歴史的記録として温存し、上部に #735 の新規節を追記、#685(#729)/#670(#727)の解消済みバナーを各所に付す形で更新した。

- `architecture.md` — 「packaging 入力集合と source 側 unreferenced 検査」節を新設(build 入力の確定点・dist orphan scan の守備範囲・#735 のギャップ)。#685/#670 の解消済みバナーを追記。
- `code-structure.md` — 「packaging 構造(`scripts/package.ts` / harness manifests)」節を新設(`buildTree`/`checkHarness` の段構成、全 harness の `harnessFiles`/`authoredExempt` 目録)。#685/#670 解消済みバナー。
- `code-quality-assessment.md` — vacuous exemption アンチパターンと source-unreferenced ギャップを技術的負債として追記。#685/#670 解消済みバナー。
- `component-inventory.md` — `scripts/package.ts`/`scripts/manifest-types.ts`/harness manifests のコンポーネント表を追記。
- `api-documentation.md` — `scripts/package.ts`(write/`--check`)の CLI 契約を追記。#685/#670 解消済みバナー。
- `dependencies.md` — packaging 依存グラフ(core/harness → package.ts → dist の入力集合)と `fast-check` 依存追加を追記。
- `technology-stack.md` — `fast-check`(PBT、#722)、動的 test-size 計測(#732)、codecov 導入を追記。
- `business-overview.md` — 当該 intent の業務境界(source-unreferenced check)を追記。#685/#670 解消済みバナー。

## 前 intent(260709-gate-mechanics)で更新した成果物(履歴)

コード diff がないため全面リライトではなく、#685/#670 関連の新規節を追記する形の diff-refresh。

- `architecture.md` — 「#685」「#670」の相互作用図(シーケンス図)を新設。旧6バグの図は保持(#675 は解消済みと明記)。
- `code-structure.md` — gate resolution 系(`amadeus-state.ts`/`amadeus-lib.ts`)と `amadeus-worktree.ts` の該当関数表を追記。
- `component-inventory.md` — human-presence gate コンポーネント表・worktree ガードコンポーネント表を追記。
- `api-documentation.md` — `delegate-approval`/`reject` の現行契約と `amadeus-worktree create`/`bolt --worktree` の契約を追記。
- `code-quality-assessment.md` — #685・#670 のリスク評価節を追記、#675 を解消済みとして更新。
- `business-overview.md` — 当該 intent の業務境界(2バグ)を追記。
- `technology-stack.md`・`dependencies.md` — 変更なし(該当領域に新規依存・技術変更なし)、確認済みの旨のみ追記。
