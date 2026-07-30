# Requirements — 260730-open-bug-batch-2(#1750 / #1749 / #1742 / #1735 / #1734)

上流入力(consumes 全数): business-overview.md、architecture.md、code-structure.md — 5バグの機構事実(file:line)と修正候補は architecture.md 現在節、患部配置(#1749 の15面表・#1742 の hook/manifest 配置)は code-structure.md 現在節、利用者影響と Bolt 境界は business-overview.md 現在節から導出。測定 ref: observed `c42ef4d77`。

## Intent 分析

open bug 5件を 1 Issue = 1 Bolt = 1 PR で修正する。編成(RE 裁定+ユーザー提供情報): **#1742 は既存 PR #1758 の収束(レビュー・CI・承認マージ)へ引き取り、再実装しない**。**#1750 は #1758 と `amadeus-orchestrate.ts` で交差するため #1758 着地後に直列化**。#1749 / #1734 / #1735 は非交差で並行可。追補(ユーザー裁定): **#1769 を Bolt 0 として先行修正**(#1758 着地済みを確認のうえ着手)— 以降の Bolt が手動解決なしで進むための前提修正。

## FR-1769: 複数 Bolt degrade の unit 解決(Bolt 0 — スコープ追加、ユーザー承認 2026-07-30T16:09:22Z)

承認系譜: #1769 は Construction 進入時の事前検知で起票(B&T §13 追補の退行条項の執行)。ユーザー AskUserQuestion 裁定(2026-07-30T16:09:22Z)により本 intent の Bolt 0 として追加(5→6 Issue)。PR #1758 着地後に着手(orchestrate 交差の直列制約)。

- **FR-1769a**: degrade 経路の unit 解決(unitDirsUnderConstruction 消費側)を「実在 unit が複数でも、**当該ステージの produces が未充足(uncovered)の unit がちょうど1つならそれへ解決**」に拡張する。uncovered が 0 件(全 unit 充足)または複数件のときのみ fail-closed(既存 FR-2b 意味論の精密化 — 0件 dir /複数 uncovered の fail-closed は不変)。
- **FR-1769b**: fail-closed メッセージの「Keep exactly one unit directory」を実行可能な指示(uncovered unit の特定方法)へ改訂。
- **FR-1769c**(regression): 複数 unit dir の fixture で (i) uncovered 1件 → 当該 unit へ解決 (ii) 全充足/複数 uncovered → fail-closed、の両側を固定(落ちる実証必須)。t367/t186 の既存契約と整合(単一 dir の挙動は不変)。

## FR-1750: intent 誕生 boundary の新設(裁定 A、ユーザー承認 2026-07-30T15:49:17Z)

- **FR-1750a**: mirror boundary 種別に第5種 `intent-initialized` を追加する(amadeus-mirror-lifecycle.ts parseBoundaryArgs :646-658 と MirrorBoundary 型)。`auto-mirror: auto` の intent では、birth 後最初の `next` で「初回 create 未実施」を評価し、create 操作を発火する(engine 側挿入点: emitMirrorBoundaryIfNeeded :452-500 / persistedMirrorBoundary :340-356)。
- **FR-1750b**: receipt は既存 phase 3値列挙(amadeus-state.ts:221-229)と**別軸**で永続化し、冪等な再試行(部分失敗後の重複 create なし — 既存 provenance.createIdentity と整合)を保つ。注: 「別軸フィールド」の具体形は codekb architecture.md が仮説(未検証)と明記する未確定点であり、CG 設計時に receipt スキーマ実測のうえ確定する(決定済み事項として扱わない)。
- **FR-1750c**(契約変更の申告): boundary 発行契約をピンする t265 系(integration/unit/e2e)・t282・t361 等の期待値改訂は「仕様裁定 Q1=A に基づく契約変更」として申告する。既存の intent-capture boundary・phase boundary の挙動は不変(intent-capture EXECUTE スコープでは二重 create にならないこと — createIdentity 冪等で担保 — をテストで固定)。
- **FR-1750d**(regression): Ideation SKIP スコープ(self-fix 等)の fixture で「最初の業務ステージ開始前に create が発火する」ことと、`auto-mirror` 未設定/off では発火しないことの両側をテストで固定(落ちる実証必須)。

## FR-1749: phase-check 成果物名の正準化

- **FR-1749a**: 正本 `packages/framework/core/amadeus-common/protocols/stage-protocol-governance.md:22` の `[phase-boundary]-verification.md` を正準名 `phase-check-<phase>.md`(エンジン契約 amadeus-state.ts:330-336)へ是正し、dist 7面+self-install 5面は再生成で同期(手編集禁止)。
- **FR-1749b**: docs 2ファイル(docs/reference/04-stage-protocol.md:966、同 .ja.md:817)を日英同期で是正。
- **FR-1749c**(regression): 3 phase の正準名と protocol/docs 文言の整合を検査する drift テストを新設(誤記語彙 `[phase-boundary]-verification` の tracked 残存 0 を、記録面 — memory/project.md の既決 cid とintent record 履歴 — を除外スコープで検査。c1-ac-grep-surface-scope 準拠。落ちる実証必須)。

## FR-1742: PR #1758 の収束(引き取り)

- **FR-1742a**: PR #1758(produces 限定発火+invocation scope 原子保存+codekb 対象化)を収束させる — 未解決レビュースレッド対応・CI green・マージ承認伺い・着地確認後の #1742 クローズ確認。再実装はしない。
- **FR-1742b**: 収束レビューでは Issue #1742 の受入条件(t94:304 系・t95 11箇所の期待値更新、recursion/pre-init guard・linter/type-check 対象の非回帰、resume/--single での解決結果非再利用)との突き合わせを行う。

## FR-1735: auto-solo 発動のハーネス中立化

- **FR-1735a**: stage-protocol.md §13(packages/framework/core/amadeus-common/protocols/stage-protocol.md:960-1014)へ auto-solo フックを焼き込む — 手順3〜5の間に「階層 config で `auto-solo-election: true` が解決されるソロモードでは、候補選定を `amadeus-election.ts open --trigger auto-solo` の選挙にかける。`{"opened":null,"reason":"auto-solo-election-disabled"}` はユーザー裁定へ切替」を明文化。protocol は全ハーネスへ機械投影されるため codex 固有追記は不要(config 未設定環境では従来どおり不発動 = stock 利用者への挙動変更なし)。
- **FR-1735b**: ブロッカー類型の発動 1 行は stage-protocol.md §1「Halt-and-ask on failure」節(:129-139)へ、設計逸脱類型は conductor persona の逸脱停止記述(deviation-stop の実挿入先は CG 設計時に conductor_persona 正本を実測して確定)へ置く(team.md 既決ノルム auto-solo 3類型の機械化であり新規判断ではない。挿入先の当初引用「§12」は誤りだったため実測節名へ是正済み)。
- **FR-1735c**(検証 — 実質基準必須): 受け入れ基準は2層とも**必須**とする — (i) protocol 文言の決定的 drift テスト(§13 節に auto-solo フック文言が存在する。落ちる実証必須) (ii) codex live e2e(既存 t-exec-codex 系の実行機構で「§13 到達時に `open --trigger auto-solo` が実行される」ことを実測固定。SDK 不在環境では既存 e2e 同様の SKIP ガードで扱う — SKIP は環境ガードであり基準の免除ではない)。(ii) が実装時に構造的に不能と判明した場合は、無申告の followup 切り出しをせず、CG の逸脱停止(deviation-stop)としてユーザー裁定を得る(exemption-clause-must-not-substitute: 免責は実質基準を代替しない)。

## FR-1734: promote:self scope-grid の write⇔check 対称化

- **FR-1734a**: mergeScopeGrid(scripts/promote-self.ts:147-159)の出力をキー名ソートの正準順で直列化する(冪等)。
- **FR-1734b**: scopeGridInSync(:130-144)を「apply が書くであろうバイト列との一致」検査へ対称化する(mergeScopeGrid(got, want) の出力と got の比較)。
- **FR-1734c**(regression): extras が dist キーより前に並ぶ fixture(churn の決定的再現条件 — Issue の base c48877451 相当)で、(i) 修正前は apply が 144 行級 churn を生み check が素通しする (ii) 修正後は apply 冪等かつ check が順序差を検出する、の両側を固定(落ちる実証必須)。Issue 本文の「削除される」は移動 diff の誤読であることを PR 本文で訂正明記。

## NFR / 制約

- **N-1**(surgical): 各 Bolt は当該患部+テストに限定。#1734 の書込正準化で生じる self-install grid の一回性の並べ替えは正準化の意図された結果として PR 本文に明記。
- **N-2**: core/scripts 変更 Bolt は dist 7ハーネス+self-install 同期を同一 PR 内で完結(bt-dist-regen-seven-harnesses)。
- **N-3**: PR/CI 基準は typecheck / lint / dist:check / promote:self:check / 関連テスト+push 前 lcov 未カバー 0。orchestrate を触る #1750 は allowlist 行ピンの機械 remap+直読照合(c1-allowlist-mechanical-remap)。
- **N-4**(直列化): #1750 の着手は PR #1758 の main 着地後(orchestrate 交差)。着地後は base-advance-regrounding に従い再接地。

## 前提

- #1758 は別セッションが駆動中(12 pass / 3 pending・未解決スレッド 0 を実測)。二重運転しない — 収束の最終確認とマージ伺いのみ本 intent が行う。
- #1734 は HEAD で churn 非再現(実測)— regression fixture は歴史断面(c48877451 相当の extras 先頭配置)を再構成して作る。

## Out of scope

- #1742 の再実装・#1758 への機能追加。
- mirror の phase boundary 意味論(inception/construction/completion)の変更 — #1750 は初回 create の追加のみ。
- 選挙 CLI 本体の変更(#1735 は発動文言の焼き込みのみ)。

## Open questions(後続へ)

- FR-1750 の boundary 評価を「birth 直後の next」のどの分岐に置くか(hasPersistedMirrorBoundary :458-465 の第4真値条件 vs 専用早期評価)— CG 設計時に emitMirrorBoundaryIfNeeded の呼び出し文脈を実測して確定。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-30T15:55:06Z
- **Iteration:** 1
- **Scope decision:** none

file:line 引用や既決裁定の転記は概ね正確だが、FR-1735 に2件の Major な欠落がある(検証免責の実質代替リスクと、挿入節の誤引用)。

### Findings

- Major: requirements.md:31 FR-1735c — 「live e2e が同一 Bolt で困難な場合は理由付きで followup Issue に切り出す」は、bt-no-silent-scope-narrowing(project.md)と exemption-clause-must-not-substitute(project.md)が名指しする典型パターン(免責が実質基準を代替する抜け道)そのもの。Issue #1735 自身の一次証拠は『SKILL.md への言及だけでは LLM が読みに行かず、明示的にルールを参照させて初めて open --trigger auto-solo を実行した』(scratch 実測)であり、stage-protocol.md への焼き込みが実際に codex で選挙を発火させるかは protocol.md drift テストだけでは確認できない。現状の書き方は『followup へ切り出す』ことを実装前から容認しており、両 cid が禁じる『未検証と明記することによる先送りの正当化』になっている。最低限、(i) 同一 Bolt 内で1回は実機(または scratch 相当)の live 試行を実施し可否を実測した上で followup 判断を下す、(ii) followup へ切り出す場合も具体的な検証計画(何を・いつ・どの Bolt で)を Issue 本文に明記する、のいずれかを FR に追記すべき。
- Major: requirements.md:30 FR-1735b — 『設計逸脱・ブロッカー類型の発動1行も §12/該当節へ同様に置く』の§12は stage-protocol.md:888『Phase Boundary Verification』であり、auto-solo/選挙トリガーとは無関係(実測: grep '^## [0-9]' で確認した13節見出しの中に、設計逸脱・ブロッカーの選挙発動を扱う節は存在しない — §6 Error Recovery は stage-protocol-recovery.md への参照のみ)。FR-1735a は §13(Learnings Ritual、:960-1014)という精密な挿入点を示すのに対し、FR-1735b は残り2/3のトリガー種別(設計逸脱・ブロッカー)の挿入点が『§12/該当節』という誤った参照+未解決のプレースホルダのままで、Issue #1735 が症状として挙げる『3類型のうち何が実装されるか』が実質2/3で未確定。CG 着手前に正しい挿入節(または新設セクション)を requirements/open questions で確定させる必要がある。
- Minor: requirements.md:9 と architecture.md:26 は receipt スキーマ変更を『別軸のフィールド』とだけ記述し、architecture.md 自身が同箇所を『仮説 — 未検証』と明記している。この未確定を requirements 側にも一言(N-1 相当のフラグ)として転記すると、FR-1750b の受け入れ基準の期待値が実装時に自明でなくなるリスクを減らせる(必須ではない)。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-30T15:57:10Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の Major×2・Minor×1 いずれも実測どおり閉包(§1:129-139 Halt-and-ask on failure 実在確認、FR-1735c の免責代替リスク解消、FR-1750b の仮説フラグ転記確認)、新規の誤りなし。

### Findings

- None
