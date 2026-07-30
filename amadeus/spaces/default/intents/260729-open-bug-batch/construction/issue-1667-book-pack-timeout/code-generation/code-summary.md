# Issue #1667 Code Generationサマリー

## 結論

[PR #1684](https://github.com/amadeus-dlc/amadeus/pull/1684)で外側120秒が子process 180秒より先に切れるtimeout先後矛盾を解消し、2026-07-30 revisionで残っていた並列負荷／cleanup競合／Comprehensive不足を閉じた。merge SHA `47fe37ab059a131cfe80fb6971293a6e8fb0017c`を土台に、`verify-dummy.sh`のcleanupを冪等化し、unit 6件、integration 6件、E2E 2件を追加・拡張した。

同一PATH-shim fixtureではraw cleanupが`fts_read failed`／status 1となり、修正後の実verifierはstatus 0／stderr空／workspace不存在となる。3 worker barrier fixtureも全workerを同じ`cp`境界へ到達させたうえで相異なるworkspaceを所有し、全件Greenとなった。

## 入力と変更面

`unit-of-work.md`とuser storiesは`amadeus-bugfix`スコープでexpected absentのため補完せず、`requirements.md`のFR-1667-1〜3、FR-CROSS-1〜4、NFR-1〜2、NFR-6と既存brownfield証拠からスコープした。今回のrevisionは`book-pack/scripts/verify-dummy.sh`、test helper、unit／integration／E2Eだけを変更し、framework coreとgenerated distributionは変更していない。

## 実装済みの証拠

- 旧budget `180000 + 30000 <= 120000`をfalse、新budget `180000 + 30000 <= 210000`をtrueとする判定を固定した。
- 10msの制御child timeoutで`status=null`、`signal=SIGTERM`、`error.code=ETIMEDOUT`を固定した。
- 制御lifecycleで`child-start → child-complete → cleanup-start → cleanup-complete`を同一clockで観測した。
- 実verifierの成功、失敗時だけのstatus／signal／duration／stdout／stderr診断、process終了後のworkspace不存在を検証した。
- `.serial.` filename契約により、runnerの`-P 4`でも対象fileをserial帯で実行した。

## Comprehensive戦略

Active Test StrategyはComprehensiveであり、stage契約はcomponentごと10〜15件を目安にunit・integration・E2E fileを求める。初回実装の4件縮小は不足だったため、revisionで要件駆動の計14件へ拡張した。

| test種別 | 実績 | 判定 |
|---|---|---|
| unit | `tests/unit/book-pack-verify-fixture.test.ts`のbudget境界4件、lifecycle parse、workspace parse | 6件Green |
| integration | `book-pack-verify.serial.test.ts`のbudget、lifecycle、child timeout、3 worker parallel、同一cleanup race、real verifier | 6件Green |
| E2E | `tests/e2e/book-pack-verify.test.ts`のshipped verifier成功journeyと実pack失敗journey | 2件Green |
| performance | 3 workerがfake `cp` barrierへ揃うまで待機し、同時負荷を制御 | 全worker status 0、workspace identity 3件が相異なる |
| security | 認証・認可・入力境界・依存の変更なし | NFR非該当 |

合計14件を3層へ分離した。securityは認証・認可・入力境界・依存を変更しないためN/Aである。

## 並列負荷とcleanup競合

- 並列負荷fixtureは3 workerの最初の`.claude` copyをbarrierで同期し、偶然のwall-clock重複ではなく同時実行を保証する。各workerの`book-pack-dummy.*`は相異なり、別worker資産を所有しない。
- cleanup競合fixtureはfake `rm`が対象workspaceを実際に削除した後、元症状と同じ`fts_read failed`／exit 1を返す。raw cleanupはstatus 1となり、修正後の実scriptはpath消失を冪等成功としてstatus 0／stderr空へ収束する。
- owned pathが残る場合はcleanup errorをstderrへ戻し非0を維持するため、実pack／cleanup失敗を隠さない。E2Eのmissing framework caseでも実pack失敗は非0のまま、workspaceだけが除去される。

## timeout budgetのclock境界

outer Bun testの210秒はtest callback開始からsetup、同期child待機、失敗診断、assertionまでを測る。`spawnSync`の180秒はbash childの全lifecycleを測り、`verify-dummy.sh`の`EXIT` trapはchild終了前、すなわち`spawnSync`復帰前にcleanupする。

このため実際の関係は「child本体180秒 + child外cleanup 30秒 = outer 210秒」ではない。cleanupは180秒のchild clock内で、outerとの差30秒がprocess終了伝播と親側処理のmarginである。制御lifecycleでもcleanup完了をchild deadline内で確認している。

後続push CIではreal verifierがTests job 457ms／Coverage job 472.01ms、file全体が各539ms／553msだった。Issue観測の127.55秒でもouter 210秒まで82.45秒ある。これらの実値とclock境界は旧「outerがchildより先に切れる」問題の解消を支えるが、並列負荷・cleanup競合の決定的証拠には流用しない。

## 後続CIの再現可能なGreen証拠

後続push CI [run 30455247375](https://github.com/amadeus-dlc/amadeus/actions/runs/30455247375)は、merge SHA `47fe37ab059a131cfe80fb6971293a6e8fb0017c`をcheckoutして全体`SUCCESS`となった。

| 必須command／証拠 | job | 結果 |
|---|---|---|
| `bun run typecheck` | [Typecheck 90587098720](https://github.com/amadeus-dlc/amadeus/actions/runs/30455247375/job/90587098720) | Green |
| `bun run lint` | [Lint and complexity 90587098678](https://github.com/amadeus-dlc/amadeus/actions/runs/30455247375/job/90587098678) | Green |
| `bun run test:ci -- -P 4` | [Tests 90587098589](https://github.com/amadeus-dlc/amadeus/actions/runs/30455247375/job/90587098589) | 652 filesでGreen。対象は4 pass／0 fail／14 expects |
| `bun run coverage:ci -- -P 4` | [Coverage Report (head) 90587098684](https://github.com/amadeus-dlc/amadeus/actions/runs/30455247375/job/90587098684) | 652 filesでGreen。対象は4 pass／0 fail／14 expects |
| `bun run dist:check`、`bun run promote:self:check` | [Dist and self-install drift 90587098523](https://github.com/amadeus-dlc/amadeus/actions/runs/30455247375/job/90587098523) | Green |

対象test、typecheck、lint、統合後`test:ci`というNFR-6の必須commandは同一SHA／同一runでGreenである。dist/self-install driftは本Boltがcore／harnessを変更しないためNFR-6上の条件付き必須ではないが、Comprehensiveなframework parity証拠として同一runでGreenを確認した。

## 配送状態

- close対象: [#1667](https://github.com/amadeus-dlc/amadeus/issues/1667)
- [PR #1684](https://github.com/amadeus-dlc/amadeus/pull/1684)は2026-07-29T13:16:19Zにmerge済み。
- 今回のrevisionはcommit `1a560764ddf5779da5ae31e1457d623f2ccfb3ef`としてpushし、[PR #1715](https://github.com/amadeus-dlc/amadeus/pull/1715)をdraftで作成した。既存merge済みPRの状態は変更していない。

## Revision 3 検証

- `bun test --timeout 240000 tests/unit/book-pack-verify-fixture.test.ts tests/integration/book-pack-verify.serial.test.ts tests/e2e/book-pack-verify.test.ts` → 14 pass／0 fail／42 expects
- `bun run typecheck` → exit 0
- `bun run lint` → exit 0。既存cognitive-complexity warningのみ。
- residual risk: Linux CIでrevision後のparallel fixtureは未実行。fixtureはPOSIX `bash`／`mktemp`／PATH shimを使用し、macOSでは決定的Greenを確認した。

## Revision 2 follow-up配送

- 最新`main`上で14 pass／42 expects、`bash -n book-pack/scripts/verify-dummy.sh`、`bun run typecheck`、`bun run lint`が成功した。
- [PR #1715](https://github.com/amadeus-dlc/amadeus/pull/1715)は#1667だけを含む1 commitのdraftである。Linux CIはPR checkで確認する。
