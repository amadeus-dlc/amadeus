# Code Generation Plan — issue-3106-per-unit-outcome(Bolt 2)

Intent: 260818-priority-bug-batch-4(depth Minimal、Test Strategy Comprehensive、TDD 必須)

計画承認: full グラント梯子 AUTO_DECIDED `auto-decision-156cb662b18d0aad060e025c37c160c2`(grant `intent-grant-6a7132513338ba97ba55f186a0881cc2`、2026-08-18)

入力: `../../../inception/requirements-analysis/requirements.md`(FR-3106-1〜4)、`../../../inception/application-design/decisions.md` **ADR-2**(実装契約 1〜9 — 全項拘束)、`component-methods.md`(メソッド契約)、`unit-of-work.md`(U2 定義)、issue-evidence.md #3106 節(reviewer-1 の end-to-end 再現手順 — 受け入れの再現系列)。

## 実装ステップ(traceability: step → FR)

- [x] Step 1: **Red 1(cancelled)** — per-unit 経路 solo Skip → 下流 stage `next` が `producer-outcome-pending` で exit 1 になる現況を、t533 integration の pool 版 cancelled(:786-801)と対になる位置の失敗テストとして固定(期待 = 停止しない)。Red を実測記録 → FR-3106-1 / FR-3106-2
- [x] Step 2: **failed arm 到達可能性の実証** — per-unit 経路で failed terminal に実際に到達する系列を構成して Red を試みる。到達可能なら failed 版 Red(期待診断 `producer-outcome-failed`)も置く。到達不能と実証された場合は failed arm を実装せず「採らない根拠」を code-summary へ記録(ADR-2 契約5)→ FR-3106-1(b)
- [x] Step 3: 語彙拡張 — `SETTLED_UNIT_OUTCOME` を閉集合 {succeeded, cancelled, failed}(型 union)へ、`readSettledUnitOutcomes` の受理拡張(語彙外・鍵欠落は INVALID_SETTLED_ROW throw 維持)→ FR-3106-1
- [x] Step 4: emit arm — `settlePerUnitOutcomes` に cancelled(/採る場合 failed)の記録経路を追加。値は canonical construction outcome projection 由来の engine 観測事実に限定、coverage ゲート(unitCovered)は succeeded arm 専用のまま → FR-3106-1
- [x] Step 5: **supersession 規則** — 冪等鍵と reader の採択規則(shard 順非依存の決定的順序)を固定し、cancel → BOLT_STARTED 再入 → success の系列を round-trip テストで固定。pool 優先 de-dup(:2546-2551)と数値 batch join(:2527/:2549)は逐語保存し、同一 unit 2 行にならないことをテスト固定 → FR-3106-1 / ADR-2 契約3〜4
- [x] Step 6: 対称性検証 — cancelled unit は consumer を止めず paths のみ除外(pool 版 t533 と同一挙動)。既存 pool 優先テスト(:395-403)の前提不変を確認 → FR-3106-3
- [x] Step 7: docs — `docs/guide/15-troubleshooting.md:143` の既知限界段落を実挙動へ更新。`.ja.md` は対訳の実文言を実読特定してから同一変更で同期 → FR-3106-4
- [x] Step 8: Green — Red 転化 + t533(unit/integration)連動 + `bun run typecheck` + `bun run lint` + 対象テスト単体(ローカルフルスイートは回さない — remote-first)
- [x] Step 9: 台帳 resync — model-map `updateModelMap --impl-only`(orchestrate.ts 変更)、coverage-registry regen(新規テストファイル時)、allowlist 再アンカー(必要時)→ NFR
- [x] Step 10: `bun run build` → 受け入れ実測: docs 英日 grep(旧既知限界 0 件 exit 1 / 新挙動 各 1+ hit exit 0)、E-260815-3099 との関係(再裁定明記)と残余(2 読み口不一致・SR2/SR3 棚卸し)を code-summary へ → FR-3106-4 / ADR-2 契約7〜8
- [x] Step 11: code-summary.md(Minimal: 箇条書き — 変更一覧、failed arm 採否と根拠、supersession 規則、Red/Green 証跡、受け入れ実測、残余、逸脱)

## 制約(ADR-2 実装契約の要点)

- 読み口(fanout / KNOWN_OUTCOMES)不変。pool coordinator 非経由(発生点で pool event を書かない)。conductor 供給値を受け取らない。第3の挙動を発明しない
- **注意**: base(origin/main)には Bolt 1(PR #3202)の orchestrate.ts 変更(emit 境界 + spentPoolRefusal)が未着地。U2 の patch 面(:2475-:2556 / :4686-:4711 系)は非交差だが、行番号は base 断面で再解決すること
- bolt worktree 外の git 状態変更禁止、engine/state ツール実行禁止、scratch は repo 外、commit 英語、push しない

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-18T10:21:15Z
- **Iteration:** 1
- **Scope decision:** none

plan⇄summaryは11 step全実測整合、FR-3106-1〜4は全て証跡付きで充足、TDD Red先行・supersession round-trip・E-260815-3099再裁定・残余明示も契約どおり記録され、failed arm不採用は実測に基づく妥当な判断でBLOCKERなし

### Findings

- FOLLOW-UP | FR-3106-1(b)の failed arm 不採用根拠が code-summary.md にのみ記録され、design 成果物(ADR-2)への書き戻し・ポインタが未追記 — トレーサビリティを閉じるため ADR-2 側へポインタを追記する価値がある
- NIT | plan Step 7 の docs 列挙(troubleshooting のみ)が実変更範囲(12-state-machine.md / audit-format.md も同期)より狭い — 妥当な追随更新だが次回は plan に列挙して追跡性を高める余地
