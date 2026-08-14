# Code Generation Plan — unit failopen-error-paths

**Depth**: Minimal / **Test strategy**: Comprehensive(self-fix 既定) / **Unit**: failopen-error-paths(単一 unit、units-generation は scope SKIP — requirements.md FR-1〜7 から直接スコープ)

対象: `packages/framework/core/tools/amadeus-state.ts`(ゲート述語)と `packages/framework/core/tools/amadeus-sensor-schema.ts`(stale 言及)。`amadeus-sensor.ts` / 監査語彙 / otel は不変(FR-4)。

## Traceability(step → FR)

- Step 1 → FR-6(Red) / Step 2 → FR-1, FR-2, NFR-1 / Step 3 → FR-3, FR-4 / Step 4 → FR-5 / Step 5 → FR-6(Green), NFR-3 / Step 6 → FR-7, NFR-2

## Steps

- [x] **Step 1: Red の確定(TDD)** — `tests/unit/t511-blocking-sensor-severity.test.ts` に「SENSOR_PASSED + Note `script-error:…` は pass でない」を追加し、現行実装で赤を実測。`tests/integration/t511-blocking-sensor-gate.integration.test.ts` に blocking sensor が exit 2 / bad-output のとき approve/complete が拒否され、拒否メッセージに sensor id と Note 診断が含まれることを追加し、現行で赤を実測。既存 fixture(`makeForkSensors`・`amadeus-sensor-stub-exit2.ts` / `-bad.ts`・`amadeus-blocking-probe.md`)を再利用し新規 fixture は作らない。
- [x] **Step 2: ゲート述語** — `evaluateBlockingSensors` が最新 terminal の `Note` が `script-error:` で始まる SENSOR_PASSED を不通過にする。`BlockingSensorFinding` に新 kind(確定名は実装時に受け入れテストと一致させる)。Note 抽出失敗・想定外形は pass 側へ倒さない(NFR-1)。
- [x] **Step 3: 不変の固定** — note なし SENSOR_PASSED と `tool-unavailable`(exit 127)は従来どおり pass。`amadeus-sensor.ts` / `amadeus-audit.ts` / `otel/event-registry.ts` に触らない(FR-3/FR-4)。既存 t92 Group E / test 44-45 / t511 / t-sensor-fire-seam が無変更で緑。
- [x] **Step 4: コメント同期** — `amadeus-state.ts` の「真理値表は無変更のまま・fail-closed は集約のみ」コメントを是正後の実態へ更新。`amadeus-sensor-schema.ts:21` の `verifyBlockingSensors` 言及を現行シンボルへ是正。
- [x] **Step 5: Green** — Step 1 の新規テストが緑。正当な既存データで赤くならないことを実測。
- [x] **Step 6: 配送** — `bun run build` を manifest が発見する全ハーネスに対して実行し、追跡ファイルが不変であることを確認。`bun run typecheck` / `bun run lint` と新規+既存 t511 を通す。最終 build 後のフル blocking suite が実測 green のときだけ完了にする。

## 備考

- degraded input の明記: units-generation / functional-design 等は self-fix scope により SKIP — 本 plan は requirements.md と captured intent から直接スコープした。
- tool-unavailable(exit 127)とコメント表 7 arm vs 11 return はスコープ外。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-14T08:23:30Z
- **Iteration:** 1
- **Scope decision:** none

Plan traces FR-1..7, summary matches the planned files and script-error kind, and no BLOCKER is evidenced in the passed artifacts; the PR report is a documented attestation gap, not a present requirement failure.

### Findings

- FOLLOW-UP | amadeus/spaces/default/intents/260814-failopen-error-paths/construction/failopen-error-paths/code-generation/pr-convergence-report.md | kind:created with no <repo>#<number> identity, converged:false, and no CLI attestation is not a created/converged/override report; regenerate after a PR exists
- FOLLOW-UP | amadeus/spaces/default/intents/260814-failopen-error-paths/construction/failopen-error-paths/code-generation/code-summary.md | FR-7 requires bun run build across every harness the manifest discovers; the summary only attests a single bun run build exit 0

## Implementation status — 2026-08-14

- 実装・対象テスト・8 ハーネス build・typecheck・lint・source-only check・最終フル `bun run test:ci` は完了。最終フルスイートは 994 files / 13,419 assertions、失敗 0。詳細な実測値は `code-summary.md` に記録した。
- BLOCKER | プルリクエスト未作成のため、必須の pr-convergence CLI attestation を生成できない。
- NFR-1 の直接証跡として `SENSOR_PASSED with a non-string v2 Note fails closed (#2988)` が pass し、`{kind:"script-error", note:"script-error: note-unreadable"}` を確認した。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-14T09:01:46Z
- **Iteration:** 2
- **Scope decision:** none

要件トレースと対象実装・回帰テストの記録は概ね整合しているが、正式な PR convergence attestation が存在せず、PR blocking 集合も未収束である。明示された配送契約を満たしていないため NOT-READY。

### Findings

- BLOCKER | pr-convergence-report.md は pull request を「未作成」、attestation を「利用不可」、converged を false と明記しており、正式な created / converged / override の CLI attestation ではない。code-generation stage が必須出力とする pr-convergence-report の収束契約が未充足である。
- BLOCKER | requirements.md の NFR-2 は PR blocking 集合の通過を要求するが、code-summary.md はフル bun run test:ci で 14 files / 51 assertions が失敗し、最終修正・build 後の全体再実行も未実施と記録している。plan の Step 6 が NFR-2 にトレースされ完了済みになっていることとも矛盾し、配送ゲートは収束していない。
- FOLLOW-UP | NFR-1 の非文字列 Note・監査レコード読取不能を fail-closed にする実装判断は code-summary.md に記載されているが、Verification のテストケース説明では当該異常形の直接検証が明示されていない。正式な収束前に対応テスト名または実測結果を記録すること。
