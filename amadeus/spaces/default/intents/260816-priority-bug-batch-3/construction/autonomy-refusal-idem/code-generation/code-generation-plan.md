# Code Generation Plan — unit autonomy-refusal-idem(Bolt 1 / FR-2 / #3152)

方式 = decisions.md ADR-2(発火点分離 + 冪等鍵、tie → ユーザー裁定 A)。本計画は ADR-2 実装契約 1-5 の機械的射影であり、新たな設計判断を含まない(計画承認は per-unit の orchestrator-managed gating により抑制、裁定 provenance は ADR-2)。テスト戦略 = Comprehensive(要件・リスク駆動 + 統合)。TDD 必須(NFR-1)— 各ステップは Red 実測 → 最小実装 → Green の vertical slice。

トレーサビリティ: 全ステップ → FR-2(#3152)。

- [x] Step 1: Red (a) — `tests/integration/t482-autonomy-refusal-event.integration.test.ts` 系 seam に「ゲート未開設の `next` 相当読取×5 → `INTENT_AUTONOMY_HUMAN_REQUIRED` 0 行」を期待する失敗テストを追加し、現行 5 行で赤を実測(ADR-2 契約4a)
- [x] Step 2: Red (b) — 「同一 occurrence への gate-start 再実行 + approve 失敗再試行の混合 → ちょうど 1 行」を期待する失敗テストを追加し、現行 2 行以上で赤を実測(ADR-2 契約4b)
- [x] Step 3: 発火点分離 — `productionStageAutonomy`(amadeus-intent-autonomy-production.ts:295-328)から `emitAuthorizationRefusal` 呼出(:314-319)を除去し純粋読取化。`routeMainWorkflowDirective`(orchestrate.ts:2822)は無改変のまま台帳へ書かなくなる
- [x] Step 4: gate-start emit — `amadeus-state.ts` gateStartForTarget の `STAGE_AWAITING_APPROVAL` 発行と同一 operationWithLock 内で、autonomy が human-required を宣言する場合に refusal emit を明示的に呼ぶ(共有関数内の隠れ副作用へ戻さない)
- [x] Step 5: 冪等鍵 — `createInteractionOccurrence`(:261-271)+ mode + graphRevision を正本とする鍵生成を 1 関数へ集約し、emit 前に当該 intent shard 内の同一鍵既存行を検査して skip(UNIT_POOL の replay 様式 :236-237 と同型)。dedup 読取の失敗は fail-open(ゲート無傷)
- [x] Step 6: 監査契約同期 — audit-format.md の `INTENT_AUTONOMY_HUMAN_REQUIRED` 行(:297)へ Idempotency Key を required として追加(UNIT_OUTCOME_SETTLED :211 と同表記)。対訳・生成物を同一変更で同期
- [x] Step 7: occurrence 境界の定義を code-summary.md に明記 — reject 後の正当な再提示は新しい gate-open = 新 occurrence(新規 1 行は正当)。「人間を何回止めたか」の計数 = 実提示回数と一致することをテストで確認(ADR-2 契約5)
- [x] Step 8: 既存テスト追従 — t435(productionStageAutonomy 直接呼出)の emit 期待を新契約へ更新。既存スイートの前後 green
- [x] Step 9: 台帳 resync — `amadeus-state.ts` 変更に伴う model-map 実装ハッシュピン(`updateModelMap --impl-only`)+ coverage-patch-allowlist 意味的セレクタの再アンカー(NFR-3 / bt-ledger-resync)。新規テストファイル追加時は `bun tests/gen-coverage-registry.ts` regen 同梱
- [x] Step 10: `bun run build`(dist 投影再生成)→ typecheck / lint / 対象テスト(targeted)をローカルで green 確認(秒〜十秒級のみ。フルスイートは push 後 CI — push-first)

除外(本 unit のスコープ外): ProductionAutonomyContext への interactionKind 露出の拡張(U4 milestone-presence が必要とする場合は U4 で行う — ただし本 unit の純粋読取化は U4 の前提を壊さない形にする)。event-registry の基数変更なし(新イベント追加なし)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-17T03:02:27Z
- **Iteration:** 1
- **Scope decision:** none

3成果物はステージ契約・FR-2受け入れ条件・ADR-2契約と整合しBLOCKERなし。Red/Green総テスト数不一致(7→10)ほか4件をFOLLOW-UP/NITとして指摘。

### Findings

- FOLLOW-UP | code-summary.mdのテストカバレッジ節で、Red測定(`bun test tests/integration/t482-autonomy-refusal-event.integration.test.ts` → exit 1、7 tests: 1 pass/6 fail)とGreen測定(同一コマンド → exit 0、10 tests: 10 pass/0 fail)の総テスト数が7→10へ増加しており未説明。同一ファイル・同一コマンドである以上テスト総数は不変のはずで、この差は『追加したテスト(計10本)』のうち少なくとも3本(reject backfillのoccurrence境界テスト、fail-openエラーパス2本)がRed測定後に追加された可能性を示す。team.mdは『エラーパス・復旧分岐・防御的catchも実行可能な振る舞いに含まれ...エラーパスのテスト後回しを許容しない』と明記しており、fail-openエラーパステストが個別のRed実測を経ていない場合はNFR-1(TDD)違反となる。FR-2必須の2条件(0行pin/1行pin)自体は明確にRed→Green実測されているためBLOCKERとはしないが、どのテストがRed測定対象に含まれていたかの再整合を推奨する
- FOLLOW-UP | code-generation-plan.mdの全10 Stepが`- [ ]`(未完了)のまま残っており、code-summary.mdの『Step 1-10すべて完了』という申告と食い違う。ステージ契約Step 4は『execute each plan step sequentially and mark checkboxes as completed』を求めており、計画ファイル自体へのチェックボックス反映を推奨する(実体的な完成度には影響しない)
- FOLLOW-UP | requirements.md FR-2受け入れ条件(d)『認可側の既存重複抑止と対称になること』への明示的対応がcode-summary.mdに見当たらない。鍵生成をUNIT_POOLのreplay様式に倣った旨の記載はあるが、これが(d)の充足を意図しているかが明記されていない。(d)自体は上流のrequirements.mdレビューで測定可能性の弱さをNIT指摘済みでapplication-design段への委譲が示唆されているためBLOCKERとはしないが、次段での見落とし防止に一文の追記を推奨する
- NIT | code-generation-plan.md Step 1/2と code-summary.md 内の『Red(a)/Red(b)』ラベルが requirements.md FR-2(a)/(b)のレター付けと逆順(plan Step1=0行pinはFR-2(b)相当、plan Step2=1行pinはFR-2(a)相当)。両条件とも内容は正しくカバーされ機能上の問題はないが、トレーサビリティ表記の統一を推奨する
- NIT | code-summary.mdの『提示エポック=当該stageのGATE_APPROVED+GATE_REJECTEDの件数』という記述は字面上stage全体のグローバルカウントとも読めうる。実際の鍵はoccurrenceIdを内包するため誤りではないが、epochが当該occurrenceに限定されたスコープであることを明記すると誤解を防げる
