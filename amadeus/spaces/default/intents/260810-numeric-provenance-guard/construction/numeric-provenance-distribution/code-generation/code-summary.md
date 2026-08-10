# Code Summary — numeric-provenance-distribution

## 実装結果

U2 が定義した numeric-provenance sensor の意味論には変更を加えず、公式 package producer と self-install promotion の出力を配送境界で検証する target resolver と統合テストを追加した。

- `scripts/numeric-provenance-distribution.ts`
  - harness registry、self-install registry、各 harness manifest から配送対象を解決する。
  - registry と producer の対象集合を exact-set で照合する。
  - duplicate ID/root、unknown self-install ID、manifest 名不一致、絶対 path、空 path、`.` / `..` segment、root 脱出を closed failure とする。
- `tests/integration/t533-numeric-provenance-distribution.integration.test.ts`
  - package harness 8 種（claude、codex、cursor、kimi、kiro、kiro-ide、opencode、pi）について、core tool bytes、manifest projection、advisory metadata、`harness.json`、stage graph の enforcement stage exact set を確認する。
  - self-install harness 5 種（claude、codex、cursor、kimi、opencode）について、公式 build 出力を既存 `promoteSelfMain` で temporary project へ投影し、promotion 後の固定 dispatcher から正負 fixture を fire する。
  - 各 harness で manifest discovery、正負 verdict、audit 属性、advisory severity・stage graph、package/self-install の tool・manifest raw bytes 一致を確認する。
- `.github/workflows/ci.yml`
  - A/Bごとにproject root、node_modules、cache、HOME、TMPDIR、dist rootを分離し、生成済みinstall stateがないことをpreflightする。
  - `env -i` から `PATH`、隔離済み4 root、`TZ=UTC`、`LC_ALL=C`、固定 `SOURCE_DATE_EPOCH`、専用 `AMADEUS_DIST_ROOT` だけを渡す。
  - `bun install --frozen-lockfile` の前後で `bun.lock` SHA-256を照合し、`diff -qr` と `git diff --no-index` でbytes・path・file type・executable bitを比較する。
- `tests/integration/t-ci-build-before-test.integration.test.ts`
  - 上記のbuild隔離契約とlockfile guardをworkflow公開面で固定し、byte差と実行権限差の両方が比較stepを失敗させることを実行確認する。

runtime dependency、test configuration、生成済み配送 tree への手編集は追加していない。

## TDD receipt

- Red: 未実装の `scripts/numeric-provenance-distribution.ts` を focused integration test から import し、module not found で exit 1 を確認した。
- Green: exact-set / path containment resolver と package/self-install vertical acceptance を実装した。
- Review BLOCKER Red: `t-ci-build-before-test.integration.test.ts` は隔離環境・lockfile不変・mode差検出の不足により 8 pass / 3 fail。生成済みinstall state preflightの追加sliceは 10 pass / 1 fail。
- Review BLOCKER Green: 同テストは 11 pass / 0 fail / 104 assertions、exit 0。
- Final focused: `bun run build` 後の `bun test --timeout 120000 tests/integration/t533-numeric-provenance-distribution.integration.test.ts` は 3 pass / 0 fail / 228 assertions、exit 0。

## Self-install harness別5項目receipt

| Harness | 1. Discovery | 2. 正負verdict | 3. Audit対応 | 4. Advisory/graph | 5. Tool/manifest bytes |
| --- | --- | --- | --- | --- | --- |
| claude | PASS | PASS/FAIL | PASS | PASS | PASS |
| codex | PASS | PASS/FAIL | PASS | PASS | PASS |
| cursor | PASS | PASS/FAIL | PASS | PASS | PASS |
| kimi | PASS | PASS/FAIL | PASS | PASS | PASS |
| opencode | PASS | PASS/FAIL | PASS | PASS | PASS |

各行は同じ `t533` loop の観測である。固定dispatcherがmanifestを解決し、正fixtureを `SENSOR_PASSED`、負fixtureを `SENSOR_FAILED` としてemitする。audit行はsensor ID、stage、record相対output path、同一fire IDをassertする。promotion後manifestのadvisory severityとstage graph exact setをassertし、tool／manifestのraw bytesを対応package出力と比較する。

## 検証結果

- `bun run typecheck`: exit 0
- 対象 2 TS files の `bunx biome check`: exit 0
- `bun tests/complexity-gate.ts --check`: exit 0（0 new violations、0 regressions）
- `bun run build`: exit 0（package 8 種、self-install 5 種を公式 producer で生成）
- `bun run lint`: exit 0（既存 baseline の warning 460、info 17、error 0）
- `bun run source-only:check`: exit 0
- `bun .codex/tools/amadeus-graph.ts compile --check`: exit 0
- `bun run distribution:check`: exit 0（payload 444 + docs 4 = 448 files）
- workflow の実 `Build isolated distributions` と `Compare generated outputs and release assets` stepを専用 `RUNNER_TEMP` で同期実行: exit 0。A/Bともrelease self-checkは version `0.1.7`、`find` 集計で5,072 files、SHA-256 `c56e3e2f65abb572d06b2617c575d03971d632bd4a592c4746871855b76e36d5` で一致した。
- `bun test --timeout 120000 tests/integration/t-ci-build-before-test.integration.test.ts`: 11 pass / 0 fail / 104 assertions、exit 0
- GitHub Actions の [CI run 31415039320](https://github.com/amadeus-dlc/amadeus/actions/runs/31415039320): conclusion `success`。非 skip の12 job（Tests、Typecheck、Source-only and graph invariants、Lint and complexity、Reproducible build、Coverage Report など）はすべて success、条件非該当の2 jobは skipped。U3 を含む [PR #2863](https://github.com/amadeus-dlc/amadeus/pull/2863) の blocking CI 集合は green。

## 実装上の判断

- integration suite は事前に公式 build を要求するため、その immutable `dist/` を temporary project に複製し、既存 `promoteSelfMain(..., --no-build)` に package-to-self-install write を一元化した。
- concurrent CI の初回 module load が dispatcher の 5 秒 sensor budget に混入しないよう、各 promotion tree の実 tool を先に起動して preflight した。その後の assertion は同じ promotion tree の dispatcher `main` を実行し、audit terminal を直接観測する。
- macOS の `/var` と `/private/var` の symlink 表現差を避けるため、temporary project root は `realpathSync` で canonicalize した。

## 配送境界

target resolver は sensor の検出・判定・audit 意味論を所有しない。配送対象集合と安全な root 解決だけを所有し、runtime behavior は U2 の core producer と既存 dispatcher に委譲する。
