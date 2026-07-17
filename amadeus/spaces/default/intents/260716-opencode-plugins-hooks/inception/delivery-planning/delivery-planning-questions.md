# Delivery Planning Questions — opencode-plugins-hooks(Issue #1049)

> 上流入力(consumes 全数): `../requirements-analysis/requirements.md`(FR-1〜5)、`../application-design/components.md`(C1〜C5)、`../units-generation/unit-of-work.md`(U1 単一 unit・Bolt 1=U1 1:1)、`../units-generation/unit-of-work-dependency.md`(エッジなし DAG)、`../units-generation/unit-of-work-story-map.md`(FR→U1 全数写像)、`../practices-discovery/team-practices.md`(live 温存)。stories/mockups は非実行(amadeus スコープ)。2026-07-17。

## 選挙不要判定(E-OC1 — 判定申告→leader 承認→記入の3段)

**判定**: 全11問(戦略 Q1〜Q6 の6問+Per-Bolt B1-1〜B1-5 の5問)選挙不要(既決導出)。根拠種別(1問1行):

- Q1: 上流既決 — unit-of-work.md「Bolt 1 = U1(1:1)」で順序決定の対象が存在しない(単一 Bolt)
- Q2: 上流既決 — 単一 Bolt につき WSJF スコアリングの比較対象なし(N/A)
- Q3: 上流既決 — unit-of-work.md「分割しない判断の根拠」で粒度確定済み(1 Unit = 1 Bolt)
- Q4: ノルム既決 — 単一 Bolt につき並行実行の対象なし(team.md parallel-bolts は複数 Bolt 時の上限規定)
- Q5: 上流既決 — requirements AC-1c で外部一次ソース(@opencode-ai/plugin)の in-tree 再実測を「実装時確定条件」として固定済み。外部チーム・承認リードタイム型のゲート項目なし
- Q6: 上流既決 — component-dependency.md の C3(工程0 実測)先行直列で最大リスク(写像可否の不確実性)の最先頭配置が確定済み
- B1-1: 上流既決 — unit-of-work.md「Bolt 対応: Bolt 1 = U1(1:1)」で確定済み
- B1-2: ノルム既決 — org.md Walking Skeleton 節の greenfield スコープ列挙に amadeus は含まれず、インクリメンタル作業はセレモニースキップが既定
- B1-3: 上流既決 — U1 検証列(unit-of-work.md)+requirements 横断節(deslop・PR 1:1・closing keyword)の機械合成
- B1-4: 上流既決 — requirements AC-2c(advisory 徹底)・AC-3c(phantom HUMAN_TURN 防止)・AC-5b(配線0の充足)の機械合成
- B1-5: ノルム既決 — team.md c2(worktree 隔離)・independent-review-on-pr・leader-dispatch-authority の執行

**leader 承認**: 2026-07-16T23:31:34Z(agmsg、leader → e3「E-OC1 承認 — delivery-planning(1049)」— 全問既決導出判定を承認。申告送信は 23:29Z 頃、agmsg-git-evidence-split 準拠で agmsg 出典を明示)

## 戦略質問

### Q1: シーケンシング・ヒューリスティック(risk-first / value-first / walking-skeleton-first / hybrid)

- 推奨: N/A(単一 Bolt — 順序選択なし)。Bolt 内は工程0(実測)先行の risk-first 構造(既決)
- [Answer]: N/A(単一 Bolt — 順序選択なし)。Bolt 内は工程0 実測先行の risk-first 構造(既決導出、E-OC1 承認 23:31:34Z)

### Q2: WSJF スコアリングモデルの採用有無

- 推奨: 不採用(単一 Bolt につき比較対象なし)
- [Answer]: 不採用(単一 Bolt につき比較対象なし)(既決導出、同上)

### Q3: Bolt 粒度(1 Unit/Bolt・バンドル・薄切り)

- 推奨: 1 Unit = 1 Bolt(unit-of-work.md 既決)
- [Answer]: 1 Unit = 1 Bolt(unit-of-work.md 既決)(既決導出、同上)

### Q4: Bolt の並行実行可否

- 推奨: N/A(単一 Bolt)。形式上は直列
- [Answer]: N/A(単一 Bolt)。形式上は直列(既決導出、同上)

### Q5: 外部依存(API・データ・承認・外部チーム)

- 推奨: ゲート型外部依存なし。@opencode-ai/plugin 一次ソースの in-tree 再実測は Bolt 1 内の実装時確定条件(AC-1c 既決)であり外部ハンドオフではない
- [Answer]: ゲート型外部依存なし。@opencode-ai/plugin 一次ソースの in-tree 再実測は Bolt 1 内の実装時確定条件(AC-1c 既決)(既決導出、同上)

### Q6: 最優先で倒すべきリスク項目

- 推奨: 写像可否の不確実性(chat.message→mint-presence の phantom HUMAN_TURN リスク AC-3c 含む)— 工程0 実測を Bolt 1 冒頭に配置済み(既決)
- [Answer]: 写像可否の不確実性(phantom HUMAN_TURN リスク AC-3c 含む)— 工程0 実測を Bolt 1 冒頭に配置(既決導出、同上)

## Per-Bolt 質問(Bolt 1 = U1)

### B1-1: バンドルする Unit

- 推奨: U1(opencode-plugin-adapter)のみ
- [Answer]: U1(opencode-plugin-adapter)のみ(既決導出、同上)

### B1-2: walking skeleton か

- 推奨: No — 既存コードベースへのインクリメンタル追加(既存 dist/opencode 配布経路へ embedded、org.md の skeleton セレモニーは greenfield スコープ対象)。単一 Bolt につき後続 Bolt のゲート判断も発生しない
- [Answer]: No — インクリメンタル追加につき skeleton セレモニー対象外(既決導出、同上)

### B1-3: Definition of Done

- 推奨: 検証列全 green(typecheck / lint / dist:check / promote:self:check / --ci / patch gate、exit code 記録)+落ちる実証(実行時消費行)+写像表3値充足+PR 発行(Fixes #1049)・レビュー READY
- [Answer]: 検証列全 green(typecheck / lint / dist:check / promote:self:check / --ci / patch gate、exit code 記録)+落ちる実証(実行時消費行)+写像表3値充足+PR 発行(Fixes #1049)・レビュー READY(既決導出、同上)

### B1-4: confidence hypothesis(出荷が証明すること)

- 推奨: 「opencode plugins フックから core hooks への配線が、実測写像表に基づき advisory 契約(非ブロッキング・phantom HUMAN_TURN なし)で機能する」— 配線0件に終わった場合も「根拠付き未対応の確定」で Issue スコープ(1)(3)(4)充足(AC-5b)
- [Answer]: 「opencode plugins フックから core hooks への配線が、実測写像表に基づき advisory 契約(非ブロッキング・phantom HUMAN_TURN なし)で機能する」— 配線0件でも根拠付き未対応確定で Issue スコープ(1)(3)(4)充足(AC-5b)(既決導出、同上)

### B1-5: 担当 mob

- 推奨: 単一 builder(worktree 隔離 c2、leader ディスパッチ)+実装者以外のレビュアー
- [Answer]: 単一 builder(worktree 隔離 c2、leader ディスパッチ)+実装者以外のレビュアー(既決導出、同上)
