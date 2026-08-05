# Stakeholder Map: TLA+ Model Authoring

## Stakeholders

| Stakeholder | Interest | Required outcome |
|---|---|---|
| Amadeus利用者 | 現在の要求が形式検証されたと信頼できること | 要求・設計とモデル・invariant・verdictの追跡可能な対応 |
| Product Agent | 適用対象要求と非対象理由が明確であること | Requirements Analysisでの適用判定と完全性証拠 |
| Architect Agent | 状態機械・プロトコルの意味論がモデルへ正しく写像されること | reduction、invariant、意味変更判定の明示 |
| Quality Agent | proofが検証劇場でなく、失敗経路も実測されること | TLC完全探索、falling proof、vacuity proof、E2E |
| Amadeusメンテナー | 既存モデル契約を壊さず保守できること | 互換性、fail-closed境界、配布面の一貫性 |
| 人間の意思決定者 | 適用判定とreductionの判断を最終承認できること | 永続receiptと明示的なhuman gate |

## Decision Makers and Influencers

- 最終決定者: ユーザー。適用可否、非対象理由、reductionとinvariant、互換性上のトレードオフをapproval gateで裁定する。
- 実行責任者: Amadeus conductorと各stageのlead agent。stage graphがactor、trigger、consumes、produces、完了条件を割り当てる。
- 独立検証者: Issueクロスレビュー2名、後続stage reviewer、formal proofとE2Eを検証するQuality Agent。
- 影響者: 既存`formal-model-check`の利用者と、`FormalElection` / `MirrorLifecycle`の保守担当者。

## Communication Requirements

- 適用判定、要求identity、design identity、model identity、named invariant、proof結果を同一のtrace chainで参照可能にする。
- 非対象または`--impl-only`分岐は、理由、承認者、対象identityをreceiptへ残す。
- `DETECTED`、`HARNESS_ERROR`、staleness、coverage不足は成功として要約せず、fail-closedの状態をそのまま提示する。
- 既存モデルの実行契約へ影響する変更は、互換性リスクとして人間ゲートへ明示する。

## Engagement Boundary

Ideationでは問題、成功条件、stakeholder責務だけを確定する。新規stageかoverlayか、具体的なartifact schema、CLIや型設計は後続のRequirements AnalysisとApplication Designで決定する。
