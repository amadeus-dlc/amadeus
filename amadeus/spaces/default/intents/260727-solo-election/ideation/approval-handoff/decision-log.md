# Decision Log — solo-election

上流入力(consumes 全数): intent-statement.md(Q1-Q6 裁定の正本)、scope-document.md(MoSCoW 確定)、feasibility-assessment.md(GO)、constraint-register.md(C-01〜C-07)、intent-backlog.md(繰り越し)。

## 裁定一覧

| ID | 出所 | 事項 | 裁定 | 日時(UTC) |
|---|---|---|---|---|
| D-01 | 承認系譜(前提) | ソロ選挙の取り込み・輸送抽象・VoterKind | D-12(260718-election-ts-foundation)を残余実装として継承 | 2026-07-19T01:35:00Z |
| D-02 | intent-capture Q1 | 発動条件 | D: 設計逸脱・ブロッカー・§13 選定は自動+明示発動併用 | 2026-07-27T13:26:04Z |
| D-03 | intent-capture Q2 | 定足数 | X: 2体固定(偶数設計の保存 — スプリット→人間裁定) | 2026-07-27T13:26:04Z |
| D-04 | intent-capture Q3 | 裁定効力 | A: 2-0 即採用・続行(record 固定・事後追跡) | 2026-07-27T13:26:04Z |
| D-05 | intent-capture Q4 | walking skeleton | A: 実選挙1件 e2e 完走+両分岐実証 | 2026-07-27T13:26:04Z |
| D-06 | intent-capture Q5 | スコープ | A: 実装+ノルム同梱。supervise/推奨自動選択/grant 変更は除外 | 2026-07-27T13:26:04Z |
| D-07 | intent-capture Q6 | GoA 2体適用表 | 採用(5×1票→議論、棄権→単票成立不能、賛成1反対1→スプリット等) | 2026-07-27T13:26:04Z |
| D-08 | feasibility | 実現可能性 | GO — tally voters-aware 化を実装スコープに追加確定 | 2026-07-27T13:34:41Z |
| D-09 | scope-definition | MoSCoW | Must 7 / Should 1 / Could 1 / Won't 5 で確定 | 2026-07-27T13:43:23Z |
| D-10 | §13(intent-capture) | 学習 persist | c2(偶数定足数原理)を project.md へ。feasibility/scope は0件見送り | 2026-07-27T13:29:00Z |

## 未決事項(Inception へ送る)

- 追加議論再投票の subagent は resume か新規 spawn か(R-05)
- subagent 投票者の識別子規約・spawn 不能ハーネスの降格告知様式
