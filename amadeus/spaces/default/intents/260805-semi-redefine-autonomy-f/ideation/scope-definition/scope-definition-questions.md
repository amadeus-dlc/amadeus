# Scope Definition — 明確化質問

> **E-OC1 判定**: scope は intent birth 時にユーザー既決(self-feature — project.md Scope Overrides の canonical policy 準拠)。以下5問は Issue #2253(クロスレビュー済み)からの導出+full grant 下の agent recommendation として自動裁定し、unreviewed queue へ積んだ。
> 承認: full grant(intent-grant-4c55238ea3ee5a3fe97623cbe6ea19a7)による自動裁定、裁定記録 2026-08-05T05:15:00Z

## Q1. 価値を出す最小スコープは何か？

- A. semi の質問無人解決(4段)+ `--autonomy semi|full` 起動宣言 + 旧仕様ピンの改訂 — #2253 完了条件の (1)(2) 全数
- B. 起動フラグのみ
- C. semi 再定義のみ
- D. docs 改訂のみ
- X. Other

[Answer]: A — #2253「期待結果・完了条件」からの導出。B/C 単独は #2253 代替案1・2で非採用済み。decision: auto-decision-44755b9c39ef58588936a03c4a…(unreviewed)

## Q2. must-have と nice-to-have の境界は？

- A. must = #2253 完了条件全数(semi 4段解決・フラグ・落ちる実証・ピン改訂・statusline Autonomy 表示・実装面3点)。nice-to-have は置かない — 完了条件外は requirements 段の裁定事項3件として送付済み
- B. statusline は nice-to-have に落とす
- C. docs 改訂は nice-to-have
- D. 実装面(stop hook)は nice-to-have
- X. Other

[Answer]: A — #2253 はクロスレビュー反映で statusline を「射程に含める」と明記済み。B/C/D は完了条件との矛盾。decision: auto-decision-d39ab8ed65e9f82824f7ba080b…(unreviewed)

## Q3. capability 間の依存関係は？

- A. semi 認可基体の要件裁定(requirements 段) → semi 質問解決コア(intent-autonomy.ts + stop hook) → 起動フラグ(--autonomy) → 表示(statusline/--status)・docs/テストピン改訂。フラグは semi 再定義と独立に full 分のみ先行可能だが、semi 分は再定義着地に依存
- B. すべて独立
- C. フラグが先、semi 再定義が後
- D. docs が先
- X. Other

[Answer]: A — #2253 実装面の記述と裁定事項3件からの導出。decision: auto-decision-23469ae17aa9e4da40f2f69b88…(unreviewed)

## Q4. シーケンシング方針は？

- A. dependency-first(認可基体の裁定 → コア → 入口 → 表示/docs)。priority-vs-dependency 規範(依存の根元を最優先)に整合
- B. value-first(フラグを先に出す)
- C. risk-first(stop hook から)
- D. 並行一括
- X. Other

[Answer]: A — team.md priority-vs-dependency からの導出。decision: auto-decision-6b2337e427dd1af0942e878c1e…(unreviewed)

## Q5. ハード期限はあるか？

- A. なし — P2(通常)。ユーザー裁定にも期限言及なし
- B. 今週中
- C. 次リリースまで
- D. 他 intent に依存
- X. Other

[Answer]: A — #2253 優先度 P2 とユーザー発話(期限言及なし)からの導出。decision: auto-decision-81736361f2136611f52891a96a…(unreviewed)
