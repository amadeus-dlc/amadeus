# #1336 Code Generation計画

## 対象と追跡

- 対象Issue: [#1336](https://github.com/amadeus-dlc/amadeus/issues/1336)
- 入力fallback: `unit-of-work.md`とuser storiesは`amadeus-bugfix`スコープでexpected absentのため補完せず、`requirements.md`とbrownfieldの既存Bolt証跡からスコープした。
- Captured intent（以下`CI-1336`）: `inception/requirements-analysis/requirements.md`のIntent分析に記録された「open bugを依存関係・共有ファイル競合を管理しながら修正し、各Issueを独立した価値・回帰テスト・変更境界を持つ1 Boltとして1変更提案へ配送する」という目的のうち、[#1336](https://github.com/amadeus-dlc/amadeus/issues/1336)の「safety-wait早期失敗を起動成功と誤認するTOCTOU」を解消すること。
- 対応要件: FR-1336-1〜3、NFR-1〜2、NFR-4〜6
- 配送単位: 1 Issue = 1 Bolt = 1 [GitHub Pull Request](https://github.com/amadeus-dlc/amadeus/pulls)
- 先行・後続関係: Batch 1で本Boltを独立実行し、同じ`team-up.sh`を変更する[#1663](https://github.com/amadeus-dlc/amadeus/issues/1663)は本Boltの変更提案を取り込んだ後に開始する。
- 変更方針: 固定`sleep 0.05`の延長やPID生存だけを成功証拠にせず、run・role・起動PIDに結び付いた決定的なready証拠と、ready前exit／bounded timeoutの早期失敗観測を最小追加する。

## 現行baselineと欠陥境界

- 2026-07-29、Bun 1.3.13で`bun test --timeout 120000 tests/unit/t-team-up-codex-safety-wait.test.ts tests/integration/t-team-up-codex-resume.serial.test.ts`を実行し、71 tests / 620 expects / 0 failだった。既存ケースが今回Greenでも、単独反復30回中1回・高負荷16/16というIssue実測と、50ms後の一回限りの生存確認によるTOCTOUを否定しない。
- `packages/framework/core/tools/team-up.sh`の`start_safety_wait_supervisors()`は、supervisorを起動してPID／lock ownerを保存し、`sleep 0.05`後の`kill -0`と`ps` command一致だけでroleを成功扱いする。過去roleを再確認せず、ready通知・ready前exit・timeoutの区別もない。
- `packages/framework/core/tools/team-up-codex-safety-wait.ts`の`supervise()`は、引数・production activation・run identityを検証してadapterを生成するが、初回adapter準備完了をlauncherへ通知する契約がない。
- 既存の`a safety-wait launch failure cleans every started supervisor`はfake helperが直ちに`exit 9`するため、50ms観測より先に終了できた場合だけRedとなる。wall-clockの偶然に依存しない制御fixtureへ置き換える。

## Blast Radius

| 区分 | 対象 | 計画する影響 |
|---|---|---|
| launcher正本 | `packages/framework/core/tools/team-up.sh` | ready証拠の初期化・検証、ready／early exit／timeoutのbounded wait、全role最終確認、rollback cleanupを追加する |
| supervisor正本 | `packages/framework/core/tools/team-up-codex-safety-wait.ts` | 引数、activation、exact run identity、初回adapter role解決を通過した後だけready証拠を原子的に発行する |
| integration | `tests/integration/t-team-up-codex-resume.serial.test.ts` | ready前`exit 9`の決定的Red、timeout診断、全role ready成功、全role rollbackと資産除去を検証する |
| unit | `tests/unit/t-team-up-codex-safety-wait.test.ts` | ready payload／発行条件をpure seamへ切り出す場合に、別run・別role・別PID・stale証拠の拒否を検証する |
| 配布面 | `dist` 7面、self-install 5面 | 正本2ファイルから生成する。生成面を手編集せず、package／promote drift guardで一致を証明する |
| 後続Bolt | [#1663](https://github.com/amadeus-dlc/amadeus/issues/1663) | readiness契約を前提にworker結果集約を実装し、本Boltのwaitを複製しない |

## 実装手順

1. [x] **現行baselineを保存する**: 上記2ファイルの71 tests / 0 failを記録し、`bun run typecheck`、`bun run lint`、`bun scripts/package.ts --check`、`bun run promote:self:check`の修正前結果も保存する。既存flaky caseの反復Greenを「欠陥なし」の証拠にしない。
2. [x] **ready契約を先にテストで固定する**: FR-1336-1へ追跡し、member record配下のready証拠がrun ID・role・起動PIDを完全一致で表すこと、launcherが起動前に同じpathのstale証拠を除去すること、別run／別role／別PID／不完全payloadを受理しないことを追加する。
3. [x] **修正前Redを決定的に作る**: `tests/integration/t-team-up-codex-resume.serial.test.ts`のfake helperへ制御された初期化barrierを設け、対象roleを「processは生存しているがready未通知」にする。fixtureのliveness probeが旧launcherへ生存を返したことを証拠ファイルで記録してからbarrierを解放し、helperを`exit 9`させる。これにより旧実装は一回限りのprobeを通過して誤って成功し、修正後実装はready未通知の子終了を観測して失敗するため、CPU負荷、50msの競争、反復回数に依存しない同一fixtureのRed→Greenを得る。
4. [x] **supervisorのready発行を最小実装する**: `team-up-codex-safety-wait.ts`で、command／role引数検証、production activation、exact run identity確認、adapter生成と初回の一意なrole解決がすべて成功した後だけready証拠を発行する。ready pathは`run-record`と正規化済みroleからmember record配下へ決定し、任意pathを受け取らず、一時ファイルからrenameして原子的に確定する。検証失敗・adapter失敗・inactive runではreadyを発行せず非0終了する。
5. [x] **launcherのbounded waitを最小実装する**: `team-up.sh`で各新規supervisorについて、(a) exact ready証拠、(b) ready前の子process終了、(c)期限到達のいずれかまで待つ。PID生存確認はearly-exit観測の補助に限定し、readyの代替にしない。固定`sleep 0.05`による一回判定と待機時間の単純延長は削除し、timeoutは有限かつtest seamから短縮可能にする。
6. [x] **全roleの成功境界を閉じる**: launcherが成功を返す直前に、対象runの全roleについてexact ready証拠と所有processの対応を最終確認する。1 roleでもready前exitまたはtimeoutなら、失敗role、`early-exit`または`timeout`、ready待機中だった事実をstderrへ出し、機密値や環境変数内容は出さない。
7. [x] **rollbackを完全化する**: FR-1336-3へ追跡し、失敗role自身を含む当該runで今回起動した全supervisorを停止・reapし、各memberの`safety-wait.pid`、`safety-wait.lock`、ready証拠、一時readyファイルを除去する。既存owner不一致時のfail-closedと、別runのprocessをsignalしない契約は維持する。
8. [x] **RedをGreenへする**: 決定的な初期化barrier後`exit 9`ケースがlauncher非0、failure role診断、全7 roleのPID／lock／ready資産なしでGreenになることを確認する。併せて全roleがreadyを通知したfresh／resume経路は成功し、resumeが既存のowned-live supervisorを重複起動しないことを確認する。
9. [x] **timeoutと隣接回帰をGreenにする**: readyを通知せず生存し続けるfake roleでbounded timeoutとrole診断を検証し、`kill does not signal a safety-wait process owned by another run`、`resume refuses mismatched pid and owner metadata`、`a dead owner is not reacquired when the role pane cannot be revalidated`を再実行する。既存timeout値、serial／parallel分類、無関係な固定waitは変更しない。
10. [x] **対象suiteと品質gateを通す**: `bun test --timeout 120000 tests/unit/t-team-up-codex-safety-wait.test.ts tests/integration/t-team-up-codex-resume.serial.test.ts`、`bun run typecheck`、`bun run lint`を実行する。重いintegrationがcold-compile timeoutになった場合だけ、同じtest fileを上記120秒指定で単独再実行し、製品失敗と区別する。
11. [x] **生成面を正規経路で同期する**: 正本変更後に`bun scripts/package.ts`と`bun run promote:self`で7 dist面・5 self-install面を生成し、`bun scripts/package.ts --check`と`bun run promote:self:check`を通す。`dist/`、`.codex/tools/`などの生成先は直接修正せず、意図しないorphan／byte driftがないことを確認する。
12. [x] **統合検証と変更提案証拠をまとめる**: Bolt単独Green後に`bun run test:ci`を実行し、修正前Red、修正後Green、early-exit、timeout、全role ready、rollback、typecheck、lint、package／promote driftの結果をcode-summaryと[#1336](https://github.com/amadeus-dlc/amadeus/issues/1336)専用変更提案へ記録する。他Issueを同じBolt／変更提案へ混ぜず、[#1663](https://github.com/amadeus-dlc/amadeus/issues/1663)へreadiness契約と取り込み順を引き継ぐ。

13. [x] **テスト構成を確認する**: 既存のBun test runnerと`package.json`の設定を再利用し、新しいtest configが不要であることを確認する。
14. [x] **実Herdr／実CodexのIssue固有E2Eを追加する**: opt-in E2Eで実Herdr sessionと実Codex paneを起動し、production supervisorがexact run／role／PIDに束縛したready証拠を発行すること、inactive runへ遷移した後にsupervisorが停止すること、sessionを必ず後始末することを検証する。

## Stepから上流入力への追跡

user storiesと`unit-of-work.md`がexpected absentであるため、全Stepを`CI-1336`と承認済み`inception/requirements-analysis/requirements.md`へ直接対応付ける。

| Step | Captured intentへの対応 | Requirementsへの対応 |
|---|---|---|
| 1 | `CI-1336`の欠陥を修正前実測から開始する | FR-CROSS-2（Evidence-first）、NFR-6（修正前Red／対象テスト） |
| 2 | `CI-1336`の誤成功を置換するready契約を固定する | FR-1336-1、FR-CROSS-4（受け入れ条件とテストの双方向対応）、NFR-6 |
| 3 | `CI-1336`のTOCTOUを同一fixtureで再現する | FR-1336-3（制御した`exit 9`）、FR-CROSS-2、NFR-1、NFR-6 |
| 4 | `CI-1336`の成功条件を明示的handshakeへ変更する | FR-1336-1、NFR-4（rename／PID／pathの移植境界）、NFR-5 |
| 5 | `CI-1336`の一回限りの生存判定をbounded startup判定へ置換する | FR-1336-2、NFR-1、NFR-2、NFR-4 |
| 6 | `CI-1336`の「一部roleだけ確認済み」を成功扱いしない | FR-1336-2、NFR-1、NFR-5 |
| 7 | `CI-1336`の部分起動失敗を原子的に巻き戻す | FR-1336-3、NFR-1、NFR-5 |
| 8 | `CI-1336`の誤成功を同一fixtureのRed→Greenで閉じる | FR-1336-1〜3、FR-CROSS-2、FR-CROSS-4、NFR-1、NFR-6 |
| 9 | `CI-1336`のtimeoutとownership隣接境界を回帰させない | FR-1336-2〜3、NFR-1、NFR-2、NFR-6 |
| 10 | `CI-1336`の対象変更をrepository標準gateで検証する | FR-CROSS-4、NFR-6 |
| 11 | `CI-1336`を全配布面へ同一内容で届ける | FR-CROSS-3、NFR-5、NFR-6 |
| 12 | `CI-1336`を1 Issue = 1 Bolt = 1変更提案で監査可能に配送する | FR-CROSS-1、FR-CROSS-4、NFR-4、NFR-6 |
| 13 | `CI-1336`に不要なtest基盤変更を持ち込まない | Constraints（Bun-only／不要な基盤を新設しない）、NFR-5 |
| 14 | `CI-1336`のhandshakeを実外部process substrateで確認する | FR-1336-1〜3、NFR-1、NFR-4、NFR-6 |

## 完了条件

- supervisorは引数、activation、exact run identity、初回adapter準備の完了後だけ、run・role・PIDに結び付いたready証拠を発行する。
- launcherはready、ready前exit、timeoutを決定的に区別し、全role ready前にexit 0を返さない。
- 初期化barrier後の`exit 9`が負荷や固定sleepの偶然に依存せず修正前Red・修正後Greenとなる。
- 任意のroleの早期失敗またはtimeout後に、当該起動で開始した全supervisorとPID／lock／ready資産が残らない。
- 対象unit／integration／Issue固有E2E、typecheck、lint、package drift、promote drift、統合`test:ci`がGreenである。
- 変更は[#1336](https://github.com/amadeus-dlc/amadeus/issues/1336)の1 Bolt・1変更提案に閉じ、後続[#1663](https://github.com/amadeus-dlc/amadeus/issues/1663)より先に着地する。

## 完了条件の実測判定

- `bun run test:ci`は実装時のローカル全体実行ではplugin conformanceの2 assertionsが失敗し、単独再実行でも再現した。この非0結果をGreenまたは既存baselineとみなさない。修正前baseで同一ローカル環境のbaselineを取得していないため、「変更前から同一」とする証拠もない。
- その後、[PR #1685](https://github.com/amadeus-dlc/amadeus/pull/1685)の同一head SHA `1870846c9cf16fcca87d31c9ef7f74aedfe6d1ca`をクリーンcheckoutした[GitHub Actions run](https://github.com/amadeus-dlc/amadeus/actions/runs/30448969756)で、Ubuntu 24.04の`Tests` jobが`bun run test:ci -- -P 4`を成功し、独立した`Plugin conformance E2E` jobも3 pass / 0 failで成功した。したがって統合`test:ci`の完了条件は、例外承認ではなく同一SHAのクリーン環境再実行Greenで満たした。
- NFR-4は、同一SHAのmacOSローカル対象suiteとLinux CIに加え、Request Changes是正でmacOS上の実Herdr／実Codex live E2Eまで検証済みである。一方、macOS CIとWindowsは未実行である。NFR-4を「macOSとLinuxの双方をCI runnerで実行する」と読む場合、macOS CIが未実施のため完全達成ではなく逸脱として残る。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T23:57:01Z
- **Iteration:** 1
- **Scope decision:** none

必須検証の未達と証拠・追跡情報の不足により、要件充足を独立検証できない。

### Findings

- 計画の完了条件は`bun run test:ci`のGreenを必須とする一方、code-summaryは全体suiteにplugin conformance失敗が残ったと記載しており、例外承認、修正前baselineとの同一性、またはGreen再実行結果がなく完了条件と矛盾する。
- stage定義は変更・作成ファイル、テスト範囲、計画逸脱の記録を要求するが、code-summaryは生成された全配布面の具体的パスと、early-exit、timeout、全role readiness、rollback各分岐の個別結果を示しておらず、FR-1336-1〜3への双方向トレーサビリティを検証できない。
- user stories不在時は各計画Stepをcaptured intentへ対応付ける必要があるが、計画はrequirementsからスコープした旨だけを記し、13個の各Stepに対する追跡先を明示していない。
- NFR-4はmacOSとLinux CIでの検証を要求するが、code-summaryは実Herdr／Linux実機E2Eを未実行とし、PRのCI成功がどのOSと経路を検証したかも示していないため、移植性目標の達成証拠が不足する。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-30T00:05:54Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の指摘は是正されたが、Comprehensiveテスト戦略に対するIssue固有E2Eの欠落が残り、stage契約への適合を確認できない。

### Findings

- 要件はテスト戦略をComprehensiveとし、stage定義はunit・integration・E2E test filesを要求するが、計画と双方向トレーサビリティはunit／integrationまでしか示さず、code-summaryも実Herdr／実Codexのlive E2Eを未実施と明記している。既存integration fixtureを本UnitのE2E境界として扱うならその適用判断と計画逸脱を明記し、そうでなければFR-1336-1〜3へ追跡したE2Eを追加して結果を記録する必要がある。

## Request Changes是正（2026-07-30）

- `tests/e2e/t-team-up-codex-safety-wait-live.serial.test.ts`を追加した。`AMADEUS_TEAM_UP_LIVE_E2E=1`のときだけ実行し、外部依存がない通常CIではskipする。
- Herdr 0.7.1とCodex CLI 0.145.0を実際に起動し、実Herdr session上の`leader` Codex paneをproduction adapterが一意に解決した後にだけ、`{"schemaVersion":1,"run":"<run>","role":"leader","pid":<pid>}`のexact ready証拠を発行することを確認した。
- runをinactiveへ遷移するとproduction supervisorがexit 3で停止することを確認し、成功・失敗を問わずHerdr sessionを削除するcleanupを実行した。
- live E2E単独は1 pass / 0 fail / 7 expects、Issue #1336のunit／integration／E2E統合は78 pass / 0 fail / 716 expectsだった。

## Revision 2 follow-up配送

- commit: `a4c7a2a7176ad666e3543264585448957bc98027`
- draft PR: [PR #1712](https://github.com/amadeus-dlc/amadeus/pull/1712)
- 最新`main`起点の1 commitとして、live E2E 1ファイルだけを配送した。Intent runtimeのstate／audit／`members/`は含めていない。
- push前検証: 通常実行は想定どおり1 skip、`bun run typecheck`成功、`bun run lint`成功（既知warningのみ）。実Herdr／Codexのlive実行証拠は1 pass／7 expects。
