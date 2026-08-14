# Code Summary — unit failopen-error-paths

**Depth**: Minimal / **Finding kind**: `script-error`

## Files

- modified: `packages/framework/core/tools/amadeus-state.ts` — `BlockingSensorFinding` に `script-error`、`evaluateBlockingSensors` が `Note` の `script-error:` 前置を不通過化、拒否メッセージに sensor id と Note
- modified: `packages/framework/core/tools/amadeus-sensor-schema.ts` — stale `verifyBlockingSensors` を `evaluateBlockingSensors` へ
- modified: `tests/unit/t511-blocking-sensor-severity.test.ts` — Red→Green の script-error / tool-unavailable / note-less
- modified: `tests/integration/t511-blocking-sensor-gate.integration.test.ts` — 実在する blocking manifest と dispatcher を通じて exit-2 / bad-output / exit-127 stub を発火。approve は前二者を拒否し、`tool-unavailable` は承認。advance / finalize / complete-workflow の集約ゲートも `script-error: exit-2` を拒否
- modified: `amadeus/spaces/default/specs/tla/model-map.json` — 公式 `updateModelMap --impl-only` で `amadeus-state.ts` の実装 hash を `cb3c7e63181a` から `315c74a90ccf` へ同期

未変更: `amadeus-sensor.ts` / `amadeus-audit.ts` / otel event-registry

## Decisions

- kind 名は requirements 例示どおり `script-error`
- v2 監査の `Note` が非文字列、または監査レコードを読めない場合は `script-error: note-unreadable` として fail-closed。note なしと `tool-unavailable` は従来どおり pass
- 統合テストは既存の blocking manifest と既存 stub を一時プロジェクトへ投影し、実 dispatcher で発火する。新規 fixture は追加しない

## Verification

- Red: 実装前 t511 unit 2 fail(`script-error: exit-2` / `bad-output` が null)
- Green: `bun test tests/unit/t511-blocking-sensor-severity.test.ts tests/integration/t511-blocking-sensor-gate.integration.test.ts` → 64 pass / 0 fail / 125 expect
- NFR-1 直接検証: `SENSOR_PASSED with a non-string v2 Note fails closed (#2988)` → pass。結果は `{kind:"script-error", note:"script-error: note-unreadable"}`
- 関連回帰: `bun test tests/integration/t92.test.ts tests/unit/t-sensor-fire-seam.test.ts` → 62 pass / 0 fail / 225 expect
- formal-model 更新後回帰: 対象 unit 3ファイル + integration 2ファイル → 65 pass / 0 fail / 517 expect
- `bun run build` → claude / codex / cursor / kimi / kiro / kiro-ide / opencode / pi の 8 ハーネスを再生成、exit 0。前後の追跡差分集合は不変
- `bun run source-only:check` → clean、exit 0
- `bun run typecheck` → exit 0
- `bun run lint` → exit 0、既存 warning 464 / info 17。最終変更 4 ファイルへの `biome check` も exit 0、既存 complexity 等 warning 18
- 配布鮮度: `t2851-doctor-self-install-freshness.serial.test.ts` の旧世代投影検出ケースは最終 build 後 1 pass / 0 fail。`t265-engine-boundary.integration.test.ts` の全配布面 byte parity も pass
- 最終フル `bun run test:ci -- --verbose` → 994 files / 13,419 assertions、0 files / 0 assertions fail、exit 0。ログ: `tests/logs/2026-08-14T09-23-11Z`

## Deviations

- 正式な `pr-convergence-report` はプルリクエスト未作成のため CLI attestation を生成できない。存在確認用の偽 attestation にはせず、BLOCKER 報告として残す
- コード生成の配送ゲートは最終 build 後の全体再実行を含めて緑。正式な convergence attestation の生成は conductor 管轄として残す
