# Units of Work — intent 260815-rfc-autonomy-modes

> 分割原理: (a) 独立に実装・出荷可能(片側だけで価値が出ない境界は統合済み) (b) source と test の ownership を同じ境界に揃える (c) 見積は数値(行数差分)。設計出典: application-design(C1〜C13、ADR-1〜11)。

| Unit | 含む設計 | 対応 FR | 主要 owned files(source) | 見積 |
|---|---|---|---|---|
| U1 recommendation-core | C1 + C2(梯子・ゲート実配線) | FR-1、FR-4(梯子縮退除去・AUTO_DECIDED 条件) | **新規** `amadeus-recommendation.ts`、`amadeus-bolt.ts`(decide-question 区画)、`amadeus-intent-autonomy.ts` / `-production.ts`(導出各段) | ~370 行 |
| U2 presence-detection | C3 | FR-2 | `amadeus-intent-autonomy.ts`(実効判定の読み口新設)、`amadeus-presence-reservation.ts`(再利用 — 変更最小) | ~60 行 |
| U3 waiting-interruption | C4(park guard 廃棄 + waiting + 3 終端 + rate) | FR-3(+ Q7/Q8/Q14 裁定) | `amadeus-state.ts`、`amadeus-orchestrate.ts`(directive)、`knowledge/amadeus-shared/audit-format.md` + event-registry | ~350 行 |
| U4 interactive-carveout | ADR-5(Stop hook 対話分岐) | FR-4(対話 arm、Q11) | `hooks/amadeus-stop.ts` | ~120 行 |
| U5 semi-authority-projection | C5 + C6 | FR-5、FR-6、FR-10 | `amadeus-intent-autonomy.ts`(SEMI/allowsOccurrence/WS)、`amadeus-intent-autonomy-production.ts`(投影)、`amadeus-orchestrate.ts`(読取)、`amadeus-advisory-choice.ts` | ~280 行 |
| U6 presence-closure | C13 | FR-12 | `amadeus-bolt.ts`(approve-batch 区画)、`amadeus-lib.ts`(gate presence 判定) | ~100 行 |
| U7 config-visibility | C7 + C8 | FR-7、FR-8 | `amadeus-config.ts`、`--status` ハンドラ、statusline hook、**旧キー消費者 2 箇所**(`amadeus-election.ts:274` / `amadeus-orchestrate.ts:4139` — trigger.mode 直接参照。キー廃止と同一変更で `deriveSoloElectionTrigger(mode)` へ差し替え。実測: fd-draft-c 報告 + conductor 再実測) | ~230 行 |
| U8 completion-report | C9 | ADR-3(full の検収レポート) | 完了境界(complete-workflow 経路)、`amadeus-bolt.ts`(list-auto-decisions 消費) | ~120 行 |
| U9 s13-zero | C10 | FR-11 | `amadeus-learnings.ts` | ~100 行 |
| U10 merge-provenance | C11 | FR-9 | record/audit 記録面(core 側) | ~60 行 |
| U11 grant-ceremony | C12 | ADR-7(印字改善 + 相互必須不変量の落ちる実証) | `amadeus-bolt.ts`(preview-autonomy 区画) | ~60 行 |
| U12 docs-norms | FR-14 | FR-14(+ 各裁定の文書反映) | `stage-protocol.md`、memory 3 レイヤー、RFC frontmatter(tracking-issue #3116) | ~150 行 |
| U13 d6-investigation | FR-13(ADR-11) | FR-13 | record 内調査文書のみ(コード変更なし — 欠陥発見時は別 Issue 起票) | 調査 |

- **テスト ownership**: 各 Unit が自 FR の落ちる実証テストを所有(t-番号は起票時採番)。mode 別マトリクス(FR-5)と 3 終端遷移表(ADR-4)は U5/U3 が所有し、ADR-9 の contested-0 件 fixture 群は U1 が基盤・U3/U4 が経路側を追加。
- **C9〜C12 の分割**(§12a iteration-1 BLOCKER の是正): 4 者は変更理由が独立で単独出荷可能(設計の「独立小物・並行可」)のため 1 unit へ束ねず U8〜U11 に分割。`amadeus-bolt.ts` の共有(U8/U11 と U1/U6)は依存でなく直列化制約として dependency 文書に記録。
- **共有ファイルの直列化**: `amadeus-bolt.ts`(U1/U6/U8/U11)、`amadeus-intent-autonomy.ts`(U1/U2/U5)、`amadeus-orchestrate.ts`(U3/U5)は delivery-planning で直列 Bolt 化する(並行不可)。
- **code-generation への明示申し送り**(ADR-11): basisFingerprint は導出過程の正規形 digest(空白・順序の自明摂動で変わらない正規化)で算出すること。
- **§12a iteration-2 FOLLOW-UP の引受**: services.md の C13 補記と依存行列への C13 行列追加は U6 実装時の設計文書同期で行う。component-inventory G25-G27 の照合は U6 の実装前実測に含める。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T16:45:29Z
- **Iteration:** 1
- **Scope decision:** none

C1-C13/FR coverage complete, but the dependency artifact declared a critical path (stage-contract violation), omitted real U7/U6 edges, and U8 bundled four independent components without justification.

### Findings

- BLOCKER | unit-of-work-dependency.md | クリティカルパス/実装順の宣言 — 2.7 は経済的シーケンシング(2.8)を先取りしてはならない(stage 契約違反)
- BLOCKER | unit-of-work-dependency.md U7 | config-visibility の実依存(statusAutonomyFacet が C3/C5/C6 実効値関数を消費)が depends_on から欠落
- BLOCKER | unit-of-work-dependency.md U6 | presence-closure の設計上の同一 interaction 面制約(C5+C6+C13 同段直列)が DAG に不在
- BLOCKER | unit-of-work.md U8 | C9+C10+C11+C12(独立変更理由 4 件)の無根拠バンドル — 分割原理と自己矛盾

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T16:45:29Z
- **Iteration:** 2
- **Scope decision:** none

All 4 iteration-1 BLOCKERs resolved (no ordering language, U7/U6 edges wired, U8 split into 4 justified units); 13/13 units and 15/15 FRs covered with an acyclic yaml DAG.

### Findings

- FOLLOW-UP | unit-of-work-dependency.md | C5→C7 行列セルを blocking 化しない理由の明記(→ conductor が disposition 3 件を追記済み)
- FOLLOW-UP | unit-of-work-dependency.md | C2→C3 / C10→C1 セルの disposition 明記(→ 同上、非 blocking 判定を明文化済み)
- NIT | unit-of-work.md | 『§12a iteration-2 FOLLOW-UP の引受』は application-design 側レビューへの参照 — 非自己参照であることを確認済み(記録のみ)
