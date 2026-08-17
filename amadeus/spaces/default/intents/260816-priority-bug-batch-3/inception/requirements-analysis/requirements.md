# Requirements — intent 260816-priority-bug-batch-3(open bug 5 件の修正バッチ)

## 意図分析

open bug のうち優先度上位 5 件(P1×1、P2/S3×3、P3/S3×1)を、1 Issue = 1 Unit = 1 PR の multi-unit 構成で修正し、オープンバグゼロ目標(cid:requirements-analysis:bug-zero-goal)を前進させる。各 Issue はクロスレビュー2名成立済み(全件 ESTABLISHED_WITH_REFINEMENTS、対象 SHA `89053172e`、コメント10件が一次記録)。#3149 の着地は park 中の intent 260815-rfc-autonomy-modes の resume を解除する(resume 実施自体はスコープ外)。

上流入力: 本 intent の RE 差分リフレッシュ(base `5c5911ee3` → observed `89053172e`)が更新した codekb の `business-overview.md`(自律性・ゲート機構の事業文脈)、`architecture.md`(autonomy×presence 接合部、pr-convergence report lifecycle、選挙 store の各機構節)、`code-structure.md`(対象 5 領域のモジュール配置)を前提とする。行番号引用はすべて observed 断面で再解決済み(re-scans/260816-priority-bug-batch-3.md)。

## 機能要件

### FR-1: human-required 宣言 milestone ゲートの承認結線(#3153、P1/S2)

autonomy が human-required と宣言した milestone ゲート(phase-gate / walking-skeleton)の承認は、その occurrence への人間の応答に結線されること。別目的の未消費 HUMAN_TURN 1 件のみでは承認されないこと。`GATE_APPROVED` から「人間が答えた / engine が未消費ターンで通した」を機械的に区別できること。
受け入れ: (a) 落ちる実証 — 使い捨て project で「別目的 HUMAN_TURN 1件のみの semi milestone 承認が exit 0」を Red として実測(クロスレビュー r1 が決定的再現を確立済み)し、修正後は拒否 (b) 正当な承認フロー(HUMAN_TURN 皆無での拒否、gate 後応答での承認)の両側 green (c) 結線方式は application-design の選挙裁定に従う。

### FR-2: INTENT_AUTONOMY_HUMAN_REQUIRED の冪等発行(#3152、P2/S3)

同一 occurrence に対する「人間へ委ねた」監査記録が高々 1 行になること。ゲート未提示(`next` の directive 発行のみ)での発火が 0 行になること。
受け入れ: (a) 落ちる実証 — 現行コードで同一ゲートへ 2 行以上積まれることを Red として実測し、修正後 1 行へ pin (b) ゲート未開設の `next` 反復で 0 行を pin (c) 冪等化方式(冪等鍵 / 発火点移動 / read-emit 分離)は application-design の選挙裁定に従う (d) 認可側の既存重複抑止と対称になること。

### FR-3: pr-convergence report の converged 最終化経路と孤児化 created の回復経路(#3149、P2/S3)

(クラスA)converged-at-merged-head の report に正規の最終化経路を与え、`pr-convergence-report-format` センサーが SENSOR_PASSED になること。「converged は final」(CLI)と「converged は live 束縛」(センサー)の矛盾を、application-design の選挙裁定でどちらを正とするか確定して解消する。(クラスB)rebase で孤児化した created epoch に対する回復経路を同裁定で確定して実装する(Q1 = A: 機構修正は両クラス、rfc-autonomy-modes の実 unit 回復はスコープ外。クラスB実例の現存性は実装時に現行断面で再実測)。
受け入れ: 両クラスの拒否(`report lifecycle refused: converged -> landed` / `landed finalisation refused: ... not an ancestor`)を再現テストで Red として固定し、修正後に正規経路で green。単一 unit の従来フロー(created → landed、#3113 経路)の非退行。

### FR-4: workspace_requires ガードの solo Bolt 後追い record パターン受理(#3156、P2/S3)

record 初コミット(birth)がコードコミット群より後、かつ bolt ブランチが HEAD 祖先、かつ squash 件名に issue 参照が無い形状でも、実在のソース作業(マージ済み Bolt PR のコードコミットが record ブランチ履歴に包含)を検出して code-generation の approve を通すこと。sibling intent のコードのみが存在するケースは従来どおり拒否すること(誤帰属防止の両側テスト)。
受け入れ: (a) 本パターンを再現する fixture で approve 成功 (b) sibling のみで拒否 (c) 新設プローブは落ちる実証(注入 → 赤 → revert)を経ること(クロスレビュー r1 が合成 repo での 3 プローブ false 再現を確立済み)。

### FR-5: 選挙 store appendPending の並行 voter 安全化(#3046、P3/S3)

異なる voter の並行 `appendPending` が同一 `arrivalSequence` を採番して store を恒久 corrupt 化しないこと。
受け入れ: (a) 落ちる実証 — 別 OS プロセス 2 voter のバリア同期並行 append で `corrupt` を Red として実測(クロスレビュー r1 の再現 driver 構成を雛形に採用)し、修正後 green (b) 単一 writer 直列駆動(D-09 の現行ソロ選挙運用)の非退行 (c) 修正方式(採番の voter スコープ化 / ロック導入 / 直列化強制)は application-design の選挙裁定に従う。

## 非機能要件

- **NFR-1(TDD)**: 全 FR は実装前に合意済み公開 seam へ失敗テストを追加して Red を実測し、それを通す最小実装で Green にする(team.md Testing Posture、エラーパス含む)。
- **NFR-2(回帰防止)**: 対象バグごとのリグレッションテストを追加し、既存スイートは green を維持(org.md bugfix 既定)。coverage ratchet / patch coverage / complexity / 生成物 drift の blocking gate を維持。
- **NFR-3(台帳同期)**: `amadeus-orchestrate.ts` / `amadeus-state.ts` 等 model-map の implPath に載るファイルを触る unit は、model-map 実装ハッシュピンと coverage-patch-allowlist の意味的セレクタを同一変更で resync(cid:build-and-test:bt-ledger-resync)。新規テストファイル追加時は coverage-registry regen を同梱(同 c1)。audit イベントの追加・変更が生じる場合は event-registry 基数 pin を同期。

## 制約

- 1 Issue = 1 Unit = 1 PR。per-unit PR は multiunit-pr-procedure(cid:code-generation:multiunit-pr-procedure)の定型に従い、record 同梱 PR の直列着地(serial-landing-rebase-shape)を適用。
- 検証は remote-first / push-first(cid:code-generation:push-first)。Bolt 実装は git worktree 分離(cid:code-generation:solo-bolt-worktree-required)。
- #3153 は RFC-0001 付録 B の既存契約への回復であり新契約の追加ではない(self-fix 適格)。#3156 / #3152 / #3149 / #3046 も既存契約(#731 の attribution 原則、audit-format の意味論、pr-convergence stage 契約、選挙 store の一意性不変量)への回復。

## 前提

- 5 Issue のクロスレビュー REFINE(行ピンの移動、#3153 統計の過小申告 = 現象は申告以上の規模、#3149 クラスB実例の現存性要再実測)は要件の同一性を変えない — 実装時に現行断面で file:line を再解決する。
- #3153 と #3152 と #3156 は `amadeus-state.ts` で交差する。unit 境界・直列化は units-generation / delivery-planning で決める。

## スコープ外

- #2837(Codex ハーネス契約 4 クラス — 単独 intent)、#3106(再現条件の実測が第一作業)、S4-MINOR bug 群(#3078 / #3088 / #3147 / #3151 / #3168)、#3170(本セッション起票、クロスレビュー未成立)。
- intent 260815-rfc-autonomy-modes の実 resume 操作(着地後の別作業)。隣接 enhancement(#2739 / #1647 / #2473)。

## 未解決事項

- 3 件の方式裁定(FR-1 結線方式 / FR-2 冪等化方式 / FR-3 正の所在と回復経路の形)→ application-design の solo 選挙(Q2 = A、`auto-decision-615e7cd0b035254504a8a00b5b513cce`)。
- #3149 クラスB実例の現存性 → 実装時再実測(Q1 = A、`auto-decision-0968e3ed7df9b3c970b8295c50db4be0`)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-17T00:48:09Z
- **Iteration:** 1
- **Scope decision:** none

5 FR は各 Issue に1:1で対応し測定可能な受け入れ条件と落ちる実証要求を持ち、上流3 artifact も本intent専用節で実質参照されているため BLOCKER なし(未解決事項の方式裁定件数の過小計上のみ FOLLOW-UP)。

### Findings

- FOLLOW-UP | 未解決事項が「3 件の方式裁定(FR-1/FR-2/FR-3)」と記載しているが、FR-5(c)も『修正方式(採番の voter スコープ化 / ロック導入 / 直列化強制)は application-design の選挙裁定に従う』と同種の方式選定を election へ委ねており、実質4件目の方式裁定が存在する。件数とFR列挙にFR-5を含めていないため、application-design 段でこの election が未計上のまま見落とされるリスクがある。未解決事項を「4 件」へ訂正しFR-5を列挙に追加することを推奨。
- NIT | FR-2 の受け入れ条件(d)『認可側の既存重複抑止と対称になること』は(a)-(c)で既に測定可能な Red/Green 基準が定義済みであり、(d)単体では検証可能な合否基準として曖昧(inception phase ガードレールの『曖昧な表現は測定可能な閾値と対にしない限り避ける』との整合がやや弱い)。application-design で具体的な述語へ言い換えることを推奨。
- NIT | FR-3 の本文は Minimal 深度の目安(3-6行)に対しCLI/sensorの矛盾の技術的経緯を含みやや長い。depth-budget センサーは bytes-per-FR budget に関して advisory でありgateはブロックしないため許容範囲内だが、簡潔性の観点では他FRより逸脱している。
