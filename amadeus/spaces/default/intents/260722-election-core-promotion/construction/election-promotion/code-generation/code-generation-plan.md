# Code Generation Plan — U2 election-promotion

## スコープと現物確認

- 本計画は PART 1 のみであり、実装コード・テスト・生成物には触れない。
- user-stories ステージは SKIP のため、各 Step は `requirements.md` の FR-1/FR-2、`unit-of-work.md` の U2、current unit の BR/NFRへ直接トレースする。ストーリーは捏造しない。
- 2026-07-23 の現物では、選挙5ファイルは `scripts/`、スキル正本は `contrib/skills/amadeus-election/` に残り、`packages/framework/core/{tools,skills}/` への昇格と claude/codex 配線は未実施である。
- 最新HEADの祖先には registry-backed path resolver (`d1f2ed5aa`) と migration fidelity (`8bbfb70b5`) が既にある。これらを重複実装・再設計せず、移設に必要な import／source-path 追随と回帰検証だけを行う。
- 既存の `amadeus-election-migrate.ts`、`amadeus-leader-sync.ts`、formal-verif runner、t259〜t264 は上流設計作成後に増えた消費面である。移動対象5ファイルへ追加せず、既存機能を保つための参照追随対象として扱う。
- API、DB、migration schema、UI、IaC、外部依存追加、選挙機能拡張、U4 clean-env journey、U5 docs は対象外である。

## 要件分類

| 要件 | 分類 | 現物根拠とPART 2での扱い |
|---|---|---|
| FR-1a | このIntentで追加対応必要 | 選挙5ファイルは現在も `scripts/` に存在する。`git mv` で core/tools へ移し、旧側を残さない |
| FR-1b | このIntentで追加対応必要 | CLIの `amadeus-norm-metrics` 横断importを同層相対へ変更する。追加済みのmigration/leader-sync/formal-verif消費面も新正本へパス追随する |
| FR-1c | このIntentで追加対応必要 | core/tools 投影による全6 dist と self-install 面を再生成・検証する |
| FR-1d | 検証のみ＋パス追随必要 | 9 verb、directive、store、registry resolver、migration fidelity は既存mainで実装済み。テストのimport/spawnだけを追随し、契約不変を回帰確認する |
| FR-1e | 既存mainで充足済み | application-design `decisions.md` ADR-1 がcore配置とハーネス中立性を明文化済み。新規ADRは作らず内容をレビューで再確認する |
| FR-2a | このIntentで追加対応必要 | スキル正本は現在も contrib 配下。core skillsへ `git mv` する |
| FR-2b | このIntentで追加対応必要 | SKILL.mdの旧 `scripts/amadeus-election.ts` を `{{HARNESS_DIR}}/tools/amadeus-election.ts` に全置換する |
| FR-2c | このIntentで追加対応必要 | claude manifestとcodex emitterへ追加し、cursor/kiro/kiro-ide/opencodeには配らない |
| FR-2d | このIntentで追加対応必要 | repository checkout必須というcompatibility記述をbun＋配布コピーへ更新する |

## BR/NFR分類

| 契約 | 分類 | 計画上の保証 |
|---|---|---|
| BR-1 | このIntentで追加対応必要 | `git mv`、旧側残置0、U1重複不変量green |
| BR-2 | 検証のみ＋必要最小追随 | 選挙ロジックは変更しない。設計時点後に増えたmigration/registry等の消費側はパスのみ追随し、挙動差分を作らない |
| BR-3 | このIntentで追加対応必要 | SKILL.md旧参照0件とU1 live finding 0件 |
| BR-4 | このIntentで追加対応必要 | skillはclaude/codexのみ、非対象4面は不在を機械確認 |
| BR-5 / NFR-1 | 検証のみ | typecheck、lint、dist/self-install drift、coverage registry、全CIを実測 |
| BR-6 | 既存mainで充足済み＋レビューのみ | ADR-1/ADR-3の実在・意味論を再確認し、新規文書を作らない |
| NFR-2 / Security | 検証のみ | fail-closed store、CLI契約、秘密情報・認可面、新規依存を変更しない。既存scanを維持 |
| Performance | 検証のみ | 移設前後の対象suite wall-clockを比較し、新規実行機構がないことを確認 |
| Reliability | 検証のみ | U1 guard、選挙回帰、migration fidelity、生成物drift guardをgreenにする |
| Scalability | 検証のみ | 固定5ファイル＋1 skillの投影のみで、store/registry規模特性を変更しない |

## 実装計画

- [x] **Step 1: 共有worktreeを保護し、変更前ベースラインを固定する。** `git status --short` で他Unit・他エージェントの変更を記録し、選挙5ファイル、migration/leader-sync/formal-verif、スキル、manifest/emitter、全参照を `rg` で再列挙する。t234〜t244に加え、現行mainで追加されたt259〜t264とU1 boundary guardを変更前に実行し、件数・合否・wall-clockを保存する。**トレース:** FR-1a〜1d、FR-2a〜2d、BR-1〜5、Performance、Reliability。

- [x] **Step 2: 既存mainの充足済み機能を保護対象として固定する。** registry-backed path resolver、space registry、migration preflight/fidelity、drift doctor、leader syncの現行export・テスト・関連commitを一覧化する。これらを再実装せず、移設後も同じ契約を検証する保護対象にする。ADR-1/ADR-3の内容がFR-1e/FR-2cを満たすことも再確認する。**トレース:** FR-1d、FR-1e、BR-2、BR-6、NFR-2、Security、Reliability。

- [x] **Step 3: 選挙エンジン5ファイルを配布正本へ移設する。** `scripts/amadeus-election{,-model,-store,-record,-transport}.ts` を `packages/framework/core/tools/` へ `git mv` し、scripts側の同名残置を0件にする。`amadeus-election-migrate.ts` は移動対象へ勝手に追加せずscriptsに維持する。**トレース:** FR-1a、BR-1、NFR-2。

- [x] **Step 4: 同層importと既存消費側を新正本へ最小追随する。** CLIのnorm-metrics importを `./amadeus-norm-metrics` へ変更し、5ファイル相互importがcore/tools内で閉じることを全数確認する。migration、leader-sync、formal-verif、unit/integration/E2Eのimport/spawn/source-fidelity期待値は新正本へパスだけを追随させ、registry resolverやmigrationアルゴリズムは変更しない。CLI usage内の実行例も配布パス契約と整合させる必要性を現物で判定し、必要ならパス表記だけを修正する。**トレース:** FR-1b、FR-1d、BR-2、NFR-2、Security、Reliability。

- [x] **Step 5: 選挙スキルをcore正本へ昇格する。** `contrib/skills/amadeus-election/` を `packages/framework/core/skills/amadeus-election/` へ `git mv` し、旧contrib残置を0件にする。SKILL.mdの全CLI参照を `{{HARNESS_DIR}}/tools/amadeus-election.ts` に置換し、compatibilityをbun＋配布コピーへ更新する。指令転送・人間委譲・語彙契約は変更しない。**トレース:** FR-2a、FR-2b、FR-2d、BR-2、BR-3、NFR-2。

- [x] **Step 6: claude/codexの2面だけへスキルを配線する。** claude manifestの既習core skill entryとcodex emitterの明示skill listへ `amadeus-election` を各1件追加する。cursor、kiro、kiro-ide、opencodeのmanifest/emitterは変更せず、非対象4面へのskill不在を対検査する。**トレース:** FR-2c、BR-4、ADR-3、Scalability。

- [x] **Step 7: U1 boundary guardをexpected-redからgreenへ閉包する。** SKILL参照置換後、`t258-boundary-guard` の既知contrib例外・allowlistを実態に合わせて最小更新し、live distribution corpusの `scripts/amadeus-election.ts` finding 0、移動元と配布正本の同名重複0を実測する。fixtureの落ちる実証は維持し、ガードを弱めない。**トレース:** FR-1a、FR-2a〜2b、BR-1、BR-3、Reliability。

- [x] **Step 8: C2選挙エンジンのunit testを追随・拡張する。** t234、t238、t239、t244、t260〜t262等の既存unitを新正本importへ更新する。Comprehensiveの10〜15ケース/componentをsoft guidelineとして、model/record/transport/store path/migrationの既存ケースを再集計し、FR-1の移設で新しい分岐が生じない限り機能テストを重複追加しない。不足があれば要求駆動で正本path/export不変の最小unitを追加する。**トレース:** FR-1b、FR-1d、BR-2、NFR-1〜2、Security、Reliability。

- [x] **Step 9: C2/C3境界のintegration testを追随・補強する。** t235、t236、t240〜t244、t259、t261、t262、t264およびformal-verif関連を新正本へ更新し、store/registry resolver/migration fidelity/transport/skill vocabularyを実FS・実spawnで検証する。C3はSKILL token置換、claude/codex存在、非対象4面不在、旧参照0を合わせて10〜15ケース相当まで既存＋最小追加で明示する。**トレース:** FR-1b〜1d、FR-2b〜2d、BR-2〜4、NFR-1〜2、Security、Reliability。

- [x] **Step 10: E2E責務境界内で既存journeyを回帰確認する。** `t237-election-walking-skeleton` と選挙machine executorの実CLI journeyを配布正本パスへ追随し、9 verb/directive/storeの挙動不変を確認する。U4専有のtemp HOME＋fake herdr/agmsg＋self-install合流journeyは新設しない。C3の配布は実packager/self-install検査で保証し、直接skill起動E2Eが既存0件ならその事実とU4境界をsummaryへ記録する。**トレース:** FR-1c〜1d、FR-2b〜2c、BR-2、BR-5、NFR-1〜2、U4責務境界。

- [x] **Step 11: テスト設定とcoverage metadataを同期する。** 本repoの `tests/run-tests.ts` 自動discovery、`.serial.test.ts` 規約、coverage registry/ratchetを再確認し、新規vitest/jest configは作らない。移設・spawnパス変更でmechanism分類やLCOV source pathが変わる場合のみ、生成コマンドとhonesty guardに従ってcanonical metadataを同期する。**トレース:** FR-1d、FR-2c、BR-5、NFR-1、Comprehensive test strategy。

- [x] **Step 12: 全配布生成物を正本から再生成する。** U1 guard green後に `bun scripts/package.ts` と `bun run promote:self` を実行する。全6 distのtoolsに選挙5ファイル、self-install管理面にtools、claude/codexのskill面にSKILLが存在することを確認し、生成物は手編集しない。**トレース:** FR-1c、FR-2b〜2c、BR-4〜5、NFR-1、Reliability、Scalability。

- [x] **Step 13: 非対象面と残置を機械監査する。** cursor/kiro/kiro-ide/opencodeのdistに `skills/amadeus-election` がないこと、scripts側の対象5ファイルとcontrib skillがないこと、全配布面に旧 `scripts/amadeus-election.ts` 参照がないことを確認する。`amadeus-election-migrate.ts` 等の意図的scripts資産は誤削除しない。**トレース:** FR-1a、FR-2a〜2c、BR-1、BR-3、BR-4。

- [x] **Step 14: 段階検証と最終差分監査を行う。** 新規・追随unit → integration →既存E2E → U1 guardの順に実行し、続いて `bun run typecheck`、`bun run lint`、`bun run dist:check`、`bun run promote:self:check`、`bun tests/gen-coverage-registry.ts --check`、`bash tests/run-tests.sh --ci`、`git diff --check` を実行する。対象suiteの変更前後wall-clock、C2/C3別のunit/integration/E2E件数、skip/advisoryをsummaryへ転記する。diffを移動・参照追随・配線・テストに限定し、選挙挙動、registry/migrationロジック、U3/U4/U5、release/version/docs、他者変更が混入していないことを確認する。**トレース:** FR-1a〜1e、FR-2a〜2d、BR-1〜6、全NFR。

## Comprehensive Test Strategy

| 層 | C2 Election engine | C3 Election skill |
|---|---|---|
| Unit | 既存model/record/transport/choice/registry/migration testsを新正本へ追随。10〜15は機能群ごとのsoft guidelineとして再集計 | skillは宣言資産のため純粋unitを捏造せず、token/語彙/配線判定の既存pure seamがあれば再利用 |
| Integration | store、directive loop、transport、machine executor、tie、registry resolver、migration fidelity、drift doctorを実FS/実spawnで回帰 | vocabulary、token展開、2面存在、4面不在、旧参照0、packager出力を機械検証 |
| E2E | 既存t237 walking skeletonを新正本で実行 | 直接skill E2Eの既存有無を列挙。clean-env合流journeyはU4 |
| Performance | t234〜t244＋追加済みt259〜t264のwall-clock前後比較 | package/promote時間は既存コマンド出力を記録 |
| Security | 新規攻撃面なし。fail-closed store/ballot/migrationの既存必須scanを維持 | SKILLはpath/compatibilityだけを変更し、指令転送・人間判断境界を維持 |
| Configuration | Bun auto-discovery、serial命名、coverage registryを再利用 | claude manifest/codex emitterのみ変更し、非対象4面は不変 |

## 予定変更面

- 移動: 選挙エンジン5ファイル、`contrib/skills/amadeus-election/`
- 修正: 移動後CLIの同層import、migration/leader-sync/formal-verif等の消費側path、claude manifest、codex emitter、選挙/U1/package関連テスト
- 再生成: 全6 `dist/` とproject-local self-install管理面
- 必要時のみ: coverage registry/ratchetおよびmechanism honesty list
- 非対象: 選挙機能・型・store schema、registry resolver/migrationアルゴリズム、U3/U4/U5、docs、IaC、release資産

## 完了条件

- FR-1a〜1e、FR-2a〜2d、BR-1〜6、performance/security/reliability/scalabilityの各契約がStep 1〜14へ全数トレースされる。
- 選挙5ファイルはcore/toolsの単一正本、skillはcore skillsの単一正本となり、CLIは全6面、skillはclaude/codexの2面だけへ投影される。
- registry-backed path resolverとmigration fidelityを含む最新mainの機能が重複実装されず、全回帰がgreenである。
- U1 boundary guardがfixtureの検出力を保ったままlive finding 0・重複0となる。
- U4 clean-env E2E、U5 docs、他Unit・他エージェントの変更を混入・巻き戻ししていない。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T10:35:31Z
- **Iteration:** 1
- **Scope decision:** none

FR-1/FR-2、BR-1〜6、NFR、最新main機能保護、C2/C3のunit・integration・E2E、U1 guard閉包、claude/codex配布と非対象4面不在の証拠が整合している。

### Findings

- None
