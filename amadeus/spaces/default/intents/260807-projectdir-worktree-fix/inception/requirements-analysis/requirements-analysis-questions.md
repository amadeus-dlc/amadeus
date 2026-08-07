# Requirements Analysis 質問記録

上流入力(consumes 全数): business-overview、architecture、code-structure

## 対話モード

- 選択: 自律モード full（intent-grant-cd4640053e8a2e0f8b0b8d9e97d10b29、HUMAN_TURN 2026-08-07T10:46:46Z で承認）— 質問は grant の decide-question（auto-decision 記録、後日レビュー可能）で確定
- 質問予算: 最大8問（Minimal depth）/ 起草4問（Issue #2352 クロスレビュー（reviewer-1/reviewer-2、ESTABLISHED_WITH_REFINEMENTS）が残置した真の未決のみ）
- 既決事項は質問化しない: 欠陥の実在・機序（ケース B/C+env の5ケース再現）・「規律0件」の反証・完了条件3が主で1・2が従 — いずれもクロスレビュー成立済み verdict と RE codekb（business-overview「worktree セッションの record 汚染」節、architecture「project-dir 解決の2梯子非対称」節、code-structure「呼び出し分布」節）で確定済み

## 質問と裁定

### Q1. 修正機構と段順位

完了条件3（実効中核）。resolveProjectDir() に worktree marker 段を追加するか、追加する場合 env 段（CLAUDE_PROJECT_DIR、:231）との相対順位をどうするか。hook 側は marker 付き payload cwd が env に勝つ（amadeus-lib.ts:317、根拠 doc-comment :306-309「env var is pinned to the launch directory … and does NOT follow a session into a git worktree」）。ケース C+env（cwd=worktree・env=main）は marker 段が env より下だと閉じない（RE 再現表）。

- A. hook 対称の marker 段を追加し、明示引数（段1）の直後・env より上に置く — cwd（または祖先）が workspace marker を持てばそれを採る。ケース B と C+env の両方が閉じ、hook との意味論対称が回復する
- B. marker 段を env より下（段2と段3の間）に追加 — ケース B のみ閉じ、C+env は開いたまま。env の既存優先を保存
- C. 梯子は触らず、解決結果と cwd marker の矛盾を検出する loud ガード（stderr 警告 + 非0 exit）のみ追加
- X. Other

[Answer]: A — auto-decision-4ef8fe283ffda4916c3b3e3174efd69c（basis: agent-recommendation、grant intent-grant-cd4640053e8a2e0f8b0b8d9e97d10b29、reviewState: unreviewed）。根拠: hook 側の既決根拠（:306-309 — env は launch dir に pin され worktree に追従しない）が CLI 側にも同一に成立し、A のみがケース B と C+env の両方を閉じて2梯子の意味論対称を回復する（cid:requirements-analysis:symmetric-pair-review）。C は誤解決を検出するだけで正しい解決を返さない。

### Q2. 完了条件1・2（allowlist・stage-protocol.md:511）の扱い

クロスレビューが完了条件1（出荷 settings の絶対形 allowlist）・2（skill 規律）を反証済み: allowlist はケース B の原因でなく（bun cwd fallback / env 段の実測）、規律は「不在」でなく stage-protocol.md:511 が絶対形を推奨して実在。Q1=A 採用なら絶対形起動でも marker 段が勝つため、両文書の誤誘導は実害を失う。

- A. 両文書とも本 intent のスコープ外とする — 機構修正（Q1）で実害が消えるため。requirements の Out of scope に反証根拠と「実害消滅」の条件付き根拠を明記し、文書改訂の要否は後続判断へ残す
- B. stage-protocol.md:511 に「bun ツール起動は `--project-dir` 明示が最も頑健」の1行を追記する最小改訂も含める
- C. allowlist を `${CLAUDE_PROJECT_DIR:-.}` フォールバック形へ改訂する（#1492 非対称の解消）も含める
- X. Other

[Answer]: A — auto-decision-b0f9b3d36ee0b09208b9a485ad5ba203（basis: agent-recommendation、reviewState: unreviewed）。根拠: Q1=A により絶対形起動でも marker 段が勝ち、両文書の誤誘導は実害を失う。self-fix の surgical 原則（P5）とグラントの scope-out 禁止に整合。レビューの :511 改訂要求は「相対形へ切替える修正」前提の指摘であり、marker 段修正では前提が変わる — Out of scope 節に反証根拠と条件を明記する。

### Q3. 回帰テストの形

完了条件4。既存テストは非対称（t202/t296 = hook 側のみ、t144 = CLI 側だが段1-4 pin のみでケース B 不在。t144 は dist を読むため build 前提）。

- A. in-process unit テストを新設（正本 amadeus-lib.ts を直 import、ケース A/B/C/C+env を fixture で固定 — t202 と対称・build 非依存・lcov 有効）し、t144 は新段順の pin へ更新する
- B. t144 の拡張のみ（dist 経由・build 前提のまま）
- C. 新設 unit テストのみ（t144 は触らない）
- X. Other

[Answer]: A — auto-decision-2266c8c1a6e1007df30186683914c58a（basis: agent-recommendation、reviewState: unreviewed）。根拠: TDD 既定（Red 実測は in-process seam が最短・lcov 有効・build 非依存、t202 が hook 側の既習形）に加え、t144 は段1-4 を pin しているため段順変更で更新必須（fixture-propagation-grep）。B 単独は build 前提で unit 層の決定的 Red を作れず、C 単独は t144 の旧段 pin が偽赤になる。

### Q4. 副次是正の同梱範囲

同根棚卸し（cid:code-generation:same-root-inventory）で検出済みの副次欠陥のうち、本 intent（self-fix・Minimal）に含める範囲。

- A. stale comment（amadeus-lib.ts:6673 — `AMADEUS_PROJECT_DIR` と誤記、実装は `CLAUDE_PROJECT_DIR`）の1行 reword のみ同梱。#1492 allowlist 非対称・fresh worktree marker 不成立時の loud 化は Out of scope（根拠明記）
- B. 副次是正は一切同梱しない（純粋に機構+テストのみ）
- C. #1492 allowlist フォールバック化まで同梱
- X. Other

[Answer]: A — auto-decision-54ea96449ade5765a0365f91094c9334（basis: agent-recommendation、reviewState: unreviewed）。根拠: :6673 の stale comment は同一ファイル1行 reword・交差ゼロで same-root-inventory の同一 PR 修正条件を満たす。#1492 は挙動面が bun fallback 依存で独立のリスク評価が要るため Out of scope とし issue-first-capture で扱う。

## 完全性確認

- 空の回答タグ: なし（4問すべて auto-decision 記録付きで確定）
- 未解決の Requirements 判断: なし

## 裁定の記録

- 経路: intent autonomy full（stage-protocol §「question under full」の decide-question 正規経路、cid:requirements-analysis:c1-pcp-autonomy-grant-question-boundary）
- grant: intent-grant-cd4640053e8a2e0f8b0b8d9e97d10b29 — full グラント承認: 2026-08-07T10:46:46Z（実 HUMAN_TURN、set-autonomy INTENT_AUTONOMY_TRANSACTION_COMMITTED）
- Q1 = auto-decision-4ef8fe283ffda4916c3b3e3174efd69c / Q2 = auto-decision-b0f9b3d36ee0b09208b9a485ad5ba203 / Q3 = auto-decision-2266c8c1a6e1007df30186683914c58a / Q4 = auto-decision-54ea96449ade5765a0365f91094c9334（いずれも reviewState: unreviewed — list-auto-decisions / review-auto-decision で後日人間レビュー可能）
- **Q1 の段順位は E-PWF-CGDEV2（2026-08-07、2-0 established）で改訂**: marker 段は env の**下**（explicit → env → cwd-marker → script-path → cwd-harness）。改訂理由 = (a) env より上の実装が既存テストの env 隔離 seam を破り実 record 汚染インシデントを起こした実測 (b) 当初前提「hook は marker が env に勝つ」の誤り（hook の process.cwd() marker 段は env の下 — env より上は payload cwd のみ）。詳細は requirements.md FR-1 改訂節と elections/260807-e-pwf-cgdev2/record.md
