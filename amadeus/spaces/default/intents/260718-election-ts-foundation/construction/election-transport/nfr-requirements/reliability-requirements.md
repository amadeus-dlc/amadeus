# Reliability Requirements — election-transport(nfr-requirements)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 配送信頼性(dispatch-ack-required ノルムの写像 — 本ユニットの中核 NFR)

- **agmsg 送信の無音不達は既知の構造制約**(send.sh は未登録宛先でも成功を返す — agmsg-recipient-typo ノルムの実測)。したがって DeliveryRecord は「送信実行の記録」であり「到達の証明」ではないことを型注釈・ドキュメントで明示する(requirements.md FR-2b の記帳は送信実行の結果由来 — 到達確認は ack プロトコル = 人間系ノルムの領分で、U4 は僭称しない)
- 送信失敗(exit 非0)は `TransportError("send-failed")` で fail-closed に返す(business-logic-model.md の輸送別エラーバリアント表)。subagent 輸送は send-failed 非到達(directive 生成のみ — 同表)
- DeliveryRecord の生成は輸送実行の結果からのみ(business-rules.md BR-T3 — 落ちる実証は code-generation 時実施。送信せずに記帳する経路の非存在をテストで固定)

## 障害分類と Observability

- 回復可能: send-failed は呼び出し元(U5)が指令で再送を提示可能(記帳は失敗として残る)。回復不能経路は U4 に存在しない(fs/永続を持たない — 記帳は U2 の責務)
- 可用性 SLO・observability 要求は N/A(反証可能な根拠: U4 は常駐プロセスを持たない送達アダプタ層。送達の可視性は DeliveryOutcome の記帳列 = U2 timeline が担う)。ランタイム障害面は既存スタック(technology-stack.md)の Bun/TS+外部 agmsg プロセスに閉じる
