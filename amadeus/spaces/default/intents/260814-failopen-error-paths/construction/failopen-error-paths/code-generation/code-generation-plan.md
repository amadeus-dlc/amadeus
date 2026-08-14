# Code Generation Plan — unit failopen-error-paths

**Depth**: Minimal / **Test strategy**: Comprehensive(self-fix 既定) / **Unit**: failopen-error-paths(単一 unit、units-generation は scope SKIP — requirements.md FR-1〜7 から直接スコープ)

対象: `packages/framework/core/tools/amadeus-state.ts`(ゲート述語)と `packages/framework/core/tools/amadeus-sensor-schema.ts`(stale 言及)。`amadeus-sensor.ts` / 監査語彙 / otel は不変(FR-4)。

## Traceability(step → FR / captured intent)

- captured intent: Issue #2988 の blocking sensor script error による fail-open を fail-closed へ是正し、既存の許容経路を維持する。
- Step 1 → captured intent の失敗再現、FR-6(Red)
- Step 2 → captured intent の fail-closed 化、FR-1, FR-2, NFR-1
- Step 3 → captured intent の既存許容経路維持、FR-3, FR-4
- Step 4 → captured intent と実装コメントの整合、FR-5
- Step 5 → captured intent の修正確認、FR-6(Green), NFR-3
- Step 6 → captured intent の配送面・回帰確認、FR-7, NFR-2
- Step 7 → captured intent のテスト実行基盤確認、FR-6, FR-7

## Steps

- [x] **Step 1: Red の確定(TDD)** — `tests/unit/t511-blocking-sensor-severity.test.ts` に「SENSOR_PASSED + Note `script-error:…` は pass でない」を追加し、現行実装で赤を実測。`tests/integration/t511-blocking-sensor-gate.integration.test.ts` に blocking sensor が exit 2 / bad-output のとき approve/complete が拒否され、拒否メッセージに sensor id と Note 診断が含まれることを追加し、現行で赤を実測。既存 fixture(`makeForkSensors`・`amadeus-sensor-stub-exit2.ts` / `-bad.ts`・`amadeus-blocking-probe.md`)を再利用し新規 fixture は作らない。
- [x] **Step 2: ゲート述語** — `evaluateBlockingSensors` が最新 terminal の `Note` が `script-error:` で始まる SENSOR_PASSED を不通過にする。`BlockingSensorFinding` に新 kind(確定名は実装時に受け入れテストと一致させる)。Note 抽出失敗・想定外形は pass 側へ倒さない(NFR-1)。
- [x] **Step 3: 不変の固定** — note なし SENSOR_PASSED と `tool-unavailable`(exit 127)は従来どおり pass。`amadeus-sensor.ts` / `amadeus-audit.ts` / `otel/event-registry.ts` に触らない(FR-3/FR-4)。既存 t92 Group E / test 44-45 / t511 / t-sensor-fire-seam が無変更で緑。
- [x] **Step 4: コメント同期** — `amadeus-state.ts` の「真理値表は無変更のまま・fail-closed は集約のみ」コメントを是正後の実態へ更新。`amadeus-sensor-schema.ts:21` の `verifyBlockingSensors` 言及を現行シンボルへ是正。
- [x] **Step 5: Green** — Step 1 の新規テストが緑。正当な既存データで赤くならないことを実測。
- [x] **Step 6: 配送** — `bun run build` を manifest が発見する全ハーネスに対して実行し、追跡ファイルが不変であることを確認。`bun run typecheck` / `bun run lint` と新規+既存 t511 を通す。最終 build 後のフル blocking suite が実測 green のときだけ完了にする。
- [x] **Step 7: テスト設定** — 既存の Bun test runner、`package.json` scripts、coverage 設定で unit / integration / blocking CI を実行できることを確認。新規設定ファイルや設定変更は不要であり、t511、フルCI、project coverage gate、patch coverage gate が既存設定のまま実行・成功した。

## 備考

- degraded input の明記: units-generation / functional-design 等は self-fix scope により SKIP — 本 plan は requirements.md と captured intent から直接スコープした。
- tool-unavailable(exit 127)とコメント表 7 arm vs 11 return はスコープ外。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-14T11:04:20Z
- **Iteration:** 1
- **Scope decision:** none

code-generation成果物はPR収束証跡を備えているが、必須のテスト設定ステップ、各ステップからcaptured intentへのトレーサビリティ、最終ブロッキング検証の直接証跡が不足している。

### Findings

- BLOCKER | code-generation-plan.md: 必須のテスト設定ステップが存在しない。既存設定を変更不要と判断した場合でも、その確認と根拠を独立したステップとして記録する必要がある。
- BLOCKER | code-generation-plan.md: 各ステップのトレーサビリティがFRにのみ向いており、user storiesがない場合に必須となるcaptured intentへの対応が明示されていない。
- BLOCKER | code-summary.md: ローカルcoverage:ciの失敗が記載され、最終ブロッキング検証の具体的なチェック名と成功結果が直接示されていない。PR収束レポートだけでなく最終CIのTestsおよびCoverage各ゲートの成功証跡を明記する必要がある。
- NIT | code-summary.md: Deviations欄が将来形のままであるため、完了時点の実績へ更新すると成果物の整合性が上がる。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-14T11:05:57Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の3件のBLOCKERとNITはすべて解消され、要件トレーサビリティ、テスト戦略、最終blocking CI、PR収束を含むステージ完了条件を満たしている。

### Findings

- None
