# Code Generation Plan — U3 team-launcher-promotion

## 前提と責務境界

- 対象は U3 の C4（チーム起動系の配布）と C5（doctor advisory）であり、FR-3a〜3e、FR-4a〜4b、FR-8a〜8c、NFR-1〜4を実装・検証する。
- user-stories ステージは SKIP のため、各 Step は `unit-of-work-story-map.md` の FR/NFR → U3 対応へ直接トレースする。ストーリーは捏造しない。
- 現行 main には `packages/framework/core/tools/amadeus-utility.ts` の exported `resolveDoctorContext` / `handleDoctor` seam（#1413）が存在する。新しい doctor handler や subprocess 専用 seam は作らず、この既存 seam を拡張する。
- 現時点では team 3ファイルは `scripts/` にのみ存在し、`packages/framework/core/tools/` には未配置である。移設は `git mv` とし、コピー残置や二重実装を作らない。
- Comprehensive test strategy に従い unit / integration / E2E / test configuration をすべて計画する。ただし clean-env E2E の新設と fake herdr/agmsg を用いた「起動→送信→選挙完走」は U4（FR-6）の専有責務であり、U3 では実装しない。U3 の E2E 手順は、既存の配布・self-install E2E に対する回帰確認と、U4 へ渡す被検インターフェースの固定に限定する。
- API、DB、repository、migration、UI、IaC、リリース資産は本 Unit に存在しない。agmsg/herdr 本体、Windows 対応、選挙関連変更、release/version/badge/changelog は変更しない。

## 実装計画

- [x] **Step 1: 変更前ベースラインと参照面を固定する。** `git status --short` で共有 worktree の既存変更を記録して非所有変更を保護し、team 3ファイル、doctor、対象テスト、package/self-install 投影の現状を再確認する。`rg` で `scripts/team-up.sh`、`scripts/team-msg.sh`、`scripts/team-up-codex-safety-wait.ts`、`$REPO/scripts/` の全消費側を列挙し、変更対象と非対象を確定する。対象テストを変更前に実行し、件数・合否・wall-clock を保存する。**トレース:** FR-3a〜3e、FR-8a〜8b、NFR-1、NFR-2、performance-design。

- [x] **Step 2: team 3ファイルを配布正本へ移設する。** `scripts/{team-up.sh,team-msg.sh,team-up-codex-safety-wait.ts}` を `packages/framework/core/tools/` へ `git mv` し、既存 `coreDirs` の `tools` 投影を再利用する。移動後に scripts 側の同名残置が0件であること、対象3ファイルが配布正本に各1件だけ存在することを確認する。選挙ファイルや doctor seam を再実装しない。**トレース:** FR-3a、FR-3b、FR-8a、FR-8c、NFR-2、NFR-4、BR-6、BR-8。

- [x] **Step 3: 配布コピー内で完結するパス導出へ修正する。** `SAFETY_WAIT_HELPER` を `$REPO/scripts/...` から `team-up.sh` 自身のディレクトリ相対へ変更し、移動した3ファイルとそのテスト・fixture の旧パス参照を新正本へ追随させる。team-up.sh 内の `$REPO/scripts/` は run-claude/run-codex など開発用 checkout 依存も含むため、設計対象を全数分類し、U3 で配布内解決が要求された同伴ファイル参照だけを変更する。未承認の launcher 全体再設計は行わない。**トレース:** FR-3b、FR-3e、FR-8a、NFR-2、BR-6。

- [x] **Step 4: 起動前 prerequisite 検査を実装する。** `packages/framework/core/tools/team-up.sh` に `require_prerequisites()` を追加し、main 処理や herdr セッション操作より前に一度だけ呼ぶ。検査順は OS（Darwin/Linux）→ herdr → agmsg とし、失敗時は stderr に対象名、公式入手先、Team Mode docs 参照を固定文言で表示して exit 1 とする。`HERDR` と `AGMSG_ROOT` 等の既存 override を尊重し、ループ・リトライ・バージョン検査・外部コード取得は追加しない。**トレース:** FR-3c、FR-3d、FR-8a、FR-8c、NFR-2、performance/security/reliability/scalability NFR、BR-1〜4、BR-7。

- [x] **Step 5: 既存 doctor seam に advisory を追加する。** `packages/framework/core/tools/amadeus-utility.ts` に `PrereqTool`、`PrereqStatus`、`PathProbe` と exported `detectTeamPrerequisites` を追加し、既存 `handleDoctor(resolveDoctorContext(...))` の出力へ `Team Mode prerequisites:` と herdr/agmsg の各1行を組み込む。検出パスまたは固定 guidance を返し、advisory 結果を doctor の passed/failed 集計へ加えず exit code を不変にする。process-global 依存を helper 内へ隠さず PathProbe から注入し、既存 doctor handler/export を重複生成しない。**トレース:** FR-4a、FR-4b、NFR-2、NFR-3、performance/security/reliability NFR、BR-5、BR-7。

- [x] **Step 6: prerequisite 定義の機械的整合を unit test で固定する。** 実装時に未使用の新規 `tNNN` 番号を予約し、`tests/unit/` に C4/C5 の herdr/agmsg 閉集合と guidance の公式入手先が一致することを検証するテストを追加する。`detectTeamPrerequisites` の全 found、全 missing、混在、順序安定、注入 probe の呼出し回数/対象、固定 guidance を in-process で検証し、少なくとも happy path と2つ以上の edge/error case を含める。被検実装と同じ定義をテスト側で再実装する自己参照 oracle は使わない。**トレース:** FR-4a〜4b、NFR-3、BR-5、BR-7、domain-entities、tech-stack-decisions。

- [x] **Step 7: launcher の fail-fast 境界を integration test で固定する。** `tests/integration/` に新規テストを追加し、隔離した PATH/一時ディレクトリと最小 stub を使って、非対応 OS、herdr 不在、agmsg 不在、両 prerequisite 存在、`HERDR`/`AGMSG_ROOT` override を検証する。各失敗は main の副作用開始前であること、exit 1、stderr の4要素を assert する。ここではチーム全体を起動せず、メッセージ疎通や選挙完走も実施しない。**トレース:** FR-3c、FR-3d、FR-8a、FR-8c、NFR-2、reliability/security NFR、BR-1〜4。

- [x] **Step 8: 既存 unit/integration test を新正本へ追随し Should 契約を回帰確認する。** `t-team-msg`、`t-team-up-codex-resume.serial`、`t-team-up-msg-backend`、`t-team-up-watcher-arming`、`t-team-up-codex-safety-wait`、関連 t245 のうち実際に旧パスを消費する箇所だけを更新する。`--codex`、`--instance`、`-c`、`-2/-4/-6`、spawn、`TEAM_MSG`（agmsg/herdr/未知値）、`AGMSG_SEND`/`AGMSG_HISTORY` 等の既存契約が green のままであることを確認する。既存選挙テストや doctor seam テストは変更理由がある場合だけ追随する。**トレース:** FR-3e、FR-8a、FR-8b、NFR-1、NFR-2、scalability-design、BR-4。

- [x] **Step 9: Comprehensive の E2E 層を責務境界内で検証する。** 既存の package/setup/self-install E2E から team 3ファイルの投影を実際に検査しているケースを再列挙し、旧パス期待値があれば新正本へ最小追随する。該当する既存 E2E を実行して配布生成・導入の回帰を確認する。該当ケースがなければ「U3 で新規 E2E なし、U4 の clean-env E2E が C2+C4 合流後に担当」と検証記録へ明記し、U4 が利用する公開パス・exit・stderr・doctor 出力契約を Step 6〜8 で固定する。`tests/e2e/` に clean-env fixture、fake-binary journey、選挙完走テストは追加しない。**トレース:** FR-3a〜3e、FR-4a〜4b、FR-8a〜8c、NFR-1〜3、U3/U4 責務境界。

- [x] **Step 10: テスト設定とカバレッジ設定を確認する。** 本リポジトリは `tests/run-tests.ts` が `tests/unit` / `tests/integration` / `tests/e2e` を自動 discover し、独立した vitest/jest config や手動テスト登録を使わないため、新規 config は作らない。新規ファイル名・`.serial.test.ts` 要否・size annotation・coverage registry の生成規則を既存設定に合わせる。doctor の新規 TypeScript 行が `--coverage` の LCOV `DA` に実到達することを確認し、必要な canonical metadata は生成コマンドで同期する（生成物の手編集は禁止）。**トレース:** NFR-1、NFR-3、Comprehensive test strategy、cid:build-and-test:error-path-reach-lcov。

- [x] **Step 11: 配布生成物と self-install 面を同期する。** 正本変更後に `bun scripts/package.ts` と `bun run promote:self` を実行し、全6 dist の tools 投影と self-install 5面を正本から再生成する。生成面で team 3ファイルが存在し、旧 `scripts/team-*` 参照と重複残置がないことを確認する。既存 main に入った選挙関連生成物や doctor seam を巻き戻さない。**トレース:** FR-3a、FR-3b、FR-8a、NFR-1、NFR-2、NFR-4、BR-6。

- [x] **Step 12: 段階検証と最終差分監査を行う。** まず新規 unit/integration と影響既存テスト、次に relevant E2E、最後に `bun run typecheck`、`bun run lint`、`bun run dist:check`、`bun run promote:self:check`、`bash tests/run-tests.sh --ci` を実行する。変更前後の対象テスト wall-clock を機械比較し、定数回検査の有意な退行がないことを記録する。`git diff --check`、旧パス grep、変更ファイル一覧で、agmsg/herdr 同梱、U4 clean-env E2E、Windows 対応、選挙機能、release/version/badge/changelog、無関係なユーザー/他エージェント変更が diff に混入していないことを確認する。**トレース:** FR-3a〜3e、FR-4a〜4b、FR-8a〜8c、NFR-1〜4、全 BR。

## テスト配分

Comprehensive の 10〜15 tests/component は soft guideline とし、C4/C5 の新規・既存契約ケースを unit/integration へ配分する。E2E の新規 journey は U4 に重複実装せず、U3 では既存 E2E の配布回帰だけを実行する。

| 層 | U3 での扱い | 主な対象 |
|---|---|---|
| Unit | 新規 | doctor 純関数、found/missing union、順序・呼出し、C4/C5 prerequisite 集合/guidance 整合 |
| Integration | 新規+既存追随 | OS/herdr/agmsg fail-fast、override、既存 backend/launcher/安全待機契約 |
| E2E | 既存回帰のみ | package/self-install 投影。clean-env journey と選挙完走は U4 |
| Performance | 既存ランナー実測 | 対象テスト wall-clock の変更前後比較。専用 benchmark/SLO は作らない |
| Security | 既存必須検査のみ | 固定文言・PATH 読取・外部コード非同梱を unit/integration で同時検証。追加 security suite は N/A |
| Configuration | 既存設定を再利用 | Bun test auto-discovery、serial 命名、coverage registry/LCOV、生成物同期 |

## 予定変更面

- 移動: `scripts/team-up.sh`、`scripts/team-msg.sh`、`scripts/team-up-codex-safety-wait.ts`
- 移動先・修正: `packages/framework/core/tools/team-up.sh`、`packages/framework/core/tools/team-msg.sh`、`packages/framework/core/tools/team-up-codex-safety-wait.ts`
- 修正: `packages/framework/core/tools/amadeus-utility.ts`
- 新規: `tests/unit/tNNN-*.test.ts`、`tests/integration/tNNN-*.test.ts`（番号は PART 2 着手時に衝突なく予約）
- 必要時のみ追随: 旧 team パスを参照する既存 unit/integration/E2E test、canonical coverage metadata
- 再生成: `dist/` と self-install 投影面

## 完了条件

- FR-3/FR-4/FR-8 と NFR-1〜4が Step 1〜12のいずれかへ全数トレースされ、未対応項目がない。
- U3 の application code、unit/integration tests、既存 E2E 回帰、test configuration 確認が完了し、U4 の clean-env E2E 実装は混入していない。
- 対象テストと全必須検査が実測 exit 0で、scripts 側の3ファイル残置、配布面の旧参照、doctor exit code 変化、既存 env/backend 契約の回帰がない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T09:11:26Z
- **Iteration:** 1
- **Scope decision:** none

設計と実装要約の prerequisite 契約が矛盾し、FR-8a と Comprehensive test strategy の完了証拠も不足している。

### Findings

- Major: code-summary は TEAM_MSG=herdr の場合に agmsg を要求しないとするが、business-logic-model、domain-entities、BR-3/BR-7、performance-design は OS→herdr→agmsg の閉集合・固定2回検出を規定している。これは明示された逸脱ではなく、FR-3c、FR-4、NFR性能モデルのどちらを正とするか実装者が判断できないため、条件付き prerequisite 契約を全設計成果物へ伝播するか実装を設計へ戻す必要がある。
- Major: U3 は unit-of-work 上 FR-8a〜8c 全数を受け持つが、code-summary の検証証拠は launcher/backend/message と配布投影に留まり、FR-8a が要求する選挙 transport の AGMSG_SEND・既定 send.sh spawn が配布コピーで解決することを示していない。U2またはU4へ責務を移すなら unit 境界を修正し、U3完了条件のままなら該当統合テスト結果を記録する必要がある。
- Major: stage の Comprehensive strategy はコンポーネントごとの unit・integration・E2E と各10〜15テストを要求するが、code-summary は新規 unit 6件と integration 8件の合算のみで、C4/C5別の件数、E2Eケース名・結果、既存E2Eが各コンポーネント契約を満たす対応表を提示していない。U4のclean-env journeyを除外する判断自体は責務境界と整合するが、U3で要求される配布/self-install E2Eおよび規定テスト量の充足証拠にはならない。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T09:32:40Z
- **Iteration:** 2
- **Scope decision:** none

前回3件は閉包済みで、固定 prerequisite 契約、FR-8a実在経路と上流不整合の明示、C4/C5別テスト・E2E責務表を確認した。

### Findings

- None
