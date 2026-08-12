# Code Summary — TEST_TIME_FACTOR

- Intent: `260810-test-time-factor`
- Scope: `self-fix`
- Depth: `Minimal`
- Test Strategy: `Comprehensive`
- Unit / User Story 成果物は scope 上存在しないため、承認済み `requirements.md` と Reverse Engineering CodeKB から実装範囲を直接導出した。

## 変更内容

- `tests/lib/test-time-factor.ts`
  - `TEST_TIME_FACTOR` の未指定時を `1` とし、有限かつ `1` 以上の数値だけを受理する共通 helper を追加した。
  - ミリ秒基準値を `Math.ceil(baseMs * factor)` で係数化し、非正値、非 safe integer、overflow を明示的に拒否する。
  - `AMADEUS_TEST_TIMEOUT` は最終 override として扱い、`TEST_TIME_FACTOR` を再適用しない契約を固定した。
- `tests/lib/run-tests-args.ts`
  - runner 既定値 `30_000ms` と `--test-timeout-ms` の明示値をともに基準値として解釈し、Bun child へ渡す直前に共通 helper で係数化する。
- `tests/test-timeout-ms.ts`
  - 共通 runner を経由しない `bun test` 呼び出し向けに、同じ helper から係数化済み CLI timeout を出力する seam を追加した。
- test timing consumers
  - `tests/{smoke,unit,integration,e2e,harness,lib}` の test timeout、process timeout、deadline、sleep、poll、settle を共通 helper 経由へ移行した。
  - `AMADEUS_TEST_TIMEOUT` 由来の最終値、性能閾値、意図的な slow / hang fixture、ISO 境界、本番 timeout は係数化対象外とした。
- `.github/workflows/{ci,pbt,release}.yml`
  - 通常 CI、coverage head / base、PBT、release のテスト経路へ `TEST_TIME_FACTOR: "2"` を設定した。
  - runner bypass の PBT と plugin conformance は `tests/test-timeout-ms.ts` から `--timeout` を受け取るようにした。
- `tests/lib/test-time-factor-guard.ts` と `tests/.test-time-factor-allowlist.json` (`FR-8`)
  - 固定 timing sink を走査し、未分類、理由なし、重複、存在しない path、exact-count drift、stale entry を fail-closed にする guard を追加した。
  - `AMADEUS_TEST_TIMEOUT` の派生値を `scaleTestTime` に再投入する経路を taint 追跡し、allowlist 不可の `final-timeout-rescale` として拒否する。
  - 環境変数を引数へ直接記述する経路も taint として検出し、`scaleTestTime` の入れ子は `test-time-rescale` として拒否する。両 rescale sink は allowlist へ登録しても検査失敗にする。
- tests / fixture
  - factor の既定値、`1` / `2` / `3`、不正値、切り上げ、overflow、runner 伝播、workflow 配線、final override、guard の falling fixture を追加した。
- `docs/reference/09-testing.md`
  - ローカル既定 `1`、CI 推奨 `2`、より遅い環境の `3`、runner bypass、final override の利用規約を追記した。

## 設計判断

- 係数は「テスト実行時間」ではなく、負荷で伸びる timeout / wait budget に適用する。
- runner option は最終値ではなく基準値とし、指定方法にかかわらず同じ係数を一度だけ適用する。
- `AMADEUS_TEST_TIMEOUT` は利用者が決めた最終予算なので再係数化しない。
- Bun 自体は `TEST_TIME_FACTOR` を解釈しないため、runner bypass は共通 CLI seam で明示的な `--timeout` に変換する。
- 性能測定、意図的な timeout / hang、ISO 境界、本番 timeout は意味を変えず、理由付き exact-count allowlist で監査可能にする。

## 検証

- helper / runner / consumer / guard / workflow focused tests: `55 pass / 2 live-skip / 0 fail`。
- final override / runner bypass 修正 focused tests: `31 pass / 0 fail`。
- timing guard: `105 classified fixed timing sink(s)`、未分類 `0`。
  - 再現コマンド: `bun tests/test-time-factor-guard.ts`。
- `bun run typecheck`: exit `0`。
- `bun run lint`: exit `0`。既存の complexity warning のみ。
- `bun run source-only:check`: clean。
- `git diff --check`: exit `0`。
- `AMADEUS_TEST_TIMEOUT` 派生値の `scaleTestTime(...)` 再適用監査: `0`。
- `TEST_TIME_FACTOR=2 bun run test:ci`: `972` files / `13061` assertions を実行し、初回は `6` files / `7` assertions の失敗を観測した。
- 初回失敗の変更由来 5 files / 6 assertions:
  - PBT workflow の旧固定 `--timeout=30000` 期待値を共通 CLI seam の期待値へ更新した。
  - runner 基準値テストへ factor `1` を明示し、外側の CI factor を継承しないようにした。
  - filesystem / subprocess を使う timing guard / CLI seam テストを integration 層へ移した。
  - 116 test files で `scaleTestTime` import を `// covers:` / mechanism / size header の後ろへ移し、coverage / mechanism discovery を復元した。
- 初回失敗の環境由来 1 file / 1 assertion:
  - `t07-hook-audit-logger.serial.test.ts` の意図的な `300ms` 性能境界が並列負荷下で `333ms` となった。FR-7 により係数化せず、無競合隔離で `250ms`、Green を確認した。
- 安定差分の unit tier: `407` files / `6203` assertions / `0` failures。
- integration tier: `548` files / `6483` assertions の再実行で修正前 PBT 契約 1 件だけを再現し、修正後の workflow focused `9 pass / 0 fail`、移動した guard focused `6 pass / 0 fail` を確認した。
- smoke tier: 初回 CI 相当実行で全 `16` files Green。
- 最終差分の `TEST_TIME_FACTOR=2 bun run test:ci`: `972` files / `13063` assertions / `0` failures、`RESULT: PASS`。

## 逸脱と未解決事項

- 計画上の application code 変更は不要で、変更は test infrastructure、test consumers、CI workflow、testing documentation に限定した。
- 初回 `test:ci` の全 `6` failed files / `7` failed assertions は変更由来 5 files / 6 assertions と性能境界の負荷揺れ 1 file / 1 assertion に分類済みで、修正後または隔離で全件 Green を確認した。
- 設計レビュー iteration 1 で見つかった禁止sinkの allowlist 回避、直接 final override 式、二重係数適用の3経路は、falling testを追加してから fail-closed に修正した。
- Pull Request は作成していないため、PR convergence は `not-applicable-yet` として別成果物に記録する。
