# Code Generation Plan — unit autonomy-refusal-idem(Bolt 1 / FR-2 / #3152)

方式 = decisions.md ADR-2(発火点分離 + 冪等鍵、tie → ユーザー裁定 A)。本計画は ADR-2 実装契約 1-5 の機械的射影であり、新たな設計判断を含まない(計画承認は per-unit の orchestrator-managed gating により抑制、裁定 provenance は ADR-2)。テスト戦略 = Comprehensive(要件・リスク駆動 + 統合)。TDD 必須(NFR-1)— 各ステップは Red 実測 → 最小実装 → Green の vertical slice。

トレーサビリティ: 全ステップ → FR-2(#3152)。

- [ ] Step 1: Red (a) — `tests/integration/t482-autonomy-refusal-event.integration.test.ts` 系 seam に「ゲート未開設の `next` 相当読取×5 → `INTENT_AUTONOMY_HUMAN_REQUIRED` 0 行」を期待する失敗テストを追加し、現行 5 行で赤を実測(ADR-2 契約4a)
- [ ] Step 2: Red (b) — 「同一 occurrence への gate-start 再実行 + approve 失敗再試行の混合 → ちょうど 1 行」を期待する失敗テストを追加し、現行 2 行以上で赤を実測(ADR-2 契約4b)
- [ ] Step 3: 発火点分離 — `productionStageAutonomy`(amadeus-intent-autonomy-production.ts:295-328)から `emitAuthorizationRefusal` 呼出(:314-319)を除去し純粋読取化。`routeMainWorkflowDirective`(orchestrate.ts:2822)は無改変のまま台帳へ書かなくなる
- [ ] Step 4: gate-start emit — `amadeus-state.ts` gateStartForTarget の `STAGE_AWAITING_APPROVAL` 発行と同一 operationWithLock 内で、autonomy が human-required を宣言する場合に refusal emit を明示的に呼ぶ(共有関数内の隠れ副作用へ戻さない)
- [ ] Step 5: 冪等鍵 — `createInteractionOccurrence`(:261-271)+ mode + graphRevision を正本とする鍵生成を 1 関数へ集約し、emit 前に当該 intent shard 内の同一鍵既存行を検査して skip(UNIT_POOL の replay 様式 :236-237 と同型)。dedup 読取の失敗は fail-open(ゲート無傷)
- [ ] Step 6: 監査契約同期 — audit-format.md の `INTENT_AUTONOMY_HUMAN_REQUIRED` 行(:297)へ Idempotency Key を required として追加(UNIT_OUTCOME_SETTLED :211 と同表記)。対訳・生成物を同一変更で同期
- [ ] Step 7: occurrence 境界の定義を code-summary.md に明記 — reject 後の正当な再提示は新しい gate-open = 新 occurrence(新規 1 行は正当)。「人間を何回止めたか」の計数 = 実提示回数と一致することをテストで確認(ADR-2 契約5)
- [ ] Step 8: 既存テスト追従 — t435(productionStageAutonomy 直接呼出)の emit 期待を新契約へ更新。既存スイートの前後 green
- [ ] Step 9: 台帳 resync — `amadeus-state.ts` 変更に伴う model-map 実装ハッシュピン(`updateModelMap --impl-only`)+ coverage-patch-allowlist 意味的セレクタの再アンカー(NFR-3 / bt-ledger-resync)。新規テストファイル追加時は `bun tests/gen-coverage-registry.ts` regen 同梱
- [ ] Step 10: `bun run build`(dist 投影再生成)→ typecheck / lint / 対象テスト(targeted)をローカルで green 確認(秒〜十秒級のみ。フルスイートは push 後 CI — push-first)

除外(本 unit のスコープ外): ProductionAutonomyContext への interactionKind 露出の拡張(U4 milestone-presence が必要とする場合は U4 で行う — ただし本 unit の純粋読取化は U4 の前提を壊さない形にする)。event-registry の基数変更なし(新イベント追加なし)。
