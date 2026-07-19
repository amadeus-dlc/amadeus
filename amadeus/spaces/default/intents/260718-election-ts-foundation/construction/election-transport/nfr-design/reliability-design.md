# Reliability Design — election-transport(nfr-design)

> 上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## 配送信頼性の設計(中核)

reliability-requirements.md の信頼性境界を次で実現する:

- `DeliveryRecord` は「送信実行の記録」であり「到達の証明」ではない — 型ドキュメントコメントに明記し、record.provenance("spawn-exit" | "reported-by-conductor")が生成起点を運ぶ(business-logic-model.md の単段生成 BR-T2)。到達確認を僭称する API(ack 待ち・到達フラグ)を設けない(検証劇場の回避 — tech-stack-decisions.md の却下判断と一体)
- 送信失敗: agmsg spawn exit 非0 → `TransportError("send-failed")` の Result 返却(fail-closed)。subagent 経路は send-failed 非到達(directive 生成のみ — business-logic-model.md エラーバリアント表)
- fake send.sh(exit 0/1)注入で記録有無を assert+notify 戻り値に record 非含有+外部構築不能の型面 assert(BR-T2 の3 assert — security-design.md の型境界と同一機構の検証)

## 障害分類

- send-failed は回復可能(U5 が再送を指令で提示 — 記帳は失敗として残る)。回復不能経路なし(永続は U2 の責務)。observability は N/A(reliability-requirements.md — 可視性は U2 timeline の記帳列。performance-requirements.md の逐次実行が記帳順序を自然に保存)
