# Scalability Requirements — election-model(nfr-requirements)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 負荷前提と成長予測

- 対象はチーム内選挙(requirements.md FR-1a の投票者集合 = agmsg チーム登録メンバー、実測 4〜14 名)。W-04(配布外)によりユーザー数成長の前提を持たない — スケーリング戦略・容量計画は N/A(反証可能な根拠: scope-document W-04+ADR-2 の space ローカル記録)
- 選挙件数の成長は U2 store のファイル配置(elections/<選挙ID>/)に閉じ、U1 純関数層は選挙1件分の入力しか受けない(business-logic-model.md tally 決定表 — 入力は election+ballots[] のみ)

## 同時実行

- U1 は状態を持たない純関数(business-rules.md BR-11 — 環境時刻にも依存しない)。並行選挙 N 件は関数呼び出し N 回で自然にスケールし、共有可変状態が存在しないため同時実行制御を要求しない(書込直列化は U2 の単一書込主体 = conductor 設計の責務)
