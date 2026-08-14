# Code Summary — unit failopen-error-paths

**Depth**: Minimal / **Finding kind**: `script-error`

## Files

- modified: `packages/framework/core/tools/amadeus-state.ts` — `BlockingSensorFinding` に `script-error`、`evaluateBlockingSensors` が `Note` の `script-error:` 前置を不通過化、拒否メッセージに sensor id と Note
- modified: `packages/framework/core/tools/amadeus-sensor-schema.ts` — stale `verifyBlockingSensors` を `evaluateBlockingSensors` へ
- modified: `tests/unit/t511-blocking-sensor-severity.test.ts` — Red→Green の script-error / tool-unavailable / note-less
- modified: `tests/integration/t511-blocking-sensor-gate.integration.test.ts` — 実在する blocking manifest と dispatcher を通じて exit-2 / bad-output / exit-127 stub を発火。approve は前二者を拒否し、`tool-unavailable` は承認。advance / finalize / complete-workflow の集約ゲートも `script-error: exit-2` を拒否
- modified: `amadeus/spaces/default/specs/tla/model-map.json` — 公式 `updateModelMap --impl-only` で `amadeus-state.ts` の実装 hash を `cb3c7e63181a` から `7e556c1f715b` へ同期（patch coverage 是正後の最終値）

未変更: `amadeus-sensor.ts` / `amadeus-audit.ts` / otel event-registry

## Decisions

- kind 名は requirements 例示どおり `script-error`
- v2 監査の `Note` が非文字列なら `script-error: note-unreadable` として fail-closed。監査レコードの不正形は前段の journal 検証で terminal verdict から除外され `unresolved` となり、前段との不変条件が破られた場合も parse 例外で遷移を停止する。note なしと `tool-unavailable` は従来どおり pass
- 統合テストは既存の blocking manifest と既存 stub を一時プロジェクトへ投影し、実 dispatcher で発火する。新規 fixture は追加しない

## Verification

- Red: 実装前 t511 unit 2 fail(`script-error: exit-2` / `bad-output` が null)
- Green: `bun test tests/unit/t511-blocking-sensor-severity.test.ts tests/integration/t511-blocking-sensor-gate.integration.test.ts` → 64 pass / 0 fail / 125 expect
- NFR-1 直接検証: `SENSOR_PASSED with a non-string v2 Note fails closed (#2988)` → pass。結果は `{kind:"script-error", note:"script-error: note-unreadable"}`
- 関連回帰: `bun test tests/integration/t92.test.ts tests/unit/t-sensor-fire-seam.test.ts` → 62 pass / 0 fail / 225 expect
- formal-model 更新後回帰: 対象 unit 3ファイル + integration 2ファイル → 83 pass / 0 fail / 248 expect
- `bun run build` → claude / codex / cursor / kimi / kiro / kiro-ide / opencode / pi の 8 ハーネスを再生成、exit 0。前後の追跡差分集合は不変
- `bun run source-only:check` → clean、exit 0
- `bun run typecheck` → exit 0
- `bun run lint` → exit 0、既存 warning 464 / info 17。最終変更 4 ファイルへの `biome check` も exit 0、既存 complexity 等 warning 18
- 配布鮮度: `t2851-doctor-self-install-freshness.serial.test.ts` の旧世代投影検出ケースは最終 build 後 1 pass / 0 fail。`t265-engine-boundary.integration.test.ts` の全配布面 byte parity も pass
- 最終フル `bun run test:ci -- --verbose` → 994 files / 13,419 assertions、0 files / 0 assertions fail、exit 0。ログ: `tests/logs/2026-08-14T09-23-11Z`
- PR初回カバレッジで検出された未被覆3行を、到達不能な catch の除去と同値な条件式整形で是正。`bun run coverage:ci` は 996 files / 13,429 assertions を実行し、制約環境の全体実行では3 files / 3 assertions fail。修正対象のt511は64 pass / 0 fail、タイムアウト基線で既知の重いCodex移行3ファイルは `bun test --timeout 120000` で 66 pass / 0 fail / 1 skip / 1,926 expect

## Deviations

- [PR #3045](https://github.com/amadeus-dlc/amadeus/pull/3045) は作成済み。正式な `pr-convergence-report` はこのコミットをpush後に最新HEADへ再発行し、blocking集合の収束後にCLIで `converged` attestationへ更新する
