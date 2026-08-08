# Domain Entities — u3-question-route-observability

上流入力(consumes 全数): requirements.md(FR-3)、components.md(C4 責務)、component-methods.md(logQuestionAnswered 拡張契約)、unit-of-work.md(u3 境界 = amadeus-log.ts のみ)、unit-of-work-story-map.md(物語「質問が梯子経由か人間直行かを後から集計できる」)、services.md(QUESTION_ANSWERED の append-only・属性後方互換契約)。

## 変更エンティティ

### QuestionAnsweredEvent(`amadeus-log.ts:180-187` の発行イベント — 属性拡張)

| 追加属性 | 型 | 意味 |
|---|---|---|
| Resolution Route | `"ladder" \| "human"` | decide-question 梯子経由か人間直接回答か |
| Decision Id | string(optional — ladder 時のみ) | `auto-decision-…` への参照(AUTO_DECIDED 記録との突合キー) |

- 不変条件: 属性追加のみ(schemaVersion 不変・既存読取に影響なし — ADR-4)。回答の受理可否は変えない(FR-3c)
- Route の決定: **`Decision Id` の有無からの導出属性**(`ladder` iff decision-id 実在、else `human`)。新規入力は optional `--decision-id` のみで、既存呼び出し元は無変更(Review iteration 1 BLOCKER 是正 — AD の optional decisionId 仕様どおり)。conductor が ladder 裁定の decision-id を渡し忘れた場合は human 側 = 迂回検出の偽陽性へ倒れる(loud 側に誤る安全な非対称)

## 検出ビュー(エンティティではなく導出)

迂回質問 = `QUESTION_ANSWERED` 行のうち `Resolution Route = human` かつ判定時点の Intent autonomy mode ∈ {semi, full}。mode の突合は同 shard の `INTENT_AUTONOMY_TRANSACTION_COMMITTED` 系列から after-the-fact に導出(集計述語 — u5 の計測レポートが消費)。sensor 化は不採用(AD の委譲への回答): リアルタイム検出は Stop hook 経路の複雑化に見合う利得がなく、集計述語で FR-3b の受け入れ基準(違反 fixture の検出)を満たせるため。
