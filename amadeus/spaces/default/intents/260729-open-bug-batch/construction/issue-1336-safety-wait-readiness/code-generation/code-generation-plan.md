# #1336 Code Generation計画

## 対象と追跡

- 対象Issue: [#1336](https://github.com/amadeus-dlc/amadeus/issues/1336)
- 対応要件: FR-1336-1〜3、NFR-1〜2、NFR-4〜6
- 配送単位: 1 Issue = 1 Bolt = 1 [GitHub Pull Request](https://github.com/amadeus-dlc/amadeus/pulls)
- 先行・後続関係: Batch 1で本Boltを独立実行し、同じ`team-up.sh`を変更する[#1663](https://github.com/amadeus-dlc/amadeus/issues/1663)は本BoltのPRを取り込んだ後に開始する。
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

1. [ ] **現行baselineを保存する**: 上記2ファイルの71 tests / 0 failを記録し、`bun run typecheck`、`bun run lint`、`bun scripts/package.ts --check`、`bun run promote:self:check`の修正前結果も保存する。既存flaky caseの反復Greenを「欠陥なし」の証拠にしない。
2. [ ] **ready契約を先にテストで固定する**: FR-1336-1へ追跡し、member record配下のready証拠がrun ID・role・起動PIDを完全一致で表すこと、launcherが起動前に同じpathのstale証拠を除去すること、別run／別role／別PID／不完全payloadを受理しないことを追加する。
3. [ ] **修正前Redを決定的に作る**: `tests/integration/t-team-up-codex-resume.serial.test.ts`のfake helperへ制御された初期化barrierを設け、対象roleを「processは生存しているがready未通知」にする。fixtureのliveness probeが旧launcherへ生存を返したことを証拠ファイルで記録してからbarrierを解放し、helperを`exit 9`させる。これにより旧実装は一回限りのprobeを通過して誤って成功し、修正後実装はready未通知の子終了を観測して失敗するため、CPU負荷、50msの競争、反復回数に依存しない同一fixtureのRed→Greenを得る。
4. [ ] **supervisorのready発行を最小実装する**: `team-up-codex-safety-wait.ts`で、command／role引数検証、production activation、exact run identity確認、adapter生成と初回の一意なrole解決がすべて成功した後だけready証拠を発行する。ready pathは`run-record`と正規化済みroleからmember record配下へ決定し、任意pathを受け取らず、一時ファイルからrenameして原子的に確定する。検証失敗・adapter失敗・inactive runではreadyを発行せず非0終了する。
5. [ ] **launcherのbounded waitを最小実装する**: `team-up.sh`で各新規supervisorについて、(a) exact ready証拠、(b) ready前の子process終了、(c)期限到達のいずれかまで待つ。PID生存確認はearly-exit観測の補助に限定し、readyの代替にしない。固定`sleep 0.05`による一回判定と待機時間の単純延長は削除し、timeoutは有限かつtest seamから短縮可能にする。
6. [ ] **全roleの成功境界を閉じる**: launcherが成功を返す直前に、対象runの全roleについてexact ready証拠と所有processの対応を最終確認する。1 roleでもready前exitまたはtimeoutなら、失敗role、`early-exit`または`timeout`、ready待機中だった事実をstderrへ出し、機密値や環境変数内容は出さない。
7. [ ] **rollbackを完全化する**: FR-1336-3へ追跡し、失敗role自身を含む当該runで今回起動した全supervisorを停止・reapし、各memberの`safety-wait.pid`、`safety-wait.lock`、ready証拠、一時readyファイルを除去する。既存owner不一致時のfail-closedと、別runのprocessをsignalしない契約は維持する。
8. [ ] **RedをGreenへする**: 決定的な初期化barrier後`exit 9`ケースがlauncher非0、failure role診断、全7 roleのPID／lock／ready資産なしでGreenになることを確認する。併せて全roleがreadyを通知したfresh／resume経路は成功し、resumeが既存のowned-live supervisorを重複起動しないことを確認する。
9. [ ] **timeoutと隣接回帰をGreenにする**: readyを通知せず生存し続けるfake roleでbounded timeoutとrole診断を検証し、`kill does not signal a safety-wait process owned by another run`、`resume refuses mismatched pid and owner metadata`、`a dead owner is not reacquired when the role pane cannot be revalidated`を再実行する。既存timeout値、serial／parallel分類、無関係な固定waitは変更しない。
10. [ ] **対象suiteと品質gateを通す**: `bun test --timeout 120000 tests/unit/t-team-up-codex-safety-wait.test.ts tests/integration/t-team-up-codex-resume.serial.test.ts`、`bun run typecheck`、`bun run lint`を実行する。重いintegrationがcold-compile timeoutになった場合だけ、同じtest fileを上記120秒指定で単独再実行し、製品失敗と区別する。
11. [ ] **生成面を正規経路で同期する**: 正本変更後に`bun scripts/package.ts`と`bun run promote:self`で7 dist面・5 self-install面を生成し、`bun scripts/package.ts --check`と`bun run promote:self:check`を通す。`dist/`、`.codex/tools/`などの生成先は直接修正せず、意図しないorphan／byte driftがないことを確認する。
12. [ ] **統合検証とPR証拠をまとめる**: Bolt単独Green後に`bun run test:ci`を実行し、修正前Red、修正後Green、early-exit、timeout、全role ready、rollback、typecheck、lint、package／promote driftの結果をcode-summaryと[#1336](https://github.com/amadeus-dlc/amadeus/issues/1336)専用PRへ記録する。他Issueを同じBolt／PRへ混ぜず、[#1663](https://github.com/amadeus-dlc/amadeus/issues/1663)へreadiness契約と取り込み順を引き継ぐ。

## 完了条件

- supervisorは引数、activation、exact run identity、初回adapter準備の完了後だけ、run・role・PIDに結び付いたready証拠を発行する。
- launcherはready、ready前exit、timeoutを決定的に区別し、全role ready前にexit 0を返さない。
- 初期化barrier後の`exit 9`が負荷や固定sleepの偶然に依存せず修正前Red・修正後Greenとなる。
- 任意のroleの早期失敗またはtimeout後に、当該起動で開始した全supervisorとPID／lock／ready資産が残らない。
- 対象unit／integration、typecheck、lint、package drift、promote drift、統合`test:ci`がGreenである。
- 変更は[#1336](https://github.com/amadeus-dlc/amadeus/issues/1336)の1 Bolt・1 PRに閉じ、後続[#1663](https://github.com/amadeus-dlc/amadeus/issues/1663)より先に着地する。
