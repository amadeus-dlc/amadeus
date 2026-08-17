# Code Generation Plan — unit milestone-presence(Bolt 2 / FR-1 / #3153、P1/S2)

方式 = decisions.md ADR-1(milestone 限定の presence 境界変更、選挙 2-0 established)。本計画は ADR-1 実装契約 1-6 の機械的射影。テスト戦略 = Comprehensive。TDD 必須。ベースは Bolt 1(autonomy-refusal-idem、PR #3173)のブランチ上のスタック — ProductionAutonomyContext の純粋読取化と `stageAutonomyInputFor` の occurrence 座標集約を前提に消費する。

トレーサビリティ: 全ステップ → FR-1(#3153)。

- [ ] Step 1: Red 3点 pin — t188 系 seam で (i) HUMAN_TURN → STAGE_AWAITING_APPROVAL → semi milestone approve が現行 exit 0 で通ること(#3153 の空振り再現)を Red として実測 (ii) 同配置の通常 stage-gate は承認(非退行の対照) (iii) STAGE_AWAITING_APPROVAL → HUMAN_TURN → approve は承認 — の3面を同一テストで pin(片側 assert にしない)
- [ ] Step 2: 境界イベント追加 — `scanPresenceLedger`(amadeus-lib.ts:3787-3835 付近)に `STAGE_AWAITING_APPROVAL` を Stage 付き境界イベントとして1分岐追加し、`resolveGatePresence` の PresenceSlot を1本追加。既存の同秒タイ fail-closed 規則(humanActOutstanding / auditBlockIsAfter)を再利用 — #3153 代表例(同一秒3イベント)が拒否側へ落ちること。第2の独立スキャンを作らない(ADR-1 契約1)
- [ ] Step 3: 結線 — `assertHumanPresentForGateResolution` が ProductionAutonomyContext の human-required 宣言 + interactionKind ∈ {phase-gate, walking-skeleton} を読み、該当 occurrence のみ厳格境界(当該ゲートの gate-open 以降の未消費 HUMAN_TURN)で判定。interactionKind は context の戻り値として1定義供給(必要なら本 unit で露出を追加 — amadeus-state.ts 側で再計算しない)。一般 stage-gate・非宣言 occurrence の prior-resolution 境界は byte-for-byte 不変(ADR-1 契約2)。境界セマンティクスは humanTurnIsFresh(presence-reservation :677)と同一定義を1箇所で共有(2つ目の比較述語を手書きしない)
- [ ] Step 4: backfill の fail-closed — 当該 stage の STAGE_AWAITING_APPROVAL が台帳に不在、または Recovered=true の backfill しか無い場合は緩い境界へ fallback せず拒否し、gate-start して再提示するよう指示メッセージを出す(ADR-1 契約3)
- [ ] Step 5: GATE_APPROVED の機械識別フィールド — 実行された分岐から導出(gate-open-turn / delegated / intent-grant / guard-disabled の4値。AMADEUS_SKIP_HUMAN_PRESENCE_GUARD は guard-disabled と正直に記録)。event-registry と audit-format.md(:150 — Presence Reservation Id の既存 drift も同時是正)を同一変更で同期(ADR-1 契約4)
- [ ] Step 6: 射程外の申し送り — approve-batch 経路(verifyBatchApprovalPresence、verb-less)は本変更の射程外であることを code-summary に明記し、#1647 への申し送り文面を草稿に含める(ADR-1 契約5 — 無言で残さない)
- [ ] Step 7: 既存テスト追従 — t188 / t208(crossshard tiebreak)/ t112(delegated)/ t509(legacy shard)の前後 green。一般ゲートの既存 presence テストを一切書き換えないこと自体を非退行の証拠とする(ADR-1 契約1)
- [ ] Step 8: 台帳 resync — amadeus-state.ts / amadeus-lib.ts 変更に伴う model-map ピン + allowlist セレクタ + 新規テストの coverage-registry regen
- [ ] Step 9: `bun run build` + typecheck / lint / 対象テスト green(push-first — フルスイートは CI)

除外(スコープ外): approve-batch 経路への presence guard 追加(#1647 の仕様判断)。reservation 機構の変更(定義共有の参照のみ)。
