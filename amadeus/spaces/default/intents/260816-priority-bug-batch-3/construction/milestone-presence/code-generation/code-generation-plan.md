# Code Generation Plan — unit milestone-presence(Bolt 2 / FR-1 / #3153、P1/S2)

方式 = decisions.md ADR-1(milestone 限定の presence 境界変更、選挙 2-0 established)。本計画は ADR-1 実装契約 1-6 の機械的射影。テスト戦略 = Comprehensive。TDD 必須。ベースは Bolt 1(autonomy-refusal-idem、PR #3173)のブランチ上のスタック — ProductionAutonomyContext の純粋読取化と `stageAutonomyInputFor` の occurrence 座標集約を前提に消費する。

トレーサビリティ: 全ステップ → FR-1(#3153)。

- [x] Step 1: Red 3点 pin — t188 系 seam で (i) HUMAN_TURN → STAGE_AWAITING_APPROVAL → semi milestone approve が現行 exit 0 で通ること(#3153 の空振り再現)を Red として実測 (ii) 同配置の通常 stage-gate は承認(非退行の対照) (iii) STAGE_AWAITING_APPROVAL → HUMAN_TURN → approve は承認 — の3面を同一テストで pin(片側 assert にしない)
- [x] Step 2: 境界イベント追加 — `scanPresenceLedger`(amadeus-lib.ts:3787-3835 付近)に `STAGE_AWAITING_APPROVAL` を Stage 付き境界イベントとして1分岐追加し、`resolveGatePresence` の PresenceSlot を1本追加。既存の同秒タイ fail-closed 規則(humanActOutstanding / auditBlockIsAfter)を再利用 — #3153 代表例(同一秒3イベント)が拒否側へ落ちること。第2の独立スキャンを作らない(ADR-1 契約1)
- [x] Step 3: 結線 — `assertHumanPresentForGateResolution` が ProductionAutonomyContext の human-required 宣言 + interactionKind ∈ {phase-gate, walking-skeleton} を読み、該当 occurrence のみ厳格境界(当該ゲートの gate-open 以降の未消費 HUMAN_TURN)で判定。interactionKind は context の戻り値として1定義供給(必要なら本 unit で露出を追加 — amadeus-state.ts 側で再計算しない)。一般 stage-gate・非宣言 occurrence の prior-resolution 境界は byte-for-byte 不変(ADR-1 契約2)。境界セマンティクスは humanTurnIsFresh(presence-reservation :677)と同一定義を1箇所で共有(2つ目の比較述語を手書きしない)
- [x] Step 4: backfill の fail-closed — 当該 stage の STAGE_AWAITING_APPROVAL が台帳に不在、または Recovered=true の backfill しか無い場合は緩い境界へ fallback せず拒否し、gate-start して再提示するよう指示メッセージを出す(ADR-1 契約3)
- [x] Step 5: GATE_APPROVED の機械識別フィールド — 実行された分岐から導出(gate-open-turn / delegated / intent-grant / guard-disabled の4値。AMADEUS_SKIP_HUMAN_PRESENCE_GUARD は guard-disabled と正直に記録)。event-registry と audit-format.md(:150 — Presence Reservation Id の既存 drift も同時是正)を同一変更で同期(ADR-1 契約4)
- [x] Step 6: 射程外の申し送り — approve-batch 経路(verifyBatchApprovalPresence、verb-less)は本変更の射程外であることを code-summary に明記し、#1647 への申し送り文面を草稿に含める(ADR-1 契約5 — 無言で残さない)
- [x] Step 7: 既存テスト追従 — t188 / t208(crossshard tiebreak)/ t112(delegated)/ t509(legacy shard)の前後 green。一般ゲートの既存 presence テストを一切書き換えないこと自体を非退行の証拠とする(ADR-1 契約1)
- [x] Step 8: 台帳 resync — amadeus-state.ts / amadeus-lib.ts 変更に伴う model-map ピン + allowlist セレクタ + 新規テストの coverage-registry regen
- [x] Step 9: `bun run build` + typecheck / lint / 対象テスト green(push-first — フルスイートは CI)

除外(スコープ外): approve-batch 経路への presence guard 追加(#1647 の仕様判断)。reservation 機構の変更(定義共有の参照のみ)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-17T05:25:55Z
- **Iteration:** 1
- **Scope decision:** none

5件の申告はいずれも承認済み設計(ADR-1/FR-1)の範囲内の解釈と判定、BLOCKERなし。tie-break代表例・override経路・walking-skeleton・HUMAN_TURN皆無ケースの証跡強化を4件のFOLLOW-UPとして指摘。

### Findings

- FOLLOW-UP | 申告(1) humanTurnIsFresh共有解釈: 契約1(機構=scanPresenceLedger+PresenceSlot+既存同秒タイfail-closed再利用)を契約2(境界=当該stageの最新STAGE_AWAITING_APPROVAL)と分けて読む解釈は妥当。auditBlockIsAfter(モジュール唯一のappend-order定義)を無改変で再利用しているため#3153代表例(同一秒3イベント)の拒否側帰結は構造的に保存されると判断でき、裁定を要する設計逸脱とまでは認定しない。ただしこの正確な組み合わせ(milestone gate × 同一秒3イベントtie-break)を直接検証する専用テストがcode-summary.mdに記載されていない(M/M0/M2/M3はいずれもこのシナリオを名指ししない)。t208-presence-crossshard-tiebreakは一般ゲートの非退行証拠に留まる。ADR-1が名指しする代表例を直接pinするテストの追加を推奨する。
- FOLLOW-UP | 申告(4) Approval Provenanceをoverride経路(targeted approval / presence reservation)・recovered batch経路に付けない件: 契約5(approve-batch射程外)は「主要判断」節に#1647参照付きの正式な申し送り文言があるのに対し、override経路の除外は「逸脱・要レビュー申告」節の1文のみで、同水準の正式な申し送り(reservation機構が独立したpresence保証を既に持つことの実測、FR-1(c)機械的区別要求への影響の明記)を欠く。override経路がmilestoneゲートを承認しうる経路かどうか自体が本レビューの手持ち成果物からは確認できない。conductor/architectによる明示的なスコープ確認と、approve-batchと同水準の文書化を推奨する。
- FOLLOW-UP | 申告(5) walking-skeletonのend-to-end未駆動: FR-1はphase-gate/walking-skeletonの両interactionKindを名指しし、テスト戦略はComprehensiveだが、walking-skeleton側は分類(isMilestoneInteraction)のみをM0でpinし、実際のゲート解決経路(assertHumanPresentForGateResolutionの実行)をwalking-skeleton側で駆動していない。両kindが同一の共有関数を通るという主張は設計上一貫しているが、その共有点(呼び出し箇所の一致)を実証する記述がcode-summaryに明記されていない。Build-and-Testでのwalking-skeleton実地駆動、または本stageでの裏付け記載を推奨する。
- FOLLOW-UP | FR-1受け入れ基準(b)の「正当な承認フロー(HUMAN_TURN皆無での拒否、gate後応答での承認)の両側green」のうち、「HUMAN_TURN皆無での拒否」側の明示的なRed/Green証跡言及がない(pin対象はいずれもHUMAN_TURN存在下のシナリオ)。narrowingロジックが「マッチする候補が0件」の経路に触れていない以上non-regressionとして扱える理解は妥当だが、成果物にその旨の一言を追記すると完全性の実測がより明確になる。
- NIT | code-summary.md冒頭のcommit `97345f44c`はconductor提供コンテキストによればrebase前のSHAであり現行PR head(`2e56e29655...`)と食い違う。rebase後SHAへの更新を推奨(追跡可能性の向上)。
