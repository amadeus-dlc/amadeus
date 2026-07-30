# #1667 Code Generation計画

## 対象と追跡

- 対象Issue: [#1667](https://github.com/amadeus-dlc/amadeus/issues/1667)
- 入力fallback: `unit-of-work.md`とuser storiesは`amadeus-bugfix`スコープでexpected absentのため補完せず、`requirements.md`とbrownfieldの既存Bolt証跡からスコープした。
- 対応要件: FR-1667-1〜3、FR-CROSS-1〜4、NFR-1〜2、NFR-6
- 配送単位: 1 Issue = 1 Bolt = 1 [GitHub Pull Request](https://github.com/amadeus-dlc/amadeus/pulls)
- 変更方針: 120秒の外側test timeoutと180秒のchild timeoutの矛盾、並列resource contention、cleanup競合をEvidence-firstで区別する。timeout延長やserial化だけでは完了としない。
- Test Strategy: Comprehensive。2026-07-30 revisionでunit 6件、integration 6件、E2E 2件の計14件へ拡張し、timeout budget、同一clock lifecycle、3 workerの制御parallel load、同一fixtureのcleanup競合Red／Green、実verifier成功／失敗journeyを層別に固定した。

## Blast Radiusとbaseline

| 区分 | 対象 | 影響 |
|---|---|---|
| test driver | `tests/integration/book-pack-verify.serial.test.ts` | 外側／内側budgetと失敗診断。Issueの直接症状 |
| verifier | `book-pack/scripts/verify-dummy.sh` | 根因がcleanup所有権または共有temp資産の場合だけ最小変更 |
| runner | `tests/run-tests.ts`とtest size registry | 並列分類を変える場合の根拠確認。先に変更しない |
| integration | 新規または既存book-pack fixture | 遅延・cleanup競合を制御注入するRed／Green |

実装前baselineはIssue本文の同一commit観測で、coverage `-P 4`が127.55秒でtimeoutし、単独再実行は65.14秒で成功した。この差は並列負荷との相関を示すが、制御された再現でも因果の決定証拠でもない。`rm: fts_read failed`の元ログは当該worktreeに残っておらず、cleanup競合も再現していない。

## 実装手順

- [x] **Step 1 — timeout budgetを計測可能にする**: FR-1667-1へ追跡し、外側test上限、`spawnSync`上限、cleanup開始／完了を同じ測定単位で記録できるtest-side seamを用意する。成功時ログは増やさない。
- [x] **Step 2 — 修正前Redを確立する**: 旧値`180000 + 30000 <= 120000`の不整合と10msの制御child timeoutに加え、PATH shimがowned workspaceを削除後に`fts_read failed`／exit 1を返す同一fixtureでraw cleanupのRedを固定した。3 worker barrier fixtureは全workerが同時に`cp`境界へ到達してから進めるため、wall-clock偶然に依存しない。
- [x] **Step 3 — temp資産の所有権を照合する**: verifierが作る一時directory名、trap、削除順序を棚卸しし、worker間共有または親子の二重cleanupが`rm: fts_read failed`を起こす場合だけ、worker固有資産と冪等cleanupへ最小修正する。
- [x] **Step 4 — budget契約を最小修正する**: `spawnSync`の180秒は、`verify-dummy.sh`の`EXIT` trapによるcleanupを含む子shell process全体を拘束する。trapは子process終了前、すなわち`spawnSync`復帰前に走るため、外側210秒との差30秒はcleanupを180秒へ加算した結果ではなく、test setup、process終了伝播、失敗診断、assertionを含む親側clockの余裕である。制御lifecycleもcleanup完了を子deadline内で観測する。
- [x] **Step 5 — 失敗診断を保つ**: child非0、signal／timeout、stdout、stderrを失敗時だけ提示し、実際のpack検証失敗とcleanup noiseを区別する。
- [x] **Step 6 — Greenを検証する**: 3 workerの制御parallel loadは3つの相異なる`book-pack-dummy.*`を所有して全件status 0、stderr空、終了後不存在となった。同一cleanup競合fixtureでは修正後の実`verify-dummy.sh`がstatus 0、stderr空、workspace不存在となった。
- [x] **Step 7 — 横断品質を確認する**: merge SHA `47fe37ab059a131cfe80fb6971293a6e8fb0017c`の後続push CI [run 30455247375](https://github.com/amadeus-dlc/amadeus/actions/runs/30455247375)でtypecheck、lint、`test:ci -P 4`、`coverage:ci -P 4`、dist/self-install driftがGreen。対象fileもTests/Coverageの両jobで4件Green。ただしこれは対象をserial帯で実行した証拠であり、並列stress証拠ではない。
- [x] **Step 8 — 変更提案証拠をまとめる**: 直接原因、測定値、内外budget、Red／Green、関連suiteをcode-summaryへ記録し、[#1667](https://github.com/amadeus-dlc/amadeus/issues/1667)だけをclose対象とする。

- [x] **Step 9 — テスト構成を確認する**: 既存のBun test runnerと`package.json`の設定を再利用し、新しいtest configが不要であることを確認する。

## Comprehensive戦略の適用状況

| 種別 | 本Boltへの適用 | 実装・証拠 | 判定 |
|---|---|---|---|
| unit | budget判定、lifecycle parse、workspace ownership parse | `tests/unit/book-pack-verify-fixture.test.ts`の6件 | 実施 |
| integration | real `verify-dummy.sh`、timeout signal、budget境界、3 worker制御parallel load、同一cleanup競合fixture | `tests/integration/book-pack-verify.serial.test.ts`の6件 | 実施 |
| E2E | 利用者が実行するshipped verifierの成功／実pack失敗journey | `tests/e2e/book-pack-verify.test.ts`の2件 | 実施 |
| performance | NFR-2の並列coverage負荷を制御barrierで再現 | 3 workerが同一`cp`境界へ到達してから並行継続し、workspace identity 3件が相異なり全件Green | 実施 |
| security | 認証・認可・入力境界・依存を変更しない | 新規security検査なし | NFR非該当 |

合計14件をunit・integration・E2Eへ分離した。securityは認証・認可・入力境界・依存を変更しないためN/Aのままとし、reliability／performance／cleanup ownershipを要件駆動で検証する。

## 並列負荷・cleanup証拠

- 並列負荷: fake `cp` barrierへ3 worker全てが到達するまで進行を止め、同時負荷を決定的に作った。各workerは相異なる`mktemp` workspaceを所有し、全件Greenかつcleanup後不存在だった。
- cleanup: fake `rm`がowned workspaceを先に削除してから`fts_read failed`／exit 1を返す。raw cleanupは同じfixtureでstatus 1、修正後はpath消失を冪等成功としてstatus 0／stderr空となる。pathが残る実cleanup失敗はエラー出力と非0を維持する。
- 結論: 制御child timeout、制御parallel load、制御cleanup raceを独立fixtureで区別し、FR-1667-1とFR-1667-3を固定した。

## timeout clock境界

- outer Bun test clock: test callback開始からsetup、同期child待機、失敗診断、assertion完了まで。
- child `spawnSync` clock: bash起動から`EXIT` trap完了とprocess終了まで最大180秒。cleanupはこのclockの内側。
- outer 210秒との差30秒: child終了後を含む親側処理の余裕。`180 + cleanup 30 + overhead = 210`という三項加算ではない。
- 後続push CIの実値は通常Tests jobでreal verifier 457ms／file 539ms、Coverage jobで472.01ms／file 553ms。Issue観測の並列127.55秒でもouter 210秒まで82.45秒ある。ただし、この単発値は決定的な並列stressの代替にはしない。

このclock境界により「outerがchildより先にtimeoutする」旧矛盾には30秒の親側marginがある。cleanup競合の安全性は別fixtureで検証し、path消失済みの競合だけを冪等成功、pathが残る失敗を非0とする契約へ分離した。

## 完了条件と現在地

| 完了条件 | 状態 |
|---|---|
| timeout、resource contention、cleanup競合を制御証拠で区別 | 完了 |
| child timeoutと外側test timeoutの先後矛盾を解消 | 完了 |
| 並列coverage相当で安定しcleanup noiseが偽赤を作らない | 3 worker barrierと同一cleanup競合fixtureでGreen |
| timeout延長、serial化、診断追加だけで完了扱いにしない | cleanup実装修正と決定的fixtureで閉包 |

## Revision 3 実行結果

- focused tests: `bun test --timeout 240000 tests/unit/book-pack-verify-fixture.test.ts tests/integration/book-pack-verify.serial.test.ts tests/e2e/book-pack-verify.test.ts` → 14 pass／0 fail／42 expects
- typecheck: `bun run typecheck` → exit 0
- lint: `bun run lint` → exit 0。既存cognitive-complexity warningのみで、本変更のerrorはない。
- 配布: `packages/framework/core/`／`packages/framework/harness/`を変更していないため、dist／self-install再生成はN/A。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-30T00:07:14Z
- **Iteration:** 1
- **Scope decision:** none

timeout矛盾の特定と診断改善は確認できるが、Comprehensive戦略、並列・cleanup競合の決定的証拠、実行時間budgetの安全余裕が不足している。

### Findings

- Major: 要件はComprehensiveテスト戦略を指定し、stage契約はcomponentごとのunit・integration・E2E各10〜15件を求めるが、計画と要約は単一integration testの4件だけで、縮小理由もない。
- Major: FR-1667-1・3および完了条件が求める並列負荷とcleanup競合の制御証拠を、要約は示していない。serial帯での成功は並列coverage Greenではなく、planで完了扱いのcleanup競合fixtureとも対応しない。
- Major: child timeout 180秒とcleanup reserve 30秒の合計に対して外側timeoutも210秒であり、test setup、process終了伝播、assertionの時間余裕がゼロである。同一clockで全lifecycleを測る契約では再timeoutを防ぐ安全marginがない。
- Major: 必須の全体test／coverageは実装時点で非0のままで、後続Bolt解消後の「CI成功」がどの必須commandを満たしたか特定されていないため、FR-CROSS-4とNFR-6の完了証拠として再現可能ではない。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-30T00:13:54Z
- **Iteration:** 2
- **Scope decision:** none

timeout clock境界とCI証拠の指摘は解消されたが、FR-1667-1・FR-1667-3、Comprehensiveテスト戦略、実装手順Step 2・Step 6が未完了であり、stage契約上READYではない。

### Findings

- Major: 並列負荷とcleanup競合を区別する制御fixtureおよび同一fixtureによる修正前Red・修正後Greenがなく、serial化後のCI GreenではFR-CROSS-2、FR-1667-1、FR-1667-3、NFR-1、NFR-6を満たさない。
- Major: Active Test StrategyはComprehensiveだが単一integration fileの4件のみで、独立unit・E2E test file、十分な要件駆動ケース、または正式なN/A裁定がなく、必須テスト契約が未完了である。

## Revision 2 follow-up配送

- commit: `1a560764ddf5779da5ae31e1457d623f2ccfb3ef`
- draft PR: [PR #1715](https://github.com/amadeus-dlc/amadeus/pull/1715)
- 最新`main`起点の1 commitとして、cleanup実装、三worker競合fixture、専用unit／integration／E2Eを配送した。
- push前検証: 14 pass／42 expects、`bash -n`、typecheck／lint成功。Intent runtimeのstate／auditは含めていない。
