# Issue #1336 Code Generationサマリー

## 入力と配送結果

- Captured intent: `inception/requirements-analysis/requirements.md`のIntent分析に記録されたopen bug一括修正目的のうち、[#1336](https://github.com/amadeus-dlc/amadeus/issues/1336)の「safety-wait早期失敗を起動成功と誤認するTOCTOU」を、独立した価値・回帰テスト・変更境界を持つ1 Boltとして修正する。
- 上流要件: FR-1336-1〜3、FR-CROSS-1〜4、NFR-1〜2、NFR-4〜6。
- `unit-of-work.md`とuser storiesは`amadeus-bugfix`スコープでexpected absentのため補完せず、captured intentと承認済みrequirementsへ直接追跡した。
- 配送: [PR #1685](https://github.com/amadeus-dlc/amadeus/pull/1685)はhead SHA `1870846c9cf16fcca87d31c9ef7f74aedfe6d1ca`、merge commit `bb3885b5c850b7b0283406460e512ef5338da0ea`として2026-07-29T13:16:55Zにmerge済み。

## 実装結果

- 一回限りのPID生存確認を、run・role・起動PIDに束縛した原子的ready証拠へ置き換えた。
- supervisorは引数、production activation、exact active run、初回adapterの一意なrole解決を通過した後だけready証拠を発行する。
- launcherはexact ready、ready前exit、有限timeoutを区別し、全roleのprocess ownershipとready証拠を成功直前に再確認する。
- early exitまたはtimeout時は今回起動した全supervisorを停止・reapし、PID、lock、ready、一時readyファイルをrollbackする。他runのprocessをsignalしない既存のfail-closed境界は維持した。
- 固定`sleep 0.05`は成功条件として使わず、50ms間隔は有限期限内の状態ポーリングにだけ残した。既存テストtimeout、serial／parallel分類、無関係な固定waitは変更していない。

## FR-1336-1〜3 双方向トレーサビリティ

| 要件／分岐 | 実装 | 回帰テスト | 実測結果 |
|---|---|---|---|
| FR-1336-1: exact readiness | `team-up-codex-safety-wait.ts`の`createSafetyWaitReadyEvidence`、`parseSafetyWaitReadyEvidence`、`safetyWaitReadyEvidenceMatches`、`writeSafetyWaitReadyEvidence`、`role-ready`／`ready-valid`境界。`team-up.sh`はstale markerを起動前に除去する | unitの`ready evidence is bound to the exact run, role, and supervisor pid`、`rejects incomplete payloads and unsafe identities`、`path stays inside the exact member record`。専用integrationの`publishes exact JSON atomically and removes its temporary file` | exact run／role／PIDだけを受理し、一時ファイルからrename後に一時ファイルが消えることをGreenで確認 |
| FR-1336-2: 全role readiness成功 | `start_safety_wait_supervisors`と成功直前の`process_matches`＋`ready_matches`再確認 | `Codex fresh, resume, and kill own one safety-wait supervisor per role`、`a stale safety-wait ready marker is removed before supervisor startup` | freshで全7 roleのexact ready、resumeで同一PID再利用、kill後のPID／lock／ready除去をGreenで確認 |
| FR-1336-2: ready前early exit | `wait_for_safety_wait_ready`がprocess ownership消失を`early-exit while waiting for ready`として非0にする | `a safety-wait exit after the liveness probe fails launch and cleans every started supervisor` | 制御barrier後の`exit 9`で非0、`early-exit`と`waiting for ready`診断をGreenで確認 |
| FR-1336-2: bounded timeout | `wait_for_safety_wait_ready`が`SAFETY_WAIT_READY_TIMEOUT_SECONDS`の有限期限で`timeout while waiting for ready for <role>`を返す | `a safety-wait readiness timeout identifies the role and cleans every startup asset` | ready未通知で生存するe3を1秒のtest seamで期限到達させ、role付きtimeout診断をGreenで確認 |
| FR-1336-3: rollback | `rollback_safety_wait_starts`と`safety_wait_cleanup_files`が今回取得した全roleを停止・reapし、PID／lock／ready／一時readyを除去する | 上記early-exit／timeoutの両test、および`kill does not signal a safety-wait process owned by another run`、`resume refuses mismatched pid and owner metadata without replacing either process` | early-exit／timeoutとも全7 roleの起動途中資産なし。他run所有processとowner不一致資産を置換・signalしないことをGreenで確認 |
| FR-1336-1〜3: 実外部process substrate | productionの`role-ready`／`ready-valid`とsupervisor lifecycleを変更せず使用 | `tests/e2e/t-team-up-codex-safety-wait-live.serial.test.ts` | Herdr 0.7.1とCodex CLI 0.145.0を実起動し、実pane解決後のexact JSON、inactive遷移後のexit 3、session cleanupを1 pass / 0 fail / 7 expectsで確認 |

逆方向には、正本TypeScriptのready evidence APIと専用unit／integrationがFR-1336-1、shellのwait／最終再確認とlifecycle integrationがFR-1336-2、shellのrollback／cleanupと失敗分岐integrationがFR-1336-3へ対応する。生成面は正本と同じ要件を各harnessへ投影し、記録2ファイルはFR-CROSS-4の監査可能性へ対応する。

## 全変更パス

[PR #1685](https://github.com/amadeus-dlc/amadeus/pull/1685)のfiles APIとmerge差分、およびRequest Changes是正のローカル差分で確認した変更パスは次のとおりである。

| 区分 | 変更パス | 対応 |
|---|---|---|
| 正本（modified） | `packages/framework/core/tools/team-up-codex-safety-wait.ts` | FR-1336-1 |
| 正本（modified） | `packages/framework/core/tools/team-up.sh` | FR-1336-1〜3 |
| unit（modified） | `tests/unit/t-team-up-codex-safety-wait.test.ts` | FR-1336-1 |
| integration（added） | `tests/integration/t-team-up-codex-safety-wait-ready-evidence.test.ts` | FR-1336-1 |
| integration（modified） | `tests/integration/t-team-up-codex-resume.serial.test.ts` | FR-1336-1〜3 |
| E2E（added） | `tests/e2e/t-team-up-codex-safety-wait-live.serial.test.ts` | FR-1336-1〜3、NFR-4、NFR-6 |
| dist/claude（modified） | `dist/claude/.claude/tools/team-up-codex-safety-wait.ts`、`dist/claude/.claude/tools/team-up.sh` | FR-1336-1〜3、FR-CROSS-3 |
| dist/codex（modified） | `dist/codex/.codex/tools/team-up-codex-safety-wait.ts`、`dist/codex/.codex/tools/team-up.sh` | FR-1336-1〜3、FR-CROSS-3 |
| dist/cursor（modified） | `dist/cursor/.cursor/tools/team-up-codex-safety-wait.ts`、`dist/cursor/.cursor/tools/team-up.sh` | FR-1336-1〜3、FR-CROSS-3 |
| dist/kimi（modified） | `dist/kimi/.kimi-code/tools/team-up-codex-safety-wait.ts`、`dist/kimi/.kimi-code/tools/team-up.sh` | FR-1336-1〜3、FR-CROSS-3 |
| dist/kiro-ide（modified） | `dist/kiro-ide/.kiro/tools/team-up-codex-safety-wait.ts`、`dist/kiro-ide/.kiro/tools/team-up.sh` | FR-1336-1〜3、FR-CROSS-3 |
| dist/kiro（modified） | `dist/kiro/.kiro/tools/team-up-codex-safety-wait.ts`、`dist/kiro/.kiro/tools/team-up.sh` | FR-1336-1〜3、FR-CROSS-3 |
| dist/opencode（modified） | `dist/opencode/.opencode/tools/team-up-codex-safety-wait.ts`、`dist/opencode/.opencode/tools/team-up.sh` | FR-1336-1〜3、FR-CROSS-3 |
| self-install/Claude（modified） | `.claude/tools/team-up-codex-safety-wait.ts`、`.claude/tools/team-up.sh` | FR-1336-1〜3、FR-CROSS-3 |
| self-install/Codex（modified） | `.codex/tools/team-up-codex-safety-wait.ts`、`.codex/tools/team-up.sh` | FR-1336-1〜3、FR-CROSS-3 |
| self-install/Cursor（modified） | `.cursor/tools/team-up-codex-safety-wait.ts`、`.cursor/tools/team-up.sh` | FR-1336-1〜3、FR-CROSS-3 |
| self-install/Kimi（modified） | `.kimi-code/tools/team-up-codex-safety-wait.ts`、`.kimi-code/tools/team-up.sh` | FR-1336-1〜3、FR-CROSS-3 |
| self-install/OpenCode（modified） | `.opencode/tools/team-up-codex-safety-wait.ts`、`.opencode/tools/team-up.sh` | FR-1336-1〜3、FR-CROSS-3 |
| Construction記録（added） | `amadeus/spaces/default/intents/260729-open-bug-batch/construction/issue-1336-safety-wait-readiness/code-generation/code-generation-plan.md`、`amadeus/spaces/default/intents/260729-open-bug-batch/construction/issue-1336-safety-wait-readiness/code-generation/code-summary.md` | FR-CROSS-4 |

## Red→Green証拠

- 修正前Red: `a safety-wait exit after the liveness probe`ではfake `ps`がe3の最初のliveness probeを記録するまでfake supervisorを生存させ、その後barrierを解放して`exit 9`させた。旧launcherは一回目のprobe後にe3を再確認せずexit 0を返し、非0期待に対して1 failとなった。`e3.probed`の存在でprobe後の失敗であることを確認した。
- 修正前Red: unitの`ready evidence` patternはnamed export不足で失敗し、ready evidence APIが未実装であることを示した。
- 修正後Green: 同一barrier fixtureでearly-exitを検出し、全7 roleのPID／lock／ready資産が残らないことを確認した。
- 修正後Green: ready未通知で生存するe3をbounded timeoutへ到達させ、role付き診断と全7 roleのrollbackを確認した。
- 修正後Green: fresh／resume／kill、stale marker、別run ownership、owner metadata不一致、dead ownerの隣接分岐を確認した。

## `test:ci`とplugin conformanceの判定

実装時のローカル全体実行と、同一head SHAのクリーンCI再実行を区別する。

| 実行 | 環境／SHA | 結果 | 判定 |
|---|---|---|---|
| `bun run test:ci` | 実装時ローカル | 652 files中1 file、8997 assertions中1 assertion失敗、非0 | Greenではない。失敗対象ログが保存されず、この実行だけでは原因特定不能 |
| `bun tests/run-tests.ts --all --verbose` | 実装時ローカル | `tests/e2e/t341-plugin-conformance-journey.serial.test.ts`のstage graph hash復元不一致と後続計測値0の2 assertionsが失敗、非0 | 単独120秒再実行でも再現。修正前baseの同一環境baselineは未取得のため「既存失敗」とは断定しない |
| `bun run test:ci -- -P 4` | [PR #1685 Actions `Tests`](https://github.com/amadeus-dlc/amadeus/actions/runs/30448969756/job/90568702194)、Ubuntu 24.04、head `1870846c…`のクリーンcheckout | job success | 同一SHAのクリーン環境再実行Greenとして統合完了条件を満たす |
| `bun test tests/e2e/t341-plugin-conformance-journey.serial.test.ts` | [PR #1685 Actions `Plugin conformance E2E`](https://github.com/amadeus-dlc/amadeus/actions/runs/30448969756/job/90568721465)、Ubuntu 24.04、同一head | 3 pass / 0 fail、job success | ローカルで失敗したplugin分岐もクリーンCIでGreen |

したがって`test:ci`完了条件は例外承認や「変更範囲外だから許容」という扱いではなく、同一SHAのクリーンcheckout再実行Greenで充足した。例外承認は申請も使用もしていない。

## その他の検証結果

- 実装時の対象2ファイルsuite: 76 tests / 707 expects / 0 fail。
- 対象unitとready evidence専用integration: 21 tests / 90 expects / 0 fail。
- 既存team-up lifecycle integration: 56 tests / 619 expects / 0 fail。
- 2026-07-30、PR head `1870846c…`をarchiveしたmacOS Darwin 25.5.0 arm64、Bun 1.3.13環境で対象3ファイルを再実行: 77 tests / 709 expects / 0 fail。
- 2026-07-30、Herdr 0.7.1・Codex CLI 0.145.0を用いたopt-in live E2E単独: 1 pass / 0 fail / 7 expects。
- 同じ環境でIssue #1336のunit／integration／live E2Eを統合実行: 78 pass / 0 fail / 716 expects。
- `bun run typecheck`: 成功。
- `bun run lint`: 成功。既存baselineと同じ293 warnings / 21 infosで、新規errorなし。
- `bash -n packages/framework/core/tools/team-up.sh`: 成功。
- 対象TypeScript 3ファイルのBiome check、`git diff --check`: 成功。
- `bun scripts/package.ts --check`: dist 7 harness面で成功。
- `bun run promote:self:check`: self-install 5面で成功。
- [PR #1685 Actions run](https://github.com/amadeus-dlc/amadeus/actions/runs/30448969756): `Typecheck`、`Lint and complexity`、`Tests`、`Plugin conformance E2E`、`Dist and self-install drift`、coverage、最終`CI Success`が成功。

## NFR判定と未実施範囲

| NFR | 証拠 | 判定 |
|---|---|---|
| NFR-1 Reliability | 制御barrierによるearly-exit、短縮可能なbounded timeout、全role readiness、両失敗分岐のrollback | 充足 |
| NFR-2 Performance | 固定sleep延長なし。既存テストtimeout／serial・parallel分類／無関係なwait変更なし | 充足 |
| NFR-4 Portability | macOS Darwin 25.5.0 arm64・Bun 1.3.13で対象suiteがGreen。さらに同macOS上でHerdr 0.7.1・Codex CLI 0.145.0のlive E2EがGreen。GitHub Actions Ubuntu 24.04で同一SHAの`test:ci`とplugin conformanceがGreen | macOSローカル（実外部processを含む）＋Linux CIの範囲で充足。macOS CIまで必須と読む場合は部分達成 |
| NFR-5 Maintainability | 正本2ファイルへの最小変更、既存Bash/Bun境界と生成経路を再利用、新規framework／test configなし | 充足 |
| NFR-6 Testability | 同一制御fixtureのRed→Green、unit／integration、typecheck、lint、package／promote drift、クリーンCI `test:ci` | 充足 |

未実施範囲は次のとおりであり、成功へ丸めない。

- macOS CI runnerは実行していない。NFR-4の「macOSとLinux CI」を両OSのCI実行と解釈する場合、この範囲は未達であり、macOS CI job追加または既存macOS CIで同一3ファイルを実行した証拠が必要である。
- 実Herdr・実Codexを用いたlive E2EはローカルmacOSで実行済みである。ただし外部ツールを必要とするため通常CIではopt-in skipとし、恒常的なCI実行は追加していない。
- Windowsはrequirementsで対象外であり、実行していない。
- ローカルplugin conformance失敗について、修正前baseを同一ローカル状態で実行したbaselineはない。したがって「変更前から存在した失敗」とは主張しない。

## 計画逸脱

- 計画時はready evidenceのfilesystem検証をunitへ置く可能性を記載したが、実ファイルI/Oを行うため`tests/integration/t-team-up-codex-safety-wait-ready-evidence.test.ts`へ配置した。unit allowlistを増やさずtest-size purityを維持するための分類修正であり、FR-1336-1の検証内容は変更していない。
- 実装時ローカルの全体`test:ci`はGreenにならなかった。例外扱いせず、同一head SHAのクリーンLinux CI再実行Greenを完了証拠とした。
- macOS CIは未実施である。live E2EはRequest Changes是正で追加・実行し、通常CIでは外部ツール依存のためopt-inとした。

## Revision 2 follow-up配送

- [PR #1712](https://github.com/amadeus-dlc/amadeus/pull/1712)をdraftで作成した。commitは`a4c7a2a7176ad666e3543264585448957bc98027`。
- 最新`main`から1 commitで、#1336のlive E2Eだけを含む。通常CIはopt-in条件により1 skip、実Herdr 0.7.1／Codex CLI 0.145.0では1 pass／7 expects。
- `bun run typecheck`と`bun run lint`は成功した。Linux CIはdraft PRのcheckで確認する。
