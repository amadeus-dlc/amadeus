# Scope Definition 質問ファイル — 260720-upstream-sync-230

上流入力(consumes 全数): intent-statement(`../intent-capture/intent-statement.md`)、feasibility-assessment(`../feasibility/feasibility-assessment.md`)、constraint-register(`../feasibility/constraint-register.md` — 各問の既決根拠の導出元)

## E-OC1 選挙不要判定

- 判定: 本ファイルの全5問は選挙不要(既決適用)と判定する。根拠種別(1問1行):
  - Q1: 既決 — 承認済み計画(ledger 8/8 APPROVED)の 24 ADOPT/ADAPT がスコープを確定
  - Q2: 既決 — 計画のディスポジション承認が MoSCoW を確定(SKIP 6件+deferred 面は Out)
  - Q3: 既決 — 計画 D1/D2/D6 の依存宣言+feasibility RAID の Dependencies D1-D3
  - Q4: 既決 — dependency+risk-first(scope-definition:c3 前例、schema root 先行)
  - Q5: user decision — 期限なし、ideation 完了で park(本セッションのユーザー指示)
- 申告: e5 → leader 2026-07-20T05:13Z 頃(agmsg)
- 承認: leader 承認 2026-07-20T05:13:12Z(agmsg タイムスタンプ、出典 agmsg — agmsg-git-evidence-split 準拠)

> [Answer] 記入は leader 承認後に実施(no-election-judgment-gate 3段順序遵守)。

## Q1: 価値を生む最小のスコープは何か?

- A. 承認済み計画の 24 ADOPT/ADAPT 項目全体が確定スコープ(intent-statement の Success Metrics と1:1)。その中の最小価値スライスはエンジン正しさ修正6項目(実測済み欠陥の封鎖)
- B. プラグイン機構のみ
- C. ハーネス修正のみ
- D. docs のみ
- E. 未定
- X. その他(自由記述)

[Answer]: A(選挙不要判定・leader 承認 2026-07-20T05:13:12Z — 既決適用)

## Q2: Must-have と Nice-to-have の区分は?

- A. 24 ADOPT/ADAPT すべて Must(計画承認済みのディスポジションが区分の正本)。Out: SKIP 6件(同等実装済み3+生成物/フォーク固有3)、upstream の deferred プラグイン面、pre-2.2.0 同等性認証
- B. プラグインだけ Must
- C. 全項目 Nice-to-have
- D. 区分不能
- E. Must を再選定したい
- X. その他(自由記述)

[Answer]: A(選挙不要判定・leader 承認 2026-07-20T05:13:12Z — 既決適用)

## Q3: ケイパビリティ間の依存関係は?

- A. stage-schema-extensions が root(unit-kind-pruning と共有)→ packager-plugin-projection → plugin-compose-hook → test-pro/plugin-docs。bolt-dag-selfheal → swarm-batch-advance 検証。tests/docs は各採用項目に従属(feasibility RAID Dependencies D1-D3 の転記)
- B. 依存なし(全並行可)
- C. 逆順(plugin が先)
- D. 不明
- E. 再分析が必要
- X. その他(自由記述)

[Answer]: A(選挙不要判定・leader 承認 2026-07-20T05:13:12Z — 既決適用)

## Q4: 順序の選好は(risk-first / value-first / dependency-first)?

- A. dependency-first を骨格に risk-first を併用 — schema root(D6/D2 共有面)と検証先行4項目(MEDIUM confidence)を前段に置き、未証明の基盤に依存する価値面を先行着地させない(scope-definition:c3 前例)
- B. value-first(プラグインから)
- C. 純 risk-first
- D. 順不同
- E. 未定
- X. その他(自由記述)

[Answer]: A(選挙不要判定・leader 承認 2026-07-20T05:13:12Z — 既決適用)

## Q5: 特定ケイパビリティに紐づくハードデッドラインはあるか?

- A. なし。ideation 完了で park し、実装時期はユーザーの再開承認に従属(固定期限なし)
- B. 四半期末まで
- C. upstream の次リリースまで
- D. 今週中
- E. 不明
- X. その他(自由記述)

[Answer]: A(選挙不要判定・leader 承認 2026-07-20T05:13:12Z — 既決適用)
