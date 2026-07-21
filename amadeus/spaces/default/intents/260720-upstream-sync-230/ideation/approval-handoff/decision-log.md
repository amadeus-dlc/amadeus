# Decision Log — upstream-sync-230(Ideation 中の全決定)

上流入力(consumes 全数): intent-statement(`../intent-capture/intent-statement.md`)、scope-document(`../scope-definition/scope-document.md`)、intent-backlog(`../scope-definition/intent-backlog.md`)、feasibility-assessment(`../feasibility/feasibility-assessment.md`)、constraint-register(`../feasibility/constraint-register.md`)

## 決定一覧

| # | 決定 | 決定者 | 時刻(UTC) | 出典 |
|---|---|---|---|---|
| 1 | 比較ペア確定: baseline v2.2.0(eae912e0…)→ target v2.3.0(29a31f78…) | ユーザー | 2026-07-20 分析セッション | upstream-sync スキル実行(git 検証可能: ledger) |
| 2 | 8ドメイン・30項目の分類承認(24 ADOPT/ADAPT / 6 SKIP) | ユーザー | 2026-07-20T04:48:20Z | ledger.json domains[].approved_at |
| 3 | 追従 Intent を作成し ideation 完了で park、実装は再開承認後 | ユーザー | 2026-07-20 本セッション | intent-statement Initiative Trigger |
| 4 | compose 提案承認: stock `amadeus` スコープ(18/32 EXECUTE)、新規スコープ作成なし | ユーザー | 2026-07-20T05:00Z 頃 | compose ゲート(AskUserQuestion) |
| 5 | intent 260720-upstream-sync-230 birth(label: upstream-sync-230) | e5(ユーザー指示の執行) | 2026-07-20T04:53Z 頃 | intent-birth 出力・leader 台帳登録(agmsg 04:55:15Z) |
| 6 | intent-capture 4問の E-OC1 選挙不要判定 | leader 承認 | 2026-07-20T04:55:15Z | agmsg(出典 agmsg) |
| 7 | intent-capture §13: 0件採用(E-USSIC、favor 2-0) | 選挙 | 2026-07-20T05:00:40Z | agmsg 裁定通知(record push 済み) |
| 8 | feasibility 6問の E-OC1 選挙不要判定 | leader 承認 | 2026-07-20T05:02:24Z | agmsg |
| 9 | feasibility GO 判定(無条件)・AWS N/A・ライセンス green | e5(architect 帰属、実測根拠) | 2026-07-20T05:04Z 頃 | feasibility-assessment |
| 10 | feasibility §13: 0件採用(E-USSFS、choice 1: 2-0) | 選挙 | 2026-07-20T05:12:26Z | agmsg 裁定通知(record push 50eacb751) |
| 11 | scope-definition 5問の E-OC1 選挙不要判定 | leader 承認 | 2026-07-20T05:13:12Z | agmsg |
| 12 | MoSCoW = 計画写像(24 Must、Should/Could なし)、順序 = dependency+risk-first | e5(既決適用) | 2026-07-20T05:15Z 頃 | scope-document / intent-backlog |
| 13 | scope-definition §13: 0件採用(E-USSSD、choice 1: 2-0) | 選挙 | 2026-07-20T05:17:22Z | agmsg 裁定通知(record push 365ea2d16) |
| 14 | approval-handoff 6問の E-OC1 選挙不要判定(既決3+N/A 3) | leader 承認 | 2026-07-20T05:18:02Z | agmsg |
| 15 | 常任グラント運用: cabcb933 → 更新 1d87113b(期限 09:08:47Z、boundary 込み) | leader 発行 | 2026-07-20T05:08:59Z | agmsg+GRANT_ISSUED 行(pick 済み) |

## 却下・不採用の記録

- SKIP 6件の不採用理由は計画 Explicit exclusions 節が正本(EQUIVALENT 実証3+生成物/フォーク固有3)
- §13 学習候補は3ステージ計7件提出、全件「既存ノルムの適用実例」として不採用(0件 persist ×3、いずれも blind 選挙成立)
