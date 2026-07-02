# ユースケース

## 一覧

| 識別子 | アクター | 外部システム | ストーリー | 要求 | 依存 | 詳細 |
|---|---|---|---|---|---|---|
| UC001 | ACT002 Agent | なし | なし | R001 | なし | [UC001-derive-waves.md](use-cases/UC001-derive-waves.md) |
| UC002 | ACT001 Maintainer | なし | なし | R003 | UC001 | [UC002-batch-approve-wave.md](use-cases/UC002-batch-approve-wave.md) |
| UC003 | ACT002 Agent | なし | なし | R002, R004 | UC001 | [UC003-execute-and-integrate-wave.md](use-cases/UC003-execute-and-integrate-wave.md) |
| UC004 | ACT002 Agent | なし | なし | R004 | なし | [UC004-serial-execution-default.md](use-cases/UC004-serial-execution-default.md) |

## 依存関係

| ユースケース | 依存 | 理由 |
|---|---|---|
| UC001 | なし | wave の導出は bolts.md の依存表だけを前提に成立するため。 |
| UC002 | UC001 | まとめ承認は wave 分割が導出されていることが前提になるため。 |
| UC003 | UC001 | 並行実行は wave 分割と Task Generation の承認済み（passed）だけを前提にし、承認の形（まとめ承認か個別承認か）には依存しないため。 |
| UC004 | なし | 直列実行は従来どおりの既定であり、他の相互作用に依存しないため。 |
