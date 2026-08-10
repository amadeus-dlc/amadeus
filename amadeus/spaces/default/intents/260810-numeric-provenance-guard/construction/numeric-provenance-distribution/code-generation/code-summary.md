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
  - 各 fire が同一 Fire id の `SENSOR_FIRED` と `SENSOR_PASSED` / `SENSOR_FAILED` の組で audit 終端へ到達することを確認する。

runtime dependency、test configuration、生成済み配送 tree への手編集は追加していない。

## TDD receipt

- Red: 未実装の `scripts/numeric-provenance-distribution.ts` を focused integration test から import し、module not found で exit 1 を確認した。
- Green: exact-set / path containment resolver と package/self-install vertical acceptance を実装した。
- Final focused: `bun test --timeout 120000 tests/integration/t533-numeric-provenance-distribution.integration.test.ts` は 3 pass / 0 fail / 168 assertions、exit 0。

## 検証結果

- `bun run typecheck`: exit 0
- 対象 2 TS files の `bunx biome check`: exit 0
- `bun tests/complexity-gate.ts --check`: exit 0（0 new violations、0 regressions）
- `bun run build`: exit 0（package 8 種、self-install 5 種を公式 producer で生成）
- `bun run lint`: exit 0（既存 baseline の warning 460、info 17、error 0）
- `bun run source-only:check`: exit 0
- `bun .codex/tools/amadeus-graph.ts compile --check`: exit 0
- `bun run distribution:check`: exit 0（payload 444 + docs 4 = 448 files）
- 独立した A/B package 出力（各 428 files）の `diff -qr`: exit 0
- `bun run test:ci -- -P 4`: exit 1。964 files / 12,962 assertions を実行し、1 file / 1 assertion の既存 full-suite failure が残った。U3 の t533 は同 run 内で 3 pass / 0 fail だった。非 verbose runner が終了時に一時 log directory を削除するため、終了後に failure file 名を復元できなかった。

## 実装上の判断

- integration suite は事前に公式 build を要求するため、その immutable `dist/` を temporary project に複製し、既存 `promoteSelfMain(..., --no-build)` に package-to-self-install write を一元化した。
- concurrent CI の初回 module load が dispatcher の 5 秒 sensor budget に混入しないよう、各 promotion tree の実 tool を先に起動して preflight した。その後の assertion は同じ promotion tree の dispatcher `main` を実行し、audit terminal を直接観測する。
- macOS の `/var` と `/private/var` の symlink 表現差を避けるため、temporary project root は `realpathSync` で canonicalize した。

## 配送境界

target resolver は sensor の検出・判定・audit 意味論を所有しない。配送対象集合と安全な root 解決だけを所有し、runtime behavior は U2 の core producer と既存 dispatcher に委譲する。
