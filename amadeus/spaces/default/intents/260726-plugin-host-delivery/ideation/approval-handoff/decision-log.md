# Decision Log — plugin-host-delivery(Ideation 全裁定)

> 上流入力(consumes 全数): intent-statement、scope-document、intent-backlog、feasibility-assessment、constraint-register
> すべてソロモードのユーザー直接裁定(AskUserQuestion / gate 承認)。

## 裁定一覧

| # | 日時(UTC) | 裁定 | 内容 | 記録先 |
|---|---|---|---|---|
| D1 | 2026-07-26T13:50 頃 | intent-first・epic 非分割 | 旧 #1543 は intent 成立後に破棄可。全体を 1 intent とし、複雑さは Unit/Bolt で吸収 | intent-capture-questions Q1 |
| D2 | 2026-07-26T13:50 頃 | ミラー方式 | Intent Mirror を新規作成(→ #1545 成立)。record → Issue 一方向同期 | intent-capture-questions Q2 |
| D3 | 2026-07-26T13:50 頃 | activation policy 裁定経路 | formal-model-check の activation policy は application-design の ADR + 承認ゲートで本 intent 内に裁定 | intent-capture-questions Q3 |
| D4 | 2026-07-26T14:07 頃 | intent-capture 承認 + #1543 クローズ + §13 1件採用 | pre-filing-dup-and-branch-check ノルムを team.md へ persist | gate 承認、team.md |
| D5 | 2026-07-26T14:25 頃 | 対象ハーネス = 7 | Kimi Code を含める(「全数評価」の趣旨優先) | feasibility-questions Q1 |
| D6 | 2026-07-26T14:45 頃 | feasibility 承認(Conditional GO) | 条件 = 能力マトリクス実測後の確約、ADR ゲート裁定 | gate 承認 |
| D7 | 2026-07-26T15:00 頃 | scope-definition 承認 | IN/OUT 境界、backlog B1-B10、walking skeleton = Claude Code 利用者 E2E、risk-first 順 | gate 承認 |

## 付随する運用イベント(裁定ではないが Ideation 中の記録)

- Mirror create の初回失敗 → 原因は #1498(修正 #1537 main 着地済み)の自ブランチ未取込。#1544 を誤起票し重複クローズ。origin/main 取込後に #1545 成立
- 新規バグ発見・起票: [#1547](https://github.com/amadeus-dlc/amadeus/issues/1547)(mirror の write⇔read 表現分裂、P2/S3)— 本 intent スコープ外
