# Code Generation Plan — U5 completeness-sensor

対象は Unit U5（C-6）、体験ステップ1「spec 変更時にモデル未更新の警告を受ける」、FR-4.1〜FR-4.4、FR-6.1〜FR-6.4、NFR-3、BR-U5-1〜BR-U5-7、および U5 の Performance / Reliability / Scalability / Security 要件・設計である。Test Strategy は Comprehensive とし、unit・integration・E2E の3層で検証する。

## 実装前提と境界

- U1 の `scripts/formal-verif/tla-model-map.ts` が `ModelMap` / `ModelMapEntry` / `ModelMapDrift`、parse、diff の canonical 1定義である。U5 は project root から同moduleを解決して importし、同型・同parseを再定義しない。core toolを全harnessへ投影した後もhost projectの同じcanonical moduleを読むことを配布テストで固定する。
- 現行 `specs/tla/model-map.json` と U1 parser は実装境界を `packages/framework/core/tools/amadeus-election*.ts` としている。一方、U5 Functional Design の manifest `matches` には旧表記 `scripts/amadeus-election*.ts` が残る。FR-4.2 の自動発火を実在する変更面へ接続するため、実装では `specs/tla/**` と `packages/framework/core/tools/amadeus-election*.ts` を採用する。この申告済み整合化を承認条件とし、旧表記との二重対応や互換 glob は追加しない。
- 既存 dispatcher は manifest の10秒上限超過を `SENSOR_BUDGET_OVERRIDE` とする。sensor が所有する deadline は外側上限より短い9秒とし、期限切れを有効な `{ pass: false, reason: "timeout" }` JSON として返して `SENSOR_FAILED` へ到達させる。10秒は停止不能時の既存 hard cap として維持し、両経路を区別して検証する。
- 本 Unit は DB、API、UI、IaC、常駐サービス、network、新規 runtime dependencyを追加しない。checker は read-only、更新は明示的な `updateModelMap` subcommand のみとする。
- テスト設定は既存の `bun:test`、`tests/run-tests.ts`、`tests/run-tests.sh`、`tsconfig.tests.json` が `tests/unit`・`tests/integration`・`tests/e2e` の TypeScript を収集するため追加・変更しない。新規テストの実在を実行前に確認し、runner の実行ファイル数と照合する。

## 実装手順

1. [x] **Step 1: 既存契約を固定する** — U1 canonical API、現行 `model-map.json`、sensor manifest schema、`amadeus-sensor.ts fire` の JSON・audit 契約、PostToolUse hook の matches 経路、core→全 harness dist→self-install の生成経路をテストで参照可能な baseline として固定する。上記2件の申告済み整合化以外に設計差が見つかった場合は実装せず差し戻す。対応: U5依存条件、FR-4.1〜4.4、FR-6.1、BR-U5-3/6/7、NFR-3。
2. [x] **Step 2: read-only checker の境界を実装する** — `packages/framework/core/tools/amadeus-sensor-model-completeness.ts` に薄い CLI adapter と in-process test seam を設け、project root・map path・clock・filesystem/hash port を注入可能にする。checker はproject root基準の単一resolverから U1 の canonical moduleを importし、source core・生成済みharnessの双方で同じ定義を消費する。module/mapの不在、mapの空・UTF-8/JSON/schema不正をすべて exit非0ではなく有効な fail verdict JSONへ写像する。戻り値は `CompletenessVerdict` の判別unionとし、成功値だけを evaluator へ渡す。対応: FR-4.1/4.2/4.4、BR-U5-2/3/4/6、Reliability Design、NFR-3。
3. [x] **Step 3: SafeFileReader と決定的評価を実装する** — canonical entry順の単一走査で、repo-root realpath包含、祖先・末端symlink拒否、regular-file確認、open前後の dev/inode・fd `fstat` 一致、1ファイル16MiB・総量64MiB、9秒deadlineを検査し、各fileを1回だけ同一fdから読みSHA-256を計算する。対象不在・読取不能・境界違反もfindingとして全件列挙し、first failureで打ち切らない。外部出力は相対path・固定reason code・findings countだけに限定し、absolute path、expected/actual hash、file内容を漏らさない。checker前後でmap/model/cfg/実装を一切書かない。対応: FR-4.2、BR-U5-1/2/4、Security / Performance / Scalability / Reliability 要件・設計、NFR-3。
4. [x] **Step 4: 明示更新 subcommand を実装する** — 同じ tool の `updateModelMap` subcommand で、workspace lock下に model/cfg の現identityとcanonical実装entryのhashを再計算する。直前世代からmodel/cfg identityがともに不変で実装hashだけが変わる要求は `MODEL_UNCHANGED` で拒否する。受理時はpath昇順の単一canonical recordを同一directoryの排他的tempへmode 0644で書き、file fsync→同一filesystem rename→親directory fsyncでpublishする。rename前失敗はtempを除去して旧mapを保持し、自動更新・checkerからの呼出し・部分更新を禁止する。対応: FR-4.2、BR-U5-4、Reliability / Security Design、write⇔check対称性。
5. [x] **Step 5: core sensor manifest と配線を追加する** — `packages/framework/core/sensors/amadeus-model-completeness.md` に id `model-completeness`、kind `deterministic`、core tool command、申告済み実在globの複合 `matches`、`default_severity: advisory`、`timeout_seconds: 10`、input/output schema、fail-closed理由を定義する。`loadSensors` / graph compile でid・filename・schema・未知id拒否が成立し、U2 の `sensors: [model-completeness]` をcompile可能にする。sensor本体は常に機械判定由来のJSONをstdoutへ1件だけ出し、例外・読取失敗・内部timeoutをcatchしてfail verdictへ変換し、dispatcherの「script-errorをadvisory pass」分岐へ落とさない。対応: FR-4.1/4.4、BR-U5-2/5/6/7、NFR-3。
6. [x] **Step 6: unit test を追加する** — `tests/unit/t-formal-verif-model-completeness-sensor.test.ts` に、同期0件、1件/複数drift、entry対象不在、stable順序、canonical U1 parse/diff共有、map不在/不正、path traversal・絶対path・backslash・重複/非昇順・不正hash、symlink/非regular file、open-read間dev/inode変化、単体/総量上限、deadline、redaction、read-only、`MODEL_UNCHANGED`、更新成功・各atomic publish失敗を含むcomponent別の正常・境界・異常ケースを置く。fake portで分岐をin-process実行し、spawn-only coverage blind spotを作らない。対応: Comprehensive、FR-4.2/4.3、FR-6.3/6.4、BR-U5-2〜5、全U5 NFR。
7. [x] **Step 7: integration test を追加する** — `tests/integration/t-formal-verif-model-completeness-sensor.test.ts` に一時repoと実filesystem fixtureを作り、正当mapのPASSED JSON、実装bytes変更・削除・map不在/破損のFAILED JSON、checker実行前後のtracked入力byte一致、実symlink/FIFO拒否、`updateModelMap` のidentity gate・lock競合・atomic publish・失敗時旧map保持・再parse可能性を検証する。1000 entryを全件・入力順でO(n)+O(bytes)処理する容量ケースも固定する。対応: FR-4.2/4.3、BR-U5-2/4/5、Security / Reliability / Scalability要件。
8. [x] **Step 8: dispatcher・hook・audit の E2E と落ちる実証を追加する** — `tests/e2e/t-formal-verif-model-completeness-sensor.test.ts` で隔離project/record/graphを用い、manifest `matches` がspec変更とcanonical実装変更の双方でPostToolUse fire対象になり、無関係pathでは発火しないことを確認する。実 `amadeus-sensor.ts fire model-completeness` を通し、同期状態は同一Fire idの `SENSOR_FIRED`→`SENSOR_PASSED`、drift注入・map不在/不正・内部deadlineは `SENSOR_FIRED`→`SENSOR_FAILED`、findings count・detail path・redacted detailが実在することを検証する。外側10秒hard capの `SENSOR_BUDGET_OVERRIDE` も別ケースで固定し、auditはdispatcher所有、checkerから直接appendしない。対応: 体験ステップ1、U5完了条件、FR-4.1〜4.4、BR-U5-5〜7、NFR-3。
9. [x] **Step 9: 性能・安全性の受入試験を行う** — 100 entry・合計10MiBの固定fixtureを同一processでwarm-up 2回後に10回連続測定し、OS、CPU、Bun版、entry数、総bytes、各raw sampleと最大値を記録して全回10秒未満を要求する。さらに16MiB/64MiB境界、1000 entry、秘密文字列を含む入力、checker前後のfilesystem snapshotを検証し、無制限読込、二次走査、情報漏えい、暗黙書込がないことを確認する。対応: Performance / Security / Scalability Requirements、FR-6.2、NFR-3。
10. [x] **Step 10: mirror同期と品質ゲートを完走する** — canonical coreのtool/manifestを `bun scripts/package.ts` と `bun run promote:self` で全harness dist・self-installへ生成し、各mirrorに同一sensor id・harness置換済みcommand・toolが存在すること、`dist:check` と `promote:self:check` がgreenであることを確認する。新規テスト3pathの実在とrunnerの実行ファイル数を照合したうえで関連unit/integration/E2E、`bun run typecheck`、`bun run lint`、`bash tests/run-tests.sh --ci` を実行し、local LCOVでU5のdiff追加行未カバー0を実測する。落ちる実証用fixtureを戻した同期状態で最終 `SENSOR_PASSED` を再確認する。対応: FR-4.3、FR-6.1〜6.4、BR-U5-5/7、project/team品質契約。

## テスト受入マトリクス

| 層 | 主対象 | 必須受入 |
|---|---|---|
| Unit | ModelMapReader、SafeFileReader、CompletenessEvaluator、ModelMapUpdater、CLI adapter | 各componentの正常・境界・異常、canonical型共有、fail-closed JSON、決定順、redaction、read-only、atomicity、deadline |
| Integration | 実filesystem、lock、fsync/rename、実hash | map不在/破損、同期、drift、dangling、symlink/FIFO、size上限、1000 entry、更新拒否/成功/回復 |
| E2E | manifest→graph/hook→dispatcher→tool→audit/detail | matches正負、SENSOR_PASSED/FAILED両側、Fire id pair、detail実在、外側budget override、全harness配布 |

## 非対象

- TLC完全探索の実行完全性、run-model-check CLI、plugin stage discovery、CI workflow、plugin bundle本体は他Unitの責務である。
- semantic AST差分、hash cache、bounded concurrency、DB、daemon、network service、後方互換glob、独立したModelMap schemaは追加しない。
- 本計画の承認前は実装、テスト追加、dist/self-install生成、`code-summary.md`生成、checkbox完了、workflow状態更新を行わない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T01:27:12Z
- **Iteration:** 1
- **Scope decision:** approved — BR-U5-7 — packages/framework/core/tools/amadeus-sensor-model-completeness.ts — reason: BR-U5-7 のコア供給実装が checker・SafeFileReader・atomic updater・CLI seam を単一 file に集約するため、責務混在と分岐複雑性を確認する — owner: amadeus/spaces/default/intents/260722-tla-plugin/construction/completeness-sensor/functional-design/business-rules.md#- BR-U5-7(コア供給): manifest は `.claude/sensors/amadeus-model-completeness.md`、実装は `packages/framework/core/tools/amadeus-sensor-model-completeness.ts` に配置する(通常3手順)。graph compile の sensor id 検証(unknown id loud reject)に登録される — U2 の compile 前提

品質ゲートは green だが、明示更新経路の repository 外上書きと stale-map overwrite、SafeFileReader適用漏れ、例外detail漏えいがあり、セキュリティ・原子性要件を満たさない。

### Findings

- Critical: production CLI の --map がroot外pathを許し、updateModelMapがrepository外ファイルをrename置換できる。
- Critical: updateModelMapがlock取得前にmapを読み、競合後にstale entry setを再公開できる。
- Major: map/model/cfgが共通SafeFileReaderを通らずsymlink・TOCTOU・容量契約を迂回する。
- Major: update failureのError.messageをdetailへ出しabsolute pathを漏えいし得る。
- Major: Domain Entitiesのmanifest matchがcanonical core pathと不一致（conductor側では既にcanonical pathへ更新済みのためiteration 2で再確認）。

### Iteration 1 対応結果

- [x] production CLI から任意map path指定を除去し、`specs/tla/model-map.json` を固定した。`--map` はoperation実行前に `INVALID_ARGUMENT` で拒否し、root外ファイルが不変である回帰テストを追加した。任意map path注入は内部test seamだけに限定した。
- [x] map readより前にlockを取得し、read→parse→identity gate→hash→atomic publishの全区間を直列化した。lock競合時のmap read回数0と、2 updaterがstale mapを再公開しないことを回帰テストで固定した。
- [x] map/model/cfg/実装entryを同じSafeFileReaderへ統合した。同一fd、open前後dev/inode、root包含、symlink、regular file、1ファイル16MiB・総量64MiBを全対象へ適用し、map/model/cfgそれぞれのTOCTOU・symlink・size拒否を検証した。
- [x] update失敗detailをrepository相対pathと固定reason codeだけへ限定した。例外message、absolute path、hash、入力内容が出力されない回帰テストを追加した。
- [x] Domain Entities、manifest、U1 map、code-generation plan/summary、PostToolUse fixture graphの境界を `packages/framework/core/tools/amadeus-election*.ts` に統一し、E2Eで同時検証した。
- [x] Iteration 1後の品質ゲートを完走した。U5三層42 tests / 150 assertions、対象LCOV未カバー行0、typecheck、lint、complexity、全6 harness package check、全4 self-install check、全CI 495 files / 7,112 assertions / failed 0がgreenである。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T01:48:14Z
- **Iteration:** 2
- **Scope decision:** approved — BR-U5-7 — packages/framework/core/tools/amadeus-sensor-model-completeness.ts — reason: Iteration 1 findingsのroot外--map拒否、map read前lock、全入力共通SafeFileReader、error redactionが同じcore実装で実際に閉包されたか確認するため — owner: amadeus/spaces/default/intents/260722-tla-plugin/construction/completeness-sensor/functional-design/business-rules.md#- BR-U5-7(コア供給): manifest は `.claude/sensors/amadeus-model-completeness.md`、実装は `packages/framework/core/tools/amadeus-sensor-model-completeness.ts` に配置する(通常3手順)。graph compile の sensor id 検証(unknown id loud reject)に登録される — U2 の compile 前提

Iteration 1 の5 findings はすべて閉包された。固定map境界、lock取得順序、全入力共通SafeFileReader、error redaction、canonical glob が設計・実装・テストで一致し、新たな blocking finding はない。

### Findings

- None
