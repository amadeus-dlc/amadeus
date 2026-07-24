# Code Summary — U5 completeness-sensor

## 実装結果

U5 の model completeness sensor、明示更新経路、全 harness 配布、Comprehensive test を実装した。checker は read-only で、framework core に同梱した U1/U5 共通の canonical `ModelMap` parser / identity 計算を静的importして同じ契約を消費する。同期状態は `SENSOR_PASSED`、実装・model・cfg drift、map 不在・破損、読取境界違反、内部 timeout は有効な fail verdictを返して `SENSOR_FAILED` へ到達する。map 書換えは明示的な `updateModelMap` subcommand に限定した。

Architecture Review Iteration 1の全5 findingを修正した。production updateは固定map pathだけを扱い、map read前にlockを取得する。map/model/cfg/実装entryは共通SafeFileReaderを通り、update失敗はrepository相対pathと固定reason codeだけを返す。canonical実装globはDomain EntitiesからPostToolUse fixtureまで一貫させた。

## 変更ファイル

- `packages/framework/core/tools/amadeus-sensor-model-completeness.ts` — read-only checker、全入力共通SafeFileReader、決定的 evaluator、9秒内部deadline、固定map pathの明示更新、read前lock、atomic publish、redacted error、内部test seamを追加した。
- `packages/framework/core/tools/amadeus-formal-verif-model-map.ts` — canonical identity、ModelMap型、parser、diffをframework配布物として自己完結させた。hostの `scripts/formal-verif/canonical.ts` / `tla-model-map.ts` はこの定義を再exportする。
- `packages/framework/core/sensors/amadeus-model-completeness.md` — deterministic/advisory manifest、実在するspec・canonical実装glob、10秒dispatcher上限、入出力契約を追加した。
- `tests/unit/t-formal-verif-model-completeness-sensor.test.ts` — error写像、identity変化、root包含、map fail verdictのpure unitを5ケース追加した。
- `tests/integration/t-formal-verif-model-completeness-sensor-components.integration.test.ts` — fake portと一時filesystemで正常、drift、malformed、deadline、size/path/read error、map/model/cfg TOCTOU、redaction、lock前read、root外拒否、`--map`拒否、更新拒否・失敗、canonical parser共有を20ケース追加した。
- `tests/integration/t-formal-verif-model-completeness-sensor.integration.test.ts` — 実filesystemでatomic update、自己認証拒否、read前lock、2 updater、map/model/cfg symlink・16MiB上限、1000 entry、100 entry・10MiB性能を10ケース追加した。
- `tests/e2e/t-formal-verif-model-completeness-sensor.test.ts` — 全6 mirror、canonical境界一貫性、実dispatcher、実drift、map不在、matches拒否、PostToolUse hookを7ケース追加した。
- `tests/integration/t93.test.ts` — framework sensorの閉集合契約を5件から6件へ更新し、`model-completeness` を追加した。
- `tests/unit/gen-coverage-registry.test.ts` / `tests/.coverage-registry.json` / `tests/.coverage-ratchet.json` — 新E2EのCLI機構を閉集合へ追加し、coverage registryを正規再生成した。
- `dist/{claude,codex,cursor,kiro,kiro-ide,opencode}` — tool / manifestをcanonical coreから生成した。
- `.claude` / `.codex` / `.cursor` / `.opencode` — project-local self installへtool / manifestを生成した。
- `code-generation-plan.md` — Step 1〜10 の完了を記録した。

## 主要な決定

- U5独自のmap schemaを作らず、framework coreの `amadeus-formal-verif-model-map.ts` をcanonical定義とする。source coreと生成mirrorはhost projectの `scripts/` に依存せず自己完結し、host側U1 adapterも同じ定義を再exportする。
- Functional Designの旧 `scripts/amadeus-election*.ts` globは、U1 mapの実境界である `packages/framework/core/tools/amadeus-election*.ts` へ申告どおり整合した。互換用の二重globは追加していない。
- sensor所有のdeadlineは9秒、既存dispatcherの停止用hard capは10秒とした。前者は有効な `{ pass: false, reason: "timeout" }`、後者は既存の `SENSOR_BUDGET_OVERRIDE` として区別する。
- checkerはcanonical entry順に全findingを収集し、出力を相対path・固定reason code・件数へ限定する。absolute path、hash、入力内容は出力しない。
- `updateModelMap` のproduction pathは `specs/tla/model-map.json` に固定し、任意pathを受け取らない。map read前に排他lockを取得し、read→parse→identity gate→hash→publishを同じcritical sectionで実行する。model/cfg identityが不変で実装hashだけが変わる自己認証は `MODEL_UNCHANGED` で拒否する。受理時は0644の同一directory temp、file fsync、rename、親directory fsyncでpublishする。
- map/model/cfg/実装entryは共通SafeFileReaderを通す。全対象でroot realpath包含、祖先・末端symlink、regular file、同一fd、open前後dev/inode、1ファイル16MiB・総量64MiBを検査する。
- update error detailはrepository相対pathと固定reason codeだけを返し、`Error.message`、absolute path、hash、file内容を外部へ出さない。
- DB、API、UI、network、daemon、新規runtime dependency、cache、独立schemaは追加していない。

## テスト・品質結果

- U5関連3層
  - pure unit 5、component integration 20、acceptance integration 10、E2E 7、合計42 pass、0 fail、150 assertions。
- focused local LCOV
  - 新規本体 `amadeus-sensor-model-completeness.ts` の `DA:...,0` は0件。
  - U5追加本体行の未カバー0、coverage allowlist追加0。
  - artifact: `/tmp/amadeus-u5-review-cov.ShcKju/lcov.info`。
- `bun run typecheck`
  - exit 0。
- `bun run lint`
  - exit 0。repository既存のcomplexity warning 255件・info 19件は残るが、U5対象ファイルのwarning/errorは0。
- `bun scripts/package.ts --check` / `bun run promote:self:check`
  - 全6 harness treeと4 project-local self installが同期済み、exit 0。
- `bash tests/run-tests.sh --ci --parallel 1`
  - U1/U3/U5配布境界修正後のtreeで503 test files、7,149 assertions、失敗0、`RESULT: PASS`。
  - AWS credentials不在によるlive substrate testのskipあり。wall-clock drift 1件はadvisoryで、失敗判定には影響しない。

## 性能・容量結果

- 環境: Darwin arm64、Bun 1.3.13。
- 100 entry・合計10MiB、同一process、warm-up 2回後10回:
  - raw samples ms: `[8.446, 8.83, 7.941, 8.382, 8.518, 8.427, 8.078, 8.511, 7.688, 8.034]`
  - max: `8.83ms`。全回10秒未満。
- 1000 entryは入力順を維持して全件処理し、同じ最終coverage runで実測 `145.96ms` でpassした。
- 1ファイル16MiB、総量64MiBの上限を実装し、上限超過をhash前にfail closedとする。

## Falling proof・監査結果

- 同期fixtureは実dispatcherで同一Fire idの `SENSOR_FIRED` → `SENSOR_PASSED` に到達した。
- 実装bytes drift注入は `SENSOR_FIRED` → `SENSOR_FAILED` に到達し、detailは相対pathとreason codeだけを含む。
- map不在はscript-error advisory passへ落ちず、`SENSOR_FAILED` に到達した。
- 無関係pathはmanifest matchesでaudit前に拒否した。
- PostToolUse hookはcanonical実装pathの変更から実dispatcherを起動した。
- checker自身はauditをappendせず、audit所有権をdispatcherに維持した。

## 逸脱・残課題

- manifest `matches` は承認済み計画の申告どおり、旧Functional Design表記ではなくU1の実在境界へ整合した。
- 内部9秒deadlineと外側10秒hard capを分離した。これは既存dispatcher契約を保ったまま、内部timeoutをfail verdictへ閉じるための承認済み整合化である。
- 新規component testはfilesystem APIを使うため、unitのmedium allowlistへ追加せずintegrationへ配置した。pure unitはSmallを維持し、test-size purityを正規に満たす。
- SafeFileReaderはcomplexity baselineへ例外追加せず、`safeReadFile` CCN 11、`checkModelCompletenessInternal` CCN 12、`performModelMapUpdate` CCN 11に収めた。
- 親タスクからcommit禁止を明示されたため、commitは作成していない。
